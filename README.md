# AI Tribunal

**Status:** early scaffold — the repository is initialized, but there is no implementation yet.

AI Tribunal is a project about structured, multi-agent AI deliberation. Instead of asking one
model for an answer, a group of independent AI participants — roles such as advocates, experts
and judges — examine the same question, argue their positions, and produce a reasoned verdict.
Disagreement is preserved as evidence rather than averaged away.

## Why

A single model response collapses uncertainty into one voice. Many real questions — policy,
architecture, risk assessment, factual disputes — are better served by a transparent process:
independent positions, explicit challenges, and a verdict that can be audited back to the
arguments that produced it.

## Design goals (working draft)

- **Independent reasoning first, deliberation second.** Participants form positions before
  they see each other's arguments.
- **Explicit protocol.** Roles, turn order and the verdict format are defined, not improvised.
- **Auditable transcripts.** Every claim in the verdict traces back to a participant and a turn.
- **Model-agnostic.** Any provider or local model sits behind a single participant interface.

## Repository layout (planned)

```text
src/        application code
docs/       design notes and decision records
tests/      automated tests
scripts/    developer tooling
```

## Getting started

There is nothing to run yet. Prerequisites, installation and usage will be documented here as
the project takes shape.

## Roadmap

- [x] Initialize the repository
- [ ] Define the tribunal protocol: roles, turns, verdict format
- [ ] Implement a minimal multi-agent deliberation loop
- [ ] Store and replay transcripts
- [ ] Build an evaluation harness for verdict quality

## License

Not chosen yet.
