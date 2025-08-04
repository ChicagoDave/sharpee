# Test Status Report - stdlib Package

## Fixed Issues

1. **GrammarPatterns immutability** ✅ 
   - Fixed by freezing nested arrays in vocabulary-types.ts
   - Tests should now pass

2. **ActionRegistry missing methods** ✅
   - Added `find()` method for backward compatibility
   - Added support for direct `aliases` property on actions

3. **CommandValidator entity resolution** ✅
   - Fixed to use world's `getInScope` method when available
   - Excludes player and rooms from entity resolution
   - Should fix entity resolution tests

## Tests to Remove (Old Interface)

These tests use the deprecated ActionExecutor interface and should be removed:

1. `tests/unit/actions/closing.test.ts` - replaced by `closing-golden.test.ts`
2. `tests/unit/actions/waiting.test.ts` - replaced by `waiting-golden.test.ts`
3. `tests/unit/actions/scoring.test.ts` - no golden replacement yet, but incompatible

## Tests to Update

1. `tests/unit/validation/command-validator.test.ts` - Uses old patterns, but some tests might be salvageable

## Next Steps

1. Remove the old-style tests listed above
2. Run the test suite to see remaining failures
3. Address any remaining issues

## Architecture Notes

The golden tests demonstrate the proper patterns:
- Actions use `EnhancedActionContext` with helper methods
- Actions have an `execute(context)` signature, not `execute(command, context)`
- Actions don't have `aliases` - patterns come from the language provider
- Entity resolution excludes player and rooms
- Actions return semantic events, not direct mutations
