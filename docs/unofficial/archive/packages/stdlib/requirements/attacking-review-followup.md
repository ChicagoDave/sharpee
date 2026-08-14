# Attacking Action - Review Followup

## Rating Change: 2.0 → 9.0 / 10

## Summary
The attacking action was successfully refactored from a complex 450+ line implementation to a minimal 181-line action that follows the three-phase pattern.

## Problems Fixed

### 1. Non-Deterministic Validation
**Issue**: Used Math.random() in validation phase, making validation non-deterministic
**Solution**: Replaced with hash-based deterministic reaction selection

### 2. Non-Existent Trait References
**Issue**: Referenced FRAGILE and BREAKABLE traits that don't exist in world-model
**Solution**: Removed all references to non-existent traits

### 3. Complex Breaking Logic
**Issue**: Action contained 200+ lines of breaking/destruction logic
**Solution**: Removed - this belongs in story event handlers

### 4. Architecture Violation
**Issue**: Action tried to handle all combat complexity internally
**Solution**: Simplified to validate + emit event pattern

## Current Implementation

### Validate Phase
- Checks if target exists
- Validates target can be attacked (not the actor)
- Returns valid/invalid

### Execute Phase  
- Emits 'if.event.attacked' event with attack data
- Lets story handlers determine results
- Shows simple success message

## Event Data Structure
```typescript
interface AttackedEventData {
  target: EntityId;
  targetName: string;
  attacker: EntityId;
  attackerName: string;
  weapon?: EntityId;
  weaponName?: string;
}
```

## Migration Guide for Story Authors

### Old Pattern (No Longer Supported)
```typescript
// Actions used to handle breaking internally
entity.add(new FragileTrait({ 
  breaks: true,
  breakMessage: "shatters"
}));
```

### New Pattern (Event-Driven)
```typescript
// Handle attack results in story event handlers
engine.on('if.event.attacked', (event) => {
  if (event.data.target === 'vase') {
    // Custom breaking logic here
    engine.destroy(event.data.target);
    engine.narrate("The vase shatters!");
  }
});
```

## Design Rationale

1. **Removed Traits**: FRAGILE and BREAKABLE don't exist, so removing them was necessary
2. **Deterministic**: Validation must be deterministic for testing and predictability
3. **Event-Driven**: Combat outcomes are story-specific, not engine concerns
4. **Minimal Surface**: Smaller action = fewer bugs, easier maintenance

## Testing Requirements

- Test basic attack validation
- Test event emission
- Test message generation
- NO tests for breaking/destruction (not action's responsibility)

## Future Considerations

If breaking mechanics are needed globally:
1. Create traits in world-model first
2. Add them as optional enhancements
3. Keep basic attack working without them
4. Use event handlers for complex logic

## Ratings Breakdown

### Before (2.0/10)
- ❌ Non-deterministic validation (Math.random)
- ❌ References non-existent traits (FRAGILE, BREAKABLE)
- ❌ 450+ lines of complexity
- ❌ Business logic in action
- ❌ Unmaintainable breaking system

### After (9.0/10)
- ✅ Deterministic validation
- ✅ Only references valid traits
- ✅ Minimal 181 lines
- ✅ Clean event emission
- ✅ Story-driven combat logic
- ✅ Follows three-phase pattern
- ⚠️ Could add weapon trait checks (future enhancement)

## Status
✅ Complete - Action follows minimal pattern correctly