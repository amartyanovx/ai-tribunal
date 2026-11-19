/**
 * Durable identity of Tribunal role sessions.
 *
 * A role child's session id is reserved *before* the child is created and is
 * persisted with the session. Encoding the role in that id makes the read-only
 * decision independent of module state: `tribunal-guard` recognises a role
 * session on its very first tool call, after a cold resume, and after the
 * Harness process restarts. There is no in-memory Set to lose.
 *
 * The unique suffix is opaque; callers normally pass a UUID.
 */
export const ROLE_NAMES = Object.freeze(['prosecutor', 'defense', 'judge', 'architect', 'auditor'])

const PREFIX = 'tribunal-'
const UNIQUE_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Build the durable session id for one role child.
 * @param {string} role - one of {@link ROLE_NAMES}.
 * @param {string} unique - non-empty unique suffix (a UUID for spawned roles).
 * @returns {string} a session id whose prefix identifies the role.
 */
export function roleSessionId(role, unique) {
  if (!ROLE_NAMES.includes(role)) {
    throw new Error(`unknown Tribunal role: ${String(role)}`)
  }
  const suffix = String(unique ?? '').trim().toLowerCase()
  if (!UNIQUE_PATTERN.test(suffix)) {
    throw new Error(`invalid Tribunal role session suffix: ${JSON.stringify(unique)}`)
  }
  return `${PREFIX}${role}-${suffix}`
}

/**
 * Read the role encoded in a session id.
 * @param {unknown} id - any session id.
 * @returns {string | null} the role name, or null for an ordinary session.
 */
export function roleOfSessionId(id) {
  const value = String(id ?? '')
  for (const role of ROLE_NAMES) {
    const prefix = `${PREFIX}${role}-`
    if (value.startsWith(prefix) && value.length > prefix.length) return role
  }
  return null
}

/**
 * Whether this session id belongs to a read-only Tribunal role.
 * @param {unknown} id - any session id.
 * @returns {boolean} true for a role session, false for the Secretary and
 * ordinary sessions.
 */
export function isRole(id) {
  return roleOfSessionId(id) !== null
}
