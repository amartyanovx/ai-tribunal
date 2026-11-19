/**
 * Thin Tribunal spawner: starts a role child in a fresh DSH subagent session
 * under the same AI Tribunal preset. The role prompt and charter path are
 * supplied by the Secretary from the project; no per-role DSH preset exists.
 */
import { markRole } from './role-registry.js'

export const name = 'tribunal-spawn'
export const inject = ['subagents', 'tools']

export const ROLES = ['prosecutor', 'defense', 'judge', 'architect', 'auditor']

export function apply(ctx) {
  ctx.tools.register({
    name: 'tribunal_spawn',
    description: 'Start one AI Tribunal role in a fresh subagent session: prosecutor, defense, judge, '
      + 'or a temporary stage-2 reconstruction role (architect, auditor). '
      + 'The child inherits the AI Tribunal preset and is made read-only by the Tribunal guard. '
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
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `started AI Tribunal ${value.role} subagent ${value.name}`,
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) throw new Error('tribunal_spawn requires a calling agent')
      const childName = args.name ?? args.role
      const started = await ctx.subagents.startActivation({
        provider: 'spawn',
        label: args.description,
        name: childName,
        prompt: [{ type: 'text', text: args.prompt }],
        parent,
        ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
        // Secretary may itself be a child of the launcher (depth 1); role children
        // are then depth 2. A role child cannot start a third level.
        maxDepth: 2,
        signal: exec.signal,
        delivery: 'parent',
      })
      // Mark before the child's first model turn can issue a tool call.
      markRole(started.childId)
      return { kind: 'activation', name: started.name, role: args.role }
    },
  })
}
