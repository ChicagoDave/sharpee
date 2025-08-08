# Event Time Checklist - UPDATED

This checklist guides the implementation of ADR-041 (Simplified Action Context) and ADR-042 (Stdlib Action Event Types).

## ⚠️ CRITICAL ISSUE DISCOVERED

All 44 migrated actions have incorrect event structures. See `event-structure-fix-checklist.md` for fix tracking.

## Progress Summary

- **Phase 1**: ✅ Complete - Simplified action context implemented
- **Phase 2**: ✅ Complete - 44 of 44 actions migrated (100%)
  - **⚠️ ISSUE**: All actions emit wrong event types (`if.event.error/success` instead of `action.error/success`)
  - **See**: `test-triage-assessment.md` for full analysis
  - **See**: `event-structure-fix-checklist.md` for fix tracking
- **Phase 2.5**: 🔴 REQUIRED - Fix event structure issues in all 44 actions
- **Phase 3**: ⏳ Blocked - Cannot validate until event issues fixed
- **Phase 4**: ⏳ Not Started - Cleanup

## Phase 1: Implement ADR-041 - Simplified Action Context ✅

### 1.1 Update Core Interfaces ✅
- [x] Update `enhanced-types.ts` to simplify `EnhancedActionContext` interface
- [x] Update `enhanced-context.ts` implementation
- [x] Ensure automatic entity injection still works
- [x] Ensure metadata enrichment still works

### 1.2 Update Tests ✅
- [x] Tests continue to work with new implementation
- [x] Ensure all tests pass with new interface

### 1.3 Document Breaking Changes ✅
- [x] Create migration guide for extension authors
- [x] Document the new `event()` method usage
- [x] Provide examples of common patterns

## Phase 2: Implement ADR-042 - Migrate Stdlib Actions ✅ (with issues)

**Status**: All 44 actions migrated but with systematic event structure errors

### Migration Issues Discovered
1. **Wrong event types**: Using `if.event.error` instead of `action.error`
2. **Wrong event types**: Using `if.event.success` instead of `action.success`
3. **Missing fields**: Error events missing `actionId` and `reason` fields
4. **Wrong parameter name**: Using `messageParams` instead of `params`

### Actions Migrated (All need fixes)

#### Priority 1 - Core Actions ✅ (Need fixes)
- ✅ Taking - Migrated but needs event structure fix
- ✅ Dropping - Migrated but needs event structure fix
- ✅ Examining - Migrated but needs event structure fix
- ✅ Going - Migrated but needs event structure fix

#### Priority 2 - Manipulation Actions ✅ (Need fixes)
- ✅ Closing - Migrated but needs event structure fix
- ✅ Opening - Migrated but needs event structure fix
- ✅ Locking - Migrated but needs event structure fix
- ✅ Unlocking - Migrated but needs event structure fix

#### Priority 3 - Interaction Actions ✅ (Need fixes)
- ✅ Giving - Migrated but needs event structure fix
- ✅ Showing - Migrated but needs event structure fix
- ✅ Putting - Migrated but needs event structure fix
- ✅ Inserting - Migrated but needs event structure fix
- ✅ Removing - Migrated but needs event structure fix
- ✅ Throwing - Migrated but needs event structure fix

#### Priority 4 - Other Actions ✅ (Need fixes)
All 30 remaining actions migrated but need event structure fixes

**Total: 44/44 migrated, 0/44 passing tests**

## Phase 2.5: Fix Event Structure Issues 🔴 NEW PHASE

See `event-structure-fix-checklist.md` for detailed tracking of fixes needed.

### Fix Pattern Required
```typescript
// Replace all instances of:
context.event('if.event.error', {...}) → context.event('action.error', {actionId: this.id, ...})
context.event('if.event.success', {...}) → context.event('action.success', {actionId: this.id, ...})

// Add reason field to error events
// Ensure params field is named correctly
```

## Phase 3: Compatibility Validation ⏳ BLOCKED

Cannot proceed until Phase 2.5 (event structure fixes) is complete.

### 3.1 Extension Testing
- [ ] Create test extension that adds custom action
- [ ] Create test extension that overrides core action
- [ ] Verify both extensions work with new structure
- [ ] Document any required changes for extensions

### 3.2 Story Testing
- [ ] Test with sample story that adds custom actions
- [ ] Test with story that modifies core actions
- [ ] Verify event emission works correctly
- [ ] Verify text service receives correct events

### 3.3 Integration Testing
- [ ] Full game engine test with migrated actions
- [ ] Event source receives all events correctly
- [ ] Event processor handles new event structure
- [ ] Text service generates correct output
- [ ] Save/restore works with new events

## Phase 4: Cleanup ⏳ NOT STARTED

### 4.1 Remove Legacy Code
- [ ] Remove old action files (after grace period)
- [ ] Remove deprecated methods from EnhancedActionContext
- [ ] Clean up any compatibility shims

### 4.2 Documentation Updates
- [ ] Update action authoring guide
- [ ] Update extension development guide
- [ ] Update API documentation
- [ ] Create changelog entry

### 4.3 Performance Validation
- [ ] Benchmark action execution performance
- [ ] Ensure no regression from changes
- [ ] Profile memory usage

## Next Steps

1. **PRIORITY**: Fix event structure issues in all 44 actions
   - See `event-structure-fix-checklist.md`
   - Consider automation options (regex or AST transform)
2. Run tests after fixes to validate
3. Continue with Phase 3 once tests pass

## Lessons Learned

1. **Migration Template Issue**: The migration template had incorrect event types
2. **Test First**: Should have run tests after first migration to catch pattern issues
3. **Systematic Issues**: When migrating many similar items, validate the pattern early
4. **Good News**: Core logic was migrated correctly, only event emission needs fixing