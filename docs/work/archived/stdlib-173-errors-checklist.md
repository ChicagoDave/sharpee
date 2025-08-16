# Stdlib 173 Errors Checklist
*Systematic fixes after Phase A created new issues*

## Step 1: Remove State from ValidationResult Returns

### Files to Fix
- [ ] examining.ts - Remove state property from return
- [ ] help.ts - Remove state property from return
- [ ] inventory.ts - Remove state property from return
- [ ] pulling.ts - Remove state property from return
- [ ] pushing.ts - Remove state property from return
- [ ] quitting.ts - Remove state property from return
- [ ] restarting.ts - Remove state property from return
- [ ] restoring.ts - Remove state property from return
- [ ] saving.ts - Remove state property from return
- [ ] scoring.ts - Remove state property from return
- [ ] showing.ts - Remove state property from return
- [ ] sleeping.ts - Remove state property from return
- [ ] smelling.ts - Remove state property from return
- [ ] touching.ts - Remove state property from return
- [ ] turning.ts - Remove state property from return
- [ ] attacking.ts - Remove state property from return
- [ ] climbing.ts - Remove state property from return
- [ ] waiting.ts - Remove state property from return

## Step 2: Fix State References in Execute Methods

### High Priority (10+ errors each)
- [ ] pulling.ts - Fix 8-10 state references
- [ ] inventory.ts - Fix 8-10 state references  
- [ ] again.ts - Fix state references + property names
- [ ] scoring.ts - Fix 6-8 state references

### Medium Priority (5-9 errors each)
- [ ] showing.ts - Fix state references
- [ ] pushing.ts - Fix state references
- [ ] turning.ts - Fix state references
- [ ] sleeping.ts - Fix state references
- [ ] saving.ts - Fix state references
- [ ] restarting.ts - Fix state references
- [ ] quitting.ts - Fix state references
- [ ] touching.ts - Fix state references
- [ ] smelling.ts - Fix state references
- [ ] restoring.ts - Fix state references
- [ ] help.ts - Fix state references
- [ ] examining.ts - Fix state references

### Low Priority
- [ ] inserting.ts - Fix state references

## Step 3: Fix Error Object Format

### going.ts (10 errors)
- [ ] Line 63: Convert to string
- [ ] Line 81: Convert to string
- [ ] Line 92: Convert to string
- [ ] Line 107: Convert to string
- [ ] Line 115: Convert to string
- [ ] Line 128: Convert to string
- [ ] Line 147: Convert to string
- [ ] Line 163: Convert to string
- [ ] Line 184: Convert to string
- [ ] Line 196: Convert to string

### giving.ts (7 errors)
- [ ] Line 52: Convert to string
- [ ] Line 62: Convert to string
- [ ] Line 73: Convert to string
- [ ] Line 84: Convert to string
- [ ] Line 104: Convert to string
- [ ] Line 125: Convert to string
- [ ] Line 149: Convert to string

### talking.ts (6 errors)
- [ ] Line 47: Convert to string
- [ ] Line 58: Convert to string
- [ ] Line 73: Convert to string
- [ ] Line 85: Convert to string
- [ ] Line 96: Convert to string
- [ ] Line 110: Convert to string
- [ ] Line 124: Fix validation check
- [ ] Line 127: Fix spread operator

### throwing.ts (5 errors)
- [ ] Line 64: Convert to string
- [ ] Line 82: Convert to string
- [ ] Line 94: Convert to string
- [ ] Line 112: Convert to string
- [ ] Line 130: Convert to string
- [ ] Line 145: Fix validation check
- [ ] Line 148: Fix spread operator

### turning.ts (4 errors)
- [ ] Line 78: Convert to string
- [ ] Line 93: Convert to string
- [ ] Line 106: Convert to string
- [ ] Line 150: Convert to string

### again.ts (3 errors)
- [ ] Line 42: Convert to string
- [ ] Line 69: Convert to string
- [ ] Line 78: Convert to string

### closing.ts (1 error)
- [ ] Line 85: Convert to string

## Step 4: Fix Property Mismatches

### again.ts
- [ ] Fix CommandHistoryEntry properties (command → commandText, action → actionId)
- [ ] Fix event data properties

### Other files
- [ ] Check and fix any remaining property mismatches

## Step 5: Special Cases

- [ ] trace.ts - Fix validate() to return ValidationResult
- [ ] context.ts - Add missing validate property
- [ ] examining.ts - Fix SemanticEvent assignments (lines 55, 67)
- [ ] inserting.ts - Fix extra argument issue

## Progress Tracking

**Total Errors**: 173
**Categories**:
- Undefined state: 63
- Error format: ~70
- State in ValidationResult: ~10
- Property mismatches: ~15
- Special cases: ~15

### Milestones
- [ ] Step 1 Complete: State removed from ValidationResult
- [ ] Step 2 Complete: State references fixed
- [ ] Step 3 Complete: Error formats fixed
- [ ] Step 4 Complete: Properties aligned
- [ ] Step 5 Complete: Special cases handled
- [ ] Final: 0 errors, build succeeds

### Build Logs
- Initial (173 errors): `/mnt/c/repotemp/sharpee/logs/stdlib-build-20250811-1511.log`
- After Step 1: `[pending]`
- After Step 2: `[pending]`
- After Step 3: `[pending]`
- Final: `[pending]`