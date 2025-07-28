# Phase 2 Status: ADR-042 Implementation

## Completed Tasks

### Core Actions Migration (Priority 1)

#### Taking Action ✅
- [x] Created `/actions/standard/taking/` folder
- [x] Created `taking-events.ts` with interfaces:
  - [x] `TakenEventData`
  - [x] `TakingErrorData`
  - [x] `RemovedEventData`
- [x] Updated `taking.ts` to use new context.event() method
- [x] Updated `taking.ts` to use typed event data
- [x] Created `index.ts` with proper exports
- [x] Updated imports in `/src/actions/standard/index.ts`
- [x] Updated imports in test file

## Design Patterns Established

### File Structure
```
/actions/standard/[action-name]/
  ├── [action-name].ts         # Action implementation
  ├── [action-name]-events.ts  # Event type definitions
  └── index.ts                 # Module exports
```

### Event Type Patterns

1. **Domain Event Data** (e.g., `TakenEventData`)
   - Represents the actual event that occurred
   - Contains all relevant data about the event
   - Used with `if.event.*` event types

2. **Error Data** (e.g., `TakingErrorData`)
   - Typed union of error reasons
   - Optional fields for error-specific data
   - Used with `action.error` events

3. **Related Event Data** (e.g., `RemovedEventData`)
   - For events that may be triggered as side effects
   - Maintains type safety across related actions

### Migration Pattern

1. Copy existing action to new folder structure
2. Create typed event interfaces
3. Update to use `context.event()` method
4. Replace all uses of deprecated methods:
   - `context.emitError()` → `context.event('action.error', {...})`
   - `context.emitSuccess()` → `context.event('action.success', {...})`
   - `context.emit()` → `context.event()`
5. Use typed event data for domain events
6. Update imports in index files and tests

## Next Actions to Migrate

Following the priority order from the checklist:

1. **Dropping Action** (Priority 1)
2. **Examining Action** (Priority 1)
3. **Going Action** (Priority 1)
4. **Opening Action** (Priority 2)

## Notes

- The `closing` action was already partially migrated during R&D
- The pattern is now well-established and can be applied systematically
- Tests continue to work with the new structure
- Import paths need to be updated in both source and test files
