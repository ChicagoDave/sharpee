# Stdlib Test Repair Plan

## Root Cause Analysis

### Primary Issue: Delegation Pattern Breaking Validation
Actions are delegating validation to Behavior classes (`ActorBehavior`, `ContainerBehavior`, etc.) but:
1. Behaviors return generic success/failure, not specific error codes
2. Actions can't determine the specific failure reason
3. Tests expect specific error messages that actions can't provide

### Secondary Issues
1. **Message ID mismatches** - Actions use different message IDs than tests expect
2. **Missing author actions** - Debug actions were never implemented
3. **AGAIN filtering** - Meta-command detection not working
4. **State validation** - Some behaviors not properly checking state

## Repair Strategy

### Principle: Actions Own Validation
Actions should perform their own validation to provide specific error messages, only using Behaviors for state manipulation in execute().

## Phase 1: Fix Validation Pattern (Critical)

### 1.1 Create Validation Test Helper
```typescript
// test-helpers/action-validation.ts
export function testActionValidation(
  action: Action,
  scenario: {
    description: string;
    setup: (world: WorldModel) => ActionContext;
    expectedError?: string;
    expectedParams?: Record<string, any>;
  }
) {
  const world = new WorldModel();
  const context = scenario.setup(world);
  const result = action.validate(context);
  
  if (scenario.expectedError) {
    expect(result.valid).toBe(false);
    expect(result.error).toBe(scenario.expectedError);
    if (scenario.expectedParams) {
      expect(result.params).toEqual(scenario.expectedParams);
    }
  } else {
    expect(result.valid).toBe(true);
  }
}
```

### 1.2 Fix Taking Action
The taking action needs to do its own validation instead of delegating:

```typescript
validate(context: ActionContext): ValidationResult {
  const actor = context.player;
  const noun = context.command.directObject?.entity;
  
  // 1. Check target exists
  if (!noun) {
    return { valid: false, error: 'no_target' };
  }
  
  // 2. Check not self
  if (noun.id === actor.id) {
    return { valid: false, error: 'cant_take_self' };
  }
  
  // 3. Check already held
  const location = context.world.getLocation(noun.id);
  if (location === actor.id) {
    return { valid: false, error: 'already_have', params: { item: noun.name } };
  }
  
  // 4. Check if room
  if (noun.has(TraitType.ROOM)) {
    return { valid: false, error: 'cant_take_room', params: { item: noun.name } };
  }
  
  // 5. Check if scenery
  if (noun.has(TraitType.SCENERY)) {
    return { valid: false, error: 'fixed_in_place', params: { item: noun.name } };
  }
  
  // 6. Check container capacity
  const containerTrait = actor.get(TraitType.CONTAINER);
  if (containerTrait?.capacity?.maxItems) {
    const currentItems = context.world.getContents(actor.id)
      .filter(id => {
        const item = context.world.getEntity(id);
        // Don't count worn items
        const wearable = item?.get(TraitType.WEARABLE);
        return !wearable?.worn;
      });
    
    if (currentItems.length >= containerTrait.capacity.maxItems) {
      return { valid: false, error: 'container_full' };
    }
  }
  
  // 7. Check weight limit (if implemented)
  // ...
  
  return { valid: true };
}
```

### 1.3 Apply Pattern to All Actions
Fix each failing action to do its own validation:
- `pushing` - Check pushable, worn state, etc.
- `pulling` - Similar to pushing
- `dropping` - Check if held
- `putting` - Check container state
- `removing` - Check if in container
- `inserting` - Check if container accepts items
- `closing` - Check if closable, already closed
- `opening` - Check if openable, already open
- `locking` - Check if lockable, has key
- `unlocking` - Check if locked, has key

## Phase 2: Fix Message IDs

### 2.1 Document Canonical Message IDs
Create a reference of correct message IDs for each action.

### 2.2 Align Tests and Actions
Either:
- Update action to use test's expected message ID, OR
- Update test to expect action's message ID

Priority: Change whichever is wrong according to the canonical list.

### Example Fixes
```typescript
// pushing.ts - was using 'button_clicks', should be 'button_pushed'
messageId = target.has(TraitType.BUTTON) && !target.has(TraitType.SWITCHABLE) 
  ? 'button_pushed'  // Changed from 'button_clicks'
  : 'other_message';
```

## Phase 3: Fix AGAIN Action

### 3.1 Fix isRepeatableAction Function
```typescript
function isRepeatableAction(actionId: string): boolean {
  const nonRepeatable = [
    IFActions.AGAIN,
    IFActions.SAVING,
    IFActions.RESTORING,
    IFActions.QUITTING,
    IFActions.RESTARTING,
    IFActions.VERSION,
    IFActions.VERIFYING,
    IFActions.HELP,
    IFActions.ABOUT
  ];
  
  return !nonRepeatable.includes(actionId);
}
```

### 3.2 Update AGAIN Tests
Ensure tests properly verify non-repeatable commands are filtered.

## Phase 4: Handle Missing Author Actions

### 4.1 Option A: Implement Missing Actions
Create minimal implementations:
- `/src/actions/author/parser-events.ts`
- `/src/actions/author/validation-events.ts`
- `/src/actions/author/system-events.ts`

### 4.2 Option B: Remove from Tests
Remove references from:
- Vocabulary tests
- Meta-command tests

**Recommendation: Option B** - These seem to be planned but unneeded debug features.

## Phase 5: Fix Container/Scope Issues

### 5.1 Review Container Behaviors
Ensure container behaviors properly track:
- Contents
- Capacity
- Open/closed state

### 5.2 Fix Light/Darkness Detection
Review `looking` action's darkness handling.

## Implementation Order

1. **Fix taking action first** (prototype for pattern)
2. **Create test helper** (for consistent testing)
3. **Fix other manipulation actions** (apply pattern)
4. **Fix message IDs** (quick wins)
5. **Fix AGAIN** (isolated issue)
6. **Remove missing author actions** (cleanup)
7. **Fix container/scope issues** (if time permits)

## Testing Strategy

After each fix:
1. Run the specific test file
2. Verify no regression in passing tests
3. Commit if successful
4. Move to next action

## Success Metrics

- [ ] All validation pattern tests pass
- [ ] Message ID tests pass
- [ ] AGAIN tests pass
- [ ] No regression in previously passing tests
- [ ] Clear pattern established for future actions

## Time Estimate

| Task | Time |
|------|------|
| Fix taking action | 30 min |
| Create test helper | 30 min |
| Fix 10 other actions | 2 hours |
| Fix message IDs | 30 min |
| Fix AGAIN | 30 min |
| Remove author actions | 15 min |
| Testing & verification | 45 min |
| **Total** | **5 hours** |

## Next Steps

1. Start with fixing the `taking` action as prototype
2. Verify approach works
3. Apply to other actions systematically
4. Document patterns for future maintenance