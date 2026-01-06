# Work Summary: ADR-090 Platform Implementation Complete

**Date**: 2026-01-06
**Status**: Phases 1-3 Complete

## What Was Built

### Phase 1: Core Infrastructure (world-model)

**Files created:**
- `packages/world-model/src/capabilities/types.ts` - ValidationResult, Effect types
- `packages/world-model/src/capabilities/capability-behavior.ts` - CapabilityBehavior interface (4-phase pattern)
- `packages/world-model/src/capabilities/capability-registry.ts` - registerCapabilityBehavior(), getBehaviorForCapability()
- `packages/world-model/src/capabilities/capability-helpers.ts` - findTraitWithCapability(), hasCapability()
- `packages/world-model/src/capabilities/entity-builder.ts` - EntityBuilder with runtime conflict detection
- `packages/world-model/src/capabilities/index.ts` - exports
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` - unit tests

**Modified:**
- `packages/world-model/src/traits/trait.ts` - Added `capabilities` to ITraitConstructor
- `packages/world-model/src/index.ts` - Added capabilities export

### Phase 2: Stdlib Actions

**Files created:**
- `packages/stdlib/src/actions/capability-dispatch.ts` - createCapabilityDispatchAction() factory
- `packages/stdlib/src/actions/standard/lowering/` - lowering action
- `packages/stdlib/src/actions/standard/raising/` - raising action

**Modified:**
- `packages/stdlib/src/actions/constants.ts` - Added LOWERING, RAISING
- `packages/stdlib/src/actions/standard/index.ts` - Registered new actions

### Phase 3: Grammar & Language

**Files created:**
- `packages/lang-en-us/src/actions/lowering.ts` - English messages
- `packages/lang-en-us/src/actions/raising.ts` - English messages

**Modified:**
- `packages/parser-en-us/src/grammar.ts` - Added patterns for lower/raise/lift
- `packages/lang-en-us/src/actions/index.ts` - Registered language content

## How to Use

### 1. Create a Trait with Capabilities

```typescript
class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;
  readonly type = 'dungeo.trait.basket_elevator';

  position: 'top' | 'bottom' = 'top';
  // ... other state
}
```

### 2. Create a Behavior

```typescript
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId) {
    const trait = entity.get(BasketElevatorTrait);
    if (trait.position === 'bottom') {
      return { valid: false, error: 'dungeo.basket.already_down' };
    }
    return { valid: true };
  },

  execute(entity, world, actorId) {
    const trait = entity.get(BasketElevatorTrait);
    trait.position = 'bottom';
    world.moveEntity(entity.id, trait.bottomRoomId);
  },

  report(entity, world, actorId) {
    return [createEffect('if.event.lowered', { target: entity.id })];
  },

  blocked(entity, world, actorId, error) {
    return [createEffect('action.blocked', { messageId: error })];
  }
};
```

### 3. Register the Behavior

```typescript
registerCapabilityBehavior(
  BasketElevatorTrait.type,
  'if.action.lowering',
  BasketLoweringBehavior
);
```

### 4. Add the Trait to an Entity

```typescript
basket.add(new BasketElevatorTrait({
  topRoomId: shaftRoom.id,
  bottomRoomId: draftyRoom.id
}));
```

Now "lower basket" will automatically dispatch to BasketLoweringBehavior.

## What's Next

**Phase 4: Dungeo Migration**
- Create BasketElevatorTrait in stories/dungeo/src/traits/
- Create BasketLoweringBehavior and BasketRaisingBehavior
- Register behaviors in story init
- Add trait to basket entity
- Test with transcript

**Phase 5: Cleanup**
- Remove any old basket-specific action code
- Update documentation

## Git Commits

1. `cf23402` - feat(world-model): Add capability dispatch infrastructure (ADR-090 Phase 1)
2. `38d63da` - feat(stdlib): Add capability-dispatch actions (ADR-090 Phase 2)
3. `4bcbcff` - feat(parser,lang): Add grammar and messages for lowering/raising (ADR-090 Phase 3)
