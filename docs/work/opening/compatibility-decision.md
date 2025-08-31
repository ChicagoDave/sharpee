# Opening Action Event Compatibility Decision

## Current Situation

We've refactored the opening action to emit atomic events:
- Simplified `if.event.opened` to just `targetId` and `targetName`
- Added separate `if.event.revealed` events for each item
- Removed computed fields and redundant data

However, existing tests expect the old event structure with fields like:
- `containerName`
- `item`  
- `hasContents`
- `contentsCount`
- etc.

## Options

### Option 1: Breaking Change
- Update all tests to expect new atomic events
- Document as breaking change in changelog
- Cleaner long-term solution

### Option 2: Transition Period
- Emit BOTH old and new event structures
- Mark old fields as deprecated
- Remove in next major version

### Option 3: Keep Old Structure
- Revert to previous implementation
- Document atomic events as future enhancement
- No immediate benefit

## Recommendation

**Option 1: Breaking Change**

Reasons:
1. We're still in alpha (v1.0.0-alpha.1)
2. No production users to break
3. Tests are internal, we control them
4. Cleaner to make the change now vs later
5. Atomic events are the correct design

## Implementation Plan

1. Update test expectations to match new event structure
2. Document the change clearly
3. Provide migration guide for any future users
4. Consider this pattern for other actions