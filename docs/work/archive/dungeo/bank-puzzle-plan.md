# Bank of Zork Puzzle Plan

## Overview

The Bank of Zork contains several interconnected puzzles involving a magic curtain, walking through walls, an alarm system, and vault access. The goal is to retrieve:

- **Portrait of J. Pierpont Flathead** (treasure)
- **Stack of 200 zorkmid bills** (treasure)

## Room Structure (per play transcript)

```
                    [East of Chasm]
                          |
                    [West of Chasm]
                          |
                      [Gallery]
                          |
                  [Bank Entrance]
                    /         \
        [West Viewing]     [East Viewing]
              |                  |
      [Safety Depository] ←→ [? Teller area]
        /     |     \
[Small Room] [N-curtain] [Chairman's Office]
  (no exits)     ↓              |
              [Vault]      [other rooms]
```

## Puzzles

### 1. Shimmering Curtain of Light

**Location**: North wall of Safety Depository

**Mechanic**:

- Player can "walk through curtain" or "go through curtain"
- Leads to Small Room (no normal exits)
- From Small Room, "walk through south wall" returns to Safety Depository

**Implementation**:

- Custom action: `walk through <target>`
- Check if target is "curtain" in Safety Depository
- Check if target is "south wall" in Small Room
- Teleport player accordingly

### 2. Walking Through Walls

**Mechanic**: In certain rooms, player can walk through specific walls

**Valid wall-walks**:

- Safety Depository: N-wall (curtain) → Small Room OR Vault (alternating?)
- Small Room: S-wall → Safety Depository
- Vault: N-wall → Safety Depository

**Implementation**:

- Custom action: `walk through <direction> wall`
- Room-specific handlers determine destination
- May need state tracking for curtain destination

### 3. Alarm System

**Location**: Safety Depository exits

**Mechanic**:

- If player carries treasure (bills, portrait) and tries to leave through normal exits:
  - "An alarm rings briefly, and an invisible force prevents you from leaving"
- Player must drop treasures before exiting normally
- OR use the curtain/wall-walk mechanism to bypass

**Implementation**:

- Before-going handler on Safety Depository
- Check player inventory for treasures
- Block exit if carrying treasures via normal exits
- Allow wall-walk exits

### 4. Stone Cube

**Location**: Center of Safety Depository

**Description**: "large stone cube, about 10 feet on a side. Engraved on the side of the cube is some lettering."

**Mechanic**: Reading the cube provides clues about the curtain/wall puzzle

**Implementation**:

- Scenery object with readable trait
- Text hints at wall-walking solution

### 5. Vault Access

**Location**: Behind the curtain

**Mechanic**:

- Walk through N-wall from Safety Depository
- Destination alternates or depends on state:
  - Sometimes → Small Room
  - Sometimes → Vault
- May depend on which side of curtain you enter from

**Implementation**:

- Track "curtain side" state
- First walk-through goes to Small Room
- Subsequent walk-throughs alternate?
- Need more research on exact mechanic

## Items

### Portrait of J. Pierpont Flathead

- Location: Chairman's Office
- Portable treasure
- Triggers alarm if carried through normal exits

### Stack of 200 Zorkmid Bills

- Location: Vault
- Portable treasure
- Triggers alarm if carried through normal exits

## Custom Actions Required

1. **walk_through** - `walk through <target>` / `go through <target>`

   - Handles curtain, walls
   - Room-specific behavior

2. **read_cube** - May use standard READ action on stone cube

## Event Handlers Required

1. **alarm_check** - Before-going handler on Safety Depository
   - Blocks exit if carrying treasures
   - Allows wall-walk exits

## Message IDs

```
bank.curtain.walk_through = "You feel somewhat disoriented as you pass through..."
bank.alarm.triggered = "An alarm rings briefly, and an invisible force prevents you from leaving."
bank.wall.no_wall = "I can't see any {direction} wall here."
bank.cube.text = "[Clue text about the puzzle]"
```

## Testing Plan

1. Navigate to Bank via Cellar → West of Chasm → Gallery
2. Get portrait from Chairman's Office
3. Try to leave normally (should trigger alarm)
4. Drop portrait, leave, return
5. Navigate to Safety Depository
6. Walk through curtain to Small Room
7. Walk through south wall back
8. Walk through north wall to Vault
9. Get zorkmid bills
10. Exit via wall-walk (should work)
11. Try normal exit with bills (should fail)

## Open Questions

1. Exact mechanic for curtain destination (Small Room vs Vault)?
2. Is there a pattern to wall-walking destinations?

On first try: Walk through curtain goes to Small Room.
From Small Room, you can only Walk through south wall which leads back to Depository. Then you can Walk through north wall, which leads to Vault and the Bills. Then you can only Walk through North Wall which leads to Depository. To clear the alarm, you have to drop any treasure, then Walk through curtain, Walk through south wall. Get all. walk through curtain leads to Viewing room and you can leave the bank. If you review the play through, you can see all of this.

3. What exactly is engraved on the stone cube?

The read cube command should now show:
Bank of Zork
VAULT
_722 GUE_
Frobozz Magic Vault Company

4. Are there other ways to bypass the alarm?

No.
