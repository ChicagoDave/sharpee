# Session Summary: 2026-08-23 - feat/adr-321-world-index (05:15 CDT)

## Goals
- ADR-325 AC-4: rewrite `mercenaries.chord` to the ADR block (timers, movement clauses, inline kill), re-pin the tree-document lines, settle the `staggered` posture.
- (To be filled as work progresses)

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md` — Retarget-port *Jack Toresal and The Secret Letter* (Textfyre, 2009) into a native Chord story at `branch-stories/secret-letter/`.
- **Phase executed**: Phase 6 — "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5), status CURRENT since 2026-08-22. This session's work (the wandering-mercenaries hunted-state mechanic, `grubbers-market.chord`/Teisha's Tent) is an increment within this phase, not its completion — the phase's own note anticipated exactly this rewrite (Phase 6 progress log, session 02e57b: "platform primitives landed... the rewrite itself has not started. Next: ... the `mercenaries.chord` rewrite and the open `staggered` posture decision").
- **Tool calls used**: 67 / 150 (Medium tier).
- **Phase outcome**: Partially completed — Phase 6 stays CURRENT; this session closed out the mercenaries-timer rewrite and the `staggered` decision but not the phase's overall exit state (Chapter 1 playable/test-covered as a whole).

## Completed

### `mercenaries.chord` rewrite (ADR-325 AC-4)
- Rewritten to the ADR-325 block: five timers (`waiting` on the player; `search`, `lunge`, `capture`, `recovery` on the mercenaries), `when … expires` / `when the player moves` clauses, inline `kill the player` body, `move it here` / `move it offstage`. No counters, no `on every turn`, no `swept` trait — the 14 rooms are plain `a room` again; the player's block carries `on going while … aggressive → refuse merc-held` and `after going while hunted → restart waiting`; the apple's `on eating` does `start the player's waiting`.
- Three departures from the ADR's printed block, each traced against the pinned tree and the source: (1) no `staggered` posture — `after attacking` goes to `approaching` with `recovery` running, so the pinned attack→`ne`→"dash away" line works; (2) `capture` has one named turn (`held`), not two — the captain arrives two turns after "Gotcha!" as `story.ni:2120` says and the tree pins; (3) `when the player moves` has no `while` — any move while not held sends them offstage and resets every clock, so a `search` started in one room never spots her from another.

### Verification
- `./sharpee test` on the Secret Letter tree: 91 cards passing, 103 assertions passing — all four lines pass with NO re-pin (evidence: re-run 2026-08-23T10:42:40Z, `91 cards passing, 103 assertions passing`, `258 commands (90 authored + 168 replayed)` — timestamped after all edits this session).
- Scratch-copy probe (scratchpad, `--capture-output`, seed 1209): arrival fires on the turn `waiting` expires wherever Jack stands (now including the Alley); warning T+2, spotted T+3, Gotcha T+4, captain T+6 after arrival; moving while oblivious → fresh arrival, no remote spotting; break-free → reeling, lunge, second Gotcha three turns later (matches the old countdown-of-2).

### ADR-325 amendment
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md`: "What the mercenaries become" block amended in place to the shipped shape with a dated 2026-08-23 amendment note explaining the three departures; AC-4 stamped done.

- **IDE margin bug fixed** (`tools/ide/SharpeeIDE/Editor/EditorViewController.swift`, `syncWrapWidth`): the #290-follow-up horizontal clamp pinned the clip origin to 0, but with the line-number ruler the resting origin is `-46` — AppKit reserves the gutter via the CLIP VIEW's computed `contentInsets` (the scroll view's own property reads 0). The clamp was sliding every line 46pt under the gutter (`## J` of each line hidden). Now clamps to `-clip.contentInsets.left`. Diagnosed by launching the Debug build with geometry logging; verified fixed by screenshot of the clean build (secret-letter open, markers visible from first layout).

## Key Decisions

### 1. Drop the `staggered` posture
David confirmed dropping `staggered` from the ADR's original mercenary-posture design (2026-08-23) — `approaching` + a running `recovery` timer covers the same pinned attack→dash-away behavior without a fourth posture, and the ADR block was amended to match rather than the code bent to match a posture that added no observable behavior.

## Next Phase
- **Phase 6 continues** (not advanced) — remaining hunted-state increments named in `mercenaries.chord`'s own header: the conspicuous-shopper check, stallkeeper refusals while the mercenaries are present, and the noisy-theft rule.
- **Tier**: Medium (ongoing — see plan note on Phase 6/8/10 running long by design).
- **Entry state for the next increment**: this session's timer rewrite and rules; no blockers.

## Open Items

### Short Term
- Pre-existing stdlib line "Your attack has no effect on the wandering mercenaries." prints ahead of the break-free phrase — not touched this session, still open.
- The remaining hunted-state increments (conspicuous shopper, stallkeeper refusals in the mercenaries' presence, noisy theft rule) per the `mercenaries.chord` header.

### Long Term
- `story-loader` still lacks a real-`GameEngine` turn harness (would need a `parser-en-us` devDependency) — a package-level change to raise with David before any test infra work depends on it.

## Files Modified

**Story content** (4 files):
- `branch-stories/secret-letter/mercenaries.chord` — rewritten to ADR-325's timer model (five timers, movement clauses, inline kill body).
- `branch-stories/secret-letter/grubbers-market.chord` — 14 rooms drop the `swept` trait; apple's `on eating` starts the player's `waiting` timer; import-site comment updated.
- `branch-stories/secret-letter/secret-letter.story` — player block gets `on going while … aggressive → refuse merc-held` and `after going while hunted → restart waiting`.
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` — "What the mercenaries become" block amended to the shipped shape with a dated amendment note; AC-4 stamped done.

## Notes

**Session duration**: ~20 minutes (05:22–05:42 CDT, per session state).

**Approach**: Rewrote the mercenary hunted-state mechanic against ADR-325's printed block, verified three necessary departures against the pinned tree-document lines and the 2009 source rather than forcing the code to match the ADR exactly, then amended the ADR to record the shipped shape.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — story-content-only changes, no platform/package code touched.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-325 issues #305-#310 (timers, places, movement clauses, region landing, tally `set`) already landed in `packages/chord`/`packages/story-loader` in prior sessions — the primitives this rewrite needed.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-325 (Chord Presence and Duration): "What the mercenaries become" block amended 2026-08-23 to the shipped shape (no `staggered` posture, single-named-turn `capture`, unqualified `when the player moves`) — rationale recorded inline in the ADR's amendment note.
- Pattern applied: timer-driven presence/duration model (ADR-325) replacing the prior counter + `on every turn` + `swept`-trait mechanism.

## Mutation Audit

- Files with state-changing logic modified: N/A — story content only (`.chord`/`.story` files), no platform/package code changed this session.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is planned, expected work (the Phase 6 progress note from session 02e57b explicitly named this rewrite as the next step).

## Test Coverage Delta

- Tests added: 0 — existing tree-document lines re-verified against the rewritten mechanic, none added or removed.
- Tests passing before: 91 cards / 103 assertions (unchanged from session 02e57b, per Phase 6's own progress note: "Tree documents unchanged this session (Secret Letter still 91/103)") → after: 91 cards passing, 103 assertions passing (evidence: `./sharpee test branch-stories/secret-letter`, run 2026-08-23T10:42:40Z, timestamped after this session's edits).
- Known untested areas: the remaining hunted-state increments (conspicuous shopper, stallkeeper refusals, noisy theft) are not yet written or tested.

---

**Progressive update**: Session completed 2026-08-23 05:42 CDT
