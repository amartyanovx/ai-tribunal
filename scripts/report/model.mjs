/**
 * Build the report model from saved case artifacts.
 *
 * The model is assembled exclusively from files that already exist in the case
 * directory. The generator does not call an LLM, does not re-judge the idea and
 * does not fill gaps: missing material is represented by an explicit marker and
 * recorded in `warnings`.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  parseCase,
  parseComparison,
  parseReconstruction,
  parseTranscript,
  parseVerdict,
} from './parse.mjs'

const PHASES = ['preparation', 'debate', 'verdict']

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function isoDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const iso = date.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} МБ`
}

function secondsBetween(start, end) {
  if (!start || !end) return null
  const first = new Date(start).getTime()
  const second = new Date(end).getTime()
  if (Number.isNaN(first) || Number.isNaN(second)) return null
  return Math.max(0, Math.round((second - first) / 1000))
}

export function deriveHighlights(theses) {
  const merits = []
  const defects = []
  const uncertain = []
  const other = []
  const seen = new Set()

  for (const row of theses) {
    const key = `${row.id}|${row.statusRaw}|${row.thesis}`
    if (seen.has(key)) continue
    seen.add(key)

    if (row.status === 'неопределено' || row.status === 'не доказано') {
      uncertain.push(row)
      continue
    }
    if (row.status === 'доказано') {
      if (row.group === 'D' || row.group === 'S') merits.push(row)
      else if (row.group === 'C' || row.group === 'N') defects.push(row)
      else other.push(row)
      continue
    }
    if (row.status === 'опровергнуто') {
      if (row.group === 'C') merits.push(row)
      else if (row.group === 'D') defects.push(row)
      else other.push(row)
      continue
    }
    other.push(row)
  }

  return { merits, defects, uncertain, other }
}

function statusTone(status, statuses) {
  const allowed = [...statuses].sort((a, b) => b.length - a.length)
  const match = allowed.find((item) => status.startsWith(item))
  if (!match) return 'unknown'
  switch (match) {
    case 'ОДОБРИТЬ': return 'approve'
    case 'ОДОБРИТЬ С УСЛОВИЯМИ': return 'conditions'
    case 'ОТКЛОНИТЬ': return 'reject'
    case 'НЕДОСТАТОЧНО ДАННЫХ': return 'insufficient'
    default: return 'unknown'
  }
}

function resolveVerdictDisplay(verdict, exists, statuses) {
  if (!exists) {
    return {
      text: 'НЕДОСТАТОЧНО ДАННЫХ',
      tone: 'insufficient',
      known: false,
      fallback: true,
      source: 'protocol-fallback',
    }
  }
  if (!verdict.statusRaw) {
    return {
      text: 'НЕ УКАЗАН',
      tone: 'unknown',
      known: false,
      fallback: false,
      source: 'missing-status-line',
    }
  }
  const tone = statusTone(verdict.statusRaw, statuses)
  return {
    text: verdict.statusRaw,
    tone,
    known: tone !== 'unknown',
    fallback: false,
    source: 'verdict.md',
  }
}

function readSource(caseDir, name, maxBytes) {
  const file = path.join(caseDir, name)
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return { name, exists: false, bytes: 0, text: '', sha256: null, truncated: false }
  }
  const stat = fs.statSync(file)
  const buffer = fs.readFileSync(file)
  let text = buffer.toString('utf8')
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  let truncated = false
  if (buffer.length > maxBytes) {
    text = buffer.subarray(0, maxBytes).toString('utf8')
    truncated = true
  }
  return {
    name,
    exists: true,
    bytes: stat.size,
    text,
    sha256: sha256(buffer),
    truncated,
  }
}

function latestTimestamp(log) {
  const values = []
  if (log?.case?.createdAt) values.push(log.case.createdAt)
  if (log?.case?.completedAt) values.push(log.case.completedAt)
  if (log?.verification?.verifiedAt) values.push(log.verification.verifiedAt)
  if (log?.stage2?.verification?.verifiedAt) values.push(log.stage2.verification.verifiedAt)
  for (const item of log?.events ?? []) {
    if (item.at) values.push(item.at)
  }
  const valid = values
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.time))
    .sort((a, b) => b.time - a.time)
  return valid.length > 0 ? valid[0].value : null
}

function buildHearing(label, schedule, summary, limits) {
  if (!schedule?.phases) return null
  const phases = PHASES.map((phase) => {
    const item = schedule.phases[phase] ?? {}
    const duration = secondsBetween(item.startedAt, item.endedAt)
    const limit = item.maxSeconds ?? limits?.[`${phase}Seconds`] ?? null
    const deadlineRemaining = item.endedAt && item.deadline
      ? Math.round((new Date(item.deadline).getTime() - new Date(item.endedAt).getTime()) / 1000)
      : null
    return {
      phase,
      status: item.status ?? null,
      startedAt: item.startedAt ?? null,
      endedAt: item.endedAt ?? null,
      duration,
      limit,
      deadlineRemaining,
      withinLimit: duration !== null && limit !== null ? duration <= limit : null,
    }
  })
  const total = secondsBetween(schedule.startedAt, schedule.completedAt)
  return {
    label,
    startedAt: schedule.startedAt ?? null,
    completedAt: schedule.completedAt ?? null,
    total,
    totalLimit: limits?.totalSeconds ?? null,
    rounds: summary?.rounds ?? schedule.rounds ?? null,
    phases,
  }
}

function buildVerification(verification) {
  if (!verification) return null
  const checks = verification.checks ?? []
  return {
    ok: Boolean(verification.ok),
    verifiedAt: verification.verifiedAt ?? null,
    total: checks.length,
    passed: checks.filter((check) => check.ok).length,
    failed: checks.filter((check) => !check.ok),
    checks,
  }
}

function buildProcedure(log, config, stage2) {
  const record = log?.case ?? {}
  const limits = record.limits ?? config.limits
  const hearings = []
  if (log?.schedule) {
    hearings.push(buildHearing('V1', { ...log.schedule, completedAt: record.completedAt }, record.outcome, limits))
  }
  if (stage2?.hearing) {
    hearings.push(buildHearing('V2', stage2.hearing, stage2.hearing, limits))
  }

  return {
    caseStatus: record.status ?? null,
    createdAt: record.createdAt ?? null,
    completedAt: record.completedAt ?? null,
    limits,
    hearings: hearings.filter(Boolean),
    verification1: buildVerification(log?.verification),
    verification2: buildVerification(stage2?.verification),
    outcome: {
      rounds: record.outcome?.rounds ?? null,
      missing: record.outcome?.missing ?? [],
      violations: record.outcome?.violations ?? [],
      timedOut: Boolean(record.outcome?.timedOut),
      verdictStatus: record.outcome?.verdictStatus ?? null,
    },
    stage2: stage2
      ? {
        status: stage2.status ?? null,
        checkpoint: stage2.checkpoint ?? null,
        reconstruction: stage2.reconstruction ?? null,
        approval: stage2.approval ?? null,
        missing: stage2.missing ?? [],
        violations: stage2.violations ?? [],
        timedOut: Boolean(stage2.timedOut),
        verdictStatus: stage2.verdictStatus ?? null,
      }
      : null,
  }
}

function buildWarnings({ sources, log, logError, verdict1, verdict2, transcript1, transcript2, comparison, reconstruction, hasV2, stage2, config, display1, display2 }) {
  const warnings = []
  const add = (code, severity, message) => warnings.push({ code, severity, message })

  if (!sources.log.exists) {
    add('log-missing', 'warning', 'Файл log.json отсутствует. Тайминги, проверки регламента и статус дела в отчёте не восстановлены.')
  } else if (logError) {
    add('log-invalid', 'warning', `log.json не удалось разобрать как JSON (${logError}). Машинная часть дела не показана.`)
  }

  if (!sources.case.exists) {
    add('case-missing', 'warning', 'Файл case.md отсутствует. Название дела и условия взяты из log.json; материалы дела не восстановлены.')
  }
  if (!sources.transcript.exists) {
    add('transcript-missing', 'warning', 'Файл transcript.md отсутствует. Позиции сторон и дебаты V1 в отчёт не включены.')
  } else {
    if (transcript1.fallback) {
      add('transcript-structure', 'warning', 'Структура разделов transcript.md не распознана. Содержимое сохранено в порядке файла без разбивки на позиции и раунды.')
    }
    if (!transcript1.positions.prosecution) {
      add('prosecution-missing', 'warning', 'Позиция обвинения V1 не найдена в transcript.md.')
    }
    if (!transcript1.positions.defense) {
      add('defense-missing', 'warning', 'Позиция защиты V1 не найдена в transcript.md.')
    }
    for (const [side, label] of [['prosecution', 'обвинения'], ['defense', 'защиты']]) {
      const position = transcript1.positions[side]
      if (position && position.evidence.length === 0) {
        add(`evidence-${side}-missing`, 'info', `Реестр доказательств ${label} V1 не найден; раздел доказательств опирается на текст позиции.`)
      }
    }
  }

  if (!sources.verdict.exists) {
    add('verdict-missing', 'warning', 'Файл verdict.md отсутствует. Отчёт показывает предусмотренный протоколом маркер НЕДОСТАТОЧНО ДАННЫХ, а не восстановленный вердикт.')
  } else {
    if (!verdict1.statusRaw) {
      add('verdict-status-missing', 'warning', 'В verdict.md не найдена строка «**Статус:**». Статус не подставлен.')
    } else if (!display1.known) {
      add('verdict-status-unknown', 'warning', `Статус вердикта «${verdict1.statusRaw}» не входит в перечень config/tribunal.config.json.`)
    }
    if (!verdict1.hasThesesTable) {
      add('verdict-theses-missing', 'warning', 'В verdict.md не распознана таблица тезисов. Проверенные утверждения в отчёт не включены.')
    }
    if (verdict1.hasConditionsSection && verdict1.conditions.length === 0) {
      add('verdict-conditions-unparsed', 'info', 'Раздел условий найден, но отдельные пункты не выделены; раздел показан дословно.')
    }
  }

  if (!sources.report.exists) {
    add('report-missing', 'warning', 'Файл report.md отсутствует. Отчёт Секретаря V1 не включён в список материалов.')
  }

  const truncatedSources = [sources.case, sources.transcript, sources.verdict, sources.report, ...Object.values(sources.stage2)]
    .filter((source) => source?.truncated)
  if (truncatedSources.length > 0) {
    add('source-truncated', 'warning', `Материалы превысили лимит ${config.stage3?.maxSourceBytes ?? 0} байт и показаны частично: ${truncatedSources.map((source) => source.name).join(', ')}.`)
  }

  if (hasV2) {
    const missing = []
    for (const [key, source] of Object.entries(sources.stage2)) {
      if (!source.exists) missing.push(source.name)
    }
    if (missing.length > 0) {
      add('stage2-materials-missing', 'warning', `Материалы V2 неполные: отсутствуют ${missing.join(', ')}. Разделы V2 показаны только в доступной части.`)
    }
    if (!verdict2.available) {
      add('verdict2-missing', 'warning', 'Вердикт V2 отсутствует. Для версии V2 показан явный маркер, а не восстановленный текст.')
    } else if (!verdict2.statusRaw) {
      add('verdict2-status-missing', 'warning', 'В verdict-v2.md не найдена строка «**Статус:**». Статус V2 не подставлен.')
    } else if (!display2?.known) {
      add('verdict2-status-unknown', 'warning', `Статус вердикта V2 «${verdict2.statusRaw}» не входит в перечень config/tribunal.config.json.`)
    }
    if (!comparison.available) {
      add('comparison-missing', 'warning', 'Файл comparison.md отсутствует. Раздел сравнения V1/V2 не сформирован.')
    } else if (!comparison.hasRequiredSections) {
      add('comparison-incomplete', 'warning', 'В comparison.md не найдены все обязательные разделы сравнения. Показано то, что есть в файле.')
    }
    const ideaV2Source = Object.values(sources.stage2).find((source) => /idea-v2/i.test(source.name))
    if (!ideaV2Source?.exists) {
      add('idea-v2-missing', 'warning', 'Файл idea-v2.md отсутствует. Утверждённая концепция V2 не показана.')
    }
    if (!reconstruction.available) {
      add('reconstruction-missing', 'warning', 'Файл reconstruction.md отсутствует. Реконструкция V2 не показана.')
    } else if (!reconstruction.finalAvailable && reconstruction.draft) {
      add('reconstruction-draft-only', 'warning', 'Итоговая редакция V2 не найдена; раздел реконструкции показывает черновик Архитектора.')
    }
    if (transcript2.available && transcript2.fallback) {
      add('transcript2-structure', 'warning', 'Структура разделов transcript-v2.md не распознана. Содержимое сохранено в порядке файла.')
    }
    if (!transcript2.available) {
      add('transcript2-missing', 'warning', 'Файл transcript-v2.md отсутствует. Позиции сторон повторного суда не показаны.')
    }
  } else {
    add('no-v2', 'info', 'Реконструкция V2 не проводилась: разделы «Реконструкция» и «Сравнение V1/V2» скрыты.')
  }

  const outcome = log?.case?.outcome ?? {}
  if (outcome.timedOut || stage2?.timedOut) {
    add('timed-out', 'warning', 'Хотя бы одна фаза закрыта по таймауту. Незавершённые материалы не восстановлены.')
  }
  const missingMaterials = [...(outcome.missing ?? []), ...(stage2?.missing ?? [])]
  if (missingMaterials.length > 0) {
    add('missing-materials', 'warning', `Отсутствующие материалы: ${missingMaterials.join('; ')}.`)
  }
  const violations = [...(outcome.violations ?? []), ...(stage2?.violations ?? [])]
  if (violations.length > 0) {
    add('violations', 'warning', `Проверка регламента зафиксировала нарушения: ${violations.join(', ')}.`)
  }
  if (stage2?.checkpoint?.decision === 'finish') {
    add('stage2-declined', 'info', 'Пользователь завершил дело после вердикта V1; реконструкция не запускалась.')
  }

  return warnings
}

export function buildReportModel({ caseDir, config }) {
  const stage3 = config.stage3 ?? {}
  const maxBytes = stage3.maxSourceBytes ?? 8 * 1024 * 1024
  const stage1Config = config.artifacts
  const stage2Config = config.stage2?.artifacts ?? {}

  const stage1Names = [
    stage1Config.caseDoc,
    stage1Config.transcript,
    stage1Config.verdict,
    stage1Config.report,
    stage1Config.log,
  ].filter(Boolean)
  const stage2Names = Object.values(stage2Config)

  const loaded = new Map()
  for (const name of [...stage1Names, ...stage2Names]) {
    if (!loaded.has(name)) loaded.set(name, readSource(caseDir, name, maxBytes))
  }

  const sources = {
    case: loaded.get(stage1Config.caseDoc) ?? readSource(caseDir, stage1Config.caseDoc, maxBytes),
    transcript: loaded.get(stage1Config.transcript) ?? readSource(caseDir, stage1Config.transcript, maxBytes),
    verdict: loaded.get(stage1Config.verdict) ?? readSource(caseDir, stage1Config.verdict, maxBytes),
    report: loaded.get(stage1Config.report) ?? readSource(caseDir, stage1Config.report, maxBytes),
    log: loaded.get(stage1Config.log) ?? readSource(caseDir, stage1Config.log, maxBytes),
    stage2: {},
  }
  for (const name of stage2Names) {
    sources.stage2[name] = loaded.get(name) ?? readSource(caseDir, name, maxBytes)
  }

  let log = null
  let logError = null
  if (sources.log.exists) {
    try {
      log = JSON.parse(sources.log.text)
    } catch (error) {
      logError = error instanceof Error ? error.message : String(error)
    }
  }

  const stage2 = log?.stage2 ?? null
  const caseDoc = parseCase(sources.case.text)
  const verdict1 = parseVerdict(sources.verdict.text)
  const transcript1 = parseTranscript(sources.transcript.text)

  const ideaV2Name = stage2Config.ideaV2
  const verdictV2Name = stage2Config.verdictV2
  const reconstructionName = stage2Config.reconstruction
  const transcriptV2Name = stage2Config.transcriptV2
  const comparisonName = stage2Config.comparison

  const ideaV2Source = sources.stage2[ideaV2Name]
  const reconstructionSource = sources.stage2[reconstructionName]
  const verdict2 = parseVerdict(sources.stage2[verdictV2Name]?.text ?? '')
  const transcript2 = parseTranscript(sources.stage2[transcriptV2Name]?.text ?? '')
  const comparison = parseComparison(sources.stage2[comparisonName]?.text ?? '')
  const reconstruction = parseReconstruction(reconstructionSource?.text ?? '', ideaV2Source?.text ?? '')

  const hasV2 = Boolean(
    verdict2.available
    || transcript2.available
    || reconstruction.available
    || ideaV2Source?.exists
    || stage2?.checkpoint?.decision === 'reconstruct',
  )
  const hasReconstruction = Boolean(reconstruction.available || ideaV2Source?.exists || stage2?.reconstruction?.startedAt)
  const hasComparison = Boolean(comparison.available)
  const hasRetrial = Boolean(verdict2.available || transcript2.available || stage2?.hearing?.startedAt)

  const record = log?.case ?? {}
  const title = record.title || caseDoc.title || path.basename(caseDir)
  const statuses = config.verdictStatuses ?? []
  const display1 = resolveVerdictDisplay(verdict1, sources.verdict.exists, statuses)
  const display2 = resolveVerdictDisplay(verdict2, Boolean(sources.stage2[verdictV2Name]?.exists), statuses)

  const highlights1 = deriveHighlights(verdict1.theses)
  const highlights2 = deriveHighlights(verdict2.theses)

  const warnings = buildWarnings({
    sources,
    log,
    logError,
    verdict1,
    verdict2,
    transcript1,
    transcript2,
    comparison,
    reconstruction,
    hasV2,
    stage2,
    config,
    display1,
    display2,
  })

  const sourceFiles = [
    {
      name: stage1Config.caseDoc,
      role: 'Условия дела: идея, контекст, предположения, границы',
      stage: 'V1',
      required: true,
      source: sources.case,
    },
    {
      name: stage1Config.transcript,
      role: 'Стенограмма V1: позиции сторон и раунды дебатов',
      stage: 'V1',
      required: true,
      source: sources.transcript,
    },
    {
      name: stage1Config.verdict,
      role: 'Вердикт V1 Судьи',
      stage: 'V1',
      required: true,
      source: sources.verdict,
    },
    {
      name: stage1Config.report,
      role: 'Отчёт Секретаря по V1',
      stage: 'V1',
      required: true,
      source: sources.report,
    },
    {
      name: stage1Config.log,
      role: 'Машинная запись: тайминги, события, проверки',
      stage: 'V1',
      required: true,
      source: sources.log,
    },
    {
      name: ideaV2Name,
      role: 'Утверждённая концепция V2',
      stage: 'V2',
      required: false,
      source: sources.stage2[ideaV2Name],
    },
    {
      name: reconstructionName,
      role: 'Реконструкция: черновик, рецензия Аудитора, итоговая редакция',
      stage: 'V2',
      required: false,
      source: sources.stage2[reconstructionName],
    },
    {
      name: transcriptV2Name,
      role: 'Стенограмма повторного суда V2',
      stage: 'V2',
      required: false,
      source: sources.stage2[transcriptV2Name],
    },
    {
      name: verdictV2Name,
      role: 'Вердикт V2 Судьи со сверкой с V1',
      stage: 'V2',
      required: false,
      source: sources.stage2[verdictV2Name],
    },
    {
      name: comparisonName,
      role: 'Сравнение V1/V2 и итоговая рекомендация',
      stage: 'V2',
      required: false,
      source: sources.stage2[comparisonName],
    },
  ].filter((entry) => Boolean(entry.name))

  const outputName = stage3.artifact ?? 'verdict.html'
  const sourceDigest = sha256(
    sourceFiles
      .map((entry) => `${entry.name}:${entry.source?.sha256 ?? 'missing'}`)
      .join('|'),
  )

  const resolveFileCache = new Map()
  const resolveFile = (name) => {
    if (resolveFileCache.has(name)) return resolveFileCache.get(name)
    const safeName = String(name ?? '').trim()
    let result = { exists: false, href: null }
    if (/^[\w.-]+\.(?:md|json|txt|csv|html)$/i.test(safeName)) {
      const file = path.join(caseDir, safeName)
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        result = { exists: true, href: encodeURI(safeName) }
      }
    }
    resolveFileCache.set(name, result)
    return result
  }

  const procedure = buildProcedure(log, config, stage2)
  const generatedAt = latestTimestamp(log)

  return {
    case: {
      id: record.id ?? path.basename(caseDir),
      slug: record.slug ?? null,
      title,
      status: record.status ?? null,
      createdAt: record.createdAt ?? null,
      completedAt: record.completedAt ?? null,
      date: isoDate(record.createdAt ?? record.startedAt) ?? null,
    },
    hasV2,
    hasReconstruction,
    hasComparison,
    hasRetrial,
    stage2,
    sources,
    sourceFiles,
    caseDoc,
    verdict1,
    verdict2,
    transcript1,
    transcript2,
    reconstruction,
    comparison,
    display1,
    display2,
    highlights1,
    highlights2,
    procedure,
    warnings,
    generator: {
      name: 'AI Tribunal HTML Report',
      version: stage3.generatorVersion ?? '1.0.0',
      generatedAt,
      generatedAtDisplay: formatDateTime(generatedAt),
      sourceDigest,
      sourceDigestShort: sourceDigest.slice(0, 12),
      outputName,
      maxSourceBytes: maxBytes,
      command: 'node scripts/tribunal.mjs report-html --case "<caseDir>"',
    },
    resolveFile,
    formatBytes,
    formatDateTime,
    isoDate,
  }
}
