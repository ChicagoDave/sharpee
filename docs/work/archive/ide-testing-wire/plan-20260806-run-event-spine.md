# Session Plan: The run-event spine — live feedback from the testing tools to the IDE

**Created**: 2026-08-06
**Supersedes**: `plan-20260805-ide-testing-wire.md` (wire-first sequencing; its Phase 4, the Swift decoder mirror, is dropped outright — see the host decision below).
**Overall scope**: Make the testing tools emit events **as they run** instead of constructing a burst of records after each transcript finishes. Runners gain an observer; the terminal reporter and the NDJSON stream both become subscribers of one event sequence. Live per-command feedback is the deliverable; tree records fall out as a consequence rather than a bolt-on; the eventual explorer drives the same vocabulary without a second stream.
**Bounded contexts touched**: `@sharpee/ide-protocol` (the event vocabulary), `@sharpee/transcript-tester` (runner observer + reporter as subscriber), `@sharpee/branch-tester` (tree observer), `@sharpee/devkit` (the CLI that writes the stream, plus compile/load phases), `tools/ide` (the Testing tab).
**Key domain language**: Run event, phase, item lifecycle, authored vs replayed execution (ADR-302 D17), unreached vs failed (D13), finding, budget (ADR-294's explorer soundness contract).

## Standing directive

David, 2026-08-05: **for the IDE and the platform API, everything is on the table; ADR
imperatives do not bind this work.** Where this plan contradicts an accepted ADR it says
so and the ADR gets amended afterwards. Specifically it supersedes ADR-277 D1's record
contract and answers ADR-301's open question rather than waiting on it.

## What is actually broken

Measured 2026-08-06:

```
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
Total: 952 tests in 17 transcripts — Duration: 8452ms (8.82s wall)
```

1. **`transcript-start` is emitted after the transcript finished.** `transcriptRecords`
   (`aggregate.ts:88`) takes a completed `TranscriptResult` and returns
   `[start, …commands, end]` as one array, which `test.ts:178-183` writes in a single
   burst. The record's own doc comment says *"A transcript is about to run."* It cannot
   be true under the current construction, so the panel can never show what is running.
2. **Granularity is per-transcript** — the feed advances in 17 steps over 8.8s. Tolerable
   here; it forecloses the thing worth having, which is watching a transcript play
   command by command.
3. **The silent stretches are outside the run.** Story load, and for a Chord project the
   compile, precede the first record. The stream has no vocabulary for them. `--tree`
   emits nothing at all (`test.ts:161-168` refuses `--tree --json` with exit 2).

## The design

**One observer seam, three subscribers.** `RunnerOptions` already carries a per-command
hook in spirit — `options.coverage?.collectFrom(engine.lastEvents)` fires inside the
command loop (`runner.ts:320`). An observer sits next to it. The runner emits; the
terminal reporter and the NDJSON writer subscribe. Report and wire stop being two
hand-maintained tallies over a returned result and become two projections of one
sequence.

**Vocabulary** (in `@sharpee/ide-protocol`, module renamed `test-results.ts` →
`run-events.ts`, `TEST_RESULTS_SCHEMA_VERSION` → `RUN_EVENT_SCHEMA_VERSION = 2`; the
rename is the point of the directive — the stream stops being "test results" the moment
the explorer drives it):

| Event | Change | Serves |
| --- | --- | --- |
| envelope: `seq`, `elapsedMs` | new on every record | ordering across a stream that now interleaves; "this command has been running 4s" |
| `run-start.mode` | `+ 'tree'` (`'explore'` reserved) | the run model, declared where it already is |
| `phase` | **new**: `{ name: 'compile' \| 'load' \| 'assemble' \| 'execute', status }` | the silent stretches before the first command |
| `transcript-start` | emitted **before** execution; `+ commandCount`, `parent?`, `replayed?` | an honest "now running"; a real progress bar; tree parentage; D17 replay visibility |
| `command-result` | emitted **as each command completes** | the transcript playing live |
| `transcript-end` | `+ 'unreached'` status, `blockedBy?` | D13 — never a silent skip |
| `progress` | **new**: `{ scope, done, total?, budget? }` | "command 40 of 120" today; "12,400 states, 60s of 300s" for the explorer |
| `finding` | **reserved, not built** | the explorer's real output |

**Why the explorer shapes this now.** ADR-294's explorer is a long-running batch tool —
its soundness contract is *"none found within N states / depth D / T minutes, and the
budget is part of the report."* A tool that runs for minutes with no live feed is
unusable, so it needs this spine more than the test runner does. Two constraints follow,
and both are cheap to honor now and expensive to retrofit: the vocabulary must carry
**budgeted progress** (hence `progress` carrying `budget?`, not just `done/total`), and
it must not be *execution*-shaped in a way that excludes a producer that explores rather
than replays. It does not need a separate abstraction layer: the explorer's output unit
genuinely is a transcript — the research doc's §6 settles that its findings surface as
*proposed transcript files* the author accepts or discards — so it emits the same
`transcript-*` events for candidate paths, plus `progress` and `finding`. One stream,
three producers, no second design round.

**Host decision, made rather than deferred: the Testing tab is a web bundle in the IDE's
existing `WKWebView`.** ADR-301 line 78 says "Do not start building until this is
answered"; under the directive this plan answers it. Reasons in weight order: the tab is
already mocked five ways in HTML (`docs/work/ide-transcript-editor/mock-*.html`); the
`sharpee-play://` scheme handler is proven and on disk; cards with inline assertion
editing and diffs are routine in HTML and laborious in AppKit; and a TypeScript consumer
**imports `@sharpee/ide-protocol` directly** instead of hand-mirroring it into Swift,
which satisfies rule 8b properly rather than waiving it at a language boundary. This
deletes the Swift decoder mirror phase from the previous plan.

## References consulted

- `docs/architecture/adrs/adr-277-ide-integrated-testing.md` — D1 owns the record stream. This plan **supersedes** its per-transcript construction and its "never a silent skip" rule is the argument for `'unreached'`. Amendment owed in Phase 1.
- `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` — `Status: TBD`; its open question ("what hosts it?") is answered above rather than waited on, per the directive.
- `docs/architecture/adrs/adr-302-transcript-branches.md` — D10, D11 (assemble whole before executing), D13 (unreached is not failed), D17 (re-execution; first child continues, siblings replay). Semantics carried, not re-litigated. Note ADR-302 contains **no IDE consumer analysis** — that gap is what this plan closes.
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` §175 — the explorer's soundness/budget contract, and "CLI first, long-running; IDE surfaces findings". The source of the `progress.budget` requirement.
- `docs/architecture/adrs/adr-131-automated-world-explorer.md` — `Status: Proposed — and unbuilt as of 2026-08-05: nothing in packages/`. Confirms the explorer is a future producer to design *for*, not to build here.
- `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md` §6 — the explorer's output is proposed transcript files, which is why no separate item abstraction is needed.
- `packages/transcript-tester/src/runner.ts:320` — the existing per-command hook the observer sits beside.

## Phases

### Phase 1: The event vocabulary
- **Tier**: Medium
- **Budget**: 200
- **Domain focus**: The event shapes, their envelope, and their guards.
- **Entry state**: `packages/ide-protocol/src/test-results.ts`, six record types at version 1, guards rejecting anything else loudly.
- **Deliverable**: `run-events.ts` at `RUN_EVENT_SCHEMA_VERSION = 2` with the table above; `seq`/`elapsedMs` on the envelope; `phase` and `progress` records; guards for each; doc comments carrying the *reason* per the existing `actualOutput` precedent. Dated amendment to ADR-277 D1 recording the supersession and the version-2 break.
- **Exit state**: `ide-protocol` suite green. Two tests earn their keep beyond shape round-tripping: a **synthetic explorer-shaped producer** drives the whole vocabulary end to end (phases, budgeted progress, candidate transcripts, no command-level replay) proving no second stream is needed; and a stream with interleaved `seq` values reorders correctly. No emitter or consumer changed yet.
- **Status**: COMPLETE (2026-08-06, session 7f4a36). `src/run-events.ts` at `RUN_EVENT_SCHEMA_VERSION = 2`, exported from the barrel beside the deprecated v1 records (kept until Phase 2 moves their consumers). `ide-protocol` **41 passed (4 files)**, +16 in `tests/run-events.test.ts`. Both build targets clean, and `transcript-tester` + `branch-tester` rebuilt clean — `CoveragePoint` moved to `run-events.ts` and is re-exported from `test-results.ts`, so deleting the v1 module later leaves nothing dangling. ADR-277 D1 amended in place. **Deviation from plan**: no `finding` event was declared — its shape is not knowable until the explorer exists, and inventing one would pin a guess; the doc comment records that adding a variant stays additive.

### Phase 2: The observer seam in the transcript runner
- **Tier**: Large
- **Budget**: 350
- **Domain focus**: Turning execution from a returned tally into an observable sequence. This is the phase the plan exists for.
- **Entry state**: `runTranscript(transcript, engine, options)` returns a completed `TranscriptResult`; `RunnerOptions` already carries `coverage`, called per command at `runner.ts:320`. `reporter.ts` formats a finished result. `aggregate.ts` builds records from a finished result.
- **Deliverable**: An observer on `RunnerOptions` firing at transcript start (before the first command, carrying the parsed `commandCount`), per command completion, and at transcript end. The NDJSON writer in `devkit/src/commands/test.ts` becomes a subscriber writing each event as it arrives. The terminal reporter becomes a subscriber over the same events. Behavior Statement (rule 12) before tests — this changes when the runner calls out and in what order.
- **Exit state**: **Terminal output byte-identical** — the Dungeo chain's rendered output diffs clean against a pre-change capture (the reporter is a regression baseline, not a thing to redesign here). `952 passed` unchanged. `--json` emits `transcript-start` before any `command-result` for that file, verified by stream order, not by inspection. **Performance gate**: chain wall time within 5% of the 8452ms baseline — 952 individual writes must not cost what the burst did not. `transcript-tester` suite green (was 253).
- **Status**: COMPLETE (2026-08-06, session 7f4a36). `RunObserver` on `RunnerOptions`; both command loops route every append through a `record()` helper so the announced sequence *is* `TranscriptResult.commands`; `runTranscript` announces before any early return. New `transcript-tester/src/run-event-stream.ts` owns the envelope (`seq` monotonic, `elapsedMs`) and emits immediately — version mirrored and compile-time pinned, never value-imported (ADR-277 D1 type-only rule). `reporter.ts` split into `reportTranscriptStart`/`reportCommandResult`/`reportTranscriptEnd`, with `reportTranscript` reimplemented in terms of them so live and post-hoc rendering cannot drift; devkit drives the live trio.
  **Gates, all executed**: Dungeo chain terminal output **diff-clean** against the pre-change capture (1085 lines, timing lines excluded), `952 passed`. Live vs post-hoc rendering of `rug-trapdoor` **identical** but for absolute-vs-relative path (a pre-existing CLI difference) and 1ms. Fernhill tree unaffected: `22 passed`, `552 commands (518 authored + 34 replayed)`. Real Fernhill `--json` stream: 20 events, **0 rejected** by `isRunEvent`, `seq` 0..19, `transcript-start` before the first `command-result`, coverage immediately before `run-end`. Suites: transcript-tester **262 passed (22 files)** (+9), devkit **132 passed, 1 skipped** (+1), branch-tester **360 passed** (unchanged), ide-protocol **41 passed**.
  **Performance**: the machine is noisy — three identical post-change runs gave 8435 / 8494 / 9853 ms against an 8512 ms baseline (the baseline run itself varied 8452–8512). Median-to-median is within 1%; the ~1.4s outliers appear in both baseline and post-change samples, so no regression is measurable at this granularity.
  **Caught by an existing gate**: devkit's `test-json.test.ts` (rule 13a real-path, spawns the real command) failed 9 tests immediately on the version bump because it validated against v1's `isTestResultRecord`. Migrated to `isRunEvent`, and **strengthened** with a new case pinning Phase 2's actual claim — start before commands, `commandCount` matching what ran, monotonic `seq`, non-decreasing `elapsedMs`.

### Phase 3: Phases around load and compile
- **Tier**: Small
- **Budget**: 150
- **Domain focus**: The dead time before the first command.
- **Entry state**: `loadAuthorGame` and Chord compilation run before any record is written; `info()` lines go to stdout only when `--json` is off.
- **Deliverable**: `phase` events around compile, load, and (for trees) assemble, emitted on the same stream.
- **Exit state**: A Chord project's `--json` run emits `phase{compile}` before `phase{load}` before the first `transcript-start`, with `elapsedMs` showing where the time actually went. Timed against a real Chord story, not a fixture.
- **Status**: COMPLETE (2026-08-06, session 7f4a36). `loadAuthorGame` gained an optional `LoadPhaseReporter` rather than being timed from outside — for a Chord project the compile happens *inside* the loader, so an outside wrapper could only say "loading" and never where the seconds went. Module projects emit `load` alone (no compile step to report); ADR-248's `freshStory` recompile is deliberately unreported, since announcing a compile mid-transcript would read as a new run starting.
  **Measured on real stories**: Fernhill (Chord) — `compile` 2→12ms, `load` 12→19ms, then `transcript-start`. Dungeo (module) — `load` 2→81ms, i.e. **79ms of previously invisible time** before the first command, and no compile phase.
  **Gates**: devkit **133 passed, 1 skipped** (+1: a real-path case pinning the four-event order, `.story` detail, every phase preceding the first `transcript-start`, and each pair enclosing non-decreasing elapsed time). Non-JSON terminal output unchanged (`rug-trapdoor` diff clean but for 1ms) — phases ride the stream only, because the human reporter already prints its own "Loading story from" line and moving that would shift a regression baseline for no gain.

### Phase 4: The tree observer, and the guard comes out
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Node-level execution as events, including the replays the current result deliberately hides.
- **Entry state**: `runTree` returns `TreeRunResult`; replayed executions increment `executedCommands` but are **never pushed to `outcomes`** (`tree-runner.ts:226`), so nothing downstream can see them. `--tree --json` exits 2.
- **Deliverable**: The Phase 1 observer at node granularity — start/end per execution including replays (`replayed: true`), `parent` from the tree, unreached nodes emitted as a start/end pair with `blockedBy` and zero commands, D11 defects as `transcript-end{status:'error'}` per offending file. `summarizeTreeRun` becomes a projection over the same events. Guard deleted.
- **Exit state**: Fernhill through `--tree --json` reconstructs five roots with correct child counts; authored/replayed sums equal the reporter's `518 + 34`; non-JSON tree output byte-identical; `22 passed`, `552 commands (518 authored + 34 replayed)` unchanged. Same check on `branch-stories/tree-npm-fixture`. `branch-tester` suite green (was 360).
- **Status**: COMPLETE (2026-08-06, session 7f4a36). `TreeObserver` + `TreeRunnerOptions` on `runTree`; the tree announces its own nodes and forwards only `onCommandResult` inward, so an execution is never announced twice in two shapes. Unreached nodes emit a start/end pair with zero commands. D11 defects and parse failures emit one `transcript-end{status:'error'}` per file via new `transcriptError`/`transcriptUnreached` methods — added rather than letting the CLI fabricate a `TranscriptResult` with a `status` the domain type cannot express. The `--tree --json` exit-2 guard is gone.
  **Gates**: Fernhill `--tree --json` → **634 events, 0 rejected** by `isRunEvent`, seq monotonic, **39 executions / 5 roots / 17 replayed**, and `552 = 518 authored + 34 replayed` **recomputed from the stream** by attributing each command to its enclosing start rather than trusting the summary. Tree terminal output **diff-clean** vs baseline (659 lines). `tree-npm-fixture` `3 passed`, `4 commands (3 authored + 1 replayed)`. Dungeo chain through a rebuilt bundle **diff-clean**, `952 passed`. Suites: branch-tester **360**, devkit **135 passed, 1 skipped** (+3), transcript-tester **262**.
  **Two things the work surfaced.** (1) branch-tester carries a full copy of `runner.ts` as well as `types.ts` (ADR-302 D15), so the first tree stream emitted **zero** command events while reporting 516 passing commands — the observer had been added to transcript-tester's runner only. Both copies now carry it, which is the D15 duplication cost paid a second time in one session. (2) A new test caught `blockedBy` arriving as a **stem** while `parent` is an absolute path — two identity domains on one wire, the exact thing the design argued against. `onNodeUnreached` now passes the failing NODE, and the CLI emits its path.
  **Deviation from plan**: `summarizeTreeRun` was NOT rewritten as a projection over the observer's events. It is already a pure projection over `outcomes`, and both `outcomes` and the observer derive from the same execution, so the "one source" property holds without touching a function whose output is a pinned regression baseline. The tree's TERMINAL output also stays post-hoc deliberately — interleaving replays live would put a replayed ancestor's rows mid-tree, reading as the same test running twice, and the terminal has no way to mark them.

### Phase 5: The Testing tab
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: The surface the whole plan is for.
- **Entry state**: `tools/ide/SharpeeIDE/Test/TestPanelView.swift` renders a flat list from a Swift decoder mirror; the Play surface's `WKWebView` + `sharpee-play://` handler is the proven pattern; five HTML mocks exist as artifacts.
- **Deliverable**: A web bundle Testing tab importing `@sharpee/ide-protocol` directly (no Swift mirror): the live feed — running transcript named, commands landing one at a time, phases surfaced; the tree nested by parentage with a blocked subtree shown once under its origin rather than as a wall of red; replayed executions dimmed. Click-through to `file:line` preserved. Which mock it follows is David's call at phase start.
- **Exit state**: `xcodebuild test` green (was 469, 0 failures); a real Fernhill tree run renders live; a deliberately broken interior node renders one failure plus a blocked count. The Swift `TestResultRecord.swift` mirror is retired — **deletion requires explicit confirmation** and is proposed, not assumed.
- **Status**: COMPLETE (2026-08-06, session 322542, branch `feat/adr-301-testing-tab`). All seven ADR-301 acceptance criteria met and pinned by tests; see the ADR's Acceptance section for the per-criterion evidence.
  **Which mock it follows** — the plan left this as David's call at phase start; the call made was to merge both rather than pick: the surface and its three modes come from `testing-tab-mock.html` (Column/List/Documents, preview pane, document reading view, path bar), and the live behaviour comes from `testing-tab-prototype.html` (the event fold, running/replay/unreached treatment, phase chips, tallies, follow toggle). They were built as two halves of one design and neither is complete alone. Say so and it is reversible: the modes live in `views.ts` and the fold in `model.ts`, which are separate files for exactly this reason.
  **What was built**: `tools/ide/web/testing-tab/` — a framework-free TypeScript bundle (`model.ts` the pure fold, `views.ts` the three modes, `host.ts` the bridge, `dom.ts` two helpers), bundled by `build.mjs` (esbuild) into `SharpeeIDE/Resources/testing-tab/` and run from a pre-build script on every `xcodebuild`. Swift side: `TestingTabWebRoot`, `TestingTabSchemeHandler` (`sharpee-test://`, reusing Play's MIME table rather than copying it), `TestingTabViewController` (raw-line transport, coalesced per runloop turn), a `didReceiveLine` addition to `TestRunnerDelegate`, `runTree` on `TestRunner`, and the tab hosted in the right panel — where the skein tab was retitled "Skein" (it had been holding the name "Testing") to free the name for the surface ADR-301 names.
  **Gates**: `xcodebuild test` **521 passed, 0 failures**. Tab unit suite **12 passed** (`vitest`, the fold). `tsc --noEmit` clean. Nothing under `packages/` was touched, so the Dungeo chain and Fernhill tree baselines are untouched by construction (`git status` confirms the diff is confined to `tools/ide/`).
  **THE BASELINE WAS NOT GREEN, AND THE PLAN SAID IT WAS.** Measured before any change this session: **508 tests, 21 failures**, every one `schemaVersionMismatch(found: 2, expected: 1)`. Phases 1–4 bumped the wire to v2 and left the Swift decoder at v1; the plan's "was 469, 0 failures" predated that. This is the cost of Phase 2's version break landing without its Swift consumer, which the plan's own Risks section named ("Phase 5's bundle and Phase 2's emitter must land together or `--json` is broken in between") and which is exactly what happened.
  **Deviation from plan, and from ADR-301 D1**: the mirror could not be retired. The 21 failures were NOT in the Tests panel — they were in Skein replay verification (`ReplayDriver`) and re-bless (`Rebless`), Swift subsystems that read the same stream and have no TypeScript route to the wire. `TestResultRecord.swift` was migrated to schema 2 instead of deleted; ADR-301 D1 carries Amendment A1 recording this. **Nothing was deleted.**
  **Also fixed, and worth naming because it was pre-existing**: `SplitDividerTests.testEditorPlayDividerMovesBothWaysAndSticks` was the one test in its file that did not clear the persisted pane widths, while persisting its own drags — so `before` crept wider each run until `before + 120` crossed the editor's minimum. It was failing on the stashed baseline too (837 vs 872, verified by stashing this session's work and re-running), so it is not a regression from this phase; it is now wrapped in `withCleanLayoutDefaults` like its neighbours.

## Out of scope

- **Building the explorer.** ADR-131 is unbuilt and stays unbuilt. This plan only owes it a vocabulary it can drive, proven by the Phase 1 synthetic-producer test.
- **The ADR-301 editing surface** — cards with in-place assertion editing, record-from-play into a `.transcript`. Phase 5 ships the *reading* half. Editing is the next plan.
- **Deleting `tools/ide/SharpeeIDE/Skein/`** (12 files). Superseded by the research doc, but a retirement with its own blast radius and its own confirmation.
- ADR-302 **D6**, coverage of untaken divergences. Still unimplemented.

## Risks

- **Phase 2 touches the only code path every test in the repo runs through.** The mitigations are the two gates in its exit state: byte-identical terminal output, and a 5% wall-clock ceiling. If per-command writes prove costly, the fallback is coalescing writes at the transport, never at the observer — the event sequence stays honest even if the bytes are batched.
- **Version 2 is a real break.** Every consumer is in this repo, which is what makes it affordable; the cost is that Phase 5's bundle and Phase 2's emitter must land together or `--json` is broken in between. Sequence accordingly.
- **`seq`/`elapsedMs` on every envelope is the kind of field that looks free and isn't** — it commits every producer, including the explorer, to a monotonic clock. Cheap to honor, worth stating.
- **No CI** (`tools/ide/README.md`). Every gate here is a named local command in its phase's exit state.

## ADR obligation

This plan supersedes ADR-277 D1's record contract, answers ADR-301's open question, and
commits the IDE to a web-bundle Testing tab. That is three constraints on future
sessions, which is the ADR bar — **ADR-worthy, and David's call whether to write it**.
Recommended: write it after Phase 1 proves the vocabulary, so it records a contract that
has been exercised rather than one that has been imagined.
