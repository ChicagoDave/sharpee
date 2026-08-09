# Session Summary: 2026-08-08 late evening - feat/ide-go-live-phases-1-3 (CDT, session c30771)

**Status: COMPLETE (6e pending David's click-through)** — Phase 6e
(auto-assertion policy, P-6/#253) designed with David and fully built the
same session, both halves, all suites green. Blocker Category: N/A.

## Goals
- David: "Proceed" → 6e design step (the plan gated on it), then his
  second "proceed" approved the design → build.

## Key Decisions (design settled with David)
- Setting home: **per-story `.story` header field** `auto-assertion:
  all-emitted-text | room-description | room-name-and-description`; absent
  = "let me decide". Per-user ruled out by CLI parity + committed-suite
  consistency. Editor-owned (6c ownership pattern); a chord schema change,
  approved in the design conversation.
- **Bare command = awaiting policy; [SKIP] = deliberate, never trampled**
  (no new grammar, D4-safe). Runner auto-writes on first run, one code
  path for CLI and editor (--bless-spirit file mutation).
- Middle policies write contains-form; fragments come from the turn's
  STRUCTURED room-channel captures (refinement over the world-capture
  sketch — snapshot has no description; flattened capture is JSON).
- Settings UI: Test → Auto-Assertion submenu, mirroring Build → Shipped
  Themes exactly.

## Completed
- Platform: chord parser/ast/ir/analyzer (+5 header tests, 744 passing);
  engine StoryConfig; story-loader projection (480); bootstrap
  LoadedGame.autoAssertionPolicy + room-channel capture union (40); BOTH
  runners (branch-tester 420, transcript-tester 287) tier-boundary hook +
  synthesis + file write-back + 10-test suites each; devkit 4-test
  real-path suite (real compile→run writes real assertions to disk,
  re-run passes; flat + --tree; no-policy failure byte-identical).
  Rebuilt all dist + dist-esm (tsf, both targets). Probe evidence: bare
  `> look` → `[OK: contains "Den"]` + `[OK: contains "A small square
  den."]` on disk, PASS on re-run (21:14 CDT).
- IDE: StoryHeaderAutoAssertion seam (new); RootViewController/
  MainWindowController/AppDelegate/MenuBuilder Test → Auto-Assertion;
  TestController reports policy to the tab (attach + run start, disk
  truth); tab: host `autoAssertion` message, bare add-command under
  policy, policy-aware [NEW] guidance; bundle rebuilt + re-vendored.
  SharpeeIDETests **509 passing, 0 failures** (21:26 CDT; +11 seam, +2
  menu/buffer real-path); tab vitest 88 passing.
- Mutation-verification (platform half): clean, all four mutation points
  GREEN; advisory — policy union type inline at 5 sites (rule-8b
  extraction only if the value set grows).
- Mutation-verification (IDE half): 1 warning — the TestController →
  webview → surface hop unasserted on both sides — CLOSED same evening:
  body-dataset reflection of the stored policy, host.test.ts bridge pin
  (tab vitest 90), and testAttachReportsTheOnDiskPolicyIntoTheLivePage
  (real MainWindowController + TestController + live webview readback).
  Full suite after closure: **510 passing, 0 failures** (21:33 CDT).
  Residual acknowledged: menu checkmark state + [NEW]-guidance branch
  unpinned (cosmetic reflections of pinned state).
- tsc --noEmit clean repo-wide + tab project.

## Next Phase / Open Items
- David's in-app click-through of 6e (menu → header line → run →
  assertions appear), plus the outstanding 6a/6b/6c/6d exercises.
- Known interaction for David to rule on: a transcript open in the
  EDITOR pane during a policy-writing run doesn't auto-refresh (no file
  watching; same class as any external edit).
- 6f (Create Transcript from played commands) is now unblocked — its
  hard dependency was 6e.
- Pre-existing gap noticed (not fixed, not 6e scope): author tree runs
  drop the root's declared `channels:` (test-tree's loadAuthorGame call
  ignores spec.channels), so channel assertions may not capture through
  `sharpee test --tree`. Worth a GitHub issue.
- Uncommitted: all Phase 6e work (TS packages, Swift, web tab, plan,
  this file).

## Files Modified
- packages/chord/src/{parser,ast,ir,analyzer}.ts + tests/story-block-fields.test.ts
- packages/engine/src/story.ts; packages/story-loader/src/loader.ts;
  packages/bootstrap/src/index.ts
- packages/{branch-tester,transcript-tester}/src/{runner,types}.ts +
  tests/auto-assertion.test.ts (both)
- packages/devkit/src/commands/auto-assertion.test.ts (new)
- tools/ide/SharpeeIDE/Workspace/StoryHeaderAutoAssertion.swift (new),
  MainWindow.swift, AppDelegate.swift, Menus/MenuBuilder.swift,
  Test/{TestController,TestingTabViewController}.swift
- tools/ide/SharpeeIDETests/{StoryHeaderAutoAssertionTests,AutoAssertionMenuTests}.swift (new)
- tools/ide/web/testing-tab/src/{grammar,host,main,views}.ts +
  tests/grammar.test.ts; Resources/testing-tab re-vendored
- docs/work/ide-go-live/plan-20260806-go-live.md (6e design + as-built +
  evidence)
