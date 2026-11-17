# Assessment: switching_on and LightSourceTrait Synchronization Gap

**Date**: 2025-12-28
**Issue**: Lantern can be switched on but doesn't emit light
**Status**: Root cause identified, fix straightforward

## Problem Summary

When switching on the brass lantern in Dungeo, the `switching_on` action correctly marks the device as "on" via `SwitchableTrait`, but fails to synchronize with `LightSourceTrait.isLit`. This creates an inconsistent state where the lantern is "on" but not "lit".

## Root Cause

**Missing behavior coordination in the execute phase.**

The `switching_on` action only coordinates one behavior:

```typescript
// packages/stdlib/src/actions/standard/switching_on/switching_on.ts:106
const result = SwitchableBehavior.switchOn(noun);
```

It does NOT coordinate the light source behavior:

```typescript
// MISSING: LightSourceBehavior.light(noun)
```

Per ADR-051, actions should coordinate multiple behaviors when an entity has multiple relevant traits. The action collects light source data for reporting but never calls the behavior that owns the light state mutation.

## State After switching_on

| Trait | Property | Value | Expected |
|-------|----------|-------|----------|
| SwitchableTrait | `isOn` | `true` | `true` |
| LightSourceTrait | `isLit` | `undefined` | `true` |

## Why It "Sometimes Works"

`LightSourceBehavior.isLit()` has fallback logic that masks the bug:

```typescript
// packages/world-model/src/traits/light-source/lightSourceBehavior.ts:49-64
static isLit(source: IFEntity): boolean {
  // Priority 1: Explicit isLit property
  if (trait.isLit !== undefined) {
    return trait.isLit;
  }
  // Priority 2: Fallback to switchable state
  if (source.hasTrait(TraitType.SWITCHABLE)) {
    return SwitchableBehavior.isOn(source);  // <-- hides the bug
  }
  return true;
}
```

This fallback creates implicit cross-trait coupling instead of explicit state synchronization.

## Recommended Fix

### Option A: Coordinate in switching_on/switching_off (Recommended)

Add light source coordination to both actions:

**switching_on.ts execute phase:**
```typescript
execute(context: ActionContext): void {
  const { noun, sharedData } = context;

  // Coordinate switchable behavior
  const result = SwitchableBehavior.switchOn(noun);

  // Coordinate light source behavior if applicable
  if (noun.hasTrait(TraitType.LIGHT_SOURCE)) {
    LightSourceBehavior.light(noun);
  }

  // ... rest of execute phase
}
```

**switching_off.ts execute phase:**
```typescript
execute(context: ActionContext): void {
  const { noun, sharedData } = context;

  // Coordinate switchable behavior
  const result = SwitchableBehavior.switchOff(noun);

  // Coordinate light source behavior if applicable
  if (noun.hasTrait(TraitType.LIGHT_SOURCE)) {
    LightSourceBehavior.extinguish(noun);
  }

  // ... rest of execute phase
}
```

**Pros**:
- Follows ADR-051 pattern (actions coordinate behaviors)
- Explicit state synchronization
- No cross-trait coupling in behaviors

**Cons**:
- Must update both actions

### Option B: Move Coordination to SwitchableBehavior

Make `SwitchableBehavior.switchOn()` aware of light sources:

```typescript
static switchOn(device: IFEntity): SwitchResult {
  trait.isOn = true;

  // Coordinate with LightSourceBehavior
  if (device.hasTrait(TraitType.LIGHT_SOURCE)) {
    LightSourceBehavior.light(device);
  }

  return { ... };
}
```

**Pros**:
- Single point of change
- Auto-coordinates for any action that uses SwitchableBehavior

**Cons**:
- Creates coupling between behaviors (violates separation)
- SwitchableBehavior shouldn't know about LightSourceBehavior

### Option C: Remove Fallback Logic

Remove the fallback in `LightSourceBehavior.isLit()` and require explicit state:

```typescript
static isLit(source: IFEntity): boolean {
  return trait.isLit ?? false;  // No more switchable fallback
}
```

**Pros**:
- Forces explicit state management
- Removes hidden coupling

**Cons**:
- Breaking change - all existing light sources need explicit initialization
- Doesn't fix the root cause (still need action coordination)

## Recommendation

**Use Option A**: Coordinate in both `switching_on` and `switching_off` actions.

This follows the established architecture where:
- Behaviors own mutations (LightSourceBehavior.light() sets isLit)
- Actions coordinate behaviors (switching_on calls both relevant behaviors)
- No cross-trait coupling in behaviors

## Files to Modify

1. `packages/stdlib/src/actions/standard/switching_on/switching_on.ts`
   - Add `LightSourceBehavior.light(noun)` in execute phase
   - Add import for `LightSourceBehavior` and `TraitType.LIGHT_SOURCE`

2. `packages/stdlib/src/actions/standard/switching_off/switching_off.ts`
   - Add `LightSourceBehavior.extinguish(noun)` in execute phase
   - Add import for `LightSourceBehavior` and `TraitType.LIGHT_SOURCE`

## Testing

After fix, verify with Dungeo transcript:

```
> take lantern
Taken.

> switch on lantern
The brass lantern is now on. It illuminates the area.

> go down
Cellar
[Room should be lit and described]
```

## Related

- ADR-051: Three-phase action pattern
- `packages/world-model/src/traits/light-source/lightSourceBehavior.ts`
- `packages/world-model/src/traits/switchable/switchableBehavior.ts`
