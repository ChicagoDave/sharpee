# ADR-408: The examinable lens's findings reach Chord Writer's Testing tab

**Planning**: OPEN

**Summary**: The examinable lens leaves `tools/explorer-probe` for `packages/branch-tester`, on branch-tester's walk with no necessary set, behind devkit's `sharpee lens examinable`. Each finding names its passage key and its owner and target IR ids. The report is a contract in `@sharpee/ide-protocol`. Findings appear in the Testing tab, the web pane both Chord Writer heads host, and a card selects the phrase in the author's source. The lens never gates.

**Status**: **ACCEPTED** (David, 2026-11-23, session c68c7b: "yes", to "mark ADR-408 ACCEPTED?", after the open-questions interview and a clean re-run of `adr-review`, 20 of 20). D1 is David's ruling of 2026-11-23 (option "b" after the plan review of the lens-findings-in-ide plan). D2 to D6 are the plan's leans, which that same ruling took. D8 to D10 are David's answers in the open-questions interview, the same day ("a", "a", "a"). No questions remain. Acceptance does not authorize the `packages/` work. Phases 2 and 3 of the plan each need David's explicit go.

**Amended**: Amendment 1 (2026-11-23, session c68c7b, David's ruling "a", during Phase 2). D3's walk with no necessary set was the blind state search ADR-294 D23 retired. Measured on the packaged walk at the default budgets: fernhill hit 5,000 states after 80 s with 9 of 13 rooms reached, where the spike had reached 12 in 3,049. So the lens no longer walks states. It reaches each room by a route:
- It plans the shortest route from the opening over the exits open at the start. Exits are read off the IR, and the ones a lock or a gate shuts at the start come from world-index's `deriveReach` (its `blocked` and `lifted` edges).
- It types the route in a fork of the real engine, opening a door the route passes through. It checks that the player really arrived, examines, and restores.
- A room no open route reaches is reported unreached with reach's own reason. A room a typed route did not arrive in is reported with where the player ended up.
- The report's soundness line becomes rooms reached of declared plus each unreached room and why. A walk's states and stop reason no longer appear.
- D8's budget is a time budget only.
- The shared walk (`walk/story-walk.ts`) stays, because the claims runner is its client. This amendment does not decide whether its lens-only parts (the room hook, the null set) stay.

**Date**: 2026-11-23

**Kind**: technical

**Scope**: tools/explorer-probe, packages/branch-tester, packages/devkit, packages/ide-protocol, tools/ide/web/testing-surface, tools/ide/SharpeeIDE/TestingSurface, tools/ide/SharpeeIDE/Editor, tools/ide/SharpeeIDE/MainWindow.swift, tools/ide/PaneHost/Shell, tools/ide/PaneHost/Editor

## Context

GH #835's last bullet asks for the examinable lens's findings in the IDE, with the source highlighted where a noun names a thing that has no text. ADR-407 made the lens read prose through the story's language. Its findings are decided by the engine: `resolved-default` is a thing the parser reaches but the author never described. The lens is still a repo-only script, though: `tools/explorer-probe/lens-examinable.js` loads devkit and world-index from their `dist/` paths and walks with the spike's `explore.js`.

Four things in the code shaped this record.

- **The source is already in hand at runtime.** The lens reads `identity.descriptionId` and `roomTrait.initialDescriptionId`. The loader sets those from the IR's own keys (`packages/story-loader/src/build/entity.ts:87`, `:101`), and they are the same strings world-index publishes as `ProseSite.key` (`packages/world-index/src/prose.ts:40`). `if.event.examined` carries `targetId` (`packages/stdlib/src/actions/standard/examining/examining-events.ts:24`). So the lens records key and id where it now records display names.
- **The Testing tab is the surface both heads share.** SharpeeIDE (macOS) and PaneHost (Avalonia) each host `tools/ide/web/testing-surface/` (ADR-341 D3), and ADR-351 D2 carries Chord Writer forward on Avalonia. Neither head decodes `sharpee test --json`. Each passes every NDJSON line to the page, which reads it: `tools/ide/SharpeeIDE/Test/TestRunner.swift`'s header says "It does NOT decode", and PaneHost serializes each line onto its run relay (`tools/ide/PaneHost/Shell/ShellWindow.axaml.cs`, at the spawn on :1335). A span click in the page posts `{openSource:{file,line}}`, which both heads answer (`TestingSurfaceViewController.swift:651`, `PaneHost/Shell/TestingSurfacePosts.cs:51`). The post carries a line only.
- **No packaged walk has a room hook.** branch-tester's `walkClaims` (`packages/branch-tester/src/claims/claims-walk.ts:119`) walks under a necessary set and calls nothing on a room's first sighting. ADR-294 D23 and ADR-365 D10 both say a lens that leaves the tools directory borrows that walk.
- **The cost, measured 2026-11-23.** Each story was composed with `./sharpee compose <story> -o <dir>/dist/<stem>.ir.json`, then run with `node tools/explorer-probe/lens-examinable.js <story> --json`. The per-story rows are in `docs/work/lens-findings-in-ide/timings.md`.
  - All six test stories finish in under a second at the default budgets (seed 1209, 5000 states, 120 s, depth 40). So do cloak-of-darkness, thealderman, ides-of-march and relighting.
  - friendly-zoo, fernhill and secret-letter spend the full 120 s. The first two spend it on state space (over 3,000 states each, rooms still unreached). Secret Letter spends it on typing (1,951 forms, 16 of 92 rooms).

## Decision

**D1 — Findings appear in the Testing tab** (David, 2026-11-23). They form a section of the testing surface's run column, beside the claims and derived tiers. The World tab's Incomplete view is left as it is: it stays a static, whole-story candidate list (ADR-321 D6), and the lens's section carries its own soundness line. Both heads show the section because both host the page.

**D2 — "Highlight" means a card that selects the phrase in the author's source.**
- Activating a finding's card opens the editor on the passage its key names and selects the phrase inside that passage's span.
- Persistent in-editor marks on each such phrase are a separable later step. If built, they must be distinct from compose underlines and name themselves on hover (ADR-324 D1, D3, D7), in both heads.

**D3 — The lens earns a package in branch-tester, reaching rooms by route** (as amended by Amendment 1).
- Each room is reached by the shortest route over the exits open at the start (the IR's exits, less reach's `blocked` and `lifted` edges). The route is typed in a fork of the real engine, and arrival is checked. Rooms no open route reaches are reported with reach's reason. There is no state search.
- *(Superseded by Amendment 1: branch-tester's breadth-first walk gains an observer called on each room's first sighting and a mode with no necessary set.)*
- The lens module lives under `packages/branch-tester/src/lens/`, typed throughout, and takes its extractor lookup from its caller (ADR-407 D8).
- devkit adds `sharpee lens examinable`, which reads the IR the build wrote, as `sharpee world-index` does.
- Once the packaged lens reproduces the spike's orchard and scullery pins, the spike's lens and its suite are removed. The deletion list is posted and David confirms it first.

**D4 — The report is a contract in `@sharpee/ide-protocol`, and sources cross it as keys and ids.**
- `packages/ide-protocol/src/lens-output.ts` defines one document shape with an `ok` flag and optional report and refusal parts, because ADR-352 D5's generator refuses a union of object types. The testing surface imports it directly. The generator gets roots only for the parts a host decodes.
- Each row's sources are `{ key, kind, ownerId, ownerName }`, with key null for a trait-state literal, and each row carries `targetId`.
- Spans are resolved by a consumer, never by the lens (ADR-333 D2). devkit's console form resolves them from the IR's phrase spans. The surface gets them from devkit's test command (D8).

**D5 — ADR-322 D12 / AC-8 does not gate this.** That gate governs the sweep (L1), the exhaustive enumeration ADR-294 D23 retired. A budgeted lens never claims exhaustiveness: every report names its seed, budget, stop reason and rooms reached of declared, and says that findings are real but absence is not proof (ADR-322 D7). A dated note on ADR-322 D12 says so.

**D6 — The devkit command is an exception to ADR-187's repokit-first staging, as world-index and claim already are.** ADR-187 R1's rationale has new build and test features proven in repokit and then ported to devkit by hand. The analysis commands an author's IDE spawns have shipped in devkit only (`packages/devkit/src/commands/world-index.ts`, `claim.ts`), because the IDE runs the project's own `sharpee` (ADR-185) and repokit is never in an author's project. `sharpee lens examinable` follows them. A dated note on ADR-187 points here.

**D7 — The lens never gates.** No lens result changes a build's or a test run's exit code (ADR-356 D7). A refused language is a refusal document with exit 1 from `sharpee lens`. In `sharpee test` (D8), its refusal is a row, never the run's exit.

**D8 — The lens reaches the page as a tier of `sharpee test --json`, on a budget of its own** (David, 2026-11-23, Q-1: "a").
- The lens runs when the author presses Run, beside the claims and derived tiers.
- Its rows ride the run-event stream the Testing tab already reads (`packages/ide-protocol/src/run-events.ts`, which supersedes ADR-277 D1's `test-results.ts`), and neither head adds delivery code. Each head passes every line to the page undecoded: SharpeeIDE's `TestRunner.swift` header says so ("It does NOT decode"), and PaneHost serializes each line onto its run relay (`Shell/ShellWindow.axaml.cs`, beside the `test … --json` spawn at :1335). Both were read 2026-11-23.
- **The tier's contract:**
  - It runs after the claims tier, through a new `packages/devkit/src/commands/test-lens.ts` called from `test-tree-document.ts`.
  - It runs at the document's seed, as the derived and claims tiers do. Every run of the stream is then reproducible at one seed. ADR-307 D5's amendment of 2026-09-27: "`sharpee test --tree` replays at it and at nothing else". `test-tree-document.ts` passes `document.seed` (:218) and runs the derived tier "at the same seed" (:316). The lens's own default seed, 1209, applies only to `sharpee lens examinable`.
  - Its budget is one fixed figure that Phase 2 measures. No `sharpee lens` flag applies to the tier, so the two have no precedence to rule.
  - It emits one `lens-finding` per folded finding (phrase, kind, detail, targetId, sources with key and span, the target's declaration span, rooms), then one `lens-summary` (seed, budget, stop reason, rooms reached of declared, counts), before `run-end`.
  - These are additive variants, so `RUN_EVENT_SCHEMA_VERSION` stays 2, as it did when the derived and claims tiers were added. Every consumer ships from the same build.
  - A refused language is a `lens-summary` carrying the refusal, never an exit code.
  - The tier never reads an IR from disk. `test-tree-document.ts` compiles the story itself with `compileChordStory` (imported at :44), and the tier takes that IR, so a stale or missing `dist/` IR cannot reach it. A story that does not compile never reaches the tree, let alone the tier.
- **Modules the tier changes:**
  - `packages/ide-protocol/src/run-events.ts`: the two variants and their guards.
  - `packages/devkit/src/commands/test-lens.ts` (new) and `test-tree-document.ts`: the call after the claims tier.
  - `packages/branch-tester/src/lens/`: the module, and the report wording the CLI and the tab share, as `claim-report` is for claims.
  - `tools/ide/web/testing-surface/src/run.ts` (the fold) and a new section module beside `claims.ts`.
- devkit's test command is the consumer that resolves each source key to its span from the IR's phrase spans (ADR-333 D2). The rows the page receives carry the span with the key.
- The tier's budget is its own, well under the standalone default, because three of the measured real stories spent the full 120 s on a walk (`docs/work/lens-findings-in-ide/timings.md`). **The figure is 30 s** (David, 2026-11-23, Phase 2, option "b"). By route (Amendment 1) the slowest measured story, Secret Letter, took 12.6 s in one run and 12.8 s in another, and every other story took under a second. The tier's soundness line states the budget, and lists any room the budget left unreached.
- `sharpee lens examinable` remains the standalone command at the full defaults. The tier and the command run the same module.
- Rejected:
  - (b) Each head spawns the lens in the background after a build. That is a second runner in Swift and in C#.
  - (c) On demand only.

**D9 — The source request carries a range** (David, 2026-11-23, Q-2: "a").
- The testing surface's `{openSource:{file,line}}` post gains optional `column` and `length`.
- SharpeeIDE (`TestingSurfaceViewController.swift`, and the editor it opens) and PaneHost (`Shell/TestingSurfacePosts.cs`, and its editor) both select that range when it is present.
- A request without them opens the line, as today, so the claims and derived tiers' span links do not change.
- A lens card posts the phrase's range within its passage: the line, the column and the length of the phrase as the author wrote it. `column` is 1-based, as Chord's `Span.column` is (`packages/chord/src/span.ts:26`). `length` counts UTF-16 code units, which Swift's `NSString`, C# strings and JavaScript share.
- Rejected: (b) line only. The card would open line 19, and the author would find the word.

**D10 — "Write the description" opens the target's declaration** (David, 2026-11-23, Q-3: "a").
- A No-text card's offer posts a source request for the target's declaration line. The line comes from the target's IR id, resolved by devkit's test command as the consumer, as D8 resolves passage spans.
- The author types the description. No new post exists, and neither head edits the buffer for the lens.
- The World tab's existing insertion offer (`WorldSourceEdit.swift`) is untouched.
- Rejected: (b) a host-side insertion of a blank line and an indent. That is a new post type and a live-buffer edit in both heads, for one keystroke.

## Acceptance Criteria

- **AC-1** — `sharpee lens examinable test-stories/orchard/orchard.story --seed 42` reproduces the spike's orchard pin (5 of 5 rooms, 92 forms, 40 not-in-scope, 6 described, 6 number-form). Scullery reproduces OB-54 to OB-60.
- **AC-2** — On scullery, the whetstone's `resolved-default` row carries the Scullery's description key and the whetstone's IR id. That key equals a `prose[].key` in `sharpee world-index`'s document for the same IR.
- **AC-3** — In both heads, the Testing tab shows scullery's whetstone as a No-text finding. Activating it selects the text "whetstone" on `test-stories/scullery/scullery.story:19`. This is checked by an automated real-path test in SharpeeIDETests and by PaneHost.Tests, with no click-through.
- **AC-4** — Two cases render in the page, each with its own message:
  - A story whose language has no extractor. Its `lens-summary` carries the refusal, and the page shows it.
  - A run from a toolchain whose `sharpee` has no lens tier (ADR-185, GH #653). The run ends with no `lens-summary`, and the page says that toolchain does not run the lens rather than showing an empty section.
  - Premise checks: an IR copy whose locale has no extractor, as the spike's OB-60 test builds one; and a recorded run-event stream with no lens events, committed as a testing-surface fixture.
- **AC-5** — No lens outcome changes any exit code of `sharpee build` or `sharpee test`. Premise check: scullery's tree run, which carries lens findings, exits 0, and so does the same run over the no-extractor copy from AC-4.
- **AC-6** — A source request with only `file` and `line` still opens that line in both heads, with no selection beyond it (D9). A test in SharpeeIDETests and one in PaneHost.Tests pin this.

## Consequences

- A lens is now a package feature. The next lens in ADR-294 D23's family borrows the same walk, observer and contract, and lives beside this one.
- branch-tester's walk serves two clients, claims under a set and lenses with none. A change to its identity or candidates is checked against both.
- The Testing tab's run column gains a section that never gates. Its vocabulary comes from branch-tester, as the claims tier's does, so the CLI and the tab cannot drift.
- The spike's examinable lens and its suite go, after David confirms the deletion list. The declared-state lens and the planner stay in `tools/explorer-probe` until they earn packages of their own.
- Both heads answer a range in a source request (D9), which any later surface can use.
- devkit's test command gains a tier, and every Run pays the lens's own budget (D8). A story that wants the full walk runs `sharpee lens examinable` on its own.

## Session

Session c68c7b, 2026-11-23, Phase 1 of `docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` (GH #835).
