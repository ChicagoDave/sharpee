# Project Profile: Sharpee

**Generated**: 2026-04-11

## Domains
- **Domain Modeling** — DDD-style `world-model` package with traits, behaviors, capabilities, and capability dispatch (ADR-090)
- **API / Service (Engine)** — `engine` owns turn cycle; `stdlib` has 43 standard actions (validate/execute/report/blocked); `parser-en-us` handles grammar
- **Event Sourcing / Messaging** — `event-processor` dispatches effects/events; `ext-daemon` + `plugin-scheduler` for daemons and fuses (ADR-071)
- **Frontend UI** — `web-client`, `platform-browser`, `zifmia` bundled client with themes, `map-editor` with Vite
- **CLI / Tooling** — `cli` package, `transcript-tester`, `ts-forge` build tool, `./build.sh` orchestrator
- **Library / Package** — Publishable `@sharpee/*` npm packages with GenAI API docs

## Tech Stack
- TypeScript 5.2+ / Node.js 22
- Custom IF engine (in-memory WorldModel, no external DB)
- Vitest 3.x + Stryker 9.x (mutation testing)
- Turborepo + esbuild bundling
- pnpm 10.13.1 workspace (27 packages, 8 stories)
- GitHub Actions CI (beta-release, build-platforms)

## Conventions
- Tests: separate `tests/` dir per package; story transcripts at `stories/{story}/tests/transcripts/*.transcript`
- Naming: `*.test.ts` for unit tests, `*.transcript` for walkthrough integration tests
- Structure: layer-based by package; region-based within stories (one room per file)
- TypeScript: `strict: true`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Four-phase action pattern: validate/execute/report/blocked
- Language layer separation: semantic events with message IDs, no English in engine/stdlib/world-model

## Scale
- ~98,630 lines TypeScript
- 190 test files, 8,211 expect() assertions
- 123 transcript test files (~11,800 lines)
- 159 ADRs (15 approved/accepted, 2 withdrawn)
- 69 exported domain contract types in if-domain
