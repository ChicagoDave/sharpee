# Project Profile

**Generated**: 2026-09-11
**Repository**: sharpee (`@sharpee/*` lockstep v5.3.1; Chord language versioned independently at v3.6.0, ADR-257)

## Domains

- Domain Modeling — `world-model` traits/behaviors/capability dispatch (ADR-090, ADR-346), `if-domain` contracts
- API / Service (Engine) — `engine` turn cycle/scheduler (ADR-342 package contract, ADR-343 StoryEngine role, ADR-344 player role-holder seam, ADR-345 explicit lifecycle phase), `stdlib` validate/execute/report actions (ADR-051), `parser-en-us` grammar
- Chord Story Language — `packages/chord` (lexer/parser/analyzer/IR), `story-loader`, `bootstrap`; `packages/world-index` derives map/reachability/vocab-gaps from Story IR (ADR-321 — now merged to `main`, no longer a feature branch)
- Normative Character Layer — `packages/character` (goals, influence, propagation, arbiter, dialogue, act-detection, ADR-310/318)
- Testing Intelligence — `packages/branch-tester` (tree/coverage/auto-assertion, ADR-340 unified assertion core), IDE testing-surface
- macOS IDE — `tools/ide/SharpeeIDE` (Swift/XCTest) + `tools/ide/web/{docs-tab,testing-tab,testing-surface}`
- Event Sourcing / Messaging — `event-processor`, `channel-service` (ADR-163 universal channel wire), `plugin-scheduler`/`plugin-state-machine`/`plugins` (generic turn-plugin registry: `band-crossing.ts`, `plugin-registry.ts`, `turn-plugin.ts` — no separate `plugin-npc` package)
- Frontend UI (web) — `platform-browser`, `runtime`, `media`, `website/` (Next.js/React)
- CLI / Tooling — `devkit` (author tool), `tools/repokit` (in-repo build CLI, ADR-187), `bridge`, `helpers`, `queries`, `ide-protocol`
- Library / Package — publishable `@sharpee/*` packages with generated API docs (`packages/sharpee/docs/genai-api/`)
- Story Content (branch stories) — `branch-stories/secret-letter` (active port of the 2009 game, structural work only, currently ON HOLD per user direction), `branch-stories/fernhill`, `branch-stories/ides-of-march`; `stories/*` in-repo example/test stories (`dungeo`, `cloak-of-darkness`, `family-zoo-tutorial`, `thealderman`, `friendly-zoo`, `armoured` (retired sample), etc.)

## Tech Stack

- **Language**: TypeScript 5.x (ES2022, CommonJS) for platform/Chord/IDE-web; Swift for `SharpeeIDE`
- **Runtime**: Node.js; native macOS app hosting bundled Node + WKWebView surfaces
- **Framework**: Custom in-memory World Model engine; Next.js/React (`website/`); AppKit/SwiftUI (`SharpeeIDE`)
- **Data layer**: None (external) — in-memory `WorldModel`, versioned save format (ADR-293)
- **Messaging**: In-process event/effect dispatch (`event-processor`), channel-I/O wire (`channel-service`); no external broker
- **Test framework**: Vitest 3.x per-package, Stryker 9.x (mutation), custom `.transcript` walkthrough tester, `branch-tester` tree-runner (drives `.chord`/`.story` content, e.g. `./sharpee test branch-stories/secret-letter`), XCTest (Swift)
- **Test command**: `pnpm exec turbo run test:ci` — runs every workspace package's `vitest run` non-interactively (bare `test` scripts are watch mode). **Known gap (GH #402, open)**: `packages/extensions/basic-combat` declares only a bare `test` script, no `test:ci`, so this command never reaches it — it currently has 2 failing tests invisible to the gate. `pnpm typecheck` (`turbo run typecheck`) became a real per-package gate this week (GH #400/#404, 77/77 packages passing 2026-09-11) and should be treated as a second mandatory leg alongside `test:ci`; a stricter `pnpm typecheck:tests` leg (test-file type errors) exists as a burn-down in progress (GH #401, open — 1,500 real errors remain across 14 packages, ratcheted onto 18 already-clean packages so regressions there fail immediately). Transcript regression baseline (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`) requires `./repokit build dungeo` first and is a separate manual gate per CLAUDE.md. Story-content trees (e.g. Secret Letter) run via `./sharpee test <story-dir>`, a separate gate from the platform's `test:ci`.
- **Build tool**: `@davidcornelson/tsf` (ts-forge), Turborepo, esbuild; `./repokit` (platform build) and `./sharpee` (author tool); Xcode/`xcodebuild` for `SharpeeIDE`
- **Package manager**: pnpm 10.13.1 workspace
- **CI/CD**: GitHub Actions — `build-platforms.yml`, `publish-npm.yml`
- **Monorepo**: Yes (pnpm workspaces + Turborepo). `pnpm-workspace.yaml` is authoritative (with documented exclusions: `map-editor`, `_archive/**`, retired `interpreter`/`shite`/`zifmia` tools, a deliberately-absent `extensions/conversation` stub); root `package.json`'s `workspaces` array is stale (lists `packages/forge`, `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`, none present on disk)

## Conventions

- **Test location**: separate `test`/`tests` dirs per package; story transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`; branch-story test trees at `branch-stories/{story}/{story}.tests.json`; IDE tests under `tools/ide/SharpeeIDETests` and `tools/ide/web/testing-surface/tests`
- **Test naming**: `*.test.ts` (Vitest), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style), `*Tests.swift` (XCTest), `{story}.tests.json` (branch-tester trees)
- **Source structure**: layer-based per package; actions follow a 4-file convention (`<name>.ts`, `-data.ts`, `-events.ts`, `-messages.ts`, `-types.ts`); `character` is sub-module-based; `SharpeeIDE` is feature-folder-based; `engine` was reorganized this week (ADR-334/342) into `command/`, `install/`, `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`, with a narrowed 31-named-export public surface; branch stories are per-NPC `.chord` files imported by a holder `.story` file
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch` via shared `tsconfig.base.json`; each package now also carries a `tsconfig.test.json` (test-file typecheck leg, GH #401) alongside its `tsconfig.json`
- **Import style**: CommonJS resolution (Node) for src; test configs use `module: "esnext"` specifically so `import.meta` (used by vitest-run ESM test files) type-checks correctly, while keeping `moduleResolution` identical to src; composite project references; no path-alias convention at root
- **Language layer separation**: all user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit message-ID-only events

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)
- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes, capability dispatch (`findTraitWithCapability`), scheduler/turn-cycle state transitions (now an explicit lifecycle-phase concept per ADR-345), `event-processor` effect application, `RandomService` draws against a named `ChoicePoint` (test engines are seeded by default as of GH #410 — no more wall-clock-seeded test runs)
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
- **Mutation calls**: `RandomService` draws scoped to a `ChoicePoint`; `branch-tester` tree mutations; `from-play.ts` serializing a play session into a transcript; unified assertion core (ADR-340) shared between `transcript-tester` and `branch-tester`
- **Reporting without mutation**: marking a branch "passing" without an actual re-run and diff
- **Test assertions — verify**: actual replay of a `continues:` branch against pinned-seed output; `states:` pins on entity location/story-counter fields (e.g. `loaf.location`, `player.location`, `story.state`) checked after the triggering card
- **Test assertions — insufficient**: running a walkthrough once with unpinned randomness and eyeballing output

### Branch Story Content (branch-stories/secret-letter and siblings)
- **Mutation calls**: rule 15's function-name/side-effect-file signal does not fire for `.chord`/`.story` content — mutation verification for story work is carried entirely by the `.tests.json` tree's `states:` pins, not by the `mutation-verification` agent
- **Reporting without mutation**: a session narrative claiming a scene/theft/branch "works" without a corresponding new or updated tree card and a passing `./sharpee test <story-dir>` run
- **Test assertions — verify**: `states:` pins asserting on entity `location`, story counters (e.g. `thefts`), and `story.state` transitions at the specific card the mutation occurs on
- **Test assertions — insufficient**: a tree card that only checks output text without a `states:` pin on the underlying entity/counter change

## Notes

- Platform version 5.3.1, Chord language version 3.6.0 — both bumped since the prior 2026-08-30 profile (5.2.0 / 3.5.0), largely via the "refactoring survey" (ADRs 334-340, PR #397 merged) plus the ADR-342/343/344/345/346 sequence this week. Per user ruling, these versions move at publish, not per landing — not a signal to chase every commit.
- `packages/world-index` (ADR-321) is now on `main` — the prior profile's "not yet merged, feature branch" note no longer applies.
- ADR count 356 (up from 336), most recent ADR-346 "traits do not police completeness." ADRs live at `docs/architecture/adrs/adr-NNN-*.md`, not `docs/adrs/` as DEVARCH.md's generic path implies — worth knowing when an agent goes looking.
- **New this week: a real typecheck gate.** `pnpm typecheck` was a silent no-op until GH #400 (closed) made it a genuine per-package `tsc --noEmit` gate across 77 packages; GH #404 (closed) closed the last three uncovered paths. GH #401 (open) is building out a second, stricter leg — test-file typechecking — currently red by design with 1,500 real errors concentrated in stdlib (872) and world-model (210), 39% of which trace to one mechanical `ITrait` excess-property pattern; 18 packages are already clean and ratcheted so they can't regress silently.
- **Known live gap**: GH #402 (open) — `packages/extensions/basic-combat` has 2 pre-existing failing tests invisible to `turbo run test:ci` because the package never wired a `test:ci` script (only bare `test`, watch mode). Confirmed pre-existing, not caused by this week's changes.
- Secret Letter port (`branch-stories/secret-letter`) is ON HOLD indefinitely per user direction (2026-09-09) — do not treat it as active work; it appears in domains for completeness only.
- Corrected from the prior profile: there is no `plugin-npc` package; NPC/turn-plugin infrastructure lives in the generic `packages/plugins` (`band-crossing.ts`, `plugin-registry.ts`, `turn-plugin.ts`) alongside `plugin-scheduler` and `plugin-state-machine`.
- `engine` underwent a significant internal reshape this week (ADR-334 residue phases, ADR-342/343/344/345) — package contract narrowed to 31 named exports, root modules moved into `command/`, `install/`, `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`, and the player role-holder now installs at a validated seam rather than falling back. Any prior mental model of `engine`'s file layout is stale.
