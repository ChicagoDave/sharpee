# Dungeo Endgame — Integration & Completion Plan

**Status**: Endgame structure implemented, needs integration testing and bug fixes
**Goal**: End-to-end walkthrough from 650/650 main game through endgame to 716/716 victory
**Date**: 2026-02-17

---

## Current State

### What Works (Unit Tests Passing)

All 7 endgame unit test transcripts pass in isolation:

| Transcript | Tests | Mechanic |
|-----------|-------|----------|
| `endgame-incant.transcript` | INCANT cheat teleport | `incant mhoram dfnobo` → Top of Stairs |
| `endgame-laser-puzzle.transcript` | Laser beam break | DROP SWORD breaks beam |
| `endgame-mirror.transcript` | Inside Mirror box | Raise/lower pole, push panels, rotate/move |
| `endgame-trivia.transcript` | DM trivia questions | KNOCK → 3 correct answers → door opens |
| `endgame-dial.transcript` | Parapet dial puzzle | SET DIAL, GDT DL commands |
| `endgame-victory.transcript` | Treasury entry | GDT-assisted victory trigger |
| `tomb-crypt-navigation.transcript` | Tomb area navigation | Land of Dead → Tomb → Entry to Hades |

### What's Implemented

- **14 rooms** created and connected (`src/regions/endgame.ts`)
- **All objects**: laser beam, stone button, sundial, dial button, poles, panels, bronze door
- **Dungeon Master NPC**: trivia, follow, stay, set dial, push button
- **Endgame trigger daemon** (`endgame-trigger-handler.ts`)
- **Laser puzzle handler** (`endgame-laser-handler.ts`)
- **Inside Mirror handler** (`inside-mirror-handler.ts`)
- **Victory state machine** (`state-machines/victory-machine.ts`)
- **INCANT cheat** with ENCRYP algorithm
- **KNOCK and ANSWER actions** for trivia
- **SET DIAL and PUSH DIAL BUTTON actions** for Parapet
- **LIFT/LOWER/PUSH PANEL actions** for Inside Mirror

---

## Critical Bugs (Blocking End-to-End Play)

### Bug 1: Crypt Door Entity Missing — Endgame Trigger Never Fires

**Severity**: Critical — natural endgame entry is completely broken

The `endgame-trigger-handler.ts` calls `isCryptDoorClosed()` which searches for an entity named `'crypt door'`. **This entity does not exist anywhere in the codebase.** The function always returns `false`, which resets the wait counter to 0 every turn. The endgame trigger can never fire naturally.

The INCANT cheat bypasses this entirely, which is why the unit tests pass.

**FORTRAN behavior**: The FORTRAN source (`clockr.for` CEV20) does NOT check for a door — it only requires:
1. Player in Crypt room
2. Room is NOT lit (darkness)
3. Wait ~3 turns (reschedules CEVSTE timer)

**Fix options**:
- **Option A (FORTRAN-accurate)**: Remove the door check entirely. Trigger fires when player is in Tomb + room is dark + wait completes. The Tomb is already `isDark: true`, so turning off the lamp is sufficient.
- **Option B (keep current design)**: Create a `crypt door` entity with `OpenableTrait` in the Tomb. Player must CLOSE door + turn off lamp. Adds an extra step but makes the trigger more deliberate.
- **Option C**: Create a separate Crypt room north of Tomb (most FORTRAN-accurate but adds a room).

**Recommendation**: Option A — match FORTRAN. Remove door check, reduce `TURNS_REQUIRED` from 15 to 3 (FORTRAN uses 3). The Tomb's `isDark: true` + lamp off is the only condition needed.

### Bug 2: Stone Button Push Blocked by SceneryTrait

**Severity**: High — laser puzzle sequence is incomplete

The stone button in Stone Room has `SceneryTrait`, which blocks the stdlib push action before it emits the `if.event.pushed` event. The laser handler's push event listener never fires.

The `endgame-laser-puzzle.transcript` acknowledges this:
```
> push button
[OK: contains "fixed"]    # SceneryTrait blocks with "fixed in place"
```

**Fix**: Either:
- Remove `SceneryTrait` from stone button and use a custom push handler
- Add an event interceptor that catches push on stone button before SceneryTrait blocks
- Make the push action check for `isPushable` attribute before SceneryTrait blocks

### Bug 3: Endgame Scoring — 50 Points Never Awarded

**Severity**: High — score is 50/100 at Treasury instead of 100/100

The scoring breakdown from the old plan:

| Milestone | Points | Awarded? |
|-----------|--------|----------|
| Enter endgame (crypt trigger) | 15 | ✅ `endgame-trigger-handler.ts` sets `scoring.endgameScore = 15` |
| Enter Inside Mirror | 15 | ❌ No handler awards this |
| Exit Inside Mirror (reach Dungeon Entrance) | 15 | ❌ No handler awards this |
| Enter Narrow Corridor (pass trivia) | 20 | ❌ Attribute set (`awardsPointsOnEntry = 20`) but no handler reads it |
| Enter Treasury | 35 | ✅ Victory state machine awards this |

The victory handler defaults to `?? 65` which masks the missing points:
```typescript
const currentScore = (world.getStateValue('scoring.endgameScore') as number) ?? 65;
```

**Fix**: Create an endgame room-entry scoring handler that awards points when the player enters milestone rooms for the first time. Track with `endgame.scored.{roomName}` state flags.

### Bug 4: Inventory Not Stripped on Endgame Entry

**Severity**: Medium — player keeps all items from main game in endgame

**FORTRAN behavior** (`clockr.for` CEV20):
```fortran
DO 20300 I=1,OLNT
  CALL NEWSTA(I,0,OROOM(I),OCAN(I),0)   ! Strip all from player
20300 CONTINUE
CALL NEWSTA(LAMP,0,0,0,PLAYER)            ! Give lamp
CALL NEWSTA(SWORD,0,0,0,PLAYER)           ! Give sword
CFLAG(CEVLNT)=.FALSE.                     ! Reset lamp timer
CTICK(CEVLNT)=350                         ! Fresh 350 turns
```

Current code only gives sword. Doesn't strip inventory. Doesn't give lamp or reset its timer.

**Fix**: In `triggerEndgame()`:
1. Move all player inventory items back to their original locations (or just remove from player)
2. Give both lamp and sword
3. Reset lamp fuel to 350 turns
4. Turn lamp on

---

## Missing Features (Needed for Walkthrough)

### Feature 1: Parapet → Prison Cell Connection

The Parapet has `[Direction.SOUTH]: eastWestCorridor.id` but no DOWN exit. The DL GDT command creates the DOWN connection dynamically, but the PUSH DIAL BUTTON action (or DM "push button") doesn't create this exit.

**Fix**: When dial button is pushed and cell 4 is activated:
- Add `[Direction.DOWN]` exit from East-West Corridor to Prison Cell
- Or add it from Parapet directly (check FORTRAN for correct topology)

### Feature 2: Prison Cell → Treasury Connection

When the bronze door is opened, Prison Cell needs a SOUTH exit to Treasury. The bronze door has `OpenableTrait` but there's no handler that adds the exit when the door is opened.

**Fix**: Listen for `if.event.opened` on the bronze door entity and add the south exit from Prison Cell to Treasury.

### Feature 3: DM Follow Command via Grammar

Need to verify that `tell master follow` and `tell master stay` route correctly to the DM behavior's `onSpokenTo` method. The grammar for NPC commanding (`tell :npc :command...`) should already handle this, but needs integration testing.

### Feature 4: Thief Disabled in Endgame

FORTRAN sets `THFACT=.FALSE.` when endgame starts. The thief should stop wandering, stealing, and attacking during the endgame. Currently the thief daemon likely still runs.

**Fix**: Check `game.endgameStarted` in thief daemon condition. If true, skip thief turn entirely.

---

## FORTRAN Accuracy Improvements (Optional)

These are known deviations from FORTRAN that don't block the walkthrough but improve accuracy.

### Initial Mirror State

| Property | FORTRAN (`dinit.for`) | Current |
|----------|----------------------|---------|
| MDIR (direction) | 270 (West) | 0 (North) |
| MLOC (position) | MRB = position 1 | 0 |
| POLEUF (pole state) | Unknown (likely 2=raised) | 1 (on floor) |

Changing initial state would require updating the mirror unit test transcript and the solution sequence.

### Pine Door vs Pine Movement

**FORTRAN**: Push pine wall opens a door (timed, 5 turns). Guardian room danger check on door open.
**Current**: Push pine moves box backward (symmetric with mahogany).

This is a significant simplification. The pine door mechanic adds:
- Timed door opening/closing
- Guardian room death on viewing through opened door
- Death on entering guardian room

Implementing the FORTRAN version would require:
- Guardian room danger handler
- Pine door timer daemon
- Death conditions for mirror puzzle

### Endgame Turn Count

**FORTRAN**: `CTICK(CEVSTE)=3` (3 turns, reschedules if conditions not met)
**Current**: 15 turns required

FORTRAN is much faster. The 15-turn wait may have been chosen to feel more dramatic, but FORTRAN only needs 3.

---

## Integration Walkthrough Plan (wt-17)

### Prerequisites
- Runs after wt-16 (650/650, player in Living Room)
- Lamp still has fuel (needs verification)
- Sword in inventory (from thief fight in wt-13)

### Route: Living Room → Tomb

```
Living Room → Cellar (D) → Troll Room (W) → E/W Passage (E)
→ Round Room (NE) → Engravings Cave (S) → Cave (S)
→ Entry to Hades (S) → Land of Dead (E) → Tomb (E)
```

Note: Exorcism already done in wt-07, so Entry to Hades → Land of Dead should be open.

### Endgame Trigger Sequence

```
# In Tomb
> turn off lamp          # Room goes dark (Tomb is isDark: true)
> wait                   # Turn 1
> wait                   # Turn 2
> wait                   # Turn 3 → cloaked figure appears, teleport
```

Expected: Player teleported to Top of Stairs, endgame score 15/100.

### Laser Puzzle

```
# At Top of Stairs
> w                      # Stone Room
> s                      # Small Room (laser beam)
> drop sword             # Breaks laser beam
> n                      # Back to Stone Room
> push button            # Opens passage (laser disabled)
```

### Inside Mirror Puzzle

```
# At Stone Room
> s                      # Small Room
> s                      # Hallway
> in                     # Enter Inside Mirror
> raise pole             # Enable rotation
> push red panel         # Rotate 45° (to NE)
> push yellow panel      # Rotate 45° back (to N)
> lower pole             # Into channel (N-S aligned)
> push mahogany          # Move to position 1
> push mahogany          # Move to position 2
> push mahogany          # Move to position 3
> n                      # Exit to Dungeon Entrance (pos 3, dir North)
```

### Trivia Puzzle

```
# At Dungeon Entrance
> knock                  # Start trivia
> answer temple          # Q0 (or whatever random Q comes up)
> answer flask           # Q3
> answer rusty knife     # Q6 → door opens after 3 correct
> n                      # Narrow Corridor (+20 pts)
```

Note: Trivia questions are random. Walkthrough needs either:
- GDT `tq reset` to make deterministic
- A WHILE loop with multiple answer attempts
- Enough correct answers to cover any question

### DM Follow and Dial Puzzle

```
# At Narrow Corridor
> tell master follow     # DM starts following
> n                      # East-West Corridor
> n                      # Parapet
> tell master stay       # DM stays at Parapet
> set dial to 4          # Or: tell master set dial to 4
> tell master push button # Activates cell 4 (bronze door)
> s                      # Back to East-West Corridor
> d                      # Down to Prison Cell
> open bronze door       # Opens door to Treasury
> s                      # Enter Treasury → VICTORY!
```

### Expected Final State
- Endgame score: 100/100
- Main game score: 650/650 (or 616/616 depending on canvas puzzle status)
- Total: 716/716 (or 716 = 616 + 100)
- `game.victory = true`
- `game.ended = true`

---

## Implementation Order

### Phase 1: Fix Critical Bugs (blocks walkthrough)

1. **Fix crypt trigger** — Remove door check OR create crypt door entity
2. **Fix stone button push** — Make pushable despite SceneryTrait
3. **Fix endgame scoring** — Create room-entry scoring handler for 50 missing points
4. **Fix inventory stripping** — Strip inventory, give lamp + sword on endgame entry

### Phase 2: Add Missing Connections (blocks walkthrough)

5. **Parapet → Prison Cell exit** — Dial button creates DOWN connection
6. **Prison Cell → Treasury exit** — Bronze door open creates SOUTH connection
7. **Disable thief in endgame** — Check `game.endgameStarted` in thief daemon

### Phase 3: Integration Testing

8. **Build and run all unit tests** — Verify no regressions from fixes
9. **Interactive play-through** — Play the endgame manually via `--play`
10. **Write wt-17 walkthrough transcript** — End-to-end from Living Room to victory

### Phase 4: Polish (Optional)

11. **Initial mirror state** — Match FORTRAN (direction=270, position=1)
12. **Pine door mechanic** — FORTRAN pine opens door instead of moving box
13. **Guardian room danger** — Death on viewing/entering guardian area
14. **Endgame turn count** — Reduce to 3 turns (FORTRAN-accurate)
15. **DM multi-hop following** — Follow through multiple rooms in one turn

---

## File Impact Summary

### Must Modify

| File | Change |
|------|--------|
| `src/handlers/endgame-trigger-handler.ts` | Remove door check or create door; strip inventory; give lamp; reduce turns |
| `src/regions/endgame.ts` | Fix stone button (remove SceneryTrait or add isPushable handler); add room scoring attributes |
| `src/handlers/endgame-laser-handler.ts` | May need to handle push differently if SceneryTrait approach changes |
| `src/npcs/dungeon-master/dungeon-master-behavior.ts` | Verify push button creates Prison Cell connection |
| `src/actions/push-dial-button/` | Create Parapet → Prison Cell exit on cell 4 activation |
| `src/state-machines/victory-machine.ts` | Remove `?? 65` default, rely on actual score |

### May Need to Create

| File | Purpose |
|------|---------|
| `src/handlers/endgame-scoring-handler.ts` | Room-entry scoring for endgame milestones |
| `walkthroughs/wt-17-endgame.transcript` | End-to-end endgame walkthrough |

### Must Verify

| File | Verification |
|------|-------------|
| `src/npcs/thief/thief-behavior.ts` | Thief disabled in endgame |
| `src/scheduler/` | Lamp timer reset on endgame entry |
| Grammar patterns | `tell master follow/stay/set dial/push button` routing |

---

## Scoring Reference

### Main Game: 650/650

33 treasures × (take value + trophy case value) = 650 points

### Endgame: 100/100

| Milestone | Points | Total |
|-----------|--------|-------|
| Enter endgame (Tomb darkness) | 15 | 15 |
| Enter Inside Mirror | 15 | 30 |
| Exit Inside Mirror → Dungeon Entrance | 15 | 45 |
| Pass trivia → Narrow Corridor | 20 | 65 |
| Enter Treasury of Zork | 35 | 100 |

### Grand Total: 716/716 (650 + 100 = 750... wait)

**Note**: The victory handler computes: `mainScore (616) + endgameScore (100) = 716`. The main game canonical score is 616 (not 650). The 650 includes the 34 extra canvas puzzle points which may be separate from the FORTRAN 616 base. Need to verify how the scoring display works:
- FORTRAN main game max = 585 (some versions 616)
- Our main game max = 650 (616 FORTRAN + 34 canvas ADR-078)
- Endgame max = 100
- Total = 750 (or 716 if canvas points aren't counted in victory display)

The `victory-machine.ts` uses `?? 616` for mainScore — this needs to be the actual main game score from `scoring.score`, not a hardcoded default.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Crypt trigger fix breaks INCANT path | Medium | INCANT sets `game.endgameStarted` directly, bypasses trigger |
| SceneryTrait fix affects other buttons | Medium | Only modify endgame stone button, not all scenery |
| Trivia randomness in walkthrough | Low | Use GDT `tq reset` for deterministic testing |
| DM following edge cases | Low | Test with interactive play before committing walkthrough |
| Scoring math discrepancy (650 vs 616) | Medium | Verify actual `scoring.score` value at endgame entry |
