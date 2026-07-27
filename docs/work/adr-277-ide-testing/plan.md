# Session Plan: ADR-277 — IDE integrated testing

**Created**: 2026-07-27
**Overall scope**: Ship ADR-277 end to end — a versioned NDJSON test-results
wire contract in `@sharpee/ide-protocol`; `sharpee test --json` (devkit +
transcript-tester) emitting it, fixing the "validation failure vanishes"
bug and learning `.story`-file arguments and `walkthroughs/` chain scanning;
a right-panel Test tab in the IDE (tools/ide) with a streaming NDJSON runner,
click-through navigation, and a walkthrough-chain run; `.transcript` as an
editable, line-highlighted document type; and, as an explicit follow-on
phase, recording a Play session into a draft `.transcript` over a new
turn-events bridge. This plan touches `packages/ide-protocol`,
`packages/transcript-tester`, `packages/devkit`, `packages/platform-browser`,
and `tools/ide/` — the `packages/` edits are the ones ADR-277 D6 explicitly
authorizes; nothing else in `packages/` is in scope.
**Bounded contexts touched**: N/A — this is CLI/tooling and native macOS
editor work, not domain modeling (no `docs/ddd/notation.yaml`; the project's
own DDD methodology does not apply to IDE plumbing). In Sharpee's own
subsystem vocabulary: `ide-protocol`'s wire-contract layer, the author-facing
`sharpee test` CLI (`packages/devkit`), the `transcript-tester` runner/
reporter, and the IDE's Build/Play/Test/Editor subsystems
(`tools/ide/SharpeeIDE/*`).
**Key domain language**: NDJSON event stream (`run-start` / `transcript-start`
/ `command-result` / `transcript-end` / `run-end`), per-transcript status
(`passed | failed | error` — `error` replaces the silent skip), schema
version (loud Swift-decoder rejection on mismatch, the `compose --json`
precedent), walkthrough chain (`walkthroughs/`, filename order, no manifest,
`--chain`-only scan), bare run (`tests/`-only, fast), line-number
click-through (not span — transcripts are line-oriented), turn-events bridge
(the D5 follow-on JS→Swift channel).

## References consulted
- `docs/architecture/adrs/adr-277-ide-integrated-testing.md` — the plan's
  sole decision source: D1 (NDJSON contract in `ide-protocol` + `sharpee test
  --json`, type-only transcript-tester import, `.story`-file argument), D2
  (right-panel Test tab, ⌘U, ProblemsView-precedent click-through, cancellable
  subprocess), D3 (`walkthroughs/` top-level dir, filename order, no
  manifest, chain-only-on-request, bare run stays `tests/`-only), D4
  (`.transcript` line-classifier highlighting, explicitly NO golden-fixture
  lexer port), D5 (recording is a follow-on phase, turn-events bridge in
  `platform-browser`, `[OK]`+`#`-comment capture format), D6 (scope guard —
  only the named platform changes; Swift tests are rule-13a real-path).
  Acceptance items 1-7 are this plan's phase-level acceptance gates verbatim.
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` —
  parent ADR; the precedent this plan's Swift phases follow rather than
  reinvent: `ComposeRunner`'s buffered Process/pipe/decode pattern,
  `BuildRunner`'s streaming Process/readabilityHandler/SIGTERM-SIGKILL
  pattern, the Swift Codable-mirror-with-schemaVersion-gate convention
  (`ComposeDiagnostics.swift`), and `RightPanelViewController`'s tab-strip
  pattern (Build/Play/Index/Diagnosis) this plan adds a fifth Test tab to.
- `docs/architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md`
  — R1: two test CLIs split by audience. `sharpee test` (devkit, author-side)
  is this plan's surface; the platform bundle's `--test`
  (`scripts/bundle-entry.js`) is explicitly NOT in scope (ADR-277 D1 says so
  directly) — its own duplicated aggregation `reduce` and validation-skip
  bug are left untouched by this plan, a deliberate scope boundary, not an
  oversight.
- `docs/work/adr-258-ide-swift/plan.md` — structural precedent for phase
  tiering/budgets, the "IDE suite green at every commit" discipline, and the
  rule-13a real-path Swift test pattern (drive the real resolved `sharpee`
  bin against a real fixture story, e.g. `stories/fernhill/fernhill.story` —
  already confirmed present with both `tests/` and `walkthroughs/`
  subdirectories, making it this plan's primary fixture too).
- `docs/context/project-profile.md` — confirms the pnpm-workspace/TS
  monorepo layout and `tools/ide` as a recognized top-level tool directory;
  carries no Swift-specific conventions (TS/pnpm-centric profile), so Swift
  style in this plan follows the Swift precedent files directly, not the
  profile.
- `docs/context/session-20260727-1640-main.md` (most recent session — the
  session that drafted and got ADR-277 accepted) — Open Items carry no
  blocker that conflicts with this plan; the session's own scope ruling
  ("integrated testing = runner + chains + authoring/recording, NOT the
  IDE's own test suite") is already fully absorbed into ADR-277 D6 and this
  plan does not re-litigate it.
- `CLAUDE.md` — the "platform changes require discussion first" gate scopes
  to `packages/`; ADR-277's acceptance (2026-07-27) IS that discussion and
  D6 explicitly authorizes exactly the `packages/ide-protocol`,
  `packages/devkit`, `packages/transcript-tester`, and `packages/
  platform-browser` edits named below — no phase below needs a fresh
  platform-change conversation. Testing-commands section confirms `pnpm
  --filter '@sharpee/<pkg>' test` as the required per-package test format and
  `dist/cli/sharpee.js` as the bundle-testing target (the bundle is
  unaffected by this plan per the ADR-187 R1 scope boundary above).

## Hard constraints carried from the ADR (not re-litigated by this plan)
1. **Bare `sharpee test` stays `tests/`-only** (D3) — the fast unit loop must
   not slow down. `walkthroughs/` is scanned only when `--chain` is passed
   with no explicit transcript files.
2. **The bundle `--test` (`scripts/bundle-entry.js`) is out of scope** (D1) —
   no phase below adds `--json`, fixes its validation-skip bug, or dedupes
   its aggregation `reduce`. If a future session wants that, it is a
   separate ADR-277-adjacent decision, not silently folded in here.
3. **`transcript-tester`'s `ide-protocol` import is type-only** (D1
   Consequences, review finding 2) — `import type` only; no runtime
   dependency edge from `transcript-tester` to `ide-protocol` (which
   re-exports the Chord Story IR wholesale). `ide-protocol` is added to
   `transcript-tester`'s `package.json` as a `devDependency`, never a
   runtime `dependency`.
4. **NDJSON emission must never call `process.exit()`** — devkit's `cli.ts`
   already uses `process.exitCode` specifically because `exit()` truncates
   piped stdout past 64KB (the ADR-258-session gotcha, documented in
   `cli.ts:176-186`); the new `--json` path must follow the same discipline
   throughout, not just at the top-level dispatch.
5. **Per-transcript `error` status, never a silent skip** (D1) — a
   validation or load failure produces a `TranscriptResult`/NDJSON
   `transcript-end` record with `status: "error"`, visible in both the
   human reporter and `--json` output. This is a `transcript-tester` type
   fix, not something re-derived only inside the emitter.
6. **The IDE suite is green at every commit** and **Swift tests are
   rule-13a real-path** (D6, Acceptance 6) — no phase below may leave
   `SharpeeIDETests` red, and the Test-runner tests must drive the actual
   resolved `sharpee` binary against a real fixture story (`stories/
   fernhill/fernhill.story`), never a hand-written stand-in for the CLI.
7. **`.transcript` highlighting is a line-classifier, not a lexer port**
   (D4) — no golden-fixture conformance pin for this format, unlike
   ADR-258 D7's Chord lexer. Keeping this simple is itself the ADR's
   ruling, not a shortcut this plan is taking.

## Phases

### Phase 1: D1/D3 — test-results NDJSON contract + `sharpee test --json` + walkthrough scanning (platform)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Platform packages touched**: `packages/ide-protocol`, `packages/
  transcript-tester`, `packages/devkit`. This is the full set ADR-277 D6
  authorizes for D1/D3; `scripts/bundle-entry.js` is explicitly untouched
  (constraint 2).
- **Focus**: the whole platform-side CLI surface in one phase, since D1 (the
  wire contract + emitter) and D3 (`walkthroughs/` scanning) share the same
  entry point (`sharpee test`) and the same underlying aggregation fix —
  splitting them would just create an artificial mid-phase dependency.
- **Entry state**: ADR-277 ACCEPTED. `ide-protocol` already exports
  `ProjectManifest` and `ComposeJsonPayload` (the `compose --json`
  precedent, ADR-258 D5) with a co-located-guards, `SCHEMA_VERSION`-const
  convention (`packages/ide-protocol/src/compose-diagnostics.ts`).
  `transcript-tester`'s `TranscriptCommand.lineNumber` is already tracked by
  the parser (`parser.ts:111-116`) — the per-command line data D1 needs
  already exists, it just isn't exposed on the wire. `devkit/src/commands/
  test.ts` (141 lines) resolves a directory only, scans `tests/` only, has
  its own inline `reduce`-based aggregation (`test.ts:131-137`), and
  silently `continue`s past a `validateTranscript` failure (`test.ts:
  110-114`), dropping the transcript from `results` entirely. `devkit`
  already has the exact test-writing precedent to follow:
  `packages/devkit/tests/compose-json.test.ts` calls `runCompose` (the
  exported function) directly against a temp-dir fixture story and asserts
  on the decoded payload via `ide-protocol`'s own guard — no subprocess, no
  stub of the compile path.
- **Deliverable**:
  - `packages/ide-protocol/src/test-results.ts` (new): `TEST_RESULTS_SCHEMA_
    VERSION = 1 as const`; a discriminated union `TestResultRecord =
    RunStartRecord | TranscriptStartRecord | CommandResultRecord |
    TranscriptEndRecord | RunEndRecord`, each carrying `schemaVersion` and a
    `type` discriminator:
    - `RunStartRecord { schemaVersion, type: 'run-start', mode: 'tests' |
      'chain', transcriptCount }`
    - `TranscriptStartRecord { schemaVersion, type: 'transcript-start',
      file, index }`
    - `CommandResultRecord { schemaVersion, type: 'command-result', file,
      line, input, passed, expectedFailure, skipped, error? }` — `line` is
      the `.transcript` source line (already tracked by the parser).
    - `TranscriptEndRecord { schemaVersion, type: 'transcript-end', file,
      status: 'passed' | 'failed' | 'error', passed, failed,
      expectedFailures, skipped, duration, errorMessage? }` — `status:
      'error'` covers both validation failures and story-load/runtime
      errors (constraint 5).
    - `RunEndRecord { schemaVersion, type: 'run-end', totalPassed,
      totalFailed, totalExpectedFailures, totalSkipped, totalErrors,
      totalDuration, exitCode }`
    - `isTestResultRecord` plus one guard per variant, co-located in the
      same file per `compose-diagnostics.ts`'s convention (types + guards
      together, not split into a separate `guards.ts` for this contract).
  - `packages/ide-protocol/src/index.ts`: export the above alongside the
    existing `compose-diagnostics` exports.
  - `packages/ide-protocol/tests/test-results.test.ts` (new, mirrors
    `tests/compose-diagnostics.test.ts`'s structure): a guard test per
    record variant, plus a `schemaVersion: 999` rejection test for each.
  - `packages/transcript-tester/src/types.ts`: add `status: 'passed' |
    'failed' | 'error'` to `TranscriptResult` (additive — the ADR's
    Consequences explicitly permit "small additive changes to its types").
    A validation-failed or story-load-failed transcript now produces a
    `TranscriptResult` with `status: 'error'`, zero commands, and an
    `errorMessage` field, instead of being silently dropped.
  - `packages/transcript-tester/src/aggregate.ts` (new):
    - `aggregateTestRun(transcripts: TranscriptResult[]): TestRunResult` —
      the one shared reduce, replacing the duplicated inline reduces in
      `devkit/test.ts` (`:131-137`) and `transcript-tester`'s own `cli.ts`
      (`:368-376`, same package — in scope). `scripts/bundle-entry.js`'s
      copy (`:737-744`) is untouched (constraint 2).
    - `emitNdjsonTestRun(transcripts, options)` (streaming, not buffered —
      D1's "NDJSON event stream, not a buffered payload"): writes `run-
      start` immediately, then per transcript `transcript-start` →
      `command-result`* → `transcript-end`, then `run-end` once all
      transcripts (or the stopped-early subset) are processed. **Type-only
      import**: `import type { TestResultRecord, ... } from '@sharpee/
      ide-protocol'` — the emitter constructs plain object literals shaped
      by the imported types; no runtime call into `ide-protocol` (constraint
      3).
  - `packages/transcript-tester/package.json`: `@sharpee/ide-protocol:
    workspace:*` added as a `devDependency` (types-only usage never needs a
    runtime dependency entry).
  - `packages/transcript-tester/src/index.ts`: export `aggregateTestRun`
    and `emitNdjsonTestRun`.
  - `packages/transcript-tester/src/cli.ts`: its own duplicated reduce
    (`:368-376`) replaced with `aggregateTestRun(...)`.
  - `packages/devkit/src/commands/test.ts`:
    - New `--json` flag: routes to `emitNdjsonTestRun` instead of the chalk
      reporter; still returns the same 0/1/2/3 exit-code contract via
      `process.exitCode` (never `process.exit()` anywhere in the new path —
      constraint 4).
    - The validation-failure `continue` (`:110-114`) is replaced with
      constructing and pushing an error-status `TranscriptResult` — fixes
      the "vanishes from results entirely" bug for BOTH the plain reporter
      and `--json` output.
    - `.story` FILE argument: a bare `<name>.story` path as the first
      positional argument resolves `projectDir` to the file's containing
      folder — mirror `compose.ts`'s existing `<file.story>`-as-first-arg
      handling (`compose.ts` already takes a `.story` file directly; reuse
      its resolution logic rather than reinventing a second style).
    - Walkthrough scanning (D3): `--chain` with zero explicit transcript
      arguments scans `<dir>/walkthroughs/` (filename sort, no manifest)
      and runs it with chain semantics; a bare `sharpee test` (no `--chain`,
      no explicit files) is unchanged — still `tests/`-only (constraint 1).
      Explicit transcript-file arguments still bypass directory scanning
      entirely, as today.
    - Aggregation calls `aggregateTestRun()` — the inline reduce (`:131-137`)
      deleted.
    - **As-built deviations (2026-07-27)**: the emitter is record-builder
      functions (`runStartRecord`/`transcriptRecords`/`runEndRecord`/
      `ndjsonLine`) the devkit loop writes live, not a post-hoc
      `emitNdjsonTestRun(transcripts)` (which couldn't stream); load
      failures keep exit 3 (existing contract + test) while still emitting
      error records for every not-run transcript; `transcript-tester`
      gained a `"test": "vitest run"` script (it had none).
    - **DISCOVERED, needs ruling before Phase 4**: bare `[OK]` is an EXACT
      match vs the expected-output block (`runner.ts:1174-1181`) — with no
      expected output it always fails. ADR-277 Q4b's capture format
      (`> command` + `[OK]`) would record always-failing transcripts.
  - `packages/devkit/src/commands/test.test.ts`: extended for the new
    `.story`-arg resolution and `walkthroughs/`-vs-`tests/` scanning
    branches (unit-level, existing file).
  - `packages/devkit/tests/test-json.test.ts` (new, mirrors `tests/
    compose-json.test.ts`'s pattern exactly): calls `runTestCommand`
    directly (in-process, not a subprocess) against a temp-dir fixture story
    with one passing and one validation-broken transcript, capturing the
    NDJSON stdout lines (spy/capture, same technique `compose-json.test.ts`
    uses for `runCompose`'s output) and asserting on the decoded record
    sequence via `ide-protocol`'s own guards.
- **Exit state**: `sharpee test --json <story-or-dir>` emits a valid NDJSON
  stream ending in `run-end`; a transcript that fails `validateTranscript`
  appears as a `transcript-end` record with `status: "error"` in both the
  plain and `--json` paths (never silently absent); `sharpee test <name>.
  story` resolves and runs identically to `sharpee test <containing-dir>`;
  `sharpee test --chain` with no file args runs `walkthroughs/` in filename
  order with state persisting; bare `sharpee test` is unaffected. `pnpm
  --filter '@sharpee/ide-protocol' test`, `pnpm --filter '@sharpee/
  transcript-tester' test`, and `pnpm --filter '@sharpee/devkit' test` are
  all green. `./repokit build` succeeds (the bundle is unaffected —
  `bundle-entry.js` untouched).
- **Test scenarios**:
  - `ide-protocol`: a `schemaVersion: 999` payload is rejected by each
    variant's guard (not partially accepted); one round-trip guard test per
    record variant.
  - `transcript-tester`: a story-loader failure and a `validateTranscript`
    failure each produce a `status: 'error'` `TranscriptResult` — assert on
    the array contents (the regression test for "vanishes from results
    entirely"), not just a count.
  - `transcript-tester`: `aggregateTestRun` over a fixture array of 3
    `TranscriptResult`s (one error, one failed, one passed) sums correctly,
    including a `totalErrors` count that did not exist before.
  - `devkit` real-path (rule 13a, in-process per `compose-json.test.ts`'s
    convention): `runTestCommand(['--json', tmpStoryDir])` against a fixture
    with one clean-passing and one validation-broken transcript — assert
    the captured NDJSON lines parse as `run-start → transcript-start →
    command-result* → transcript-end → transcript-start → transcript-end →
    run-end`, with the broken transcript's `transcript-end.status ===
    'error'`.
  - `.story` file argument: `runTestCommand(['stories/fernhill/fernhill.
    story'])` produces the same transcript set as `runTestCommand
    (['stories/fernhill'])`.
  - Walkthrough chain: a fixture story with 2+ files under `walkthroughs/`
    (an item picked up in the first, referenced in the second) — assert
    `runTestCommand(['--chain', tmpStoryDir])` (no file args) runs them in
    filename order with state persisting, and that a bare `runTestCommand
    ([tmpStoryDir])` does NOT touch `walkthroughs/` at all.
  - Full existing suites green per-package (`pnpm --filter`, not a whole-repo
    run, per CLAUDE.md's preferred format).
- **Status**: COMPLETE (2026-07-27, session 8a8c83) — ide-protocol 23 ✓,
  transcript-tester 8 ✓, devkit 107 ✓ (+1 skipped); `./repokit build dungeo`
  clean; bundle transcript smoke (rug-trapdoor, 14 passed) green.

### Phase 2: D1(Swift)/D2/D3(IDE)/D6 — Test tab, NDJSON runner, click-through, chain run
- **Tier**: Large
- **Budget**: ~450 tool calls (the largest phase — mirrors ADR-258 Phase 4's
  sizing for the biggest single swap row; this phase adds an entire new
  panel, a new subprocess runner class, and the rule-13a real-path tests
  that close most of this ADR's Acceptance list in one go).
- **Platform packages touched**: none. Consumes Phase 1's shipped `sharpee
  test --json` and `@sharpee/ide-protocol` test-results contract read-only.
- **Focus**: the IDE half of D1 (Swift decoder + loud schema-version
  rejection) plus all of D2 (Test tab, menu, cancellable runner) plus the
  IDE half of D3 (chain-run action) — closing Acceptance items 1 (Swift
  half), 2 (Swift-visible proof), 3, 4, and 6.
- **Entry state**: Phase 1 landed — `sharpee test --json` works end-to-end
  against real fixture stories; `stories/fernhill/fernhill.story` has both
  `tests/` and `walkthroughs/` populated (confirmed present). `ComposeRunner.
  swift`'s buffered Process/pipe/decode pattern and `resolveSharpee(near:)`
  PATH resolution, `BuildRunner.swift`'s streaming Process/
  readabilityHandler/SIGTERM-SIGKILL-cancel pattern, `RightPanelViewController
  .swift`'s 4-tab strip (Build/Play/Index/Diagnosis, `tabStrip.addTab`/
  `show(tab:)`), `MainWindow.swift`'s existing `openDocument(at:line:column:)`
  (`:537-538`), and `MenuBuilder.swift`'s `makeBuildMenuItem(target:)`
  pattern (`NSMenuItem` + `#selector(AppDelegate.buildProject(_:))` +
  `keyEquivalent`) all exist as precedents to follow, not reinvent.
- **Deliverable**:
  - `tools/ide/SharpeeIDE/Test/TestResultRecord.swift` (new): Swift
    `Codable` mirrors of the 5 NDJSON record types from Phase 1, following
    `ComposeDiagnostics.swift`'s mirror-with-`schemaVersion`-gate
    convention, adapted for a discriminated union decoded per-line (a
    `type` field switch, not a single top-level payload). A `decode(line:)`
    that throws a typed error on unknown `schemaVersion` — loud, not
    partial (constraint from D6/Acceptance 1's Swift half).
  - `tools/ide/SharpeeIDE/Test/TestRunner.swift` (new): spawns the resolved
    `sharpee` (`ComposeRunner.resolveSharpee(near:)`, reused not
    reimplemented) with `test --json [--chain] <target> [files...]`,
    streaming stdout via `BuildRunner`'s `readabilityHandler` pattern but
    **line-buffering** the chunks (`availableData` does not align with line
    boundaries) — accumulate into a buffer, split on `\n`, decode each
    complete line as it arrives, carry a partial trailing line forward.
    Cancel via SIGTERM escalating to SIGKILL (`BuildRunner.cancel()`'s
    pattern, reused). If any internal coordination uses `DispatchGroup`
    (e.g. draining stdout/stderr to completion), `group.notify` MUST target
    `queue: .main` explicitly — the known MainActor-inference trap
    (`ComposeRunner.swift:139` already documents this exact gotcha in
    context).
  - `tools/ide/SharpeeIDE/Test/TestResultsView.swift` + `TestTreeView.swift`
    (new): a transcript tree (grouped `tests/` vs the single `walkthroughs/`
    chain, per D3) and a live results list — transcript rows carry status
    (passed/failed/error), expandable to per-command rows. Any
    `NSOutlineView`/`NSTableView` used here sets `rowSizeStyle = .custom`
    explicitly (the directory-pane font bug fixed this same day,
    `c8a3b237`, was exactly AppKit silently re-standardizing row fonts
    because `rowSizeStyle` wasn't `.custom` — do not repeat it here).
    Click-through on a failed command row calls the existing
    `openDocument(at:line:column:)` (`MainWindow.swift:537-538`) with the
    record's `line` — no span needed (transcripts are line-oriented, unlike
    Chord diagnostics).
  - `tools/ide/SharpeeIDE/Play/RightPanelViewController.swift`: a 5th tab,
    "Test" (`testTab = 4`), added exactly per the existing `addTab`/
    `show(tab:)` pattern — sibling of Build/Play/Index/Diagnosis, full-height
    (D2's explicit ruling — nothing added to the bottom dock).
  - `tools/ide/SharpeeIDE/Menus/MenuBuilder.swift`: a new `makeTestMenuItem
    (target:)` (mirrors `makeBuildMenuItem`) with "Run All Tests" (⌘U),
    "Run Current File", "Cancel Test Run" — wired to new `@objc` actions on
    `AppDelegate` (`tools/ide/SharpeeIDE/AppDelegate.swift`).
  - `tools/ide/project.yml`: if `Test/` needs a distinct Xcode group/target
    membership beyond what a plain new-file-under-`SharpeeIDE` add covers,
    update accordingly (check whether `project.yml` enumerates source
    globs or groups explicitly before assuming a change is needed).
- **Exit state**: running all tests on a story with one deliberately-failing
  transcript shows the failure row live as the run streams; clicking the
  failed command opens the `.transcript` at the exact source line; a
  walkthrough chain run (via the Test tab's chain action) preserves state
  across files the same way `--chain` does on the CLI; cancelling a run
  terminates the subprocess cleanly; a `schemaVersion` mismatch surfaces a
  visible "IDE is out of date" state, not a partial decode or a crash. Full
  `SharpeeIDETests` suite green; `xcodebuild build` clean.
- **Test scenarios**:
  - Real-path (rule 13a): `TestRunnerTests` drives the actual resolved
    `sharpee test --json` against `stories/fernhill/fernhill.story` (or a
    small dedicated fixture with one deliberately-broken transcript) —
    decodes the live NDJSON stream, asserts on `transcript-end.status` and
    `command-result.line` matching the real source (Acceptance 6, the
    plan's headline real-path proof).
  - Chain real-path: the same runner against `fernhill`'s `walkthroughs/`
    directory via `--chain` — assert state persists across files (an
    assertion in the second file depends on the first's mutation), matching
    Acceptance 4.
  - Schema-version rejection: feed the decoder a `command-result` line with
    `schemaVersion: 999` — assert the typed error fires, not a partial
    decode (Acceptance 1's Swift half).
  - Line-buffering: feed the runner's buffer logic split-mid-line chunks
    (simulating a `Pipe` delivering a partial JSON line) — assert it still
    decodes exactly one record per complete line, none dropped or
    double-decoded.
  - Cancel: start a run against a long-running fixture (or a deliberately
    slow test double *of the buffering logic itself*, not of `sharpee` —
    the runner's SIGTERM/SIGKILL path can be tested against any child
    process; the NDJSON payload correctness is what must stay real-path),
    call `cancel()`, assert SIGTERM then (after the grace period) SIGKILL
    if unresponsive, mirroring `BuildRunnerTests`' existing cancel test.
  - Click-through: given a `CommandResultRecord` with `line: N`, assert
    `openDocument(at:line:column:)` is invoked with exactly `N` — a
    view-model-level test (no synthesized mouse click/drag — the known
    AppKit test trap; drive the click handler method directly instead of
    simulating a click).
  - Full `SharpeeIDETests` suite green at this commit.
- **Status**: COMPLETE (2026-07-27, session 8a8c83) — suite 222/222 green;
  `xcodebuild build` clean. As-built notes: real-path fixtures are a dedicated
  mini story (takeable lamp) in temp dirs driven through
  `node packages/devkit/dist/cli.js` (the TestToolchain pattern), not
  fernhill — the plan's allowed alternative; the panel is one
  `TestPanelView` + `TestPanelModel` (outline of transcripts expandable to
  command rows) rather than separate Tree/Results views; `project.yml`
  needed no edit (directory-glob sources — xcodegen regeneration sufficed);
  Test menu = Run All ⌘U / Run Walkthrough Chain ⌥⌘U / Run Current Test
  File ^⌘U / Cancel Test Run.

### Phase 3: D4 — `.transcript` editable document type + line-classifier highlighting
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Platform packages touched**: none.
- **Focus**: `.transcript` opens in the editor with syntax highlighting via
  a small Swift line-classifier — explicitly NOT a lexer port and NOT pinned
  against a golden fixture (D4's own ruling: a mis-classified line here is
  cosmetic, the runner stays authoritative). Closes Acceptance 5.
- **Entry state**: Phase 2 landed — the Test tab's run-current-file action
  exists and can target whichever `.transcript` is open in the editor.
  Whatever mechanism currently gates which file extensions open in the
  editor (`.story` via ADR-258 D2/D4's grammar-header handling) needs a
  parallel `.transcript` branch — confirm the exact gating point (likely in
  `EditorViewController.swift` or wherever `Document`/file-type dispatch
  lives) before adding to it.
- **Deliverable**:
  - `tools/ide/SharpeeIDE/Editor/TranscriptHighlighter.swift` (new): a
    per-line classifier over the transcript grammar (header `key: value`
    lines before `---`; `> command` lines; `[...]` assertions/directives;
    `#` comments; `$` test-commands; everything else is expected-output) —
    a simple prefix/regex switch producing an `NSAttributedString` per
    line, no parse tree, no shared TS/Swift golden fixture (constraint 7).
  - Editor file-type dispatch: `.transcript` added as a recognized,
    highlighted, editable extension alongside `.story` — distinct color/
    token rules, wired wherever `SyntaxHighlighter`/`ChordLexer` is
    currently selected per-extension (ADR-258 Phase 3's `SyntaxHighlighter.
    swift`), NOT routed through `ChordLexer` (a different grammar entirely).
  - Re-run-without-leaving-IDE: verify (and adjust if needed) that the Test
    tab's "Run Current File" action (Phase 2) reads whichever `.transcript`
    is focused in the editor by URL, and that `sharpee test` re-reads the
    file fresh from disk on each run — no live-reload plumbing needed since
    the child process always reads current disk content.
- **Exit state**: opening a `.transcript` file shows header/command/
  assertion/directive/comment/expected-output lines in visually distinct
  styles; editing a line and immediately running it via the Test tab (⌘U or
  run-current-file) exercises the edited content, with no save-dialog or
  editor-hop required. Full `SharpeeIDETests` suite green.
- **Test scenarios**:
  - Classifier: a table-driven Swift test feeding one line of each kind
    (header, `>` command, `[OK]`/`[FAIL]`/`[GOAL: x]`, `#` comment, `$save`,
    plain expected-output text) — assert each classifies correctly.
  - Edit-then-run real-path (rule 13a): open a fixture `.transcript` in the
    editor, mutate a line's expected assertion, save, trigger a Test-tab run
    of that file, and assert (via Phase 2's real NDJSON runner against the
    real `sharpee` binary) that the result reflects the edited content, not
    a cached/stale parse.
  - `.story` highlighting is unaffected — a quick regression check that
    opening a `.story` file still routes through `ChordLexer`/
    `SyntaxHighlighter`, not the new transcript classifier.
  - Full `SharpeeIDETests` suite green at this commit.
- **Status**: COMPLETE (2026-07-27, session 8a8c83) — suite 229/229 green.
  As-built: `TranscriptHighlighter` (classify + whole-line colors, positional
  header rule, `#[` = assertion), per-extension dispatch in
  `applyHighlighting()`; edit-then-run freshness pinned at the runner level
  (`testEditedTranscriptReRunsFresh` — editor save-all before runs was
  already Phase 2's `startRun` precondition, per the build rule).

### Phase 4 (follow-on): D5 — recording a Play session into a draft `.transcript`
- **Tier**: Large
- **Budget**: ~350 tool calls
- **Platform packages touched**: `packages/platform-browser`. This is the
  one D5 change ADR-277 D6 explicitly authorizes ("the D5 turn-events
  channel when its question resolves" — resolved 2026-07-27).
- **Focus**: the turn-events bridge and capture UI, sequenced last per D5's
  explicit "recording is a follow-on phase" ruling. Closes Acceptance 7.
- **Entry state**: Phases 1-3 landed (a working Test tab and runner exist to
  immediately re-run a freshly-recorded transcript). Confirmed by survey:
  the *only* existing JS→Swift Play channel is `playConsole`
  (`PlayViewController.swift:12-37`), a pure Swift-injected `WKUserScript`
  hooking `console.error`/`window.onerror`/`unhandledrejection` globally —
  it requires no `platform-browser` change because those are standard
  browser globals. Turn events (a submitted command paired with its
  rendered response) are NOT observable that way — there is no existing
  global hook for "a turn just completed" — so this phase's `platform-
  browser` change is real, not incidental. `InputManager.ts` already
  tracks `commandHistory` in memory (`:20, 70-71, 154-156`) but never emits
  it anywhere ("uncalled" per the ADR's own survey) — the response side
  (rendered output text) does not yet exist as a captured value at all and
  must be added.
- **Deliverable**:
  - `packages/platform-browser/src/managers/InputManager.ts` (or wherever
    a turn's response finishes rendering — confirm the exact call site
    against `BrowserClient.ts` before assuming `InputManager` alone owns
    it): after a command's response is fully rendered, emit `{ command,
    response }` via `window.webkit?.messageHandlers?.turnEvents?.
    postMessage(JSON.stringify({ command, response }))`, guarded by
    optional-chaining so normal browser play (outside the IDE's WKWebView,
    where `window.webkit` does not exist) is a true no-op — this call is
    shipped in the same client bundle authors' players use, so it must never
    throw or behave differently outside the IDE.
  - `packages/platform-browser/tests/` (existing test directory, e.g. a new
    `tests/turn-events.test.ts` alongside the existing `tests/channels/*`
    suite): assert the emit call fires with the right `{command, response}`
    shape when `window.webkit.messageHandlers.turnEvents` is present (a
    test double for the WKWebView bridge, legitimate here since the
    bridge itself is external to this package — rule 13a's OWNED/EXTERNAL
    split: the postMessage call is OWNED and real-path tested by asserting
    it actually fires with correct data; the native WKWebView transport is
    EXTERNAL), and that it is silently absent/no-op when `window.webkit`
    is undefined (plain browser play unaffected).
  - `tools/ide/SharpeeIDE/Play/PlayViewController.swift`: register a second
    `WKScriptMessageHandler` name (`turnEvents`), decode the `{command,
    response}` JSON, forward each turn to a new recording buffer.
  - `tools/ide/SharpeeIDE/Play/RecordingSession.swift` (new, or a Test-tab-
    adjacent home if that reads better once Phase 2's `Test/` group exists):
    accumulates turns while a "Record" action is active; a Record/Stop
    affordance (Play header or Test tab — implementation decides based on
    what reads naturally next to Phase 2's UI) starts/stops capture.
  - Capture format (D5, exact — not re-litigated): each turn is written as
    `> command` followed by `[OK]` (presence-only assertion, satisfying the
    validator's every-command-needs-an-assertion rule) with the actual
    rendered response captured as `#`-comment lines for the author's
    reference only (never asserted — story text is deliberately RNG-varied,
    per the project's standing "never turn off randomness" policy, so a
    verbatim capture would be brittle on replay).
  - Saving writes a draft `.transcript` file (author chooses the location,
    typically under `tests/`); the file is immediately runnable via Phase
    2's Test tab.
- **Exit state**: a play session in the Play pane can be recorded, stopped,
  and saved as a `.transcript` whose commands carry presence-only `[OK]`
  assertions and `#`-comment response references; running the saved file
  through the Test tab's real runner (Phase 2) passes green against the
  same build, with no manual edits required (Acceptance 7, verbatim). Full
  `SharpeeIDETests` suite green; `platform-browser`'s suite green.
- **Test scenarios**:
  - `platform-browser` unit: the turn-events emit call fires with correct
    `{command, response}` data when the bridge is present, and is a no-op
    (no throw, no side effect) when it is absent.
  - Real-path (rule 13a) end-to-end: record a short session in the Play
    pane against a real fixture story (WKWebView driving the real built
    browser bundle, not a stand-in), save the `.transcript`, run it via
    Phase 2's real Test runner, assert it passes green — this is the
    closing proof for Acceptance 7 and for this phase overall.
  - Capture-format check: assert every recorded command line is followed
    by exactly one `[OK]` line and that the response text appears only as
    `#`-comment lines, never as asserted expected-output.
  - Full `SharpeeIDETests` and `pnpm --filter '@sharpee/platform-browser'
    test` green at this commit.
- **Status**: COMPLETE (2026-07-27, session 8a8c83) — IDE suite 236/236,
  platform-browser 96/96, transcript-tester 13/13, devkit 107/107 green;
  `./repokit build fernhill --browser` clean. As-built deviations:
  - **Q4b amendment applied** (David's ruling): bare `[OK]` is exact-match
    (found in Phase 1) — the capture format uses a NEW `[OK: any]`
    presence-only assertion (transcript-tester parser/types/runner +
    reference doc + tests); bare `[OK]` untouched.
  - The response capture is DOM-level in `BrowserClient.executeCommand`
    (child-count snapshot over the main text slot, echo excluded) — the
    channel renderer, not InputManager/TextDisplay, renders turn prose, so
    the plan's InputManager guess was wrong (its own entry-state note
    predicted this needed confirming).
  - Record/Stop lives in the Play header (PlayHeaderView), session +
    serialization in `Test/RecordingSession.swift`; save panel defaults to
    the story's `tests/`; `writeRecording(to:)` is the testable write+announce
    seam (mutation-verification finding).
  - Acceptance 7's Swift real-path proof: a serialized recording written into
    a real story's `tests/` re-runs GREEN through the actual
    `sharpee test --json` CLI with deliberately-mismatched recorded response
    text. The full GUI loop (click Record in the running WKWebView, play,
    save) is composition-covered (browser emit test + bridge decode test +
    real-path re-run) — one manual GUI walk recommended alongside David's
    pending fernhill walk.

## Build/test commands (all phases)
```bash
# Platform packages (Phases 1, 4)
pnpm --filter '@sharpee/ide-protocol' test
pnpm --filter '@sharpee/transcript-tester' test
pnpm --filter '@sharpee/devkit' test
pnpm --filter '@sharpee/platform-browser' test

# Platform build (confirms the bundle still builds; bundle-entry.js is untouched)
./repokit build dungeo

# IDE (Phases 2, 3, 4)
cd /Users/david/repos/sharpee_v2/tools/ide
/opt/homebrew/bin/xcodegen generate   # after any project.yml edit
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -configuration Debug build
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' test
```
Real-path fixture runs invoked by devkit/transcript-tester tests call the
exported functions directly (`runTestCommand`, `runCompose`'s existing
pattern) against temp-dir fixtures — never a subprocess of the platform
bundle. Real-path Swift tests spawn the actual resolved `sharpee` binary
against `stories/fernhill/fernhill.story` (or a small dedicated fixture),
never a stand-in for the CLI, per rule 13a.

**MAJOR DIRECTIONS reminder**: never auto-retry a failed build or test — if
`xcodebuild` or `pnpm test` fails at any phase, report the failure and wait
for explicit instruction, per CLAUDE.md.

## Session state seed
Phase 1 is CURRENT with the budget above. See
`docs/context/.session-state.json`.
