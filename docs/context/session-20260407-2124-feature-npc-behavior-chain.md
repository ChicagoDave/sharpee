# Session Summary: 2026-04-07 - feature/npc-behavior-chain (CST)

## Goals
- Brainstorm "The Alderman" — a murder mystery reference implementation story designed to exercise the full NPC behavior chain (ADR-142, 144, 145, 146)
- Define setting, player character, victim, suspects, and game structure

## Phase Context
- **Plan**: No active plan for this session — pure brainstorming/design work
- **Phase executed**: N/A — design/brainstorm session
- **Tool calls used**: 471 (session state carried from prior Phase 6-7 implementation work)
- **Phase outcome**: N/A

## Completed

### Setting Definition
- Grand 1870s post-Great-Fire Chicago hotel called "The Alderman", inspired by the Tremont House (Chicago)
- Full hotel map sketched: ground floor (foyer, restaurant, kitchen, bar, check-in, grand staircase, Otis elevator), 2nd floor ballroom, floors 3-8 guest rooms (10 per floor), basement (laundry, boiler, storage)
- Documented in `docs/brainstorm/overview.md` and `stories/thealderman/docs/design.md`

### Player Character
- Up-and-coming architect, dashing and smart
- Natural cover for exploring the hotel and interacting with all social strata

### Victim
- Stephanie Bordeau, 40, gorgeous, wealthy, red hair
- No known family (but someone IS hidden family — a key mystery thread)
- Found dead at the start of play

### Six Suspects Defined
1. Ross Bielack — White Stockings baseball player, temperamental, lover of victim, has a room
2. Viola Wainright — Actress at McVicker's Theatre, frequently stays at hotel, has a room
3. John Barber — Gang member in tailored suits, bar regular, seen dining with victim, no room (day visitor)
4. Catherine Shelby — Restaurant hostess, middle-aged, knows everyone, staff
5. Jack Margolin — Real estate mogul, owns the neighborhood, loud, has a room
6. Chelsea Sumner — Cigarette girl, young and pretty, staff

### Clue-Style Randomization Design
- Killer: one of the 6 suspects (randomized at game start)
- Weapon: revolver, knife, champagne bottle, fireplace poker, sad iron, curtain cord
- Location: Stephanie's room, laundry, kitchen, elevator, ballroom, suspect's room
- 216 possible combinations (6x6x6)

### 95%/5% Content Split
- 95% of evidence and conversation is fixed authored content (always present)
- 5% shifts based on the randomized solution: alibi holes, missing weapons, location tells
- This approach minimizes authoring burden while preserving meaningful randomization

### Design Document
- `stories/thealderman/docs/design.md` — full game design document including all character profiles, hotel layout, randomization scheme, open questions

## Key Decisions

### 1. Fixed-Majority Content Strategy
Rather than generating mystery content procedurally, the game uses primarily authored content with a small dynamic layer. This keeps the writing quality high and the narrative coherent while still making each playthrough unique. The 5% that changes is targeted: one alibi per suspect has a crack, one weapon location is "wrong", one location has a tell.

### 2. Historical Setting Grounds NPC Behavior Chain
The 1870s Chicago hotel setting was chosen specifically because it creates natural social hierarchies and movement patterns that exercise all layers of the NPC behavior chain: staff move on schedules (propagation), guests pursue goals (goal system), social influence operates through class and reputation (influence system), and conversation topics layer on period-appropriate context (conversation/topic system).

### 3. Hidden Family Thread as Central Mystery
Stephanie has no known family, but someone IS her hidden family — this becomes a motive thread. This design choice creates a second-order mystery (who is the hidden family) that interlocks with the murder mystery and gives the story depth beyond a simple whodunit.

## Next Phase
Plan complete — all phases done for the NPC behavior chain branch. This session's brainstorm work is the beginning of a new story, not part of the NPC behavior chain plan. Next steps for The Alderman story are in the Open Items section.

## Open Items

### Short Term
- Define the hidden family relationships for each suspect (which one is Stephanie's family, and what that means for motive)
- Design alibi structure: what each suspect claims, and where the crack appears in the guilty party's alibi
- Map weapon locations: where each weapon normally resides in the hotel, and where the murder weapon ends up
- Define investigation mechanics: how the player collects evidence, what constitutes "enough" to accuse
- Write the game opening: discovery scene, initial state description, player's reason for being at the hotel
- Decide NPC schedules: where each suspect is at game start vs. later in the day

### Long Term
- Implement The Alderman story using the NPC behavior chain builder APIs
- Use it as the reference implementation demonstrating ADR-142, 144, 145, 146 in a complete game
- Consider whether The Alderman should be released as a standalone IF work or kept as a developer reference

## Files Modified

**New files** (2 files):
- `docs/brainstorm/overview.md` — top-level brainstorm overview document
- `stories/thealderman/docs/design.md` — full game design document with setting, characters, mechanics, and open questions

## Notes

**Session duration**: ~1 hour (brainstorm/design session)

**Approach**: Open-ended collaborative brainstorming. Converged on a historically grounded setting that naturally exercises the NPC behavior chain systems built in the prior two sessions. Deliberately chose a period (1870s Chicago) with rich social texture and clear reference material. Design document left with explicit open questions to resolve before implementation begins.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Design — many story design questions remain open before implementation can begin
- **Blocker Category**: Other: Story Design
- **Estimated Remaining**: ~2-3 hours of design work (hidden family, alibis, weapon locations, game opening), then full story implementation
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: NPC behavior chain platform work (Phases 1-7) is complete on this branch; PR to main is the immediate next platform step. The Alderman story cannot be implemented until that merge happens.
- **Prerequisites discovered**: Story implementation depends on The Alderman design being finalized (open questions resolved) and the NPC behavior chain branch being merged to main.

## Architectural Decisions

- None this session — brainstorm/design work only, no code written.

## Mutation Audit

- N/A — no code written this session; documentation and design files only.

## Recurrence Check

- Similar to past issue? NO — first brainstorm session for The Alderman story.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-04-07 21:24
