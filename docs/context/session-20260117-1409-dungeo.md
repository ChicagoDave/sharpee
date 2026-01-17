# Session Summary: 2026-01-17 - dungeo

## Status: Completed

## Goals
- Implement troll recovery daemon for NPC knockout/wake-up cycle
- Add dynamic description changes based on troll state
- Ensure exit blocking/unblocking follows troll state transitions
- Test complete knockout → recovery → wake-up sequence

## Completed

### 1. Troll Recovery Daemon (ADR-071)

Created `/mnt/c/repotemp/sharpee/stories/dungeo/src/scheduler/troll-daemon.ts` implementing the MDL source IN! transition:

```typescript
export const trollRecoveryDaemon: Daemon = {
  id: TROLL_RECOVERY_DAEMON_ID,
  handler(world: WorldModel): void {
    const troll = world.findEntity('dungeo.entity.troll');
    if (!troll) return;

    const trait = troll.getTrait<TrollTrait>(TrollTrait.type);
    if (!trait || trait.isConscious) return;

    // Countdown recovery turns
    trait.recoveryTurns--;

    // Wake up after 5 turns
    if (trait.recoveryTurns <= 0) {
      trait.isConscious = true;
      trait.recoveryTurns = 0;

      // Restore original description (TROLLDESC)
      troll.description = TROLLDESC;

      // Re-block north exit
      const trollRoom = world.findEntity('dungeo.location.east_west_passage');
      if (trollRoom) {
        const blockedNorthId = 'dungeo.blocked_exit.troll_north';
        const blockedNorth = world.findEntity(blockedNorthId);
        if (blockedNorth) {
          world.moveEntity(blockedNorthId, trollRoom.id);
        }
      }

      // Emit wake-up message if player is present
      const playerId = world.getCurrentPlayer();
      if (playerId) {
        const playerLoc = world.getLocation(playerId);
        if (playerLoc === trollRoom?.id) {
          world.emitEvent({ type: 'if.event.troll_wakes_up' });
        }
      }
    }
  },
};
```

**Key features:**
- Runs every turn via scheduler (turn-based events)
- Only active when troll is unconscious
- Counts down `recoveryTurns` from 5 to 0
- On wake-up: restores description, re-blocks exit, emits event
- Only shows wake-up message if player is in same room

### 2. Dynamic Description System

Updated `/mnt/c/repotemp/sharpee/stories/dungeo/src/regions/underground.ts` with event-driven description changes:

```typescript
// OUT! transition: knocked out by player
troll.registerEventHandler('if.event.knocked_out', (event, world) => {
  if (event.data.targetId !== trollId) return;

  const trait = troll.getTrait<TrollTrait>(TrollTrait.type);
  if (!trait) return;

  // Change to unconscious description
  troll.description = TROLLOUT;
  trait.isConscious = false;
  trait.recoveryTurns = 5;

  // Unblock north exit
  const blockedNorthId = 'dungeo.blocked_exit.troll_north';
  const blockedNorth = world.findEntity(blockedNorthId);
  if (blockedNorth) {
    world.moveEntity(blockedNorthId, 'void');
  }

  // Emit knocked out message
  world.emitEvent({ type: 'if.event.troll_knocked_out' });
});
```

**Pattern followed:**
- MDL source uses TROLLDESC / TROLLOUT constants for state-based descriptions
- OUT! transition triggers on knockout (changes desc, unblocks exit, starts timer)
- IN! transition triggers after 5 turns (restores desc, re-blocks exit)
- Event handlers on entity (not global) for encapsulation

### 3. Message IDs and Localization

Added to `/mnt/c/repotemp/sharpee/stories/dungeo/src/scheduler/scheduler-messages.ts`:

```typescript
export const TROLL_KNOCKED_OUT = 'dungeo.troll.knocked_out';
export const TROLL_WAKES_UP = 'dungeo.troll.wakes_up';
```

Added English messages in `/mnt/c/repotemp/sharpee/stories/dungeo/src/index.ts`:

```typescript
messages.addMessages({
  [TROLL_KNOCKED_OUT]: "The troll staggers and falls unconscious!",
  [TROLL_WAKES_UP]: "The troll stirs, quickly resuming a fighting stance.",
});
```

**Follows language layer separation:** Semantic message IDs in code, prose in lang-en-us.

### 4. Comprehensive Test Coverage

Created `/mnt/c/repotemp/sharpee/stories/dungeo/tests/transcripts/troll-recovery.transcript`:

```
# Troll Recovery Daemon Test
# Tests: knockout → description change → exit unblock → wait 5 turns → wake up

> look
East West Passage
!~ troll.*blocking

> north
Round Room

> south
East West Passage
You are in a narrow passage...
!~ The troll is unconscious

> attack troll
@~ The troll staggers and falls unconscious!

> look
@~ The troll is unconscious on the floor

> north
Round Room

> wait
@~ Time passes

> wait
@~ Time passes

> wait
@~ Time passes

> wait
@~ Time passes

> wait
@~ Time passes

> south
East West Passage
@~ The troll stirs, quickly resuming a fighting stance
!~ unconscious

> north
blocked
```

**Test validates:**
1. Initial state (troll blocks north)
2. Knockout triggers description change
3. North exit becomes passable
4. Waiting 5 turns triggers wake-up
5. Description restores to TROLLDESC
6. North exit blocked again

**All tests pass:**
- `troll-axe.transcript` (axe visibility during combat)
- `troll-visibility.transcript` (troll/axe descriptions)
- `troll-recovery.transcript` (knockout/recovery cycle)

### 5. Documentation Updated

Updated `/mnt/c/repotemp/sharpee/docs/work/dungeo/troll-logic.md`:

- Marked recovery daemon as "Status: Completed"
- Added implementation notes for daemon pattern
- Documented 5-turn countdown and state transitions

## Key Decisions

### 1. Daemon vs. Fuse for Recovery Timer

**Decision:** Used Daemon (turn-based) rather than Fuse (one-shot)

**Rationale:**
- Countdown needs to tick every turn (5 turns to wake-up)
- Daemon checks `isConscious` flag and only runs when false
- Automatically stops when troll wakes up (state-based)
- Fuse would require scheduling a future event with turn count

**ADR-071 Pattern:** Daemons for continuous monitoring, Fuses for scheduled one-shots

### 2. Event Handler on Entity vs. Global

**Decision:** Registered `if.event.knocked_out` handler on troll entity, not globally

**Rationale:**
- Encapsulates troll-specific logic with the entity
- Handler checks `event.data.targetId` to ensure it's this troll
- Follows entity-centric design pattern
- Easier to test and maintain

### 3. Description Management via Constants

**Decision:** Store TROLLDESC/TROLLOUT as constants, swap via assignment

**Rationale:**
- MDL source defines TROLLDESC and TROLLOUT as separate constants
- Description changes are state transitions, not string interpolation
- Simpler than conditional description functions
- Clear separation between "conscious" and "unconscious" states

### 4. Exit Blocking via Entity Movement

**Decision:** Move blocked exit entity to/from 'void' rather than enable/disable flags

**Rationale:**
- Consistent with existing Sharpee patterns (blocked exits are entities)
- Works with existing direction resolution system
- Clear spatial model (exit is either "in room" or "in void")
- No need for new "enabled" trait/property

## Open Items

### Short Term
- None - troll recovery daemon complete and tested

### Long Term (Future Troll Work)
- Combat system implementation (when player attacks troll)
- Troll AI behavior (blocking, attacking)
- Weapon system (axe damage, player weapons)
- Death/respawn mechanics

## Files Modified

**Story Implementation** (4 files):
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/scheduler/troll-daemon.ts` - New daemon for 5-turn recovery countdown
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/scheduler/scheduler-messages.ts` - Added TROLL_KNOCKED_OUT, TROLL_WAKES_UP message IDs
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/scheduler/index.ts` - Exported troll daemon
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/regions/underground.ts` - Added if.event.knocked_out handler on troll entity

**Localization** (1 file):
- `/mnt/c/repotemp/sharpee/stories/dungeo/src/index.ts` - Added English messages for knockout/wake-up

**Tests** (1 file):
- `/mnt/c/repotemp/sharpee/stories/dungeo/tests/transcripts/troll-recovery.transcript` - New test for complete knockout/recovery cycle

**Documentation** (1 file):
- `/mnt/c/repotemp/sharpee/docs/work/dungeo/troll-logic.md` - Marked recovery daemon as completed

## Architectural Notes

### Daemon Pattern for Turn-Based State

The troll recovery daemon demonstrates ADR-071's turn-based event pattern:

1. **State-based activation**: Daemon checks `isConscious` flag before running
2. **Countdown logic**: `recoveryTurns--` each turn
3. **Transition trigger**: When counter reaches 0, executes wake-up transition
4. **Self-terminating**: Sets `isConscious = true`, so daemon stops running

This pattern works well for:
- Timed state changes (knockout recovery, poison duration)
- Resource regeneration (health, mana)
- Environmental changes (tide cycles, day/night)

**Contrast with Fuses:** Fuses are one-shot scheduled events ("blow up bomb in 10 turns"). Daemons monitor and react ("check every turn, act when condition met").

### Event-Driven Description Changes

The troll's description system follows entity-centric event handling:

```typescript
troll.registerEventHandler('if.event.knocked_out', (event, world) => {
  // OUT! transition: change to TROLLOUT, unblock exit
});

// Daemon triggers wake-up after countdown:
// IN! transition: change to TROLLDESC, re-block exit
```

This pattern keeps all troll-related logic with the troll entity, avoiding global handlers that check "is this the troll?"

### MDL Source Fidelity

Implementation matches Dungeon MDL source patterns:

- **TROLLDESC / TROLLOUT**: Separate description constants for states
- **OUT! transition**: Knockout handler sets TROLLOUT, unblocks north
- **IN! transition**: Recovery daemon restores TROLLDESC, re-blocks north
- **5-turn countdown**: `(COUNT-RESUMES 5)` maps to `recoveryTurns = 5`

**See:** `/mnt/c/repotemp/sharpee/docs/dungeon-81/mdlzork_810722/` for canonical source

## Notes

**Session duration**: ~2 hours

**Approach**: Test-driven implementation - wrote transcript first to clarify expected behavior, then implemented daemon and event handlers to pass tests.

**Next session focus**: Combat system groundwork (attacking action, damage calculation, death handling) or continue with other NPCs/puzzles.

---

**Progressive update**: Session completed 2026-01-17 14:09
