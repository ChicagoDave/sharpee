# Session Summary: 2026-09-03 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Produce the Chapter 12 (the Baron) section of `docs/work/secret-letter-port/change-document.md` by guided conversation (plan Phase 4), against Book 13 (`story.ni:11895-12225`).
- Surface Phase 9's status (endgame design, blocked on Gentry's notes) as the first question, since the plan says Chapter 12 waits on it.

## Completed
- Session start: recap presented, pre-session-audit relayed, core concepts read, profile fresh (2026-08-30), gate cleared.
- Source measured: Book 13 in `story.ni`, the two complete playtests' endings (`SecLet-EE07.txt:6840-7200`, `SecLet-EE08.txt:4300-4420`), Detail Design .18 §War Room / §The Big Fight / §The Princess.

- **Phase 9's external input found** (2026-09-03, `~/OneDriveArchive/Documents`): no prose note from Gentry, but three layers of endgame rework exist, all verified against files —
  1. The shipped June 2009 shape (`MGFiles/Projects/.../story.ni`, 2009-09-12, 12,092 lines; `MSTF/inform7/trunk`, 2009-02-18): `FOSS0-10` with `FOSS3`/`FOSS4` the letter demand (*"The letter, please"* / *"hold her, please"*), a `Letter Request` scene, `give letter to baron` answered *"Bitterly, you hand over the Duke's letter"*, Jack free in the chair, freeing Pieter the one action, `attack baron` refused by Bobby (*"No, Jack! Leave him to me!"*). Matches both playtest endings.
  2. **Design Document 2.0 §4 "The Map Room"** (corpus `design/Design Document 2.0.doc.txt:150-268`, dated 2009-10-06; implemented by the programmer 22/29-Oct-2009 per the source change log, `story-sh-1.2.ni:7-8`): mercenaries removed, Jack tied to the chair, `FOSS3`/`FOSS4` deleted and the search folded into `FOSS2`, three `TAKE DAGGER` attempts (drop, chair tips, Pieter kicks it over), cut own ropes, then STAB BARON or FREE PIETER, exactly five turns from the Skirmish's start, gloat cut 1-2 turns. Live in the corpus `story-sh-1.2.ni` (`11882-12207`) and in the 2015-01-07 archive copy (`Inform/Projects/Jack Toresal and The Secret Letter.inform/Source/story.ni`, Book 13 identical to sh-1.2 apart from the corpus name gate).
  3. Trunk from 2010-03-18 through 2012-04-04 = corpus `story.ni`: the tied-up sequence commented out, `tied up: no`, filler `FOSS10-12` added, the stab-Fossville win kept, *"Stay tricky!"*.
  4. **David's own rework note, 2010-08-15**: `Inform0912/Projects/Secret Letter War Room-DavePro.inform/Source/story.ni` (188 lines, four identical copies) — a standalone prototype whose header is a design note: Jack in the chair but not tied; drawing the dagger before Bobby arrives gets it taken (one warning, then Bobby dies and she is kidnapped); going for the Baron or a mercenary throws her back in the chair; going to Pieter is allowed (gag off, a couple of turns of talk) and freeing him is a sub-scene; during the fight she can ask Bobby about hanging/dying/death, spying, maidens, her father, her mother (*"Mike will write prose for these"*); 10-20 escalating hints before the Baron kills Bobby; three ending triggers. Prototype stops after the monologue table (skein: `l`, eleven `z`, `x knife`, `get knife`, `take off dagger`). DD2.0's overview also promised *"Dialogue is added to explain Bobby's role"* and §4 does not deliver it.
  - Mail archive (`All mail Including Spam and Trash.mbox`, 443 MB): 0 hits for War Room / Fossville / Pieter. No email trail.

- **The ending redesigned (David, 2026-09-03)**, recorded in one guided pass: `change-document.md` gains *Chapter 11 — The Ball (the redesigned ending)* (supersedes the 2026-09-02 dance section, which is headed SUPERSEDED and kept) and *Chapter 12 — Vella*. vision.md §2 (capture-as-rescue), §5 (the ball) and §7 (the endgame mess) amended with SUPERSEDED/RESOLVED headers. plan.md: Phase 4 progress entry; **Phase 9 DONE** (deliverable 2, David decided); Phase 11 retitled to Vella. watch-list W-10: postscript (the dance is gone; the several-live-conversations finding stands).

- **Publish-readiness assessment** (David: "what shape is Sharpee/Chord in for publishing outside of Secret Letter?"): measured — `./sharpee publish branch-stories/fernhill/fernhill.story` produced a working 0.4 MB zip (17 files, IFID enforced, 4 themes, assets; `game.js` parses); Chord Writer 1.3.1 shipped 2026-08-18; npm at 5.1.1 (2026-08-19), repo at 5.2.0 unpublished. Verdict given: publishable by its author, not yet by its audience (language mid-migration, tutorial red, ~30 author-facing Chord/parser defects, no outside-repo install ever run).
- **Proposal written and reviewed**: `docs/proposals/publish-readiness-defects.md` — 44 items from the open issue set (David: "keep all of them, add #94 too"). `proposal-review` ran: 8 blocking (1 CONTRADICTION #94 → docs/guides is quarantined, reworded to sharpee.net; 1 STALE ADR — ADR-325 Z6 `remove` terminal vs David's *gone* ruling, amendment folded into P-8; 4 DECISION-IN-DISGUISE — P-11 ADR-118 consultation order, P-20 held-command state, P-21 fall-through vs scoped grammar, P-29 topic scoping; 1 DUPLICATE — #248 vs phase-6-fallout P-3, stamped superseded; 1 UNPLANNABLE — P-33 enumerated to seven) and 5 advisory. David: "accept the 36 and take your recommendations on the eight" → **40 ACCEPTED, 4 PROPOSED** pending the four ADRs (the plan's first phase). Document Status REVIEWED.

## Key Decisions
- Ballroom only, no War Room; the dance goes; Jacqueline mingles and converses freely with every major player (several live conversations still the engine).
- The Baron: the letter produced before the court; the Queen knows his guilt, threatens him quietly, lets him leave; his mercenaries barred by the Queen's Guard.
- Bobby revealed beside the Queen's throne, her man with a loyalty layered by the moment; conversable; the War Room's reveals move to him. Pieter also beside the Queen. The Prince stays. The Queen: a greeting only.
- The Queen judges the claim through the conversations, with teeth: fail and she rises and leaves with Bobby, the room turns its back, game ends. The verdict is silent; for, she nods the Priestess toward Jacqueline.
- The Vedd Priestess arrives on her own time, blocked on the Queen's decision; asks; Jacqueline's spirit is drawn to follow. No fail state after the nod (David's "crescendo of goodness"; §5 per-scene exception, stated and not corrected).
- Vella is the prayer circle; she goes alone. Ballroom is Chapter 11, Vella is Chapter 12.
- Phase 9: no notes from Gentry exist ("that's as good as it gets"); David decided.

## Open Items
- Carried from prior sessions: the one-time audit of every-turn `while <npc> knows <topic>` clauses across the Chord corpus (tick-order sensitivity) — flagged again by the pre-session audit, 2+ sessions old.

## Files Modified
- `docs/work/secret-letter-port/change-document.md` — old Chapter 11 headed SUPERSEDED; new Chapter 11 (redesigned ending) and Chapter 12 (Vella) sections appended
- `docs/work/secret-letter-port/vision.md` — §2, §5, §7 amended (SUPERSEDED / RESOLVED headers, the archive finding)
- `docs/work/secret-letter-port/plan.md` — Phase 4 progress entry (2026-09-03, b6d0a8); Phase 9 DONE; Phase 11 title
- `docs/work/secret-letter-port/watch-list.md` — W-10 postscript
- `docs/context/session-20260903-0145-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-09-03 01:45 CDT (session b6d0a8)
- No source code, no tests, no builds this session — documentation, design capture, and one proposal.
- Next steps: commit; then "plan the proposal" so `session-planner` writes `docs/work/publish-readiness/plan.md`, taking the `.current-plan` pointer from `docs/work/secret-letter-port/plan.md` under David's standing "still live" ruling on port interruptions (rule 18b) rather than closing the port plan out; the four ADRs (P-11, P-20, P-21, P-29) are that plan's first phase; the tick-order audit runs inside P-11/P-17.

---

## Session Metadata

- **Session**: b6d0a8
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes uncommitted at summary time; nothing pushed)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 9's blocking prerequisite (a note from Michael Gentry) was resolved by an archive search rather than by the note itself — three layers of endgame rework and David's own 2010-08-15 prototype were found in `~/OneDriveArchive/Documents` (no email trail in the 443 MB mbox); David ruled the archive findings "as good as it gets" and decided the ending redesign directly, unblocking Phases 4/9/10/11 without further external input.
- **Prerequisites discovered**: None.

## Architectural Decisions

- None this session. No ADR was written or amended — the proposal-review STALE ADR finding against ADR-325 Z6 (`remove` terminal vs. David's *gone* ruling) was resolved by folding an amendment into proposal item P-8's Done-when clause, not by editing the ADR file itself.

## Mutation Audit

- N/A — documentation and design-capture session; no source code changed, no side-effect functions written or modified.

## Recurrence Check

- Similar to past issue? YES — the every-turn `while <npc> knows <topic>` tick-order audit (Chord corpus, tick-order sensitivity), first flagged 3+ sessions ago by the pre-session audit, was relayed again this session and remains open: a fourth carry with no action taken.
- If YES: still a one-time systemic-audit candidate; no session has yet scheduled the work itself. It is slated to run inside proposal items P-11/P-17 once the publish-readiness plan (next step, above) exists.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-09-03 03:47 CDT
