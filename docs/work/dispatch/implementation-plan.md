# Entity-Centric Action Dispatch Implementation Plan

**ADR**: ADR-090
**Branch**: dispatch
**Status**: Ready for implementation

## Overview

Implement trait-based capability dispatch where:
1. Traits declare capabilities (action IDs they respond to)
2. Behaviors implement 4-phase operations
3. Stdlib actions dispatch to trait behaviors
4. One grammar pattern per verb (no priority conflicts)

## Phase 1: Core Infrastructure (world-model) ✅ COMPLETE

### 1.1 Extend ITrait and ITraitConstructor

**File**: `packages/world-model/src/traits/trait.ts`

Add `capabilities` to the trait constructor interface:

```typescript
export interface ITraitConstructor<T extends ITrait = ITrait> {
  new (data?: any): T;
  readonly type: TraitType | string;
  readonly capabilities?: readonly string[];  // NEW: Action IDs this trait handles
}
```

### 1.2 Create CapabilityBehavior Interface

**File**: `packages/world-model/src/capabilities/capability-behavior.ts` (NEW)

```typescript
import { IFEntity, WorldModel } from '../types';
import { ValidationResult } from './types';
import { Effect } from '@sharpee/event-processor';

/**
 * Standard interface for capability behaviors.
 * Follows the same 4-phase pattern as stdlib actions.
 */
export interface CapabilityBehavior {
  /** Phase 1: Validate whether the action can be performed */
  validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult;

  /** Phase 2: Execute mutations (no events emitted here) */
  execute(entity: IFEntity, world: WorldModel, actorId: string): void;

  /** Phase 3: Report success - return effects for success events */
  report(entity: IFEntity, world: WorldModel, actorId: string): Effect[];

  /** Phase 4: Report failure - return effects for blocked/failure events */
  blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): Effect[];
}
```

### 1.3 Create Capability Registry

**File**: `packages/world-model/src/capabilities/capability-registry.ts` (NEW)

```typescript
import { ITrait, ITraitConstructor } from '../traits/trait';
import { CapabilityBehavior } from './capability-behavior';
import { IFEntity } from '../types';

/**
 * Trait-behavior binding with optional validation.
 */
export interface TraitBehaviorBinding<T extends ITrait = ITrait> {
  traitType: string;
  capability: string;  // Action ID
  behavior: CapabilityBehavior;
  validateBinding?: (trait: T) => boolean;
}

const behaviorRegistry = new Map<string, TraitBehaviorBinding>();

/**
 * Register a behavior for a trait+capability combination.
 * Key format: `${traitType}:${capability}`
 */
export function registerCapabilityBehavior<T extends ITrait>(
  traitType: string,
  capability: string,
  behavior: CapabilityBehavior,
  options?: { validateBinding?: (trait: T) => boolean }
): void {
  const key = `${traitType}:${capability}`;
  behaviorRegistry.set(key, {
    traitType,
    capability,
    behavior,
    validateBinding: options?.validateBinding
  });
}

/**
 * Get behavior for a trait and capability.
 */
export function getBehaviorForCapability(trait: ITrait, capability: string): CapabilityBehavior | undefined {
  const traitType = (trait.constructor as ITraitConstructor).type;
  const key = `${traitType}:${capability}`;
  const binding = behaviorRegistry.get(key);

  if (!binding) {
    return undefined;
  }

  // Runtime validation if provided
  if (binding.validateBinding && !binding.validateBinding(trait)) {
    throw new Error(`Behavior validation failed for trait: ${traitType}, capability: ${capability}`);
  }

  return binding.behavior;
}

/**
 * Clear registry (for testing).
 */
export function clearCapabilityRegistry(): void {
  behaviorRegistry.clear();
}
```

### 1.4 Create Capability Helpers

**File**: `packages/world-model/src/capabilities/capability-helpers.ts` (NEW)

```typescript
import { ITrait, ITraitConstructor } from '../traits/trait';
import { IFEntity } from '../types';

/**
 * Find a trait on the entity that declares capability for the given action ID.
 * Returns first match (entities should have one trait per capability).
 */
export function findTraitWithCapability(entity: IFEntity, actionId: string): ITrait | undefined {
  for (const trait of entity.traits) {
    const traitClass = trait.constructor as ITraitConstructor;
    if (traitClass.capabilities?.includes(actionId)) {
      return trait;
    }
  }
  return undefined;
}

/**
 * Check if entity has any trait claiming a capability.
 */
export function hasCapability(entity: IFEntity, actionId: string): boolean {
  return findTraitWithCapability(entity, actionId) !== undefined;
}

/**
 * Type guard to check if a trait has a specific capability.
 */
export function traitHasCapability<T extends ITrait>(
  trait: ITrait,
  actionId: string,
  traitType?: new (...args: any[]) => T
): trait is T {
  const traitClass = trait.constructor as ITraitConstructor;
  const hasAction = traitClass.capabilities?.includes(actionId) ?? false;

  if (traitType) {
    return hasAction && trait instanceof traitType;
  }
  return hasAction;
}
```

### 1.5 Create Type-Safe Entity Builder

**File**: `packages/world-model/src/entity/entity-builder.ts` (NEW)

```typescript
import { IFEntity, EntityType, WorldModel } from '../types';
import { ITrait, ITraitConstructor } from '../traits/trait';

/**
 * Extract capability strings from a trait class as a union type.
 */
type TraitCapabilities<T extends ITrait> =
  T extends { constructor: { capabilities: readonly (infer C)[] } }
    ? C extends string ? C : never
    : never;

/**
 * Error brand for compile-time capability conflicts.
 */
type CapabilityConflictError<Cap extends string> = {
  readonly __error: 'DUPLICATE_CAPABILITY';
  readonly capability: Cap;
};

/**
 * Type-safe entity builder that tracks claimed capabilities.
 */
export class EntityBuilder<ClaimedCapabilities extends string = never> {
  private entity: IFEntity;
  private claimedCaps = new Set<string>();

  constructor(entity: IFEntity) {
    this.entity = entity;
  }

  /**
   * Add a trait to the entity.
   * Runtime check for capability conflicts.
   */
  add<T extends ITrait>(trait: T): EntityBuilder<ClaimedCapabilities | TraitCapabilities<T>> {
    const traitClass = trait.constructor as ITraitConstructor;
    const newCaps = traitClass.capabilities ?? [];

    // Runtime check for capability conflicts
    for (const cap of newCaps) {
      if (this.claimedCaps.has(cap)) {
        const existing = this.entity.traits.find(t => {
          const tClass = t.constructor as ITraitConstructor;
          return tClass.capabilities?.includes(cap);
        });
        throw new Error(
          `Entity "${this.entity.id}": capability "${cap}" already claimed by ${(existing?.constructor as ITraitConstructor)?.type ?? 'unknown'}`
        );
      }
      this.claimedCaps.add(cap);
    }

    this.entity.add(trait);
    return this as EntityBuilder<ClaimedCapabilities | TraitCapabilities<T>>;
  }

  build(): IFEntity {
    return this.entity;
  }
}

/**
 * Create an entity with type-safe capability tracking.
 */
export function createEntity(world: WorldModel, id: string, type: EntityType): EntityBuilder {
  const entity = world.createEntity(id, type);
  return new EntityBuilder(entity);
}
```

### 1.6 Export from world-model

**File**: `packages/world-model/src/capabilities/index.ts` (NEW)

```typescript
export * from './capability-behavior';
export * from './capability-registry';
export * from './capability-helpers';
```

**File**: `packages/world-model/src/index.ts` (UPDATE)

Add exports:
```typescript
export * from './capabilities';
export * from './entity/entity-builder';
```

### 1.7 Acceptance Criteria

- [ ] `ITraitConstructor` has optional `capabilities` property
- [ ] `CapabilityBehavior` interface defined with 4-phase pattern
- [ ] `registerCapabilityBehavior()` and `getBehaviorForCapability()` work
- [ ] `findTraitWithCapability()` and `hasCapability()` helpers work
- [ ] `EntityBuilder` throws on duplicate capabilities at runtime
- [ ] All new code has unit tests

---

## Phase 2: Stdlib Capability-Dispatch Actions ✅ COMPLETE

### 2.1 Create Generic Capability-Dispatch Action Factory

**File**: `packages/stdlib/src/actions/capability-dispatch.ts` (NEW)

```typescript
import { Action, ActionContext, ValidationResult } from './enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { findTraitWithCapability, getBehaviorForCapability } from '@sharpee/world-model';
import { ActionMetadata } from '../validation';
import { ScopeLevel } from '../scope/types';

interface CapabilityDispatchConfig {
  actionId: string;
  group: string;
  noTargetError: string;
  cantDoThatError: string;
  scope?: ScopeLevel;
}

/**
 * Create a capability-dispatching action.
 * These actions delegate to trait behaviors instead of having fixed semantics.
 */
export function createCapabilityDispatchAction(config: CapabilityDispatchConfig): Action & { metadata: ActionMetadata } {
  return {
    id: config.actionId,
    group: config.group,

    metadata: {
      requiresDirectObject: true,
      requiresIndirectObject: false,
      directObjectScope: config.scope ?? ScopeLevel.REACHABLE
    },

    requiredMessages: [
      'no_target',
      'cant_do_that'
    ],

    validate(context: ActionContext): ValidationResult {
      const entity = context.command.directObject?.entity;

      if (!entity) {
        return { valid: false, error: config.noTargetError };
      }

      // Find trait that claims this capability
      const trait = findTraitWithCapability(entity, config.actionId);
      if (!trait) {
        return { valid: false, error: config.cantDoThatError, params: { target: entity.name } };
      }

      // Get behavior and delegate validation
      const behavior = getBehaviorForCapability(trait, config.actionId);
      if (!behavior) {
        return { valid: false, error: config.cantDoThatError, params: { target: entity.name } };
      }

      const behaviorResult = behavior.validate(entity, context.world, context.player.id);

      if (!behaviorResult.valid) {
        // Store trait/behavior for blocked phase
        context.sharedData.trait = trait;
        context.sharedData.behavior = behavior;
        context.sharedData.entity = entity;
        return behaviorResult;
      }

      // Store for execute/report phases
      context.sharedData.trait = trait;
      context.sharedData.behavior = behavior;
      context.sharedData.entity = entity;

      return { valid: true };
    },

    execute(context: ActionContext): void {
      const { behavior, entity } = context.sharedData;
      behavior.execute(entity, context.world, context.player.id);
    },

    blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
      const { behavior, entity } = context.sharedData;

      if (behavior && entity) {
        const effects = behavior.blocked(entity, context.world, context.player.id, result.error!);
        // Convert effects to events (adapter needed)
        return effects.map(e => context.event(e.type, e.payload));
      }

      return [context.event('action.blocked', {
        actionId: config.actionId,
        messageId: result.error || config.cantDoThatError,
        params: result.params || {}
      })];
    },

    report(context: ActionContext): ISemanticEvent[] {
      const { behavior, entity } = context.sharedData;
      const effects = behavior.report(entity, context.world, context.player.id);

      // Convert effects to events
      return effects.map(e => context.event(e.type, e.payload));
    }
  };
}
```

### 2.2 Create Lowering Action

**File**: `packages/stdlib/src/actions/standard/lowering/lowering.ts` (NEW)

```typescript
import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

export const loweringAction = createCapabilityDispatchAction({
  actionId: IFActions.LOWERING,  // 'if.action.lowering'
  group: 'manipulation',
  noTargetError: 'if.lower.no_target',
  cantDoThatError: 'if.lower.cant_lower_that'
});
```

**File**: `packages/stdlib/src/actions/standard/lowering/index.ts` (NEW)

```typescript
export * from './lowering';
```

### 2.3 Create Raising Action

**File**: `packages/stdlib/src/actions/standard/raising/raising.ts` (NEW)

```typescript
import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

export const raisingAction = createCapabilityDispatchAction({
  actionId: IFActions.RAISING,  // 'if.action.raising'
  group: 'manipulation',
  noTargetError: 'if.raise.no_target',
  cantDoThatError: 'if.raise.cant_raise_that'
});
```

### 2.4 Create Turning Action

**File**: `packages/stdlib/src/actions/standard/turning/turning.ts` (NEW)

```typescript
import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

export const turningAction = createCapabilityDispatchAction({
  actionId: IFActions.TURNING,  // 'if.action.turning'
  group: 'manipulation',
  noTargetError: 'if.turn.no_target',
  cantDoThatError: 'if.turn.cant_turn_that'
});
```

### 2.5 Create Waving Action

**File**: `packages/stdlib/src/actions/standard/waving/waving.ts` (NEW)

```typescript
import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

export const wavingAction = createCapabilityDispatchAction({
  actionId: IFActions.WAVING,  // 'if.action.waving'
  group: 'manipulation',
  noTargetError: 'if.wave.no_target',
  cantDoThatError: 'if.wave.cant_wave_that'
});
```

### 2.6 Add Action Constants

**File**: `packages/stdlib/src/actions/constants.ts` (UPDATE)

Add:
```typescript
LOWERING: 'if.action.lowering',
RAISING: 'if.action.raising',
TURNING: 'if.action.turning',
WAVING: 'if.action.waving',
```

### 2.7 Register Actions

**File**: `packages/stdlib/src/actions/standard/index.ts` (UPDATE)

Add exports and registration for new actions.

### 2.8 Acceptance Criteria

- [ ] `createCapabilityDispatchAction()` factory works
- [ ] `loweringAction` dispatches to trait behaviors
- [ ] `raisingAction` dispatches to trait behaviors
- [ ] `turningAction` dispatches to trait behaviors
- [ ] `wavingAction` dispatches to trait behaviors
- [ ] Actions return proper blocked messages when no capability found
- [ ] Unit tests for capability dispatch

---

## Phase 3: Grammar Patterns ✅ COMPLETE

### 3.1 Add Grammar Patterns

**File**: `packages/parser-en-us/src/grammar.ts` (UPDATE)

Add after existing patterns:

```typescript
// Lowering (ADR-090: capability dispatch)
grammar
  .forAction('if.action.lowering')
  .verbs(['lower'])
  .pattern(':target')
  .where('target', (scope: ScopeBuilder) => scope.reachable())
  .build();

// Raising (ADR-090: capability dispatch)
grammar
  .forAction('if.action.raising')
  .verbs(['raise', 'lift'])
  .pattern(':target')
  .where('target', (scope: ScopeBuilder) => scope.reachable())
  .build();

// Turning (ADR-090: capability dispatch)
grammar
  .forAction('if.action.turning')
  .verbs(['turn', 'rotate', 'spin'])
  .pattern(':target')
  .where('target', (scope: ScopeBuilder) => scope.reachable())
  .build();

// Waving (ADR-090: capability dispatch)
grammar
  .forAction('if.action.waving')
  .verbs(['wave'])
  .pattern(':target')
  .where('target', (scope: ScopeBuilder) => scope.held())
  .build();
```

### 3.2 Add Language Messages

**File**: `packages/lang-en-us/src/actions/lowering.ts` (NEW)

```typescript
export const loweringMessages = {
  'if.lower.no_target': 'What do you want to lower?',
  'if.lower.cant_lower_that': 'You can\'t lower {target}.'
};
```

Similar files for raising, turning, waving.

### 3.3 Acceptance Criteria

- [ ] "lower X" parses to `if.action.lowering`
- [ ] "raise X" and "lift X" parse to `if.action.raising`
- [ ] "turn X" parses to `if.action.turning`
- [ ] "wave X" parses to `if.action.waving`
- [ ] Default error messages work

---

## Phase 4: Dungeo Migration (Proof of Concept)

### 4.1 Create BasketElevatorTrait

**File**: `stories/dungeo/src/traits/basket-elevator-trait.ts` (NEW)

```typescript
import { ITrait, TraitType } from '@sharpee/world-model';

export interface IBasketElevatorData {
  position?: 'top' | 'bottom';
  topRoomId: string;
  bottomRoomId: string;
  wheelRoomId: string;
}

export class BasketElevatorTrait implements ITrait, IBasketElevatorData {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;

  readonly type = 'dungeo.trait.basket_elevator';

  position: 'top' | 'bottom';
  topRoomId: string;
  bottomRoomId: string;
  wheelRoomId: string;

  constructor(data: IBasketElevatorData) {
    this.position = data.position ?? 'top';
    this.topRoomId = data.topRoomId;
    this.bottomRoomId = data.bottomRoomId;
    this.wheelRoomId = data.wheelRoomId;
  }
}
```

### 4.2 Create BasketElevatorBehavior

**File**: `stories/dungeo/src/behaviors/basket-elevator-behavior.ts` (NEW)

```typescript
import { CapabilityBehavior, ValidationResult, IFEntity, WorldModel } from '@sharpee/world-model';
import { Effect, emit } from '@sharpee/event-processor';
import { BasketElevatorTrait } from '../traits/basket-elevator-trait';

export const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity: IFEntity, world: WorldModel, actorId: string): ValidationResult {
    const trait = entity.get(BasketElevatorTrait);

    if (trait.position === 'bottom') {
      return { valid: false, error: 'dungeo.basket.already_down' };
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
    trait.position = 'bottom';
    world.moveEntity(entity.id, trait.bottomRoomId);
  },

  report(entity: IFEntity, world: WorldModel, actorId: string): Effect[] {
    const actorLocation = world.getLocation(actorId);
    const actorInBasket = actorLocation === entity.id;

    return [
      emit('if.event.lowered', {
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

export const BasketRaisingBehavior: CapabilityBehavior = {
  // Similar implementation for raising
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
    const actorLocation = world.getLocation(actorId);
    const actorInBasket = actorLocation === entity.id;

    return [
      emit('if.event.raised', {
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

### 4.3 Register Behaviors

**File**: `stories/dungeo/src/index.ts` (UPDATE)

```typescript
import { registerCapabilityBehavior } from '@sharpee/world-model';
import { BasketElevatorTrait } from './traits/basket-elevator-trait';
import { BasketLoweringBehavior, BasketRaisingBehavior } from './behaviors/basket-elevator-behavior';

// Register capability behaviors
registerCapabilityBehavior(
  BasketElevatorTrait.type,
  'if.action.lowering',
  BasketLoweringBehavior
);

registerCapabilityBehavior(
  BasketElevatorTrait.type,
  'if.action.raising',
  BasketRaisingBehavior
);
```

### 4.4 Update Basket Entity Creation

**File**: `stories/dungeo/src/regions/coal-mine/objects/index.ts` (UPDATE)

Replace existing basket creation with trait-based approach.

### 4.5 Add Language Messages

**File**: `stories/dungeo/src/lang/basket-messages.ts` (NEW)

```typescript
export const basketMessages = {
  'dungeo.basket.already_down': 'The basket is already at the bottom.',
  'dungeo.basket.already_up': 'The basket is already at the top.',
  'dungeo.basket.cant_reach_wheel': 'You can\'t reach the wheel from here.',
  'dungeo.basket.lowered': 'You turn the wheel and the basket descends into the darkness below.',
  'dungeo.basket.lowered_with_actor': 'You turn the wheel and descend with the basket into the darkness.',
  'dungeo.basket.raised': 'You turn the wheel and the basket rises.',
  'dungeo.basket.raised_with_actor': 'You turn the wheel and ascend with the basket.'
};
```

### 4.6 Acceptance Criteria

- [ ] "lower basket" works when player is at wheel or in basket
- [ ] "raise basket" works when player is at wheel or in basket
- [ ] Proper error messages for edge cases
- [ ] Player moves with basket when inside
- [ ] Transcript test passes

---

## Phase 5: Cleanup and Documentation

### 5.1 Remove Old Action Files

After migration verified working:
- Remove story-specific action files (if any)
- Remove conflicting grammar patterns
- Remove type flags (`isBasketElevator`, etc.)

### 5.2 Update Documentation

- [ ] Update core-concepts.md with capability dispatch pattern
- [ ] Add examples to ADR-090

### 5.3 Final Acceptance Criteria

- [ ] All existing tests pass
- [ ] No priority conflicts in grammar
- [ ] Basket elevator works via capability dispatch
- [ ] Build succeeds with no TypeScript errors

---

## Implementation Order

1. **Phase 1.1-1.6**: Core infrastructure (world-model) - foundation for everything else
2. **Phase 2.1**: Capability dispatch factory - enables all dispatch actions
3. **Phase 2.2-2.5**: Individual actions (can be done in parallel)
4. **Phase 3**: Grammar patterns (depends on actions existing)
5. **Phase 4**: Dungeo migration (depends on all above)
6. **Phase 5**: Cleanup (after verification)

## Testing Strategy

### Unit Tests (Phase 1-2)
- `findTraitWithCapability()` finds correct trait
- `hasCapability()` returns true/false correctly
- `EntityBuilder` throws on duplicate capabilities
- `registerCapabilityBehavior()` stores bindings
- `getBehaviorForCapability()` retrieves correct behavior
- Capability-dispatch actions delegate properly

### Integration Tests (Phase 3-4)
- Parser routes "lower X" to lowering action
- Action finds trait, delegates to behavior
- Behavior validates, executes, reports correctly
- End-to-end transcript test for basket

## Dependencies

```
Phase 1 (world-model)
    ↓
Phase 2 (stdlib actions)
    ↓
Phase 3 (grammar)
    ↓
Phase 4 (dungeo migration)
    ↓
Phase 5 (cleanup)
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Type inference for capabilities fails | Use `as const` on capability arrays; fall back to runtime checks |
| Behavior registration order issues | Register in story init before world setup |
| Existing actions affected | Capability dispatch is additive; existing actions unchanged |
| Grammar conflicts | One pattern per verb; no priority needed |

## Success Metrics

- Basket elevator works: "lower basket" / "raise basket"
- No grammar priority conflicts
- Zero story-specific action files for stdlib verbs
- Type-safe capability enforcement at build time
