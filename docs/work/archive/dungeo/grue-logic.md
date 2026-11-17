# Grue Death Logic (1981 FORTRAN)

Analysis of the grue death mechanics from `dungeon_3_2b/src/verbs.f` WALK function.

## Overview

The grue is a lurking presence in dark places. Players are warned when entering darkness but only die when attempting to **move while in a dark room**.

## Core Algorithm

```fortran
C WALK function (verbs.f lines 1846-1897)

WALK=.TRUE.                               ! assume wins.
IF((WINNER.NE.PLAYER).OR.LIT(HERE).OR.PROB(25,25))
     1  GO TO 500                         ! skip grue check
IF(.NOT.FINDXT(PRSO,HERE)) GO TO 450      ! invalid exit? grue!
GO TO (400,200,100,300),XTYPE             ! decode exit type.

100   IF(CXAPPL(XACTIO).NE.0) GO TO 400   ! cexit... returned room?
      IF(FLAGS(XFLAG)) GO TO 400          ! no, flag on?
200   CALL JIGSUP(523)                    ! bad exit, grue!
      RETURN

300   IF(CXAPPL(XACTIO).NE.0) GO TO 400   ! door... returned room?
      IF(QOPEN(XOBJ)) GO TO 400           ! no, door open?
      CALL JIGSUP(523)                    ! bad exit, grue!
      RETURN

400   IF(LIT(XROOM1)) GO TO 900           ! valid room, is it lit?
450   CALL JIGSUP(522)                    ! no, grue!
      RETURN

C Room is lit, or winner is not player (no grue).
500   [... safe path, no grue checks ...]
900   WALK=MOVETO(XROOM1,WINNER)          ! move to room.
```

## Decision Tree

```
Player attempts to move in a dark room
│
├─ Is current room lit? ──────────────────────────> YES: Safe path (line 500)
│
├─ Is it an NPC moving? ──────────────────────────> YES: Safe path (line 500)
│
├─ Survival roll PROB(25,25) ─────────────────────> SUCCESS (25%): Safe path
│                                                   FAILURE (75%): Grue path
│
[GRUE PATH]
│
├─ Is exit valid? ────────────────────────────────> NO: DEATH (msg 522)
│
├─ Is exit blocked (door closed, flag off)? ──────> YES: DEATH (msg 523)
│
├─ Is destination room lit? ──────────────────────> YES: SURVIVE (line 900)
│                                                   NO: DEATH (msg 522)
```

## Key Rules

### 1. Grue Check Only on Movement FROM Dark Room

The grue check triggers when:
- Player (not NPC) attempts to move
- Current room (`HERE`) is dark (not lit)
- Movement command issued (any direction)

**Entry to darkness is safe** - you only get a warning message.

### 2. 25% Survival Roll

```fortran
PROB(25,25)  ! 25% chance to skip grue check entirely
```

If the roll succeeds, player takes the "safe path" (line 500) which has **no destination darkness check**.

### 3. Destination Darkness Check (75% path only)

If the survival roll fails, there's a second check:
```fortran
400   IF(LIT(XROOM1)) GO TO 900     ! destination lit = survive
450   CALL JIGSUP(522)              ! destination dark = death
```

This means **dark → dark movement** with failed survival roll = guaranteed death.

### 4. Blocked Exit = Instant Death

On the grue path, hitting any obstacle is fatal:
- Invalid direction: death (522)
- Conditional exit with flag off: death (523)
- Closed door: death (523)

## Death Messages

| Code | Message | Trigger |
|------|---------|---------|
| 430 | "It is pitch dark. You are likely to be eaten by a grue." | Warning on entering dark room |
| 522 | "Oh, no! You have walked into the slavering fangs of a lurking grue!" | Invalid exit or dark destination |
| 523 | "Oh, no! A lurking grue slithered into the room and devoured you!" | Blocked exit (door, flag) |

## Movement Scenarios

### LIT → DARK
- Skip grue check (line 1847: `LIT(HERE)` is true)
- Move succeeds
- Warning message displayed on arrival

### DARK → LIT
- 75% chance: Grue path, but destination is lit → survive
- 25% chance: Safe path → survive
- **Always survives** (destination lit check passes)

### DARK → DARK
- 75% chance: Grue path, destination dark → **DEATH**
- 25% chance: Safe path (no destination check) → survive
- **Net: 75% death, 25% survival**

### DARK → Invalid Exit
- 75% chance: Grue path, invalid exit → **DEATH**
- 25% chance: Safe path, invalid exit → "You can't go that way"
- **Net: 75% death, 25% normal failure**

## Implementation Notes

### What We Have
- Dark room warning message (platform stdlib)
- `isDark` property on rooms
- Light source tracking (lantern, torch, candles)

### What We Need
- Command transformer to intercept `GO` from dark rooms
- 25% survival roll
- Destination darkness check
- Death messages (522, 523)
- Integration with death/resurrection system

### Suggested Implementation

```typescript
// In stories/dungeo/src/handlers/grue-handler.ts

function handleGrueCheck(context: ActionContext): boolean {
  const currentRoom = context.world.getLocation(context.player.id);
  const isCurrentDark = VisibilityBehavior.isDark(currentRoom, context.world);

  if (!isCurrentDark) return false; // Safe, room is lit

  // 25% survival roll
  if (Math.random() < 0.25) return false; // Lucky!

  // On grue path - check destination
  const destination = getDestination(context);
  if (!destination) {
    // Invalid exit - death 522
    triggerGrueDeath(context, 'WALKED_INTO_GRUE');
    return true;
  }

  const isDestDark = VisibilityBehavior.isDark(destination, context.world);
  if (isDestDark) {
    // Dark destination - death 522
    triggerGrueDeath(context, 'WALKED_INTO_GRUE');
    return true;
  }

  return false; // Destination is lit, survive
}
```

## References

- FORTRAN source: `docs/dungeon-81/dungeon_3_2b/src/verbs.f` (lines 1831-1897)
- MDL source: `docs/dungeon-81/mdlzork_810722/original_source/rooms.394` (lines 1402-1407)
- Messages: `docs/dungeon-81/dungeon_3_2b/src/subr.f` (line 358)
