# Stdlib Remaining Errors Checklist
*Systematic tracking of fixes for the 89 remaining TypeScript errors*

## Phase A: Quick Fixes - Execute Signatures & isValid ✅

### Execute Method Signatures (Remove state parameter) ✅
- [x] about.ts - Remove state param from execute()
- [x] again.ts - Remove state param from execute()
- [x] examining.ts - Remove state param from execute()
- [x] help.ts - Remove state param from execute()
- [x] inventory.ts - Remove state param from execute()
- [x] pulling.ts - Remove state param from execute()
- [x] pushing.ts - Remove state param from execute()
- [x] quitting.ts - Remove state param from execute()
- [x] restarting.ts - Remove state param from execute()
- [x] restoring.ts - Remove state param from execute()
- [x] saving.ts - Remove state param from execute()
- [x] scoring.ts - Remove state param from execute()
- [x] showing.ts - Remove state param from execute()
- [x] sleeping.ts - Remove state param from execute()
- [x] smelling.ts - Remove state param from execute()
- [x] touching.ts - Remove state param from execute()
- [x] turning.ts - Remove state param from execute()

### Remaining isValid → valid
- [ ] about.ts - Line 27: isValid → valid
- [ ] again.ts - Line 102: isValid → valid
- [ ] examining.ts - Line 208: isValid → valid
- [ ] help.ts - Check for isValid
- [ ] inventory.ts - Check for isValid
- [ ] pulling.ts - Check for isValid
- [ ] pushing.ts - Check for isValid
- [ ] quitting.ts - Check for isValid
- [ ] restarting.ts - Check for isValid
- [ ] restoring.ts - Check for isValid
- [ ] saving.ts - Check for isValid
- [ ] scoring.ts - Check for isValid
- [ ] showing.ts - Check for isValid
- [ ] sleeping.ts - Check for isValid
- [ ] smelling.ts - Check for isValid
- [ ] touching.ts - Line 212: isValid → valid
- [ ] turning.ts - Line 354: isValid → valid

## Phase B: Error Object Format Fixes

### again.ts (3 errors)
- [ ] Line 42: Convert error object to string
- [ ] Line 69: Convert error object to string
- [ ] Line 78: Convert error object to string

### giving.ts (7 errors)
- [ ] Line 52: Convert error object to string
- [ ] Line 62: Convert error object to string
- [ ] Line 73: Convert error object to string
- [ ] Line 84: Convert error object to string
- [ ] Line 104: Convert error object to string
- [ ] Line 125: Convert error object to string
- [ ] Line 149: Convert error object to string

### going.ts (11 errors)
- [ ] Line 63: Convert error object to string
- [ ] Line 81: Convert error object to string
- [ ] Line 92: Convert error object to string
- [ ] Line 107: Convert error object to string
- [ ] Line 115: Convert error object to string
- [ ] Line 128: Convert error object to string
- [ ] Line 147: Convert error object to string
- [ ] Line 163: Convert error object to string
- [ ] Line 184: Convert error object to string
- [ ] Line 196: Convert error object to string
- [ ] Check for more instances

### talking.ts (6 errors)
- [ ] Line 47: Convert error object to string
- [ ] Line 58: Convert error object to string
- [ ] Line 73: Convert error object to string
- [ ] Line 85: Convert error object to string
- [ ] Line 96: Convert error object to string
- [ ] Line 110: Convert error object to string
- [ ] Line 124: Fix isValid check in execute()
- [ ] Line 127: Fix spread operator issue

### throwing.ts (5 errors)
- [ ] Line 64: Convert error object to string
- [ ] Line 82: Convert error object to string
- [ ] Line 94: Convert error object to string
- [ ] Line 112: Convert error object to string
- [ ] Line 130: Convert error object to string
- [ ] Line 145: Fix isValid check in execute()
- [ ] Line 148: Fix spread operator issue

### turning.ts (4 errors)
- [ ] Line 78: Convert error object to string
- [ ] Line 93: Convert error object to string
- [ ] Line 106: Convert error object to string
- [ ] Line 150: Convert error object to string

### Other files
- [ ] closing.ts - Line 85: Convert error object to string
- [ ] touching.ts - Line 65: Convert error object to string

## Phase C: State Property Cleanup

### attacking.ts
- [ ] Line 322: Remove state property from ValidationResult
- [ ] Line 348: Remove state property access

### climbing.ts
- [ ] Line 76: Remove state property access
- [ ] Line 160: Remove state property from ValidationResult
- [ ] Line 207: Remove state property from ValidationResult

### waiting.ts
- [ ] Line 109: Remove state property from ValidationResult
- [ ] Line 130: Remove state property access

## Phase D: Special Cases

### trace.ts
- [ ] Fix validate() to return ValidationResult instead of boolean

### context.ts
- [ ] Add missing validate property to action definition

### examining.ts
- [ ] Line 55: Fix SemanticEvent assignment to string
- [ ] Line 67: Fix SemanticEvent assignment to string

### inserting.ts
- [ ] Line 141: Fix extra argument in event call

### talking.ts
- [ ] Line 127: Fix spread operator with validation.error

### throwing.ts
- [ ] Line 148: Fix spread operator with validation.error

## Phase A.5: Fix state references in execute methods
Now that execute methods don't receive state parameter, need to remove state references in execute methods for all 17 files that were updated.

- [ ] Fixed state references in all 17 execute methods

## Verification

### After Phase A
- [x] Execute signatures fixed - but created new state reference errors (173 total)

### After Phase B
- [ ] Run build and verify error count reduced by ~45

### After Phase C
- [ ] Run build and verify error count reduced by ~6

### After Phase D
- [ ] Run build and verify 0 errors
- [ ] Run tests to ensure no regressions

## Progress Tracking

**Starting errors**: 89
**Current errors**: 89
**Fixed**: 0
**Remaining**: 89

### Log Files
- Initial build: `/mnt/c/repotemp/sharpee/logs/stdlib-build-20250811-1426.log`
- Phase A complete: `[pending]`
- Phase B complete: `[pending]`
- Phase C complete: `[pending]`
- Final build: `[pending]`