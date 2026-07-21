# Project Profile: Sharpee

**Generated**: 2026-07-16
**Repository**: sharpee_v2 (`@sharpee/sharpee` v2.1.1, published to npm)

## Domains

- **Domain Modeling** — DDD-style `world-model` package: traits, behaviors, capability dispatch (ADR-090, ADR-207 per-instance registry), `if-domain` contract types; recent additions include `HealthTrait` (ADR-226) and death-trigger patterns (ADR-224/227)
- **API / Service (Engine)** — `engine` owns turn cycle/scheduler; `stdlib` standard actions (validate/execute/report/blocked, ADR-051); `parser-en-us` grammar (ADR-087, ADR-225 meta-verb layer)
- **Chord Story Language (Compiler Frontend)** — `packages/chord` (v3.0.0): lexer, parser, semantic analyzer, Story IR wire types, diagnostics for the `.story` author language (ADR-210 and its children ADR-213–227: platform parity, extensions/combat, emit payload/media, timer controls, foundations, liquids/pouring, doors/portals, capability-dispatch fallback wiring, NPC four-layer separation, conditional hazard death, parser meta-verb layer, health trait, death-trigger patterns). Interpreter-primary, IR-centric per ADR-210. Current branch (`chord-foundations`) is active Chord work
- **Natural-Language Text Rendering ("Phrase Algebra")** — `text-blocks` + `lang-en-us`: phrase-model assembler core and atom system (ADR-192–200: state-derived adjectives, contents/slot/pronoun/numeral/verbatim atoms, verb-subject agreement), dialogue/speech emission (ADR-201–203), structural realization (ADR-202), game-message param contract (ADR-206)
- **Event Sourcing / Messaging** — `event-processor` dispatches effects/events; `ext-daemon`, `plugin-scheduler`, `plugin-state-machine`, `plugin-npc` for daemons/fuses/NPC turn phases; ADR-208 interceptor registry (engine-owned, per-world)
- **Frontend UI** — `web-client`, `platform-browser`, `map-editor` (Vite), `tools/zifmia` multi-user server with bundled browser client, `website/` (Astro) for the public docs/book site
- **CLI / Tooling / Author Platform** — `packages/devkit` (author tool, invoked via `./sharpee`), `packages/transcript-tester`, `tools/repokit` (in-repo platform build CLI, ADR-187 split), `tools/ide`, `tools/vscode-ext`
- **Library / Package** — Publishable `@sharpee/*` npm packages with auto-generated GenAI API docs (`packages/sharpee/docs/genai-api/`)
- **Long-Form Documentation / Publishing** — `docs/book` (the Sharpee Book), built to `site/*.html|.pdf|.epub` via `scripts/build-book.sh`; naive-regression QA gate (transcript-driven walkthroughs of every chapter) went GREEN for v2.0.0

## Tech Stack

- **Language**: TypeScript 5.x (ES2022 target, CommonJS modules)
- **Runtime**: Node.js
- **Framework(s)**: Custom in-memory World Model engine (no external DB); Astro for `website/`
- **Data layer**: None — in-memory `WorldModel`, entity/trait system persisted via save/load (no external DB/ORM)
- **Messaging**: In-process event/effect dispatch (`event-processor`), daemon/fuse scheduling (`plugin-scheduler`) — no external broker
- **Test framework**: Vitest 3.x (unit/integration), Stryker 9.x (mutation testing), custom transcript tester (`.transcript` walkthrough/integration format run via `dist/cli/sharpee.js --test`)
- **Build tool**: `@davidcornelson/tsf` (ts-forge) for package compilation, Turborepo for task orchestration, esbuild for CLI/browser bundling; two build CLIs per ADR-187 — `./repokit` (in-repo platform build) and `./sharpee` (author tool / `@sharpee/devkit`, redirects workspace stories to `./repokit`)
- **Package manager**: pnpm 10.13.1 workspace
- **CI/CD**: GitHub Actions — `beta-release.yml`, `build-platforms.yml`, `pages.yml` (site publish), `zifmia-publish.yml`
- **Monorepo**: Yes (pnpm workspaces + Turborepo) — packages under `packages/*` (incl. `packages/extensions/*`, `packages/platforms/*`), stories under `stories/*` (7 stories: armoured, channel-service-test, cloak-of-darkness, concealment-test, dungeo, friendly-zoo, thealderman), `tools/{repokit,shite,zifmia,ide,vscode-ext}`

## Conventions

- **Test location**: Separate `test`/`tests` dirs per package (excluded from `tsc` build via tsconfig `exclude`); story walkthrough/unit transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`
- **Test naming**: `*.test.ts` (Vitest unit tests), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style integration tests)
- **Source structure**: Layer-based by package (traits/behaviors in world-model, actions in stdlib, grammar in parser-en-us, text/messages in lang-en-us); actions follow a 4-file convention: `<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, `<name>-types.ts`; `chord` compiler frontend follows lexer → parser → analyzer → IR staging (`lexer.ts`, `parser.ts`, `ast.ts`, `analyzer.ts`, `ir.ts`, `catalog.ts`, `diagnostics.ts`, `span.ts`)
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` (via shared `tsconfig.base.json`, composite project references)
- **Import style**: CommonJS module resolution (Node), per-package `references` for project-reference builds; no path-alias convention observed at root
- **Language layer separation**: All user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit semantic events with message IDs only (no embedded English)
- **Versioning**: Uniform lockstep versioning across `@sharpee/*` packages (currently 2.1.1); format `X.Y.Z` or `X.Y.Z-beta` for pre-release, stamped before compilation

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)

- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes (e.g., `LightSourceBehavior`, `ContainerTrait` mutators, `HealthTrait`/`HealthBehavior`), capability dispatch handlers (`findTraitWithCapability`), scheduler/turn-cycle state transitions, event/effect application in `event-processor`, prescribed-surface death triggers (ADR-227)
- **Reporting without mutation**: An action's `report` phase emitting success text/events without the corresponding `execute` phase having called a behavior mutator or changed entity/trait state — flag as silent no-op
- **Test assertions — verify**: Post-call inspection of `WorldModel` entity/trait state (e.g., location changed, trait flag flipped, inventory contents updated, health/alive-status changed), or emitted semantic events with correct message IDs and payload
- **Test assertions — insufficient**: Asserting only that an action "didn't throw," asserting only on the return value of `execute()` without checking world state, asserting on event *type* without checking event *payload*

### Chord Story Language (packages/chord)

- **Mutation calls**: Lexer producing a token stream from `.story` source; parser building an AST from tokens (error recovery/diagnostics on malformed input); semantic analyzer resolving symbols, validating catalog references, and lowering AST to Story IR; diagnostic collection mutating a diagnostics sink
- **Reporting without mutation**: Claiming a `.story` construct "compiles" without an actual IR node being emitted for it; a diagnostic described as "caught" with no corresponding entry pushed to the diagnostics collection
- **Test assertions — verify**: Asserting on the shape/contents of the emitted IR (not just that parsing "succeeded"), asserting on specific diagnostic codes/spans for invalid input, round-trip tests comparing Chord source against known-good IR fixtures
- **Test assertions — insufficient**: Asserting only that `parse()` or `analyze()` returned without throwing; snapshotting IR without asserting on the specific fields under test; treating "no diagnostics" as sufficient without checking the IR is actually correct

### Phrase Algebra / Text Rendering (text-blocks, lang-en-us)

- **Mutation calls**: Phrase-model assembler composing atoms (state-derived adjective, contents, slot, pronoun, numeral, verbatim) into a realized string; subject-verb agreement resolution; message-param substitution
- **Reporting without mutation**: Returning a phrase-model object without invoking the assembler/realizer — i.e., "built the model but never rendered text"
- **Test assertions — verify**: Asserting on the final rendered string output (exact text or normalized form) for a given world state/param set, not just that an atom object was constructed
- **Test assertions — insufficient**: Snapshot-only tests with no explicit assertion of expected wording; asserting the phrase-model shape without ever calling the realizer

### Event Sourcing / Messaging (event-processor, plugin-scheduler, plugin-npc, plugin-state-machine)

- **Mutation calls**: Effect/event dispatch to registered handlers, fuse/daemon scheduling and firing, NPC turn-phase state transitions (ADR-223 four-layer separation), interceptor registry mutations (ADR-208)
- **Reporting without mutation**: A daemon/fuse reported as "fired" with no corresponding scheduled-state change or handler invocation
- **Test assertions — verify**: Post-turn inspection of scheduler state (fuse/daemon queue), confirmation a registered handler actually ran (side effect or spy invocation tied to real dispatch), NPC state after a turn
- **Test assertions — insufficient**: Asserting an event was *constructed* without asserting it was *dispatched* and *handled*

### Long-Form Documentation / Publishing (docs/book, site build)

- **Mutation calls**: `scripts/build-book.sh` regenerating `site/*.html|.pdf|.epub`; naive-regression runs executing every book-referenced transcript/walkthrough against the built platform
- **Reporting without mutation**: Marking the naive-regression gate "GREEN" without an accompanying clean run log; claiming a chapter fix without re-running its walkthrough transcript
- **Test assertions — verify**: Transcript run exits clean (zero unexpected diffs) against `dist/cli/sharpee.js`, referenced against the specific published npm version tested
- **Test assertions — insufficient**: Manual read-through of a chapter without executing its transcripts; treating RNG-based combat/thief flakes as gate failures (see "one-good-run" rule — a single clean run is baseline)

## Notes

- **New since the 2026-07-07 profile**: `packages/chord` (v3.0.0) is now a substantial compiler-frontend package (lexer/parser/analyzer/IR/catalog/diagnostics) implementing the Chord story language (ADR-210 family). It was not yet present/tracked as a domain in the prior profile. Current branch `chord-foundations` plus recent commits (ADR-224/226/227) show active work on death mechanics and Chord/Sharpee capability parity.
- **Root `package.json` `workspaces` field is stale** relative to `pnpm-workspace.yaml` (the actual source of truth). The `package.json` list still names `packages/forge`, `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*` and omits `packages/chord`, `devkit`, `bootstrap`, `bridge`, `interpreter`, etc. `pnpm-workspace.yaml` uses `packages/*` with explicit exclusions (`!packages/map-editor`, `!packages/interpreter`) plus curated story members (`stories/dungeo`, `channel-service-test`, `friendly-zoo`, `cloak-of-darkness`) and `tools/{shite,zifmia,repokit}`. Do not trust `package.json`'s `workspaces` array when reasoning about active packages — read `pnpm-workspace.yaml`.
- `tools/shite` remains a workspace member per `pnpm-workspace.yaml` despite being flagged abandoned/reference-only in `CLAUDE.md` (ADR-180) — the glob still resolves it; do not assume workspace membership implies active maintenance.
- Two build CLIs by design (ADR-187): `./repokit` for platform devs, `./sharpee` for authors — do not conflate them when scripting builds.
- The Sharpee Book has two live editions referenced in `site/`: `the-sharpee-book.*` (current) and `the-sharpee-book-v2.0.0.*` (pinned v2.0.0).
- v1.5 (`familyzoo`) is a frozen legacy line, no longer a workspace member (moved out per `pnpm-workspace.yaml` comment) — per project memory, never regression-test it during v2 work.
- 235 top-level ADR files under `docs/architecture/adrs/` (plus `batch/`, `core-systems/`, `outdated/`, `Twine-Integration/` subdirectories not included in that count); most recent are ADR-223 through ADR-227 covering NPC layering, conditional hazard death, parser meta-verb layer, health trait, and death-trigger patterns.
- ~327K lines TypeScript across packages/stories/tools; 423 `*.test.ts` files; 153 `.transcript` integration/walkthrough files — all counts grew materially since the prior profile (was ~305K LOC / 294 tests / 133 transcripts), consistent with the new `chord` package and death/health feature work.
- Several `docs/context/.devarch-events-*.jsonl` files are present untracked in git status — internal DevArch event logs, not part of the profile signal set but worth noting if doing repo hygiene.
