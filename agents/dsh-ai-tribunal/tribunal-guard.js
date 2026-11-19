/**
 * Read-only guard for AI Tribunal role sessions.
 *
 * The one AI Tribunal preset gives every agent the same tool surface. The
 * guard closes the dangerous tools at execution time for sessions whose
 * durable session id carries a Tribunal role marker. The marker is reserved
 * before the child is created (see `tribunal-spawn`) and survives cold resume
 * and process restart, so the guard never depends on temporary module state.
 * The Secretary's session id carries no marker, so it keeps fs-write, shell,
 * spawn and presentation tools.
 */
import { isRole } from './role-registry.js'

export const name = 'tribunal-guard'
export const inject = ['tools']

const DENY = new Set([
  'write',
  'edit',
  'apply_patch',
  'pwsh',
  'bash',
  'subagent',
  'subagent_fork',
  'tribunal_spawn',
  'tribunal_deadline',
  'send_message',
  'interrupt_agent',
  'present',
  'ask_user_question',
])

export function apply(ctx) {
  ctx.tools.guard((exec) => {
    const agent = exec.agent
    if (agent === undefined) return undefined
    const sessionId = agent.session?.id ?? agent.id
    if (!isRole(sessionId)) return undefined
    if (!DENY.has(exec.name)) return undefined
    return {
      reason: `AI Tribunal role sessions are read-only: "${exec.name}" is not available here. `
        + 'State the limitation in your reply instead of retrying; the Secretary owns all case files.',
    }
  })
}
