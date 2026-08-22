# Session Summary: 2026-08-22 - feat/adr-321-world-index

## Goals
- Clear the four Tier 1 items (data loss / wedge bugs) from `docs/work/issue-triage/triage-20260822.md` before secret-letter-port work resumed.
- Close each issue on GitHub with cited evidence, and record the two-of-four already-resolved-at-HEAD finding.

## Phase Context
- **Plan**: `docs/work/tier-1-fixes/plan.md` ("Tier 1 fixes — data loss and wedges") — a new plan session-planner wrote at session start, interrupting the active `docs/work/secret-letter-port/plan.md`.
- **Phase executed**: All 5 phases of the tier-1-fixes plan, single session — #295 (data-loss fix), #273 (verify-only), #290 (layout-guard fix), #192 (verify-only), and issue closeout (Small tier each).
- **Tool calls used**: 134 (state file) / 60 (Phase 1's own budget; the plan's five phases carried a combined budget of ~180).
- **Phase outcome**: Completed under budget — plan reached DONE and was archived same-session via `plan-archive.sh`.

## Completed

### Phase 1 — #295: repaint the active tab on external reload
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift`: `reloadPreservingCaret` now calls `loadActiveDocumentIntoTextView()` + `refreshUI()` directly for the active tab instead of routing through `switchTo`'s same-index short-circuit, which previously left the view showing stale text after an external file change.
- New test `EditorExternalChangeTests.testActiveTabRepaintsOnExternalWriteAndDoesNotClobberReload` asserts on `currentText(of:)` (the view), not `currentText(at:)` (the model) — failed on old code at lines 101/108, passes on the fix.
- The fix exposed a pre-existing drop-window: the file watcher re-armed via `asyncAfter(50ms)`, so `testWatcherSurvivesAtomicReplaceChains` timed out. David chose synchronous re-arm in `startWatching` (before `handleExternalChange` runs) over the async-delay alternative.

### Phase 2 — #273: verify the wedge is fixed, close the issue
- No code change. Verification found commit `3b2d8fd7` (2026-08-17) already fixed this via `applySeizedExchange`'s player-scene-only guard (`packages/character/src/tick-phases.ts:1178`).
- Re-ran the two real-path regression suites that back the fix: `@sharpee/character` `scene-sub-step` (18 passing) and `@sharpee/story-loader` `adr-320-phase8` (5 passing), confirmed again at 16:19 CDT while writing this summary (`pnpm --filter '@sharpee/character' test scene-sub-step` and `pnpm --filter '@sharpee/story-loader' test adr-320-phase8`, both green, post-dating all session edits).
- Closed #273 citing the commit and both test files.

### Phase 3 — #290: fix the frame/container guard mismatch (gutter-overlap bug)
- Confirmed the mechanism with a deterministic harness (real `NSWindow`, real ruler, real layout pass) rather than the debugger: pre-layout `clipWidth` counts the ruler, post-layout excludes it, `wrapWidth` is identical both times, so the container-only guard in `syncWrapWidth` never fires and the frame stays 46pt too wide (harness measured 669 vs 623).
- Fix: `syncWrapWidth` (`EditorViewController.swift:918-925`) now guards on frame width as well as container width.
- New `tools/ide/SharpeeIDETests/EditorWrapWidthTests.swift`, registered in `tools/ide/SharpeeIDE.xcodeproj/project.pbxproj` (4 entries mirroring `EditorExternalChangeTests`). Harness gotcha recorded: assigning `contentViewController` with a zero-frame autolayout view shrinks the window to zero — set `editor.view.frame` before assigning.
- Full IDE suite verified green: **563 passing, 0 failures** (evidence: `xcrun xcresulttool get test-results summary --path tools/ide/DerivedData/Logs/Test/Test-SharpeeIDE-2026.08.22_16-09-15--0500.xcresult` → `"passedTests": 563, "failedTests": 0, "result": "Passed"`, finishTime 2026-08-22 16:10 CDT — post-dates the Phase 1 and Phase 3 edits).

### Phase 4 — #192: verify obsoleted by design, close the issue
- Grep across `tools/ide/SharpeeIDE`, `packages/branch-tester/src`, `packages/devkit/src` found no `RecordingSession`/`isRecording`/`startRecording` — the Skein-based Test tab was deleted wholesale in commit `9aa24113`.
- Closed #192 as not-planned, citing that commit and ADR-307 D3 ("the Testing tab is always recording") as the design fact that forecloses the defect class by construction.

### Phase 5 — closeout
- All four issues closed on GitHub with evidence comments (commit hashes, test files, or ADR citations per phase).
- Appended "Addendum — Tier 1 execution" to `docs/work/issue-triage/triage-20260822.md`, recording that #273 and #192 were found already resolved at HEAD during planning verification, alongside the existing staleness-pass entries.
- Open issue count: 75 (`gh issue list --limit 200` — the default 30-item cap under-reports this).

## Key Decisions

### 1. Watcher re-arm made synchronous, not delayed
Phase 1's fix exposed a latent 50ms drop-window in the file watcher's re-arm. David chose to re-arm `startWatching` synchronously before `handleExternalChange` runs, closing the window at its source rather than padding the delay.

### 2. Frame-width guard added rather than reworking the ruler measurement
Phase 3's fix extends `syncWrapWidth`'s existing guard to also check frame width, rather than changing how `rulerAlreadyExcluded` is measured — smaller surface, confirmed correct by a harness that reproduces the actual pre/post-layout ordering.

### 3. Two of four Tier 1 issues closed on verification, not new code
#273 and #192 were confirmed already resolved at HEAD during planning (a same-day fix never closed out, and a design change that superseded the mechanism entirely). Closed with citations rather than re-implementing or re-testing beyond confirming the existing real-path coverage still passes.

### 4. Rule 18b disposition for the interrupted secret-letter-port plan: "still live"
Asked per rule 18b before repointing `.current-plan` back; David chose the "still live" option. `docs/work/secret-letter-port/plan.md`'s header now carries an `**Interrupted by**: docs/work/archive/tier-1-fixes/plan.md` stamp; Phases 4 and 6 (both CURRENT) are untouched.

## Next Phase
- The tier-1-fixes plan is DONE — all 5 phases complete, archived to `docs/work/archive/tier-1-fixes/plan.md` via `plan-archive.sh` (pointer released back to the prior plan).
- `.current-plan` now points to `docs/work/secret-letter-port/plan.md` again. Its Phase 4 ("Produce the change document through guided conversation", CURRENT since 2026-08-21) and Phase 6 ("Chapter 1 vertical slice", CURRENT since 2026-08-22) remain exactly where the prior secret-letter session left them — this session did not touch either.

## Open Items

### Short Term
- secret-letter-port Phase 6's five `## DAVID:` placeholders are still outstanding (untouched this session).
- #290's fix is confirmed by a harness reproduction, not a live-app reopen of the original intermittent report — if the gutter overlap recurs, a second pre-layout path may exist that the harness didn't cover.

### Long Term
- The addendum to `triage-20260822.md` records a same-day meta-pattern worth naming for the record: issues filed from a session's own reading, later fixed by that same session's subsequent commits and never closed out — 6 staleness-pass entries plus these 2 Tier-1 closures in one day. Not actioned this session; noted per the observation in the addendum itself.

## Files Modified

**IDE editor + tests** (4 files):
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` - `reloadPreservingCaret` active-tab repaint fix; `syncWrapWidth` frame-width guard; synchronous watcher re-arm
- `tools/ide/SharpeeIDETests/EditorExternalChangeTests.swift` - new view-asserting external-reload test
- `tools/ide/SharpeeIDETests/EditorWrapWidthTests.swift` (new) - deterministic harness test for the frame/container guard mismatch
- `tools/ide/SharpeeIDE.xcodeproj/project.pbxproj` (gitignored, local-only) - registers `EditorWrapWidthTests.swift`, 4 entries

**Planning + tracking** (4 files):
- `docs/work/archive/tier-1-fixes/plan.md` (new, archived) - Tier 1 fixes plan, all 5 phases DONE
- `docs/work/secret-letter-port/plan.md` - header stamped with `**Interrupted by**` line per rule 18b "still live" disposition
- `docs/work/issue-triage/triage-20260822.md` - "Addendum — Tier 1 execution" appended
- `docs/context/.current-plan` - repointed to tier-1-fixes at session start, released back to secret-letter-port at archive time

## Notes

**Session duration**: ~40 minutes (15:37–16:20 CDT).

**Approach**: session-planner wrote a fresh 5-phase plan against the triage doc's four Tier 1 items; planning verification itself found two already resolved at HEAD, so only two phases needed new code (#295, #290), both confirmed with new XCTests that fail on old code and pass on the fix.

---

## Session Metadata

- **Status**: COMPLETE (unverified: the Phase 1 interim IDE-suite count of "562 passing, 0 failures" reported at 15:53 CDT — no corresponding `.xcresult` bundle survived; superseded by the corroborated 563-passing, 0-failure run at 16:09 CDT that includes both fixes)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — no commit made this session; all changes are in the working tree.

## Dependency/Prerequisite Check

- **Prerequisites met**: issue-triage doc (`docs/work/issue-triage/triage-20260822.md`) existed with the four Tier 1 items; ADR-307, ADR-290, ADR-320 available to confirm #192 and #273's dispositions.
- **Prerequisites discovered**: none blocking — planning verification surfaced that 2 of 4 items needed no new code, which reshaped phase scope but did not block execution.

## Architectural Decisions

- None this session — no ADR written or amended. ADR-307 D3, ADR-290 D1–D4 (superseded-in-part), and ADR-320 Phase 10.3 were cited as evidence for closing #192 and #273, not modified.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` (`reloadPreservingCaret`, `startWatching`, `syncWrapWidth`).
- Tests verify actual state mutations (not just events): YES (evidence: `EditorExternalChangeTests.testActiveTabRepaintsOnExternalWriteAndDoesNotClobberReload` asserts on `currentText(of:)`, the live view content, not the model; `EditorWrapWidthTests` asserts on `textView.frame.width` post-layout; full-suite run — 563 passing, 0 failures — confirmed via `xcresulttool` summary of `Test-SharpeeIDE-2026.08.22_16-09-15--0500.xcresult`, 2026-08-22 16:10 CDT, post-dating all edits).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — `docs/work/issue-triage/triage-20260822.md`'s Staleness pass and this session's Addendum together document a recurring same-day pattern: issues filed from a session's own reading, later resolved by that same session's subsequent commits, never closed out (6 staleness-pass entries + 2 Tier-1 closures — #273, #192 — in one day).
- If YES: worth a one-time audit of the triage-to-close workflow (does the triage pass check HEAD before filing, or only historical evidence?) — not actioned this session.

## Test Coverage Delta

- Tests added: 2 (1 XCTest in `EditorExternalChangeTests.swift`, 1 new file `EditorWrapWidthTests.swift`, 4-entry registration).
- Tests passing before: not captured (no pre-session full-suite baseline run) → after: 563 passing, 0 failures (evidence: `xcresulttool` summary, `Test-SharpeeIDE-2026.08.22_16-09-15--0500.xcresult`, finishTime 2026-08-22 16:10 CDT). `@sharpee/character` `scene-sub-step`: 18 passing; `@sharpee/story-loader` `adr-320-phase8`: 5 passing (evidence: both re-run 2026-08-22 16:19 CDT, post-dating all session edits — no code change in either package this session).
- Known untested areas: #290's fix has no live-app reopen of the original intermittent report, only harness reproduction (see Open Items).

---

**Progressive update**: Session completed 2026-08-22 16:20 CDT
