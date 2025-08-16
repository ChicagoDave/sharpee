# Stdlib 173 Errors Resolution Plan
*After Phase A changes, we now have 173 errors to resolve*

## Current Situation
- **Started with**: 89 errors
- **After Phase A**: 173 errors (due to undefined state references)
- **Main issue**: Removed state parameter from execute() but didn't remove state references

## Error Categories

### Category 1: Undefined 'state' References (63 errors)
**Pattern**: `Cannot find name 'state'`

These are in execute() methods that previously received state parameter. Now need to either:
- Remove the state reference entirely
- Reconstruct needed values from context
- Use local variables

**Most affected files**:
- pulling.ts (likely 8-10 state references)
- inventory.ts (likely 8-10 state references)
- scoring.ts (likely 6-8 state references)
- showing.ts (likely 5-7 state references)
- And 13 other files

### Category 2: Error Object Format (≈70 errors)
**Pattern**: `Type '{ messageId: string; reason: string; }' is not assignable to type 'string'`

Still have many ValidationResult returns with object errors instead of strings.

**Files affected**:
- going.ts (10 instances)
- giving.ts (7 instances)
- talking.ts (6 instances)
- throwing.ts (5 instances)
- turning.ts (4 instances)
- again.ts (3 instances)
- closing.ts (1 instance)

### Category 3: State Property in ValidationResult (≈10 errors)
**Pattern**: `'state' does not exist in type 'ValidationResult'`

Files still trying to return state in ValidationResult:
- attacking.ts
- climbing.ts
- examining.ts
- help.ts
- inventory.ts
- And others

### Category 4: Property Mismatches (≈15 errors)
Various property name mismatches:
- CommandHistoryEntry: `command` vs `commandText`, `action` vs `actionId`
- Event data property mismatches

### Category 5: Special Cases (≈15 errors)
- trace.ts: validate returns boolean
- context.ts: missing validate
- examining.ts: SemanticEvent assigned to string
- inserting.ts: various issues

## Resolution Strategy

### Step 1: Remove State Property from ValidationResult Returns
Fix all files that still return `state` in their validate() methods.
This will reduce confusion about what state is available.

### Step 2: Fix State References in Execute Methods
For each file with state references:
1. Identify what values from state are actually used
2. Either reconstruct them from context or remove if unnecessary
3. Test that the logic still works

### Step 3: Fix Error Object Format
Convert all error objects to strings in validate() methods.

### Step 4: Fix Property Mismatches
Correct property names to match actual interfaces.

### Step 5: Special Cases
Handle the unique issues in trace.ts, context.ts, etc.

## Priority Order
1. **High Impact Files** (most errors):
   - pulling.ts (13 errors)
   - inventory.ts (12 errors)
   - again.ts (12 errors)
   - scoring.ts (10 errors)
   - going.ts (10 errors)

2. **Medium Impact Files** (5-9 errors):
   - showing.ts, pushing.ts, turning.ts, talking.ts, throwing.ts, inserting.ts, giving.ts

3. **Low Impact Files** (1-5 errors):
   - All remaining files

## Success Metrics
- [ ] All 173 TypeScript errors resolved
- [ ] Build succeeds with 0 errors
- [ ] No functional behavior changed (only type fixes)