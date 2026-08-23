# Session Summary: 2026-08-22 - feat/adr-321-world-index (2026-08-22 18:51 CDT)

## Goals
- Resume the Secret Letter port (`docs/work/secret-letter-port/plan.md`) after `.current-plan` was released by the tier-2-import-seam archive.
- Continue Phase 4's guided change-document conversation for the two open Chapter 1 questions carried from the prior session (the eavesdropped bite, the monkey trigger).
- Address a David-reported recurrence of the GH #290 gutter-overlap symptom in the Chord Writer editor.

## Phase Context
- **Plan**: Port *The Secret Letter* (Textfyre, 2009) to Chord — `docs/work/secret-letter-port/plan.md`, Plan Status ACTIVE.
- **Phase executed**: Phase 4 — "Produce the change document through guided conversation" (P-4), Medium (ongoing).
- **Tool calls used**: 44 / 150 (session-state read at session start; this agent's own calls are not re-tallied into that count).
- **Phase outcome**: Partially completed — two Chapter 1 decisions recorded (the monkey trigger, the eavesdrop's aftermath state); Phase 4 stays CURRENT, gate-confirmed not closed, per its own exit-state language. One question is still open and blocks nothing yet in Phase 6.

## Completed

### Plan pointer restored
`docs/context/.current-plan` was absent (released when tier-2-import-seam archived in 3370c05c). Restored it to point at `docs/work/secret-letter-port/plan.md` and stamped a `**Resumed**` line recording the handoff. Pre-session audit was clean (tsc clean, no stale artifacts) — not re-verified in this pass.

### Change-document decisions (P-4, Chapter 1)
Two sections appended to `docs/work/secret-letter-port/change-document.md`:
- **"The monkey — DECIDED"**: `EVENT_monkey` arms at the start of the chase rather than at first entry to the Exotic Gems Stall (`story.ni:2698`), because the cloak the monkey's chain produces (banana → monkey → necklace → Teisha → silk cloak) is written for a Jack already being hunted (`story.ni:3050`) — completing that chain during the calm walk would let the player wear the disguise before anyone is looking for her. Seeding (`ST6`, `TE15`) is already placed in the calm-walk column, so no further authoring is needed there.
- **"The eavesdrop's aftermath — DECIDED"**: David ruled the bite hands off to a **third story state** between `calm` and `chase`, working name `hunted` (Claude's proposal, David may rename). Grounded in the source's own three-beat structure — `Eavesdropping on Soldiers` → `Avoiding Soldiers` → `Final Chase` (`story.ni:1742-1751`), gates lock at `story.ni:1749`, mercenary postures oblivious/approaching/grabbing (`story.ni:2071-2182`), `Final Chase` begins on `TE20` (`story.ni:4005`). Consequence recorded for Phase 6: `secret-letter.story:58`'s `states: calm, chase` needs a third state, and the mercenary pressure model queued as the next authored increment is `hunted`-state content, not chase content. **Left open**: whether the port keeps `TE20` as the `hunted` → `chase` trigger or moves it to a sighting (pursuer reaching `approaching`/`grabbing`) — the next question for David.

### Chord Writer gutter-overlap recurrence (GH #290 class)
David interrupted the port with a screenshot: text still hidden under the line-number gutter after the earlier #290 fix (session-20260822-1537, tier-1-fixes plan). That session's own summary had flagged the gap: *"#290's fix is confirmed by a harness reproduction... if the gutter overlap recurs, a second pre-layout path may exist that the harness didn't cover."* This session found that second path.

**Root cause**: the earlier fix corrects a stale frame width, but never scrolls the clip view back if it had already slid sideways. In wrap mode the horizontal scroller is hidden, not the scrolling — a trackpad swipe (or a swipe permitted by the stale-wide frame) can move `scrollView.contentView.bounds.origin.x` off zero, and correcting the frame afterward does not move the clip back. Every line's first characters stay under the gutter until something scrolls it back, which nothing in wrap mode does.

**Fix** in `tools/ide/SharpeeIDE/Editor/EditorViewController.swift`, `syncWrapWidth`: clamp `scrollView.contentView.bounds.origin.x` to 0 on every pass, placed outside the staleness guard so the clamp fires even when the container and frame both already match.

**Test** added in `tools/ide/SharpeeIDETests/EditorWrapWidthTests.swift`: `testASidewaysSlideCannotStickInWrapMode`. First draft's precondition failed (the clamp fires on `boundsDidChange` immediately) — rewritten to assert the slide cannot *stick* through a stale-frame-then-layout-pass sequence rather than asserting a transient unclamped state.

**Evidence** (re-run by this agent for freshness, after both files' last edits at 19:00/19:09 CDT):
```
xcodebuild test -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -derivedDataPath ./DerivedData \
  -only-testing:SharpeeIDETests/EditorWrapWidthTests
Test Suite 'EditorWrapWidthTests' passed at 2026-08-22 19:11:50.969.
Executed 2 tests, with 0 failures (0 unexpected) in 0.233 seconds.
```
**Not yet confirmed by David** in the relaunched app — the harness pass above verifies the mechanism, not a live-app reopen of his screenshot.

## Key Decisions

### 1. Third story state (`hunted`) between `calm` and `chase`
David's ruling — not Claude's inference — that the eavesdrop's aftermath is its own state rather than folded into `chase`. Directly reshapes Phase 6's state model and reclassifies the queued mercenary-pressure-model work as `hunted` content rather than `chase` content. Rationale is fully sourced to the 2009 material's own three-beat structure, so the port isn't inventing new middle-game content here — it's naming a state the source already had.

### 2. Monkey trigger moves from location to chase-start
Keeps the monkey's seeding text (already placed in the calm column) intact while preventing the disguise chain from completing before Jack is actually hunted — a case where the narrated-market-walk restructuring (this port's own change from 2009) breaks an implicit synchrony the original relied on, and the fix is a trigger move rather than new content.

## Next Phase
- **Phase 4 remains CURRENT** — no phase advance. The next increment is David's ruling on the `hunted` → `chase` trigger (keep `TE20`, or move to a sighting), then the change document's Chapter 1 section is complete.
- **Phase 6** (Chapter 1 vertical slice, CURRENT since 2026-08-22, session 83c2f3) stays blocked on: six David placeholder lines (3 apple in `grubbers-market.chord`, 3 Teisha in `npc-teisha.chord`), the route-clause ruling for the other fourteen peering phrases, crates' mechanical role, and now the `hunted`-state mercenary pressure model once the trigger question resolves.
- **Entry state for resuming**: no code changes pending in `branch-stories/secret-letter/` from this session — the change-document sections are the only Phase 6 input this session produced.

## Open Items

### Short Term
- David's ruling: does `hunted` → `chase` fire on `TE20` (necklace-for-cloak trade) or on a pursuer sighting?
- David confirms the gutter-overlap fix in the relaunched Chord Writer app (screenshot prompted this session; not yet closed).
- The six David placeholder lines and the fourteen-phrase route-clause ruling, both carried forward from before this session.

### Long Term
- Whether a third pre-layout path for the gutter-overlap class exists beyond the two now fixed (stale frame, stale clip origin) — no evidence of one, but the class has recurred once already.
- P-10's re-plan pass (browser build, hosting, landing page, IFID, announcement) remains phase-less per Phase 3's standing note — unaffected by this session.

## Files Modified

**Secret Letter port** (3 files):
- `docs/context/.current-plan` — restored, points at `docs/work/secret-letter-port/plan.md`
- `docs/work/secret-letter-port/plan.md` — `**Resumed**` line stamped
- `docs/work/secret-letter-port/change-document.md` — two Chapter 1 decisions appended (monkey trigger, eavesdrop aftermath / `hunted` state)

**Chord Writer editor** (2 files):
- `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` — `syncWrapWidth` clamps clip-view horizontal origin to 0 every pass
- `tools/ide/SharpeeIDETests/EditorWrapWidthTests.swift` — added `testASidewaysSlideCannotStickInWrapMode`

## Notes

**Session duration**: ~25 minutes (18:51–19:15 CDT), plus this summary pass.

**Approach**: Guided-conversation method for the change document (Claude presents the sourced material, David rules); the editor fix was diagnosed by re-reading the prior #290 fix's own stated gap rather than starting from scratch.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: `docs/work/secret-letter-port/INVENTORY.md` (Phase 2) grounds the eavesdrop/monkey source citations; the prior tier-1-fixes session's own gap note directed this session's editor diagnosis.
- **Prerequisites discovered**: None.

## Architectural Decisions

- None this session. The `hunted` state and monkey-trigger changes are story-content decisions under the existing Phase 4 conversation method, not platform or ADR-level decisions.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/SharpeeIDE/Editor/EditorViewController.swift` (`syncWrapWidth` clip-origin clamp).
- Tests verify actual state mutations (not just events): YES (evidence: `xcodebuild test ... -only-testing:SharpeeIDETests/EditorWrapWidthTests` — "Executed 2 tests, with 0 failures (0 unexpected) in 0.233 seconds", run by this agent 2026-08-22 19:11:50 CDT, after both files' last edits at 19:00/19:09). `testASidewaysSlideCannotStickInWrapMode` asserts on `clip.bounds.origin.x` (the actual scroll state) before and after a layout pass, not on an event or return value.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — `docs/context/session-20260822-1537-feat-adr-321-world-index.md` (tier-1-fixes plan, Phase 3, GH #290) fixed the stale-frame/container mismatch and explicitly flagged: "if the gutter overlap recurs, a second pre-layout path may exist that the harness didn't cover." This session found that second path (stale clip-view scroll origin, independent of frame staleness).
- Consider a one-time audit of `syncWrapWidth` and any other NSTextView/NSScrollView layout-sync code in the editor for a third variant of this class before it recurs again — two independent causes of the same symptom in two sessions is enough to treat "gutter overlap" as a pattern, not a single bug.

## Test Coverage Delta

- Tests added: 1 (`testASidewaysSlideCannotStickInWrapMode`).
- Tests passing before: not measured this session for the full suite (only the two-test `EditorWrapWidthTests` case was run) → after: 2 / 2 in `EditorWrapWidthTests` (evidence: xcodebuild run above, 2026-08-22 19:11:50 CDT).
- Known untested areas: no live-app confirmation of the fix; no test covers a third potential pre-layout path if one exists.

---

**Progressive update**: Session completed 2026-08-22 19:15
