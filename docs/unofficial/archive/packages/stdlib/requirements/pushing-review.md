# Professional Development Review: Pushing Action (IF-Aware)

## Summary
**Component**: `packages/stdlib/src/actions/standard/pushing/pushing.ts`  
**Purpose**: Push objects, buttons, or move heavy items  
**Verdict**: SIGNIFICANT DUPLICATION - Complex logic repeated  
**Score**: 3/10  

## Critical Code Duplication

### ~130 Lines of Near-Identical Logic
```typescript
// Lines 122-206 in validate()
switch (pushableTrait.pushType) {
  case 'button':
    // 30 lines of button logic
  case 'heavy':
    // 20 lines of heavy logic
  case 'moveable':
    // 24 lines of moveable logic
}

// Lines 276-358 in execute() - VERY SIMILAR
switch (pushableTrait.pushType) {
  case 'button':
    // Similar 30 lines (slight variations)
  case 'heavy':
    // Similar 20 lines
  case 'moveable':
    // Similar 24 lines
}
```
**Impact**: High maintenance burden, divergence risk  
**IF Context**: Helper function needed, not duplication  

### Message Parameter Building Duplicated
```typescript
// Lines 209-241 in validate()
const finalMessageParams: Record<string, any> = {};
switch (messageId) {
  // 32 lines of parameter building
}

// Lines 361-389 in execute() - NEARLY IDENTICAL
const finalMessageParams: Record<string, any> = {};
switch (messageId) {
  // Similar 28 lines
}
```
**Additional Duplication**: 60+ lines  

## IF Pattern Assessment

### 1. Execute Returns Events
```typescript
execute(context: ActionContext): ISemanticEvent[]
```
**IF Assessment**: ✅ ACCEPTABLE - Two-phase pattern valid for IF  

### 2. No State Passing
```typescript
validate() {
  // Builds all logic but doesn't pass state
}
execute() {
  // Rebuilds similar logic with variations
}
```
**IF Assessment**: ⚠️ Stateless OK, but use helpers  

### 3. Logic Variations Between Methods
```typescript
// validate(): messageId = 'switch_toggled'
// execute(): messageId = 'button_toggles'
```
**Issue**: Inconsistent message IDs between methods  
**Impact**: Confusing, error-prone  

## What's Actually Wrong (IF-Aware)

### Core Problem: Near-Duplication
Unlike exact duplication, this has subtle differences:
```typescript
// validate() line 143
messageId = 'switch_toggled';

// execute() line 289
messageId = 'button_toggles';
```
These variations make it WORSE - not just duplication but divergent logic!

### Proper Solution
```typescript
private analyzePushAction(context: ActionContext, forExecution: boolean = false) {
    const target = context.command.directObject?.entity;
    const pushableTrait = target.get(TraitType.PUSHABLE);
    
    // Build event data and determine message
    const eventData = this.buildPushEventData(target, pushableTrait);
    const messageId = this.determinePushMessage(pushableTrait, forExecution);
    const params = this.buildMessageParams(messageId, target, eventData);
    
    return { eventData, messageId, params };
}

validate(context): ValidationResult {
    // Validation-specific checks
    if (!target) return { valid: false, error: 'no_target' };
    
    const analysis = this.analyzePushAction(context, false);
    return { valid: true };
}

execute(context): ISemanticEvent[] {
    const analysis = this.analyzePushAction(context, true);
    
    return [
        context.event('if.event.pushed', analysis.eventData),
        context.event('action.success', {
            actionId: this.id,
            messageId: analysis.messageId,
            params: analysis.params
        })
    ];
}
```

## Quality Metrics (IF-Adjusted)

### Code Quality: D
- ~190 lines of near-duplication
- Divergent logic between methods
- No helper extraction

### Maintainability: F
- Changes need careful duplication
- Risk of divergence HIGH
- Already has inconsistencies

### IF Compliance: C
- Pattern acceptable (two-phase)
- Implementation poor
- Stateless but wasteful

## Specific Issues Found

### 1. Message ID Inconsistency
- `switch_toggled` vs `button_toggles`
- `button_pushed` vs `button_pressed`
- Different messages for same action!

### 2. State Checking Differences
```typescript
// validate() checks more thoroughly
if (switchableData) {
    const switchable = switchableData as SwitchableTrait;
    
// execute() uses looser check
const switchable = switchableData as { isOn?: boolean };
```

### 3. No Actual State Changes
Neither method actually:
- Toggles switches
- Moves objects
- Activates buttons
Just creates events saying they happened!

## Comparison with Other Actions

### vs. Pulling (1/10)
- Pulling: 311 lines exact duplication
- Pushing: ~190 lines near-duplication
- Both terrible, pushing slightly better

### vs. Opening (8.5/10)
- Opening: Proper behavior delegation
- Pushing: No behavior usage at all

## Business Impact

### Development Risk
- **Bug potential**: HIGH - divergent logic
- **Maintenance cost**: 2x effort minimum
- **Testing burden**: Must test both paths

### Technical Debt
- Near-duplication harder to fix than exact
- Already diverging (different messages)
- No state mutations occurring

## Required Changes

### Priority 1: Extract Helpers
```typescript
private buildPushEventData(target, trait): PushedEventData
private determinePushMessage(trait, forExecution): string
private buildMessageParams(messageId, target, data): Record<string, any>
```

### Priority 2: Fix Inconsistencies
- Unify message IDs between methods
- Consistent type handling
- Document why variations exist

### Priority 3: Add State Mutations
- Actually toggle switches
- Actually move objects
- Use behaviors if available

## Review Summary (IF-Aware)

The pushing action uses an acceptable IF two-phase pattern but implements it poorly. With ~190 lines of near-duplicate logic and already-diverging message IDs, this represents significant technical debt. The variations between validate() and execute() make this worse than exact duplication.

No actual state changes occur - the action just creates events claiming things happened.

**Recommendation**: MAJOR REFACTORING REQUIRED  
**Estimated fix time**: 12 hours  
**Priority**: HIGH (divergent logic risk)  

## Lessons for Team

1. Near-duplication is worse than exact duplication
2. Helper functions prevent divergence
3. Consistent messages matter for gameplay
4. Actions should actually change state
5. IF patterns don't excuse poor implementation

---
*Review conducted with IF platform awareness*