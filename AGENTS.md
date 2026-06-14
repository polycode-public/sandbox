# AGENTS.md

Guidance for AI agents working in this repository, on the open
[AGENTS.md](https://agents.md) standard (AAIF). Claude Code also reads `CLAUDE.md`;
keep a pointer there if needed. This file is assembled from agentic-lib's
`components/agents/` fragments at `init` time — edit those upstream, not here.

This repository is part of the **intentïon** fleet. Its fixed point is `INTENT.md`.
The delivery engine is [`@polycode-public/agentic-lib`](https://github.com/polycode-public/agentic-lib):
one trigger runs **one whole transformation** (work item → PR-ready branch) via
`claude -p`, then stops. The agent holds no plan and no state between runs —
decomposition and memory live in the marginalia supervisor graph.

<!-- assembled: components/agents/house-conventions.md -->
## House conventions

- **Runtime**: Node.js 24+, ES modules. No TypeScript build step.
- **Tests**: Vitest for unit/behaviour; Playwright where a web surface exists.
- **Dependencies**: minimal — prefer the standard library and the engine's built-in
  tools over adding packages.
- **One transformation per run**: a single linear session whose only state is the
  checkout. Iteration is a new trigger, never a loop counter.
- **Small, reviewable changes**: one work item per PR; do not reformat untouched
  lines; leave the test suite green.

<!-- assembled: components/agents/definition-of-done.md -->
## Definition of done

Done is mechanical: a **draft PR exists** referencing its work item, and the change
makes the suite pass. You do not decide whether the intent is realised (the graph
and operator do). **Never merge; never decide scope.** Oversized intents are split
into work items by the supervisor; you execute exactly one, statelessly.

<!-- assembled: components/agents/provenance.md -->
## Provenance contract

Every PR carries a closure trailer — `fixes #N` / `Fixes #N` — for the work item it
resolves; the shared `transform.yml` workflow gates on it. Use conventional-commit
prefixes. All work runs under one stable bot identity.
