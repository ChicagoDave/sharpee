# Session Summary: 2026-08-08 night - feat/ide-go-live-phases-1-3 (CDT, session bd3d6b)

**Status: COMPLETE (6d pending David's re-exercise)** — began as Phase 6c
evidence closure (committed `79cbe35b`), then on David's "Proceed" built
Phase 6d (testing workspace, ADR-304 D1–D4) with 4 real-path tests; David
exercised it live mid-session and both his findings were fixed the same
evening; full suite 496 passing. Blocker Category: N/A.

## Goals
- Recover the ShippedThemesRealPathTests re-run whose background task
  (ba8rbofbo) was killed by the `/clear` that started this session, then
  finish Phase 6c bookkeeping (plan + session records).
- Then (David: "Proceed") Phase 6d — the ADR-304 testing workspace.

## Completed
- **ShippedThemesRealPathTests re-run**: 3 passing, 0 failures,
  `** TEST SUCCEEDED **`, 0.8s test time (2026-08-08 18:41 CDT,
  `xcodebuild test -only-testing:SharpeeIDETests/ShippedThemesRealPathTests`,
  log: scratchpad `shipped-themes-rerun.log`).
- **Full-suite caveat closed**: prior session's 491-run predated the last
  editor-path test. Fresh full run: 492 passing, 0 failures, 116.4s,
  `** TEST SUCCEEDED **` (2026-08-08 18:43 CDT). Plan's Phase 6c evidence
  paragraph updated accordingly.
- Pre-session audit: all clear — tsc clean, tree clean at `765e1537`
  (only the deliberately-untracked `scripts/clodpod.sh`), no recurring
  patterns.

## Completed — Phase 6d (testing workspace, ADR-304)
- **Layout**: any route to the Testing tab enters the workspace; Play
  reparents to the left pane under an accent Exit Testing bar (the one exit,
  D2); Testing goes full-bleed right (strip hidden via constraint swap);
  editor hides in place (never removed — D4 for free); modal state
  suppresses all other tab switches + the build's play-tab-forward.
- **Files**: `MainWindow.swift` (LeftPaneHostViewController +
  TestingWorkspaceExitBar, enter/exit orchestration, facades),
  `Play/RightPanelViewController.swift` (lend/reclaim, entrance hook,
  strip-side constraint re-anchor), tests
  `TestingWorkspaceRealPathTests.swift` (new, 4), `tools/ide/.gitignore`
  (compose-scratch backstop), xcodegen regenerated.
- **Evidence**: TestingWorkspaceRealPathTests 4 passing (D1/D2 layout +
  single exit; D3 WKWebView JS-marker survives reparent, same instance; D4
  document/cursor/scroll byte-identical; build-finishing-while-modal loads
  Play left without breaking modality — real in-checkout compose). Full
  suite 496 passing, 0 failures, 119.3s (2026-08-08 20:05 CDT).
  Mutation-verification: GREEN, 1 warning (reloadPlayAfterBuild suppression
  branch unreached) → closed with the 4th test.
- **Fallout fixed en route**: pre-existing `LineNumberRulerView` infinite
  draw loop on no-trailing-newline files (found when the D4 test hung the
  suite — sampled to the exact frame, one loop guard, reported first,
  David: "have at it"); Cards/Source face switcher stranded at the window
  edge in the workspace's full-width pane (David's live finding — moved
  into the title cluster; testing-tab web suite 87 passing, bundle
  re-vendored into Resources).
- Process: the 4th test first failed on a /tmp scratch (compose can't
  resolve the toolchain outside the checkout) — reported first, David:
  "go ahead"; fixed by placing the scratch in-checkout
  (`test-fixtures/.compose-scratch-<uuid>`, gitignored, self-removing).

## Key Decisions
- Testing workspace entrance includes the Test menu's run entry (any route
  to the tab IS the entrance, ADR-304 D1) — starting a run now enters the
  workspace.
- While modal, build/tab switches are suppressed rather than partially
  applied; exit restores the last inline tab.
- David's "no selector margin" observation is 6f scope (turn selection),
  not a 6d defect — 6f still hard-depends on 6e's design step.

## Next Phase / Open Items
- David's re-exercise of 6d on a rebuilt app (picks up workspace + ruler
  fix + toggle fix) — plus the outstanding 6a/6b/6c click-throughs.
- 6e needs a design step with David; 6f hard-depends on 6e. F5 copy batch
  still unslotted.
- Uncommitted: all Phase 6d work (Swift, web testing-tab, gitignore, plan,
  this file).

## Files Modified
- `docs/work/ide-go-live/plan-20260806-go-live.md` (6c evidence closed —
  committed `79cbe35b`; 6d marked CURRENT with as-built + evidence).
- Phase 6d files listed above; `Editor/LineNumberRulerView.swift` (loop
  guard); `web/testing-tab/src/views.ts` + `tab.css` + rebuilt
  `SharpeeIDE/Resources/testing-tab`.
