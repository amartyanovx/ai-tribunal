/**
 * Shared registry of Tribunal role sessions.
 *
 * `tribunal-spawn` marks each child it starts; `tribunal-guard` uses the mark
 * to deny write/shell/spawn tools for exactly those sessions. The Secretary
 * (the root of the Tribunal preset, or a child of a launcher) is never marked,
 * so it keeps its authoring tools.
 */
const ROLE_IDS = new Set()

/** Mark one child session as a read-only Tribunal role. */
export function markRole(id) {
  ROLE_IDS.add(String(id))
}

/** Whether this session id belongs to a read-only Tribunal role. */
export function isRole(id) {
  return ROLE_IDS.has(String(id))
}
