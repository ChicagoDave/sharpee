# Session Summary: 2026-08-10 15:35 - feat/testing-tab-embed (session ed3730)

## Goals
ADR-307 plan Phase 6 (cutover) on David's go; plus a cursory Testing
Navigation ADR raised before starting.

## Completed
- Session start: recap + pre-session audit relayed (clean), gate cleared.
- **ADR-308 drafted** (`adr-308-testing-navigation.md`, DRAFT, cursory by
  request): navigation aids for fully-tested stories — derived-view-only
  direction (D1), candidate set (overview graph without card details,
  search, failure navigation, deliberately-open ???), card list stays
  primary (D3). Five open questions; interview offered, superseded by
  "phase 6". Does not gate the cutover.
- **Phase 6 cutover landed** — the transcript grammar is gone from the
  Chord/IDE world. David confirmed the full delete list plus four rulings:
  - **A**: `from-play.ts` + `sharpee transcript-from-play` deleted;
    ADR-305 flipped SUPERSEDED (play IS recording — nothing to promote).
  - **B**: orphaned satellites deleted (watch, coverage, search, aggregate,
    reporter, story-loader, game-factory, trait-formatter, cli.ts, and the
    v1 tree runner trio tree-runner/tree/tree-report).
  - **C**: `sharpee test` is document-only — discovery of
    `<story-id>.tests.json` is the ONLY lookup; `.transcript` args,
    `--chain`, `--coverage` refuse by name (exit 2); `--tree` accepted as
    the IDE spawn's spelling; module projects (no `.story`) now have no
    `sharpee test` (named error, noted to David).
  - **D**: Swift transcript chrome removed — `TranscriptHighlighter.swift`
    (+ tests + editor dispatch), `ProjectArtifacts` tests/ special case
    (legacy `tests/` now an ordinary Other folder); `sharpee init` no
    longer scaffolds `tests/transcripts`.
- **branch-tester survivors** (7 src files): tree-document, tree-walker,
  runner (the #253 file write-back removed — a run never writes; gained
  `aggregateTestRun`, kept here because transcript-tester's result types
  are narrower than this package's claim vocabulary), auto-assertion,
  channel-assert, types (coverage field removed), index (rewritten barrel).
  Tests pruned 33 → 6 files: grammar-feature suites deleted; four
  shared-behavior suites (auto-assertion, channel-assert, skip-executes,
  world-capture) rewritten over in-memory transcripts (the walker's shape).
- **devkit**: `test-tree.ts` deleted (`findTreeDocument` moved into
  `test-tree-document.ts`); `test.ts` rewritten (routing + named
  refusals); cli wiring/help cleaned; retired tests deleted
  (auto-assertion CLI write-back, test-json NDJSON-over-transcripts);
  `test-tree.test.ts` → `tree-document-discovery.test.ts`.
- **IDE**: surface `src/shims/fs.ts` deleted; TestRunnerTests rewritten to
  document fixtures (streams guard-shaped records; malformed document =
  exit 2 with ZERO events — refusal precedes the stream; edited document
  re-runs fresh); ProjectArtifacts/ProjectTreeGrouping tests updated;
  bundle rebuilt into Resources/.
- **Flips + amendments**: ADR-306 SUPERSEDED in part (range/tick §3,
  rulings 8/13/17 re ticking); ADR-302 SUPERSEDED in part (D1 at-rest for
  the Chord/IDE world); ADR-305 SUPERSEDED; ADR-307 header records the
  flips + Phase 5 rulings amended inline (D2 record-time synthesis/JSON
  source of truth, D3 recording-includes-claims + default policy, E2E
  count-free rows); functional-logic doc §1–§8 marked superseded → §9.
- **sharpee.net** (website/ in-repo): Testing section of
  building-playing-and-testing rewritten to the tree-document world
  (recording, `<story-id>.tests.json`, branches/regions/run detail, seams
  callout, CLI); install usage block, chord-writer overview/table,
  your-first-story, fernhill learn pages (3) updated; `next build` green.

## Evidence (all 2026-08-10 ~15:45–16:10)
- branch-tester **86 passing** (was 397 — grammar suites deleted with the
  grammar); devkit **148 passing, 1 skipped** (was 178); surface
  **66 passing** + `tsc -p` clean; transcript-tester **278 passing**
  (untouched world green — AC-5); ide-protocol **46 passing**.
- IDE suite **469 passing, 0 failures, TEST SUCCEEDED** via xcodebuild with
  `-derivedDataPath ./DerivedData` (was 475; TranscriptHighlighter suite
  deleted, rewrites 1:1). First run caught 4 real failures (1 missed
  fixture expectation, 3 transcript-mode TestRunner pins) — fixed, then
  green.
- AC-5 grep clean: no parseTranscript/serializeTranscript/renameTranscript/
  tests-discovery reachable in branch-tester, devkit, or the IDE
  (`standalone/build.ts` excluded — transcript-tester world, untouched per
  ADR-307's header). Root `tsc --noEmit` clean.
- dist + dist-esm clean-rebuilt (stale compiled modules of deleted sources
  removed); `tsf build --npm` green for branch-tester and devkit; website
  `next build` green.
- Mutation-verification: 2 warnings — scaffold-removal asserted only by
  omission (fixed: explicit `existsSync(tests/) === false`, suite green);
  test.test.ts positive path thin but covered by test-tree-document.test.ts
  (noted, no action).

## Key Decisions
- Rulings A–D above (David, pre-implementation).
- `aggregateTestRun` stays branch-tester's own (type drift: its claim
  vocabulary is wider than transcript-tester's; the wire stream itself
  remains transcript-tester's).
- Test-prune principle: a test dies with its grammar feature; shared
  behavior keeps coverage through the document world (four suites rewritten
  in-memory rather than deleted).

## Files Modified
See plan Phase 6 status block for the full list; deletions span
`packages/branch-tester/src` (16 files) + tests (27), `packages/devkit`
(test-tree.ts, from-play.ts + tests ×3), IDE surface shim, Swift highlighter
+ tests. Edits: branch-tester index/types/runner, devkit
test.ts/test-tree-document.ts/cli.ts/init.ts + tests, EditorViewController,
ProjectArtifacts + 3 Swift test files, 4 ADRs, functional-logic doc, plan,
7 website pages. New: `adr-308-testing-navigation.md`.

## Afternoon additions (post-cutover)
- **`.chord` imports question answered**: ADR-251 ACCEPTED + IMPLEMENTED
  (2026-07-21) — confirmed live in today's devkit suite.
- **Website version bump (site only, David's scope ruling)**: Sharpee
  section badge 4.1.2 → 5.0.0 (`nav.ts`), Chord Writer status-bar example
  → `Sharpee 5.0.0 / Chord 3.0.0`; Chord (3.0.0) and Chord Writer (1.0.0)
  already correct; `next build` green. Package versions untouched (4.6.0)
  — the real bump is queued pre-DMG.
- **Go-live reconciliation (read-only)**: remaining = ADR-309
  implementation → package version bump → Phase 8 DMG (+ plan bookkeeping:
  Phases 5/6/6a–6f statuses need supersession stamps from the ADR-306→307
  chain). Items 5 and 9 closed today.
- **ADR-309 Tool-Owned IFID: drafted, interviewed, reviewed, ACCEPTED**
  (all in-session). David's rulings: tool owns the IFID period (toolchain,
  not IDE — CLI-only authors are mainline); config sidecar
  `{story-name}.config.json` is canon, header line is the tool's rendering;
  reconcile on save; config designed-open (version + ifid now, committed,
  never gitignored); lands pre-DMG. Review 13/19 → five findings folded
  (D5 broken-config named error, D6 publish-rides-build, E2E scenario,
  ACs 1–5, flip owner) → 19/19 → ACCEPTED. Retires go-live item 5.
- **ADR-308 note**: drafted earlier this session (see above), still DRAFT
  with its five open questions — interview offer stands.
- **Session-planner dispatched** for ADR-309 implementation
  (docs/work/ifid/plan-20260810-adr-309-tool-owned-ifid.md); plan-review
  found 2 STALE-ADR wording findings (D6's "publish builds first" was
  structurally false — reworded; ADR-284 A1's Generate-IFID sentence added
  to Phase 3's stamp scope) — both fixed pre-implementation.
- **ADR-309 Phase 1 DONE** (devkit CLI): `story-config.ts` +
  reconcileHeader (mint-optional), init/build/build-browser/publish wired,
  compose read-only check (design call flagged: the IDE feeds compose
  buffer snapshots, so compose must never write — deviates from ADR D3's
  literal "compose" reconcile moment, delivers its intent). devkit **166
  passing, 1 skipped**; mutation-verification's build-entry gap closed with
  3 real-path tests; tsc clean, dist rebuilt, tsf --npm green.
  `sharpee ifid` keep-as-utility recommendation pending David.
- **ADR-309 Phase 2 DONE** (Chord Writer): `StoryConfig.swift`
  (store + `StoryIdentity.reconcile`), `StoryHeaderIFID.edit/read` (the
  overwrite branch), Create Story writes the config from the same mint,
  `Document.save()` reconciles at the single write choke point, editor
  reloads the buffer when a save rewrote it. Judgment calls: a broken
  config never blocks a save (report, don't refuse — never lose an
  author's text); new `onStoryReconciled` re-composes the real file after
  a reconciling/broken save, closing the snapshot hole that would have made
  the broken-config Problems row vanish permanently after the first
  keystroke. Cross-host byte contract fixed (Foundation's `"k" : v` vs
  `JSON.stringify`'s `"k": v`) — Swift now hand-assembles, both suites pin
  the same literal. Evidence: IDE **491 passing, 0 failures** (+22), devkit
  **167 passing, 1 skipped**, tsf --npm green, plus a real-path E2E against
  the built dist on a real `sharpee init` project (delete → restored
  identical; hand-edit → overwritten; broken → refused, bytes intact).

- **ADR-309 Phase 3 DONE except one held item**: docs rewritten (story
  header "The IFID" section, publishing preconditions, Problems sentence);
  `analysis.missing-ifid` DELETED from the analyzer with its two dedicated
  test blocks (one replaced by the opposite contract: an absent `ifid:`
  compiles with no diagnostic); ADR-298 D5 and ADR-284 (incl. A1's
  now-false Generate-IFID rationale) stamped in the same edit set;
  `PublishView`/`version.ts` comments corrected. Regression: chord **740**,
  devkit **167 +1 skipped**, story-loader **480**, IDE **492 passing, 0
  failures**; tsf --npm green (chord, devkit); chord dist+dist-esm rebuilt;
  `./repokit build dungeo` clean. Mid-sweep IDE run hit the known
  `EditorExternalChangeTests` watcher flake under parallel-build CPU load —
  isolated 4/4 green, clean full run 492/0.
  **HELD for David**: deleting the now-unreachable Swift quick-fix code
  (`ProblemsView.fixes` entry, `MainWindow.applyProblemFix` /
  `presentFixFailure` + wiring, `SpanText` comment,
  `StoryHeaderIFID.insertion` + tests) — confirm-first per CLAUDE.md.

## Ship (evening)
- **Sharpee 5.0.0**: `tsf version 5.0.0` across 33 packages, plus the trap
  the last bump hit — `ENGINE_VERSION` and dungeo's stamped constants
  re-stamped so the publish workflow's `git diff --exit-code` guard passes
  on its own build output. Chord language stays 3.0.0, Chord Writer 1.0.0;
  the website reads its badge live from `packages/sharpee/package.json`.
- **PR #257 merged** (`31ef79b2` → `fe5b4e94`): 168 files, +3,190/−12,369 —
  the ADR-307 cutover, ADR-309 implementation, and the version bump.
- **Publish dry run GREEN** (run 31440383661): every package built at
  5.0.0, stamping guard passed, artifacts built, Validate passed, Publish
  (dry run) passed, real Publish correctly skipped.
- **PR #258 merged** (`2f4d91ab` → `87a00365`) — the two items #257 left
  open, both closed on David's word:
  - **Quick-fix path retired** (Phase 3's held deletion): ProblemsView's
    `fixes` registry + button + `fixClicked` + `onFix`, MainWindow's
    `applyProblemFix`/`presentFixFailure`/wiring,
    `StoryHeaderIFID.insertion` + `Insertion`. Two fixtures that used the
    retired diagnostic as sample data retargeted to a generic
    block-spanning warning. IDE **480 passing, 0 failures** (−12).
  - **SonarCloud gate cleared**: all three "reliability bugs" were S2871
    (bare `.sort()`). Sonar's `localeCompare` advice would have been a REAL
    bug — one sort orders a persisted wire document's keys, the other picks
    which story a directory resolves to, and locale collation would make
    both machine-dependent. Fixed with explicit code-unit comparators.
    **SonarCloud PASS on #258** (it failed on #257).

## Session Metadata
- **Status**: COMPLETE. ADR-307 plan DONE (all six phases). ADR-309 DONE
  (all three phases + the held deletion). Sharpee 5.0.0 shipped to `main`
  via PRs #257 and #258; publish dry run green; SonarCloud green on #258.
  Working tree clean except `scripts/clodpod.sh`, which stays untracked by
  design.
- **Open items**: (1) ~~Swift dead-code deletion~~ — DONE in PR #258.
  (2) **`sharpee ifid`** — recommend keeping as a raw generate/validate
  utility; David's call (the website's install page still lists it,
  pending that). (3) ADR-308 open-questions interview
  (re-offer when navigation work starts). (4) Splice gesture chrome still
  unruled (carried). (5) Module projects have no test path post-cutover
  (ADR-307 ruling C consequence). (6) branch-tester's runner still carries
  transcript-directive support (forces/save-restore/etc.) that nothing
  reaches post-cutover — candidate for a later prune, not grammar code.
- **Go-live remaining**: package version bump (Sharpee 5.0.0 / Chord 3.0.0
  — the website already shows them) → Phase 8 DMG. Plus the go-live plan's
  own bookkeeping (Phases 5/6/6a–6f need supersession stamps).
