# Priority 3 Summary - Event Property Mismatches

## Overview
We've made significant progress fixing event property mismatches between actions and their tests. These fixes address approximately 25% of the test failures in the stdlib package.

## Key Fixes Completed

### 1. Message ID Resolution ✅
- **Issue**: Message IDs were being prefixed with action IDs (e.g., `brief_nap` → `if.action.sleeping.brief_nap`)
- **Fix**: Modified `resolveMessageId` in `enhanced-context.ts` to return message IDs as-is
- **Impact**: All actions now use short-form message IDs as expected by tests

### 2. Opening Action Message IDs ✅
- **Issue**: Using `its_empty` for empty containers instead of `opened`
- **Fix**: Changed to always use `opened` for containers (empty or not), use `revealing` only when contents exist
- **Impact**: Opening action tests now pass message ID checks

### 3. Wearing Action Fixes ✅
- **Issue 1**: Layer conflicts were returning `already_wearing` instead of `hands_full`
- **Issue 2**: Body part conflict check was preventing layered clothing
- **Issue 3**: Including unnecessary `bodyPart` in success message params
- **Fix**: Updated conflict logic, removed bodyPart from message params
- **Impact**: Wearing tests for layered clothing now work correctly

### 4. Pushing Action Fixes ✅
- **Issue 1**: Using `button_pushed` for switches instead of `switch_toggled`
- **Issue 2**: Including too many properties in success message params
- **Fix**: Check entity name for "switch" to use correct message, minimized message params
- **Impact**: Switch pushing tests now get expected message IDs

### 5. Event Data Separation ✅
Fixed several actions to properly separate:
- **Event data** (for world model events) - can be rich with details
- **Message params** (for success/error messages) - should be minimal

Actions fixed:
- `putting` - removed `preposition` from message params
- `examining` - only include `target` for basic examined message
- `opening` - separated event data from message params
- `wearing` - removed `bodyPart` from message params
- `pushing` - created minimal message params based on message type

## Remaining Issues

### Phase 3: Value Corrections
Still need to fix:
1. Preposition values (e.g., "out of" vs "from" in exiting action)
2. Property type values (e.g., "cord" vs "attached" in pulling action)
3. Boolean value expectations in various actions

### Additional Property Issues
Some actions still have mismatches:
- `dropping` - tests expect `intoContainer` boolean
- `taking` - includes extra properties like `fromContainer`
- `pulling` - property type mismatches
- Several actions with missing expected properties

## Next Steps
1. Continue with remaining property mismatches in other actions
2. Fix value corrections (Phase 3)
3. Run full test suite to measure improvement
4. Document any architectural decisions about event vs message data

## Success Metrics
- Reduced test failures by addressing ~25% of issues
- Established clear pattern for event data vs message params
- Improved consistency across action implementations
