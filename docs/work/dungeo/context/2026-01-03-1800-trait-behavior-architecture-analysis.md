# Trait/Behavior Architecture Analysis

**Date**: 2026-01-03 18:00
**Branch**: vehicle-trait
**Status**: Analysis complete, needs discussion

## Problem Statement

"enter bucket" fails with INVALID_SYNTAX even though:
- Bucket exists and is visible (examine works)
- Bucket has ContainerTrait with `enterable: true`
- Bucket has VehicleTrait
- Grammar has `enter :portal` with scope constraint `.matching({ enterable: true })`

## Current Architecture

### Traits = Data

Traits are pure data structures stored on entities:

```typescript
export class ContainerTrait implements ITrait {
  static readonly type = TraitType.CONTAINER;
  readonly type = TraitType.CONTAINER;

  capacity?: ICapacity;
  isTransparent: boolean;
  enterable: boolean;        // <-- The property we need
  allowedTypes?: string[];
  excludedTypes?: string[];
}
```

### Behaviors = Logic (Separate Classes)

Behaviors are static utility classes that operate on traits:

```typescript
export class ContainerBehavior extends Behavior {
  static requiredTraits = [TraitType.CONTAINER];

  static canAccept(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean { ... }
  static isEnterable(container: IFEntity): boolean {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    return trait.enterable || false;
  }
}
```

### How They're Connected

1. Each trait module (e.g., `traits/container/`) has an `index.ts` that exports both:
   ```typescript
   export { ContainerTrait } from './containerTrait';
   export { ContainerBehavior, ... } from './containerBehavior';
   ```

2. The main traits index re-exports everything:
   ```typescript
   export * from './container';  // Gets both ContainerTrait and ContainerBehavior
   ```

3. **BUT**: When you call `entity.add(new ContainerTrait())`:
   - Only the trait DATA is stored on the entity
   - No behaviors are "attached" or registered
   - Code must explicitly import and call behaviors

### How Actions Use This

Actions explicitly call behavior methods:

```typescript
// From entering.ts
import { ContainerBehavior, SupporterBehavior } from '@sharpee/world-model';

// In validate():
if (!ContainerBehavior.canAccept(target, actor, context.world)) {
  return { valid: false, error: EnteringMessages.TOO_FULL };
}
```

## The Vehicle Composition Problem

### What We Have

```typescript
// Bucket creation
bucket.add(new ContainerTrait({ enterable: true, capacity: {...} }));
bucket.add(new VehicleTrait({ vehicleType: 'counterweight', blocksWalkingMovement: true }));
```

Two independent traits, no link between them.

### What the Grammar Expects

```typescript
grammar
  .define('enter :portal')
  .where('portal', (scope) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
```

The scope constraint `{ enterable: true }` needs to find the bucket.

### Where It Breaks

The ScopeEvaluator checks for `enterable`:

```typescript
private static getPropertyValue(entity: IEntity, key: string): unknown {
  // Check direct entity property
  if (key in entity) return (entity as any)[key];

  // Check trait properties
  const traitPropertyMap = {
    'enterable': ['container', 'supporter', 'room'],  // <-- Should check ContainerTrait
    ...
  };

  for (const traitName of traitsToCheck) {
    const trait = (entity as any).get(traitName);  // Gets ContainerTrait
    if (trait && key in trait) return trait[key];   // Should find enterable: true
  }
}
```

**But my debug logging in this code never fires.** This means the scope evaluation path isn't being reached at all for "enter bucket".

## Observations

### 1. Behaviors Are Not "Applied" to Entities

When you add a trait, there's no automatic registration of behaviors. The Behavior class is just a pattern for organizing static methods, not something that gets attached to entities.

### 2. Scope Constraints Don't Use Behaviors

The grammar scope constraint `{ enterable: true }` is a property check, not a behavior call. It doesn't use `ContainerBehavior.isEnterable()`.

### 3. Multiple Traits That Mean "Enterable"

These traits all have `enterable`:
- ContainerTrait.enterable
- SupporterTrait.enterable
- RoomTrait.enterable (always true)
- ActorTrait.enterable (always false)

The scope evaluator must check ALL of these to find enterable things.

### 4. VehicleTrait Has No `enterable`

VehicleTrait is a "marker" trait that adds vehicle-specific properties:
- vehicleType: 'watercraft' | 'counterweight' | etc.
- blocksWalkingMovement: boolean

It doesn't have `enterable` because that's ContainerTrait's job.

## Key Questions

1. **Should the scope evaluator call behaviors instead of checking properties?**
   - e.g., `ContainerBehavior.isEnterable(entity)` instead of `entity.get('container').enterable`

2. **Should VehicleTrait imply enterable?**
   - By definition, vehicles are things you enter
   - But currently, `enterable` lives on Container/Supporter traits

3. **Is the current trait composition model correct?**
   - Independent traits that don't know about each other
   - No automatic behavior registration
   - Actions must explicitly use the right behaviors

4. **Why isn't the scope evaluator code path being reached?**
   - My debug logging never fires
   - The semantic grammar might not be what's actually parsing "enter bucket"

## Next Steps

1. Verify which grammar system is actually used for parsing
2. Determine if scope constraints should use behaviors vs property checks
3. Decide if VehicleTrait should integrate with enterable semantics
4. Consider if traits should auto-register their behaviors

## Files Examined

```
packages/world-model/src/behaviors/behavior.ts
packages/world-model/src/entities/if-entity.ts
packages/world-model/src/traits/container/containerTrait.ts
packages/world-model/src/traits/container/containerBehavior.ts
packages/world-model/src/traits/vehicle/vehicleTrait.ts
packages/world-model/src/traits/vehicle/vehicleBehavior.ts
packages/parser-en-us/src/scope-evaluator.ts
packages/parser-en-us/src/semantic-core-grammar.ts
packages/stdlib/src/actions/standard/entering/entering.ts
```
