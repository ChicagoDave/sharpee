# Work Summary: PerceptionService Implementation (ADR-069)

**Date**: 2025-12-27
**Duration**: ~1 hour
**Branch**: phase4

## Objective

Implement ADR-069 Perception-Based Event Filtering to fix the going-into-dark-room bug where full room descriptions were shown before the darkness message.

## What Was Accomplished

### ADR-069 Accepted
- Created `docs/architecture/adrs/adr-069-perception-event-filtering.md`
- Documents 5 options, recommends Option B (Stdlib PerceptionService)
- Implementation plan with 4 phases

### PerceptionService Created

#### Interface (in @sharpee/stdlib)
- `IPerceptionService` interface with:
  - `filterEvents(events, actor, world)` - filters events by perception
  - `canPerceive(actor, location, world, sense)` - checks if actor can perceive
- `Sense` type: 'sight' | 'hearing' | 'smell' | 'touch'
- Re-exported from `@sharpee/engine` for convenience

#### Implementation (in @sharpee/stdlib)
- `PerceptionService` class in `packages/stdlib/src/services/PerceptionService.ts`
- `canSeeVisually()` checks:
  1. Actor blindness trait (future)
  2. Actor wearing blindfold (future)
  3. Room darkness via `VisibilityBehavior.isDark()`
- Filters these visual event types:
  - `if.event.room.description`
  - `if.event.contents.listed`
  - `action.success` with `messageId: 'contents_list'`
- Transforms blocked events to `if.event.perception.blocked`

### Engine Integration
- Added `perceptionService?: IPerceptionService` to GameEngine constructor options
- Calls `filterEvents()` after action execution, before events are stored/emitted
- Pass-through if no service configured (engine stays generic)

### Cloak of Darkness Wired Up
- Added `@sharpee/stdlib` dependency to story
- Created and passed `PerceptionService` to engine
- Initial testing shows darkness filtering working:
  - Room description suppressed when entering dark room
  - Contents list suppressed when entering dark room
  - "Blundering around in the dark" message still appears (correct)

## Files Created

```
docs/architecture/adrs/adr-069-perception-event-filtering.md
docs/work/phases/perception-service-implementation.md
packages/stdlib/src/services/PerceptionService.ts
packages/stdlib/src/services/index.ts
```

## Files Modified

```
packages/engine/src/types.ts (re-export IPerceptionService from stdlib)
packages/engine/src/game-engine.ts (add perceptionService integration)
packages/stdlib/src/index.ts (export services)
stories/cloak-of-darkness/package.json (add stdlib dependency)
stories/cloak-of-darkness/src/test-runner.ts (wire up PerceptionService)
```

## Test Results (Partial)

Initial run shows perception filtering working:
- Entering dark bar no longer shows room description
- Entering dark bar no longer shows contents list
- "Blundering around in the dark" message still appears

**Needs verification in next session:**
- Full losing path
- Winning path (lit bar shows full description)
- Edge cases

## Architecture Notes

### Dependency Direction
- Interface defined in `@sharpee/stdlib` (not core, to avoid circular deps)
- Engine imports from stdlib (already does for actions)
- Re-exported from engine for convenience

### Event Flow
```
Action executes → events created → PerceptionService.filterEvents() → events stored/emitted → TextService renders
```

### Future Extensions
- Blindness trait checking (stubbed)
- Blindfold detection (stubbed)
- Hearing/smell/touch senses (stubbed, always return true)

## Additional Work Done

### Perception Filtering Tested - WORKING
- Entering dark bar: No room description, no contents list ✅
- Only "Blundering around in the dark!" message appears ✅
- Entering lit bar (after hanging cloak): Full description + contents ✅
- Disturbance tracking: 0 → 1 → 2 → 3 ✅
- Message obliterated after 3+ disturbances ✅

### Bug Fixed: `read message` showing empty output

**Root cause**: Story used `action.error` instead of `action.failure`, and message key mismatch.

**Fixes applied**:
1. Changed all `action.error` → `action.failure` in story (action.error is for unexpected errors, not validation failures)
2. Fixed message key: `action.read.error.cant_read_message` → `READ.cant_read_message` (matches action ID)
3. Added `reason` to params so template `{reason}` can resolve

### Tech Debt Documented
- ADR-069 updated with Tech Debt section
- PerceptionService should move from stdlib to if-services (alongside TextService)

## Next Steps

1. Test `read message` fix (builds done, needs runtime test)
2. Add unit tests for PerceptionService
3. Move PerceptionService to if-services
4. Document in developer guide

## Git Status

Branch: `phase4`
Uncommitted changes:
- stories/cloak-of-darkness/src/index.ts (action.error → action.failure, message key fix)
