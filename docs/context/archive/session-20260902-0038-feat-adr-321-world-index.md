# Session Summary: 2026-09-02 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Run Phase 4's guided conversation for the Chapter 8 increment (Book 11, Red Gate Estate, `story.ni:10008-10587`) of the Secret Letter change document.
- Record David's rulings under a Chapter 8 heading; release Phase 10's Chapter 8 build if the section completes.
- Then the Chapter 9 increment (Book 12 Parts 1-3, Dame Sandler and the preparations, `story.ni:10588-10975`), same method.

## Completed

### Chapter 8 change-document section (P-4)
- New "Chapter 8 — Red Gate Estate" section in `change-document.md`, status COMPLETE for Phase 10, produced against Book 11 and the Book 3 estate front.
- Four rulings, all David's:
  - **Extent**: "B" — Book 11 whole, from Shannon through the privy window to her goodbye in Lord's Market and the step into Sandler & Sons, where the source prints "Chapter 9 - Preparations". The seam the printed heading, scene chain and hint chain all draw; the theme change and `test redgate` drew it earlier at the gates.
  - **The street**: "B" — new content, fear without teeth: men visible on East Commerce Street when she drops from the park wall, Shannon hurries her to the gates. The house stays silent, no clock.
  - **The bath and the dress**: "A" — as the source has it. The presentation flips with the dress; the public reads her as a young lady from the mirror on; the talent stops showing in anyone's words. Recorded in vision.md §3e as a premise.
  - **The walk out**: "A" — new content: the watch is still on the street and she walks past the men in the Duchess's dress with Shannon at her elbow. Fear without teeth a second time; the first time the boy words fail to find her.
- Perception recorded with no new perceiver. Shannon's one source "Jack, dear" (`story.ni:10182`) converts to "Jacqueline, dear" under §3g. Carry-list recorded under the standing 2026-08-30 default: 8 live rooms (Dining Hall and Kitchen are commented out in the source). Four gaps for Phase 10: the two street beats, the two dead rooms, "Estelle", the converted line.
- Every `story.ni` citation in the new section verified by line print against the source (two rounds of corrections).

### Chapter 8 committed
- `40fd6273` — the four files above, plus the commit script's archive move of the 2026-09-01 18:46 stub session file.

### Chapter 9 change-document section (P-4)
- New "Chapter 9 — Dame Sandler and the Preparations" section, status COMPLETE for Phase 10, produced against Book 12 Parts 1-3 and the clean-Jack layers of Books 3 and 4.
- Four rulings, all David's:
  - **Extent**: "C" — split. Chapter 9 is Sandler's reveal and the shopping with Pieter, from Sandler's door to the moment Journey to the Ball begins on Commerce Street. The night journey becomes the port's Chapter 10; the port's numbering runs one past the source's from here (ball = 11, Baron = 12).
  - **Sandler's reveal**: "A" — true words throughout; she never names the public *son*. `DS38-39`'s popular-acclaim law converts to §3e's succession claim in David's words. vision.md §3e's derived reading resolved.
  - **Pieter**: "A" — does not see. His shock, stumble and "Jack" slips carry as the dress premise's worked example. Added to §3f's matrix (knows everything after the reveal, does not perceive).
  - **Pressure**: "A" — quiet, as the source has it. Chapters 4-9: fear, teeth, fear, fear, fear, quiet.
- Perception for the rest of the cast recorded from Chapter 2's rulings. Carry-list: 0 new rooms, four trees as stubs. Four gaps: the law lines, the dagger's hiding place before the gown, `CB7`'s "yesterday", Pieter's road mutters firing in Chapter 10.
- Every `story.ni` citation verified by line print (three rounds of corrections).

### Plan and vision
- `plan.md` Phase 4 gained progress notes for Chapter 8 and Chapter 9; Phase 10's Chapter 8 and Chapter 9 builds released.
- `vision.md` §3e: "The dress — RESOLVED (David, 2026-09-02)" paragraph; "Dame Sandler's reveal — RESOLVED (David, 2026-09-02)" paragraph; §3f matrix gains Pieter.

## Key Decisions
- All four rulings are story-content authority under the Phase 4 pattern; none constrain platform architecture — no ADR applies.
- Chapters 4-8 now run fear, teeth, fear, fear, fear on vision §5's open question; this chapter's fear is bracketed at the doorstep with the house quiet between.
- The dress premise closes the tell: after the mirror everyone uses the girl words, so §3g has nothing left to pick between. §3f's matrix still holds for knowledge and perception.

## Open Items
### Short Term
- Commit the Chapter 9 changes (not yet requested).
- Phase 10's Chapter 8 build: 8 rooms, 1 scene, the estate-front unlock, the furnace chain, the bath and `clean`, `SH13-16` stub, two placeholder street beats.
- Phase 10's Chapter 9 build: the clean-Jack shop layers, the Bodyguard scene, four stubbed trees with `DS38-39` marked for conversion, the jewel, the purse, the gown, the dagger.
### Long Term
- Whether Jack herself has the talent (still the vision's question).
- Chapter 10's opening — evening on Commerce Street, the world to night, Chapter 4's route walked again with Pieter, the Southern Gate, the keep's foyer and the ballroom (`story.ni:10967-11060`, with the Pieter-keyed rules in Book 5B).
- Where the public *son* is spoken, if anywhere — Chapter 11's question (the ball).
- 7 stranded `.devarch-events-*.jsonl` logs in `docs/context/` (David: ignorable per standing feedback).

## Files Modified
**Documentation** (4 files):
- `docs/work/secret-letter-port/change-document.md` — new Chapter 8 section.
- `docs/work/secret-letter-port/plan.md` — Phase 4 progress note.
- `docs/work/secret-letter-port/vision.md` — §3e dress premise.
- `docs/context/session-20260902-0038-feat-adr-321-world-index.md` — this file.

## Notes
- Approach: one question at a time against the measured source, play-order rundown then lettered options; David ruled; Claude recorded. Eight questions across two chapters, eight answers.
- Edits made via Bash heredoc/python/sed, so the session-state hook's file list is empty; the list above is authoritative.
- Branch name is unrelated to this work; no ADR-321 or world-index code touched.

---

## Session Metadata
- **Session**: ade32b
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check
- **Prerequisites met**: measured source (Book 11, the Book 3 estate front, Book 4's Chapter 9 trigger, the hint chain, `test redgate`), `INVENTORY.md`, vision.md §1-§5, standing 2026-08-30 default, Chapters 2, 3, 6, 7's sections.
- **Prerequisites discovered**: none.

## Architectural Decisions
- None this session.

## Mutation Audit
- Files with state-changing logic modified: none — docs-only session.
- Tests verify actual state mutations: N/A

## Recurrence Check
- Similar to past issue? NO — same Phase 4 pattern as Chapters 1-7, working as designed.

## Test Coverage Delta
- Tests added: 0. Suite untouched (docs-only); type check clean per this session's audit [verified by the audit agent, not re-run].
- Session started: 2026-09-02 00:38
