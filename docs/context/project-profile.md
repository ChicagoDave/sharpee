# Project Profile

**Generated**: 2026-08-23
**Repository**: sharpee (`@sharpee/*` lockstep v5.1.1; Chord language versioned independently at v3.3.0, ADR-257)

## Domains

- Domain Modeling — `world-model` traits/behaviors/capability dispatch (ADR-090), `if-domain` contracts
- API / Service (Engine) — `engine` turn cycle/scheduler, `stdlib` validate/execute/report actions (ADR-051), `parser-en-us` grammar
- Chord Story Language — `packages/chord` (lexer/parser/analyzer/IR), `story-loader`, `bootstrap`; new `packages/world-index` derives map/reachability/vocab-gaps from Story IR (ADR-321, current branch)
- Normative Character Layer — `packages/character` (goals, influence, propagation, arbiter, dialogue, act-detection, ADR-310/318)
- Testing Intelligence — `packages/branch-tester` (tree/coverage/auto-assertion), IDE testing-surface
- macOS IDE — `tools/ide/SharpeeIDE` (Swift/XCTest) + `tools/ide/web/{docs-tab,testing-tab,testing-surface}`
- Event Sourcing / Messaging — `event-processor`, `channel-service` (ADR-163 universal channel wire), `plugin-scheduler`/`plugin-npc`/`plugin-state-machine`
- Frontend UI (web) — `platform-browser`, `runtime`, `media`, `website/` (Next.js/React)
- CLI / Tooling — `devkit` (author tool), `tools/repokit` (in-repo build CLI, ADR-187), `bridge`, `helpers`, `queries`, `ide-protocol`
- Library / Package — publishable `@sharpee/*` packages with generated API docs (`packages/sharpee/docs/genai-api/`)

## Tech Stack

- **Language**: TypeScript 5.x (ES2022, CommonJS) for platform/Chord/IDE-web; Swift for `SharpeeIDE`
- **Runtime**: Node.js; native macOS app hosting bundled Node + WKWebView surfaces
- **Framework**: Custom in-memory World Model engine; Next.js/React (`website/`); AppKit/SwiftUI (`SharpeeIDE`)
- **Data layer**: None (external) — in-memory `WorldModel`, versioned save format (ADR-293)
- **Messaging**: In-process event/effect dispatch (`event-processor`), channel-I/O wire (`channel-service`); no external broker
- **Test framework**: Vitest 3.x per-package, Stryker 9.x (mutation), custom `.transcript` walkthrough tester, `branch-tester` tree-runner, XCTest (Swift)
- **Test command**: `pnpm exec turbo run test:ci` — runs every workspace package's `vitest run` non-interactively (bare `test` scripts are watch mode). Transcript regression baseline (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`) requires `./repokit build dungeo` first and is a separate manual gate per CLAUDE.md.
- **Build tool**: `@davidcornelson/tsf` (ts-forge), Turborepo, esbuild; `./repokit` (platform build) and `./sharpee` (author tool); Xcode/`xcodebuild` for `SharpeeIDE`
- **Package manager**: pnpm 10.13.1 workspace
- **CI/CD**: GitHub Actions — `build-platforms.yml`, `publish-npm.yml`
- **Monorepo**: Yes (pnpm workspaces + Turborepo). `pnpm-workspace.yaml` is authoritative; root `package.json`'s `workspaces` array is stale (lists `packages/forge`, `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`, none present on disk)

## Conventions

- **Test location**: separate `test`/`tests` dirs per package; story transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`; IDE tests under `tools/ide/SharpeeIDETests` and `tools/ide/web/testing-surface/tests`
- **Test naming**: `*.test.ts` (Vitest), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style), `*Tests.swift` (XCTest)
- **Source structure**: layer-based per package; actions follow a 4-file convention (`<name>.ts`, `-data.ts`, `-events.ts`, `-messages.ts`, `-types.ts`); `character` is sub-module-based; `SharpeeIDE` is feature-folder-based
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch` via shared `tsconfig.base.json`
- **Import style**: CommonJS resolution (Node), composite project references; no path-alias convention at root
- **Language layer separation**: all user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit message-ID-only events

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)
- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes, capability dispatch (`findTraitWithCapability`), scheduler/turn-cycle state transitions, `event-processor` effect application, `RandomService` draws against a named `ChoicePoint`
- **Reporting without mutation**: an action's `report` phase emitting text/events without `execute` having called a behavior mutator or changed state
- **Test assertions — verify**: post-call `WorldModel` state inspection, emitted event message IDs + payload, byte-identical transcript output at a pinned seed
- **Test assertions — insufficient**: "didn't throw," asserting only on `execute()`'s return value, asserting event type without payload

### Chord Story Language (chord, story-loader, bootstrap, world-index)
- **Mutation calls**: lexer/parser/analyzer producing tokens → AST → Story IR; diagnostic sink mutations; `world-index` deriving map/reachability/vocab-gap reports from IR
- **Reporting without mutation**: claiming a construct "compiles" without an emitted IR node; a diagnostic "caught" with nothing pushed to the sink
- **Test assertions — verify**: shape/contents of emitted IR, specific diagnostic codes/spans, `world-index` output asserted against known story fixtures
- **Test assertions — insufficient**: asserting `parse()`/`analyze()` returned without throwing; snapshotting IR without asserting specific fields

### Normative Character Layer (packages/character)
- **Mutation calls**: tick-phase advances, goal/influence/propagation state changes, arbiter decisions (`apply.ts`), act-detection classification, conversation state advances
- **Reporting without mutation**: narrating a reaction without a corresponding goal/influence state change
- **Test assertions — verify**: post-tick state inspection, arbiter output traced to state read/written
- **Test assertions — insufficient**: asserting a tick "completed" without checking which goals/edges changed

### Testing Intelligence (branch-tester, testing-surface)
- **Mutation calls**: `RandomService` draws scoped to a `ChoicePoint`; `branch-tester` tree mutations; `from-play.ts` serializing a play session into a transcript
- **Reporting without mutation**: marking a branch "passing" without an actual re-run and diff
- **Test assertions — verify**: actual replay of a `continues:` branch against pinned-seed output
- **Test assertions — insufficient**: running a walkthrough once with unpinned randomness and eyeballing output

## Notes

- Active branch `feat/adr-321-world-index` adds `packages/world-index` (new since last profile) — static Story IR analysis for map/reachability/vocab gaps.
- Platform version 5.1.1, Chord language version 3.3.0 — both bumped since the prior 2026-08-16 profile (5.0.1 / 3.0.0).
- ADR count now 336 (was 325).
- Per project direction notes: platform (`packages/`) is mature infrastructure secondary to Chord + the macOS IDE; platform changes require discussion first (CLAUDE.md).
