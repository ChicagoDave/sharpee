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

  position: 'top' | 'bottom' = 'top';
  topRoomId: string;
  bottomRoomId: string;
  wheelRoomId: string;
}
```

Behaviors return Effects (ADR-075 pattern):

```typescript
import { IFEvents } from '@sharpee/if-domain';

// Behavior returns Effects - controls what events are emitted
static lower(entity: IFEntity, world: WorldModel, playerId: string): Effect[] {
  const trait = entity.get(BasketElevatorTrait);
  trait.position = 'bottom';
  world.moveEntity(entity.id, trait.bottomRoomId);

  return [
    emit(IFEvents.LOWERED, {
      target: entity.id,
      messageId: 'dungeo.basket.lowered'
    })
  ];
}
```

Stdlib action finds trait by its own action ID and processes effects:

```typescript
// LOWERING action (stdlib)
execute(context: ActionContext): void {
  const entity = context.command.directObject?.entity;
  const trait = findTraitWithCapability(entity, this.id);  // 'if.action.lowering'

  if (trait) {
    const behavior = getBehaviorForTrait(trait);
    const effects = behavior.lower(entity, context.world, context.player.id);
    context.sharedData.effects = effects;
  } else {
    context.sharedData.blocked = true;
    context.sharedData.error = 'if.lower.cant_lower_that';
  }
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

**Behavior (operations returning Effects):**

```typescript
// stories/dungeo/src/behaviors/basket-elevator-behavior.ts

import { Behavior, ValidationResult } from '@sharpee/world-model';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { Effect, emit } from '@sharpee/event-processor';
import { IFEvents } from '@sharpee/if-domain';
import { BasketElevatorTrait } from '../traits/basket-elevator-trait';

export class BasketElevatorBehavior extends Behavior {
  static requiredTraits = [BasketElevatorTrait.type];

  static canLower(entity: IFEntity, world: WorldModel, playerId: string): ValidationResult {
    const trait = entity.get(BasketElevatorTrait);

    if (trait.position === 'bottom') {
      return { valid: false, error: 'dungeo.basket.already_down' };
    }

    // Can only operate from wheel room or from inside basket
    const playerLocation = world.getLocation(playerId);
    const isAtWheel = playerLocation === trait.wheelRoomId;
    const isInBasket = playerLocation === entity.id;

    if (!isAtWheel && !isInBasket) {
      return { valid: false, error: 'dungeo.basket.cant_reach_wheel' };
    }

    return { valid: true };
  }

  static lower(entity: IFEntity, world: WorldModel, playerId: string): Effect[] {
    const trait = entity.get(BasketElevatorTrait);
    const playerLocation = world.getLocation(playerId);
    const playerInBasket = playerLocation === entity.id;

    // Mutations
    trait.position = 'bottom';
    world.moveEntity(entity.id, trait.bottomRoomId);

    // Return effects - behavior controls the event
    return [
      emit(IFEvents.LOWERED, {
        target: entity.id,
        messageId: playerInBasket
          ? 'dungeo.basket.lowered_with_player'
          : 'dungeo.basket.lowered',
        playerMoved: playerInBasket
      })
    ];
  }

  static canRaise(entity: IFEntity, world: WorldModel, playerId: string): ValidationResult {
    const trait = entity.get(BasketElevatorTrait);

    if (trait.position === 'top') {
      return { valid: false, error: 'dungeo.basket.already_up' };
    }

    const playerLocation = world.getLocation(playerId);
    const isAtWheel = playerLocation === trait.wheelRoomId;
    const isInBasket = playerLocation === entity.id;

    if (!isAtWheel && !isInBasket) {
      return { valid: false, error: 'dungeo.basket.cant_reach_wheel' };
    }

    return { valid: true };
  }

  static raise(entity: IFEntity, world: WorldModel, playerId: string): Effect[] {
    const trait = entity.get(BasketElevatorTrait);
    const playerLocation = world.getLocation(playerId);
    const playerInBasket = playerLocation === entity.id;

    // Mutations
    trait.position = 'top';
    world.moveEntity(entity.id, trait.topRoomId);

    // Return effects - behavior controls the event
    return [
      emit(IFEvents.RAISED, {
        target: entity.id,
        messageId: playerInBasket
          ? 'dungeo.basket.raised_with_player'
          : 'dungeo.basket.raised',
        playerMoved: playerInBasket
      })
    ];
  }
}
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

### Capability Registry

```typescript
// packages/world-model/src/traits/capability-registry.ts

const traitBehaviorMap = new Map<string, BehaviorClass>();

export function registerTraitBehavior(traitType: string, behavior: BehaviorClass): void {
  traitBehaviorMap.set(traitType, behavior);
}

export function getBehaviorForTrait(trait: Trait): Behavior {
  const behavior = traitBehaviorMap.get(trait.constructor.type);
  if (!behavior) {
    throw new Error(`No behavior registered for trait: ${trait.constructor.type}`);
  }
  return behavior;
}

/**
 * Find a trait on the entity that declares capability for the given action ID.
 * Capabilities are action IDs like 'if.action.lowering', 'if.action.raising'.
 */
export function findTraitWithCapability(entity: IFEntity, actionId: string): Trait | undefined {
  for (const trait of entity.traits) {
    const traitClass = trait.constructor as typeof Trait;
    if (traitClass.capabilities?.includes(actionId)) {
      return trait;
    }
  }
  return undefined;
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

## Open Questions

1. **Multiple traits with same capability**: What if entity has two traits declaring the same action ID?
   - Recommendation: First match wins, document that this is undefined behavior

2. **Stdlib verbs**: Which verbs get capability-dispatching actions?
   - Clear candidates: lowering, raising, turning, waving, ringing
   - Verbs with standard semantics stay as-is: taking, dropping, opening, closing

3. **Validation vs Execution method naming**: Should behavior methods be named `canLower/lower` or use a more generic pattern like `validate/execute`?
   - Current: verb-specific names for clarity
   - Alternative: generic interface `{ validate(), execute() }` for all capabilities

## References

- ADR-052: Event Handlers for Custom Logic
- ADR-075: Event Handler Consolidation (Effects pattern)
- ADR-087: Action-Centric Grammar
- Existing trait/behavior pattern in world-model
