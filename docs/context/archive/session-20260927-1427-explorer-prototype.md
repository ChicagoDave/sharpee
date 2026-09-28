# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- Close last session's leftovers: GH #522 comment, GH #525 Phase 2 comment, hand-archive the DONE arrange-shapes plan.
- Diagnose and fix why the Testing tab's run column stopped executing tests against secret-letter.
- Investigate GH #523's failing main line once the run column worked again.

## Phase Context
- **Plan**: No active plan. This session hand-archived `docs/work/testing-explorer-525/` (its plan file is named `plan-20260927-525-arrange-shapes.md`, not `plan.md`, so `plan-archive.sh` refused it — filed as GH #539) and removed the now-dangling `docs/context/.current-plan` pointer.
- **Phase executed**: none (no active plan) — this was diagnostic/repair work, not a planned phase.
- **Tool calls used**: 185 (from `.session-state-1cbe5e.json`; no budget set — plan-less session).
- **Phase outcome**: N/A — no plan phase in play.

## Completed

### Session-start leftovers
- Posted the GH #522 comment (second `kello fruit` `aka`-alias collision row) and the GH #525 Phase 2 completion comment.
- Hand-archived `docs/work/testing-explorer-525/` → `docs/work/archive/testing-explorer-525/` (`git mv`) and removed `docs/context/.current-plan`.

### Root-cause diagnosis: the Testing tab's run column
- `sharpee test secret-letter.story --tree --capture-output --capture-world --json` exited 2 in 0.16s: "Tree document is malformed — cards[77]: a card after an END STATE card (cards[76] declares ending 'death-at-mercenaries-chord-167-5')." The 14:56 IDE replay had stamped that ending onto the main line's `ne` card (the same death behind GH #523's failing tree line); the walker treated the whole document as malformed and refused it; the IDE showed nothing because the runner's stderr was discarded and its exit note was suppressed once a run-end tally existed.

### Fix (David: "do it" on the seam, with the column-visibility gap fixed alongside)
- `packages/branch-tester/src/tree-walker.ts`: a card after an END STATE card is no longer a document defect. New `TreeLine.endingIndex`; the line's transcript truncates at its ending card (`transcriptOfLine`); the line reports `error` naming the card/ending/cut-off count (`cardsAfterEndingOf`); its execution-break index is the ending card, and `blockOriginOf` now lets a known break index take precedence over the line's blanket `error` status so forks *before* the ending still run (forks at/after it are blocked). `tree-document.ts` header wording updated to match.
- Tests: `tree-walker.test.ts` (3 END STATE cases rewritten/added; the old defective-document case repointed at a genuine boot-position defect), `tree-end-state.test.ts` (+1 real-platform cut-off case). **Verified this write** (fresh run, 2026-09-27 16:38 CDT, after all edits to these files): `cd packages/branch-tester && npx vitest run` → `Test Files 13 passed (13)`, `Tests 216 passed (216)`.
- `tools/ide/web/testing-surface/src/run.ts` `finishRun`: keeps the exit note when nothing ran even if a run-end tally arrived; `tests/run.test.ts` +1; bundle rebuilt (`Resources/testing-surface/surface.js`). Evidence (session event log, `.devarch-events-1cbe5e.jsonl`, 2026-09-27T20:24:03Z, after the last edit to `run.ts`/`surface.js`): "Tests passed — 14 passed 155 passed".
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`: buffers the runner's stderr (1.5 KB tail) and folds it into the exit note via new `static exitNote(code:diagnostics:)`; new `SharpeeIDETests/TestingSurfaceExitNoteTests.swift` (2 tests) — reported passing via xcodebuild, 2026-09-27 15:26 CDT [reported by session, unverified — not re-run this write, no event-log row]. Two false starts along the way: the CLI build collided with the open Xcode session's products (David's Xcode build-location preference is Custom/RelativeToDerivedData, so `-derivedDataPath` alone no longer isolates — fixed with `SYMROOT`/`OBJROOT` overrides; memory note updated), and the generated `.xcodeproj` needed `xcodegen generate` to see the new test file.
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md`: D4 amendment note (dated 2026-09-27) — "a card after an END STATE card is the line's finding, not a malformed document."
- `devkit test:ci` reported 189 passing (1 pre-existing skip) against the rebuilt branch-tester dist [reported by session, unverified — no event-log row, not re-run this write].
- Verified live (2026-09-27 ~15:23 CDT, session's own account): the IDE's exact command against secret-letter ran 61 lines in 11s, exit 1; main line reported error "the story ended on \"ne\" (ending 'death-at-mercenaries-chord-167-5') — 71 cards after it never ran."
- Rule 15: no changed function name matched the mutation-verification signal list; Behavior Statements for `runTreeDocument`, `finishRun`, and the stderr-relay path were produced in conversation instead.

### GH #523 investigation and document repair
- Read the kill timeline off the replay: waiting expires (card 70) → search (71–73) → lunge (74) → capture (75) → kill (76) — six turns after arrival. Ruled out: a platform change since the 2026-09-22 recording (none outside testing tooling), a story change (story last touched 2026-09-03), the seed (a scratch copy pinned at 42 dies on the same card), and a chance-cursor leak across restart (Node experiment: cursor is `undefined` after restart, stream byte-identical either way).
- David ruled the mercenary logic legit (no kick after the grab = death) → #523 is a recording issue, not a platform bug.
- Filed **GH #540**: the Testing tab boots at a hard-coded seed (42) while the tree document pins its own (secret-letter: 1209); the CLI replays at the document's seed. Confirmed open via `gh issue view 540`.
- Document repair, each step by explicit instruction ("cut the tail" → "strip it and rerun" → "go"):
  1. Trimmed secret-letter's main line from 148 to 77 cards via branch-tester's own serializer (no branches in the cut tail; END STATE card 76 kept).
  2. Removed card 76's stale `contains` assertion (leftover "Grocery Stall" prose from the old recording) — main line then passed on its own.
  3. Discovered two branch lines (`cards[2]`/`b1` and `cards[3]`/`b11`) had been DOUBLED by the same 14:56 IDE session (9→18 and 41→82 cards, exact duplication vs HEAD) — a second visit to an already-visited branch line appends its commands instead of rebinding the driver. Filed **GH #541** for the mechanism (confirmed open via `gh issue view 541`). Cut both lines back to HEAD's copy (18→9, 82→41) through the serializer.
- Final tree run (session's own account, not independently re-run this write): 61 lines, 0 failing (567 passing, 1 skipped), endings 5/5, rooms 21/21; exit 1 only from the 7 derived-rule failures already tracked on GH #522.
- Posted 3 comments on GH #523 this session (root cause, follow-up on the timing, David's ruling) — confirmed via `gh issue view 523 --json comments` (createdAt 20:24:04Z, 20:34:50Z, 21:08:43Z on 2026-09-27; one earlier comment from 2026-09-26 predates this session).

## Key Decisions

### 1. A line ends where the story ends — enforced at run time, not read time
ADR-356 D4 amended (dated 2026-09-27): the walker stops a line at its ending card and reports what's past it as a finding, rather than refusing the whole document as malformed. Refusing turned one line's regression into a dead suite for every line in the document.

### 2. A known execution-break index outranks a line's blanket error status
When deciding which forks are safe to run, `blockOriginOf` now prefers a specific break index (the ending card) over the line's overall `error` classification, so forks that diverge *before* the break still execute.

## Next Phase
- No active plan — none to advance.

## Open Items

### Short Term
- GH #523: closeable once this session's fix and document repair are committed (tree failure resolved in the working copy).
- GH #540: Testing tab boots the runner at a hard-coded seed (42); the tree document pins its own. Needs a decision on which seed source wins before a fix is written.
- GH #541: visiting a branch line twice in one IDE session doubles its cards (visit replay appends instead of rebinding the line driver). Fix proposed (per-line rebind on visit) but not implemented.

### Long Term
- GH #522: 7 derived-rule failures on secret-letter (kello fruit alias ×2, banana, merc-held, dress, fashionable hat, change-no-dress) — pre-existing, unrelated to this session's fix, second comment added this session.
- GH #539: `plan-archive.sh` only recognizes files literally named `plan.md`; this repo names plans `plan-YYYYMMDD-{name}.md`, forcing hand-archiving.

## Files Modified

**Platform / testing** (4 files):
- `packages/branch-tester/src/tree-walker.ts` — END STATE cut-off is a finding, not a document defect; fork-blocking precedence
- `packages/branch-tester/src/tree-document.ts` — header wording
- `packages/branch-tester/tests/tree-walker.test.ts`, `tests/tree-end-state.test.ts` — new/rewritten END STATE cases

**IDE / Testing tab** (5 files):
- `tools/ide/web/testing-surface/src/run.ts`, `tests/run.test.ts` — `finishRun` keeps the exit note when nothing ran
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` — rebuilt bundle
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` — buffers stderr into the exit note
- `tools/ide/SharpeeIDETests/TestingSurfaceExitNoteTests.swift` (new) — 2 tests

**Documentation / plan hygiene** (3 files):
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — D4 amendment note
- `docs/work/archive/testing-explorer-525/plan-20260927-525-arrange-shapes.md` (moved from `docs/work/testing-explorer-525/`)
- `docs/context/.current-plan` (removed)

**Story data** (1 file):
- `branch-stories/secret-letter/secret-letter.tests.json` — main line trimmed 148→77 cards, stale `contains` removed; two doubled branch lines cut back to HEAD's copy (18→9, 82→41)

## Notes

**Session duration**: ~2.2 hours (14:27–~16:40 CDT).

**Approach**: Diagnose-then-discuss-then-fix, one instruction at a time — David gated each destructive step on the story data ("cut the tail", "strip it and rerun", "go") and the platform/IDE change itself ("do it") before it was made, per the platform-changes-require-discussion rule.

**Open items are tracked as plain GitHub issues** (#522, #523, #525, #539, #540, #541), not through the DevArch issue store (`issues.sh list-open` does not carry any of them — confirmed by grep). This matches this repo's established convention (all issues go to GitHub via `gh issue create`; the DevArch store/`devarch` label is reserved for the tool's own recurrence ledger), so the Open Items bullets above cite GH issue numbers directly rather than store-minted ids.

---

## Session Metadata

- **Session**: 1cbe5e
- **Status**: COMPLETE (unverified: devkit test:ci 189 passing; Swift TestingSurfaceExitNoteTests 2 passing via xcodebuild; final secret-letter tree run — 567 passing/1 skipped/0 failing — not independently re-run this write)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits (code, tests, one story-data file, one ADR note, one file move); `git checkout` would cleanly discard them with no orphaned artifacts, no schema or data migrations involved.

## Dependency/Prerequisite Check

- **Prerequisites met**: a built `dist/cli/sharpee.js` and a working Xcode toolchain (both already present); the branch-tester and testing-surface dist bundles rebuilt during the session to pick up the fix.
- **Prerequisites discovered**: none.

## Architectural Decisions

- ADR-356 D4 amended (2026-09-27): "a card after an END STATE card is the line's finding, not a malformed document" — see Key Decisions above.
- Pattern applied: none new; extended the existing tree-walker defect/fork-blocking model rather than introducing a new concept.

## Mutation Audit

- Files with state-changing logic modified: `packages/branch-tester/src/tree-walker.ts` (line/fork classification), `tools/ide/web/testing-surface/src/run.ts` (`finishRun` exit-note state), `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift` (stderr buffering into the exit note).
- Tests verify actual state mutations (not just events): YES for branch-tester and testing-surface (evidence: `npx vitest run` in `packages/branch-tester`, 2026-09-27 16:38 CDT, "Test Files 13 passed (13) / Tests 216 passed (216)", run after all edits; session event log row for testing-surface, 2026-09-27T20:24:03Z, "Tests passed — 14 passed 155 passed", after the last edit to `run.ts`/`surface.js`). Swift `TestingSurfaceExitNoteTests` — YES [reported by session, unverified; not re-run this write].
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — the exit-signal/diagnostics-suppression shape (an IDE run column silently dropping information about why a run stopped) matches `edcd883cb fix(ide): the Avalonia run column's exit signal waits for the relay to drain (closes #535)` from this same session's `git log`, on the other IDE host. Consider a one-time audit of exit/diagnostic handling across both TestingSurface implementations (Avalonia and macOS/SharpeeIDE).

## Test Coverage Delta

- Tests added: 3 rewritten/added in `tree-walker.test.ts`, 1 in `tree-end-state.test.ts`, 1 in `run.test.ts`, 2 new in `TestingSurfaceExitNoteTests.swift` (new file) — 7 total.
- Tests passing before → after: branch-tester baseline not captured pre-session; after: 216/216 across 13 files (evidence: fresh run, 2026-09-27 16:38 CDT, this write). testing-surface after: 155/155 across 14 files (evidence: event log, 2026-09-27T20:24:03Z). devkit `test:ci` 189 passing and Swift 2 passing — [reported by session, unverified].
- Known untested areas: GH #540 (seed divergence) and GH #541 (doubled cards on revisit) are diagnosed but unfixed; no test yet pins either.

---

**Progressive update**: session completed 2026-09-27 16:40 — terminal write: consolidated the 15:00 checkpoint into a full-form summary, corroborated test/build claims against the event log and a fresh branch-tester run, confirmed GH #522/523/525/539/540/541 state via `gh issue view`, and renamed the file to the session's `summaryPrefix`-named path.

## Activity Log (auto-captured)
```
[19:57:54] EDIT: File changed via Bash — branch-stories/secret-letter/secret-letter.tests.json
[19:58:04] EDIT: File changed via Bash — docs/context/.current-plan
[19:58:04] EDIT: File changed via Bash — docs/work/archive/testing-explorer-525/plan-20260927-525-arrange-shapes.md
[19:58:04] EDIT: File changed via Bash — docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md
[20:00:36] BUILD: Build passed — npx tsc --noEmit 2>&1 | tail -20
[20:04:40] EDIT: File changed via Bash — docs/context/.session-state-1cbe5e.json.9iadJk
[20:04:55] EDIT: File changed via Bash — docs/context/session-20260927-1500-explorer-prototype.md
[20:19:55] EDIT: File changed via Bash — packages/branch-tester/src/tree-walker.ts
[20:20:44] TEST: Tests failed — 1 failed 1 passed 2 failed 34 passed
[20:20:44] EDIT: File changed via Bash — packages/branch-tester/tests/tree-end-state.test.ts
[20:20:44] EDIT: File changed via Bash — packages/branch-tester/tests/tree-walker.test.ts
[20:20:44] TEST: Tests failed — python3 - <<'EOF'
p='tools/ide/web/testing-surface/src/run.ts'
s=open(p).read()
 (exit 1)
[20:21:06] TEST: Tests ran (status unverified) — npx vitest run tests/tree-walker.test.ts 2>&1 | grep -n "FAIL\|✗\|×\| ❯ tests" |
[20:21:07] TEST: Tests passed — 1 passed 16 passed
[20:21:07] EDIT: File changed via Bash — packages/branch-tester/src/tree-document.ts
[20:21:07] EDIT: File changed via Bash — tools/ide/web/testing-surface/src/run.ts
[20:21:07] EDIT: File changed via Bash — tools/ide/web/testing-surface/tests/run.test.ts
[20:21:23] TEST: Tests ran (status unverified) — cd /Users/david/repos/sharpee/packages/branch-tester && npx vitest run tests/tre
[20:22:05] BUILD: Build passed — python3 - <<'EOF'
p='packages/branch-tester/src/tree-walker.ts'
s=open(p).read()
[20:22:35] EDIT: File changed via Bash — tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift
[20:23:32] EDIT: File changed via Bash — docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md
[20:23:33] EDIT: File changed via Bash — tools/ide/SharpeeIDETests/TestingSurfaceExitNoteTests.swift
[20:23:37] EDIT: File changed via Bash — tools/ide/SharpeeIDE/Resources/testing-surface/surface.js
[20:24:03] TEST: Tests passed — 14 passed 155 passed
[20:26:46] EDIT: File written — /Users/david/.claude/projects/-Users-david-repos-sharpee/memory/project_ide_xcodebuild_practice.md
[21:38:41] TEST: Tests passed — 13 passed 216 passed
[21:40:32] EDIT: File changed via Bash — docs/context/session-20260927-1427-explorer-prototype.md
[21:41:31] EDIT: File written — docs/context/session-20260927-1427-explorer-prototype.md
[21:45:03] TEST: Tests passed — 12 passed 121 passed
[21:45:13] EDIT: File written — .commit-files
[21:45:20] EDIT: File written — .commit-msg
[21:45:24] GIT: Git operation — bash $HOME/.claude/scripts/git-commit.sh --push
```
