#!/usr/bin/env node
/**
 * AI Tribunal clock, case ledger and compliance checker.
 *
 * The script is deliberately dependency-free. It is the authoritative clock:
 * the Secretary may only learn deadlines from it, and `verify` re-checks the
 * recorded timeline against config/tribunal.config.json after the hearing.
 *
 * Stage 1 (hearing 1) commands are unchanged and keep working on old cases.
 * Stage 2 adds a checkpoint, reconstruction, approval and a second hearing with
 * its own independent 780-second clock:
 *
 *   init        --slug <slug> [--title "<title>"] [--case-dir <dir>]
 *   begin       --case <dir> --phase preparation|debate|verdict [--hearing 1|2]
 *   end         --case <dir> --phase preparation|debate|verdict [--status ...] [--hearing 1|2]
 *   deadline    --case <dir> --phase preparation|debate|verdict [--hearing 1|2]
 *   round       --case <dir> --round <n> [--hearing 1|2]
 *   checkpoint  --case <dir> --decision offer|reconstruct|finish
 *               [--goals "<text>"] [--constraints "<text>"] [--note "<text>"] [--emulated]
 *   reconstruct --case <dir> --begin|--end [--status completed|failed|skipped] [--note "<text>"]
 *   approval    --case <dir> --decision approved|changes|stop [--note "<text>"] [--emulated]
 *   event       --case <dir> --type <type> [--role <role>] [--agent <name>] [--note "<text>"] [--detail '<json>']
 *   status      --case <dir>
 *   verify      --case <dir> [--hearing 1|2]
 *   finalize    --case <dir> [--hearing 1|2]
 *   selftest
 *
 * Reconstruction runs outside every hearing clock: hearing 2 starts only after
 * the user approved V2, so time spent reconstructing and waiting for the user is
 * never charged to the retrial's 780 seconds.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_PATH = path.join(ROOT, 'config', 'tribunal.config.json')
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
const PHASES = ['preparation', 'debate', 'verdict']
const HEARINGS = [1, 2]
const RETRIAL_AGENT_ROLES = ['prosecutor', 'defense', 'judge']

function fail(message, code = 1) {
  console.error(`tribunal: ${message}`)
  process.exit(code)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) fail(`unexpected argument: ${token}`)
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i += 1
    }
  }
  return out
}

const rawArgs = process.argv.slice(2)
const command = rawArgs[0]
const args = parseArgs(rawArgs.slice(1))

function nowIso() {
  return new Date().toISOString()
}

function iso(date) {
  return date.toISOString()
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000)
}

function fmtSeconds(ms) {
  return Math.round(ms / 1000)
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function resolveCase(arg) {
  if (typeof arg !== 'string' || arg.trim() === '') fail('--case <dir> is required')
  const caseDir = path.resolve(ROOT, arg)
  const casesRoot = path.resolve(ROOT, config.paths.cases)
  if (caseDir !== casesRoot && !caseDir.startsWith(`${casesRoot}${path.sep}`)) {
    fail(`case directory must live under ${casesRoot}: ${caseDir}`)
  }
  if (!fs.existsSync(path.join(caseDir, config.artifacts.log))) fail(`not a case directory: ${caseDir}`)
  return caseDir
}

function loadCase(caseDir) {
  const stateFile = path.join(caseDir, config.artifacts.log)
  const state = readJson(stateFile)
  return {
    dir: caseDir,
    stateFile,
    state,
    record: state.case,
    schedule: state.schedule,
  }
}

function saveState(ctx) {
  writeJson(ctx.stateFile, ctx.state)
}

function event(ctx, type, detail = {}) {
  ctx.state.events.push({ at: nowIso(), type, ...detail })
  saveState(ctx)
}

function slugify(value) {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'case'
}

function resolveHearingArg(arg) {
  if (arg === undefined) return 1
  const number = Number(arg)
  if (!Number.isInteger(number) || !HEARINGS.includes(number)) {
    fail(`--hearing must be one of: ${HEARINGS.join(', ')}`)
  }
  return number
}

function schedulePhaseDuration(schedule, phase) {
  const item = schedule.phases[phase]
  if (!item?.startedAt || !item?.endedAt) return null
  return fmtSeconds(new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime())
}

function phaseDeadline(schedule, phase) {
  return schedule.phases[phase]?.deadline ?? null
}

function checkDeadline(schedule, phase, limitSeconds, toleranceSeconds) {
  const item = schedule.phases[phase]
  if (!item?.startedAt) return { ok: false, detail: `${phase} never started` }
  if (!item?.endedAt) return { ok: false, detail: `${phase} never ended` }
  const deadline = new Date(item.deadline).getTime()
  const ended = new Date(item.endedAt).getTime()
  const ok = ended <= deadline + toleranceSeconds * 1000
  return {
    ok,
    detail: ok
      ? `${phase} ended ${fmtSeconds(deadline - ended)}s before its deadline`
      : `${phase} ended ${fmtSeconds(ended - deadline)}s after its deadline`,
  }
}

function initStage2() {
  return {
    status: 'none',
    checkpoint: {
      offeredAt: null,
      decision: null,
      decidedAt: null,
      userInput: null,
      emulated: false,
    },
    baseline: null,
    reconstruction: {
      startedAt: null,
      endedAt: null,
      status: null,
      revisions: 0,
    },
    approval: {
      decisions: [],
      approvedAt: null,
      revision: 0,
    },
    hearing: null,
    verdictStatus: null,
    violations: [],
    verification: null,
  }
}

function ensureStage2(ctx) {
  if (!ctx.state.stage2) ctx.state.stage2 = initStage2()
  return ctx.state.stage2
}

function artifactHashes(caseDir) {
  const out = {}
  for (const relative of [config.artifacts.caseDoc, config.artifacts.transcript, config.artifacts.verdict, config.artifacts.report]) {
    const file = path.join(caseDir, relative)
    out[relative] = fs.existsSync(file) ? sha256(file) : null
  }
  return out
}

function startSecondHearing(ctx) {
  const stage2 = ctx.state.stage2
  if (!stage2) fail('hearing 2 requires an approved V2: run checkpoint -> reconstruct -> approval first')
  if (stage2.hearing?.startedAt) return stage2.hearing
  if (stage2.status !== 'approved' || !stage2.approval?.approvedAt) {
    fail('hearing 2 requires an approved V2: run checkpoint -> reconstruct -> approval first')
  }
  if (!stage2.reconstruction?.endedAt) fail('hearing 2 requires a completed reconstruction')

  const started = new Date()
  const startedAt = iso(started)
  const hearing = {
    number: 2,
    startedAt,
    totalDeadline: iso(addSeconds(started, config.limits.totalSeconds)),
    phases: {
      preparation: {
        maxSeconds: config.limits.preparationSeconds,
        deadline: iso(addSeconds(started, config.limits.preparationSeconds)),
        startedAt: null,
        endedAt: null,
        status: null,
      },
      debate: {
        maxSeconds: config.limits.debateSeconds,
        deadline: iso(addSeconds(started, config.limits.preparationSeconds + config.limits.debateSeconds)),
        startedAt: null,
        endedAt: null,
        status: null,
      },
      verdict: {
        maxSeconds: config.limits.verdictSeconds,
        deadline: iso(addSeconds(started, config.limits.totalSeconds)),
        startedAt: null,
        endedAt: null,
        status: null,
      },
    },
    limits: { ...config.limits },
    rounds: 0,
    completedAt: null,
  }
  stage2.hearing = hearing
  stage2.status = 'retrial'
  saveState(ctx)
  event(ctx, 'stage2_hearing_started', {
    hearing: 2,
    startedAt,
    totalDeadline: hearing.totalDeadline,
  })
  return hearing
}

function cmdInit() {
  const slug = slugify(args.slug ?? 'case')
  const title = typeof args.title === 'string' ? args.title : slug
  const casesRoot = path.resolve(ROOT, config.paths.cases)
  if (args['case-dir']) {
    const requested = path.resolve(ROOT, args['case-dir'])
    if (requested !== casesRoot && !requested.startsWith(`${casesRoot}${path.sep}`)) {
      fail(`--case-dir must live under ${casesRoot}`)
    }
    if (fs.existsSync(requested)) fail(`case directory already exists: ${requested}`)
  }
  const date = new Date().toISOString().slice(0, 10)
  let caseDir = args['case-dir']
    ? path.resolve(ROOT, args['case-dir'])
    : path.join(casesRoot, `${date}-${slug}`)
  let suffix = 2
  while (!args['case-dir'] && fs.existsSync(caseDir)) {
    caseDir = path.join(casesRoot, `${date}-${slug}-${suffix}`)
    suffix += 1
  }
  fs.mkdirSync(caseDir, { recursive: true })

  const started = new Date()
  const startedAt = iso(started)
  const prepDeadline = iso(addSeconds(started, config.limits.preparationSeconds))
  const debateWindowEnd = iso(addSeconds(
    started,
    config.limits.preparationSeconds + config.limits.debateSeconds,
  ))
  const totalDeadline = iso(addSeconds(started, config.limits.totalSeconds))

  const schedule = {
    startedAt,
    totalDeadline,
    phases: {
      preparation: { maxSeconds: config.limits.preparationSeconds, deadline: prepDeadline, startedAt: null, endedAt: null, status: null },
      debate: { maxSeconds: config.limits.debateSeconds, deadline: debateWindowEnd, startedAt: null, endedAt: null, status: null },
      verdict: { maxSeconds: config.limits.verdictSeconds, deadline: totalDeadline, startedAt: null, endedAt: null, status: null },
    },
    limits: { ...config.limits },
  }

  const record = {
    schemaVersion: 2,
    id: path.basename(caseDir),
    slug,
    title,
    status: 'intake',
    createdAt: startedAt,
    startedAt,
    completedAt: null,
    limits: { ...config.limits },
    roles: { ...config.roles },
    outcome: { verdictStatus: null, rounds: 0, missing: [], violations: [] },
  }

  const ctx = {
    dir: caseDir,
    stateFile: path.join(caseDir, config.artifacts.log),
    state: { schemaVersion: 2, case: record, schedule, events: [], verification: null },
    record,
    schedule,
  }
  saveState(ctx)
  event(ctx, 'case_created', { caseId: record.id, title })
  event(ctx, 'clock_started', { startedAt, totalDeadline })

  console.log(JSON.stringify({
    ok: true,
    caseDir,
    caseId: record.id,
    startedAt,
    schedule,
  }, null, 2))
}

function cmdBegin() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const phase = args.phase
  if (!PHASES.includes(phase)) fail(`--phase must be one of: ${PHASES.join(', ')}`)
  const ctx = loadCase(caseDir)
  const schedule = hearing === 1 ? ctx.schedule : startSecondHearing(ctx)
  const item = schedule.phases[phase]
  if (item.startedAt) {
    console.log(JSON.stringify({
      ok: true,
      alreadyStarted: true,
      hearing,
      phase,
      deadline: item.deadline,
      remainingMs: new Date(item.deadline).getTime() - Date.now(),
    }, null, 2))
    return
  }
  const started = new Date()
  let deadline
  if (phase === 'preparation') {
    deadline = new Date(schedule.phases.preparation.deadline)
  } else if (phase === 'debate') {
    const cap = addSeconds(started, config.limits.debateSeconds)
    deadline = new Date(Math.min(cap.getTime(), new Date(schedule.phases.debate.deadline).getTime()))
  } else {
    const cap = addSeconds(started, config.limits.verdictSeconds)
    deadline = new Date(Math.min(cap.getTime(), new Date(schedule.phases.verdict.deadline).getTime()))
  }
  item.startedAt = iso(started)
  item.deadline = iso(deadline)
  item.status = 'running'
  ctx.record.status = hearing === 1 ? phase : `retrial_${phase}`
  saveState(ctx)
  event(ctx, hearing === 1 ? 'phase_started' : 'retrial_phase_started', {
    phase,
    startedAt: item.startedAt,
    deadline: item.deadline,
    ...(hearing === 1 ? {} : { hearing }),
  })
  console.log(JSON.stringify({
    ok: true,
    hearing,
    phase,
    startedAt: item.startedAt,
    deadline: item.deadline,
    remainingMs: deadline.getTime() - Date.now(),
    remainingSeconds: fmtSeconds(deadline.getTime() - Date.now()),
  }, null, 2))
}

function cmdEnd() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const phase = args.phase
  if (!PHASES.includes(phase)) fail(`--phase must be one of: ${PHASES.join(', ')}`)
  const ctx = loadCase(caseDir)
  const schedule = hearing === 1 ? ctx.schedule : ctx.state.stage2?.hearing
  if (!schedule?.phases?.[phase]) fail(`hearing ${hearing} has not started`)
  const item = schedule.phases[phase]
  if (!item.startedAt) fail(`${phase} has not started`)
  if (item.endedAt) {
    console.log(JSON.stringify({
      ok: true,
      alreadyEnded: true,
      hearing,
      phase,
      endedAt: item.endedAt,
      durationSeconds: schedulePhaseDuration(schedule, phase),
    }, null, 2))
    return
  }
  const ended = new Date()
  item.endedAt = iso(ended)
  item.status = typeof args.status === 'string' ? args.status : 'completed'
  const durationSeconds = fmtSeconds(ended.getTime() - new Date(item.startedAt).getTime())
  const overdue = ended.getTime() > new Date(item.deadline).getTime()
  ctx.record.status = hearing === 1 ? `${phase}_complete` : `retrial_${phase}_complete`
  saveState(ctx)
  event(ctx, hearing === 1 ? 'phase_ended' : 'retrial_phase_ended', {
    phase,
    endedAt: item.endedAt,
    durationSeconds,
    status: item.status,
    overdue,
    deadline: item.deadline,
    ...(hearing === 1 ? {} : { hearing }),
  })
  console.log(JSON.stringify({
    ok: true,
    hearing,
    phase,
    endedAt: item.endedAt,
    durationSeconds,
    overdue,
    deadline: item.deadline,
  }, null, 2))
}

function cmdDeadline() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const phase = args.phase
  if (!PHASES.includes(phase)) fail(`--phase must be one of: ${PHASES.join(', ')}`)
  const ctx = loadCase(caseDir)
  const schedule = hearing === 1 ? ctx.schedule : ctx.state.stage2?.hearing
  if (!schedule?.phases?.[phase]) fail(`hearing ${hearing} has not started; run begin first`)
  const item = schedule.phases[phase]
  const deadline = phaseDeadline(schedule, phase)
  const remainingMs = new Date(deadline).getTime() - Date.now()
  console.log(JSON.stringify({
    ok: true,
    hearing,
    phase,
    started: Boolean(item.startedAt),
    ended: Boolean(item.endedAt),
    deadline,
    remainingMs,
    remainingSeconds: Math.max(0, fmtSeconds(remainingMs)),
    expired: remainingMs <= 0,
    totalDeadline: schedule.totalDeadline,
  }, null, 2))
}

function cmdRound() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const round = Number(args.round)
  if (!Number.isInteger(round) || round < 1 || round > config.limits.maxDebateRounds) {
    fail(`--round must be an integer from 1 to ${config.limits.maxDebateRounds}`)
  }
  const ctx = loadCase(caseDir)
  if (hearing === 1) {
    ctx.record.outcome.rounds = Math.max(ctx.record.outcome.rounds ?? 0, round)
    saveState(ctx)
    event(ctx, 'debate_round', { round })
    console.log(JSON.stringify({ ok: true, hearing, rounds: ctx.record.outcome.rounds }, null, 2))
    return
  }
  const schedule = ctx.state.stage2?.hearing
  if (!schedule?.startedAt) fail('hearing 2 has not started')
  schedule.rounds = Math.max(schedule.rounds ?? 0, round)
  saveState(ctx)
  event(ctx, 'retrial_debate_round', { round, hearing: 2 })
  console.log(JSON.stringify({ ok: true, hearing, rounds: schedule.rounds }, null, 2))
}

function cmdCheckpoint() {
  const caseDir = resolveCase(args.case)
  const decision = args.decision
  if (!['offer', 'reconstruct', 'finish'].includes(decision)) {
    fail('--decision must be one of: offer, reconstruct, finish')
  }
  const ctx = loadCase(caseDir)
  if (!ctx.record.completedAt || !ctx.state.verification) {
    fail('checkpoint requires a finalized first hearing: run verify and finalize first')
  }
  const stage2 = ensureStage2(ctx)
  if (stage2.status !== 'none' && stage2.status !== 'checkpoint') {
    fail(`checkpoint has already moved on: stage2 status is "${stage2.status}"`)
  }
  if (stage2.checkpoint.decision) {
    fail(`checkpoint decision is already recorded: ${stage2.checkpoint.decision}`)
  }
  if (!stage2.baseline) {
    stage2.baseline = {
      recordedAt: nowIso(),
      hashes: artifactHashes(caseDir),
    }
  }

  const at = nowIso()
  if (decision === 'offer') {
    if (!stage2.checkpoint.offeredAt) stage2.checkpoint.offeredAt = at
    stage2.status = 'checkpoint'
    saveState(ctx)
    event(ctx, 'stage2_checkpoint_offered', { offeredAt: stage2.checkpoint.offeredAt })
    console.log(JSON.stringify({ ok: true, decision, stage2Status: stage2.status }, null, 2))
    return
  }

  const userInput = {
    goals: typeof args.goals === 'string' ? args.goals : null,
    constraints: typeof args.constraints === 'string' ? args.constraints : null,
    note: typeof args.note === 'string' ? args.note : null,
    emulated: args.emulated === true,
  }
  stage2.checkpoint.decision = decision
  stage2.checkpoint.decidedAt = at
  stage2.checkpoint.userInput = userInput
  stage2.checkpoint.emulated = args.emulated === true
  if (!stage2.checkpoint.offeredAt) stage2.checkpoint.offeredAt = at
  stage2.status = decision === 'reconstruct' ? 'reconstruction' : 'declined'
  saveState(ctx)
  event(ctx, decision === 'reconstruct' ? 'stage2_reconstruction_requested' : 'stage2_declined', {
    decision,
    userInput,
  })
  console.log(JSON.stringify({ ok: true, decision, stage2Status: stage2.status }, null, 2))
}

function cmdReconstruct() {
  const caseDir = resolveCase(args.case)
  const ctx = loadCase(caseDir)
  const stage2 = ctx.state.stage2
  if (!stage2 || stage2.checkpoint?.decision !== 'reconstruct') {
    fail('reconstruction requires checkpoint --decision reconstruct')
  }
  if (args.begin === true) {
    if (stage2.reconstruction.startedAt && !stage2.reconstruction.endedAt) {
      console.log(JSON.stringify({ ok: true, alreadyStarted: true, startedAt: stage2.reconstruction.startedAt }, null, 2))
      return
    }
    if (stage2.reconstruction.endedAt) fail('reconstruction already ended; request changes through approval first')
    stage2.reconstruction.startedAt = nowIso()
    stage2.reconstruction.status = 'running'
    stage2.status = 'reconstruction'
    saveState(ctx)
    event(ctx, 'stage2_reconstruction_started', { startedAt: stage2.reconstruction.startedAt })
    console.log(JSON.stringify({ ok: true, startedAt: stage2.reconstruction.startedAt }, null, 2))
    return
  }
  if (args.end === true) {
    if (!stage2.reconstruction.startedAt) fail('reconstruction has not started')
    if (stage2.reconstruction.endedAt) {
      console.log(JSON.stringify({
        ok: true,
        alreadyEnded: true,
        endedAt: stage2.reconstruction.endedAt,
        durationSeconds: fmtSeconds(new Date(stage2.reconstruction.endedAt).getTime() - new Date(stage2.reconstruction.startedAt).getTime()),
      }, null, 2))
      return
    }
    stage2.reconstruction.endedAt = nowIso()
    stage2.reconstruction.status = typeof args.status === 'string' ? args.status : 'completed'
    stage2.status = 'awaiting_approval'
    saveState(ctx)
    event(ctx, 'stage2_reconstruction_ended', {
      endedAt: stage2.reconstruction.endedAt,
      status: stage2.reconstruction.status,
      durationSeconds: fmtSeconds(new Date(stage2.reconstruction.endedAt).getTime() - new Date(stage2.reconstruction.startedAt).getTime()),
    })
    console.log(JSON.stringify({
      ok: true,
      endedAt: stage2.reconstruction.endedAt,
      status: stage2.reconstruction.status,
    }, null, 2))
    return
  }
  fail('use --begin or --end')
}

function cmdApproval() {
  const caseDir = resolveCase(args.case)
  const decision = args.decision
  if (!['approved', 'changes', 'stop'].includes(decision)) {
    fail('--decision must be one of: approved, changes, stop')
  }
  const ctx = loadCase(caseDir)
  const stage2 = ctx.state.stage2
  if (!stage2 || stage2.checkpoint?.decision !== 'reconstruct') {
    fail('approval requires a reconstruction in progress')
  }
  if (!stage2.reconstruction.endedAt) fail('approval requires a finished reconstruction: run reconstruct --end first')
  if (stage2.hearing?.startedAt) fail('approval is closed: hearing 2 has already started')

  const at = nowIso()
  const record = {
    at,
    decision,
    note: typeof args.note === 'string' ? args.note : null,
    emulated: args.emulated === true,
  }
  stage2.approval.decisions.push(record)

  if (decision === 'approved') {
    stage2.approval.approvedAt = at
    stage2.approval.revision = stage2.reconstruction.revisions
    stage2.status = 'approved'
    saveState(ctx)
    event(ctx, 'stage2_v2_approved', { at, emulated: record.emulated, revisions: stage2.reconstruction.revisions })
    console.log(JSON.stringify({ ok: true, decision, approvedAt: at, revisions: stage2.reconstruction.revisions }, null, 2))
    return
  }

  if (decision === 'changes') {
    stage2.status = 'reconstruction'
    stage2.approval.approvedAt = null
    stage2.reconstruction.revisions += 1
    stage2.reconstruction.endedAt = null
    stage2.reconstruction.status = 'revision_requested'
    saveState(ctx)
    event(ctx, 'stage2_changes_requested', {
      at,
      note: record.note,
      emulated: record.emulated,
      revisions: stage2.reconstruction.revisions,
    })
    console.log(JSON.stringify({ ok: true, decision, revisions: stage2.reconstruction.revisions }, null, 2))
    return
  }

  stage2.status = 'closed_by_user'
  stage2.approval.approvedAt = null
  saveState(ctx)
  event(ctx, 'stage2_closed_by_user', { at, note: record.note, emulated: record.emulated })
  console.log(JSON.stringify({ ok: true, decision, stage2Status: stage2.status }, null, 2))
}

function cmdEvent() {
  const caseDir = resolveCase(args.case)
  if (typeof args.type !== 'string' || args.type.trim() === '') fail('--type <type> is required')
  const ctx = loadCase(caseDir)
  const detail = typeof args.detail === 'string' ? JSON.parse(args.detail) : {}
  const payload = { ...detail }
  if (typeof args.role === 'string') payload.role = args.role
  if (typeof args.agent === 'string') payload.agent = args.agent
  if (typeof args.note === 'string') payload.note = args.note
  event(ctx, args.type, payload)
  console.log(JSON.stringify({ ok: true, type: args.type }, null, 2))
}

function listArtifacts(caseDir) {
  const wanted = [
    config.artifacts.caseDoc,
    config.artifacts.transcript,
    config.artifacts.verdict,
    config.artifacts.report,
  ]
  return wanted.map((relative) => {
    const file = path.join(caseDir, relative)
    const exists = fs.existsSync(file)
    return {
      path: relative,
      exists,
      bytes: exists ? fs.statSync(file).size : 0,
    }
  })
}

function listStage2Artifacts(caseDir) {
  return Object.values(config.stage2.artifacts).map((relative) => {
    const file = path.join(caseDir, relative)
    const exists = fs.existsSync(file)
    return {
      path: relative,
      exists,
      bytes: exists ? fs.statSync(file).size : 0,
    }
  })
}

function cmdStatus() {
  const caseDir = resolveCase(args.case)
  const ctx = loadCase(caseDir)
  const now = Date.now()
  const phases = {}
  for (const phase of PHASES) {
    const item = ctx.schedule.phases[phase]
    phases[phase] = {
      ...item,
      remainingSeconds: item.endedAt ? 0 : Math.max(0, fmtSeconds(new Date(item.deadline).getTime() - now)),
    }
  }
  const stage2 = ctx.state.stage2
  let stage2Summary = null
  if (stage2) {
    const hearing = stage2.hearing
    stage2Summary = {
      status: stage2.status,
      checkpoint: stage2.checkpoint,
      reconstruction: stage2.reconstruction,
      approval: {
        approvedAt: stage2.approval.approvedAt,
        revision: stage2.approval.revision,
        decisions: stage2.approval.decisions.length,
      },
      hearing: hearing
        ? {
          number: hearing.number,
          startedAt: hearing.startedAt,
          totalDeadline: hearing.totalDeadline,
          totalRemainingSeconds: Math.max(0, fmtSeconds(new Date(hearing.totalDeadline).getTime() - (hearing.completedAt ? new Date(hearing.completedAt).getTime() : now))),
          rounds: hearing.rounds ?? 0,
          completedAt: hearing.completedAt ?? null,
          phases: Object.fromEntries(PHASES.map((phase) => {
            const item = hearing.phases[phase]
            return [phase, {
              ...item,
              remainingSeconds: item.endedAt ? 0 : Math.max(0, fmtSeconds(new Date(item.deadline).getTime() - now)),
            }]
          })),
        }
        : null,
      artifacts: listStage2Artifacts(caseDir),
      verification: stage2.verification ? { ok: stage2.verification.ok, verifiedAt: stage2.verification.verifiedAt } : null,
      violations: stage2.violations ?? [],
    }
  }
  console.log(JSON.stringify({
    ok: true,
    caseDir,
    id: ctx.record.id,
    title: ctx.record.title,
    status: ctx.record.status,
    startedAt: ctx.record.startedAt,
    totalDeadline: ctx.schedule.totalDeadline,
    totalRemainingSeconds: Math.max(0, fmtSeconds(new Date(ctx.schedule.totalDeadline).getTime() - now)),
    phases,
    rounds: ctx.record.outcome.rounds,
    artifacts: listArtifacts(caseDir),
    stage2: stage2Summary,
  }, null, 2))
}

function verifyFirstHearing(caseDir, ctx) {
  const tolerance = config.verification?.toleranceSeconds ?? 5
  const minBytes = config.verification?.minArtifactBytes ?? 80
  const checks = []
  const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail })

  const totalEnd = ctx.record.completedAt ? new Date(ctx.record.completedAt) : new Date()
  const totalSeconds = fmtSeconds(totalEnd.getTime() - new Date(ctx.record.startedAt).getTime())
  add(
    'total_duration',
    totalSeconds <= config.limits.totalSeconds + tolerance,
    `${totalSeconds}s from case creation (limit ${config.limits.totalSeconds}s)`,
  )
  const prepDuration = schedulePhaseDuration(ctx.schedule, 'preparation')
  const debateDuration = schedulePhaseDuration(ctx.schedule, 'debate')
  const verdictDuration = schedulePhaseDuration(ctx.schedule, 'verdict')
  add(
    'preparation_duration',
    prepDuration !== null && prepDuration <= config.limits.preparationSeconds + tolerance,
    prepDuration === null ? 'preparation not recorded' : `preparation ${prepDuration}s (limit ${config.limits.preparationSeconds}s)`,
  )
  add(
    'debate_duration',
    debateDuration !== null && debateDuration <= config.limits.debateSeconds + tolerance,
    debateDuration === null ? 'debate not recorded' : `debate ${debateDuration}s (limit ${config.limits.debateSeconds}s)`,
  )
  add(
    'verdict_duration',
    verdictDuration !== null && verdictDuration <= config.limits.verdictSeconds + tolerance,
    verdictDuration === null ? 'verdict not recorded' : `verdict ${verdictDuration}s (limit ${config.limits.verdictSeconds}s)`,
  )
  for (const phase of PHASES) {
    const result = checkDeadline(ctx.schedule, phase, config.limits[`${phase}Seconds`], tolerance)
    add(`${phase}_deadline`, result.ok, result.detail)
  }
  add(
    'debate_rounds',
    (ctx.record.outcome.rounds ?? 0) <= config.limits.maxDebateRounds,
    `${ctx.record.outcome.rounds ?? 0} round(s) (limit ${config.limits.maxDebateRounds})`,
  )

  for (const artifact of listArtifacts(caseDir)) {
    add(
      `artifact:${artifact.path}`,
      artifact.exists && artifact.bytes >= minBytes,
      artifact.exists ? `${artifact.bytes} bytes` : 'missing',
    )
  }

  const verdictFile = path.join(caseDir, config.artifacts.verdict)
  let verdictStatus = null
  if (fs.existsSync(verdictFile)) {
    const verdictText = fs.readFileSync(verdictFile, 'utf8')
    const match = verdictText.match(/^\s*\*\*Статус:\*\*\s*(.+?)\s*$/m)
    verdictStatus = match ? match[1].trim() : null
    const allowed = config.verdictStatuses.some((status) => verdictStatus?.startsWith(status))
    add('verdict_status', allowed, verdictStatus ? `status: ${verdictStatus}` : 'no "**Статус:** ..." line found')
  } else {
    add('verdict_status', false, 'verdict.md is missing')
  }

  const reportFile = path.join(caseDir, config.artifacts.report)
  if (fs.existsSync(reportFile)) {
    const report = fs.readFileSync(reportFile, 'utf8')
    add('report_contains_verdict_status', Boolean(verdictStatus) && report.includes(verdictStatus), 'report must quote the verdict status')
    add('report_has_verdict_section', /^##\s+(?:\d+\.\s*)?Вердикт/m.test(report), 'report must contain a "## Вердикт" or "## N. Вердикт" section')
  } else {
    add('report_contains_verdict_status', false, 'report.md is missing')
    add('report_has_verdict_section', false, 'report.md is missing')
  }

  const ok = checks.every((check) => check.ok)
  ctx.record.outcome.verdictStatus = verdictStatus
  ctx.record.outcome.violations = checks.filter((check) => !check.ok).map((check) => check.name)
  const verification = { ok, verifiedAt: nowIso(), caseId: ctx.record.id, hearing: 1, checks }
  ctx.state.verification = verification
  saveState(ctx)
  console.log(JSON.stringify(verification, null, 2))
}

function verifySecondHearing(caseDir, ctx) {
  const stage2 = ctx.state.stage2
  if (!stage2?.hearing?.startedAt) fail('hearing 2 has not started')
  const schedule = stage2.hearing
  const tolerance = config.verification?.toleranceSeconds ?? 5
  const minBytes = config.verification?.minArtifactBytes ?? 80
  const checks = []
  const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail })

  const totalEnd = schedule.completedAt ? new Date(schedule.completedAt) : new Date()
  const totalSeconds = fmtSeconds(totalEnd.getTime() - new Date(schedule.startedAt).getTime())
  add(
    'retrial_total_duration',
    totalSeconds <= config.limits.totalSeconds + tolerance,
    `${totalSeconds}s from retrial start (limit ${config.limits.totalSeconds}s)`,
  )
  for (const phase of PHASES) {
    const duration = schedulePhaseDuration(schedule, phase)
    const limit = config.limits[`${phase}Seconds`]
    add(
      `retrial_${phase}_duration`,
      duration !== null && duration <= limit + tolerance,
      duration === null ? `${phase} not recorded` : `${phase} ${duration}s (limit ${limit}s)`,
    )
    const result = checkDeadline(schedule, phase, limit, tolerance)
    add(`retrial_${phase}_deadline`, result.ok, result.detail)
  }
  add(
    'retrial_debate_rounds',
    (schedule.rounds ?? 0) <= config.limits.maxDebateRounds,
    `${schedule.rounds ?? 0} round(s) (limit ${config.limits.maxDebateRounds})`,
  )

  for (const artifact of listStage2Artifacts(caseDir)) {
    add(
      `stage2_artifact:${artifact.path}`,
      artifact.exists && artifact.bytes >= minBytes,
      artifact.exists ? `${artifact.bytes} bytes` : 'missing',
    )
  }

  const verdictFile = path.join(caseDir, config.stage2.artifacts.verdictV2)
  let verdictStatus = null
  if (fs.existsSync(verdictFile)) {
    const verdictText = fs.readFileSync(verdictFile, 'utf8')
    const match = verdictText.match(/^\s*\*\*Статус:\*\*\s*(.+?)\s*$/m)
    verdictStatus = match ? match[1].trim() : null
    const allowed = config.verdictStatuses.some((status) => verdictStatus?.startsWith(status))
    add('retrial_verdict_status', allowed, verdictStatus ? `status: ${verdictStatus}` : 'no "**Статус:** ..." line found')
  } else {
    add('retrial_verdict_status', false, 'verdict-v2.md is missing')
  }

  const reconstructionFile = path.join(caseDir, config.stage2.artifacts.reconstruction)
  if (fs.existsSync(reconstructionFile)) {
    const reconstruction = fs.readFileSync(reconstructionFile, 'utf8')
    add(
      'reconstruction_has_v2_concept',
      /^##\s+(?:\d+\.\s*)?Итоговая концепция V2/m.test(reconstruction),
      'reconstruction.md must contain "## Итоговая концепция V2"',
    )
  } else {
    add('reconstruction_has_v2_concept', false, 'reconstruction.md is missing')
  }

  const ideaFile = path.join(caseDir, config.stage2.artifacts.ideaV2)
  if (fs.existsSync(ideaFile)) {
    const idea = fs.readFileSync(ideaFile, 'utf8')
    add('idea_v2_has_heading', /^#\s+\S/m.test(idea), 'idea-v2.md must start with a Markdown heading')
  } else {
    add('idea_v2_has_heading', false, 'idea-v2.md is missing')
  }

  const comparisonFile = path.join(caseDir, config.stage2.artifacts.comparison)
  if (fs.existsSync(comparisonFile)) {
    const comparison = fs.readFileSync(comparisonFile, 'utf8')
    add(
      'comparison_contains_verdict2_status',
      Boolean(verdictStatus) && comparison.includes(verdictStatus),
      'comparison.md must quote the V2 verdict status',
    )
    add(
      'comparison_mentions_v1_v2',
      /\bV1\b/.test(comparison) && /\bV2\b/.test(comparison),
      'comparison.md must name both V1 and V2',
    )
    for (const section of config.stage2.comparisonSections) {
      const pattern = new RegExp(`^##\\s+(?:\\d+\\.\\s*)?${escapeRegExp(section)}`, 'm')
      add(
        `comparison_section:${section}`,
        pattern.test(comparison),
        `comparison.md must contain the "## ${section}" section`,
      )
    }
  } else {
    add('comparison_contains_verdict2_status', false, 'comparison.md is missing')
    add('comparison_mentions_v1_v2', false, 'comparison.md is missing')
    for (const section of config.stage2.comparisonSections) {
      add(`comparison_section:${section}`, false, 'comparison.md is missing')
    }
  }

  const baseline = stage2.baseline?.hashes
  if (baseline) {
    const current = artifactHashes(caseDir)
    const changed = Object.keys(baseline).filter((relative) => baseline[relative] !== current[relative])
    add(
      'v1_immutable',
      changed.length === 0,
      changed.length === 0 ? 'V1 artifacts unchanged since the checkpoint' : `changed after checkpoint: ${changed.join(', ')}`,
    )
  } else {
    add('v1_immutable', false, 'baseline hashes were not recorded at the checkpoint')
  }

  add(
    'checkpoint_reconstruct',
    stage2.checkpoint?.decision === 'reconstruct',
    `checkpoint decision: ${stage2.checkpoint?.decision ?? 'none'}`,
  )
  add(
    'reconstruction_before_retrial',
    Boolean(stage2.reconstruction?.endedAt) && new Date(stage2.reconstruction.endedAt).getTime() <= new Date(schedule.startedAt).getTime(),
    stage2.reconstruction?.endedAt
      ? `reconstruction ended ${fmtSeconds(new Date(schedule.startedAt).getTime() - new Date(stage2.reconstruction.endedAt).getTime())}s before the retrial`
      : 'reconstruction has not ended',
  )
  add(
    'v2_approved_before_retrial',
    Boolean(stage2.approval?.approvedAt) && new Date(stage2.approval.approvedAt).getTime() <= new Date(schedule.startedAt).getTime(),
    stage2.approval?.approvedAt
      ? `V2 approved ${fmtSeconds(new Date(schedule.startedAt).getTime() - new Date(stage2.approval.approvedAt).getTime())}s before the retrial`
      : 'V2 was not approved',
  )

  const roleEvents = ctx.state.events.filter((item) => item.type === 'agent_started' && Number(item.hearing) === 2)
  const byRole = {}
  for (const item of roleEvents) {
    if (RETRIAL_AGENT_ROLES.includes(item.role) && typeof item.agent === 'string') byRole[item.role] = item.agent
  }
  const missingRoles = RETRIAL_AGENT_ROLES.filter((role) => !byRole[role])
  add(
    'retrial_roles_recorded',
    missingRoles.length === 0,
    missingRoles.length === 0
      ? `roles recorded: ${RETRIAL_AGENT_ROLES.map((role) => `${role}=${byRole[role]}`).join(', ')}`
      : `missing role sessions: ${missingRoles.join(', ')}`,
  )
  const roleNames = RETRIAL_AGENT_ROLES.map((role) => byRole[role]).filter(Boolean)
  add(
    'retrial_roles_distinct',
    roleNames.length === RETRIAL_AGENT_ROLES.length && new Set(roleNames).size === roleNames.length,
    roleNames.length === 0 ? 'no retrial role sessions recorded' : `sessions: ${roleNames.join(', ')}`,
  )

  const ok = checks.every((check) => check.ok)
  stage2.verdictStatus = verdictStatus
  stage2.violations = checks.filter((check) => !check.ok).map((check) => check.name)
  stage2.verification = { ok, verifiedAt: nowIso(), caseId: ctx.record.id, hearing: 2, checks }
  saveState(ctx)
  console.log(JSON.stringify(stage2.verification, null, 2))
}

function cmdVerify() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const ctx = loadCase(caseDir)
  if (hearing === 1) {
    verifyFirstHearing(caseDir, ctx)
    return
  }
  verifySecondHearing(caseDir, ctx)
}

function cmdFinalize() {
  const caseDir = resolveCase(args.case)
  const hearing = resolveHearingArg(args.hearing)
  const ctx = loadCase(caseDir)

  if (hearing === 1) {
    const stage2 = ctx.state.stage2
    if (stage2 && !['none', 'declined'].includes(stage2.status)) {
      fail(`hearing 1 is already finalized; stage2 status is "${stage2.status}"`)
    }
    const verification = ctx.state.verification
    if (!verification) fail('run verify before finalize')
    ctx.record.completedAt = nowIso()
    ctx.record.status = verification.ok ? 'completed' : 'completed_with_violations'
    ctx.record.outcome.violations = verification.checks.filter((check) => !check.ok).map((check) => check.name)
    saveState(ctx)
    event(ctx, 'case_finalized', { status: ctx.record.status, verificationOk: verification.ok, hearing: 1 })
    console.log(JSON.stringify({
      ok: true,
      caseDir,
      hearing,
      status: ctx.record.status,
      completedAt: ctx.record.completedAt,
      verificationOk: verification.ok,
    }, null, 2))
    return
  }

  const stage2 = ctx.state.stage2
  if (!stage2?.hearing?.startedAt) fail('hearing 2 has not started')
  const verification = stage2.verification
  if (!verification) fail('run verify --hearing 2 before finalize')
  stage2.hearing.completedAt = nowIso()
  stage2.status = verification.ok ? 'completed' : 'completed_with_violations'
  ctx.record.status = verification.ok ? 'completed_stage2' : 'completed_stage2_with_violations'
  stage2.violations = verification.checks.filter((check) => !check.ok).map((check) => check.name)
  saveState(ctx)
  event(ctx, 'case_finalized', { status: ctx.record.status, verificationOk: verification.ok, hearing: 2 })
  console.log(JSON.stringify({
    ok: true,
    caseDir,
    hearing,
    status: ctx.record.status,
    stage2Status: stage2.status,
    completedAt: stage2.hearing.completedAt,
    verificationOk: verification.ok,
  }, null, 2))
}

function cmdSelftest() {
  const { totalSeconds, preparationSeconds, debateSeconds, verdictSeconds, maxDebateRounds } = config.limits
  const stage1Artifacts = Object.values(config.artifacts)
  const stage2Artifacts = Object.values(config.stage2?.artifacts ?? {})
  const checks = [
    { name: 'total_covers_phases', ok: totalSeconds >= preparationSeconds + debateSeconds, detail: `${totalSeconds} >= ${preparationSeconds} + ${debateSeconds}` },
    { name: 'verdict_reserved', ok: totalSeconds >= verdictSeconds, detail: `${totalSeconds} >= ${verdictSeconds}` },
    { name: 'exact_13_minute_split', ok: preparationSeconds + debateSeconds + verdictSeconds === totalSeconds, detail: `${preparationSeconds} + ${debateSeconds} + ${verdictSeconds} = ${preparationSeconds + debateSeconds + verdictSeconds}` },
    { name: 'rounds', ok: maxDebateRounds >= 1, detail: `${maxDebateRounds}` },
    { name: 'case_root_is_workspace_child', ok: !path.isAbsolute(config.paths.cases), detail: config.paths.cases },
    { name: 'stage2_enabled', ok: config.stage2?.enabled === true, detail: String(config.stage2?.enabled) },
    {
      name: 'stage2_artifacts_distinct',
      ok: stage2Artifacts.length === 5
        && new Set(stage2Artifacts).size === stage2Artifacts.length
        && stage2Artifacts.every((name) => !stage1Artifacts.includes(name)),
      detail: stage2Artifacts.join(', '),
    },
    {
      name: 'stage2_comparison_sections',
      ok: Array.isArray(config.stage2?.comparisonSections) && config.stage2.comparisonSections.length === 4,
      detail: (config.stage2?.comparisonSections ?? []).join(' | '),
    },
    {
      name: 'stage2_roles',
      ok: Boolean(config.roles?.architect) && Boolean(config.roles?.auditor),
      detail: `${config.roles?.architect ?? 'missing'} / ${config.roles?.auditor ?? 'missing'}`,
    },
  ]
  const ok = checks.every((check) => check.ok)
  console.log(JSON.stringify({ ok, root: ROOT, checks }, null, 2))
  if (!ok) process.exit(1)
}

switch (command) {
  case 'init': cmdInit(); break
  case 'begin': cmdBegin(); break
  case 'end': cmdEnd(); break
  case 'deadline': cmdDeadline(); break
  case 'round': cmdRound(); break
  case 'checkpoint': cmdCheckpoint(); break
  case 'reconstruct': cmdReconstruct(); break
  case 'approval': cmdApproval(); break
  case 'event': cmdEvent(); break
  case 'status': cmdStatus(); break
  case 'verify': cmdVerify(); break
  case 'finalize': cmdFinalize(); break
  case 'selftest': cmdSelftest(); break
  default:
    fail(`unknown command: ${command ?? '(none)'}. Use init|begin|end|deadline|round|checkpoint|reconstruct|approval|event|status|verify|finalize|selftest`)
}
