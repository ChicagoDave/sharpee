# V14 — Capability Dispatch

## What This Version Teaches

Capability dispatch is for verbs where the meaning depends on what you do it to. "Pet goats" (affectionate) is very different from "pet parrot" (ouch!). The entity decides how to respond, not the action.

## Key Concepts

### When to Use Capability Dispatch

| Pattern | When |
|---|---|
| Custom Action (V13) | New verb with fixed behavior for all targets |
| Capability Dispatch (V14) | Same verb, different behavior per entity |

### The Three Pieces

**1. A custom trait** with `capabilities[]`:

```typescript
class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable';
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;
  readonly animalKind: 'goats' | 'rabbits' | 'parrot';

  constructor(kind: 'goats' | 'rabbits' | 'parrot') {
    this.animalKind = kind;
  }
}
```

**2. Capability behaviors** (one per entity type):

```typescript
const goatPettingBehavior: CapabilityBehavior = {
  validate(): CapabilityValidationResult { return { valid: true }; },
  execute(): void {},
  report(entity): CapabilityEffect[] {
    return [createEffect('action.success', {
      messageId: 'zoo.petting.goats',
      params: { target: entity.name },
    })];
  },
  blocked(entity, _w, _a, error): CapabilityEffect[] {
    return [createEffect('action.blocked', { messageId: error })];
  },
};
```

**3. Registration** connecting trait + capability + behavior:

```typescript
registerCapabilityBehavior(
  PettableTrait.type,          // Which trait
  'zoo.action.petting',        // Which capability
  goatPettingBehavior,         // Which behavior
  { condition: (t) => t.animalKind === 'goats' },  // When to use it
);
```

### The Dispatch Action

Use `createCapabilityDispatchAction()` — it builds the Action automatically:

```typescript
const pettingAction = createCapabilityDispatchAction({
  actionId: 'zoo.action.petting',
  group: 'interaction',
  noTargetError: 'zoo.petting.cant_pet',
  cantDoThatError: 'zoo.petting.cant_pet',
});
```

This factory creates an action that automatically:
1. Finds the trait claiming the capability on the target entity
2. Delegates to the registered behavior
3. Handles all four phases

### How It All Fits Together

```
Player types: "pet goats"
  ↓
Parser: matches "pet :thing" → zoo.action.petting, target = goats entity
  ↓
Capability dispatch action:
  1. Find trait on goats with capability 'zoo.action.petting' → PettableTrait
  2. Find behavior for PettableTrait + 'zoo.action.petting' where animalKind='goats'
  3. Call goatPettingBehavior.validate() → { valid: true }
  4. Call goatPettingBehavior.execute() → (nothing)
  5. Call goatPettingBehavior.report() → "The goat bleats happily"
```

## Commands to Try

```
> south / east           (go to petting zoo)
> pet goats              (affectionate — they love it)
> pet rabbits            (soft and fuzzy)
> pet hay bale           (can't pet that — no PettableTrait)
> west / west            (go to aviary)
> pet parrot             (CHOMP! It bites!)
```

## Key Takeaways

- Capability dispatch = one verb, many behaviors, the entity decides
- Custom traits declare `capabilities[]` listing which action IDs they respond to
- `registerCapabilityBehavior()` links trait type + action ID + behavior
- Use `condition` to dispatch to different behaviors based on trait data
- `createCapabilityDispatchAction()` builds the action automatically
- Entities without the trait get the `cantDoThatError` message
