# Taking Action Design Decisions Summary

## Date: 2025-08-29
## Status: Design Complete, Ready for Implementation

---

## Key Architectural Decisions

### 1. Mutation Strategy: Use world.moveEntity()
**Decision**: Keep using `world.moveEntity()` for the actual spatial change
**Rationale**: 
- It's the proper abstraction for spatial index updates
- Handles parent/child relationships correctly
- Atomic operation at the world level
- Not everything needs to be a behavior

### 2. State Tracking: Use Witness System
**Decision**: Remove context pollution (_previousLocation, _implicitlyRemoved)
**Rationale**:
- Witness system already tracks all state changes
- No need to pollute context with temporary state
- Cleaner, more maintainable code
- Better separation of concerns

### 3. No PortableTrait Needed
**Decision**: Keep current system where everything is portable by default
**Rationale**:
- Follows IF conventions (objects are takeable unless marked as scenery)
- Simpler mental model
- No migration needed
- SceneryTrait already handles the "fixed" case

### 4. Validation Enhancements
**New Checks to Add**:
1. **Visibility check**: Can't take what you can't see
2. **Container accessibility**: Can't take from locked/closed opaque containers
3. **Better error messages**: More specific failure reasons

**Kept As-Is**:
- Capacity checks via ActorBehavior.canTakeItem()
- Custom messages via SceneryBehavior
- Basic validation (no target, can't take self, etc.)

---

## Implementation Priorities

### Must Have (Phase 3)
1. Remove context pollution
2. Add visibility checks
3. Add container accessibility checks
4. Update tests for new validations

### Nice to Have (Future)
1. Auto-open containers option
2. Taking from other actors
3. Weight/size system
4. Taking multiple items ("take all")

---

## Backward Compatibility Commitments

### Maintained
- Event structure (if.event.taken)
- Event data fields (item, container, etc.)
- Message IDs (taken, taken_from)
- Basic validation flow

### Changed (Internal Only)
- No more _previousLocation on context
- No more _implicitlyRemoved on context
- Use witness system for state tracking

---

## Testing Requirements

### New Tests Needed
1. Visibility test - can't take in darkness
2. Locked container test - can't take from locked
3. Closed container test - can't take from closed opaque
4. Witness system integration test

### Existing Tests
- Should all continue to pass
- May need minor updates for new error messages

---

## Risk Assessment

### Low Risk
- Using established patterns (world.moveEntity)
- Witness system is already proven
- Backward compatible changes

### Medium Risk
- Stories might depend on context properties (need to check)
- New validation might break some edge cases

### Mitigation
- Search for usage of _previousLocation in stories
- Run full test suite after implementation
- Document changes clearly

---

## Next Steps

1. **Phase 3**: Implement the changes per spec
2. **Phase 4**: Review implementation
3. **Phase 5**: Full integration testing
4. **Phase 6**: Get signoff

---

## Questions Resolved

1. **Q**: Should we create PortableTrait?
   **A**: No, keep current implicit system

2. **Q**: Should we use behaviors for all mutations?
   **A**: No, world.moveEntity() is appropriate for spatial changes

3. **Q**: How to track state without context pollution?
   **A**: Use the witness system

4. **Q**: Should we auto-open containers?
   **A**: No, explicit is better (future feature if needed)

---

## Documentation Notes

The refactored action will:
- Be cleaner (no context pollution)
- Be more correct (visibility and access checks)
- Maintain full backward compatibility
- Set a pattern for other action refactors