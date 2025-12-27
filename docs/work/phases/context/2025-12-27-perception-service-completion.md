# Work Summary: PerceptionService Completion

**Date**: 2025-12-27
**Branch**: phase4
**Commits**: 4

## Tasks Completed

### 1. Fixed `read message` Empty Output Bug

**Root Cause**: Two issues combined:
1. Text service didn't handle `action.blocked` events (only `action.failure`)
2. stdlib reading action uses `blocked()` method which emits `action.blocked`, not `action.failure`
3. The `cannotReadMessage` from ReadableTrait was in `params.reason`, but fallback checked `data.reason` first

**Fixes**:
- Added `action.blocked` case to text service (treated same as `action.failure`)
- Updated fallback logic to prefer `params.reason` when it differs from error codes
- Updated Cloak story to set `readable.cannotReadMessage` when message is destroyed

**Result**: Both winning ("You have won!") and losing ("The message has been trampled...") paths work correctly.

### 2. Added Unit Tests for PerceptionService

Created 16 unit tests in `packages/stdlib/tests/unit/services/perception-service.test.ts`:

- `canPerceive` tests for sight, hearing, smell, touch
- `filterEvents` tests in lit rooms (pass-through)
- `filterEvents` tests in dark rooms (transforms visual events)
- Edge case tests (orphan player, empty events, mixed events)

### 3. Moved Interface to if-services Package

**Before**: Interface and implementation both in stdlib

**After**:
- Interface (`IPerceptionService`, `Sense`, `PerceptionBlockReason`, `PerceptionBlockedData`) in `@sharpee/if-services`
- Implementation (`PerceptionService` class) remains in `@sharpee/stdlib`
- stdlib re-exports types for convenience
- Added if-services dependency to stdlib

This aligns with the pattern where if-services contains runtime service interfaces (alongside TextService).

### 4. Documented PerceptionService

Added comprehensive documentation to `docs/reference/core-concepts.md`:

- New "Perception System" section
- Basic usage examples
- How it works explanation
- Sense types documentation
- Event filtering behavior
- Story integration example
- Text service handling guidance

## Files Changed

### Created
- `packages/if-services/src/perception-service.ts` - Interface definitions
- `packages/stdlib/tests/unit/services/perception-service.test.ts` - Unit tests

### Modified
- `packages/text-services/src/standard-text-service.ts` - Handle action.blocked, improve reason fallback
- `packages/if-services/src/index.ts` - Export perception-service
- `packages/stdlib/src/services/PerceptionService.ts` - Import from if-services
- `packages/stdlib/package.json` - Add if-services dependency
- `stories/cloak-of-darkness/src/index.ts` - Use cannotReadMessage
- `docs/reference/core-concepts.md` - Add Perception System section

## Commits

1. `fix(text-services): Handle action.blocked events and improve reason fallback`
2. `test(stdlib): Add unit tests for PerceptionService`
3. `refactor(perception): Move interface to if-services, keep impl in stdlib`
4. `docs: Add PerceptionService documentation to core concepts`

## Test Results

- 16/16 PerceptionService unit tests pass
- Cloak of Darkness winning path works
- Cloak of Darkness losing path works

## Architecture Summary

```
Event Flow with PerceptionService:

Action executes
     ↓
Events generated (room.description, contents.listed, etc.)
     ↓
PerceptionService.filterEvents()
  - Checks canPerceive(actor, location, world, 'sight')
  - Visual events → perception.blocked when can't see
  - Non-visual events pass through
     ↓
Events stored/emitted
     ↓
TextService renders
  - action.blocked handled same as action.failure
  - perception.blocked shows "can't see" message
```

## Next Steps (if any)

The PerceptionService work is complete. Future enhancements documented in ADR-069:
- Blindness trait checking
- Blindfold detection
- Hearing/smell/touch sense implementations
