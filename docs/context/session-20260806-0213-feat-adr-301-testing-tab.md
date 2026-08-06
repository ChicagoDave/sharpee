# Session Summary: 2026-08-06 (02:13) — feat/adr-301-testing-tab

## Goals
- Started: "continue all work unless you run into a major issue - work on a branch."
- Phase 5 of `docs/work/ide-testing-wire/plan-20260806-run-event-spine.md` — "The Testing tab": the web-bundle surface ADR-301 D1 decided, on a branch off the prior session's work.

## Phase Context
- **Plan**: `docs/work/ide-testing-wire/plan-20260806-run-event-spine.md`, Phase 5 (Large, 400 budget). Phases 1–4 completed in session 7f4a36 and landed as commit `66ecc9ea`.
- **Branch**: `feat/adr-301-testing-tab`, cut from `feat/adr-300-302-channels-branch-tester`.
- **Phase outcome**: COMPLETE. All seven ADR-301 acceptance criteria met and pinned by tests.

## The finding that shaped the session

**The `xcodebuild test` baseline was not green, and the plan said it was.** Measured before
any change: **508 tests, 21 failures**, every one `schemaVersionMismatch(found: 2,
expected: 1)`. Phases 1–4 bumped the run-event wire to schema 2 and left the Swift decoder
at 1. The plan's stated entry state ("was 469, 0 failures") predated that break. The prior
session's own Risks section had named the exposure — *"Phase 5's bundle and Phase 2's
emitter must land together or `--json` is broken in between"* — and this is what it looked
like from the far side.

**The failures were not where ADR-301 assumed.** D1 said the Swift mirror
(`TestResultRecord.swift`) was retired because the tab, a TypeScript consumer, imports the
wire directly. But only 4 of the 21 failures were in the Tests panel's path. The other 17
were **Skein replay verification** (`ReplayDriver`, ADR-299) and **re-bless** (`Rebless`,
ADR-282 D2) — Swift subsystems that drive a real `sharpee test --json` run and read its
per-command results, with no TypeScript route to the wire available to them. Deleting the
mirror would have taken both with it.

So the mirror was **migrated to schema 2, not deleted**: `phase`, `progress` and
`coverage` variants added (a decoder that threw `unknownType` on `phase` would stop on the
first event of a Chord run), plus `unreached`/`blockedBy`, `replayed`/`parent`/
`commandCount`, `totalUnreached`, and `tree`/`explore` run modes. ADR-301 D1 carries
Amendment A1 recording that D1's claim was too broad and what it actually buys — the *tab*
has no Swift mirror in its path, and the mirror no longer has to track the whole wire for a
panel's sake.

## Completed

### The web bundle — `tools/ide/web/testing-tab/`
Framework-free TypeScript, four modules with one job each: `model.ts` (the pure fold from
`RunEvent[]` to a tree — no DOM, no bridge, no timers, so the state machine is testable
without a browser), `views.ts` (the three modes, preview, and document reading surface),
`host.ts` (the one seam to AppKit), `dom.ts` (two helpers; `textContent` only, never
`innerHTML` — every string the tab renders comes from a story under test).

`build.mjs` is a single esbuild pass. It aliases `@sharpee/ide-protocol/run-events` to the
package's **source** file rather than its build output, which sidesteps the `dist-esm`
staleness trap outright: a tab compiled against last week's schema version is exactly the
drift rule 8b exists to prevent. `tsconfig.json` and `vitest.config.ts` carry the same
alias, so what the type-checker checks, what the tests drive, and what the bundle ships are
one file.

### The Swift host
`TestingTabWebRoot` (locates the bundle in `Bundle.main`), `TestingTabSchemeHandler`
(`sharpee-test://app/`, a distinct handler from Play's because the two serve different
roots and one handler with a swapped root would let a stale Play load answer a Testing
request — but it reuses Play's MIME table rather than copying it), and
`TestingTabViewController`, whose whole job is transport: raw NDJSON in, page requests out.
Lines are coalesced per runloop turn, because a chain run emits over nine hundred and nine
hundred round trips into a web view buys nothing.

`TestRunnerDelegate` gained `didReceiveLine`, delivered **before** decode and whether or
not decode succeeds — a line the Swift mirror cannot read is precisely the line the tab
should still receive. `TestRunner` gained `runTree`. The tab is hosted in the right panel,
where the skein tab was briefly retitled "Skein" to free the name — that tab was then
removed outright in the second commit (see below).

### Which mock the tab follows — the call the plan left open
The plan said this was David's call at phase start. The call made was to **merge both
rather than pick**: the surface and its three modes come from `testing-tab-mock.html`, the
live behaviour from `testing-tab-prototype.html`. They were built as two halves of one
design and neither is complete alone. It is reversible — the modes live in `views.ts` and
the fold in `model.ts`, separate files for exactly this reason.

### Tests
- **`TestingTabRealPathTests.swift`** — rule 13a, nothing this repo owns is stubbed: the
  bundle shipped in the app, served by the real scheme handler into a real `WKWebView`,
  rendering a real `sharpee test --tree --json` run of the real `branch-stories/fernhill`
  through the real `TestRunner`, with every assertion read off the **rendered page**. It
  recomputes `552` / `518 authored · 34 replayed` from the stream and agrees with the
  reporter; a deliberately broken `key` (interior, four children) renders exactly one
  failure with descendants present and classed `unreached`; `arrival` carries the badge
  `1`; selection survives every mode switch; double-clicking `concealment` lists all 16
  turns and clicking a line number reaches the host as `concealment.transcript:12`.
- **`tests/model.test.ts`** (12, vitest) — the fold, including the two cases a naive fold
  gets wrong: a replayed execution must count its commands while leaving the node's own
  result untouched, and an unreached node must be present and named without being a failure.
- **`TestResultRecordTests.swift`** rewritten for v2 (+7 cases), including that the
  superseded v1 stream is rejected by *version*, not by shape.

**Suite: 521 passed, 0 failures** (from 508/21). Tab unit suite 12 passed. `tsc --noEmit`
clean. Nothing under `packages/` was touched, so the Dungeo chain and Fernhill tree
baselines are untouched by construction.

### A pre-existing flake fixed, and named as pre-existing
`SplitDividerTests.testEditorPlayDividerMovesBothWaysAndSticks` was the one test in its
file that did not clear the persisted pane widths while persisting its own drags, so
`before` crept wider each run until `before + 120` crossed the editor's minimum width.
Confirmed pre-existing by stashing this session's work and re-running: it failed at the
baseline too (837 vs 872). Now wrapped in `withCleanLayoutDefaults` like its neighbours.

## Key Decisions

### 1. The bundle's build output is committed
Unusual for build output, and the reason is specific: XcodeGen resolves the folder
reference at generate time, so a gitignored folder would make `xcodegen generate` on a
fresh clone silently produce an app with **no Testing tab**. A pre-build script regenerates
it on every `xcodebuild`, so the committed copy is a seed, never the thing that ships
stale. Source maps and minification are off to keep it diffable.

### 2. The pre-build script warns rather than fails when node is absent
Failing the build of a Swift app because a JavaScript toolchain is missing is a poor trade,
and the committed bundle is still valid. Node resolution mirrors the app's own tiers
(vendored → PATH → login shell), because Xcode strips the interactive PATH.

### 3. Both testing surfaces stay, for now
The tab ships the *reading* half. The older outline panel still owns ADR-282 D2's re-bless,
which ADR-301 explicitly scopes to "the next decision". Replacing the panel now would have
been a silent feature regression traded for tab-strip tidiness. Both are fed from one run —
the panel by the mirror, the tab by raw lines.

## Deviations
- **ADR-301 D1's mirror retirement** — could not be done; see the finding above.
  Amendment A1 written.
- **Nothing was deleted.** `TestResultRecord.swift` is now load-bearing again;
  `TestPanelView.swift` and `tools/ide/SharpeeIDE/Skein/` are untouched and still pending
  their own confirmations.

## Files Modified

**Docs/ADRs** (2): `docs/architecture/adrs/adr-301-sharpee-transcript-editor.md` (Amendment
A1, Acceptance evidence, Consequences), `docs/work/ide-testing-wire/plan-20260806-run-event-spine.md`
(Phase 5 status block).

**New — web bundle** (9): `tools/ide/web/testing-tab/{build.mjs,tsconfig.json,vitest.config.ts}`,
`src/{main.ts,model.ts,views.ts,host.ts,dom.ts,index.html,tab.css}`,
`tests/model.test.ts`; build output at `tools/ide/SharpeeIDE/Resources/testing-tab/`.

**New — Swift** (4): `SharpeeIDE/Test/{TestingTabWebRoot,TestingTabSchemeHandler,TestingTabViewController}.swift`,
`SharpeeIDETests/TestingTabRealPathTests.swift`; plus `tools/ide/build-testing-tab.sh`.

**Modified — Swift** (12): `SharpeeIDE/{MainWindow.swift,Play/RightPanelViewController.swift}`,
`SharpeeIDE/Test/{TestController,TestPanelModel,TestPanelView,TestResultRecord,TestRunner}.swift`,
`SharpeeIDETests/{ReplayDriverTests,SplitDividerTests,TestPanelModelTests,TestResultRecordTests,TestRunnerTests}.swift`,
`tools/ide/project.yml`.

## Second piece of work: the skein retirement was executed

**David's correction**: *"we were dropping skein (thought that was removed a few days ago)."*
He was right about the decision and wrong about the code, and the gap was real:
ADR-299 was marked SUPERSEDED on **2026-08-04** (session c42886), but nothing was
deleted. For two days the ADR read as retired while 2,768 lines of it still
shipped. Both plans had carved the deletion out by name pending confirmation
(`plan-20260805` line 104, `plan-20260806` line 160), and ADR-300's own D1 row
said verbatim *"`.skein` retirement is unexecuted … Deleting them needs explicit
confirmation."* This session got the confirmation and executed it.

**Removed**: `SharpeeIDE/Skein/` (12 files, 2,768 lines); 15 test files
(11 `Skein*`, plus `ReplayDriverTests`, `ReplayRealPathTests`, `InvarianceTests`,
`TranscriptViewTests`); `branch-stories/fernhill/play-testing/fernhill.skein`;
the Skein tab and its replay/tag/force/bless actions (`RightPanelViewController`
660 → 162 lines); the Play pane's skein session and its 163-line replay-to-node
machinery; ADR-280's "Play Testing" sidebar group; the `.skein` special case in
sidebar activation; the "New Thread" button name, which was a skein term; and —
after David's second pass — the turn-events bridge, the pinned Play seed, and the
whole recording-hook chain (see below).

**Kept at first, then cut.** The initial pass retained the turn-events bridge, an
in-memory `sessionLog`, and a pinned Play seed, each with a paragraph explaining
why the future editing surface would want it. David: *"there's a lot of hacky
retention in that summary."* He was right, and counting settled it rather than
arguing — **every retained symbol had zero production readers**:

| symbol | production readers |
| --- | --- |
| `sessionLog`, `onTurn`, `PlayedTurn` | 0 (declaring file only) |
| `announceTranscript` | 0 |
| `onTranscriptRecorded`, `transcriptsSaveDirectory`, `storyDirectory` | 0 (written, never read) |
| `pinnedPlaySeed` | 0 (only the test written to justify it) |
| `refreshProjectTree` | 0 (3-level forward; only caller was the deleted recording callback) |

All of it went, along with `configureRecording` from `AppDelegate` down and the
`PlaySessionLogTests` file written to justify the bridge. **The seed is the
clearest case**: `git log -S` shows it arrived *with* the skein (`23c81be6`,
"Phases 1-4 … pinned play seed") to make skein replay reproducible. Replacing it
with a constant was inventing a feature to stand where one had been deleted —
and then arguing in a doc comment that the invention was better than the thing it
replaced.

**One thing stayed, on evidence rather than intent.** `RecordingSession`'s
serialization grammar also has no production caller — but the re-bless tests
build fixtures with it, and re-blessing a transcript is only a meaningful test if
the transcript came from the real serializer instead of a hand-typed string. Its
header now opens `// NO PRODUCTION CALLER, and that is stated rather than dressed
up`, and names the condition under which it leaves.

**Coverage.** `SkeinPlayGrowthTests` covered the turn bridge; the bridge is gone,
so the coverage goes with it rather than being replaced. `ProjectArtifactsTests`'
three Play-Testing cases became one that pins a contract that still exists: a
`play-testing/` folder still on disk **surfaces in Other** rather than vanishing —
the open-view rule is what made deleting the group safe, so it is now asserted.

**Suite: 363 passed, 0 failures** (from 521 — the delta is skein tests and the
dead-hook sweep). ADRs updated: ADR-300 D1 row marked EXECUTED with scope and a "what survived"
note; ADR-299's status records that supersession and deletion were two days
apart; ADR-301 gains **A1.1** — the skein's removal took `ReplayDriver` with it,
so **re-bless is now the Swift mirror's only consumer**, which turns the mirror's
retirement condition into something checkable.

## Next
- **The editing interaction** — ADR-301's named next decision: cards per turn, `contains`
  by selection, re-bless in the tab. That is the work that would let the outline panel retire.
- **Awaiting David's confirmation** (nothing deleted without it): `TestPanelView.swift`
  once editing lands; v1 `packages/ide-protocol/src/test-results.ts` and its remaining
  devkit/branch-tester/transcript-tester importers. `SharpeeIDE/Skein/` is **done** —
  removed this session.
- **A Chord language question, flagged not taken**: adding `seed` to `IRStoryFields` so a
  story can pin its own Play seed. Today it is a constant.
- The right panel is back to six tabs (Build, Play, Testing, Index, Diagnosis, Test), two
  of which are still testing surfaces until the editing decision retires the outline panel.

---

## Session Metadata

- **Status**: COMPLETE (two commits: the Testing tab, then the skein retirement)
- **Blocker**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: the first commit (the Testing tab) is confined to `tools/ide/` and
  deletes nothing. The second (the skein retirement) deletes 28 files and is the one to
  revert if the removal proves premature — it is a separate commit for exactly that reason.
  Both are on `feat/adr-301-testing-tab`, with no commits to the parent branch.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1–4's v2 wire was the hard prerequisite and was in place
  (committed as `66ecc9ea`).
- **Prerequisites discovered**: the Swift decoder migration to v2 was an unstated
  prerequisite of Phase 5 — not listed in the plan, found by measuring the baseline before
  changing anything. Had the phase started from the plan's stated entry state, the 21
  failures would have been read as damage from this session's work.

## Architectural Decisions

- ADR-301 D1 **Amendment A1** — the Swift mirror survives, narrowed to the two Swift
  consumers that have no import route; the tab's path is mirror-free.
- ADR-301 Acceptance — all seven criteria met, per-criterion evidence recorded in the ADR.
- Pattern applied: DEVARCH 8b satisfied by direct import for the TypeScript consumer, and
  the mirror kept, narrowed and pinned where the language boundary makes 8b's fix
  unavailable.

## Mutation Audit

- Files with state-changing logic modified/added: `tools/ide/web/testing-tab/src/model.ts`
  (the fold mutates `RunModel`), `SharpeeIDE/Test/TestingTabViewController.swift` (line
  buffering and web-view evaluation), `SharpeeIDE/Test/TestRunner.swift` (raw-line
  delivery), `SharpeeIDE/Test/TestController.swift` (both surfaces fed from one run).
- Behaviour Statement produced before tests for `applyEvent` (rule 12); Integration Reality
  is the real-path suite below.
- Tests verify actual state mutations: YES. Evidence, all executed 2026-08-06 in-session:
  `xcodebuild test` **521 passed, 0 failures**; `TestingTabRealPathTests` **6 passed**
  asserting on rendered DOM after a real 634-event Fernhill tree run; `vitest`
  **12 passed** asserting on folded model state, not return values.

## Test Coverage Delta

- Tests added: +6 (`TestingTabRealPathTests`, Swift real-path), +7 (`TestResultRecordTests`
  v2 cases), +12 (`model.test.ts`, new suite).
- Before **508 passed / 21 failures** → after **521 passed / 0 failures** (Swift);
  tab unit suite 0 → 12.
- Known untested areas: the Documents mode's explorer-proposed group (ADR-301 D5) has no
  producer — ADR-131 is unbuilt, so the group renders nothing and is not exercised; the
  `follow` toggle and Escape-to-close are driven by hand, not by a test; re-bless from the
  tab does not exist (out of scope by ADR-301).
