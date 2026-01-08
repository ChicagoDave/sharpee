## Summary of Going Action

The going action handles player and actor movement through room exits in cardinal and custom directions. It checks exit availability, validates door states (open/closed/locked), tracks first visits to rooms, and emits three movement events (exited, moved, entered) plus a room description event upon success.

## Implementation Analysis

**Four-Phase Pattern Compliance**: ✅ YES
- `validate()` - Line 75: Checks direction, player location, room trait, exit existence, blocked exits, door states, and destination
- `execute()` - Line 203: Moves player entity to destination, marks destination as visited
- `report()` - Line 248: Emits 4 semantic events (actor_exited, actor_moved, actor_entered, room.description)
- `blocked()` - Line 315: Emits action.blocked events when validation fails

**World State Mutation**: ✅ CORRECTLY IMPLEMENTED
- Line 236: `context.world.moveEntity(actor.id, destination.id)` - Actually moves player
- Line 240: `RoomBehavior.markVisited(destination, actor)` - Marks room visited on first visit
- Both mutations occur in execute phase (correct pattern)

**Event Emission**: ✅ CORRECT
- Events are emitted from report() phase, not execute
- Three movement events properly structure actor/room data
- Room description event includes destination snapshot and contents
- All events use data builders that capture snapshots atomically

## Test Coverage Analysis

**Test File**: `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/going-golden.test.ts` (822 lines)

### Four-Phase Tests (Lines 52-89)
- ✅ Validates presence of all four methods
- ✅ Confirms report() generates ALL events
- ✅ Verifies events include movement data (direction, fromRoom, toRoom)

### Precondition Checks (Lines 117-358)
Tests ALL validation failures:
- ✅ No direction specified
- ✅ Actor in container (not in room)
- ✅ Room has no exits
- ✅ No exit in specified direction (proper error params)
- ✅ Door closed
- ✅ Door locked (both locked and closed states)
- ✅ Destination not found
- ✅ Dark room without light (line 323-358)

**Validation coverage: 8/8 error cases**

### Success Cases (Lines 361-591)
- ✅ Cardinal direction movement (lines 362-425)
- ✅ Direction abbreviations (NE, NW, SE, SW, UP, DOWN, IN, OUT) - lines 427-459
- ✅ First visit tracking with firstVisit flag (lines 461-506)
- ✅ Movement through open door (lines 508-546)
- ✅ Movement to dark room WITH light (lines 548-591)
- ✅ Direction from directObject instead of extras (lines 593-628)

**Success coverage: 6 scenarios**

### Event Structure (Lines 631-718)
- ✅ Proper entity references in events
- ✅ ALL opposite directions tested in loop (lines 666-717)
  - north/south, east/west, northeast/southwest, etc.
  - up/down, in/out
- ✅ Each pair tested for correct oppositeDirection value

### Metadata Tests (Lines 91-115)
- ✅ Action ID correct
- ✅ All 13 required messages declared
- ✅ Group = "movement"

## Gaps Identified

### CRITICAL GAP: No World State Verification After Movement
The tests verify that:
- ✅ Events are emitted with correct data
- ✅ Event structures are valid
- ❌ **The player is actually in the destination room after move**
- ❌ **Visited flag is actually set on the destination**
- ❌ **The previous room no longer contains the player**

**Example of what's missing** (from lines 362-425):
```typescript
test('should move in cardinal direction', () => {
  // ... setup ...
  const events = executeAction(goingAction, context);
  
  // Current: Tests event content
  expectEvent(events, 'if.event.actor_moved', {
    direction: Direction.NORTH,
    fromRoom: room1.id,
    toRoom: room2.id
  });
  
  // MISSING: Verify actual world state
  // const actualLocation = context.world.getLocation(player.id);
  // expect(actualLocation).toBe(room2.id);  // ← SHOULD BE HERE
  // 
  // const room2Visited = RoomBehavior.hasBeenVisited(room2);
  // expect(room2Visited).toBe(true);  // ← SHOULD BE HERE
});
```

### Evidence This Gap Matters
The dropping action had an identical bug (see `/mnt/c/repotemp/sharpee/docs/work/dungeo/context/2026-01-07-stdlib-dropping-fix.md`):
- Action emitted events correctly ✅
- Action reported success ✅
- **But never moved entities** ❌
- Bug went undetected for months because all tests checked reporting, not world state
- Only discovered when NPC code called `getContents()` and got empty results

### Secondary Gap: Light Availability Not Checked
- Line 323-358 tests dark room movement and expects it to FAIL
- But code comment (lines 196-198) explicitly says darkness doesn't block movement:
  ```typescript
  // Note: We allow entry to dark rooms - you just can't see.
  // Darkness affects visibility (looking), not movement.
  ```
- **This test contradicts the implementation's stated design**
- The `too_dark` message is declared in requiredMessages but never actually returned by validate()

### Tertiary Gap: Vehicle Containment Not Tested
- Line 104: `canActorWalkInVehicle()` is called in validate
- Tests have a "not in room" test (lines 130-147) that uses a container
- But no test verifies what happens with a **vehicle that allows walking** vs one that **blocks walking**
- No test for bucket (blocks movement) vs boat (allows movement)

## Recommendations

### PRIORITY 1: Add World State Verification Tests
Add these patterns to the "Successful Movement" describe block:

```typescript
test('should actually move player to destination', () => {
  // ... setup rooms and movement ...
  const events = executeAction(goingAction, context);
  
  // Verify event says moved
  expectEvent(events, 'if.event.actor_moved', { toRoom: room2.id });
  
  // Verify WORLD STATE changed
  const actualLocation = context.world.getLocation(player.id);
  expect(actualLocation).toBe(room2.id);  // ← CRITICAL
});

test('should mark destination room as visited on first visit', () => {
  // ... setup new room ...
  const isVisitedBefore = RoomBehavior.hasBeenVisited(room2);
  expect(isVisitedBefore).toBe(false);
  
  executeAction(goingAction, context);
  
  // Verify state changed
  const isVisitedAfter = RoomBehavior.hasBeenVisited(room2);
  expect(isVisitedAfter).toBe(true);  // ← CRITICAL
});

test('should not re-mark visited room', () => {
  // ... setup with room2 already visited ...
  executeAction(goingAction, context);
  
  // Second move to another room, then back
  executeAction(goingAction, context2);
  
  // Visit flag should not be re-set on already-visited room
  expect(visitedTimestamp).toBe(firstTimestamp);
});
```

### PRIORITY 2: Fix Darkness Test Logic
Either:
- **Option A**: Remove the darkness test (lines 323-358) if darkness truly doesn't block movement
- **Option B**: Modify validate() to actually check darkness and return too_dark error
- Document which behavior is intentional

### PRIORITY 3: Add Vehicle Containment Tests
```typescript
test('should fail when contained in bucket (blocks walking)', () => {
  // Setup: player in bucket
  const walkCheck = canActorWalkInVehicle(context.world, player.id);
  expect(walkCheck.canWalk).toBe(false);
  
  const events = executeAction(goingAction, context);
  expectEvent(events, 'action.blocked', { 
    messageId: 'not_in_room'
  });
});

test('should succeed when in boat (allows walking)', () => {
  // Setup: player in boat
  const walkCheck = canActorWalkInVehicle(context.world, player.id);
  expect(walkCheck.canWalk).toBe(true);
  
  const events = executeAction(goingAction, context);
  expectEvent(events, 'if.event.actor_moved');
});
```

### PRIORITY 4: Add Integration Tests
Use transcript tests like `robot-commands.transcript` to verify:
- Player location actually changes (via `debug` command queries)
- Room contents reflect moved player
- Second movement from new location succeeds

## Risk Level: MEDIUM-HIGH

**Why MEDIUM-HIGH rather than HIGH:**
- Implementation IS correct (mutations are happening) - reduces immediate risk
- Event reporting is comprehensive - reduces symptoms visibility
- BUT: Zero world state verification allows similar bugs to slip through undetected
- The dropping action bug proves this exact pattern hides critical failures
- NPC testing will reveal bugs that human testing misses

**Likelihood bugs would be undetected**: HIGH
- If execute phase forgot moveEntity (like dropping did), all tests pass
- If visited flag marking broke, no test catches it
- If directional movement stored wrong room IDs, events would still emit

**Recommendation**: Add world state verification tests BEFORE adding more complex movement features (vehicles, followers, teleportation).

---

## Summary Table

| Aspect | Coverage | Status |
|--------|----------|--------|
| Four-phase pattern | Complete | ✅ |
| Validation errors | 8/8 cases | ✅ |
| Success scenarios | 6 cases | ✅ |
| Event structure | All types | ✅ |
| World state after move | **0 tests** | ❌ CRITICAL |
| Visited flag setting | **0 tests** | ❌ CRITICAL |
| Vehicle containment | **0 tests** | ❌ |
| Darkness behavior | Contradicts code | ⚠️ |

**Test count**: 30 tests, covering mostly happy path event generation, with NO world state mutations verified.
