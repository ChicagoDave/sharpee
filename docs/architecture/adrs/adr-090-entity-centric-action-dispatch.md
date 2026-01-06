# ADR-090: Entity-Centric Action Dispatch via Trait Capabilities

## Status: PROPOSED

## Date: 2026-01-05

## Context

### The Problem

When a player types "lower basket", the parser correctly:
1. Identifies verb: "lower"
2. Resolves directObject: basket entity (in scope)

But the system routes to the wrong action (Inside Mirror pole logic instead of basket elevator logic).

**Root cause**: Action selection is grammar-based via priority ordering. Multiple patterns compete:
```typescript
grammar.define('lower :target').mapsTo(DUNGEO_LOWER).withPriority(150)  // Mirror pole
grammar.define('lower :target').mapsTo(LOWER_BASKET).withPriority(160)  // Basket
```

This leads to:
- Proliferation of action IDs per entity type
- Priority conflicts in grammar
- Type flags scattered on entities (`isBasketElevator`, `poleType`)
- 100+ lines of boilerplate per entity-specific action

### Two Categories of Actions

The key insight is distinguishing **common mutations** from **custom mutations**:

#### Common Mutations (Stdlib Handles Completely)

Actions like TAKE, DROP, OPEN have **standard semantics**:

```typescript
// TAKE: Same mutation for ALL portable things
world.moveEntity(item.id, player.inventory);

// OPEN: Same mutation for ALL openable things
const openable = entity.get(OpenableTrait);
openable.isOpen = true;
```

- Entity has standard trait (PortableTrait, OpenableTrait)
- Stdlib behavior performs standard mutation
- No story-specific logic needed

#### Custom Mutations (Story Provides)

Actions like LOWER, TURN, WAVE have **no standard semantics**:

```typescript
// LOWER basket: Story-specific mutation
trait.position = 'bottom';
world.moveEntity(basket.id, draftyRoomId);
// Also move player if inside, check wheel accessibility...

// LOWER pole: Completely different story-specific mutation
mirrorState.polePosition = 0;
// Affects mirror rotation, room visibility...
```

- Each entity defines what the verb means for it
- No generalized behavior possible
- Story must provide the logic

### How Inform Handles This

Inform 7 uses rules that match on specific nouns:
```inform7
Instead of lowering the basket:
    [basket-specific logic]

Instead of lowering the short pole:
    [pole-specific logic]
```

One action, rules dispatch based on the noun.

## Decision

Implement **trait-based capability dispatch** where:

1. **Traits declare capabilities** - what verbs/actions they respond to
2. **Behaviors implement operations** - the actual mutation logic
3. **Stdlib actions dispatch** - find trait with capability, delegate to behavior
4. **One grammar pattern per verb** - no priority conflicts

### The Pattern

Traits declare capabilities using action IDs:

```typescript
class BasketElevatorTrait extends Trait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];  // Action IDs this trait handles
  static readonly capabilityPriority = 10;  // Higher priority wins if multiple traits claim same capability

  position: 'top' | 'bottom' = 'top';
  topRoomId: string;
  bottomRoomId: string;
  wheelRoomId: string;
}
```

Behaviors implement the 4-phase pattern (matching stdlib actions):

```typescript
import { IFEvents } from '@sharpee/if-domain';

// Phase 1: Validate
static validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult {
  const trait = entity.get(BasketElevatorTrait);
  if (trait.position === 'bottom') {
    return { valid: false, error: 'dungeo.basket.already_down' };
  }
  return { valid: true };
}

// Phase 2: Execute (mutations only, no events)
static execute(entity: IFEntity, world: WorldModel, actorId: string): void {
  const trait = entity.get(BasketElevatorTrait);
  trait.position = 'bottom';
  world.moveEntity(entity.id, trait.bottomRoomId);
}

// Phase 3: Report success
static report(entity: IFEntity, world: WorldModel, actorId: string): Effect[] {
  return [
    emit(IFEvents.LOWERED, { target: entity.id, messageId: 'dungeo.basket.lowered' })
  ];
}

// Phase 4: Report failure
static blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): Effect[] {
  return [
    emit('action.blocked', { target: entity.id, messageId: error })
  ];
}
```

Stdlib action delegates to behavior's 4-phase pattern:

```typescript
// LOWERING action (stdlib) - delegates to capability behavior
validate(context: ActionContext): ValidationResult {
  const entity = context.command.directObject?.entity;
  if (!entity) {
    return { valid: false, error: 'if.lower.no_target' };
  }

  const trait = findTraitWithCapability(entity, this.id);
  if (!trait) {
    return { valid: false, error: 'if.lower.cant_lower_that' };
  }

  const behavior = getBehaviorForTrait(trait);
  const result = behavior.validate(entity, context.world, context.player.id);

  if (result.valid) {
    // Store for execute/report phases - return from validate, not sharedData
    return { valid: true, data: { trait, behavior, entity } };
  }
  return result;
}

execute(context: ActionContext): void {
  const { behavior, entity } = context.validationResult.data;
  behavior.execute(entity, context.world, context.player.id);
}

report(context: ActionContext): Effect[] {
  const { behavior, entity } = context.validationResult.data;
  return behavior.report(entity, context.world, context.player.id);
}

blocked(context: ActionContext, result: ValidationResult): Effect[] {
  const entity = context.command.directObject?.entity;
  const trait = entity ? findTraitWithCapability(entity, this.id) : undefined;

  if (trait) {
    const behavior = getBehaviorForTrait(trait);
    return behavior.blocked(entity!, context.world, context.player.id, result.error!);
  }

  // No trait found - use default blocked message
  return [emit('action.blocked', { messageId: result.error || 'if.lower.cant_lower_that' })];
}
```

### Complete Basket Example

**Trait (state + capability declaration):**

```typescript
// stories/dungeo/src/traits/basket-elevator-trait.ts

import { Trait } from '@sharpee/world-model';

export class BasketElevatorTrait extends Trait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];  // Action IDs

  position: 'top' | 'bottom' = 'top';
  topRoomId: string;
  bottomRoomId: string;
  wheelRoomId: string;

  constructor(config: {
    topRoomId: string;
    bottomRoomId: string;
    wheelRoomId: string;
  }) {
    super();
    this.topRoomId = config.topRoomId;
    this.bottomRoomId = config.bottomRoomId;
    this.wheelRoomId = config.wheelRoomId;
  }
}
```

**Behavior (4-phase pattern with action-specific methods):**

```typescript
// stories/dungeo/src/behaviors/basket-elevator-behavior.ts

import { Behavior, ValidationResult } from '@sharpee/world-model';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { Effect, emit } from '@sharpee/event-processor';
import { IFEvents } from '@sharpee/if-domain';
import { CapabilityBehavior } from '@sharpee/world-model';
import { BasketElevatorTrait } from '../traits/basket-elevator-trait';

/**
 * Behavior for lowering the basket elevator.
 * Implements CapabilityBehavior interface (4-phase pattern).
 */
export const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult {
    const trait = entity.get(BasketElevatorTrait);

    if (trait.position === 'bottom') {
      return { valid: false, error: 'dungeo.basket.already_down' };
    }

    // Can only operate from wheel room or from inside basket
    const actorLocation = world.getLocation(actorId);
    const isAtWheel = actorLocation === trait.wheelRoomId;
    const isInBasket = actorLocation === entity.id;

    if (!isAtWheel && !isInBasket) {
      return { valid: false, error: 'dungeo.basket.cant_reach_wheel' };
    }

    return { valid: true };
  },

  execute(entity: IFEntity, world: WorldModel, actorId: string): void {
    const trait = entity.get(BasketElevatorTrait);
    trait.position = 'bottom';
    world.moveEntity(entity.id, trait.bottomRoomId);
  },

  report(entity: IFEntity, world: WorldModel, actorId: string): Effect[] {
    const trait = entity.get(BasketElevatorTrait);
    const actorLocation = world.getLocation(actorId);
    const actorInBasket = actorLocation === entity.id;

    return [
      emit(IFEvents.LOWERED, {
        target: entity.id,
        messageId: actorInBasket
          ? 'dungeo.basket.lowered_with_actor'
          : 'dungeo.basket.lowered',
        actorMoved: actorInBasket
      })
    ];
  },

  blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): Effect[] {
    return [
      emit('action.blocked', { target: entity.id, messageId: error })
    ];
  }
};

/**
 * Behavior for raising the basket elevator.
 */
export const BasketRaisingBehavior: CapabilityBehavior = {
  validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult {
    const trait = entity.get(BasketElevatorTrait);

    if (trait.position === 'top') {
      return { valid: false, error: 'dungeo.basket.already_up' };
    }

    const actorLocation = world.getLocation(actorId);
    const isAtWheel = actorLocation === trait.wheelRoomId;
    const isInBasket = actorLocation === entity.id;

    if (!isAtWheel && !isInBasket) {
      return { valid: false, error: 'dungeo.basket.cant_reach_wheel' };
    }

    return { valid: true };
  },

  execute(entity: IFEntity, world: WorldModel, actorId: string): void {
    const trait = entity.get(BasketElevatorTrait);
    trait.position = 'top';
    world.moveEntity(entity.id, trait.topRoomId);
  },

  report(entity: IFEntity, world: WorldModel, actorId: string): Effect[] {
    const trait = entity.get(BasketElevatorTrait);
    const actorLocation = world.getLocation(actorId);
    const actorInBasket = actorLocation === entity.id;

    return [
      emit(IFEvents.RAISED, {
        target: entity.id,
        messageId: actorInBasket
          ? 'dungeo.basket.raised_with_actor'
          : 'dungeo.basket.raised',
        actorMoved: actorInBasket
      })
    ];
  },

  blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): Effect[] {
    return [
      emit('action.blocked', { target: entity.id, messageId: error })
    ];
  }
};
```

**Entity creation (minimal):**

```typescript
// stories/dungeo/src/regions/coal-mine/objects/index.ts

function createBasket(world: WorldModel, shaftRoomId: string, draftyRoomId: string): IFEntity {
  const basket = world.createEntity('basket', EntityType.CONTAINER);

  basket.add(new IdentityTrait({
    name: 'rusty iron basket',
    aliases: ['basket', 'iron basket', 'rusty basket'],
    description: 'A rusty iron basket hangs from a sturdy chain.',
    article: 'a'
  }));

  basket.add(new ContainerTrait({ capacity: { maxItems: 10, maxWeight: 100 } }));
  basket.add(new SceneryTrait());

  // This one line declares the basket responds to lower/raise
  basket.add(new BasketElevatorTrait({
    topRoomId: shaftRoomId,
    bottomRoomId: draftyRoomId,
    wheelRoomId: shaftRoomId
  }));

  world.moveEntity(basket.id, shaftRoomId);
  return basket;
}
```

**Grammar (one pattern per verb):**

```typescript
// In stdlib or parser - no story-specific patterns needed
grammar
  .forAction('if.action.lowering')
  .verbs(['lower'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();

grammar
  .forAction('if.action.raising')
  .verbs(['raise', 'lift'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

### Stdlib Action Implementation

```typescript
// packages/stdlib/src/actions/standard/lowering/lowering.ts

export const loweringAction: Action = {
  id: 'if.action.lowering',

  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) {
      return { valid: false, error: 'if.lower.no_target' };
    }

    // Find trait that handles this action ID
    const trait = findTraitWithCapability(entity, this.id);  // 'if.action.lowering'
    if (!trait) {
      return { valid: false, error: 'if.lower.cant_lower_that' };
    }

    // Get behavior and validate
    const behavior = getBehaviorForTrait(trait);
    if (behavior.canLower) {
      const result = behavior.canLower(entity, context.world, context.player.id);
      if (!result.valid) {
        return result;
      }
    }

    context.sharedData.lowerTrait = trait;
    context.sharedData.lowerBehavior = behavior;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const entity = context.command.directObject!.entity!;
    const behavior = context.sharedData.lowerBehavior;

    // Behavior returns Effects - it controls what events are emitted
    const effects = behavior.lower(entity, context.world, context.player.id);
    context.sharedData.effects = effects;
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Effects are processed by the engine's effect processor
    // The behavior already specified what events to emit via emit() effects
    // This method can return empty - effects handle the events
    return [];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      messageId: result.error || 'if.lower.cant_lower_that'
    })];
  }
};
```

**Note**: The `report()` method returns empty because the behavior's Effects include the `emit()` calls. The engine's EffectProcessor handles converting those to actual events.

### Capability Registry (Type-Safe)

```typescript
// packages/world-model/src/traits/capability-registry.ts

/**
 * Standard interface for capability behaviors.
 * All behaviors that handle capabilities must implement this interface.
 * Follows the same 4-phase pattern as stdlib actions for consistency.
 */
export interface CapabilityBehavior {
  /** Phase 1: Validate whether the action can be performed */
  validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult;

  /** Phase 2: Execute mutations (no events emitted here) */
  execute(entity: IFEntity, world: WorldModel, actorId: string): void;

  /** Phase 3: Report success - return effects including emit() for success events */
  report(entity: IFEntity, world: WorldModel, actorId: string): Effect[];

  /** Phase 4: Report failure - return effects for blocked/failure events */
  blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): Effect[];
}

/**
 * Type-safe trait-behavior binding.
 * Behaviors declare which trait type they work with.
 */
export interface TraitBehaviorBinding<T extends Trait = Trait> {
  traitType: string;
  behavior: CapabilityBehavior;
  /** Validate at registration that behavior works with trait */
  validateBinding?: (trait: T) => boolean;
}

const traitBehaviorMap = new Map<string, TraitBehaviorBinding>();

/**
 * Register a behavior for a trait type with validation.
 */
export function registerTraitBehavior<T extends Trait>(
  traitType: string,
  behavior: CapabilityBehavior,
  options?: { validateBinding?: (trait: T) => boolean }
): void {
  traitBehaviorMap.set(traitType, {
    traitType,
    behavior,
    validateBinding: options?.validateBinding
  });
}

/**
 * Get behavior for a trait with runtime validation.
 */
export function getBehaviorForTrait(trait: Trait): CapabilityBehavior {
  const traitType = (trait.constructor as typeof Trait).type;
  const binding = traitBehaviorMap.get(traitType);

  if (!binding) {
    throw new Error(`No behavior registered for trait: ${traitType}`);
  }

  // Runtime validation if provided
  if (binding.validateBinding && !binding.validateBinding(trait)) {
    throw new Error(`Behavior validation failed for trait: ${traitType}`);
  }

  return binding.behavior;
}

/**
 * Find a trait on the entity that declares capability for the given action ID.
 *
 * If multiple traits declare the same capability, uses priority ordering:
 * 1. Traits with explicit `capabilityPriority` (higher = first)
 * 2. Order of trait attachment (first added = first checked)
 */
export function findTraitWithCapability(entity: IFEntity, actionId: string): Trait | undefined {
  // Collect all traits with this capability
  const candidates: Array<{ trait: Trait; priority: number }> = [];

  for (const trait of entity.traits) {
    const traitClass = trait.constructor as typeof Trait;
    if (traitClass.capabilities?.includes(actionId)) {
      const priority = traitClass.capabilityPriority ?? 0;
      candidates.push({ trait, priority });
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  // Sort by priority descending (higher priority first)
  candidates.sort((a, b) => b.priority - a.priority);

  return candidates[0].trait;
}

/**
 * Type guard to check if a trait has a specific capability.
 */
export function hasCapability<T extends Trait>(
  trait: Trait,
  actionId: string,
  traitType?: new (...args: any[]) => T
): trait is T {
  const traitClass = trait.constructor as typeof Trait;
  const hasAction = traitClass.capabilities?.includes(actionId) ?? false;

  if (traitType) {
    return hasAction && trait instanceof traitType;
  }
  return hasAction;
}
```

**Story registration:**

```typescript
// stories/dungeo/src/index.ts

import { registerTraitBehavior } from '@sharpee/world-model';
import { BasketElevatorTrait } from './traits/basket-elevator-trait';
import { BasketElevatorBehavior } from './behaviors/basket-elevator-behavior';

// Register behavior for trait
registerTraitBehavior(BasketElevatorTrait.type, BasketElevatorBehavior);
```

## Implementation

### Phase 1: Core Infrastructure (world-model)

1. Add `static capabilities: string[]` to Trait base class
2. Add `findTraitWithCapability(entity, capability)` helper
3. Add trait-behavior registry with `registerTraitBehavior()` and `getBehaviorForTrait()`

### Phase 2: Stdlib Actions

Create capability-dispatching actions for verbs without standard semantics:
- `if.action.lowering` (lower)
- `if.action.raising` (raise, lift)
- `if.action.turning` (turn)
- `if.action.waving` (wave)

These actions:
1. Find trait with matching capability
2. Validate via behavior's `canX()` method
3. Execute via behavior's `x()` method
4. Report success/failure

Default behavior when no trait found: "You can't [verb] that."

### Phase 3: Dungeo Migration

1. Create `BasketElevatorTrait` + `BasketElevatorBehavior`
2. Create `MirrorPoleTrait` + `MirrorPoleBehavior`
3. Remove story-specific action files (lower-basket-action.ts, etc.)
4. Remove conflicting grammar patterns
5. Remove type flags (`isBasketElevator`, `poleType`)

## Consequences

### Positive

- **One grammar pattern per verb** - no priority conflicts
- **Follows existing patterns** - trait + behavior is "the Sharpee way"
- **Logic lives with entity** - trait/behavior defined alongside entity
- **No type flags** - capability declared via trait, not ad-hoc properties
- **Composable** - entity can have multiple capability-providing traits
- **Discoverable** - entity's capabilities are explicit in its traits

### Negative

- **Registry pattern** - need to register trait-behavior mappings
- **New infrastructure** - capability lookup and behavior dispatch
- **Migration effort** - existing entity-specific actions need refactoring

### Comparison: Before and After

| Aspect | Current | Proposed |
|--------|---------|----------|
| Action files per entity type | 2 files (action + types), 100+ lines | 0 (use stdlib action) |
| Trait/behavior files | 0 | 2 files, ~100 lines total |
| Grammar patterns | Multiple with priority conflicts | 1 per verb |
| Type flags | `isBasketElevator`, `poleType` | None |
| Entity creation | Add flags, register grammar | Add trait |
| Logic location | Scattered across action/handler | Co-located with trait |

**Net result**: Similar total code, but better organized. Logic moves from action layer to trait/behavior layer where it belongs.

## Alternatives Considered

### A. Entity Event Handlers

Entities provide `on` handlers: `basket.on['if.event.lowering.try'] = handler`

**Rejected**: Doesn't use existing trait/behavior pattern. Handler logic not co-located with trait state.

### B. Scope Constraints in Grammar

Fix `.where()` to reliably match entity properties.

**Rejected**: Still requires separate action IDs per entity type. Doesn't solve proliferation problem.

### C. Single Action with Type Switch

One LOWER action that switches on entity type internally.

**Rejected**: Centralizes knowledge about all entity types. Stories can't extend without modifying stdlib.

## Design Decisions Made

1. **Behavior method signatures**: Behaviors return `Effect[]` (ADR-075 pattern)
   - `canLower()` returns `ValidationResult`
   - `lower()` returns `Effect[]` including `emit()` for events
   - Behavior controls what events are emitted

2. **Capability naming**: Capabilities use action IDs, not words
   - `static capabilities = ['if.action.lowering', 'if.action.raising']`
   - Consistent with how actions are identified throughout the system
   - Action can find trait by checking for its own ID

3. **Event naming and extensibility**: Events should use constants with namespaced IDs

   **Core events** (defined in if-domain, used by stdlib):
   ```typescript
   // packages/if-domain/src/events.ts
   export const IFEvents = {
     LOWERED: 'if.event.lowered',
     RAISED: 'if.event.raised',
     OPENED: 'if.event.opened',
     CLOSED: 'if.event.closed',
     // ... standard IF events
   } as const;
   ```

   **Story-specific events** (defined by author, fully extensible):
   ```typescript
   // stories/dungeo/src/events.ts
   export const DungeoEvents = {
     BASKET_LOWERED: 'dungeo.event.basket_lowered',
     POLE_RAISED: 'dungeo.event.pole_raised',
     MACHINE_ACTIVATED: 'dungeo.event.machine_activated',
     // ... story-specific events
   } as const;
   ```

   **Usage in behaviors**:
   ```typescript
   // Standard capability → use IFEvents
   return [emit(IFEvents.LOWERED, { target: entity.id })];

   // Story-specific behavior → use story events
   return [emit(DungeoEvents.MACHINE_ACTIVATED, { coal: coalId })];
   ```

   Benefits:
   - Typos caught at compile time
   - Consistent pattern: `namespace.event.name`
   - Fully extensible for custom traits+behaviors
   - IDE autocomplete and discoverability

## Capability Dispatch Verbs

Stdlib verbs fall into two categories based on whether they have standard semantics:

### Fixed Semantics (NO capability dispatch)

These verbs have a universal meaning - the mutation is the same regardless of entity:

| Verb | Standard Mutation |
|------|------------------|
| TAKE | Move to inventory |
| DROP | Move to location |
| OPEN/CLOSE | Change `isOpen` state |
| LOCK/UNLOCK | Change `isLocked` state |
| WEAR/REMOVE | Change `worn` state |
| SWITCH ON/OFF | Change `isOn` state |
| EAT/DRINK | Consume item |
| ENTER/EXIT | Change player location |
| PUT IN/ON | Change containment |

Traits determine *if* the action can happen; stdlib determines *what* happens.

### No Standard Semantics (USE capability dispatch)

These verbs have entity-specific meaning - the entity determines what the verb does:

| Verb | Why Capability Dispatch? | Examples |
|------|--------------------------|----------|
| LOWER | Entity-specific mutation | Basket elevator, mirror pole, drawbridge |
| RAISE/LIFT | Entity-specific mutation | Basket elevator, mirror pole |
| TURN | "Turn X" varies by entity | Wheel, dial, crank, key-in-lock |
| WAVE | Entity-specific effect | Sceptre → rainbow, wand → spell |
| RING | Entity-specific effect | Bell → exorcism, phone → call |
| WIND | Entity-specific effect | Music box, canary, clock |
| RUB | Entity-specific effect | Lamp → genie, crystal ball |
| PLAY | Instrument-specific | Piano, flute, horn |
| BLOW | Entity-specific effect | Horn → sound, candle → extinguish |

### Edge Cases (Standard + Special)

Some verbs have standard semantics but special uses:

| Verb | Standard Use | Special Use |
|------|--------------|-------------|
| PUSH | Move object (exert force) | Push button/lever (activation) |
| PULL | Move object (exert force) | Pull lever/rope (activation) |

For these, the standard action handles the common case. Entities needing special behavior use capability traits.

## Extension Vectors

Capability dispatch aligns across all extension points:

### Stdlib (Curated Platform)

Stdlib is a **curated** set of Traits, Behaviors, and Actions for most IF development.

- Provides capability-dispatch actions for common verbs with no standard semantics
- Example: `if.action.lowering` dispatches to any trait claiming that capability
- Story authors use these without modification

### Story (e.g., Dungeo)

Stories create traits that claim stdlib capabilities:

```typescript
// Story creates trait
class BasketElevatorTrait extends Trait {
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];
  // ...
}

// Story creates behavior
export const BasketLoweringBehavior: CapabilityBehavior = { /* ... */ };

// Story registers binding
registerTraitBehavior(BasketElevatorTrait.type, BasketLoweringBehavior);
```

For story-specific verbs (SAY "odysseus", INCANT), stories create full actions.

### Third-Party Extensions

Same pattern as stories:

1. Create traits claiming stdlib capabilities
2. Or create entirely new verbs as full actions if stdlib doesn't have them

### The Key Principle

**Stdlib owns the verbs. Extensions own the behaviors.**

- Stdlib provides `if.action.lowering` (the dispatch mechanism)
- Story provides `BasketElevatorTrait` + `BasketLoweringBehavior` (the entity-specific logic)
- No story-specific action files needed for stdlib verbs

## Open Questions

1. **Priority implementation**: How is `capabilityPriority` surfaced in the trait base class?

2. **Debugging support**: Should capability dispatch log which trait handled an action?

3. **Before/after hooks**: How do `if.action.lowering.before` event handlers interact with capability dispatch?

## References

- ADR-052: Event Handlers for Custom Logic
- ADR-075: Event Handler Consolidation (Effects pattern)
- ADR-087: Action-Centric Grammar
- Existing trait/behavior pattern in world-model
