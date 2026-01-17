# Generic Capability Dispatch Analysis

**Date**: 2026-01-17
**Status**: Design Analysis
**Related**: ADR-090 (Universal Capability Dispatch), troll-logic.md

## Goal

Make capability dispatch **generic** so that:
1. All actions automatically check for capability claims without modifying each action
2. Visibility/scope automatically checks for `if.scope.visible` capability claims
3. Stories only need to register traits + behaviors - no stdlib/engine changes needed

## Current State

### Action Dispatch (Partial)

**Location**: `packages/engine/src/command-executor.ts:167-178`

```typescript
// Universal Capability Dispatch: Check if target entity has a capability for this action
// If so, the entity's behavior handles the action instead of the stdlib default
const capabilityCheck = checkCapabilityDispatch(
  command.actionId,
  command.directObject?.entity  // Only checks directObject!
);
```

**Current limitation**: Only checks the direct object entity. Indirect objects and other involved entities are not checked.

### Visibility (Not Implemented)

**Location**: `packages/world-model/src/world/VisibilityBehavior.ts`

Key methods:
- `canSee()` (line 62-114) - Checks if observer can see target
- `getVisible()` (line 119-201) - Gets all visible entities
- `isVisible()` (line 391-436) - Checks if entity is visible in context

**Current checks**:
1. SceneryTrait.visible === false → hidden
2. Closed opaque containers → blocked
3. Darkness → limited visibility

**Missing**: No capability dispatch check for `if.scope.visible`

---

## Architecture Deep Dive

### Capability System (world-model)

**Files**:
- `packages/world-model/src/capabilities/capability-helpers.ts` - Query functions
- `packages/world-model/src/capabilities/capability-registry.ts` - Behavior registration

**Key Functions**:
```typescript
// Find trait that claims a capability
findTraitWithCapability(entity, actionId) → ITrait | undefined

// Get registered behavior for trait+capability
getBehaviorForCapability(trait, capability) → CapabilityBehavior | undefined

// Register a behavior (called by stories)
registerCapabilityBehavior(traitType, capability, behavior)
```

**Trait declares capabilities**:
```typescript
class TrollAxeTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll_axe';
  static readonly capabilities = ['if.action.taking'] as const;
}
```

### Action Execution Flow

```
CommandExecutor.execute(input)
  ↓
1. parser.parse(input) → IParsedCommand
  ↓
2. validator.validate(parsedCommand) → ValidatedCommand
  ↓
3. checkCapabilityDispatch(actionId, directObject)  ← INTEGRATION POINT A
  ↓
4a. If capability found → behavior.validate/execute/report/blocked
4b. If no capability → action.validate/execute/report/blocked
  ↓
5. eventProcessor.processEvents(events)
```

### Visibility Flow

```
Parser needs visible entities
  ↓
ScopeEvaluator.getVisibleEntities(context)
  ↓
context.world.getVisible(actorId)  (WorldModel)
  ↓
VisibilityBehavior.getVisible(observer, world)  ← INTEGRATION POINT B
  ↓
For each candidate entity:
  - Check SceneryTrait.visible
  - Check container visibility
  - Check darkness
  - [NEW] Check if.scope.visible capability
```

---

## Proposed Changes

### Integration Point A: Generic Action Dispatch

**File**: `packages/engine/src/command-executor.ts`

**Current** (lines 167-178):
```typescript
const capabilityCheck = checkCapabilityDispatch(
  command.actionId,
  command.directObject?.entity
);
```

**Proposed**:
```typescript
// Check ALL entities involved in the command
const entitiesToCheck = [
  command.directObject?.entity,
  command.indirectObject?.entity,
  // Add other slots if needed
].filter(Boolean) as IFEntity[];

let capabilityCheck: CapabilityDispatchCheck = { shouldDispatch: false };

for (const entity of entitiesToCheck) {
  const check = checkCapabilityDispatch(command.actionId, entity);
  if (check.shouldDispatch) {
    capabilityCheck = check;
    break; // First entity with capability wins
  }
}
```

**Blast Radius**:
- **Low**: Only changes loop in command-executor.ts
- **Backward compatible**: Existing behaviors continue to work
- **Test coverage**: Existing capability dispatch tests still pass

### Integration Point B: Generic Visibility Dispatch

**File**: `packages/world-model/src/world/VisibilityBehavior.ts`

**Add to `canSee()` method** (after line 68, before container checks):

```typescript
// Check if entity has visibility capability that blocks being seen
const visibilityTrait = findTraitWithCapability(target, 'if.scope.visible');
if (visibilityTrait) {
  const behavior = getBehaviorForCapability(visibilityTrait, 'if.scope.visible');
  if (behavior) {
    const result = behavior.validate(target, world, observer.id, {});
    if (!result.valid) {
      return false; // Entity blocks visibility
    }
  }
}
```

**Add to `getVisible()` method** (line 166-172, in the entity visibility check):

```typescript
// Check capability-based visibility
const visibilityTrait = findTraitWithCapability(entity, 'if.scope.visible');
if (visibilityTrait) {
  const behavior = getBehaviorForCapability(visibilityTrait, 'if.scope.visible');
  if (behavior) {
    const result = behavior.validate(entity, world, observer.id, {});
    if (!result.valid) {
      continue; // Skip this entity - capability says it's not visible
    }
  }
}
```

**Blast Radius**:
- **Medium**: Changes core visibility logic
- **Backward compatible**: Only affects entities that declare `if.scope.visible` capability
- **Performance**: Adds one Map lookup per entity (negligible)
- **Test coverage**: Need new tests for visibility capability

---

## Story Usage Example

### Troll Axe with Visibility Control

```typescript
// stories/dungeo/src/traits/troll-axe-trait.ts
export class TrollAxeTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll_axe';
  static readonly capabilities = [
    'if.action.taking',    // Blocks taking when troll alive
    'if.scope.visible'     // Hides axe when troll unconscious
  ] as const;

  guardianId: EntityId;
}

// stories/dungeo/src/traits/troll-axe-behaviors.ts
export const TrollAxeVisibilityBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const trait = entity.get<TrollAxeTrait>(TrollAxeTrait.type);
    const guardian = world.getEntity(trait.guardianId);
    const combatant = guardian?.get<CombatantTrait>(TraitType.COMBATANT);

    // Hidden when troll is unconscious (alive but not conscious)
    if (combatant?.isAlive && !combatant.isConscious) {
      return { valid: false }; // Not visible
    }
    return { valid: true }; // Visible
  },
  execute() {},
  report() { return []; },
  blocked() { return []; }
};

// In story init
registerCapabilityBehavior(
  TrollAxeTrait.type,
  'if.scope.visible',
  TrollAxeVisibilityBehavior
);
```

---

## File Changes Summary

| File | Change | Lines | Impact |
|------|--------|-------|--------|
| `packages/engine/src/command-executor.ts` | Check all entities | ~15 | Low |
| `packages/world-model/src/world/VisibilityBehavior.ts` | Add capability check in `canSee()` | ~10 | Medium |
| `packages/world-model/src/world/VisibilityBehavior.ts` | Add capability check in `getVisible()` | ~10 | Medium |
| `packages/world-model/src/world/VisibilityBehavior.ts` | Import capability functions | ~2 | Low |

**Total**: ~37 lines of platform code

---

## Dependencies

New import needed in VisibilityBehavior.ts:
```typescript
import { findTraitWithCapability, getBehaviorForCapability } from '../capabilities';
```

This creates a dependency from `world-model/world/` to `world-model/capabilities/`.
Both are within the same package, so no cross-package dependency issues.

---

## Alternative Considered: Per-Action Updates

Instead of generic dispatch, we could update each action individually:
- taking.ts → add capability check
- giving.ts → add capability check
- throwing.ts → add capability check
- ... (43 actions total)

**Rejected because**:
1. 43 files to modify vs 2 files
2. Easy to miss actions
3. New actions would need manual capability check
4. Violates DRY principle

---

## Testing Strategy

### Unit Tests

1. **Action dispatch with multiple entities**
   - Test that indirectObject capability is checked
   - Test priority (first entity with capability wins)

2. **Visibility capability**
   - Test that `if.scope.visible` blocks `canSee()`
   - Test that `if.scope.visible` filters `getVisible()`
   - Test that missing behavior falls through (no crash)

### Integration Tests (Transcript)

```transcript
# Test axe visibility during troll states

> look
Troll Room
A nasty-looking troll...
A bloody axe is here.

> GDT KNOCK_OUT troll

> look
Troll Room
An unconscious troll...
(no axe mentioned)

> take axe
You can't see any such thing.

> GDT WAKE_UP troll

> look
The troll stirs...
A bloody axe is here.
```

---

## Implementation Order

1. **Phase 1: Action dispatch enhancement** (Low risk)
   - Update command-executor.ts to check all entities
   - Add tests for multi-entity capability dispatch

2. **Phase 2: Visibility capability** (Medium risk)
   - Add imports to VisibilityBehavior.ts
   - Add capability check to `canSee()`
   - Add capability check to `getVisible()`
   - Add tests for visibility capability

3. **Phase 3: Story implementation** (No platform risk)
   - Add `if.scope.visible` to TrollAxeTrait.capabilities
   - Create TrollAxeVisibilityBehavior
   - Register behavior in story init
   - Add transcript test

---

## Declarative Dispatch Configuration

Instead of hard-coding dispatch behavior, make it declarative via **global defaults + registration override**.

### API Design

```typescript
// 1. Define global defaults for a capability (platform or story init)
defineCapabilityDefaults('if.scope.visible', {
  resolution: 'any-blocks',  // How multiple claims are resolved
  mode: 'blocking'           // How validation result affects action
});

defineCapabilityDefaults('if.action.taking', {
  resolution: 'first-wins',
  mode: 'blocking'
});

// 2. Register behavior with optional overrides
registerCapabilityBehavior(TrollAxeTrait.type, 'if.scope.visible', behavior, {
  priority: 50  // Uses global defaults for resolution/mode
});

// Override defaults when needed
registerCapabilityBehavior(SpecialTrait.type, 'if.action.taking', behavior, {
  priority: 100,
  resolution: 'any-blocks'  // Override global default
});
```

### Resolution Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `first-wins` | First entity with capability determines result | Single-handler actions (taking, opening) |
| `any-blocks` | Any `valid: false` blocks the action | Visibility, guards |
| `all-must-pass` | All must return `valid: true` | Multi-step validation |
| `highest-priority` | Only highest priority entity checked | Competing handlers |

### Behavior Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `blocking` | Failed validation blocks action | Most capabilities |
| `advisory` | Result passed to action, no auto-block | Hints, warnings |
| `chain` | All run in order, sharedData passed through | Multi-step processing |

### Implementation

**New file**: `packages/world-model/src/capabilities/capability-defaults.ts`

```typescript
interface CapabilityConfig {
  resolution: 'first-wins' | 'any-blocks' | 'all-must-pass' | 'highest-priority';
  mode: 'blocking' | 'advisory' | 'chain';
}

const capabilityDefaults = new Map<string, CapabilityConfig>();

export function defineCapabilityDefaults(
  capabilityId: string,
  config: Partial<CapabilityConfig>
): void {
  capabilityDefaults.set(capabilityId, {
    resolution: config.resolution ?? 'first-wins',
    mode: config.mode ?? 'blocking'
  });
}

export function getCapabilityConfig(capabilityId: string): CapabilityConfig {
  return capabilityDefaults.get(capabilityId) ?? {
    resolution: 'first-wins',
    mode: 'blocking'
  };
}
```

**Update**: `packages/world-model/src/capabilities/capability-registry.ts`

```typescript
interface BehaviorRegistrationOptions {
  priority?: number;           // Default: 0
  resolution?: CapabilityConfig['resolution'];  // Override global
  mode?: CapabilityConfig['mode'];              // Override global
}

export function registerCapabilityBehavior<T extends ITrait>(
  traitType: string,
  capability: string,
  behavior: CapabilityBehavior,
  options?: BehaviorRegistrationOptions
): void {
  // ... existing registration logic ...
  // Store options with binding
}
```

**Update**: `packages/engine/src/capability-dispatch-helper.ts`

```typescript
export function checkCapabilityDispatch(
  actionId: string,
  entities: IFEntity[]
): CapabilityDispatchCheck {
  const config = getCapabilityConfig(actionId);

  // Collect all claims
  const claims: Array<{ entity: IFEntity; trait: ITrait; behavior: CapabilityBehavior; priority: number }> = [];

  for (const entity of entities) {
    const trait = findTraitWithCapability(entity, actionId);
    if (trait) {
      const behavior = getBehaviorForCapability(trait, actionId);
      const binding = getBehaviorBinding(trait, actionId);
      if (behavior) {
        claims.push({
          entity,
          trait,
          behavior,
          priority: binding?.priority ?? 0
        });
      }
    }
  }

  if (claims.length === 0) {
    return { shouldDispatch: false };
  }

  // Sort by priority (highest first)
  claims.sort((a, b) => b.priority - a.priority);

  // Apply resolution strategy
  switch (config.resolution) {
    case 'first-wins':
    case 'highest-priority':
      return { shouldDispatch: true, ...claims[0] };

    case 'any-blocks':
    case 'all-must-pass':
      return {
        shouldDispatch: true,
        claims,  // Pass all for aggregate validation
        resolution: config.resolution
      };
  }
}
```

### Platform Defaults

```typescript
// In engine or stdlib initialization
defineCapabilityDefaults('if.scope.visible', {
  resolution: 'any-blocks',
  mode: 'blocking'
});

// Actions default to first-wins (backward compatible)
// No explicit definition needed - falls back to default
```

### File Changes (Updated)

| File | Change | Lines |
|------|--------|-------|
| `packages/world-model/src/capabilities/capability-defaults.ts` | **New file** | ~40 |
| `packages/world-model/src/capabilities/capability-registry.ts` | Add options to registration | ~20 |
| `packages/world-model/src/capabilities/index.ts` | Export new functions | ~3 |
| `packages/engine/src/capability-dispatch-helper.ts` | Resolution logic | ~50 |
| `packages/world-model/src/world/VisibilityBehavior.ts` | Visibility capability check | ~20 |

**Total**: ~133 lines of platform code

---

## Decision Points for Discussion

1. **Standard capability ID**: Should we use `if.scope.visible` or something else?
   - `if.scope.visible` - Matches action ID pattern
   - `if.capability.visibility` - More explicit
   - `core.scope.visible` - Indicates platform-level

2. **Behavior phases for visibility**: Full 4-phase or just validate?
   - Current proposal: Only `validate()` needed (returns valid/invalid)
   - execute/report/blocked not meaningful for scope queries

3. **Default resolution**: Should platform default be `first-wins` or `any-blocks`?
   - `first-wins` - Backward compatible, simpler
   - `any-blocks` - Safer default, prevents accidental bypass

---

## Conclusion

Generic capability dispatch requires ~37 lines of platform changes across 2 files. This enables stories to:
- Block any action on any entity via traits
- Control visibility of any entity via traits
- No stdlib/action changes needed for new capabilities

The architecture already supports this pattern - we're just making it automatic instead of manual.
