# StdLib Test Status & Action Plan

## Current Status (as of 2025-07-19)

### Test Results Summary
- **Total Test Files**: ~40
- **Passing**: ~20 files (50%)
- **Failing**: ~20 files (50%)
- **Total Failures**: 119 test failures

### Main Failure Categories

1. **`world.getEntityByName()` doesn't exist** (40+ failures)
   - Affects: throwing, touching, attacking, drinking tests
   - Solution: Use `findEntityByName()` or object from TestData

2. **Platform actions missing player** (32 failures)
   - Affects: all platform action tests (saving, quitting, etc.)
   - Solution: Use `setupBasicWorld()`

3. **Registry pattern matching** (12 failures)
   - Affects: action registry tests
   - Solution: Mock language provider

4. **Event structure mismatches** (35+ failures)
   - Affects: various action tests
   - Solution: Update expectations to match implementation

## Immediate Action Plan

### Step 1: Fix world.getEntityByName Pattern (Priority: CRITICAL)
Target files with most failures first:
1. `throwing-golden.test.ts` (24 failures)
2. `touching-golden.test.ts` (17 failures)
3. `attacking-golden.test.ts` (1 failure)
4. `drinking-golden.test.ts` (1 failure)

### Step 2: Fix Platform Actions (Priority: HIGH)
1. `platform-actions.test.ts` (22 failures)
2. `quitting.test.ts` (10 failures)

### Step 3: Fix Registry Tests (Priority: HIGH)
1. `registry-golden.test.ts` (12 failures)

### Step 4: Fix Event Expectations (Priority: MEDIUM)
1. `inventory-golden.test.ts` (13 failures)
2. `answering-golden.test.ts` (5 failures)
3. `pushing-golden.test.ts` (5 failures)
4. Other files with 1-3 failures each

## Quick Win Strategy

### Phase 1: Bulk Fix world.getEntityByName (1 hour)
- Create and run a script to fix all occurrences
- Test one file manually first
- Apply to all affected files
- Expected impact: ~40 failures resolved

### Phase 2: Platform Actions (30 minutes)
- Add setupBasicWorld to all platform tests
- Expected impact: ~32 failures resolved

### Phase 3: Registry Mock (30 minutes)
- Add mock language provider
- Expected impact: ~12 failures resolved

### Phase 4: Event Structure Updates (2 hours)
- Update expectations case by case
- Expected impact: ~35 failures resolved

## Success Metrics
- [ ] All stdlib tests passing (0 failures)
- [ ] No mock-specific code remaining
- [ ] Clear patterns documented for future tests
- [ ] Test coverage maintained or improved

## Next Steps
1. Start with throwing-golden.test.ts as pilot for world.getEntityByName fix
2. Create and test the fix script
3. Apply to all affected files
4. Move to platform actions
5. Continue through priority list

## Repair Templates Available
See `repair-templates.md` for specific code patterns and fixes.
