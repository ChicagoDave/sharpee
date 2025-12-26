# Current Action State Review
*As of commit 68dfbeb*

## Summary Statistics
- **Total Actions**: 40 standard actions
- **Three-Phase Pattern**: 11 actions (27.5%)
- **Sub-Actions Pattern**: 3 action families (7.5%)
- **Old Pattern**: 26 actions (65%)

## Pattern Distribution

### ✅ Three-Phase Pattern (validate/execute/report)
These actions have been refactored to the modern pattern:
1. **closing** - Score: 9/10 (per review)
2. **dropping** - Uses three-phase
3. **examining** - Uses three-phase
4. **giving** - Score: 9.5/10 (recently improved)
5. **going** - Uses three-phase
6. **inserting** - Uses three-phase
7. **looking** - Score: 9/10 (per review)
8. **opening** - Score: 8.5/10 (per review)
9. **putting** - Uses three-phase
10. **removing** - Uses three-phase
11. **taking** - Uses three-phase with data builder

### 🔄 Sub-Actions Pattern (base class + variants)
These use the sub-actions pattern for paired opposites:
1. **switching** (activate/deactivate) - Score: 10/10
2. **locking** (secure/unsecure) - Score: 9/10
3. **wearable** (wear/remove) - Implemented

### ❌ Old Pattern (validate/execute returning events)
These still use the old two-phase pattern:
1. **about** - Minimal action
2. **again** - Meta action
3. **attacking** - Needs refactoring (per reviews)
4. **climbing** - Simple action
5. **drinking** - Consumption action
6. **eating** - Consumption action
7. **entering** - Movement action
8. **exiting** - Movement action
9. **help** - Meta action
10. **inventory** - Display action
11. **listening** - Sensory action
12. **pulling** - Manipulation action
13. **pushing** - Manipulation action
14. **quitting** - Meta action
15. **reading** - Interaction action
16. **restarting** - Meta action
17. **restoring** - Meta action
18. **saving** - Meta action
19. **scoring** - Meta action
20. **searching** - Interaction action
21. **showing** - Display action
22. **sleeping** - State action
23. **smelling** - Sensory action
24. **talking** - Communication action
25. **throwing** - Manipulation action
26. **touching** - Sensory action
27. **waiting** - Time action

## Quality Assessment by Category

### High Quality (8+/10)
- **closing**: 9/10 - Exemplary three-phase
- **giving**: 9.5/10 - Recently improved
- **looking**: 9/10 - Clean implementation
- **opening**: 8.5/10 - Good but has minor issues
- **switching**: 10/10 - Perfect sub-actions pattern
- **locking**: 9/10 - Clean sub-actions pattern

### Medium Quality (5-7/10)
- **attacking**: ~5/10 - Needs major refactoring
- **throwing**: 6/10 - Basic implementation
- Most old-pattern actions fall here

### Unknown/Need Review
- Most consumption, sensory, and meta actions

## Critical Issues Found

### 1. Pattern Inconsistency
- Only 27.5% use the three-phase pattern
- 65% still on old pattern
- Mix creates maintenance confusion

### 2. Missing Three-Phase Conversions
High-impact actions still on old pattern:
- **entering/exiting** - Core movement
- **eating/drinking** - Common interactions
- **pushing/pulling** - Manipulation actions
- **attacking** - Combat system

### 3. Incomplete Data Builder Usage
Even three-phase actions have issues:
- Some manually extend event data after builders
- Hacky state storage using `(context as any)`

## Recommendations

### Priority 1: Fix Critical Actions
Actions that users interact with most:
1. **entering/exiting** - Convert to three-phase
2. **eating/drinking** - Convert to three-phase
3. **attacking** - Major refactor needed
4. **pushing/pulling** - Already had duplication fixed

### Priority 2: Fix Meta Actions
Clean up game control actions:
1. **saving/restoring** - Three-phase would be cleaner
2. **quitting/restarting** - Standardize pattern
3. **scoring** - Simple conversion

### Priority 3: Sensory Actions
Lower priority but should be consistent:
1. **listening/smelling/touching**
2. **reading**
3. **searching**

### Priority 4: State Actions
1. **sleeping**
2. **waiting**
3. **talking**

## Sub-Actions Pattern Verdict

### Correctly Applied To:
- ✅ **switching** - Had 60 lines duplication
- ✅ **locking** - Had key validation duplication
- ✅ **wearable** - Shared wearable logic

### Should NOT Apply To:
- ❌ **opening/closing** - No duplication, already high quality
- ❌ **taking/dropping** - Different logic
- ❌ **entering/exiting** - Different validation
- ❌ **pushing/pulling** - Already fixed differently
- ❌ **saving/restoring** - Not opposites
- ❌ **eating/drinking** - Not opposites
- ❌ **giving/throwing** - Not opposites

## Next Steps

1. **Abandon Phase 3.1-3.7 sub-actions plan** - It was based on incorrect assumptions
2. **Focus on three-phase conversion** - 26 actions still need it
3. **Fix state storage hacks** - Even in converted actions
4. **Complete data builder adoption** - Remove manual extensions
5. **Prioritize by user impact** - Movement and interaction first

## Conclusion

The codebase is in a transitional state with three different patterns:
- 27.5% modern three-phase
- 7.5% sub-actions (correctly applied)
- 65% old pattern

The sub-actions pattern has been correctly applied only where there was actual code duplication. The main work needed is converting the remaining 26 actions to the three-phase pattern, not adding unnecessary sub-actions.