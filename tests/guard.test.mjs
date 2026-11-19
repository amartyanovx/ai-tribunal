import assert from 'node:assert/strict'
import { apply } from '../agents/dsh-ai-tribunal/tribunal-guard.js'
import { markRole } from '../agents/dsh-ai-tribunal/role-registry.js'
import { ROLES } from '../agents/dsh-ai-tribunal/tribunal-spawn-v3.js'

assert.deepEqual(
  ROLES,
  ['prosecutor', 'defense', 'judge', 'architect', 'auditor'],
  'stage-2 reconstruction roles must be spawnable',
)

let guard
apply({ tools: { guard: (fn) => { guard = fn } } })
assert.equal(typeof guard, 'function', 'tribunal-guard must register a guard')

markRole('role-session-1')
markRole('architect-session')

const role = { session: { id: 'role-session-1' } }
const architect = { session: { id: 'architect-session' } }
const secretary = { session: { id: 'secretary-session' } }

const denied = guard({ name: 'write', agent: role })
assert.ok(denied && denied.reason.includes('read-only'), 'role write must be denied')

assert.ok(guard({ name: 'pwsh', agent: role }), 'role shell must be denied')
assert.ok(guard({ name: 'tribunal_spawn', agent: role }), 'role spawn must be denied')
assert.ok(guard({ name: 'send_message', agent: role }), 'role messaging must be denied')
assert.ok(guard({ name: 'write', agent: architect }), 'stage-2 reconstruction sessions must be read-only')
assert.equal(guard({ name: 'read', agent: role }), undefined, 'role read must be allowed')
assert.equal(guard({ name: 'write', agent: secretary }), undefined, 'secretary write must be allowed')
assert.equal(guard({ name: 'write', agent: undefined }), undefined, 'no agent leaves the call unchanged')

console.log('guard test OK')
