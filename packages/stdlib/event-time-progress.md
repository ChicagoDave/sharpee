# Event Time Implementation Progress

## Phase 1: ADR-041 - Simplified Action Context ✅

### Completed
- Updated `EnhancedActionContext` interface to use single `event()` method
- Updated `EnhancedActionContextImpl` to implement new interface
- Created migration guide with patterns
- Updated `closing` action as reference implementation

### Key Achievement
The context API is now simplified from 6 methods to 1 method, making it easier to use and maintain.

## Phase 2: ADR-042 - Stdlib Action Migration

### Completed Actions

**Total: 37 of ~40 actions migrated (92.5%)**

1. **Closing Action** ✅ (R&D Phase)
   - Already had folder structure
   - Updated to use new `context.event()` method
   - Has typed event interfaces

2. **Taking Action** ✅ (Priority 1)
   - Created folder structure
   - Created typed event interfaces:
     - `TakenEventData`
     - `TakingErrorData` 
     - `RemovedEventData`
   - Migrated to use `context.event()`
   - Updated imports

3. **Dropping Action** ✅ (Priority 1)
   - Created folder structure
   - Created typed event interfaces:
     - `DroppedEventData`
     - `DroppingErrorData`
   - Migrated to use `context.event()`
   - Updated imports

4. **Examining Action** ✅ (Priority 1)
   - Created folder structure
   - Created typed event interfaces:
     - `ExaminedEventData`
     - `ExaminingErrorData`
   - Migrated to use `context.event()`
   - Updated imports

5. **Going Action** ✅ (Priority 1)
   - Created folder structure
   - Created typed event interfaces:
     - `ActorMovedEventData`
     - `ActorExitedEventData`
     - `ActorEnteredEventData`
     - `GoingErrorData`
   - Migrated to use `context.event()`
   - Updated imports

6. **Opening Action** ✅ (Priority 2)
   - Created folder structure
   - Created typed event interfaces:
     - `OpenedEventData`
     - `OpeningErrorData`
   - Migrated to use `context.event()`
   - Updated imports
   - Added missing 'its_empty' message logic

7. **Locking Action** ✅ (Priority 2)
   - Created folder structure
   - Created typed event interfaces:
     - `LockedEventData`
     - `LockingErrorData`
   - Migrated to use `context.event()`
   - Updated imports

8. **Unlocking Action** ✅ (Priority 2)
   - Created folder structure
   - Created typed event interfaces:
     - `UnlockedEventData`
     - `UnlockingErrorData`
   - Migrated to use `context.event()`
   - Updated imports

9. **Giving Action** ✅ (Priority 3)
   - Created folder structure
   - Created typed event interfaces:
     - `GivenEventData`
     - `GivingEventMap`
   - Migrated to use `context.event()`
   - Updated imports
   - Tests: giving-golden.test.ts (no import changes needed)

10. **Showing Action** ✅ (Priority 3)
    - Created folder structure
    - Created typed event interfaces:
      - `ShownEventData`
      - `ShowingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: showing-golden.test.ts (no import changes needed)

11. **Putting Action** ✅ (Priority 3)
    - Created folder structure
    - Created typed event interfaces:
      - `PutInEventData`
      - `PutOnEventData`
      - `PuttingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: putting-golden.test.ts (no import changes needed)

12. **Inserting Action** ✅ (Priority 3)
    - Created folder structure
    - Created typed event interfaces:
      - Reuses `PutInEventData` from putting
      - `InsertingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: inserting-golden.test.ts (no import changes needed)

13. **Removing Action** ✅ (Priority 3)
    - Created folder structure
    - Created typed event interfaces:
      - Reuses `TakenEventData` from taking
      - `RemovingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: removing-golden.test.ts (no import changes needed)

14. **Throwing Action** ✅ (Priority 3)
    - Created folder structure
    - Created typed event interfaces:
      - `ThrownEventData`
      - `ItemDestroyedEventData`
      - `ThrowingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: throwing-golden.test.ts (no import changes needed)

15. **Looking Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `LookedEventData`
      - `RoomDescriptionEventData`
      - `ListContentsEventData`
      - `LookingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: looking-golden.test.ts (no import changes needed)

16. **Inventory Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `InventoryItem`
      - `InventoryEventData`
      - `InventoryEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: inventory-golden.test.ts (no import changes needed)

17. **Waiting Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `WaitedEventData`
      - `WaitingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: waiting-golden.test.ts (no import changes needed)

18. **Sleeping Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `SleptEventData`
      - `SleepingErrorData`
      - `SleepingEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: sleeping.test.ts (no import changes needed)

19. **Scoring Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `ScoreDisplayedEventData`
      - `ScoringErrorData`
      - `ScoringEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

20. **Help Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `HelpDisplayedEventData`
      - `HelpEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

21. **About Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `AboutDisplayedEventData`
      - `AboutEventMap`
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

22. **Switching On Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `SwitchedOnEventData`
      - `SwitchingOnErrorData`
      - `SwitchingOnEventMap`
    - Complex implementation with light source handling
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: switching_on-golden.test.ts (no import changes needed)

23. **Switching Off Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `SwitchedOffEventData`
      - `SwitchingOffErrorData`
      - `SwitchingOffEventMap`
    - Handles darkness detection when lights turn off
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: switching_off-golden.test.ts (no import changes needed)

24. **Entering Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `EnteredEventData`
      - `EnteringErrorData`
      - `EnteringEventMap`
    - Supports containers, supporters, and entry trait
    - Migrated to use `context.event()`
    - Updated imports

25. **Exiting Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `ExitedEventData`
      - `ExitingErrorData`
      - `ExitingEventMap`
    - Handles exit prepositions (out of, off, from under, etc.)
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

26. **Climbing Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `ClimbedEventData`
      - `ClimbingErrorData`
      - `ClimbingEventMap`
    - Supports both directional (up/down) and object climbing
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

27. **Searching Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `SearchedEventData`
      - `SearchingErrorData`
      - `SearchingEventMap`
    - Finds concealed items in containers/supporters/locations
    - Migrated to use `context.event()`
    - Updated imports
    - No test file found

28. **Listening Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `ListenedEventData`
      - `ListeningErrorData`
      - `ListeningEventMap`
    - Detects sounds from devices, containers, and environment
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: listening-golden.test.ts (no import changes needed)

29. **Smelling Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `SmelledEventData`
      - `SmellingErrorData`
      - `SmellingEventMap`
    - Detects scents from food, drinks, burning objects
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: smelling-golden.test.ts (no import changes needed)

30. **Touching Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `TouchedEventData`
      - `TouchingErrorData`
      - `TouchingEventMap`
    - Detects temperature, texture, and special properties
    - Supports multiple touch verbs (poke, pat, stroke, etc.)
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: touching-golden.test.ts (no import changes needed)

31. **Pushing Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `PushedEventData`
      - `PushingErrorData`
      - `PushingEventMap`
    - Handles buttons, moveable objects, heavy objects
    - Supports directional pushing and passage revealing
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: pushing-golden.test.ts (no import changes needed)

32. **Pulling Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `PulledEventData`
      - `PullingErrorData`
      - `PullingEventMap`
    - Complex implementation with lever/cord/attachment support
    - Handles bell pulls, detachable items, and valves
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: pulling-golden.test.ts (no import changes needed)

33. **Turning Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `TurnedEventData`
      - `TurningErrorData`
      - `TurningEventMap`
    - Supports dials, knobs, wheels, cranks, and valves
    - Handles multi-turn mechanisms and settings
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: turning-golden.test.ts (no import changes needed)

34. **Wearing Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `WornEventData`
      - `WearingErrorData`
      - `WearingEventMap`
    - Handles body part conflicts and layering
    - Supports implicit taking when needed
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: wearing-golden.test.ts (no import changes needed)

35. **Taking Off Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `RemovedEventData`
      - `TakingOffErrorData`
      - `TakingOffEventMap`
    - Checks layering conflicts (can't remove under layers)
    - Handles cursed items
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: taking_off-golden.test.ts (no import changes needed)

36. **Eating Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `EatenEventData`
      - `EatingErrorData`
      - `EatingEventMap`
    - Tracks nutrition, portions, taste, and effects
    - Supports verb variations (nibble, taste, devour)
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: eating-golden.test.ts (no import changes needed)

37. **Drinking Action** ✅ (Priority 4)
    - Created folder structure
    - Created typed event interfaces:
      - `DrunkEventData`
      - `DrinkingErrorData`
      - `DrinkingEventMap`
    - Handles both drinkable items and containers with liquid
    - Tracks thirst satisfaction and special effects
    - Migrated to use `context.event()`
    - Updated imports
    - Tests: drinking-golden.test.ts (no import changes needed)

### Migration Pattern Established

1. **Folder Structure**:
   ```
   /actions/standard/[action]/
     ├── [action].ts          # Action implementation
     ├── [action]-events.ts   # Event type definitions
     └── index.ts            # Module exports
   ```

2. **Event Types Pattern**:
   - Domain events: `[Action]EventData` (e.g., `TakenEventData`)
   - Error events: `[Action]ErrorData` (e.g., `TakingErrorData`)
   - Related events: Named specifically (e.g., `RemovedEventData`)

3. **Migration Steps**:
   - Create folder and event types
   - Copy action and update to use `context.event()`
   - Create index.ts with exports
   - Update imports in standard/index.ts
   - Update imports in tests

### Priority 1 Actions Completed! ✅

All Priority 1 (Core) actions have been successfully migrated:
- Taking
- Dropping
- Examining
- Going

### Priority 2 Actions Progress

All Priority 2 (Manipulation) actions have been successfully migrated:
- Closing (from R&D phase)
- Opening
- Locking
- Unlocking

### Priority 3 Actions Progress (6/6 complete) ✅

- [x] Giving Action ✅
- [x] Showing Action ✅
- [x] Putting Action ✅
- [x] Inserting Action ✅
- [x] Removing Action ✅
- [x] Throwing Action ✅

### Priority 4 Actions Progress (23/26+ completed)

- [x] Looking Action ✅
- [x] Inventory Action ✅
- [x] Waiting Action ✅
- [x] Sleeping Action ✅
- [x] Scoring Action ✅
- [x] Help Action ✅
- [x] About Action ✅
- [x] Switching On Action ✅
- [x] Switching Off Action ✅
- [x] Entering Action ✅
- [x] Exiting Action ✅
- [x] Climbing Action ✅
- [x] Searching Action ✅
- [x] Listening Action ✅
- [x] Smelling Action ✅
- [x] Touching Action ✅
- [x] Pushing Action ✅
- [x] Pulling Action ✅  
- [x] Turning Action ✅
- [x] Wearing Action ✅
- [x] Taking Off Action ✅
- [x] Eating Action ✅
- [x] Drinking Action ✅
- [ ] Talking Action

## Next Steps

1. ✅ Priority 1 actions complete!
2. ✅ Priority 2 actions complete!
3. Continue with Priority 3 actions (giving/showing next)
3. Continue through Priority 3 and 4 actions
4. Run comprehensive tests
5. Update documentation

## Notes

- Tests continue to pass with new structure
- Import paths in tests need updating alongside source files
- The pattern is now well-established and can be applied mechanically
