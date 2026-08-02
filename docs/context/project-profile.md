# Project Profile: Sharpee

**Generated**: 2026-08-02
**Repository**: sharpee (`@sharpee/*` lockstep v4.3.0, published to npm; Chord language version tracked independently at v2.2.0)

## Domains

- **Domain Modeling** — DDD-style `world-model` package: traits, behaviors, capability dispatch (ADR-090, ADR-207 per-instance registry), `if-domain` contract types; computed exits (ADR-295) added traversal-resolution logic to exit resolution
- **API / Service (Engine)** — `engine` owns turn cycle/scheduler; `stdlib` standard actions (validate/execute/report/blocked, ADR-051); `parser-en-us` grammar — now generated from Chord source (ADR-269: `standard-en-us.story`, 410 rules/55 blocks, `repokit grammar` build step)
- **Chord Story Language (Compiler Frontend + Interpreter)** — `packages/chord` (v4.3.0 npm package; language itself versioned independently at 2.2.0 per ADR-257): lexer, parser, semantic analyzer, Story IR, diagnostics for the `.story` author language. `packages/story-loader` is the generic Story IR interpreter (ADR-210); `packages/bootstrap` is the single story-assembly loader shared by transcript-tester/CLI/devkit (ADR-180); `packages/interpreter` is legacy Tauri-runner-only. Recent language work: numeric counters (ADR-264, Chord 1.4.0), banded meters/hunger/sanity (ADR-262/263), grammar pattern constructs + rule ordering + parity (ADR-266/267/268), standard grammar as Chord source (ADR-269, IMPLEMENTED), Chord Writer authoring surface (ADR-280/281/284/285/286)
- **Deterministic Execution / Choice Points** — new since the last profile: seed authority + named RNG streams (ADR-291), testability/bounded-outcome-search contract (ADR-292), choice points with per-point RNG streams (ADR-293, replaces `ActionContext.random` with `RandomService`, save format 3.0.0), golden-transcripts tester rebuild (ADR-294, `transcript-tester/src/golden.ts`, `.golden` fixture files per walkthrough), prose-order emission ownership (ADR-296). This is the most active architectural arc in the current session run
- **Natural-Language Text Rendering ("Phrase Algebra")** — `text-blocks` + `lang-en-us`: phrase-model assembler core and atom system (ADR-192–206), turn narrative slots (ADR-296: transactions order sources, slots place phrases)
- **Event Sourcing / Messaging** — `event-processor` dispatches effects/events; `ext-daemon`/`plugin-scheduler`/`plugin-state-machine`/`plugin-npc` for daemons/fuses/NPC turn phases; ADR-208 interceptor registry
- **Frontend UI** — `packages/platform-browser`, `packages/media`, `packages/map-editor` (excluded from workspace via `!packages/map-editor`), `packages/runtime` (headless engine runtime for iframe embedding via postMessage), `tools/zifmia` multi-user server, `website/` — now **Next.js 16 / React 19** (previously Astro), includes an embedded Chord editor (CodeMirror-based)
- **CLI / Tooling / Author Platform** — `packages/devkit` (author tool, `./sharpee`), `packages/transcript-tester` (rebuilt on ADR-294: `golden.ts`, `runner.ts`, `aggregate.ts`, `watch.ts`), `tools/repokit` (in-repo platform build CLI, ADR-187), `tools/ide` (includes Swift-based Chord lexer golden tests), `tools/vscode-ext`, `packages/bridge` (Node subprocess bridge, newline-delimited JSON over stdin/stdout), `packages/helpers` (fluent entity builders), `packages/queries` (LINQ-style fluent entity query API)
- **Library / Package** — Publishable `@sharpee/*` npm packages with auto-generated GenAI API docs (`packages/sharpee/docs/genai-api/`)
- **Long-Form Documentation / Publishing** — `docs/book` (two live editions: `v1.5.0/`, `v2.0.0/`), naive-regression QA gate (transcript-driven walkthroughs of every chapter)

## Tech Stack

- **Language**: TypeScript 5.x (ES2022 target, CommonJS modules)
- **Runtime**: Node.js
- **Framework(s)**: Custom in-memory World Model engine (no external DB); **Next.js 16 / React 19** for `website/` (changed from Astro since last profile)
- **Data layer**: None — in-memory `WorldModel`, entity/trait system persisted via save/load (save format now **3.0.0**, ADR-293 — versioned reader added)
- **Messaging**: In-process event/effect dispatch (`event-processor`), daemon/fuse scheduling (`plugin-scheduler`) — no external broker
- **Test framework**: Vitest 3.x (unit/integration), Stryker 9.x (mutation testing, `stryker.config.json`), custom transcript tester (`.transcript` walkthrough/integration format, rebuilt around a **golden-fixture model** — ADR-294 — run via `dist/cli/sharpee.js --test`); `tools/ide` additionally carries Swift-based golden tests for the Chord lexer
- **Build tool**: `@davidcornelson/tsf` (ts-forge) for package compilation, Turborepo for task orchestration, esbuild for CLI/browser bundling; two build CLIs per ADR-187 — `./repokit` (in-repo platform build, now includes a `grammar` build step per ADR-269) and `./sharpee` (author tool / `@sharpee/devkit`)
- **Package manager**: pnpm 10.13.1 workspace
- **CI/CD**: GitHub Actions — now just `build-platforms.yml` and `publish-npm.yml` (consolidated; the prior `beta-release.yml`, `pages.yml`, and `zifmia-publish.yml` are no longer present)
- **Monorepo**: Yes (pnpm workspaces + Turborepo). `pnpm-workspace.yaml` (the actual source of truth, NOT root `package.json`'s stale `workspaces` array) lists `packages/*` plus `packages/extensions/{testing,basic-combat,scoring,hunger}`, excludes `!packages/map-editor` and `!packages/interpreter`, and curates workspace stories to `dungeo`, `channel-service-test`, `family-zoo-tutorial`, `cloak-of-darkness` plus `tools/{shite,zifmia,repokit}`. The `stories/` directory on disk now has 13 entries (armoured, channel-service-test, cloak-of-darkness, concealment-test, counter-demo, dungeo, family-zoo-tutorial, fernhill, friendly-zoo, grammar-alterations, hunger-demo, nautical, thealderman) — more than are actual workspace members; several are pure-Chord `.story` projects with no `package.json` (ADR-252 D2)

## Conventions

- **Test location**: Separate `test`/`tests` dirs per package (excluded from `tsc` build via tsconfig `exclude`); story walkthrough/unit transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`, each walkthrough now paired with a `.golden` fixture (ADR-294)
- **Test naming**: `*.test.ts` (Vitest unit tests), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style integration tests), `wt-*.golden` (golden output fixtures)
- **Source structure**: Layer-based by package (traits/behaviors in world-model, actions in stdlib, grammar in parser-en-us — now generated from `packages/parser-en-us/grammar/standard-en-us.story`, text/messages in lang-en-us); actions follow a 4-file convention: `<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, `<name>-types.ts`; `chord` compiler frontend follows lexer → parser → analyzer → IR staging
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` (via shared `tsconfig.base.json`, composite project references) — unchanged
- **Import style**: CommonJS module resolution (Node), per-package `references` for project-reference builds; no path-alias convention observed at root
- **Language layer separation**: All user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit semantic events with message IDs only (no embedded English)
- **Versioning**: Uniform lockstep versioning across `@sharpee/*` packages (currently 4.3.0). The **Chord language** now carries an independent semantic version (ADR-257) — currently 2.2.0 — decoupled from the platform release train and from the IR wire-format version; format `X.Y.Z`, stamped before compilation
- **RNG/determinism discipline** (new, ADR-291–293): `ActionContext.random` is gone — all randomness routes through `RandomService` via named `ChoicePoint`s with per-point seed derivation; tests assert byte-identical output at a pinned seed, not just "didn't throw" or "ran without error"

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)

- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes (e.g., `LightSourceBehavior`, `ContainerTrait` mutators, `HealthTrait`/`HealthBehavior`), capability dispatch handlers (`findTraitWithCapability`), scheduler/turn-cycle state transitions, event/effect application in `event-processor`, computed-exit traversal resolution (ADR-295), `RandomService` draws against a named `ChoicePoint` (ADR-293)
- **Reporting without mutation**: An action's `report` phase emitting success text/events without the corresponding `execute` phase having called a behavior mutator or changed entity/trait state — flag as silent no-op; a randomness-consuming action that reads `Math.random()` directly instead of drawing from a named `ChoicePoint`/`RandomService` stream (ADR-291–293 violation)
- **Test assertions — verify**: Post-call inspection of `WorldModel` entity/trait state (e.g., location changed, trait flag flipped, inventory contents updated, health/alive-status changed), emitted semantic events with correct message IDs and payload, or byte-identical transcript output at a pinned seed against a committed `.golden` fixture
- **Test assertions — insufficient**: Asserting only that an action "didn't throw," asserting only on the return value of `execute()` without checking world state, asserting on event *type* without checking event *payload*, treating "no diagnostics" or a clean exit as sufficient without checking the golden fixture actually matches

### Chord Story Language (packages/chord, story-loader, bootstrap)

- **Mutation calls**: Lexer producing a token stream from `.story` source; parser building an AST from tokens (error recovery/diagnostics on malformed input); semantic analyzer resolving symbols, validating catalog references, and lowering AST to Story IR; diagnostic collection mutating a diagnostics sink; `story-loader` interpreting Story IR into a runnable Story; counter `raise`/`lower` mutations (ADR-264) clamped silently at bounds
- **Reporting without mutation**: Claiming a `.story` construct "compiles" without an actual IR node being emitted for it; a diagnostic described as "caught" with no corresponding entry pushed to the diagnostics collection; claiming a language version bump without updating `CHORD_LANGUAGE_VERSION` and the `chord.ebnf` surface pin (ADR-257 D5)
- **Test assertions — verify**: Asserting on the shape/contents of the emitted IR (not just that parsing "succeeded"), asserting on specific diagnostic codes/spans for invalid input, round-trip tests comparing Chord source against known-good IR fixtures, counter state inspected post-`raise`/`lower` for clamping behavior
- **Test assertions — insufficient**: Asserting only that `parse()` or `analyze()` returned without throwing; snapshotting IR without asserting on the specific fields under test; treating "no diagnostics" as sufficient without checking the IR is actually correct

### Deterministic Execution / Golden Transcripts (transcript-tester, engine RandomService)

- **Mutation calls**: `RandomService` draws scoped to a named `ChoicePoint`/stream; save-state seed persistence (save format 3.0.0); golden-fixture comparison in `transcript-tester/src/golden.ts` diffing actual transcript output against a committed `.golden` file
- **Reporting without mutation**: Marking a walkthrough "passing" without an updated/re-blessed `.golden` fixture when output legitimately changed; claiming determinism without pinning `--seed` in the test invocation
- **Test assertions — verify**: Byte-identical (or explicitly normalized) diff between actual transcript run and the committed `.golden` fixture at a pinned seed; RNG stream isolation — a change to one `ChoicePoint` must not perturb another's draws
- **Test assertions — insufficient**: Running a walkthrough once with default (unpinned) randomness and eyeballing the output; re-blessing a golden fixture without inspecting the diff first

### Phrase Algebra / Text Rendering (text-blocks, lang-en-us)

- **Mutation calls**: Phrase-model assembler composing atoms (state-derived adjective, contents, slot, pronoun, numeral, verbatim) into a realized string; subject-verb agreement resolution; message-param substitution; turn narrative slot placement — transactions order sources, slots place phrases (ADR-296)
- **Reporting without mutation**: Returning a phrase-model object without invoking the assembler/realizer — i.e., "built the model but never rendered text"
- **Test assertions — verify**: Asserting on the final rendered string output (exact text or normalized form) for a given world state/param set, not just that an atom object was constructed
- **Test assertions — insufficient**: Snapshot-only tests with no explicit assertion of expected wording; asserting the phrase-model shape without ever calling the realizer

### Event Sourcing / Messaging (event-processor, plugin-scheduler, plugin-npc, plugin-state-machine)

- **Mutation calls**: Effect/event dispatch to registered handlers, fuse/daemon scheduling and firing, NPC turn-phase state transitions, interceptor registry mutations (ADR-208)
- **Reporting without mutation**: A daemon/fuse reported as "fired" with no corresponding scheduled-state change or handler invocation
- **Test assertions — verify**: Post-turn inspection of scheduler state (fuse/daemon queue), confirmation a registered handler actually ran (side effect or spy invocation tied to real dispatch), NPC state after a turn
- **Test assertions — insufficient**: Asserting an event was *constructed* without asserting it was *dispatched* and *handled*

### Long-Form Documentation / Publishing (docs/book, site build)

- **Mutation calls**: `scripts/build-book.sh` regenerating built book output; naive-regression runs executing every book-referenced transcript/walkthrough against the built platform
- **Reporting without mutation**: Marking the naive-regression gate "GREEN" without an accompanying clean run log; claiming a chapter fix without re-running its walkthrough transcript
- **Test assertions — verify**: Transcript run exits clean (zero unexpected diffs) against `dist/cli/sharpee.js`, referenced against the specific published npm version tested
- **Test assertions — insufficient**: Manual read-through of a chapter without executing its transcripts; treating RNG-based combat/thief flakes as gate failures — but note RNG is now largely eliminated by ADR-291–293's pinned-seed determinism, so a flake is more likely a real regression than in the prior profile's era

## Notes

- **New since the 2026-07-23 profile**: A major determinism arc landed — ADR-291 (seed authority/named streams) → ADR-292 (testability/bounded-outcome-search contract) → ADR-293 (choice points with per-point RNG streams, `ActionContext.random` removed in favor of `RandomService`, save format 3.0.0) → ADR-294 (golden-transcripts tester rebuild, `.golden` fixtures replace loose output comparison) → ADR-295 (computed exits — world-model traversal resolution) → ADR-296 (prose-order emission ownership — transactions order sources, slots place phrases). This is the dominant thread in recent commit history and materially changes how randomness and transcript testing work platform-wide.
- **Chord language versioning matured**: `CHORD_LANGUAGE_VERSION` (in `packages/chord/src/version.ts`) is now explicitly decoupled from both the `@sharpee/chord` npm package version (rides the 4.x platform lockstep) and the IR wire-format version (`IR_FORMAT`). Public Chord language version is 2.2.0; three "landing history" numbers (2.3.0–2.5.0, interim 3.0.0) were used internally during the ADR-266 grammar-parity program but never shipped publicly — see the table in `version.ts` before assuming a version number was ever public.
- **ADR-266 grammar-parity umbrella** produced a large family: ADR-267 (grammar pattern constructs), ADR-268 (rule ordering), ADR-269 (standard grammar as Chord source — IMPLEMENTED, deletes the old ADR-265 apparatus), ADR-270 (author alteration), ADR-271 (action-centric emission), and others. ADR-265 itself is SUPERSEDED — its "readable Chord form" rendering approach was replaced by 266/269's grammar-rule-sourced approach; do not treat ADR-265 as current guidance.
- **`website/` migrated from Astro to Next.js 16 / React 19** (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` present; `next`/`react` in dependencies) since the last profile, and now embeds a CodeMirror-based Chord editor (Chord Writer surface, ADR-280/281/284/285/286).
- **New packages since last profile**: `packages/story-loader` (generic Story IR interpreter, ADR-210), `packages/bootstrap` (single shared story-assembly loader for transcript-tester/CLI/devkit, ADR-180), `packages/bridge` (Node subprocess bridge over stdin/stdout), `packages/runtime` (headless engine for iframe embedding), `packages/helpers` (fluent entity builders, replaced a prior "prototype augmentation"), `packages/queries` (LINQ-style entity query API), `packages/devkit` (author-tool package backing `./sharpee`), `packages/interpreter` (now explicitly legacy/Tauri-only, excluded from the workspace via `!packages/interpreter`).
- **Root `package.json` `workspaces` field is still stale** relative to `pnpm-workspace.yaml` (the actual source of truth) — same caution as the last profile, now more pronounced given how many packages exist that aren't in the root array (`chord`, `story-loader`, `bootstrap`, `bridge`, `runtime`, `devkit`, `helpers`, `queries`, `media`, `platform-browser`, etc.). Always read `pnpm-workspace.yaml`, never the root array, when reasoning about active packages.
- **CI workflows consolidated**: only `build-platforms.yml` and `publish-npm.yml` remain under `.github/workflows/`; the previously-noted `beta-release.yml`, `pages.yml`, and `zifmia-publish.yml` are gone (site publishing presumably now handled outside GitHub Pages, consistent with the Next.js migration).
- **ADR volume roughly tripled**: 305 top-level ADR files (was 235), now running through ADR-296. Directories `batch/`, `core-systems/`, `outdated/`, plus subfolders not included in that count.
- **Codebase scale**: ~382K lines TypeScript across packages/stories/tools (was ~327K), 632 `*.test.ts` files (was 423), 183 `.transcript` integration/walkthrough files (was 153) — all counts grew substantially, consistent with the Chord grammar-parity program, the determinism arc, and the golden-fixture test rebuild.
- **Current branch** (`adrs-264-265-counters-stdlib-reference`) carries ADR-264 (numeric counters, Chord 1.4.0) and the ADR-265 stdlib-in-Chord work (now superseded by 266/269, but the commit history and branch name predate that supersession) — worth noting if reconciling branch state against `main`.
- Several `docs/context/.devarch-events-*.jsonl` / `.devarch-gate-*` files are typical untracked DevArch housekeeping artifacts in git status — not part of the profile signal set.
