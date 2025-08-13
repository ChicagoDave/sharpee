# World-Model Implementation Plan

## Current State
- Scope system (ADR-045) implemented for parser entity resolution
- Tests failing because getVisible() uses scope instead of VisibilityBehavior
- Clear architectural decision made (ADR-046)

## Implementation Steps

### Step 1: Core Changes (30 minutes)
Make the key changes to WorldModel:

```typescript
// In world/WorldModel.ts

// Change from:
getVisible(observerId: string): IFEntity[] {
  const entityIds = this.evaluateScope(observerId, 'examining');
  return entityIds
    .map(id => this.getEntity(id))
    .filter((e): e is IFEntity => e !== undefined);
}

// To:
getVisible(observerId: string): IFEntity[] {
  const observer = this.getEntity(observerId);
  if (!observer) return [];
  return VisibilityBehavior.getVisible(observer, this);
}

// Similar change for canSee()
canSee(observerId: string, targetId: string): boolean {
  const observer = this.getEntity(observerId);
  const target = this.getEntity(targetId);
  if (!observer || !target) return false;
  return VisibilityBehavior.canSee(observer, target, this);
}
```

### Step 2: Run Tests (15 minutes)
- Run world-model tests
- Verify which tests now pass
- Identify any new failures

### Step 3: Handle Edge Cases (45 minutes)
Based on test results:

1. **Darkness handling**: Verify VisibilityBehavior handles dark rooms
2. **Worn items**: Decide if they should be visible on NPCs
3. **Scenery visibility**: Check invisible scenery handling
4. **Nested containers**: Verify deep nesting works

### Step 4: Documentation (20 minutes)
- Add clear comments to changed methods
- Update any misleading test names
- Document the architectural decision in code

### Step 5: Verify Parser Integration (20 minutes)
- Ensure parser still works with getInScope()
- Test entity resolution with closed containers
- Verify "GET MEDICINE" works when medicine is in closed cabinet

## Risk Assessment

### Low Risk
- Changes are localized to 2-3 methods
- VisibilityBehavior already exists and is tested
- Scope system remains unchanged for parser

### Medium Risk
- Some tests may have wrong expectations
- Worn items visibility needs design decision
- Darkness handling might need scope rules

### Mitigation
- Can revert changes easily if needed
- Tests will catch any regressions
- ADR-046 provides clear guidance

## Expected Outcomes

### Tests That Should Pass
- All container visibility tests
- All darkness-related tests
- Core get-in-scope tests
- Window visibility tests (already passing)

### Tests That May Need Review
- Worn items visibility (design decision)
- Some edge cases in visibility chains

### New Capabilities
- Proper separation enables stdlib witness system
- NPCs can react only to what they see
- Parser remains flexible for player knowledge

## Timeline
- Total estimated time: 2 hours
- Can be done incrementally
- Each step is independently valuable

## Next Steps After Implementation
1. Implement stdlib ScopeResolver
2. Wire up witness system
3. Test with Cloak of Darkness story
4. Consider additional scope rules for special cases