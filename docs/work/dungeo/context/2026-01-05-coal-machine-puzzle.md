# Work Summary: Coal Machine Puzzle Implementation

**Date**: 2026-01-05
**Duration**: ~2 hours
**Feature/Area**: Coal Machine Puzzle (Puzzle #24/25)

## Objective

Implement the Coal Machine puzzle in the Coal Mine region - one of the classic Zork puzzles where the player must insert coal into a machine and activate it to produce a diamond treasure.

## What Was Accomplished

### Files Created/Modified

1. **`stories/dungeo/src/regions/coal-mine/objects/index.ts`** - Updated machine entity
   - Added ContainerTrait with capacity of 1 item (for coal slot)
   - Created separate switch entity with SwitchableTrait
   - Both entities placed in Machine Room

2. **`stories/dungeo/src/handlers/coal-machine-handler.ts`** - NEW
   - Event handler listening for `if.event.switched_on`
   - Validates switch is in Machine Room
   - Checks for coal in machine's container
   - Transforms coal into diamond on successful activation
   - Creates diamond entity dynamically with treasure metadata

3. **`stories/dungeo/src/handlers/index.ts`** - Added export for coal-machine-handler

4. **`stories/dungeo/src/index.ts`** - Integrated handler and messages
   - Registered handler with `registerCoalMachineHandler(world)`
   - Added three new messages:
     - `MACHINE_WHIRS`: Success message when machine creates diamond
     - `COAL_TRANSFORMS`: Description of transformation
     - `NO_COAL`: Error when switch activated without coal

5. **`stories/dungeo/tests/transcripts/coal-machine.transcript`** - NEW
   - 13 test assertions covering full puzzle sequence
   - Tests setup, coal insertion, activation, and scoring

6. **`docs/work/dungeo/implementation-plan.md`** - Updated puzzle tracking
   - Marked Coal Machine puzzle as Done
   - Updated count to 24/25 puzzles (96% complete)

### Puzzle Mechanics Implemented

**Sequence**:
1. Player navigates to Coal Mine and finds lump of coal
2. Player takes coal to Machine Room
3. `PUT COAL IN MACHINE` - Coal goes into machine's container slot
4. `TURN ON SWITCH` - Handler detects activation
5. Machine transforms coal into diamond
6. Diamond appears in room with success messages

**Scoring**:
- Diamond is worth 16 points total:
  - 10 points for taking diamond
  - 6 points for placing in trophy case

### Test Coverage

**New transcript**: `coal-machine.transcript` (13 assertions)
- Navigate to Coal Mine region
- Find and take coal
- Navigate to Machine Room
- Insert coal into machine
- Activate switch
- Verify diamond creation
- Verify coal removal
- Test error case (no coal in machine)
- Verify scoring

**All transcripts**: 750 tests in 46 transcripts
- 745 tests passing
- 5 expected failures (known issues in other areas)

## Key Decisions

1. **Container-based Coal Slot**: Used ContainerTrait on the machine entity rather than custom state tracking. This leverages existing inventory mechanics and allows natural `PUT X IN Y` commands.

2. **Separate Switch Entity**: Created switch as a distinct entity with SwitchableTrait rather than making the machine itself switchable. This matches the original game's design where the switch is a separate control.

3. **Event Handler Pattern**: Used `world.registerEventHandler('if.event.switched_on', ...)` pattern following ADR-052. Handler validates location (Machine Room) and checks machine contents before transformation.

4. **Dynamic Diamond Creation**: Diamond is created at runtime when transformation occurs, not pre-placed in the world. Uses `createDiamond()` function with treasure metadata (value: 10, trophyPoints: 6).

## Technical Implementation Details

### Machine Entity Structure
```typescript
const machine = world.createEntity('machine', Machine Room)
  .addTrait<ContainerTrait>('if.trait.container', {
    capacity: 1,
    isOpen: true,
    canOpen: false
  })
  .withDescription('enormous machine')
  .withDetail('large enough to hold a person...');
```

### Switch Entity Structure
```typescript
const machineSwitch = world.createEntity('switch', Machine Room)
  .addTrait<SwitchableTrait>('if.trait.switchable', {
    isOn: false,
    canSwitchOff: false  // One-time use
  });
```

### Handler Logic
- Listen for `if.event.switched_on` events
- Check if switch entity is in Machine Room
- Query machine's container for coal
- If coal present:
  - Remove coal from world
  - Create diamond entity in room
  - Emit transformation messages
- If no coal:
  - Emit error message

## Challenges & Solutions

### Challenge: Container Access in Handler
**Problem**: Needed to query machine's container contents from event handler.

**Solution**: Used `world.getEntitiesInContainer(machineId)` to check for coal, then `world.getTrait<ContainerTrait>(machineId, 'if.trait.container')` to access container data structure for removal.

### Challenge: One-time Switch Behavior
**Problem**: Original Zork switch can only be used once - subsequent turns produce "nothing happens".

**Solution**: Set `canSwitchOff: false` in SwitchableTrait config. Once activated, switch stays on and can't be toggled again.

## Code Quality

- All tests passing (745/750, 5 expected failures unrelated)
- TypeScript compilation successful
- Follows event handler pattern from ADR-052
- Uses standard traits (ContainerTrait, SwitchableTrait)
- Messages properly defined in story index
- Transcript testing validates full puzzle sequence

## Project Status

**Puzzle Completion**: 24/25 (96%)
- 24 puzzles fully implemented and tested
- 1 remaining puzzle: Basket mechanism (wire/basket in Volcano region)

**Test Status**: 750 tests in 46 transcripts
- 745 passing
- 5 expected failures (unrelated to coal machine)

## Next Steps

1. **Basket Puzzle** (Final puzzle, 1/25 remaining)
   - Implement basket/wire mechanism in Volcano region
   - Create handler for basket transport
   - Write transcript tests
   - Complete 25/25 puzzles (100%)

2. **Post-Puzzle Cleanup**
   - Review all 25 puzzles for consistency
   - Verify all scoring is correct (650 max points)
   - Check for any edge cases or error states
   - Polish messages and descriptions

3. **Final Testing Phase**
   - Full playthrough test
   - Verify all treasures collectible
   - Confirm winning conditions
   - Performance testing with scheduler/daemons

## References

- Implementation Plan: `docs/work/dungeo/implementation-plan.md` (Section 7.4.3)
- Puzzle Checklist: Phase 7.4 - Object-based Puzzles
- Event Handlers: ADR-052 (Event Handler Pattern)
- Container System: `packages/world-model/src/traits/container-trait.ts`
- Switchable System: `packages/world-model/src/traits/switchable-trait.ts`

## Notes

- Coal Machine puzzle represents a classic transformation mechanic - player combines item + machine to create new item
- This pattern could be abstracted for future "crafting" or "alchemy" puzzles in other stories
- Handler validation (checking location/context) prevents unintended transformations elsewhere
- Diamond's 16-point value makes it one of the higher-value treasures in the game
- With 24/25 puzzles complete, Dungeo implementation is nearing full feature parity with original Mainframe Zork
