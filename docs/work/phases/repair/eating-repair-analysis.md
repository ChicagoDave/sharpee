# Eating Action Repair Analysis

**Date**: 2025-12-26
**Status**: Analysis Complete

## Executive Summary

The eating action has **9 distinct issues** ranging from critical type safety violations to optional IF enhancements. The core problem is that the action was apparently written before the EdibleTrait/EdibleBehavior APIs were finalized, resulting in semantic drift and bypassed behavior patterns.

---

## Issue Inventory

### Issue 1: No Reachability Validation (CRITICAL)

**Location**: `eating.ts:68-108` (validate function)

**Current State**:
```typescript
metadata: {
  directObjectScope: ScopeLevel.REACHABLE  // Declared but not enforced
}

validate(context: ActionContext): ValidationResult {
  const item = context.command.directObject?.entity;
  if (!item) { ... }
  if (!item.has(TraitType.EDIBLE)) { ... }
  // NO context.canReach() check!
}
```

**Problem**: The action declares `REACHABLE` scope but never validates it. If the parser fails or scope changes between parsing and execution, the player could eat unreachable items.

**Available API**: `context.canReach(entity: IFEntity): boolean` exists in ActionContext (line 57).

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Add defensive check** | Add `if (!context.canReach(item))` validation | Simple, matches other actions pattern, type-safe | Double-checking what parser should handle |
| **B: Trust parser entirely** | Document as "by design" | No code changes | Risk if parser has bugs or scope changes |
| **C: Add debug mode** | Check only in development | Best of both worlds | Build complexity |

**Recommendation**: Option A - Add defensive check. The context API exists specifically for this.

---

### Issue 2: Behavior Completely Bypassed (CRITICAL)

**Location**: `eating.ts:115-194` (execute function)

**Current State**:
```typescript
execute(context: ActionContext): void {
  // Direct trait mutation
  (edibleTrait as any).consumed = true;
}
```

**Problem**: The action ignores EdibleBehavior entirely and mutates the trait directly. The behavior has a well-designed `consume()` method that:
- Decrements `servings`
- Emits proper events (`IFEvents.ITEM_EATEN`, `IFEvents.ITEM_DESTROYED`)
- Handles the "nothing left" case
- Returns proper event chain

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Delegate to behavior** | Replace execute body with `EdibleBehavior.consume()` | Proper separation of concerns, existing logic reused | Need to adapt event handling |
| **B: Port behavior logic to action** | Copy behavior logic, maintain in action | Action stays self-contained | Duplication, divergence risk |
| **C: Hybrid approach** | Use behavior for mutation, action for events | Clear responsibilities | Two places to understand |

**Recommendation**: Option A - Full delegation. The behavior is the source of truth for consumption logic.

---

### Issue 3: Property Mismatch - `portions` vs `servings` (CRITICAL)

**Location**: `eating.ts:135-144`, `eating-events.ts:22-25`

**Current State**:
- Action code: `(edibleTrait as any).portions`
- Trait definition: `servings: number` (line 12 of edibleTrait.ts)
- Event data: `portions?: number; portionsRemaining?: number;`

**Problem**: Semantic drift. The trait calls it `servings`, the action calls it `portions`. These mean the same thing but use different names.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Action uses trait terminology** | Change action to use `servings` | Aligns with world-model | Event contract changes |
| **B: Trait uses action terminology** | Change trait to use `portions` | Aligns with action | World-model API changes |
| **C: Map at boundary** | Action internally maps servings→portions | Both APIs stable | Translation complexity |

**Recommendation**: Option A - Action should use trait terminology. World-model is the source of truth.

---

### Issue 4: Property Mismatch - `isDrink` vs `liquid` (MEDIUM)

**Location**: `eating.ts:91-97`

**Current State**:
```typescript
if ((edibleTrait as any).isDrink) {
  return { valid: false, error: 'is_drink' };
}
```

**Trait Definition**:
```typescript
liquid: boolean;  // Whether this is a liquid (drunk vs eaten)
```

**Problem**: Checking wrong property. `isDrink` doesn't exist; `liquid` does.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Use `liquid` property** | `if (edibleTrait.liquid)` | Matches trait definition | None |
| **B: Use behavior method** | `if (EdibleBehavior.isLiquid(item))` | Most type-safe | Extra call |

**Recommendation**: Option B - Use `EdibleBehavior.isLiquid()` for consistency with behavior delegation.

---

### Issue 5: Nonexistent Property - `consumed` (CRITICAL)

**Location**: `eating.ts:100-106` (validate), `eating.ts:187` (execute)

**Current State**:
```typescript
// Validate
if ((edibleTrait as any).consumed) { ... }

// Execute
(edibleTrait as any).consumed = true;
```

**Problem**: `consumed` is not defined in EdibleTrait. The action sets it via unsafe cast but the trait never declares or uses it.

**The behavior uses a different model**: `servings <= 0` means consumed.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Use servings model** | `servings <= 0` = consumed | Matches behavior, no trait changes | Binary vs gradual consumption |
| **B: Add consumed to trait** | Add `consumed?: boolean` to IEdibleData | Explicit state tracking | New property, trait change |
| **C: Use behavior methods** | `EdibleBehavior.isEmpty()` and `EdibleBehavior.canConsume()` | Best encapsulation | None |

**Recommendation**: Option C - Use behavior methods. `EdibleBehavior.canConsume()` checks `servings > 0`.

---

### Issue 6: Nonexistent Property - `taste` (LOW)

**Location**: `eating.ts:147-165`

**Current State**:
```typescript
const taste = (edibleTrait as any).taste;
if (taste) {
  switch (taste) {
    case 'delicious': messageId = 'delicious'; break;
    // etc.
  }
}
```

**Problem**: `taste` is not in EdibleTrait. This code always evaluates to `undefined`.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Add taste to trait** | Add `taste?: 'delicious' \| 'tasty' \| 'bland' \| 'awful'` | Enables feature | Trait grows |
| **B: Remove dead code** | Delete the taste switch block | Cleaner action | Loses planned feature |
| **C: Use consumeMessage** | Map to existing `consumeMessage` property | No trait changes | Different semantics |

**Recommendation**: Option A or B depending on whether taste is a desired feature.

---

### Issue 7: Nonexistent Property - `effects` Array (LOW)

**Location**: `eating.ts:169-174`

**Current State**:
```typescript
if ((edibleTrait as any).effects) {
  eventData.effects = (edibleTrait as any).effects;
  if ((edibleTrait as any).effects.includes('poison')) {
    messageId = 'poisonous';
  }
}
```

**Trait Definition**:
```typescript
hasEffect: boolean;
effectDescription?: string;
```

**Problem**: Trait has a boolean + string for effects, not an array. The action expects an array of effect names.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Expand trait model** | Add `effects?: string[]` to trait | Rich effect system | Larger trait |
| **B: Use existing properties** | Check `hasEffect` + parse `effectDescription` | Works with current trait | Limited expressiveness |
| **C: Remove for now** | Delete effects array logic | Simpler | Loses feature |

**Recommendation**: Decide on effects architecture first. Current code is dead anyway.

---

### Issue 8: Nonexistent Property - `satisfiesHunger` (LOW)

**Location**: `eating.ts:177-184`

**Current State**:
```typescript
if ((edibleTrait as any).satisfiesHunger !== undefined) {
  eventData.satisfiesHunger = (edibleTrait as any).satisfiesHunger;
  // ...
}
```

**Problem**: Property doesn't exist. This is dead code.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Add to trait** | Add `satisfiesHunger?: boolean` | Enables hunger system | Trait grows |
| **B: Use nutrition threshold** | `nutrition >= X` → satisfies hunger | Semantic derivation | Implicit logic |
| **C: Remove dead code** | Delete this block | Cleaner | Loses feature |

**Recommendation**: Option C unless hunger system is being developed.

---

### Issue 9: No Implicit Taking (OPTIONAL ENHANCEMENT)

**Location**: Not implemented

**IF Expectation**: In many IF games, `EAT APPLE` when the apple is on the table will first implicitly take the apple, then eat it.

**Current State**: If item isn't held, eating proceeds anyway (no holding requirement). The action doesn't check or require holding.

**Repair Options**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Require holding** | Validate item is in inventory, fail if not | Clear constraint | Less convenient |
| **B: Implicit take** | If not held, attempt take first | Traditional IF behavior | Complex multi-action |
| **C: Require reachability only** | Current behavior (eat anything reachable) | Simple, modern | Non-traditional |

**Recommendation**: Defer - this is a design decision about IF conventions vs. convenience.

---

## Repair Phases

### Phase 1: Critical Type Safety (Must Do)

1. **Issue 5**: Replace `consumed` checks with `EdibleBehavior.canConsume()` / `isEmpty()`
2. **Issue 4**: Replace `isDrink` with `EdibleBehavior.isLiquid()`
3. **Issue 3**: Replace `portions` with `servings`
4. **Issue 2**: Use `EdibleBehavior.consume()` instead of direct mutation

### Phase 2: Defensive Validation (Should Do)

5. **Issue 1**: Add `context.canReach()` check in validate

### Phase 3: Dead Code Cleanup (Could Do)

6. **Issue 6**: Remove or implement `taste`
7. **Issue 7**: Remove or implement `effects` array
8. **Issue 8**: Remove or implement `satisfiesHunger`

### Phase 4: IF Enhancement (Optional)

9. **Issue 9**: Decide on implicit taking / holding requirement

---

## Implementation Sketch

After Phase 1-2 repairs, the eating action would look like:

```typescript
validate(context: ActionContext): ValidationResult {
  const item = context.command.directObject?.entity;

  if (!item) {
    return { valid: false, error: 'no_item' };
  }

  // Defensive reachability check
  if (!context.canReach(item)) {
    return { valid: false, error: 'not_reachable', params: { item: item.name } };
  }

  if (!item.has(TraitType.EDIBLE)) {
    return { valid: false, error: 'not_edible', params: { item: item.name } };
  }

  // Use behavior for liquid check
  if (EdibleBehavior.isLiquid(item)) {
    return { valid: false, error: 'is_drink', params: { item: item.name } };
  }

  // Use behavior for consumption check
  if (!EdibleBehavior.canConsume(item)) {
    return { valid: false, error: 'already_consumed', params: { item: item.name } };
  }

  return { valid: true };
}

execute(context: ActionContext): void {
  const item = context.command.directObject!.entity!;
  const actor = context.player;

  // Delegate to behavior for all mutation and event generation
  const events = EdibleBehavior.consume(item, actor);

  // Store for report phase
  context.sharedData.consumeEvents = events;
  context.sharedData.itemId = item.id;
  context.sharedData.itemName = item.name;
  context.sharedData.servingsRemaining = EdibleBehavior.getServings(item);
}
```

---

## Decision Points for Discussion

1. **Taste/Effects/Hunger**: Are these features we want? If so, trait needs expansion. If not, remove dead code.

2. **Holding Requirement**: Should eating require holding the item? Traditional IF vs. convenience.

3. **Event Strategy**: When delegating to behavior, how do we merge behavior events with action events?

4. **EatenEventData Contract**: Changing `portions` → `servings` breaks event contract. Is this acceptable?

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/stdlib/src/actions/standard/eating/eating.ts` | Major rewrite |
| `packages/stdlib/src/actions/standard/eating/eating-events.ts` | Rename portions→servings |
| `packages/world-model/src/traits/edible/edibleTrait.ts` | Optional: add taste/effects if keeping |
| `packages/stdlib/tests/unit/actions/eating*.ts` | Update tests |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing stories | Low | High | Golden tests exist |
| Event contract changes | Medium | Medium | Version event types |
| Behavior event merge conflicts | Medium | Low | Clear event ownership |

---

## Next Steps

1. [ ] Get decision on taste/effects/hunger features
2. [ ] Get decision on holding requirement
3. [ ] Implement Phase 1 (critical type safety)
4. [ ] Run golden tests
5. [ ] Implement Phase 2 (defensive validation)
6. [ ] Update/cleanup dead code (Phase 3)
