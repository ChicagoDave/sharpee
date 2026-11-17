# EnterableTrait Design

## Problem

The basket elevator doesn't respond to "enter basket" because:

1. `ContainerTrait.enterable` is not exposed to the entity
2. Grammar matching uses `.matching({ enterable: true })` which checks entity properties
3. The design mixes concerns - containment and enterability are different things

## Current State

```typescript
// Bucket (works, but only because of VehicleTrait workaround?)
bucket.add(new ContainerTrait({ enterable: true }));
bucket.add(new VehicleTrait({ ... }));

// Basket (doesn't work - "enter basket" not recognized)
basket.add(new ContainerTrait({ enterable: true }));
basket.add(new BasketElevatorTrait({ ... }));
```

The `enterable` property on ContainerTrait:
- Is checked by the entering action
- Is NOT exposed to the entity for grammar matching
- Mixes containment concern with enterability concern

## Proposed Design

### EnterableTrait

A separate trait that marks an entity as enterable by actors.

```typescript
// packages/world-model/src/traits/enterable/enterableTrait.ts

export class EnterableTrait implements ITrait {
  static readonly type = TraitType.ENTERABLE;
  readonly type = TraitType.ENTERABLE;

  // Optional: preposition for entering (default: 'in')
  // 'in' for containers, 'on' for supporters
  preposition: 'in' | 'on';

  constructor(config?: { preposition?: 'in' | 'on' }) {
    this.preposition = config?.preposition ?? 'in';
  }
}
```

### Entity Exposure

Add getter to IFEntity for grammar matching:

```typescript
// packages/world-model/src/entities/if-entity.ts

get enterable(): boolean {
  return this.has(TraitType.ENTERABLE);
}
```

This allows `.matching({ enterable: true })` to work transparently.

### Usage

```typescript
// Basket - compositional design
basket.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
basket.add(new EnterableTrait());  // Marks as enterable
basket.add(new BasketElevatorTrait({ ... }));

// Bucket
bucket.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
bucket.add(new EnterableTrait());
bucket.add(new VehicleTrait({ ... }));

// Chair (supporter you can sit on)
chair.add(new SupporterTrait({ ... }));
chair.add(new EnterableTrait({ preposition: 'on' }));
```

### Entering Action Updates

The entering action should:

1. Check for `EnterableTrait` (new pattern)
2. Fall back to `ContainerTrait.enterable` / `SupporterTrait.enterable` (backwards compat)
3. Use `EnterableTrait.preposition` to determine "in" vs "on"

```typescript
// validate()
if (!entity.has(TraitType.ENTERABLE)) {
  // Fallback: check legacy enterable on container/supporter
  const container = entity.get(TraitType.CONTAINER);
  const supporter = entity.get(TraitType.SUPPORTER);
  if (!container?.enterable && !supporter?.enterable) {
    return { valid: false, error: 'not_enterable' };
  }
}
```

## Interaction with Other Traits

### ContainerTrait
- ContainerTrait handles what can be PUT IN the container
- EnterableTrait handles whether actors can ENTER
- Both can coexist - a basket can hold items AND be entered

### OpenableTrait
- If entity has OpenableTrait, must be open to enter
- Entering action already checks this

### VehicleTrait
- VehicleTrait handles movement mechanics (bucket rises/falls)
- EnterableTrait handles the entry permission
- They compose together

### BasketElevatorTrait
- BasketElevatorTrait handles lowering/raising via capability dispatch
- When player is inside (entered via EnterableTrait), they get transported
- The `transportPlayerIfInBasket` function checks player location

## Migration Path

1. **Phase 1**: Create EnterableTrait, add `enterable` getter to IFEntity - DONE
2. **Phase 2**: Update entering action to check EnterableTrait first - DONE
3. **Phase 3**: Update basket and bucket to use EnterableTrait - DONE
4. **Phase 4**: Deprecate `enterable` on ContainerTrait/SupporterTrait (future)

## Implementation Notes (2026-01-07)

**Final Design:** EnterableTrait is the single source of truth for enterability.

The entering action validates:
1. Entity has EnterableTrait
2. If openable, it must be open

That's it. **No legacy fallbacks, no capacity checks.**

Capacity is author responsibility via event handlers or custom trait extensions.

## Files to Change

### world-model (platform)
- `src/traits/enterable/enterableTrait.ts` - new trait
- `src/traits/enterable/index.ts` - exports
- `src/traits/trait-types.ts` - add ENTERABLE to enum
- `src/traits/index.ts` - export EnterableTrait
- `src/entities/if-entity.ts` - add `enterable` getter
- `src/index.ts` - export EnterableTrait

### stdlib (platform)
- `src/actions/standard/entering/entering.ts` - check EnterableTrait

### dungeo (story)
- `src/regions/coal-mine/objects/index.ts` - basket uses EnterableTrait
- `src/regions/well-room/objects/index.ts` - bucket uses EnterableTrait

## Author Experience

Before (confusing - why doesn't this work?):
```typescript
basket.add(new ContainerTrait({ enterable: true }));
// "enter basket" fails silently
```

After (clear, compositional):
```typescript
basket.add(new ContainerTrait({ ... }));
basket.add(new EnterableTrait());
// "enter basket" works
```

The author explicitly adds EnterableTrait when they want actors to enter.
