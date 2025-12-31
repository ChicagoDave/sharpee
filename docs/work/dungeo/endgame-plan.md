# Dungeo Endgame Implementation Plan

**Target**: 14 rooms + Treasury, Dungeon Master NPC, 4 major puzzles
**Estimated Complexity**: High (Inside Mirror box is the most complex single puzzle in the game)

---

## Overview

The endgame is triggered from the Crypt and consists of:
1. **Entry sequence** - Crypt trigger, teleport, score reset
2. **Laser puzzle** - Stone Room / Small Room
3. **Inside Mirror** - Rotating/sliding box puzzle
4. **Trivia challenge** - Dungeon Master questions
5. **Dial puzzle** - Parapet cell selection with NPC cooperation

---

## Phase 1: Endgame Entry & Basic Rooms

### 1.1 Crypt Trigger Mechanics

**Location**: `src/handlers/endgame-trigger-handler.ts`

Trigger conditions (all must be true):
- Player is in Crypt
- Crypt door is closed
- Lamp is off (darkness)
- Wait 15 turns

Effects:
- Emit cloaked figure appearance message
- Set `game.endgameStarted = true`
- Reset score to 15 (out of 100)
- Disable saving (`game.savingDisabled = true`)
- Grant sword to player (if not already held)
- Teleport player to Top of Stairs

**State flags needed**:
```typescript
scoring.endgameScore: number      // Separate from main game score
scoring.endgameMaxScore: 100
game.endgameStarted: boolean
game.savingDisabled: boolean
game.cryptWaitTurns: number       // Counter for 15-turn wait
```

### 1.2 Basic Endgame Rooms

Create `src/regions/endgame/` with:

| Room | File | Notes |
|------|------|-------|
| Top of Stairs | `top-of-stairs.ts` | Arrival point, ambient light |
| Stone Room | `stone-room.ts` | Button (initially disabled) |
| Small Room | `small-room.ts` | Laser beam |
| Hallway | `hallway.ts` | Mirror entrance ("go in") |
| Narrow Corridor | `narrow-corridor.ts` | 20 points on entry |
| South Corridor | `south-corridor.ts` | |
| East Corridor | `east-corridor.ts` | |
| West Corridor | `west-corridor.ts` | |
| North Corridor | `north-corridor.ts` | Cell door to south |
| Prison Cell | `prison-cell.ts` | Bronze door (conditional) |
| Parapet | `parapet.ts` | Dial + button |
| Treasury of Zork | `treasury.ts` | Victory room |

### 1.3 Tomb & Land of Living Dead Updates

Connect existing rooms:
- Hades → E: Land of Living Dead
- Land of Living Dead → E: Tomb
- Tomb → N: Crypt

---

## Phase 2: Laser Puzzle

### 2.1 Small Room Laser Beam

**Mechanic**: Invisible laser beam blocks button in Stone Room

**State**:
```typescript
endgame.laserBeamActive: boolean  // Initially true
```

**Handler**: `src/handlers/endgame-laser-handler.ts`

On DROP SWORD in Small Room:
- Set `endgame.laserBeamActive = false`
- Emit "The sword falls to the ground, breaking the beam of light."

On TAKE SWORD in Small Room (when laser was broken):
- Emit "As you pick up the sword, you notice the laser beam is no longer active."

### 2.2 Stone Room Button

**Mechanic**: Button only works when laser is disabled

**Handler**: `src/handlers/endgame-button-handler.ts`

On PUSH BUTTON in Stone Room:
- If `endgame.laserBeamActive`: "Nothing happens."
- Else: Set `endgame.stoneButtonPressed = true`, emit success message

**Effect**: Opens path or enables something (TBD from source - may just be required sequence)

---

## Phase 3: Inside Mirror (Complex)

### 3.1 Room Structure

The Inside Mirror is a **movable, rotatable room** (box) with:
- 4 walls: mahogany, pine, red panel (x2?)
- Short pole (rotation lock)
- Position in hallway (track location)
- Orientation (N-S or E-W aligned)

**State**:
```typescript
insideMirror.orientation: 'NS' | 'EW'    // Current alignment
insideMirror.position: number            // 0-3 along hallway groove
insideMirror.rotationLocked: boolean     // Short pole state
insideMirror.canExitNorth: boolean       // Computed from position + orientation
```

### 3.2 Mirror Objects

| Object | Action | Effect |
|--------|--------|--------|
| short pole | LIFT | `rotationLocked = false` |
| short pole | LOWER | `rotationLocked = true` |
| red panel | PUSH | Rotate 90° (if unlocked) |
| mahogany panel | PUSH | Move along groove (if locked, correct orientation) |
| pine panel | PUSH | Move along groove (opposite direction) |

### 3.3 Mirror Handler

**File**: `src/handlers/inside-mirror-handler.ts`

```typescript
// Rotation logic
function rotateMirror(state: MirrorState): MirrorState {
  if (state.rotationLocked) {
    return { ...state, message: "The pole is down, locking the room in place." };
  }
  const newOrientation = state.orientation === 'NS' ? 'EW' : 'NS';
  return { ...state, orientation: newOrientation, message: "The room rotates 90 degrees." };
}

// Movement logic
function moveMirror(state: MirrorState, direction: 'mahogany' | 'pine'): MirrorState {
  if (!state.rotationLocked) {
    return { ...state, message: "The room wobbles but doesn't move. The pole must be lowered." };
  }
  if (state.orientation !== 'NS') {
    return { ...state, message: "The room doesn't budge. It's not aligned with the groove." };
  }
  const delta = direction === 'mahogany' ? 1 : -1;
  const newPosition = Math.max(0, Math.min(3, state.position + delta));
  if (newPosition === state.position) {
    return { ...state, message: "The room has reached the end of the groove." };
  }
  return { ...state, position: newPosition, message: "The room slides along the groove." };
}
```

### 3.4 Exit Conditions

Can exit north from Inside Mirror only when:
- `position === 3` (end of groove)
- `orientation === 'NS'` (aligned with exit)

Exit leads to: Dungeon Entrance

### 3.5 Hallway "Go In" Parser

**Problem**: "go north", "enter mirror" don't work - only "go in"

**Solution**: Add grammar pattern in `extendParser()`:
```typescript
{ pattern: 'go in', action: 'going', direction: 'in' }
```

Handler intercepts GO IN when in Hallway → moves to Inside Mirror.

---

## Phase 4: Dungeon Master NPC

### 4.1 NPC Definition

**File**: `src/npcs/dungeon-master/`

```
dungeon-master/
├── dungeon-master-entity.ts
├── dungeon-master-behavior.ts
├── dungeon-master-messages.ts
└── dungeon-master-trivia.ts
```

**Traits**:
- NpcTrait (follows player, can be commanded)
- No combat (ally)

**Behavior states**:
- `guarding_door` - At Dungeon Entrance, asks trivia
- `following` - Follows player through corridors
- `waiting` - Stays at Parapet when told "stay"
- `operating_dial` - Responds to remote commands

### 4.2 Trivia System

**File**: `src/npcs/dungeon-master/dungeon-master-trivia.ts`

```typescript
const TRIVIA_QUESTIONS = [
  { question: "How do you read the cakes?", answer: "flask" },
  { question: "What item is haunted?", answer: "rusty knife" },
  { question: "How do you get to the thief's lair?", answer: "temple" },
  { question: "Where do you end up from the altar?", answer: "forest" },
  { question: "What offends the ghosts?", answer: "skeleton" },
  { question: "Is 'hello sailor' useful?", answer: "none" },
  { question: "What is the value of the zorkmid treasures?", answer: "30003" },
  { question: "What is useful to do with the mirror?", answer: "rub" },
];

// Randomly select 3 questions per playthrough
```

**Handler**: On KNOCK in Dungeon Entrance:
- Dungeon Master appears at door
- Asks first question
- Tracks `trivia.questionsAnswered`, `trivia.currentQuestion`

**ANSWER action**: `src/actions/answer/`
- Syntax: `answer "<text>"`
- Checks against current question's answer (case-insensitive)
- Correct: Move to next question or open door (after 3)
- Wrong: Dungeon Master shakes head, may give hint or refuse entry

### 4.3 TELL MASTER Command

**Syntax**: `tell master "<command>"`

**Handler**: `src/handlers/tell-master-handler.ts`

When Dungeon Master is in `waiting` state at Parapet:
- Parse the quoted command
- Execute on behalf of Dungeon Master
- Supported commands:
  - `set dial to <N>` - Sets dial
  - `push button` - Activates dial selection
  - `stay` - Enters waiting state

---

## Phase 5: Parapet Dial Puzzle

### 5.1 Dial Mechanism

**State**:
```typescript
parapet.dialSetting: 1-8           // Current dial position
parapet.activatedCell: 1-8 | null  // Which cell is in position
```

**Objects**:
- Dial (EXAMINE shows numbers 1-8)
- Button (activates current dial setting)

### 5.2 Cell System

8 cells around a fiery pit, only cell 4 has bronze door to Treasury.

**State**:
```typescript
prisonCell.currentCell: 1-8 | null  // Which cell is rotated into position
prisonCell.bronzeDoorVisible: boolean  // True when cell 4 is in position
prisonCell.bronzeDoorConnected: boolean  // True when dial set to 6 after entering
```

### 5.3 SET DIAL Action

**File**: `src/actions/set-dial/`

Syntax: `set dial to <number>`

Handler:
- Only works in Parapet (or via TELL MASTER)
- Sets `parapet.dialSetting = N`

### 5.4 Victory Sequence

1. Player sets dial to 4, pushes button → cell 4 rotates into Prison Cell position
2. Player tells master to stay
3. Player goes to Prison Cell, sees bronze door
4. Player tells master "set dial to 6" then "push button"
5. Bronze door now connects to Treasury
6. Player opens bronze door, goes north
7. **Victory!** - 35 points, game ends

---

## Phase 6: Victory & Scoring

### 6.1 Endgame Scoring

| Action | Points | Running Total |
|--------|--------|---------------|
| Enter endgame (Crypt trigger) | 15 | 15 |
| `go in` (enter Inside Mirror) | +15 | 30 |
| Exit Inside Mirror north (after trivia) | +15 | 45 |
| Enter Narrow Corridor | +20 | 65 |
| Enter Treasury of Zork | +35 | **100** |

### 6.2 Victory Handler

**File**: `src/handlers/victory-handler.ts`

On entering Treasury of Zork:
- Award 35 points
- Emit victory message
- Set `game.victory = true`
- Display final score, rank, congratulations

---

## Phase 7: INCANT Cheat

### 7.1 INCANT Command

**Syntax**: `incant <challenge> <response>`

**Algorithm**: ENCRYP with key `ECORMS`

| Challenge | Response |
|-----------|----------|
| MHORAM | DFNOBO |
| DNZHUO | IDEQTQ |

**Effect**: Teleport to Top of Stairs with sword, 15 points, endgame started.

**File**: `src/actions/incant/`

---

## New Actions Summary

| Action | Syntax | Location |
|--------|--------|----------|
| ANSWER | `answer "<text>"` | Dungeon Entrance |
| KNOCK | `knock on door` | Dungeon Entrance |
| SET DIAL | `set dial to <N>` | Parapet |
| LIFT | `lift pole` | Inside Mirror |
| LOWER | `lower pole` | Inside Mirror |
| INCANT | `incant <X> <Y>` | Anywhere (cheat) |

**Extended actions**:
- PUSH: mahogany panel, pine panel, red panel, button
- TELL: `tell master "<cmd>"`
- GO: `go in` (special case for Hallway)

---

## Files to Create

```
stories/dungeo/src/
├── regions/endgame/
│   ├── index.ts
│   ├── rooms/
│   │   ├── top-of-stairs.ts
│   │   ├── stone-room.ts
│   │   ├── small-room.ts
│   │   ├── hallway.ts
│   │   ├── inside-mirror.ts
│   │   ├── dungeon-entrance.ts
│   │   ├── narrow-corridor.ts
│   │   ├── south-corridor.ts
│   │   ├── east-corridor.ts
│   │   ├── west-corridor.ts
│   │   ├── north-corridor.ts
│   │   ├── prison-cell.ts
│   │   ├── parapet.ts
│   │   └── treasury.ts
│   └── objects/
│       └── index.ts (dial, button, pole, panels, bronze door)
├── npcs/dungeon-master/
│   ├── dungeon-master-entity.ts
│   ├── dungeon-master-behavior.ts
│   ├── dungeon-master-messages.ts
│   └── dungeon-master-trivia.ts
├── actions/
│   ├── answer/
│   ├── knock/
│   ├── set-dial/
│   ├── lift/
│   ├── lower/
│   └── incant/
└── handlers/
    ├── endgame-trigger-handler.ts
    ├── endgame-laser-handler.ts
    ├── inside-mirror-handler.ts
    ├── tell-master-handler.ts
    └── victory-handler.ts
```

---

## Implementation Order

1. **Phase 1**: Basic rooms + Crypt trigger (testable: can enter endgame)
2. **Phase 2**: Laser puzzle (testable: button sequence works)
3. **Phase 3**: Inside Mirror (testable: can navigate box to exit)
4. **Phase 4**: Dungeon Master + trivia (testable: can pass questions)
5. **Phase 5**: Dial puzzle (testable: can reach Treasury)
6. **Phase 6**: Victory + scoring (testable: game ends properly)
7. **Phase 7**: INCANT cheat (optional, for speedrunning)

---

## Open Questions

1. **Cell mechanics**: Do other cells have anything, or just cell 4?
2. **Dungeon Master behavior**: Does he fight? Help in combat?
3. **West Corridor**: Why is it in the map but not visited in walkthrough?

## Resolved

### Text Database Decoder (2025-12-31) ✅

Created working decoder for dtext.dat/dindx.dat:
- **Location**: `docs/dungeon-ref/decode-text.js`
- **Output**: `docs/dungeon-ref/dungeon-messages.txt` (1191 messages, 4282 lines)

**Format discovered**:
- dindx.dat is text (FORTRAN I8 format), not binary
- RTEXT array starts at line 6425
- dtext.dat: 80-byte records (4-byte group + 76-byte encrypted text)
- Encryption: `char[i] = encrypted[i] XOR ((recordNum & 31) + (i + 1))`

**Usage**:
```bash
node docs/dungeon-ref/decode-text.js --export    # All messages
node docs/dungeon-ref/decode-text.js --endgame   # Endgame messages
node docs/dungeon-ref/decode-text.js 770         # Specific message
```

### Inside Mirror Mechanics (from objects.for)

**State Variables**:
- `MDIR` = direction (0=N, 90=E, 180=S, 270=W, with 45° increments)
- `MLOC` = location (MRA=161, MRB=162, MRC=163, MRD=165)
- `POLEUF` = pole state (0=lowered, 1=on floor, 2=raised)

**Walls**:
- Yellow wall (YLWAL) and Red wall (RDWAL) = side panels (rotation)
- Pine door (PINDR) = end wall (opens door)
- Mahogany wall = end wall (moves box)

**Pole Operations**:
- RAISE: POLEUF=2
- LOWER when N-S oriented: POLEUF=0 (into channel)
- LOWER at MDIR=270, MLOC=MRB: POLEUF=0 (into hole)
- Otherwise: POLEUF=1 (falls to floor)

**Panel Push (rotation)**: Only works if POLEUF≠0
- Red/Yellow: rotate 45° one direction
- Other: rotate 45° opposite direction

**End Wall Push (movement)**: Only works if MDIR is N-S (0 or 180)
- Mahogany: moves box along groove (MLOC±1)
- Pine: opens door for 5 turns

### Trivia System (from verbs.for)

**Selection**: Random 1 of 8, then cycles +3 mod 8 for each correct answer

**Questions and Answers**:
| Q# | Question | Answer(s) |
|----|----------|-----------|
| 0 | Room to enter thief's lair without cyclops? | TEMPLE |
| 1 | Where from altar besides temple? | FOREST |
| 2 | Minimum zorkmid treasure value? | 30003 |
| 3 | Object to determine cake function? | FLASK |
| 4 | What to do with mirror? | RUB, FONDLE, TOUCH |
| 5 | What offends ghosts? | BONES, BODY, SKELETON |
| 6 | What object is haunted? | RUSTY KNIFE |
| 7 | Is "hello sailor" useful? | NONE, NOWHERE |

**Logic**: 3 correct answers to pass, 5 wrong attempts = failure

---

## Transcript Tests

```
tests/transcripts/
├── endgame-entry.transcript       # Crypt trigger
├── endgame-laser.transcript       # Stone/Small room puzzle
├── endgame-mirror.transcript      # Inside Mirror navigation
├── endgame-trivia.transcript      # Dungeon Master questions
├── endgame-dial.transcript        # Parapet puzzle
├── endgame-victory.transcript     # Full playthrough
└── endgame-incant.transcript      # Cheat command
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Inside Mirror complexity | Build state machine with comprehensive tests |
| TELL MASTER parsing | Reuse existing command parser infrastructure |
| Trivia answer matching | Fuzzy matching, accept variations |
| Score reset confusion | Clear messaging, separate endgame score display |
| Guess-the-verb ("go in") | Add multiple aliases, helpful error messages |
