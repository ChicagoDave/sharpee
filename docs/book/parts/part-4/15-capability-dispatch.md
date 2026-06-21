# Capability Dispatch

The custom feed action in the last chapter did the same thing to every animal:
check for feed, mark it fed, print a message. But some verbs mean different things
depending on *what* you do them to. Petting the goats is affectionate — they lean
into your hand. Petting the parrot is a mistake — it bites. The verb is the same;
the outcome belongs to the animal. That's **capability dispatch**: one verb, many
behaviors, and the entity decides which one runs.

## When to reach for it

| Pattern | Use when |
|---|---|
| Custom action (last chapter) | A new verb with one fixed behavior for every target |
| Capability dispatch (this chapter) | The same verb, but each entity responds differently |

If "feed" always does the same thing, a plain custom action is right. If "pet"
needs to bleat for goats and bite for parrots, you want dispatch.

## The three pieces

Capability dispatch is built from a custom **trait** that declares a capability,
a **behavior** that implements it, and a **registration** that links the two.

### 1. A trait that declares a capability

A custom trait lists the action IDs it responds to in a static `capabilities`
array. `PettableTrait` also carries an `animalKind` so one trait type can stand
in for several different animals:

```typescript
class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable' as const;
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;

  readonly animalKind: 'goats' | 'rabbits' | 'parrot' | 'snake';
  constructor(kind: 'goats' | 'rabbits' | 'parrot' | 'snake') {
    this.animalKind = kind;
  }
}
```

Add it to entities like any other trait: `goats.add(new PettableTrait('goats'))`,
`parrot.add(new PettableTrait('parrot'))`.

### 2. A behavior that implements the capability

A `CapabilityBehavior` follows the same four-phase shape as an action, but its
methods receive the target `entity` directly. Because the registry allows **one
behavior per trait type + capability**, the single `pettingBehavior` dispatches
internally on `animalKind`:

```typescript
const PetMessages = {
  PET_GOATS: 'zoo.petting.goats',
  PET_RABBITS: 'zoo.petting.rabbits',
  PET_PARROT: 'zoo.petting.parrot',
  CANT_PET: 'zoo.petting.cant_pet',
} as const;

const pettingBehavior: CapabilityBehavior = {
  validate(_entity, _world, _actorId, _shared): CapabilityValidationResult {
    return { valid: true };          // every pettable animal accepts a pet
  },

  execute(_entity, _world, _actorId, _shared): void {
    // no world mutation — petting is cosmetic
  },

  report(entity, _world, _actorId, _shared): CapabilityEffect[] {
    const pettable = entity.get(PettableTrait);
    let messageId: string = PetMessages.CANT_PET;
    switch (pettable?.animalKind) {
      case 'goats':   messageId = PetMessages.PET_GOATS; break;
      case 'rabbits': messageId = PetMessages.PET_RABBITS; break;
      case 'parrot':  messageId = PetMessages.PET_PARROT; break;
    }
    return [createEffect('zoo.event.petted', {
      messageId,
      params: { target: entity.name },
    })];
  },

  blocked(entity, _world, _actorId, error, _shared): CapabilityEffect[] {
    return [createEffect('zoo.event.petting_blocked', {
      messageId: error,
      params: { target: entity.name },
    })];
  },
};
```

`report()` and `blocked()` return `CapabilityEffect[]` — built with the
`createEffect()` helper — rather than events directly. The dispatch action turns
those effects into semantic events.

> **The mistake everyone makes once:** trying to register a separate behavior for
> each animal under the same trait and capability. The registry holds exactly one
> behavior per trait type + capability — a second registration replaces the first.
> Put the per-entity differences in the trait's own data (here `animalKind`) and
> branch on it inside the one behavior.

### 3. Registration that links trait to behavior

`registerCapabilityBehavior()` connects a trait type, a capability (action ID),
and the behavior that handles them. Guard it with `hasCapabilityBehavior()` so it
only registers once:

```typescript
if (!hasCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID)) {
  registerCapabilityBehavior(
    PettableTrait.type,     // which trait
    PETTING_ACTION_ID,      // which capability
    pettingBehavior,        // which behavior
  );
}
```

## The dispatch action

Something still has to receive the `pet` verb and route it to the right behavior.
Writing it by hand shows exactly what dispatch does — find the trait that claims
the capability, look up its behavior, and delegate each phase:

```typescript
const PETTING_ACTION_ID = 'zoo.action.petting';

const pettingAction: Action = {
  id: PETTING_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) return { valid: false, error: PetMessages.CANT_PET };

    // Find the trait on the target that claims this capability
    const trait = findTraitWithCapability(entity, PETTING_ACTION_ID);
    if (!trait) return { valid: false, error: PetMessages.CANT_PET };

    // Look up the behavior registered for that trait + capability
    const behavior = getBehaviorForCapability(trait, PETTING_ACTION_ID);
    if (!behavior) return { valid: false, error: PetMessages.CANT_PET };

    // Delegate validation to the behavior
    const sharedData: CapabilitySharedData = {};
    const result = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!result.valid) return { valid: false, error: result.error };

    // Carry the resolved behavior into the later phases
    context.sharedData.capEntity = entity;
    context.sharedData.capBehavior = behavior;
    context.sharedData.capSharedData = sharedData;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const shared = context.sharedData.capSharedData as CapabilitySharedData;
    if (entity && behavior) behavior.execute(entity, context.world, context.player.id, shared);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const shared = context.sharedData.capSharedData as CapabilitySharedData;
    if (!entity || !behavior) return [];
    const effects = behavior.report(entity, context.world, context.player.id, shared);
    return effects.map(effect => context.event(effect.type, effect.payload));
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.petting_blocked', {
      messageId: result.error || PetMessages.CANT_PET,
    })];
  },
};
```

An entity with no `PettableTrait` falls out at `findTraitWithCapability()` and
gets the `CANT_PET` message — petting the hay bale just tells you that you can't.

> **Worth knowing:** the stdlib ships `createCapabilityDispatchAction()`, a
> factory that builds exactly this find-trait-then-delegate action for you from a
> few options. The zoo writes it out by hand so the mechanism is visible, but in
> a real story you'd usually let the factory generate it.

This action is registered the ordinary way — return it from `getCustomActions()`
and give it a grammar pattern (`grammar.define('pet :thing').mapsTo(...)`) and
message text in `extendLanguage()`, exactly as in the previous chapter.

## How it fits together

```
Player types: "pet goats"
  ↓ parser matches "pet :thing" → zoo.action.petting, target = goats
  ↓ pettingAction.validate():
      findTraitWithCapability(goats, 'zoo.action.petting') → PettableTrait
      getBehaviorForCapability(trait, 'zoo.action.petting') → pettingBehavior
      behavior.validate() → { valid: true }
  ↓ pettingAction.execute() → behavior.execute() (nothing)
  ↓ pettingAction.report()  → behavior.report() → "The goat leans into your hand."
```

Type `pet parrot` and the same path runs — but `animalKind` is `'parrot'`, so the
behavior returns the bite message instead. One verb, the entity decides.

## Try it

```
> south; east               Go to the Petting Zoo
> pet goats                 They lean in, bleating happily
> pet rabbits               Soft and fuzzy
> pet hay bale              "You can't pet that." (no PettableTrait)
> west; west                Aviary
> pet parrot                CHOMP! It bites!
```

## Key takeaway

Capability dispatch is one verb whose outcome lives on the entity. A custom trait
declares `capabilities[]`; a `CapabilityBehavior` implements the four phases and
branches on the trait's own data (the registry allows just one behavior per trait
+ capability); `registerCapabilityBehavior()` links them. A dispatch action — hand-written
or built by `createCapabilityDispatchAction()` — finds the trait claiming the
capability and delegates each phase to its behavior. Entities without the trait
get the can't-do-that message for free.
