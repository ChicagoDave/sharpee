# Project Profile: sharpee

**Generated**: 2026-03-27

## Domains

1. **Library / Package** — 20+ published `@sharpee/*` npm packages, meta-package `@sharpee/sharpee`, barrel exports, beta release pipeline
2. **Domain Modeling** — `world-model` traits/behaviors, DDD entity system, capability dispatch (ADR-090), four-phase action pattern (ADR-051)
3. **API / Service** — `engine` (turn cycle, command executor), `stdlib` (43 standard actions: validate/execute/report/blocked)
4. **Event Sourcing** — `event-processor`, `core/events/`, semantic event IDs (`if.event.*`), language-layer separation enforced
5. **Frontend UI** — `zifmia` (React 18/19 story runner), `map-editor` (Electron + React + Vite + XYFlow), `platform-browser`
6. **CLI / Tooling** — `platforms/cli-en-us` (Vite bundle), `transcript-tester`, `forge` (authoring DSL), `dist/cli/sharpee.js` bundle
7. **Frontend State** — Zustand in `map-editor` for visual editor state

## Stack

- TypeScript 5.2+ / Node.js 20 / `strict: true` + `noImplicitAny` + `noImplicitReturns`
- Vitest 3.x with `@vitest/coverage-v8`
- Turborepo 2.x + pnpm 10.13.1 workspaces (~23 packages)
- tsc (primary) + Vite (browser/CLI bundles) + esbuild
- GitHub Actions CI (beta-release workflow, npm publish on tags)
- No ORM / no database — in-memory `WorldModel`
- React 18/19 (Zifmia), Electron (map-editor)
