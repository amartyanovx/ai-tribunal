import assert from 'node:assert/strict'
import { apply as applyGuard } from '../agents/dsh-ai-tribunal/tribunal-guard.js'
import { apply as applySpawn, ROLES } from '../agents/dsh-ai-tribunal/tribunal-spawn-v3.js'
import { isRole, roleOfSessionId, roleSessionId } from '../agents/dsh-ai-tribunal/role-registry.js'

assert.deepEqual(
  ROLES,
  ['prosecutor', 'defense', 'judge', 'architect', 'auditor'],
  'stage-2 reconstruction roles must be spawnable',
)

// Role identity is durable and stateless: a freshly imported module recognises
// a session id minted before it was loaded, which is the cold-resume case.
const roleSession = roleSessionId('prosecutor', '11111111-1111-4111-8111-111111111111')
assert.equal(roleOfSessionId(roleSession), 'prosecutor')
assert.equal(isRole(roleSession), true)
assert.equal(isRole(roleSessionId('architect', '22222222-2222-4222-8222-222222222222')), true)
assert.equal(isRole('session-24a28184-673d-4342-8954-4bddafd1e50b'), false)
assert.equal(isRole('tribunal-unknown-33333333-3333-4333-8333-333333333333'), false)
assert.equal(isRole('tribunal-prosecutor-'), false, 'a prefix without a suffix is not a role session')

const reloaded = await import('../agents/dsh-ai-tribunal/role-registry.js?reload=1')
assert.equal(reloaded.isRole(roleSession), true, 'role recognition must not depend on module state')
assert.equal(reloaded.roleOfSessionId(roleSession), 'prosecutor')

let guard
applyGuard({ tools: { guard: (fn) => { guard = fn } } })
assert.equal(typeof guard, 'function', 'tribunal-guard must register a guard')

const role = { session: { id: roleSession } }
const architect = { session: { id: roleSessionId('architect', '44444444-4444-4444-8444-444444444444') } }
const secretary = { session: { id: 'session-secretary' } }

const denied = guard({ name: 'write', agent: role })
assert.ok(denied && denied.reason.includes('read-only'), 'role write must be denied')
assert.ok(guard({ name: 'pwsh', agent: role }), 'role shell must be denied')
assert.ok(guard({ name: 'tribunal_spawn', agent: role }), 'role spawn must be denied')
assert.ok(guard({ name: 'tribunal_deadline', agent: role }), 'role deadline control must be denied')
assert.ok(guard({ name: 'send_message', agent: role }), 'role messaging must be denied')
assert.ok(guard({ name: 'write', agent: architect }), 'stage-2 reconstruction sessions must be read-only')
assert.equal(guard({ name: 'read', agent: role }), undefined, 'role read must be allowed')
assert.equal(guard({ name: 'write', agent: secretary }), undefined, 'secretary write must be allowed')
assert.equal(guard({ name: 'write', agent: undefined }), undefined, 'no agent leaves the call unchanged')
assert.ok(guard({ name: 'write', agent: { id: roleSession } }), 'agent.id fallback must still deny a role session')

// Spawner: the child id is reserved before startActivation is called, so the
// guard sees the role marker on the child's very first tool call.
const tools = new Map()
const cleanups = []
const interrupts = []
const parent = { id: 'session-lead', session: { id: 'session-lead' } }
let nameToId = new Map()
let startedSpecs = []

const ctx = {
  effect: (fn) => {
    const cleanup = fn()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
    return cleanup
  },
  logger: { info: () => {}, warn: () => {} },
  tools: { register: (definition) => { tools.set(definition.name, definition) } },
  subagents: {
    resolveName: async (_caller, name) => {
      if (!nameToId.has(name)) throw new Error(`unknown agent ${name}`)
      return nameToId.get(name)
    },
    interrupt: (childId) => { interrupts.push(String(childId)) },
    startActivation: async (spec) => {
      startedSpecs.push(spec)
      assert.equal(isRole(spec.childId), true, 'the child id must already be a role id before creation')
      return { childId: spec.childId, name: spec.name, result: Promise.resolve(), dispose: async () => {} }
    },
  },
}
applySpawn(ctx)
assert.ok(tools.has('tribunal_spawn'))
assert.ok(tools.has('tribunal_deadline'))

const spawn = tools.get('tribunal_spawn')
const exec = { agent: parent, signal: new AbortController().signal }

const started = await spawn.execute({
  role: 'prosecutor',
  description: 'first position',
  prompt: 'charter',
  name: 'prosecutor',
  deadlineAt: new Date(Date.now() + 60).toISOString(),
}, exec)
assert.equal(started.role, 'prosecutor')
assert.equal(isRole(started.sessionId), true)
assert.equal(startedSpecs.length, 1)
assert.equal(startedSpecs[0].name, 'prosecutor')

await new Promise((resolve) => setTimeout(resolve, 120))
assert.ok(interrupts.includes(started.sessionId), 'the deadline must interrupt the role child')

nameToId = new Map([['prosecutor', started.sessionId]])
const deadline = tools.get('tribunal_deadline')
interrupts.length = 0
const armed = await deadline.execute({
  agents: ['prosecutor'],
  deadlineAt: new Date(Date.now() + 40).toISOString(),
  reason: 'debate round 1',
}, exec)
assert.equal(armed.agents[0].sessionId, started.sessionId)
await new Promise((resolve) => setTimeout(resolve, 100))
assert.ok(interrupts.includes(started.sessionId), 'tribunal_deadline must re-arm the hard deadline')

await assert.rejects(
  deadline.execute({ agents: ['prosecutor'], deadlineAt: '2000-01-01T00:00:00.000Z' }, exec),
  /already passed/,
  'tribunal_deadline must not arm a deadline that can never stop the next turn',
)

await assert.rejects(
  spawn.execute({ role: 'judge', description: 'no deadline', prompt: 'charter' }, exec),
  /requires deadlineAt/,
  'court roles must not be spawnable without a hard deadline',
)
await assert.rejects(
  spawn.execute({ role: 'prosecutor', description: 'past', prompt: 'charter', deadlineAt: '2000-01-01T00:00:00.000Z' }, exec),
  /already passed/,
  'a past deadline must not start a role',
)

const reconstruction = await spawn.execute({
  role: 'architect',
  description: 'reconstruction',
  prompt: 'charter',
}, exec)
assert.equal(isRole(reconstruction.sessionId), true)
assert.equal(roleOfSessionId(reconstruction.sessionId), 'architect')

for (const cleanup of cleanups) cleanup()

console.log('guard test OK')
