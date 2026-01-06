# Work Summary: ADR-090 Review and Fixes

**Date**: 2026-01-06
**Branch**: dispatch
**Status**: Review complete, fixes applied

## Session Summary

Reviewed ADR-090 capability dispatch implementation and addressed issues found.

## Review Findings

### The Good
- Clean `createCapabilityDispatchAction()` abstraction (6 lines to define new action)
- Follows existing 4-phase pattern (validate/execute/report/blocked)
- Proper separation (traits declare, behaviors implement, registry binds)
- Good test coverage (13 transcript tests for basket elevator)

### The Bad
- Temp flag hack (`_lastMoveTransportedPlayer`) for phase communication
- sharedData coupling instead of ValidationResult.data
- `workspace:*` vs `file:` dependency gotcha

### The Ugly
- Template interpolation bug (`{target:cap}` showed literally)
- Dual event emission (both domain event and action.success)

## Fixes Applied

### 1. Template Interpolation Bug
**Problem**: `{target:cap}` modifier not implemented, showed literal text.

**Fix**: Changed messages to avoid the modifier:
- `packages/lang-en-us/src/actions/lowering.ts`: `"{target:cap} is already lowered."` → `"That's already lowered."`
- `packages/lang-en-us/src/actions/raising.ts`: `"{target:cap} is already raised."` → `"That's already raised."`

**Future**: Created ADR-091 for text decorations (bold, italics, capitalization, etc.)

### 2. sharedData Architecture Issue
**Problem**: ADR-090 describes `ValidationResult.data` and `context.validationResult`, but neither exists in the codebase. Implementation uses `context.sharedData` as workaround.

**Fix**: Updated ADR-090 with "Infrastructure Requirements" section documenting:
- What needs to be added (`ValidationResult.data`, `ActionContext.validationResult`)
- Current workaround using sharedData
- Why the proper approach is preferred

## New Files

- `docs/architecture/adrs/adr-091-text-decorations.md` - PROPOSED ADR for text formatting in message templates

## Files Modified

- `packages/lang-en-us/src/actions/lowering.ts` - Fixed template
- `packages/lang-en-us/src/actions/raising.ts` - Fixed template
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` - Added infrastructure requirements section

## Test Results

All 739 tests pass (5 expected failures).

## Next Steps

1. **Implement ValidationResult.data infrastructure** - Add `data` to ValidationResult, `validationResult` to ActionContext, thread through engine
2. **Update capability-dispatch.ts** - Use proper data flow instead of sharedData
3. **ADR-091 text decorations** - Decide on approach and implement
4. **Merge dispatch branch to main** - After infrastructure fix

## How to Continue

1. Build: `./scripts/build-all-ubuntu.sh`
2. Test: `node packages/transcript-tester/dist/cli.js stories/dungeo --all`
3. Implement ValidationResult.data infrastructure per ADR-090
