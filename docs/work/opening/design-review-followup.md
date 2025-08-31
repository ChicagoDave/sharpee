# Opening Action - Follow-up Design Review

## Date: 2025-08-31
## Status: Refactoring Complete

## Summary of Changes

We successfully refactored the opening action to follow atomic event principles and the three-phase pattern. The action now emits minimal, discrete facts that can be composed by downstream layers.

## Implemented Design Decisions

### 1. Atomic Event Structure ✅

**What we did:**
- Simplified `if.event.opened` to contain only `targetId` and `targetName`
- Created separate `if.event.revealed` events for each item in a container
- Removed all computed/redundant fields (hasContents, contentsCount, etc.)

**Why this is better:**
- Each event represents one discrete fact
- No duplication of information 
- Platform can query for additional data as needed
- Events are composable for different presentation needs

### 2. Three-Phase Pattern Implementation ✅

**What we did:**
- `validate()`: Checks preconditions (has target, is openable, not already open, not locked)
- `execute()`: Delegates to OpenableBehavior.open(), stores result in sharedData
- `report()`: Generates all events based on validation result and execution outcome

**Why this is better:**
- Clear separation of concerns
- No validation logic in execute phase
- All events generated in one place
- Proper error handling at each phase

### 3. Separation of Concerns ✅

**Stdlib (Mechanical Facts):**
- Entity X was opened
- Items Y and Z were revealed in container X
- Success/error status with basic message keys

**Story Layer (Narrative Enhancement):**
- Custom descriptions based on container type
- Sensory effects (smells, sounds, light changes)
- Dramatic reveals or special sequences

**Platform Layer (Presentation):**
- Grouping revealed items for display
- Formatting lists with proper grammar
- Managing text flow and pagination

## Technical Improvements

### SharedData Pattern
- Replaced context pollution `(context as any)._openResult` 
- Now using typed `context.sharedData.openResult`
- Created `OpeningSharedData` interface for type safety

### Event Data Interfaces
```typescript
// Before: Fat event with everything
interface OpenedEvent {
  targetId, targetName, containerName, 
  hasContents, contentsCount, revealedItems, ...
}

// After: Minimal atomic events
interface OpenedEventData {
  targetId: EntityId;
  targetName: string;
}

interface RevealedEventData {
  itemId: EntityId;
  itemName: string;
  containerId: EntityId;
  containerName: string;
}
```

### Test Infrastructure
- Updated to use AuthorModel for proper test setup
- AuthorModel can add items to closed containers (bypasses validation)
- Fixed expectEvent helper limitations with multiple events of same type

## Lessons Learned

### 1. Entity Creation in Tests
**Issue:** AuthorModel.createEntity doesn't auto-add traits based on EntityType
**Solution:** Explicitly add required traits when using AuthorModel
**Lesson:** Test utilities have different behaviors than runtime code - document these differences

### 2. Event Testing with Multiple Instances
**Issue:** expectEvent() only finds first event of a type
**Solution:** Filter events and check collections rather than individual events
**Lesson:** Test helpers need to handle multiple events of the same type gracefully

### 3. Atomic Events Require Different Thinking
**Issue:** Initial instinct was to pack all related data into one event
**Solution:** Emit multiple simple events that each state one fact
**Lesson:** Think in terms of facts, not presentations

## Remaining Considerations

### 1. Door Opening and Exit Revelation
Currently simplified - full implementation would need:
- Access to room's exit configuration
- Understanding of bidirectional connections
- Potential revelation of multiple exits

**Recommendation:** Defer to story layer via event handlers for now

### 2. Performance with Many Items
Opening a container with 100+ items generates 100+ events. 

**Observation:** This is correct design - each reveal is a discrete fact
**Potential optimization:** Could batch in platform layer if needed, but keep events atomic

### 3. Event Ordering
Events are generated in a specific order (opened → revealed → success), but we don't guarantee order preservation through the event system.

**Recommendation:** Event handlers shouldn't rely on ordering - each event should be self-contained

## Design Validation Against IF Principles

✅ **Simulationist Approach**: Opening changes world state via behaviors
✅ **Parser Agnostic**: Action doesn't care how command was parsed  
✅ **Extensible**: Event handlers can add any custom behavior
✅ **Testable**: Clear phases make testing straightforward
✅ **Reusable**: Other actions can leverage revealed events

## Comparison with Traditional IF Systems

### Inform 7
- Bundles opening + listing in one operation
- Heavy use of rulebooks for customization
- We achieve similar flexibility through events

### TADS 3
- Uses nested operations (opening triggers examining)
- We keep operations atomic, compose via events

### Our Approach
- More granular and composable
- Better separation of concerns
- Easier to test and debug

## Next Steps for Other Actions

This refactoring establishes patterns that should be applied to other actions:

1. **Taking**: Should emit atomic `taken` event, separate `capacity_changed` events
2. **Dropping**: Should emit atomic `dropped` event, separate `position` events  
3. **Examining**: Should emit atomic facts about what's observed
4. **Going**: Should emit movement facts, let story layer handle descriptions

## Conclusion

The opening action refactoring successfully demonstrates:
- Atomic event principles in practice
- Three-phase pattern implementation
- Clear separation between mechanical and narrative concerns
- Improved testability and maintainability

This serves as a reference implementation for refactoring other stdlib actions.