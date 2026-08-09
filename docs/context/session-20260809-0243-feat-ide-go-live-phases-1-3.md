# Session Summary: 2026-08-09 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Plan and begin the testing-surface revamp (replace the 6f play-margin UI with a dedicated testing page per David's "too mechanical" call).
- Resolve the plan's open design questions and land an ADR before writing code.
- Build the substrate (Phase 2) if David green-lit it same session.

## Phase Context
- **Plan**: `docs/work/testing/plan-20260809-testing-surface-revamp.md` — "Implement `design-testing-play-surface.md`: a dedicated testing page that turns play into test authoring."
- **Phase executed**: Phase 1 — "Revamp ADR — supersession record + ADR-294 D1 scoping" (Small), then Phase 2 — "Testing-page substrate — index-testing.html + feed wire additions" (Medium), David green-lighting Phase 2 mid-session ("go").
- **Tool calls used**: 214 / 100 (Phase 1 budget) — ran over due to two ADR-review folding passes and the open-questions interview; Phase 2's own ~250 budget not separately tracked but folded into the same count.
- **Phase outcome**: Both phases completed; Phase 1 ran over its 100-call budget, Phase 2 completed on/under its budget within the same session.

## Completed

### Plan supersession (rule 18b)
- The prior go-live plan (`docs/work/ide-go-live/plan-20260806-go-live.md`) had a non-terminal phase (Phase 5 / 6a-6f) when `.current-plan` needed to repoint. David chose "still live": stamped `**Superseded by**: docs/work/testing/plan-20260809-testing-surface-revamp.md` at the top, left every phase status untouched, resumable at exactly Phase 5/6a-6f. `.current-plan` now points to the new plan.

### Dungeo-outlier correction
- David: "again - dungeo is never a consideration for Chord Writer or Chord." Fixed the plan's state-picker open question (had been framed at "Dungeo scale") and design doc §11 (same violation). Strengthened `project_dungeo_is_an_outlier.md` memory: the rule covers scale yardsticks/examples generally, not just corpus stats; noted the IDE product name is "Chord Writer."

### /devarch:plan-review
- 3 advisories, all TENSION: ADR-301 D5 vs play-to-goal adoption, continuous auto-save vs the editor-refresh loose thread, ADR-304/305 flip timing. David: fold all three in. Landed in plan Phase 1/4/7 and the ADR's Open Questions table.

### ADR-306 — Testing play-surface revamp (new, ACCEPTED)
`docs/architecture/adrs/adr-306-testing-play-surface-revamp.md` — 9 decisions:
- D1 supersessions recorded now, flip to SUPERSEDED at Phase 6 landing (not at ADR-306's writing).
- D2 keeps all of 6f's substrate (turn feed, `data-turn` anchors, `IDE_PLAY_SEED`, synthesis module, ADR-302 tree) unchanged.
- D3 scopes ADR-294 D1's "goldens are the regression baseline" to the frozen transcript-tester/Dungeo world only; author-world baseline becomes "the tree passing."
- D4 draws the post-revamp Testing tab boundary: authoring (play surface) vs reading (tab); resolves ADR-301's open "editing interaction" item.
- D5 scopes ADR-301 D5's document-adoption model to the batch explorer only; play-to-goal (Phase 7) adopts nothing via that path.
- D6-D9 resolved via the open-questions interview below.
- Acceptance: AC-1 through AC-6, all marked SELF-VERIFYING.

### Open-questions interview (rule 11a, David consented)
- Q1 state picker at scale → **D6**: one searchable list, Grouped toggle, collapsible kind sections, live filter auto-expands folds. Shape ruled from a live-iterated mock, `docs/work/testing/mock-state-picker.html` (Fernhill-scale / large-scale toggle).
- Q2 meta commands at fork points → **D7**: ADR-305 D3 extends unchanged; lineage-sticky saves; a cross-lineage restore fails visibly (rejection test, AC-4).
- Q3 session-view persistence → **D8**: the testing page's COMPLETE state is managed and restored on reopen. David rejected a files-only recommendation; restore is by replay at `IDE_PLAY_SEED`; the sidecar never carries test truth; degraded mode (unreadable sidecar) rebuilds from `tests/`, never errors.
- Q4 editor refresh under continuous auto-save → **D9**: clean buffers auto-reload; dirty buffers get a conflict guard. Closes the 6e policy-run loose thread from session `session-20260808-2200-feat-ide-go-live-phases-1-3.md`.

### /devarch:adr-review ×2
- First pass: 11/18, NEEDS WORK — 4 findings (ADR-304 citation misattribution, no acceptance criteria, 2 unevidenced premises, no sidecar staleness rule). All folded: AC-1..AC-6 added; inline dated evidence attached to D7's fence claim and D8's determinism premises; a sidecar-never-blocks-reopen rule added to D8.
- Second pass: 16/18 → corrected to 16/16, READY. David: "accept and plan it" → ADR-306 ACCEPTED; plan Phase 1 marked DONE; D6-D9 propagated into plan Phases 3/4/5; the plan's open-questions table marked all-resolved.

### Phase 2 — Testing-page substrate (David green-lit: "go")
- `packages/platform-browser/src/turn-events.ts`: `TurnEventPayload` gains `events` (emitted event types) and `world` (digest, bridge-gated); `TurnEventRecord` gains `lineage`/`parentLineage`/`forkOrdinal`; the restart fence now carries the new lineage id; new `__SHARPEE_PLAY_LINEAGE__` boot global (sibling of the existing seed global); new exports `currentPlayLineage`/`turnEventsBridgeActive`.
- New `packages/platform-browser/src/world-digest.ts`: `buildWorldDigest` — entity locations with `[STATE:]`-resolvable tokens, a deliberate narrowed mirror of branch-tester's `worldEntityRef` (pinned on both sides per ADR-301 A1's mirror pattern, since the browser bundle cannot import the Node harness); score via the scoring capability; machine states via the existing plugin-registry `getState()` — no engine API changes.
- `BrowserClient.ts`: captures `TurnResult.events` per turn; digest computation is gated on the bridge being active.
- `packages/devkit`: new `templates/browser/index-testing.html` (prose pane + input + functional dialogs only, no menu/status/theme chrome — platform-owned even for custom-page stories); both build paths (`chord-build`, `browser-build`) emit it; `publish.ts`'s `zipDirectory` excludes it from author zips.
- ADR-305 D4 amended to record the wire-shape additions with inline dated evidence.

## Key Decisions

### 1. ADR-306 accepted with 6 new decisions on top of the 3 original scoping items
D1-D9 above settle every open question the design doc and plan-review raised; nothing carried forward as unresolved. Rationale: David wanted the whole surface's contract nailed down before any UI code, given the "too mechanical" complaint that started this revamp.

### 2. World digest is a deliberate narrowed mirror, not a shared import
`world-digest.ts` in platform-browser duplicates the shape of branch-tester's `worldEntityRef` rather than importing it, because the browser bundle cannot pull in the Node harness. Both copies are pinned by tests on both sides per the ADR-301 A1 precedent — accepted duplication with a test tripwire, not an oversight.

### 3. index-testing.html ships as a platform-owned template, excluded from published zips
Keeps the testing page out of author-facing story distributions while still being emitted by both in-repo build paths; `publish.test.ts` pins the exclusion.

## Next Phase
- **Phase 3**: "Cards, rail, and segments — the three-column skeleton" (Large, ~400 tool calls). Builds the outlined turn-card blocks, checkbox rail, tick-to-range segments, collapse/merge/split, auto-name derivation, and ADR-306 D8's session-state substrate (sidecar + restore-by-replay, degraded mode).
- **Entry state**: Phase 2's testing page and extended feed exist (done this session) — Phase 3 can render against real play sessions, not the mock.

## Open Items

### Short Term
- `sharpee test --tree` drops the root `channels:` field — still needs a GitHub issue filed (carried from prior session, not yet actioned).
- The go-live plan's remaining phases (5 / 6a-6f click-throughs) stay parked, stamped still-live — not this plan's business per the supersession stamp.

### Long Term
- David's mid-build idea, captured in design doc §13: author-annotated coverage. Author marks puzzles/important context; tool computes coverage % against those annotations. Refined same day toward a state-filter form (`when (state is XYZ) banana-puzzle is available`) riding Chord's existing when-filter grammar, mechanically evaluable over the tree's visited states. Not yet scope — needs a Chord-language platform discussion before it enters a plan.
- Phase 7 (play-to-a-goal, Tier 1) explicitly deferred in the plan — starts only when David asks.

## Files Modified

**Planning / architecture** (7 files):
- `docs/architecture/adrs/adr-305-create-transcript-from-play.md` - D4 amended with wire-shape additions
- `docs/architecture/adrs/adr-306-testing-play-surface-revamp.md` - new, ACCEPTED, D1-D9 + AC-1..AC-6
- `docs/work/ide-go-live/plan-20260806-go-live.md` - stamped `Superseded by:`, phases untouched
- `docs/work/testing/design-testing-play-surface.md` - Dungeo-scale correction, §13 coverage idea captured
- `docs/work/testing/mock-state-picker.html` - new, live-iterated mock backing D6
- `docs/work/testing/plan-20260809-testing-surface-revamp.md` - new, 7 phases; Phase 1/2 DONE
- `docs/context/.current-plan` - repointed to the new plan

**platform-browser** (5 files):
- `packages/platform-browser/src/turn-events.ts` - events/world/lineage fields, boot global, new exports
- `packages/platform-browser/src/world-digest.ts` - new, buildWorldDigest
- `packages/platform-browser/src/BrowserClient.ts` - per-turn events capture, digest gating
- `packages/platform-browser/src/index.ts` - export wiring
- `packages/platform-browser/tests/turn-events.test.ts`, `tests/world-digest.test.ts` - new/extended coverage

**devkit** (7 files):
- `packages/devkit/templates/browser/index-testing.html` - new testing-page skeleton
- `packages/devkit/src/standalone/build-browser.ts`, `browser-core.ts` - emit the new template
- `packages/devkit/src/standalone/publish.ts` - zip exclusion for index-testing.html
- `packages/devkit/src/standalone/browser-build.test.ts`, `chord-build.test.ts`, `publish.test.ts` - pin content/exclusion

**Memory** (2 files, outside repo):
- `MEMORY.md`, `project_dungeo_is_an_outlier.md` - strengthened Dungeo-outlier rule to cover scale yardsticks generally

## Notes

**Session duration**: ~7 hours (started 2026-08-09T07:43:39Z per session state; finalize invoked same day).

**Approach**: Design-first — plan, then ADR with a full open-questions interview, then two review-and-fold passes, then code only after the contract was 16/16 READY. Recurrence check below notes this is a deliberate break from an earlier pattern.

---

## Session Metadata

- **Status**: COMPLETE (unverified: exact test-count deltas below — pass/fail status is corroborated by the event log, but the specific counts (141/171/422) are session-narrative figures the log does not capture; mutation-verification's GREEN grading and the tsc-clean claim are likewise session-reported)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 3 not started, no blocker — normal plan continuation)
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/ide-go-live-phases-1-3` (HEAD 301ec7b6); nothing pushed this session.

## Dependency/Prerequisite Check

- **Prerequisites met**: Design doc and mock settled (session 1dd6d3, prior); ADR-305 "As built" section existed as a citation base for Phase 1's ADR.
- **Prerequisites discovered**: None — the plan's Phase 2 entry state (Phase 1's ADR existing at least DRAFT) was satisfied within the same session before Phase 2 started.

## Architectural Decisions

- ADR-306 (new, ACCEPTED): testing play-surface revamp — supersession record for ADR-304/305 UI (flip deferred to Phase 6), ADR-294 D1 scoped to the frozen transcript-tester world, Testing-tab boundary (D4), ADR-301 D5 scoped to the batch explorer (D5), state-picker shape (D6), branch-replay meta-command handling (D7), session-state persistence (D8), editor auto-reload/conflict-guard (D9).
- ADR-305 D4 amended: wire-shape additions (`events`, `world`, `lineage`/`parentLineage`/`forkOrdinal`, `__SHARPEE_PLAY_LINEAGE__`) recorded with inline dated evidence.
- Pattern applied: ADR-301 A1's pinned-mirror pattern, reused for `world-digest.ts` mirroring branch-tester's `worldEntityRef` across the browser/Node boundary.

## Mutation Audit

- Files with state-changing logic modified: `packages/platform-browser/src/turn-events.ts`, `packages/platform-browser/src/world-digest.ts`, `packages/platform-browser/src/BrowserClient.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: event log row `2026-08-09T08:46:18Z kind:build "Build passed" — pnpm --filter '@sharpee/platform-browser' test`, timestamped after the last edit to `turn-events.test.ts` at 08:46:06Z — confirms the suite passed post gap-closure. The GREEN mutation grading itself and the 2-gap-found/2-gap-closed narrative are session-reported, not independently re-derivable from the log).
- If NO: N/A — closed same session.

## Recurrence Check

- Similar to past issue? YES — the tsf dist-esm staleness trap (documented in project memory `project_tsf_dist_esm_staleness.md`) recurred: the devkit bundle test failed against a stale `dist-esm/`, fixed with `npx tsf build --target esm` per the known remedy. No systemic audit needed — this is a known, documented, quick-fix trap, not a new pattern.
- Separately, the click-through-verification gap noted in prior sessions (shipping UI without an end-to-end click-through) did NOT recur this session — this session was design/ADR-first with no UI code landing yet, so the pattern had no surface to repeat on.

## Test Coverage Delta

- Tests added: 8 in platform-browser this session's Phase 2 build (6 world-digest + 2 turn-events/feed), then 2 more from mutation-verification gap closure (10 net new in platform-browser); devkit and branch-tester counts unchanged in total but devkit's assertions were extended (index-testing.html content pinned, zip exclusion pinned).
- Tests passing before: platform-browser 131 → after: 141. PASS status corroborated (event log: `Build passed — pnpm --filter '@sharpee/platform-browser' test` at 08:39:19Z and again at 08:46:18Z, both after their respective last edits); the specific counts 141/171/422 are [reported by session, unverified] — the event log records pass/fail only, not counts. devkit 171 → 171 (assertions extended, count unchanged) — PASS corroborated at 08:42:34Z, after the 08:41:20Z edit (an earlier run at 08:41:30Z had failed and was fixed). branch-tester 422 → 422 (unchanged) — PASS corroborated at 08:43:15Z. Repo `npx tsc --noEmit` clean claim: [reported by session, unverified — no corresponding event-log row found].
- Known untested areas: Phase 3's real in-WKWebView load of the testing page is explicitly noted in the plan as untested until Phase 3 begins ("loads with no chrome" is pinned only at emitted-content level so far).

---

**Progressive update**: Session completed 2026-08-09 (CDT)
