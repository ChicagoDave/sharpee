# Project Profile

**Generated**: 2026-09-18
**Repository**: sharpee (`@sharpee/*` lockstep v5.4.1; Chord language versioned independently at v3.6.0, ADR-257)

## Domains

- Domain Modeling — `world-model` traits/behaviors/capability dispatch (ADR-090, ADR-346), `if-domain` contracts; recent ADR-347 (ending is explicit), ADR-348 (world authoritative on restore), ADR-350 (vehicles in Chord)
- API / Service (Engine) — `engine` turn cycle/scheduler (ADR-342 package contract, ADR-343 StoryEngine role, ADR-344 player role-holder seam, ADR-345 explicit lifecycle phase), `stdlib` validate/execute/report actions (ADR-051), `parser-en-us` grammar
- Chord Story Language — `packages/chord` (lexer/parser/analyzer/IR, frozen at language v3.6.0), `story-loader`, `bootstrap`; `packages/world-index` derives map/reachability/vocab-gaps from Story IR (ADR-321, on `main`); ADR-349 location-heading composition
- Normative Character Layer — `packages/character` (goals, influence, propagation, arbiter, dialogue, act-detection, ADR-310/318)
- Testing Intelligence — `packages/branch-tester` (tree/coverage/auto-assertion, ADR-340 unified assertion core), IDE testing-surface
- Cross-Platform Native IDE (Chord Writer) — `tools/ide/PaneHost` (Avalonia 12.1.x / .NET 10, C#) is now the **carried-forward** shell per ADR-351 D2 (owner ruling 2026-09-15: "Avalonia + Velopack... reach all three platforms"), packaged via Velopack with a notarized macOS build (`tools/ide/package-avalonia.sh`, `notary-submit.py`); protocol types for both native shells are generated from one TS model by `repokit protocol` (ADR-352, session 2026-09-16) into `tools/ide/PaneHost/Generated/` (C#) and `tools/ide/SharpeeIDE/Generated/` (Swift). The prior Swift/AppKit `tools/ide/SharpeeIDE` (XCTest) still exists in-tree but Avalonia is the forward direction per this ADR.
- Event Sourcing / Messaging — `event-processor`, `channel-service` (ADR-163 universal channel wire), `plugin-scheduler`/`plugin-state-machine`/`plugins` (generic turn-plugin registry: `band-crossing.ts`, `plugin-registry.ts`, `turn-plugin.ts` — no separate `plugin-npc` package)
- Frontend UI (web) — `platform-browser`, `runtime`, `media`, `website/` (Next.js/React)
- CLI / Tooling — `devkit` (author tool), `tools/repokit` (in-repo build CLI, ADR-187, now also the protocol-type generator per ADR-352), `bridge`, `helpers`, `queries`, `ide-protocol`
- Library / Package — publishable `@sharpee/*` packages with generated API docs (`packages/sharpee/docs/genai-api/`)
- Story Content (branch stories) — `branch-stories/secret-letter` (active port of the 2009 game, structural work only, currently ON HOLD per user direction), `branch-stories/fernhill`, `branch-stories/ides-of-march`; `stories/*` in-repo example/test stories (`dungeo`, `cloak-of-darkness`, `family-zoo-tutorial`, `thealderman`, `friendly-zoo`, `armoured` (retired sample), etc.)

## Tech Stack

- **Language**: TypeScript 5.x (ES2022, CommonJS) for platform/Chord/IDE-web; Swift for `SharpeeIDE`; **C# (.NET 10) for `PaneHost`/Avalonia** (new since the prior profile — confirmed shipping code, not a spike: 5 `feat`/`fix` commits this week plus a notarized macOS build)
- **Runtime**: Node.js; native macOS app hosting bundled Node + WKWebView surfaces (`SharpeeIDE`); .NET 10 desktop runtime via Avalonia (`PaneHost`, Velopack-packaged, targeting Windows/macOS/Linux per ADR-351)
- **Framework**: Custom in-memory World Model engine; Next.js/React (`website/`); AppKit/SwiftUI (`SharpeeIDE`); Avalonia UI 12.1.x + AvaloniaEdit + Avalonia.Controls.WebView (`PaneHost`)
- **Data layer**: None (external) — in-memory `WorldModel`, versioned save format (ADR-293)
- **Messaging**: In-process event/effect dispatch (`event-processor`), channel-I/O wire (`channel-service`); no external broker
- **Test framework**: Vitest 3.x per-package, Stryker 9.x (mutation), custom `.transcript` walkthrough tester, `branch-tester` tree-runner (drives `.chord`/`.story` content, e.g. `./sharpee test branch-stories/secret-letter`), XCTest (Swift, `SharpeeIDETests`), a `PaneHost.Tests` .csproj exists for C# (test framework choice not independently confirmed this pass — verify before relying on it)
- **Test command**: `pnpm exec turbo run test:ci` — runs every workspace package's `vitest run` non-interactively (bare `test` scripts are watch mode). **The prior known gap (GH #402) is resolved**: every package under `packages/` and `packages/extensions/*` now declares both `test` and `test:ci` scripts (spot-checked `basic-combat`, previously the sole holdout — it now has `test:ci`). `pnpm typecheck` (`turbo run typecheck`) is a real per-package gate (GH #400/#404, closed as of the prior profile); `pnpm typecheck:tests` (test-file type errors, GH #401) is a stricter burn-down leg still in progress — status not re-verified this pass (no GitHub access this session; `gh auth status` reports an invalid keyring token). Transcript regression baseline (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`) requires `./repokit build dungeo` first and is a separate manual gate per CLAUDE.md. Story-content trees (e.g. Secret Letter) run via `./sharpee test <story-dir>`, a separate gate. `PaneHost`/`PaneHost.Tests` (C#) is a separate `dotnet test` gate, not wired into `turbo run test:ci` — verify its own commands before touching `tools/ide/PaneHost`.
- **Build tool**: `@davidcornelson/tsf` (ts-forge), Turborepo, esbuild; `./repokit` (platform build, now also emits generated protocol types) and `./sharpee` (author tool); Xcode/`xcodebuild` for `SharpeeIDE`; `dotnet build`/Velopack packaging (`tools/ide/package-avalonia.sh`) for `PaneHost`
- **Package manager**: pnpm 10.13.1 workspace (TS/JS); NuGet (C#, `PaneHost`/`PaneHost.Tests`)
- **CI/CD**: GitHub Actions — `build-platforms.yml`, `publish-npm.yml`; per CLAUDE.md/user ruling ("Hulk hates stairs"), the only CI exception is the publishing pipeline — everything else, including `PaneHost`, is local guards/documented manual steps
- **Monorepo**: Yes (pnpm workspaces + Turborepo) for TS/JS; `PaneHost.sln` is a separate .NET solution under `tools/ide/`, not integrated into the pnpm/Turborepo graph. `pnpm-workspace.yaml` is authoritative for the JS side (with documented exclusions: `map-editor`, `_archive/**`, retired `interpreter`/`shite`/`zifmia` tools, a deliberately-absent `extensions/conversation` stub); root `package.json`'s `workspaces` array is stale (lists `packages/forge`, `packages/cli`, `packages/web-client`, `packages/dev-tools`, `packages/platforms/*`, none present on disk — unchanged from the prior profile)

## Conventions

- **Test location**: separate `test`/`tests` dirs per TS/JS package; story transcripts at `stories/{story}/{walkthroughs,tests/transcripts}/*.transcript`; branch-story test trees at `branch-stories/{story}/{story}.tests.json`; Swift IDE tests under `tools/ide/SharpeeIDETests`; C# tests under `tools/ide/PaneHost.Tests` (sibling project, `InternalsVisibleTo` from `PaneHost.csproj`)
- **Test naming**: `*.test.ts` (Vitest), `wt-*.transcript` (walkthroughs, run with `--chain`), other `*.transcript` (unit-style), `*Tests.swift` (XCTest), `{story}.tests.json` (branch-tester trees); C# test naming convention not yet sampled
- **Source structure**: layer-based per TS/JS package; actions follow a 4-file convention (`<name>.ts`, `-data.ts`, `-events.ts`, `-messages.ts`, `-types.ts`); `character` is sub-module-based; `SharpeeIDE` is feature-folder-based; `engine` is organized (ADR-334/342) into `command/`, `install/`, `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`, with a narrowed 31-named-export public surface; branch stories are per-NPC `.chord` files imported by a holder `.story` file; `PaneHost` is feature/area-folder-based (`Hosting/`, `Shell/`, `Editor/`, `Theme/`, `Generated/`)
- **TypeScript strict mode**: Yes — `strict`, `noImplicitAny`, `noImplicitReturns`, `noFallthroughCasesInSwitch` via shared `tsconfig.base.json`; each package also carries a `tsconfig.test.json` (test-file typecheck leg, GH #401) alongside its `tsconfig.json`
- **C# nullability**: `PaneHost.csproj` sets `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`
- **Import style**: CommonJS resolution (Node) for src; test configs use `module: "esnext"` specifically so `import.meta` (used by vitest-run ESM test files) type-checks correctly, while keeping `moduleResolution` identical to src; composite project references; no path-alias convention at root
- **Language layer separation**: all user-facing text lives in `lang-en-us`; engine/stdlib/world-model emit message-ID-only events

## Mutation Signatures

### Domain Modeling / Engine (world-model, stdlib, engine)
- **Mutation calls**: `WorldModel` entity/trait mutations via `*Behavior` classes, capability dispatch (`findTraitWithCapability`), scheduler/turn-cycle state transitions (explicit lifecycle-phase concept per ADR-345), `event-processor` effect application, `RandomService` draws against a named `ChoicePoint` (test engines are seeded by default — no wall-clock-seeded test runs)
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

### Cross-Platform Native IDE (tools/ide/PaneHost, tools/ide/SharpeeIDE)
- **Mutation calls**: `ShellState` mutations (open/closed documents, active tab, world/editor pane state), `PaneRelay`/`PaneServer` message dispatch to the hosted webview (Hosting/), `NativeHostServices`/`BrowserHostServices` bridging calls into the host filesystem/process, story project load/save via `StoryProject.cs`, generated-protocol-type (de)serialization at the `Generated/` boundary (ADR-352) — the Swift side has the parallel shape (`SharpeeIDE`'s own state/bridge classes, not resurveyed this pass)
- **Reporting without mutation**: a UI action (menu item, tab close, document open) claimed to "work" without a corresponding `ShellState`/`StoryProject` field change or relay message actually sent
- **Test assertions — verify**: `PaneHost.Tests` asserting on post-call `ShellState`/relay state (the project's own `InternalsVisibleTo` grant exists specifically so tests can reach the state directory and the relay's scheduler without a running UI thread — see `PaneHost.csproj` comment); for the notarized packaging path, an actual `notarytool`/`notary-submit.py` verdict, not just a successful local build
- **Test assertions — insufficient**: asserting a window "opened" without checking the state it's supposed to reflect; asserting a build succeeded without a notarization verdict for the release path; UI-thread-dependent assertions that only pass because a test happened to run one

### Branch Story Content (branch-stories/secret-letter and siblings)
- **Mutation calls**: rule 15's function-name/side-effect-file signal does not fire for `.chord`/`.story` content — mutation verification for story work is carried entirely by the `.tests.json` tree's `states:` pins, not by the `mutation-verification` agent
- **Reporting without mutation**: a session narrative claiming a scene/theft/branch "works" without a corresponding new or updated tree card and a passing `./sharpee test <story-dir>` run
- **Test assertions — verify**: `states:` pins asserting on entity `location`, story counters (e.g. `thefts`), and `story.state` transitions at the specific card the mutation occurs on
- **Test assertions — insufficient**: a tree card that only checks output text without a `states:` pin on the underlying entity/counter change

## Notes

- **Platform version 5.4.1** (up from 5.3.1 in the prior profile), Chord language version unchanged at 3.6.0. Per user ruling, these versions move at publish, not per landing — not a signal to chase every commit.
- **Major new domain this profile: the Chord Writer IDE is being carried forward on Avalonia/.NET, not Swift.** ADR-351 (accepted, owner ruling 2026-09-15, session e3fbf7) picked Avalonia + Velopack over the native-per-platform alternatives specifically to reach Windows/macOS/Linux from one codebase while staying "as close to native as possible." The last five commits on `main` (`chord-writer-avalonia-production`) build out `tools/ide/PaneHost` (C#/.NET 10) and produced a notarized macOS build this week. `tools/ide/SharpeeIDE` (Swift/AppKit, XCTest) still exists in-tree and is not reported as removed — treat its status as needing a direct question if work touches it, since this profile pass did not find a retirement ADR for it.
- **Protocol types are generated, and now target two native runtimes.** ADR-352 (accepted, session 2026-09-16) has `tools/repokit`'s protocol generator read `packages/ide-protocol` + `packages/chord` and emit into both `tools/ide/SharpeeIDE/Generated/` (Swift) and `tools/ide/PaneHost/Generated/` (C#) — no `packages/` output. An IR/protocol rename now needs both generated targets rebuilt, not just Swift as the prior profile implied.
- **The `test:ci` gap from the prior profile (GH #402, `basic-combat`) appears resolved** — every scanned `packages/**/package.json` (including `basic-combat`) now declares a `test:ci` script alongside `test`. Not independently confirmed against the issue tracker itself: `gh auth status` reports an invalid keyring token this session, so GH issue states (#400, #401, #404) could not be re-verified and are carried forward from the prior profile's text as unconfirmed, not restated as fact.
- `packages/world-index` (ADR-321) remains on `main`, unchanged from the prior profile.
- ADR count is at least 352 numbered (`adr-352-protocol-type-generation.md` is the highest-numbered file found), up from 346 in the prior profile; recent additions ADR-347 (ending as explicit concept), ADR-348 (world authoritative on restore), ADR-349 (location-heading composition), ADR-350 (vehicles in Chord), ADR-351 (Chord Writer host shape — Avalonia), ADR-352 (protocol type generation). ADRs live at `docs/architecture/adrs/adr-NNN-*.md`, not `docs/adrs/` as DEVARCH.md's generic path implies.
- Secret Letter port (`branch-stories/secret-letter`) is ON HOLD indefinitely per user direction (2026-09-09) — do not treat it as active work; it appears in domains for completeness only.
- `engine`'s file layout (ADR-334/342/343/344/345) is unchanged from the prior profile: `command/`, `install/`, `session/`, `ports/`, `introspection/`, `plugins/`, `turn/`, 31 named exports.
- This pass had no GitHub access (`gh auth status`: invalid keyring token) — any statement above that would normally cite a live issue number for status is marked as unconfirmed rather than asserted.
