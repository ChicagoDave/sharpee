# Session Summary: 2026-08-22 - feat/adr-321-world-index

## Goals
- Recap the prior session, then act on David's reframe of Phase 4 of `docs/work/secret-letter-port/plan.md`: "I think Phase 4 turns into a conversation (you're the guide, I'm the writer)."

## Phase Context
- **Plan**: Port *Jack Toresal and The Secret Letter* (Textfyre, 2009) to Chord — `docs/work/secret-letter-port/plan.md`.
- **Phase executed**: Phase 4 — "Produce the change document through guided conversation" (P-4), Medium (ongoing).
- **Tool calls used**: 90 / 60 budgeted (per-chapter-pass budget; ongoing phase, not a hard overrun).
- **Phase outcome**: Completed under the phase's own exit bar — Chapter 1's change-document section now exists, which is the phase's stated exit state and what releases Phase 6. Phase 4 itself stays CURRENT (ongoing by design; P-4 is gate-confirmed, not closed).

## Completed

### Phase 4 reframed from blocked artifact to guided conversation
- David's reframe replaces the prior three sessions' externally-blocked status (waiting on David authoring the change document alone) with a conversation the plan itself runs: Claude presents what a chapter is in the measured 2009 source, asks the decisions it forces, records David's answers verbatim. Authority unchanged — every decision and line is David's; Claude proposes no content and writes no prose.
- Updated in three places: `plan.md` Phase 4 rewritten end to end (Medium/ongoing, 150-per-chapter-pass budget, entry/deliverable/exit/status, plus a note that later chapters are just-in-time entry work for Phases 8 and 10, not new phases); `docs/proposals/secret-letter-port.md` (header status, retarget paragraph, P-4's method paragraph and Done-when, P-5's dependency note); `vision.md` §6 (new "You're the guide includes running the conversation" paragraph on the authorship split).
- Phase 4 is no longer blocked.

### New artifact: change-document.md, Chapter 1 drafted
- `docs/work/secret-letter-port/change-document.md` (new, 239 lines) — the port's per-chapter content authority, produced incrementally. Chapter 1's section drafted through seven decisions, all David's:
  - **Extent**: Prologue + Grubber's Market together (source Books 1-2) — 18 rooms, 3 conversation trees (ST/TE/MONKEY), 11 of 39 story scenes, the banana→monkey→necklace→Teisha→cloak chain, the wandering-mercenaries 4-state pressure model.
  - **The opening**: player PLAYS the market walk (2009 narrated it in a ~350-word non-interactive block, `story.ni:1469`). Jack no longer starts holding the apple (`story.ni:2415`) — theft must work in the calm market.
  - **What ends the walk**: the apple, refused in the open with hints toward the Alley (`story.ni:1469, 2380, 1804, 2417`) — rides the Adjacent Rooms distant-description furniture, giving the P-8 spike (already scheduled for Phase 6) a real consumer.
  - **Teisha's tree splits by occasion**: informational quips (TE12/TE13/TE14/TE15/TE21/TE22) move to the calm walk; TE1-TE9/TE16/TE20 stay in the chase. Consequence: Teisha needs a calm opener; Phase 6's "at least one complete conversation" must name which occasion.
  - **Theft**: calm theft quiet, chase theft noisy; source's stall-blocking `Carry out stealing` (`story.ni:1978`) trigger becomes situational since apple and banana share a stall. Both message halves already written (`story.ni:1469`, `story.ni:1997`).
  - **The chase**: chain, losing endings, and pole timer stay intact.
  - Noted: Teisha's "you look... almost royal" line gains force under the new premises with zero rewriting.

### New world premises recorded in vision.md (all David's, ~287 lines added)
- **§3e "The claim"**: Jack is heir to the throne; the Duke is the king's brother; public language names her the Duke's son. Changes the source's mechanism (DS38/DS39 build the claim on popularity, not blood). Measured rewrite surface: 16 "daughter", 11 "heir", 16 "son", ~30 lines. Androgyny scoped to description only — world still reads boy, preserving §3d's exclusivity and the hat furniture.
- **§3f "Who knows what"**: three knowledge tiers (public/mercenaries/inner circle), independent of perception. Found in-source: the mercenaries' parchment (`story.ni:1806`) describes a body, not a person — the leader's "he" is his own inference.
- **§4 addition, Fiona's knot**: Maiden House discretion, paid to mind Jack. Her two warmest lines (`story.ni:6134`) both convert to boy words under §4.
- **§3g "Position picks the word"**: four-row perceiver matrix; default neutral noun is "brat." Measured: ~84 neutral tokens (child 33, urchin 29, kid 14, brat 5, little rat 3) vs ~73 gendered (girl 40, boy 27, lad 6). Flag: "brat" already used for the Princess in HO7.
- **§3h**: David coined VESHEN (old form) / VESH (worn) — the Miradanian word for what Jack is; two forms give a second tell for speaker closeness to the Vedd. Precedent: unglossed invented nouns already in-source (kello, spans). Parser consequence: needs custom vocabulary. David wrote the PC's first-time/subsequent response lines, which answer the whole idiom register in one shot. **Not checked this session**: whether Chord supports first-time/subsequent response variants — flagged for Phase 6.
- **§5 "Pressure has teeth"**: capture and death stay as fail states — standing rule, no phase may soften them on modern-tolerance grounds.

## Key Decisions

### 1. Phase 4's mechanism changes, not its authority
The reframe moves who holds the pen on the *document* (Claude now structures the conversation) without moving who holds the pen on the *story* (every decision and line stays David's). This is recorded identically in three files so no downstream phase reads a stale account of who is blocked on what.

### 2. Change document stays distinct from vision.md by shape and consumer
Vision holds whole-remake premises; the change document holds per-chapter authorization. Phases 6, 8, and 10 cite the change document, never the vision, for what they're authorized to build — this was reaffirmed, not changed, this session.

## Next Phase
- **Phase 5**: already DONE (2026-08-21) — Vedd foreshadow resolved as seeded/ambient. No action needed.
- **Phase 6**: "Chapter 1 vertical slice in `branch-stories/secret-letter/`" (P-5) — Large, 400-budget. Entry state now satisfied: Phase 4 confirms the change document covers Chapter 1. Chapter 6 builds Teisha's conversation, runs the P-8 Adjacent Rooms spike, and is the first place to verify whether Chord supports the first-time/subsequent response-variant pattern §3h's PC line depends on.
- **Entry state for Phase 6**: Chapter 1's change-document section exists (this session's deliverable); the two small open items below should be resolved first since Phase 6 builds directly against them.

## Open Items

### Short Term
- Chapter 1 still open: whether the ST stallkeeper tree is available in the calm walk (ST3 is chase-specific).
- Chapter 1 still open: whether the monkey is visible before the chase.
- vision.md still open: whether the "seeing" talent (§3d) gets its own word or stays unnamed; whether Holstenoffer keeps "brat" for the Princess (conflicts with §3g's default neutral noun).
- Phase 6 must verify Chord supports first-time/subsequent response variants for the PC's vesh/veshen line (§3h) — not checked this session.
- `docs/work/ide-test-fixture-story/plan.md` (last touched 2026-08-07) still needs David's disposition — surfaced again by pre-session-audit, not decided this session.

### Long Term
- 7 stranded `.devarch-events-*.jsonl` logs remain unpruned; `prune-devarch-runtime.sh` not run this session.
- Later chapters' change-document sections are produced just-in-time by Phases 8 and 10, per Phase 4's note — not tracked as separate plan phases.

## Files Modified

**Secret Letter port planning/vision** (4 files):
- `docs/work/secret-letter-port/plan.md` - Phase 4 rewritten end to end for the guided-conversation reframe.
- `docs/proposals/secret-letter-port.md` - header status, retarget paragraph, P-4 method/Done-when, P-5 dependency note updated.
- `docs/work/secret-letter-port/vision.md` - +287 lines: §3e-§3h, §4 addition, §5, §6 authorship-split paragraph.
- `docs/work/secret-letter-port/change-document.md` - new file (239 lines), Chapter 1 section drafted through 7 decisions.

## Notes

**Session duration**: ~2.5 hours (started 2026-08-22 01:00 CDT).

**Approach**: Guided conversation per the reframe — Claude measured the source against `story.ni` line references, presented the decisions the measured extent forces, recorded David's answers without proposing content. No code changed; this phase produces authorization documents only, so no tests were run (nothing to run).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 4 is an ongoing phase by design; closes with Phase 10 per its own exit state)
- **Rollback Safety**: safe to revert (no code, no commit made this session — changes are unstaged working-tree edits to planning/vision/proposal docs plus one new untracked file)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1-3 DONE (corpus landed, world measured via INVENTORY.md) — required for the guided conversation to ask questions against a counted world rather than a remembered one. `vision.md`'s existing premises (world rules, coda, Vedd theology, fidelity license) were prerequisite context the Chapter 1 conversation was asked within.
- **Prerequisites discovered**: None new.

## Architectural Decisions

- None this session. No ADR was written, amended, or cited as a gate — the session's decisions are content-authority and world-premise decisions (David's, recorded per Phase 4's own method), not platform/architecture decisions.

## Mutation Audit

- N/A — documentation/planning session only; no side-effect code was written or modified.

## Recurrence Check

- YES — Phase 4 had been recorded as CURRENT-and-externally-blocked across three prior sessions (per plan.md's own Status line history). This session is the resolution of that recurring blocked-status pattern, not a new instance of it: David's reframe removes the external dependency rather than deferring it again.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-08-22 ~03:30 CDT
