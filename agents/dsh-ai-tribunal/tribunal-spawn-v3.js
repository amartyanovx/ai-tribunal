/**
 * Thin Tribunal spawner and hard-deadline enforcer.
 *
 * `tribunal-spawn` starts a role child in a fresh DSH subagent session under
 * the same AI Tribunal preset. The role prompt and charter path are supplied
 * by the Secretary from the project; no per-role DSH preset exists.
 *
 * Isolation: the child's durable session id is reserved *before* creation and
 * encodes the role, so `tribunal-guard` can deny dangerous tools on the first
 * model step and after any later session restore without module state.
 *
 * Time: every court role is started with an absolute `deadlineAt`. The plugin
 * interrupts that child when the deadline is reached, instead of relying on a
 * duration check after the fact. `tribunal_deadline` re-arms the same hard
 * deadline for existing role sessions that receive another turn (debate rounds).
 */
import { randomUUID } from 'node:crypto'
import { roleSessionId } from './role-registry.js'

export const name = 'tribunal-spawn'
export const inject = ['subagents', 'tools']

export const ROLES = ['prosecutor', 'defense', 'judge', 'architect', 'auditor']
const COURT_ROLES = new Set(['prosecutor', 'defense', 'judge'])
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1

function parseDeadline(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('deadlineAt must be a non-empty ISO-8601 timestamp')
  }
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`deadlineAt is not a valid ISO-8601 timestamp: ${JSON.stringify(value)}`)
  }
  return milliseconds
}

function timerKey(parent, childId) {
  return `${parent.id}:${String(childId)}`
}

/**
 * Arm one forced interruption. The timer only stops the child's current work;
 * it never writes case files or invents a result. A child that already
 * finished is left untouched by the subagent service.
 * @param {object} ctx - plugin context carrying `subagents` and `logger`.
 * @param {Map<string, {timer: ReturnType<typeof setTimeout>, deadlineAt: number}>} timers - live timers.
 * @param {object} parent - exact calling Agent, used as ancestor authority.
 * @param {string} childId - durable role session id.
 * @param {number} deadlineAt - absolute epoch milliseconds.
 * @param {string} reason - diagnostic recorded in the log.
 */
function armDeadline(ctx, timers, parent, childId, deadlineAt, reason) {
  const key = timerKey(parent, childId)
  const previous = timers.get(key)
  if (previous !== undefined) clearTimeout(previous.timer)

  const delay = Math.max(0, Math.min(deadlineAt - Date.now(), MAX_TIMER_DELAY_MS))
  const timer = setTimeout(() => {
    timers.delete(key)
    try {
      ctx.subagents.interrupt(childId, { kind: 'ancestor', agent: parent })
    } catch (error) {
      ctx.logger?.warn?.(`tribunal-spawn: could not interrupt ${String(childId)} at its deadline: ${String(error)}`)
    }
  }, delay)
  timer.unref?.()
  timers.set(key, { timer, deadlineAt })
  ctx.logger?.info?.(`tribunal-spawn: armed ${String(childId)} deadline at ${new Date(deadlineAt).toISOString()} (${reason})`)
}

export function apply(ctx) {
  const timers = new Map()
  ctx.effect(() => () => {
    for (const { timer } of timers.values()) clearTimeout(timer)
    timers.clear()
  })

  ctx.tools.register({
    name: 'tribunal_spawn',
    description: 'Start one AI Tribunal role in a fresh subagent session: prosecutor, defense, judge, '
      + 'or a temporary stage-2 reconstruction role (architect, auditor). '
      + 'The child inherits the AI Tribunal preset and is made read-only by the Tribunal guard. '
      + 'Court roles require an absolute deadlineAt; the plugin interrupts the child when it is reached. '
      + 'Returns the child name to use with send_message, wait_agent and interrupt_agent.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['role', 'description', 'prompt'],
      properties: {
        role: {
          type: 'string',
          enum: ROLES,
          description: 'Tribunal role to start.',
        },
        description: {
          type: 'string',
          description: 'Short label for the child session, 3–5 words.',
        },
        prompt: {
          type: 'string',
          description: 'Complete role prompt, including the role charter path and case paths.',
        },
        deadlineAt: {
          type: 'string',
          description: 'Absolute ISO-8601 deadline for the current hearing phase. Required for prosecutor, '
            + 'defense and judge; omitted for stage-2 reconstruction roles outside the hearing clock.',
        },
        name: {
          type: 'string',
          description: 'Optional child name; defaults to the role. Lower-case letters, digits and hyphens.',
        },
        cwd: {
          type: 'string',
          description: 'Optional initial working directory for the child.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'role'],
        properties: {
          kind: { type: 'string', const: 'activation' },
          name: { type: 'string' },
          role: { type: 'string' },
          sessionId: { type: 'string' },
          deadlineAt: { type: 'string' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `started AI Tribunal ${value.role} subagent ${value.name}`
          + (value.deadlineAt === undefined ? '' : `; hard deadline ${value.deadlineAt}`),
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) throw new Error('tribunal_spawn requires a calling agent')
      const deadlineAt = args.deadlineAt === undefined ? null : parseDeadline(args.deadlineAt)
      if (COURT_ROLES.has(args.role) && deadlineAt === null) {
        throw new Error(`tribunal_spawn role "${args.role}" requires deadlineAt: an enforcement deadline is not optional`)
      }
      if (deadlineAt !== null && deadlineAt <= Date.now()) {
        throw new Error(`tribunal_spawn deadlineAt has already passed: ${args.deadlineAt}`)
      }
      const childName = args.name ?? args.role
      // Reserve the durable identity before the child exists: every tool call
      // from the child's first model step sees the role marker, and a cold
      // resume keeps the same session id.
      const childId = roleSessionId(args.role, randomUUID())
      const started = await ctx.subagents.startActivation({
        provider: 'spawn',
        label: args.description,
        name: childName,
        childId,
        prompt: [{ type: 'text', text: args.prompt }],
        parent,
        ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
        // Secretary may itself be a child of the launcher (depth 1); role children
        // are then depth 2. A role child cannot start a third level.
        maxDepth: 2,
        signal: exec.signal,
        delivery: 'parent',
      })
      if (deadlineAt !== null) {
        armDeadline(ctx, timers, parent, started.childId, deadlineAt, `spawn ${args.role}`)
      }
      return {
        kind: 'activation',
        name: started.name,
        role: args.role,
        sessionId: String(started.childId),
        ...(deadlineAt === null ? {} : { deadlineAt: new Date(deadlineAt).toISOString() }),
      }
    },
  })

  ctx.tools.register({
    name: 'tribunal_deadline',
    description: 'Arm or refresh the hard deadline for one or more already-started Tribunal role sessions. '
      + 'Use it when a role receives another turn (a debate round) under an existing phase deadline. '
      + 'At deadlineAt the plugin interrupts those sessions; it does not write or invent any result.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['agents', 'deadlineAt'],
      properties: {
        agents: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Role agent names returned by tribunal_spawn.',
        },
        deadlineAt: {
          type: 'string',
          description: 'Absolute ISO-8601 deadline of the current hearing phase.',
        },
        reason: {
          type: 'string',
          description: 'Optional short diagnostic, such as the debate round.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['deadlineAt', 'agents'],
        properties: {
          deadlineAt: { type: 'string' },
          agents: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['agent', 'sessionId'],
              properties: {
                agent: { type: 'string' },
                sessionId: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `armed hard deadline ${value.deadlineAt} for ${String(value.agents.length)} Tribunal role session(s)`,
      }],
    },
    async execute(args, exec) {
      const caller = exec.agent
      if (caller === undefined) throw new Error('tribunal_deadline requires a calling agent')
      const deadlineAt = parseDeadline(args.deadlineAt)
      if (deadlineAt <= Date.now()) {
        throw new Error(`tribunal_deadline deadlineAt has already passed: ${args.deadlineAt}`)
      }
      const armed = []
      for (const agentName of args.agents) {
        const targetId = await ctx.subagents.resolveName(caller, agentName, exec.signal)
        armDeadline(ctx, timers, caller, targetId, deadlineAt, args.reason ?? 'existing role session')
        armed.push({ agent: agentName, sessionId: String(targetId) })
      }
      return { deadlineAt: new Date(deadlineAt).toISOString(), agents: armed }
    },
  })
}
