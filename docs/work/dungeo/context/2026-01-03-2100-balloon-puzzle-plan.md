# Balloon Puzzle Implementation Plan

**Date**: 2026-01-03 21:00
**Branch**: dungeo
**Status**: Planning

## Overview

The balloon is a transparent vehicle that allows vertical navigation through the volcano shaft. It uses a hot-air mechanism controlled by a receptacle (brazier) that can be opened/closed. The braided wire must be tied to hooks at ledges to dock.

---

## FORTRAN Source Analysis

### Timing (from timefnc.for, objects.for)

| Event | Interval | Notes |
|-------|----------|-------|
| Balloon daemon (CEVBAL) | Every **3 turns** | Handles all ascent/descent |
| Burn duration (CEVBRN) | `OSIZE(object) * 20` turns | Guidebook ~40-80 turns |

**Key insight**: Movement happens automatically every 3 turns, not just on WAIT!

### Room Structure (from dparam.for)

| ID | Constant | Description | Can Dock? |
|----|----------|-------------|-----------|
| 126 | VLBOT | Volcano Bottom (ground) | Yes (board) |
| 127 | VAIR1 | Mid-air 1 | No |
| 128 | VAIR2 | Mid-air 2 (near Narrow Ledge) | No |
| 129 | VAIR3 | Mid-air 3 | No |
| 130 | VAIR4 | Mid-air 4 (TOP) | **CRASH ZONE** |
| 131 | LEDG2 | Ledge 2 → W to Narrow Ledge | Yes |
| 132 | LEDG3 | Ledge 3 | Yes |
| 133 | LEDG4 | Ledge 4 → W to Wide Ledge | Yes |

### Movement State Machine (from timefnc.for lines 6000-6850)

```
Every 3 turns, the daemon checks:

1. At LEDG2/3/4?
   → Drift to corresponding VAIR (LEDG2→VAIR2, etc.)
   → "The balloon leaves the ledge."

2. At VLBOT (bottom)?
   → If receptacle OPEN + burning: rise to VAIR1
   → If not: stay put (or crash if fell uninflated)

3. In VAIR1-3 + receptacle OPEN + burning?
   → Rise one level (BLOC+1)
   → "The balloon ascends."

4. At VAIR4 + still rising?
   → CRASH! Balloon destroyed, player dies!
   → "Your balloon has hit the rim of the volcano..."

5. In midair + receptacle CLOSED or not burning?
   → Descend one level (BLOC-1)
   → "The balloon descends."

6. At VAIR1 + descending?
   → Land at VLBOT
   → "The balloon has landed."
```

### Tethering (BTIEF variable)

From objects.for lines 1221-1237:

```fortran
C Tie braided rope to hook
IF (TIE BROPE TO HOOK1 or HOOK2)
    BTIEF=PRSI              ! Record which hook
    CFLAG(CEVBAL)=.FALSE.   ! DISABLE balloon daemon!
    "The balloon is anchored."

C Untie
    BTIEF=0                 ! Clear tether
    CFLAG(CEVBAL)=.TRUE.    ! Re-enable daemon
    CTICK(CEVBAL)=3         ! Restart 3-turn countdown
```

**Key insight**: Tethering DISABLES the balloon daemon entirely! The balloon won't move until untied.

### Two Hooks

- `HOOK1` (102) - At one ledge position
- `HOOK2` (103) - At another ledge position
- Player ties braided rope (`BROPE` 101) to a hook to dock

### Balloon Object Messages (dungeon-messages.txt)

| ID | Message |
|----|---------|
| 530 | "You watch as the balloon slowly lands." |
| 531 | "The balloon has landed." |
| 532 | "You have landed, but the balloon did not survive." |
| 533 | "You watch as the balloon slowly descends." |
| 534 | "The balloon descends." |
| 535 | "You hear a boom and notice that the balloon is falling to the ground." |
| 536 | "Your balloon has hit the rim of the volcano, ripping the cloth..." (death) |
| 537 | "You watch as the balloon slowly ascends." |
| 538 | "The balloon ascends." |
| 539 | "You watch as the balloon slowly floats away..." (stranded) |
| 540 | "The balloon leaves the ledge." |
| 541 | "You watch as the balloon slowly lifts off." |
| 542 | "The balloon rises slowly from the ground." |
| 543 | "The cloth bag is draped over the basket." (deflated) |
| 544 | "The cloth bag is inflated, and there is a # burning in the receptacle." |
| 545 | "The balloon is tied to the hook." |
| 546 | "I'm afraid you can't control the balloon in this way." |
| 547 | "You are tied to the ledge." (can't walk out) |
| 548 | "You don't really want to hold a burning #." |
| 549 | "The receptacle is already occupied." |
| 550 | "The # burns inside the receptacle." |
| 551 | "The cloth bag inflates as it fills with hot air." |

---

## Phase 1: Objects & Basic Structure

### 1.1 Create Balloon Objects

**File**: `stories/dungeo/src/regions/volcano/objects/balloon-objects.ts`

| Object | Type | Properties |
|--------|------|------------|
| Balloon basket | Vehicle + Container | transparent: true, vehicleType: 'balloon', enterable: true |
| Receptacle | Fixture (in balloon) | openable: true, open: false (starts closed), capacity: 1 |
| Cloth bag | Scenery (on balloon) | For description only |
| Hook 1 | Fixture | At LEDG2 position (near Narrow Ledge) |
| Hook 2 | Fixture | At LEDG4 position (near Wide Ledge) |
| Dead balloon | Scenery | Created when balloon crashes |

**File**: `stories/dungeo/src/regions/dam/objects/stream-view-objects.ts`

| Object | Type | Properties |
|--------|------|------------|
| Braided rope | Takeable | Can be tied to hooks |

**File**: `stories/dungeo/src/regions/surface/objects/attic-objects.ts` (update)

| Object | Type | Properties |
|--------|------|------------|
| Shiny wire | Takeable | With brick, for fuse (separate puzzle) |
| Brick | Takeable | Volcano explosion puzzle |

### 1.2 Balloon State

```typescript
interface BalloonState {
  // Position as FORTRAN room constant equivalent
  position: BalloonPosition;

  // Tether state - which hook (if any)
  tetheredTo: 'hook1' | 'hook2' | null;

  // What's burning in receptacle (entity ID or null)
  burningObject: string | null;

  // Daemon enabled/disabled
  daemonEnabled: boolean;

  // Turn counter for daemon (fires when reaches 0)
  daemonTurnsRemaining: number;
}

type BalloonPosition =
  | 'vlbot'   // Volcano Bottom (ground)
  | 'vair1'   // Mid-air 1 (just above bottom)
  | 'vair2'   // Mid-air 2 (near LEDG2/Narrow Ledge)
  | 'vair3'   // Mid-air 3
  | 'vair4'   // Mid-air 4 (TOP - crash zone!)
  | 'ledg2'   // Docked at Ledge 2 (Narrow Ledge)
  | 'ledg3'   // Docked at Ledge 3
  | 'ledg4';  // Docked at Ledge 4 (Wide Ledge)
```

### 1.3 Virtual Rooms for Balloon Positions

Create actual room entities for each balloon position:

| Position | FORTRAN | Can Dock? | Hook | Exit Direction | Leads To |
|----------|---------|-----------|------|----------------|----------|
| vlbot | VLBOT | Board only | - | - | - |
| vair1 | VAIR1 | No | - | - | - |
| vair2 | VAIR2 | No | - | - | - |
| vair3 | VAIR3 | No | - | - | - |
| vair4 | VAIR4 | **CRASH** | - | - | Death! |
| ledg2 | LEDG2 | Yes | HOOK1 | W | Narrow Ledge |
| ledg3 | LEDG3 | Yes | - | ? | ? |
| ledg4 | LEDG4 | Yes | HOOK2 | W | Wide Ledge |

**Note**: The balloon object moves between these positions. Player sees position-appropriate descriptions.

## Phase 2: Grammar & Actions

### 2.1 New Grammar Patterns

**File**: `stories/dungeo/src/index.ts` (extendParser)

```typescript
// Lighting with instrument
grammar.pattern('light :target with :instrument')
  .verb('light', 'ignite', 'burn')
  .action('light');

// Tying/untying
grammar.pattern('tie :target to :indirect')
  .verb('tie', 'attach', 'fasten', 'secure')
  .action('tie');

grammar.pattern('tie :target')
  .verb('tie', 'attach', 'fasten', 'secure')
  .action('tie');

grammar.pattern('untie :target')
  .verb('untie', 'unfasten', 'detach', 'release')
  .action('untie');

// Land balloon
grammar.pattern('land')
  .verb('land')
  .action('land');
```

### 2.2 New Actions

| Action | Directory | Purpose |
|--------|-----------|---------|
| light | `src/actions/light/` | Light guidebook with matches |
| tie | `src/actions/tie/` | Tie wire to hook |
| untie | `src/actions/untie/` | Untie wire from hook |
| land | `src/actions/land/` | Attempt to dock balloon at ledge |

### 2.3 Light Action Details

```typescript
// light-action.ts
validate(context):
  - Target must be guidebook (or other burnable)
  - Instrument must be matchbook (or lit)
  - Player must have both

execute(context):
  - Set guidebook burning state
  - Start burn fuse (limited turns)
  - Emit success event

// Handler starts balloon heat daemon
```

### 2.4 Tie/Untie Action Details

```typescript
// tie-action.ts
validate(context):
  - Must be in balloon
  - Must have braided wire
  - Must be at dockable position
  - Must not already be tethered

execute(context):
  - Set balloon.isTethered = true
  - Enable W exit from balloon position
  - Emit success event
```

## Phase 3: Balloon Movement Daemon

### 3.1 Daemon Architecture (matches FORTRAN CEVBAL)

**File**: `stories/dungeo/src/scheduler/balloon-daemon.ts`

The balloon daemon fires **every 3 turns** (not on WAIT!). It checks state and moves the balloon automatically.

```typescript
{
  id: 'balloon-daemon',
  type: 'daemon',
  interval: 3,  // Every 3 turns
  enabled: true,  // Starts enabled, disabled when tethered
  onTick: (world) => {
    const state = getBalloonState(world);
    const pos = state.position;
    const inflated = state.burningObject !== null;
    const receptacleOpen = isReceptacleOpen(world);

    // 1. At ledge? Always drift to midair
    if (isLedge(pos)) {
      driftFromLedge(world, pos);
      return;
    }

    // 2. At bottom?
    if (pos === 'vlbot') {
      if (inflated && receptacleOpen) {
        rise(world, 'vair1');
      }
      // else: stay put
      return;
    }

    // 3. In midair?
    if (inflated && receptacleOpen) {
      // Rising
      if (pos === 'vair4') {
        crash(world);  // Death!
      } else {
        rise(world, nextUp(pos));
      }
    } else {
      // Descending
      if (pos === 'vair1') {
        land(world);  // → vlbot
      } else {
        descend(world, nextDown(pos));
      }
    }
  }
}
```

### 3.2 Position Transitions

```
ASCENDING (inflated + receptacle open):
vlbot → vair1 → vair2 → vair3 → vair4 → CRASH!

DESCENDING (not inflated OR receptacle closed):
vair4 → vair3 → vair2 → vair1 → vlbot (land)

LEDGE DRIFT (always, regardless of state):
ledg2 → vair2
ledg3 → vair3
ledg4 → vair4  (dangerous! will crash next tick if rising)
```

### 3.3 Tethering Disables Daemon

```typescript
// In tie-action.ts
if (tieRopeToHook(world, hook)) {
  setBalloonState(world, { tetheredTo: hook });
  disableBalloonDaemon(world);  // CFLAG(CEVBAL)=.FALSE.
  emit("The balloon is anchored.");
}

// In untie-action.ts
if (untieRope(world)) {
  setBalloonState(world, { tetheredTo: null });
  enableBalloonDaemon(world);   // CFLAG(CEVBAL)=.TRUE.
  resetDaemonCounter(world, 3); // CTICK(CEVBAL)=3
  emit("You untie the rope.");
}
```

### 3.4 Compass Direction Handler

When player in balloon at a ledge position:

```typescript
// Command transformer or going handler
if (isInBalloon(player) && isLedge(balloonPosition)) {
  if (direction === 'west' && state.tetheredTo !== null) {
    // Tethered at ledge - can exit to the actual ledge room
    return allowMovement(getLedgeRoom(balloonPosition));
  } else if (state.tetheredTo === null) {
    // Not tethered - can't leave
    return block("You are tied to the ledge.");  // msg 547
  }
}

// In midair - no valid exits
if (isInBalloon(player) && isMidair(balloonPosition)) {
  return block("I'm afraid you can't control the balloon in this way.");
}
```

### 3.5 Board/Enter from Ground or Ledge

```typescript
// Only allow boarding when:
// 1. Balloon at VLBOT and player at Volcano Bottom room
// 2. Balloon at LEDGn, tethered, and player at corresponding ledge room

function canBoardBalloon(world, player): boolean {
  const balloon = getBalloonState(world);

  if (balloon.position === 'vlbot') {
    return getPlayerRoom(world) === 'volcano-bottom';
  }

  if (isLedge(balloon.position) && balloon.tetheredTo !== null) {
    return getPlayerRoom(world) === getLedgeRoom(balloon.position);
  }

  return false;
}
```

## Phase 4: Daemons & Fuses

### 4.1 Guidebook Burn Fuse

**File**: `stories/dungeo/src/scheduler/guidebook-fuse.ts`

```typescript
{
  id: 'guidebook-burn',
  type: 'fuse',
  turnsRemaining: 8,  // Verify from FORTRAN
  tickCondition: () => world.getStateValue('guidebook.burning'),
  onTick: () => {
    // Decrement turns, maybe show smoke message
  },
  onExpire: () => {
    world.setStateValue('guidebook.burning', false);
    world.setStateValue('guidebook.burned', true);
    emit('The guidebook has burned to ite.');
  }
}
```

### 4.2 Balloon Drift Daemon

Optionally, balloon could drift down automatically each turn if:
- No heat source (guidebook not burning)
- Receptacle is closed

Or this could only happen on WAIT. Need to verify FORTRAN behavior.

## Phase 5: Descriptions & Messages

### 5.1 Position Descriptions

Each balloon position needs a unique description showing:
- Current altitude
- What's visible (ledges, volcano walls)
- Whether docking is possible

```typescript
const BALLOON_DESCRIPTIONS: Record<BalloonPosition, string> = {
  'volcano-bottom': 'The balloon rests on the ground at the base of the volcano shaft.',
  'volcano-shaft': 'The balloon drifts through the volcano shaft. Smooth walls rise around you.',
  'near-small-ledge': 'A narrow ledge is visible to the west. You could tie off here.',
  'near-viewing-ledge': 'The balloon floats in the shaft. A viewing ledge is visible but out of reach.',
  'near-wide-ledge': 'A wide ledge extends to the west. You could tie off here.',
};
```

### 5.2 Message IDs

```typescript
// balloon-messages.ts
export const BALLOON_MESSAGES = {
  RECEPTACLE_OPENED: 'balloon.receptacle.opened',
  RECEPTACLE_CLOSED: 'balloon.receptacle.closed',
  BALLOON_RISES: 'balloon.rises',
  BALLOON_DESCENDS: 'balloon.descends',
  BALLOON_AT_TOP: 'balloon.at.top',
  BALLOON_AT_BOTTOM: 'balloon.at.bottom',
  WIRE_TIED: 'balloon.wire.tied',
  WIRE_UNTIED: 'balloon.wire.untied',
  CANNOT_LEAVE_UNTETHERED: 'balloon.cannot.leave.untethered',
  CANNOT_DOCK_HERE: 'balloon.cannot.dock.here',
  GUIDEBOOK_LIT: 'balloon.guidebook.lit',
  GUIDEBOOK_BURNED: 'balloon.guidebook.burned',
  NO_HEAT_SOURCE: 'balloon.no.heat',
};
```

## Phase 6: Integration & Testing

### 6.1 Transcript Tests

**File**: `stories/dungeo/tests/transcripts/balloon-basic.transcript`

```
# Test basic balloon boarding and receptacle
> go to volcano bottom
...
> enter balloon
You climb into the wicker basket.
> open receptacle
You open the receptacle.
> close receptacle
You close the receptacle.
> exit
You climb out of the balloon.
```

**File**: `stories/dungeo/tests/transcripts/balloon-flight.transcript`

```
# Test full balloon flight with guidebook fuel
> go to volcano bottom
...
> take braided wire
> enter balloon
> light guidebook with match
The guidebook catches fire and begins to burn.
> open receptacle
You open the receptacle. Hot air rises into the balloon.
> wait
The balloon rises through the shaft.
> wait
A narrow ledge is visible to the west.
> tie wire to hook
You secure the braided wire to the hook, tethering the balloon.
> west
You step onto the narrow ledge.
```

### 6.2 Edge Cases to Test

- [ ] Can't leave balloon mid-flight (untethered)
- [ ] Balloon descends when receptacle closed
- [ ] Balloon descends when guidebook burns out
- [ ] Can't re-light burned guidebook
- [ ] Can board from ledge when balloon is docked there
- [ ] Compass directions work when grounded at Volcano Bottom
- [ ] LOOK from balloon shows appropriate position description

## Implementation Order

1. **Phase 1**: Objects (balloon, receptacle, hook, wire)
2. **Phase 2**: Grammar patterns and basic actions (light, tie, untie)
3. **Phase 3**: Balloon movement handler (state machine, WAIT intercept)
4. **Phase 4**: Guidebook burn fuse
5. **Phase 5**: Messages and descriptions
6. **Phase 6**: Transcript tests

## Open Questions (RESOLVED from FORTRAN)

1. ✅ **Exact guidebook burn duration?** - `OSIZE(object) * 20` turns. Need to find guidebook OSIZE in dindx.dat (~40-80 turns estimated)

2. ✅ **Automatic descent?** - YES! Balloon daemon fires every 3 turns regardless of player action. Not tied to WAIT.

3. ✅ **Multiple ledge visits?** - Yes, but tricky. When at ledge, balloon always drifts to midair on next daemon tick. Must re-tie at different hook.

4. ✅ **Rope reusability?** - Yes. UNTIE clears BTIEF and re-enables daemon. Can tie to different hook.

5. ✅ **Landing at bottom?** - Automatic. Descending from VAIR1 lands at VLBOT. If not inflated, balloon crashes/destroyed.

6. ✅ **Wire vs Rope?** - It's "braided ROPE" (BROPE), not wire. Wire is for the brick/fuse explosion puzzle.

## Files to Create/Modify

### New Files
```
# Balloon objects
stories/dungeo/src/regions/volcano/objects/balloon-objects.ts  # basket, receptacle, cloth, hooks, dead-balloon
stories/dungeo/src/regions/dam/objects/stream-view-objects.ts  # braided rope

# Balloon position rooms (virtual rooms for balloon travel)
stories/dungeo/src/regions/volcano/rooms/balloon-positions.ts  # vair1-4, ledg2-4

# Actions
stories/dungeo/src/actions/light/light-action.ts     # LIGHT X WITH Y
stories/dungeo/src/actions/light/light-messages.ts
stories/dungeo/src/actions/tie/tie-action.ts         # TIE ROPE TO HOOK
stories/dungeo/src/actions/tie/tie-messages.ts
stories/dungeo/src/actions/untie/untie-action.ts     # UNTIE ROPE
stories/dungeo/src/actions/untie/untie-messages.ts

# Balloon daemon and handler
stories/dungeo/src/scheduler/balloon-daemon.ts       # 3-turn movement daemon
stories/dungeo/src/handlers/balloon/balloon-handler.ts  # boarding, directions
stories/dungeo/src/handlers/balloon/balloon-messages.ts

# Burn fuse
stories/dungeo/src/scheduler/guidebook-fuse.ts       # OSIZE*20 burn timer

# Tests
stories/dungeo/tests/transcripts/balloon-basic.transcript
stories/dungeo/tests/transcripts/balloon-flight.transcript
stories/dungeo/tests/transcripts/balloon-crash.transcript
```

### Modified Files
```
stories/dungeo/src/index.ts                          # grammar, handler/daemon registration
stories/dungeo/src/regions/volcano/index.ts          # balloon objects, position rooms
stories/dungeo/src/regions/volcano/rooms/volcano-bottom.ts  # balloon placement
stories/dungeo/src/regions/dam/index.ts              # braided rope
stories/dungeo/src/handlers/index.ts                 # export balloon handler
stories/dungeo/src/scheduler/index.ts                # export balloon daemon, burn fuse
stories/dungeo/src/actions/index.ts                  # export new actions
```

## Estimated Complexity

| Phase | Effort | Notes |
|-------|--------|-------|
| 1. Objects | Low | Standard entity creation |
| 2. Grammar/Actions | Medium | TIE/UNTIE are new patterns |
| 3. Movement Handler | High | State machine, intercepts |
| 4. Daemons | Low | Similar to existing fuses |
| 5. Descriptions | Low | Message mapping |
| 6. Testing | Medium | Multiple scenarios |

**Total**: Medium-High complexity, similar to Royal Puzzle implementation.
