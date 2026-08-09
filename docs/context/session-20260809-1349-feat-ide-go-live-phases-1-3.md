# Session Summary: 2026-08-09 - feat/ide-go-live-phases-1-3 (CDT, session 383dfc)

## Goals
- Execute Phase 5 of the testing-surface revamp plan ("Branching — replay driver + lineage stickiness") on David's "phase 5" go.
- Fold in the two carried open items: the save/restore-dialog stall under replay (D7) and the surface window not reloading on ⌘B.

## Phase Context
- **Plan**: `docs/work/testing/plan-20260809-testing-surface-revamp.md`
- **Session start**: cleaned up the plan's Phase 4 status contradiction the pre-session audit flagged (header said CURRENT, a stale draft line said DONE) — Phase 4 confirmed DONE with its evidence.
- **Phase executed**: Phase 5 (Large). Four increments: model → re-hydration → DOM/driver → Swift substrate + tests.
- **Phase outcome**: DONE. Exit state met on the real engine.

## Direction calls (flagged to David up front, built on)
1. **`confirm()` stubbed true in the testing page's boot script** — WKWebView with no UI delegate answers every confirm() false, so typed `restart` silently did nothing in the surface before this; the branch driver needs it, and author restarts start working (AudioContext-removal precedent).
2. **Selecting a chip makes that sibling live by replay** — the viewed lineage is always the played lineage; typing after a switch is never ambiguous. Cards are retained ("nothing deleted by viewing"); switch-replay turns are all suppressed.
3. **Dialog outcomes recorded + auto-driven under replay (D7 fold-in)** — save/restore slot names record as the author plays (the dialogs are in the same DOM); replayed dialogs re-apply them; an outcome-less dialog cancels. Either way the turn completes: no stall, ever.
4. **Reopen re-hydrates claims from the `tests/` files** — fixing a latent Phase 4 clobber: on restore the model's claims were empty, so the first `syncWrites` rewrote every restored segment's file with policy-defaults-only text. Files are the truth; the sidecar carries only stems (pointers).

## Completed

### Model (`model.ts`, 57 vitest)
- Logical **lineages**: `fork(n, command)` validates (closed segment, something shared before), auto-splits the shared prefix into a collapsed parent, registers the branch (pending until its replayed turn lands), makes it active. Same-point normalization: forking a branch at its own first turn joins the ORIGINAL point as a sibling (mock never faced this — its alts couldn't fork).
- **Invariant: a segment never spans lineages** (cross-lineage ticks/merges refuse). All prev-turn/count/window math moved from ordinal arithmetic to path positions — lineage ordinals GAP after fork/switch replays consume ordinals the model never sees.
- Visibility = the active lineage's ancestry path, cut at each fork the path branches away from (design §6 stickiness). `branchPoints()` groups siblings by (parent, forkAt).
- **Snapshot v2 is position-keyed** — ordinals don't survive restore-by-replay; `restore(snap, ordinalAt)` takes the driver's position→ordinal mapping; degraded-tolerant per entry.

### Re-hydration (`compose.ts`, 18 compose vitest)
- `rehydrateSegmentClaims` — compose's inverse: parses a restored segment's file through the imported parser, maps commands 1:1 onto the composed walk, lifts assertions back as claims. Turns matching their re-synthesized defaults stay default. Hand-edits WITHIN the claim grammar are adopted (files are truth); content compose can't reproduce (edited exact blocks) returns 'diverged' → the segment DETACHES from auto-writing until the author's next gesture on it. Round-trips byte-for-byte (tested through the real parser).
- Compose iterates `turnsForCompose` (path walk) instead of ordinal windows; branch transcripts `continues:` their auto-split prefix across lineages, own turns only.

### DOM + driver (`cards.ts`, `main.ts`)
- **Branch… gesture** (inline prompt), **chip rows** (main first, then siblings, "all continue from" the prefix; selected = the active path's sibling), **lineage-cut rendering** (cards/summaries/chip rows hide past the cut; chip rows on the descent path stay).
- **One fresh-boot primitive** (`driveFreshBoot`) under fork, switch, and restore: storage-clean typed `restart` through the client's real input, driver-flagged fence (never `model.fence()`), ack dropped, boot look + prefix replay suppressed (cards exist), then live steps typed visibly. 15s per-turn timeout → degraded, never an error. `driverBusy` holds sidecar posts/writes and the input across nested drives.
- **Restore** replays the whole fork tree: root, branches in id order, the active lineage last (so view = live); structure re-applies via the position map; written segments re-hydrate from shipped file text and seed the writer with the file's exact bytes (no rewrite).
- **Focus guard** — fixed a latent Phase 4 bug: the client's document-level click handler refocuses its command input on every click, which yanked focus from ALL surface inline inputs in the real page (prompts even self-removed via their blur handlers before a keystroke could land — Phase 4 only fixture-tested these). Capture listener + post-dispatch refocus; prompts retire on outside click/Escape/commit, never blur.

### Swift
- `TestingSessionStore` **v2**: fork-flagged fences (`{fence, fork}`); `replayPlan()` withholds the linear replay when the live tail crosses a fork fence (the flat log interleaves replayed prefixes — linear replay would be garbage; the page's composite drives, or files-only degraded). v1 files discarded (degraded by rule).
- `TestingSurfaceViewController`: `confirm()` stub in the boot script; `tests/*.transcript` contents ride the boot payload by stem; the page pre-announces driver boots (`{forkBoot:true}`) so the next fence logs as fork.
- `MainWindow.reloadPlayAfterBuild` also reloads an open testing-surface window (⌘B folded item) — fresh page against the new build, restored by replay.

### Tests
- vitest **75 passing** (57 model + 18 compose).
- IDE suite **540 passing, 0 failures** — +6 real-path (fixture fork/replay/alternate-landing, chip switch + typing continues the switched lineage, fork-tree reopen with authored claims surviving BYTE-FOR-BYTE, save-dialog record/auto-drive, hand-edited-file detach/re-attach, real fernhill-engine branch) + 3 sidecar (fork fence withholds linear replay, author fence after forks truncates, v1 discard). Fixture grew client-parity restart (ack→fence→boot), an east route, and a real `<dialog>` save flow.
- **Exit state met on the real engine**: `testRealFernhillBranchReplaysOnTheRealEngine` forks real fernhill at turn 4 (`east` → Boiler Shed), replays the prefix through the real client, lands the alternate as an ordinary feed turn, and switches lineages both ways.

## Key Decisions
- The four direction calls above (built, flagged for David's review).
- Sidecar composite: `{state: {model, stems, dialogs}}` posted opaquely; Swift never re-models it (D8 discipline held). Stems are pointers, never content — no second copy of test truth.

## Finalize gate — five pre-existing failures peeled and fixed (David: "fix it and finish the finalize")
The commit gate (`turbo test:ci`) surfaced a stack of pre-existing breakage, each layer un-caching the next. All five fixed on David's direct instruction in-session; final run **60/60 tasks green**. None were caused by this session's work. (The commit agent, unable to verify that instruction from its sandbox, committed the Phase 5 scope alone and left these for a follow-up commit — which carries them.)
1. **helpers boundary fixture (ADR-298 miss)**: `StoryConfig.authors` became a required array in the authors cutover (c92abe92); the fixture still had singular `author:`. One line; helpers 13 passing through the real CLI bundle.
2. **family-zoo-tutorial `test:ci` (ADR-259 split leftover)**: the split moved its `tests/` to the Chord `stories/friendly-zoo`, leaving a vitest include matching zero files — a hard error. Fix: `--passWithNoTests`.
3. **`packages/runtime` didn't compile** (two sweep misses, masked by turbo cache): the ISSUE-063 as-any elimination's typed reset flow-narrowed the loaded story to `never` (fixed cast-free via a method boundary), and ADR-298 `author` → `authors` (wire sends the joined byline; the protocol already typed the union).
4. **zifmia**: better-sqlite3 never compiled for node v25 (`pnpm rebuild`), `dist/stories/dungeo.sharpee` missing (hand-rebuilt from the retired build.sh recipe; gitignored), and the bundle-loader missing the ADR-248 factory cutover — now resolves `createStory` and caches the FACTORY (fresh Story per room boot, closing the cross-room instance-sharing). 148 passing. *Zifmia is not in active development and may never happen (David) — these were gate-unblocking repairs, not investment.*
5. **`@sharpee/shite`** (ADR-180-abandoned, reference-only) still gated commits — its `test:ci` script removed.

### Findings recorded, deliberately NOT acted on (zifmia is parked)
- ADR-178 baseline lacks `@sharpee/ext-scoring` (dungeo has needed it since ADR-260) — a Docker zifmia deploy of dungeo would fail.
- No current tool produces `.sharpee` story bundles (ADR-180 deferred the packer); zifmia's real-path tests hard-require one.

## Next Phase
- **Phase 6** per the plan (run column + remaining golden retirement, which needs the `packages/` discussion first).
- David's click-through of branching in-app is the natural acceptance step.

## Open Items
### Short Term
- Chip clicks during a replay are swallowed silently — chips could visually disable (polish).
- ⌘B surface-reload wiring is click-through-verified only (3 lines calling the tested `load()`).
### Long Term
- [Carried] §13 author-annotated coverage and §14 response-coverage checks — platform discussions first.
- [Carried] Score/machine picker facts need a runner evaluator extension (`packages/`).
- Composed transcripts carry a bare `save` command for interactive save turns; `$save <name>` directive composition (the slot name is now recorded) needs David's ruling — bare `save` runs headless as a deterministic failure.
- Per-point deep selection memory simplified to one active path (the mock's independent per-point `selected` can't be live under view-is-live).

## Files Modified
**Web bundle**: `tools/ide/web/testing-surface/src/{model,compose,main,cards,picker*,surface.css}.ts` (*picker untouched), `src/shims/fs.ts` (new — parser's node-fs import shimmed for the browser build), `build.mjs` (fs alias), `tests/{model,compose}.test.ts`; committed output `Resources/testing-surface/{surface.js,surface.css}`
**Swift**: `TestingSurface/{TestingSessionStore,TestingSurfaceViewController}.swift`, `MainWindow.swift`
**Tests**: `SharpeeIDETests/{TestingSessionStoreTests,TestingSurfaceRealPathTests}.swift`
**Docs**: plan (Phase 4 status cleanup + Phase 5 DONE + evidence), this session file

---

## Session Metadata
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: Phase 6 is the next unit (needs the `packages/` golden discussion)
- **Rollback Safety**: safe to revert — all changes uncommitted working-tree edits on `feat/ide-go-live-phases-1-3` at HEAD `db23e7e6`

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 2's lineage-id/fork-ordinal wire fields; Phase 3's cards + sidecar; Phase 4's compose/writer; ADR-306 D7 (meta commands under branch replay) and D8 (complete restore) rulings.
- **Prerequisites discovered**: the client's `confirm()` and document-click-refocus behaviors both blocked the surface in the real page (neither visible in fixture tests) — resolved IDE-side, no platform changes.

## Architectural Decisions
- No new ADRs; no `packages/` changes (branch-tester reused via imports per ADR-306 D2 — the parser joined the bundle with an fs shim).

## Mutation Audit
- Files with state-changing logic: `model.ts` (lineage/fork/segment state), `compose.ts` (claim re-hydration), `main.ts` (driver + writer + dialog records), `TestingSessionStore.swift`, `TestingSurfaceViewController.swift`.
- Tests assert on post-mutation state throughout: model state after mutators (including refusal no-ops), files on disk (byte comparisons for the clobber fix), sidecar JSON, DOM state in a real WKWebView, and the real engine's feed.
- mutation-verification ran: 11 units scanned, clean except two gaps. **Gap 1 (detached-file path, test written)**: the new `testHandEditedFileDetachesFromAutoWritesUntilTheAuthorTakesItBack` immediately caught a real bug — `update()` ran `postState()` before `syncWrites()`, so the sidecar's stems always described the PREVIOUS write state; a session whose last update was a rename/split persisted stale stems, and on reopen the renamed segment had no stem entry, skipped re-hydration, and was clobbered by the first write. Fixed (writes before state) and pinned by the test, which also covers re-attach-on-gesture. **Gap 2 (⌘B reload wiring, accepted)**: 3 lines in `MainWindow` calling the tested `load()`; `MainSplitViewController` is fileprivate with no test seam — documented as click-through-verified rather than carving a seam unasked.

## Test Coverage Delta
- vitest: 49 → **75 passing**. IDE suite: 531 → **539 passing, 0 failures**.
- Known untested areas: ⌘B surface reload wiring (see Open Items); multi-level forks (fork within a branch's own later turns) are model-tested but not real-path-tested.
