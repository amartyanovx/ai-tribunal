/**
 * Read-only guard for AI Tribunal role sessions.
 *
 * The one AI Tribunal preset gives every agent the same tool surface. The
 * guard closes the dangerous tools at execution time for the sessions that
 * `tribunal-spawn` marked as Prosecutor, Defense or Judge. The Secretary is
 * never marked, so it keeps fs-write, shell, spawn and presentation tools.
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
  'send_message',
  'interrupt_agent',
  'present',
  'ask_user_question',
])

export function apply(ctx) {
  ctx.tools.guard((exec) => {
    const agent = exec.agent
    if (agent === undefined) return undefined
    if (!isRole(agent.session.id)) return undefined
    if (!DENY.has(exec.name)) return undefined
    return {
      reason: `AI Tribunal role sessions are read-only: "${exec.name}" is not available here. `
        + 'State the limitation in your reply instead of retrying; the Secretary owns all case files.',
    }
  })
}
