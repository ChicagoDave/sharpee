# Project Profile

**Generated**: 2026-11-17
**Repository**: sharpee (`@sharpee/*` lockstep v5.6.1 in `packages/sharpee` and `packages/chord`, published to npm and sharpee.net; Chord language 4.0.2 published, working number 4.0.3 in `packages/chord/src/version.ts` (ADR-257 versions it independently); active branch `main`)

## Domains

- Domain Modeling — `world-model` traits/behaviors/capability dispatch (ADR-090, ADR-346), `if-domain` contracts; recent: ADR-398 (pulling and pressing are generic verbs, `PullableTrait` is a marker), ADR-399 (`change` to a platform state word writes the trait), ADR-118 Amendment 1 (every interceptor binding on an entity is consulted, a thing's own clauses first), ADR-403 (a machine's action trigger is its thing's answer to the verb); `ClimbableTrait.destination` retired (a way between rooms is the room's passage)
- API / Service (Engine) — `engine` turn cycle/scheduler (ADR-342 package contract, ADR-343 StoryEngine role, ADR-344 player role-holder seam, ADR-345 explicit lifecycle phase), `stdlib` validate/execute/report actions (ADR-051), `parser-en-us` grammar; ADR-400 (perception runs for every actor) and ADR-401 (hearing is authored) are ACCEPTED but not built
- Chord Story Language — `packages/chord` (lexer/parser/analyzer/IR), `story-loader`, `bootstrap`; `packages/world-index` derives map/reachability/vocab-gaps from Story IR (ADR-321); ADR-394 ownership guards (a story trait classifies after `is a`, every `is <word>` has a reader, a story action does not repeat standard grammar); ADR-402 (a sound prints only the lines its author wrote)
- Normative Character Layer — `packages/character` (goals, influence, propagation, arbiter, dialogue, act-detection, ADR-310/318)
- Testing Intelligence — `packages/branch-tester` (tree/coverage/auto-assertion, ADR-340 unified assertion core, ADR-355 segmented tree documents), the claims system (ADR-365; ADR-396/397: a claim is held or unproven, `never` and `violated` removed from the language, runner, wire and Testing tab), `transcript-tester`, `tools/explorer-probe` (standalone `node --test` lens scripts), the IDE testing surface (`tools/ide/web/testing-surface`, ADR-353/357), and `test-stories/` (ADR-395: `lodge`, `bazaar`, `ferry`, `orchard`, tree-only stories of five rooms or fewer that the exploring tests run on)
- Cross-Platform Native IDE (Chord Writer) — two heads: `tools/ide/PaneHost` (Avalonia 12.1.2 / .NET 10, C#, Velopack-packaged, the carried-forward shell per ADR-351) and `tools/ide/SharpeeIDE` (Swift/AppKit, XCTest, still shipping on macOS); both pinned to Chord 4.0.2 and the 5.6.1 toolchain (chord-writer-5-6-pairing Phases 1–2); protocol types generated for both by `repokit protocol` (ADR-352); `tools/winide` is a reserved, deliberately empty directory (ADR-341)
- Event Sourcing / Messaging — `event-processor`, `channel-service` (ADR-163 universal channel wire), `plugin-scheduler`/`plugin-state-machine`/`plugins` (generic turn-plugin registry)
- Frontend UI (web) — `platform-browser`, `media`, `website/` (Next.js/React)
- CLI / Tooling — `devkit` (author tool, `./sharpee`), `tools/repokit` (in-repo build CLI, ADR-187, protocol-type generator per ADR-352), `tools/vscode-ext` (`sharpee-vscode` 0.8.1, a workspace member), `helpers`, `queries`, `ide-protocol`
- Library / Package — publishable `@sharpee/*` packages with generated API docs (`packages/sharpee/docs/genai-api/`)
- Documentation / Book — `docs/book/chord-v4.0.2/` (*The Chord Manual*, pinned to Sharpee 5.6.1 / Chord 4.0.2) with its running example's snapshots at `tutorials/relighting/chord-v4.0.2/`; `docs/book/v1.5.0`, `v2.0.0` (the Sharpee manual); a Chord primer for Claude Code sessions at `docs/work/chord-primer/`
- Story Content — `stories/*` in-repo stories (`dungeo` is the regression floor up to its own requirements; fixtures such as `vehicles`, `nautical`, `expanses`, `sailing`, `character-acceptance`, `presence-test`, `trait-classification-test`; `armoured` is a retired sample); `branch-stories/*` (`secret-letter` ON HOLD, `fernhill`, `ides-of-march`, `upps`, `wumpus`, `familyzoo` plus `familyzoo-v01`…`v16` mirrors)

## Tech Stack

- **Language**: TypeScript 5.x (ES2022, CommonJS) for platform/Chord/IDE-web; Swift for `SharpeeIDE`; C# (.NET 10) for `PaneHost`
- **Runtime**: Node.js; native macOS app hosting bundled Node + WKWebView surfaces (`SharpeeIDE`); .NET 10 desktop runtime via Avalonia (`PaneHost`, targeting Windows/macOS/Linux per ADR-351)
- **Framework**: Custom in-memory World Model engine; Next.js/React (`website/`); AppKit/SwiftUI (`SharpeeIDE`); Avalonia UI 12.1.2 + AvaloniaEdit 12.0.0 + Avalonia.Controls.WebView 12.1.0 (`PaneHost`)
- **Data layer**: None (external) — in-memory `WorldModel`, versioned save format (ADR-293; save/tree-format versioning is dormant)
- **Messaging**: In-process event/effect dispatch (`event-processor`), channel-I/O wire (`channel-service`); no external broker
- **Test framework**: Vitest 3.x per package, Stryker 9.x (mutation, `pnpm test:mutate`), custom `.transcript` tester, `branch-tester` tree runner (`./sharpee test <story-dir>`), `node:test` (`tools/explorer-probe`), XCTest (`SharpeeIDETests`), xUnit 2.9.3 (`PaneHost.Tests`)
- **Test command**: `pnpm exec turbo run test:ci`   <!-- runs every workspace package's `vitest run`; the other gates are listed under Notes -->
- **Build tool**: `@davidcornelson/tsf` (ts-forge), Turborepo 2.x, esbuild; `./repokit` (platform build) and `./sharpee` (author tool); `scripts/build-book.sh` (book editions); Xcode/`xcodebuild` for `SharpeeIDE`; `dotnet build` + Velopack (`tools/ide/package-avalonia.sh`) for `PaneHost`
- **Package manager**: pnpm 10.13.1 workspace (TS/JS); NuGet (C#)
- **CI/CD**: GitHub Actions — `build-platforms.yml`, `publish-npm.yml`; publishing is the only CI exception, everything else is local guards or documented manual steps
- **Monorepo**: Yes (pnpm workspaces + Turborepo) for TS/JS; `tools/ide/PaneHost.sln` is a separate .NET solution outside the pnpm/Turborepo graph

## Conventions

- **Test location**: separate `test`/`tests` dirs per TS/JS package; transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`; story test trees as segmented `{story}.tests/` directories (ADR-355); test stories under `test-stories/{story}/` each with a `<story-id>.test-set.md`; Swift tests under `tools/ide/SharpeeIDETests`; C# tests under `tools/ide/PaneHost.Tests` (sibling project, `InternalsVisibleTo` from `PaneHost.csproj`)
- **Test naming**: `*.test.ts` (Vitest), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style), `*Tests.swift` (XCTest), `*Tests.cs` (xUnit)
- **Source structure**: layer-based per TS/JS package; stdlib actions follow a multi-file convention (`<name>.ts`, `-data.ts`, `-events.ts`, `-messages.ts`, `-types.ts`); `character` is sub-module-based; `engine` is organized (ADR-334/342) into `command/`, `install/`, `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`; `SharpeeIDE` and `PaneHost` are feature/area-folder-based (`Hosting/`, `Shell/`, `Editor/`, `Theme/`, `Generated/`); branch stories are per-NPC `.chord` files imported by a holder `.story`
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch` via shared `tsconfig.base.json`; packages also carry a `tsconfig.test.json` for the test-file typecheck leg (GH #401)
- **C# nullability**: `PaneHost.csproj` sets `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`
- **Import style**: CommonJS resolution for src (plus `dist-esm` builds via `tsconfig.esm.json`); test configs use `module: "esnext"` so `import.meta` type-checks; composite project references; no root path-alias convention
- **Language layer separation**: all user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit message-ID-only events

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)
- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes, capability dispatch (`findTraitWithCapability`) and interceptor bindings (every binding consulted, ADR-118 Amendment 1), trait state writes from Chord `change` (ADR-399), scheduler/turn-cycle state transitions (ADR-345 lifecycle phase), `event-processor` effect application, `RandomService` draws against a named `ChoicePoint` (test engines are seeded by default)
- **Reporting without mutation**: an action's `report` phase emitting text/events without `execute` having called a behavior mutator; a refused command that still advances a machine or spends a firing (the defect #712/#772 fixed)
- **Test assertions — verify**: post-call `WorldModel` state inspection (trait field values, entity location), emitted event message IDs + payload, byte-identical transcript output at a pinned seed
- **Test assertions — insufficient**: "didn't throw," asserting only on `execute()`'s return value, asserting event type without payload

### Chord Story Language (chord, story-loader, bootstrap, world-index)
- **Mutation calls**: lexer/parser/analyzer producing tokens → AST → Story IR; diagnostic sink pushes (including the ADR-394 ownership-guard refusals and warnings); `story-loader` installing IR into a world (trait routes, interceptor clauses, machines); `world-index` deriving map/reachability/vocab-gap/state-reader/state-writer reports from IR
- **Reporting without mutation**: claiming a construct "compiles" without an emitted IR node; a diagnostic "caught" with nothing pushed to the sink; a `change` claimed to write state while only a shadow story state moved
- **Test assertions — verify**: shape/contents of emitted IR, specific diagnostic codes/spans, post-load world state for a compiled fixture, `world-index` output against known fixtures
- **Test assertions — insufficient**: asserting `parse()`/`analyze()` returned without throwing; snapshotting IR without asserting specific fields

### Normative Character Layer (packages/character)
- **Mutation calls**: tick-phase advances, goal/influence/propagation state changes, arbiter decisions (`apply.ts`), act-detection classification, conversation state advances
- **Reporting without mutation**: narrating a reaction without a corresponding goal/influence state change
- **Test assertions — verify**: post-tick state inspection, arbiter output traced to state read/written
- **Test assertions — insufficient**: asserting a tick "completed" without checking which goals/edges changed

### Testing Intelligence (branch-tester, transcript-tester, claims, testing-surface, world-index, explorer-probe)
- **Mutation calls**: `branch-tester` tree writes through its canonical segmented writer (ADR-355); claim locks written through `sharpee claim`; the tree walker's restore at forks (engine-test-performance Phase 4) and save/restore/undo rows on the shared derived game; `from-play.ts` serializing a play session into a transcript; `world-index` `collectStateWriters`/`collectStateReaders` and the explorer-probe lenses are pure derivations over compiled IR (they do not trigger rule 15)
- **Reporting without mutation**: marking a branch or claim "passing"/"held" without an actual re-run against the real engine; a claims walk that reports success after the engine refused a save or restore (#698)
- **Test assertions — verify**: actual replay of a `continues:` branch at a pinned seed; `states:` pins on entity location and story counters at the triggering card; claim verdicts (`held`/`unproven`) with depth, witness path and state count re-recorded against a `test-stories/` fixture; for pure derivations, the returned rows against a fixture
- **Test assertions — insufficient**: running a walkthrough once with unpinned randomness and eyeballing output; a lens or claim test that only checks "did not throw"

### Cross-Platform Native IDE (tools/ide/PaneHost, tools/ide/SharpeeIDE)
- **Mutation calls**: `ShellState` mutations (documents, active tab, pane state), `PaneRelay`/`PaneServer` message dispatch to hosted webviews, host-service bridging into the filesystem/process, `StoryProject` load/save, `TestingSession` state, generated-protocol (de)serialization at `Generated/` (ADR-352); the Swift head has the parallel shape
- **Reporting without mutation**: a UI action claimed to "work" without a corresponding `ShellState`/`StoryProject` field change or relay message actually sent
- **Test assertions — verify**: `PaneHost.Tests` (xUnit) asserting on post-call `ShellState`/relay/`TestingSession` state; `TestingSurfaceRealPathTests` on the Swift side; for the release path, an actual `notary-submit.py` verdict
- **Test assertions — insufficient**: asserting a window "opened" without checking the state it reflects; a successful local build standing in for a notarization verdict

### Story and Test-Story Content (stories/, branch-stories/, test-stories/)
- **Mutation calls**: rule 15's function-name signal does not fire for `.chord`/`.story` content — mutation verification for story work is carried by the test tree's `states:` pins and by claims, not by the `mutation-verification` agent
- **Reporting without mutation**: claiming a scene/branch "works" without a new or updated tree card and a passing `./sharpee test <story-dir>` run
- **Test assertions — verify**: `states:` pins on entity `location`, story counters and `story.state` transitions at the card where the mutation occurs
- **Test assertions — insufficient**: a tree card that only checks output text without a `states:` pin on the underlying change

## Notes

- **Other test gates beside `test:ci`**: `pnpm test:scripts` (repo-level suites under `scripts/__tests__/`, needs `./repokit build dungeo` first); the Dungeo walkthrough chain (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`, bundle required, one run is sufficient); `./sharpee test <story-dir>` for story trees; `node --test tools/explorer-probe/tests/*.test.js` (no `package.json`, outside the workspace); `dotnet test` for `PaneHost.Tests`; XCTest for `SharpeeIDETests`. Real stories other than Dungeo do not gate; exploring tests run on `test-stories/` (ADR-395).
- **`test:ci` coverage**: 29 packages under `packages/` and `packages/extensions/*` declare it, plus `tools/repokit`, `stories/dungeo`, `stories/channel-service-test` and `stories/family-zoo-tutorial`. `if-services`, `plugin-scheduler`, `plugin-state-machine`, `sharpee` and `text-blocks` declare no test script at all; `extensions/conversation` is a stub outside the workspace. `test:ci` is now cacheable (GH #683, CLOSED): root `turbo.json` declares `vitest.shared.ts` and env passthroughs (including `SHARPEE_TEST_STORIES`) as inputs, and 15 packages carry their own `turbo.json` for out-of-package reads.
- **`pnpm typecheck:tests` (GH #401) is still OPEN**, verified live this pass: 1,574 type errors across 260 test files, zero in `src`.
- **Active plan**: `docs/work/chord-manual/plan.md` (ACTIVE); Phases 1–5 DONE (chapters 1–40 and front matter), Phase 6 (generated appendices, `scripts/generate-chord-appendices.cjs`) CURRENT since 2026-11-17, Phases 7–9 PENDING. The `engine-test-performance` plan has Phases 3, 4 and 7 complete.
- **ADRs** live at `docs/architecture/adrs/adr-NNN-*.md` (not `docs/adrs/`). Highest is `adr-403-a-machine-trigger-is-its-things-answer-to-the-verb.md`. `INDEX.md` is now generated by `adr-index.sh`: 407 records, 28 OPEN, 147 IMPLEMENTED, 52 ABANDONED, 7 IGNORE, 173 unclassified (backfill tracked in GH #766).
- Root `package.json`'s `workspaces` array is stale (lists `packages/forge`, `packages/ext-daemon`, `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`, none on disk); `pnpm-workspace.yaml` is authoritative, with documented exclusions (`map-editor`, `_archive/**`, retired `interpreter`, `bridge`, `runtime`, `shite`, `zifmia`, the `extensions/conversation` stub).
- Versions move at publish, not per landing. Secret Letter is ON HOLD; it appears as fixture data only. `docs/unofficial/` is not a source.
- Delta since the 2026-11-10 profile (76 commits): 5.6.1 / Chord 4.0.2 released (working number 4.0.3); ADR-394 through ADR-403 written (all built except ADR-400/401); ADR-395 introduced `test-stories/` and moved the exploring tests onto it; claims lost `never`/`violated` (ADR-396/397); `test:ci` became cacheable (#683); the ADR index was adopted; *The Chord Manual* reached Phase 6; both IDE heads moved to Chord 4.0.2 and the 5.6.1 toolchain. GH #494, #517 and #518 are now CLOSED. `PaneHost.Tests` is confirmed xUnit. Test suites were not re-run this pass. Earlier deltas are in this file's git history.
