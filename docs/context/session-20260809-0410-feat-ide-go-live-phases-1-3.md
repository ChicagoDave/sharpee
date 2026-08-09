# Session Summary: 2026-08-09 - feat/ide-go-live-phases-1-3 (CDT, session d54d7e)

## Goals
- Execute Phase 3 of the testing-surface revamp plan ("Cards, rail, and segments — the three-column skeleton") on David's "phase 3" go.
- Capture David's new response-coverage test idea without derailing the phase.

## Phase Context
- **Plan**: `docs/work/testing/plan-20260809-testing-surface-revamp.md`
- **Phase executed**: Phase 3 (Large, ~400 tool-call budget). David went to bed mid-phase ("go as far as you can without me, commit before you run out of syntax") — the phase ran autonomously from the survey onward.
- **Phase outcome**: DONE. Full deliverable landed with tests; two loose threads recorded in the plan for Phases 4/5.

## Completed

### Phase 3 — the testing play surface skeleton (all tests green)
- **Web bundle** `tools/ide/web/testing-surface/` (TS, esbuild → committed `SharpeeIDE/Resources/testing-surface/`, mirroring the testing-tab pattern; no package.json, root-hoisted deps):
  - `model.ts` — pure `SessionModel`: tick-to-start/tick-to-end segments with overlap refusal, untick semantics, collapse (closed ranges only), merge-up (gap turns become `[SKIP]`; merging an open segment keeps the range open), split-here (round-trips with merge), auto-names (`<start>-to-<end>-<turns>`, same-room collapse, `-2` collision suffix), D8 snapshot/restore with degraded-tolerant validation. 30 vitest tests.
  - `cards.ts` — three-column layout takeover of the testing page; cards built by MOVING the client's own `data-turn`-stamped elements (prose fidelity kept, engine.css applies); opening as ordinal 0 from pre-turn-1 unstamped elements; checkbox rail with contextual tooltips; title strips, summary cards, split/merge/collapse controls; run-column skeleton (rows with — badges, Run disabled until Phase 6).
  - `source.ts` — structural source panel: title/`seed: 42`/`continues:` headers, commands, `[SKIP]` markers; deliberately NO claim synthesis (ADR-306 D2 — the synthesis module is the one code path). Room names extract via branch-tester's `proseTextLinesOf` imported from source (esbuild alias + tsconfig paths + vitest alias kept in step, testing-tab style).
  - `main.ts` — deliver/queue-drain wiring, gesture routing, state posting, and the D8 restore driver (types logged commands into the client's real input, one per delivered turn, then re-applies the snapshot).
- **Swift** (`tools/ide/SharpeeIDE/TestingSurface/` + wiring):
  - `TestingSurfaceViewController` — loads `index-testing.html` over the Play scheme handler; non-persistent web store (testing sessions never touch Play's origin storage); document-start boot script (seed 42, AudioContext removal — see Discovery, deliver shim, `__SHARPEE_TESTING_SESSION__` restore payload); documentEnd asset injector; `turnEvents` → sidecar append + forward into page; `testingSurface` → sidecar view-state.
  - `TestingSessionStore` — D8 sidecar in Application Support (`testing-sessions/<storyId>-<hash8-of-projectRoot>.json`), version-gated load (mismatch/corrupt → discard silently), atomic writes, `replayPlan()` (post-fence tail, boot looks excluded).
  - `TestingSurfaceWindowController` + Test menu "Testing Play Surface" (⌥⌘U) → `MainWindowController.openTestingSurface()`; project switch closes the window (per-story sidecar). `PlayURLSchemeHandler` gained the reserved `ide-testing-surface/` prefix served from IDE Resources (story files can't shadow it).
  - Build wiring: `build-testing-surface.sh` + project.yml (folder reference + pre-build script); `xcodegen generate` rerun.
- **Tests**: vitest 30 passing (model); XCTest 543 passing, 0 failures — including 6 `TestingSessionStoreTests` (assert on the file on disk) and 9 `TestingSurfaceRealPathTests`. The 9th, `testRealFernhillBundlePlaysIntoCardsOnTheRealEngine`, loads the REAL devkit-built fernhill `index-testing.html`, boots the real engine at seed 42, types `north` through the real input, and asserts the card's prose and the route-derived name `iron-gates-to-gravel-drive-1` from real captures — the plan's "first real in-WKWebView load" opening act, closed with no stand-ins (rule 13a).

### Discovery — AudioContext would hang production replay
The client's `executeCommand` awaits `AudioManager.unlock()` → `AudioContext.resume()`, which WebKit resolves only after a REAL user gesture. The surface's replay driver types via synthetic events (not gestures), so every replayed command would hang forever — in the shipping feature, not just tests. Fix (IDE-scoped, no platform change): the testing page's boot script removes `window.AudioContext`/`webkitAudioContext`, dropping the client into its designed instant-gain fallback. Audio is moot in a testing session and replay stays deterministic.

### Design doc §14 — response-coverage checks (David, mid-session)
Captured David's second-kind-of-test idea in `design-testing-play-surface.md` §14: which NPCs lack TALK TO responses; which objects/nouns lack EXAMINE responses. Split recorded: NPC-talk and declared-entity-examine coverage are mechanical (world-model enumeration, ADR-294 D13 discipline, surfaces in the Testing tab per D4); undeclared-nouns-in-prose needs POS tagging — candidates spaCy/Stanza (Python), and David's preferred **NLTagger** (Apple NaturalLanguage, built-in, moves the check IDE-side). Captured, not yet ruled — needs a platform discussion before it becomes scope. Also repaired a pre-existing §12/§13 paragraph misplacement while in the file.

## Key Decisions
1. **Surface ships as an IDE-owned web bundle injected into the platform's testing page** — not a devkit template change, not IDE-drawn native UI. Keeps Phase 3 entirely inside `tools/ide` (no `packages/` discussion needed) and keeps prose rendering the client's own.
2. **Hosting: its own window** (Test → Testing Play Surface), isolated non-persistent web store. ADR-304's workspace machinery untouched until Phase 6; hosting can be revisited then if David prefers a pane.
3. **Cards drain the client's DOM; metadata rides the forwarded feed record** — prose fidelity from the real elements, room/events/world from the record (Phase 4's pickers get the same channel).
4. **Sidecar is opaque view-state on the Swift side** — the page defines the snapshot shape; Swift stores and returns it verbatim (no double-modeling to drift).

## Next Phase
- **Phase 4**: Assertion authoring + auto-save writer (gesture table, source panel as editor, D6 state picker, D9 editor auto-reload/conflict-guard, the toolchain write path). Touches `packages/branch-tester` — discuss with David first.
- **David's click-through** of the Phase 3 surface in-app is the natural next acceptance step (menu item is live after an app build).

## Open Items
### Short Term
- Surface window doesn't auto-reload on ⌘B — reopen picks up the new build; wire reload-after-build with Phase 4's writer.
- Replaying a logged `save`/`restore` that opens a client dialog would stall the replay driver — resolve inside Phase 5's replay work (D7).
- `sharpee test --tree` drops the root `channels:` field — GitHub issue STILL not filed (carried).
### Long Term
- §13 author-annotated coverage and §14 response-coverage checks — both need platform discussions before entering a plan.

## Files Modified
**Web bundle (new)**: `tools/ide/web/testing-surface/{build.mjs,tsconfig.json,vitest.config.ts,src/{model,cards,source,main}.ts,src/surface.css,tests/model.test.ts}`; committed output `tools/ide/SharpeeIDE/Resources/testing-surface/{surface.js,surface.css}`
**Swift (new)**: `tools/ide/SharpeeIDE/TestingSurface/{TestingSurfaceViewController,TestingSurfaceWindowController,TestingSessionStore,TestingSurfaceWebRoot}.swift`; tests `TestingSessionStoreTests.swift`, `TestingSurfaceRealPathTests.swift`
**Swift (modified)**: `Play/PlayURLSchemeHandler.swift` (ide-testing-surface prefix), `MainWindow.swift` (open/close wiring), `AppDelegate.swift` (menu action), `Menus/MenuBuilder.swift` (Test menu item)
**Build**: `tools/ide/project.yml`, `tools/ide/build-testing-surface.sh` (new)
**Docs**: `docs/work/testing/plan-20260809-testing-surface-revamp.md` (Phase 3 DONE + evidence), `docs/work/testing/design-testing-play-surface.md` (§14 new, §12 repair), `docs/context/project-profile.md` (7-day refresh by dev-context-detector)

## Notes
**Session flow**: recap + audits → Phase 3 survey (design/ADR/mock/IDE code) → model+tests first, then DOM layer, then Swift substrate, then real-path tests → real-engine closure via a fresh fernhill devkit build. David added the §14 idea and the NLTagger refinement mid-session, then went to bed; the rest ran autonomously.

---

## Session Metadata
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — Phase 4 is the next unit, pending David's green light (touches `packages/`)
- **Rollback Safety**: safe to revert — all changes uncommitted working-tree edits on `feat/ide-go-live-phases-1-3` at HEAD `a720d702` until this session's commit

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 2's `index-testing.html` template + extended feed (events/world/lineage) existed and are consumed as-is; ADR-306 D8 ruled the sidecar scope.
- **Prerequisites discovered**: fernhill's `dist/web` bundle predated Phase 2 (no testing page) — rebuilt with devkit in-session to enable the real-engine test (dist is gitignored; the test skips when absent).

## Architectural Decisions
- No new ADRs; built against ADR-306 D2 (synthesis imported from source — `proseTextLinesOf`), D8 (sidecar + restore-by-replay + degraded mode), ADR-305 D1 (seed 42), the 6f `data-turn` anchor contract, and ADR-301 A1's from-source bundling precedent.
- D8's "storage location and format" implementation detail settled: Application Support, per story+project hash, version-gated opaque JSON.

## Mutation Audit
- Files with state-changing logic: `model.ts` (segment/skip state), `TestingSessionStore.swift` (sidecar file), `TestingSurfaceViewController.swift` (ingest/forward), `cards.ts`/`main.ts` (DOM/model wiring).
- Tests verify actual state mutations: YES — model tests assert post-mutation model state (including refusal no-ops); sidecar tests parse the JSON file on disk; real-path tests assert DOM state and sidecar contents after live bridge traffic. mutation-verification ran: clean, 1 warning (Merge ↑/Split here buttons had no real-path click test) — closed same session with `testSplitHereAndMergeUpRoundTripThroughTheirButtons` (asserts strip visibility both sides of the round trip AND the sidecar's merged view state on disk).

## Recurrence Check
- The "click-through reveals a scope gap after a phase is believed built" pattern (sessions -1355/-1742/-1841/-2017, 2b82b5): this session's counter-measure was the real-engine test — the page's first real WKWebView load happened in-suite, not deferred to David's click-through. The click-through remains the acceptance ritual, but the class of gap it kept catching (page doesn't load/render at all) is now pinned by `testRealFernhillBundlePlaysIntoCardsOnTheRealEngine`.
- tsf dist-esm staleness trap: did NOT recur (surface bundles from source precisely to avoid it).

## Test Coverage Delta
- Tests added: 30 vitest (new testing-surface model suite) + 16 XCTest (6 sidecar + 10 real-path).
- IDE suite before: ~527 → after: **544 passing, 0 failures** (543 full-suite TEST SUCCEEDED 2026-08-09, then +1 merge/split test, real-path suite re-run 10/10 passed). vitest testing-surface: 30 passing.
- Known untested areas: surface behavior across a ⌘B rebuild while the window is open; dialog-opening meta commands under replay (deferred to Phase 5).

---

**Progressive update**: Session completed 2026-08-09 (CDT)
