# Sub-Actions Pattern Analysis

## Summary
Based on review of existing action reviews, here's which paired actions have documented code duplication that justifies the sub-actions pattern:

## Actions WITH Code Duplication (Need Sub-Actions)

### 1. Switching On/Off ✅ ALREADY DONE
- **Duplication**: ~60 lines of duplicate light detection and room analysis logic
- **Score Before**: 9/10
- **Score After**: 10/10
- **Status**: Successfully refactored with `/activate` and `/deactivate` sub-actions

### 2. Locking/Unlocking ✅ ALREADY DONE  
- **Duplication**: Key requirements checking logic (lines 67-97 in both)
- **Score Before**: 8/10
- **Score After**: 9/10
- **Status**: Successfully refactored with `/secure` and `/unsecure` sub-actions

### 3. Pushing/Pulling ✅ ALREADY FIXED
- **Duplication**: ~190 lines of near-duplicate logic between validate and execute
- **Status**: Fixed in follow-up by extracting shared logic to `analyzePushAction`
- **Note**: Already addressed without sub-actions pattern

### 4. Wearing/Taking Off (Wearable) ✅ ALREADY DONE
- **Status**: Implemented as part of commit 68dfbeb
- **Pattern**: Sub-actions pattern applied

## Actions WITHOUT Significant Code Duplication (Skip Sub-Actions)

### 1. Opening/Closing ❌ NO DUPLICATION
- **Opening Score**: 8.5/10
- **Closing Score**: 9/10
- **Analysis**: Reviews do not mention any code duplication between them
- **Pattern**: Both already use three-phase pattern well
- **Recommendation**: SKIP - Already high quality, no duplication

### 2. Taking/Dropping ❌ NO DUPLICATION MENTIONED
- **Taking**: Uses three-phase pattern with data builder
- **Dropping**: Has some internal duplication within itself, not with taking
- **Recommendation**: SKIP - No shared code mentioned in reviews

### 3. Entering/Exiting ❌ NO DUPLICATION MENTIONED
- **Reviews**: No follow-up reviews mentioning duplication
- **Recommendation**: SKIP - Different enough logic

### 4. Saving/Restoring ❌ NOT TRUE OPPOSITES
- **Analysis**: These are meta-actions for game state
- **Logic**: Completely different - one serializes, one deserializes
- **Recommendation**: SKIP - Not paired opposites

## Not Truly Paired Actions (Excluded)

### Giving/Throwing
- **Analysis**: Not opposites, completely different actions
- **Giving**: Transfer to another actor (improved to 9.5/10)
- **Throwing**: Launch projectile
- **Status**: EXCLUDED from sub-actions consideration

### Eating/Drinking
- **Analysis**: Similar actions but not opposites
- **Status**: EXCLUDED from sub-actions consideration

## Conclusion

Based on the user's guidance: "we created the adr for this because we had shared code code smells - if the proposed actions have similar issues, we proceed. if not, we skip them"

**Actions that need sub-actions pattern:**
1. ✅ Switching (DONE)
2. ✅ Locking (DONE)  
3. ✅ Wearable (DONE)
4. ✅ Pushing/Pulling (already fixed differently)

**Actions to skip:**
1. Opening/Closing - High quality, no duplication
2. Taking/Dropping - No shared code
3. Entering/Exiting - Different logic
4. Saving/Restoring - Not true opposites

## Recommendation

The sub-actions pattern has already been successfully applied where it was needed (switching, locking, wearable). The other paired actions either don't have code duplication or aren't true opposites. 

**No further sub-actions implementation is needed.**