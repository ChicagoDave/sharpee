# Project Profile: Sharpee

**Generated**: 2026-07-07
**Repository**: sharpee_v2 (`@sharpee/sharpee` v2.1.1, published to npm)

## Domains

- **Domain Modeling** — DDD-style `world-model` package: traits, behaviors, capability dispatch (ADR-090, ADR-207 per-instance registry), `if-domain` contract types
- **API / Service (Engine)** — `engine` owns turn cycle/scheduler; `stdlib` standard actions (validate/execute/report/blocked, ADR-051); `parser-en-us` grammar (ADR-087)
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
- **Source structure**: Layer-based by package (traits/behaviors in world-model, actions in stdlib, grammar in parser-en-us, text/messages in lang-en-us); actions follow a 4-file convention: `<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, `<name>-types.ts`
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` (via shared `tsconfig.base.json`, composite project references)
- **Import style**: CommonJS module resolution (Node), per-package `references` for project-reference builds; no path-alias convention observed at root
- **Language layer separation**: All user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit semantic events with message IDs only (no embedded English)
- **Versioning**: Uniform lockstep versioning across `@sharpee/*` packages (currently 2.1.1); format `X.Y.Z` or `X.Y.Z-beta` for pre-release, stamped before compilation

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)

- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes (e.g., `LightSourceBehavior`, `ContainerTrait` mutators), capability dispatch handlers (`findTraitWithCapability`), scheduler/turn-cycle state transitions, event/effect application in `event-processor`
- **Reporting without mutation**: An action's `report` phase emitting success text/events without the corresponding `execute` phase having called a behavior mutator or changed entity/trait state — flag as silent no-op
- **Test assertions — verify**: Post-call inspection of `WorldModel` entity/trait state (e.g., location changed, trait flag flipped, inventory contents updated), or emitted semantic events with correct message IDs and payload
- **Test assertions — insufficient**: Asserting only that an action "didn't throw," asserting only on the return value of `execute()` without checking world state, asserting on event *type* without checking event *payload*

### Phrase Algebra / Text Rendering (text-blocks, lang-en-us)

- **Mutation calls**: Phrase-model assembler composing atoms (state-derived adjective, contents, slot, pronoun, numeral, verbatim) into a realized string; subject-verb agreement resolution; message-param substitution
- **Reporting without mutation**: Returning a phrase-model object without invoking the assembler/realizer — i.e., "built the model but never rendered text"
- **Test assertions — verify**: Asserting on the final rendered string output (exact text or normalized form) for a given world state/param set, not just that an atom object was constructed
- **Test assertions — insufficient**: Snapshot-only tests with no explicit assertion of expected wording; asserting the phrase-model shape without ever calling the realizer

### Event Sourcing / Messaging (event-processor, plugin-scheduler, plugin-npc, plugin-state-machine)

- **Mutation calls**: Effect/event dispatch to registered handlers, fuse/daemon scheduling and firing, NPC turn-phase state transitions, interceptor registry mutations (ADR-208)
- **Reporting without mutation**: A daemon/fuse reported as "fired" with no corresponding scheduled-state change or handler invocation
- **Test assertions — verify**: Post-turn inspection of scheduler state (fuse/daemon queue), confirmation a registered handler actually ran (side effect or spy invocation tied to real dispatch), NPC state after a turn
- **Test assertions — insufficient**: Asserting an event was *constructed* without asserting it was *dispatched* and *handled*

### Long-Form Documentation / Publishing (docs/book, site build)

- **Mutation calls**: `scripts/build-book.sh` regenerating `site/*.html|.pdf|.epub`; naive-regression runs executing every book-referenced transcript/walkthrough against the built platform
- **Reporting without mutation**: Marking the naive-regression gate "GREEN" without an accompanying clean run log; claiming a chapter fix without re-running its walkthrough transcript
- **Test assertions — verify**: Transcript run exits clean (zero unexpected diffs) against `dist/cli/sharpee.js`, referenced against the specific published npm version tested
- **Test assertions — insufficient**: Manual read-through of a chapter without executing its transcripts; treating RNG-based combat/thief flakes as gate failures (see "one-good-run" rule — a single clean run is baseline)

## Notes

- Package surface has grown substantially since the 2026-06-27 profile: new/renamed packages include `bootstrap`, `bridge`, `character` (was present before), `devkit` (author-tool split from a prior `forge`/`cli`), `helpers`, `ide-protocol`, `if-services`, `interpreter`, `plugin-npc`, `plugin-scheduler`, `plugin-state-machine`, `plugins`, `queries`, `runtime`, `story-runtime-baseline`. Verify workspace glob in root `package.json` still matches all of these before assuming any single one is active/maintained — some directories (e.g. `tools/shite`) are noted in `CLAUDE.md` as abandoned/reference-only (ADR-180).
- Two build CLIs by design (ADR-187): `./repokit` for platform devs, `./sharpee` for authors — do not conflate them when scripting builds.
- The Sharpee Book has two live editions referenced in `site/`: `the-sharpee-book.*` (current) and `the-sharpee-book-v2.0.0.*` (pinned v2.0.0, linked from the refreshed site per commit `5bc0c4ce`).
- v1.5 (`familyzoo`) is a frozen legacy line — per project memory, never regression-test it during v2 work.
- 315 ADRs total under `docs/architecture/adrs/`; phrase algebra spans ADR-192 through ADR-200, with dialogue/structural/agreement follow-ons through ADR-206, and capability/interceptor registry refactors at ADR-207/208.
- ~305K lines TypeScript across packages/stories/tools; 294 `*.test.ts` files; 133 `.transcript` integration/walkthrough files.
