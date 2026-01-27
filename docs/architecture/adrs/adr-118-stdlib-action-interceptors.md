# ADR-118: Stdlib Action Interceptors

## Status: PROPOSED

## Date: 2026-01-26

## Context

### The Problem

ADR-117 identifies that event handlers should migrate to capability behaviors for entity-specific logic. However, stdlib standard actions (ENTER, THROW, PUT, etc.) don't check for capability behaviors - they execute fixed logic and emit events afterward.

Current architecture:
```
Player: "enter boat"
  → enteringAction.validate() [standard checks]
  → enteringAction.execute() [moves player into boat]
  → enteringAction.report() [emits if.event.entered]
  → Handler listens for event, punctures boat AFTER the fact
```

This means:
- Handlers can't block actions (only react after)
- Handlers can't modify action execution
- Entity doesn't "own" its participation in the action

### Prior Art

| Platform | Pattern | Notes |
|----------|---------|-------|
| Inform 6 | `before`/`after` | Hooks around standard action |
| Inform 7 | `Before`/`After`/`Instead` | Both hooks and full replacement |
| TADS 3 | `dobjFor(Verb)` | Object defines verb handling |

Sharpee already has **full delegation** for capability-dispatch actions (LOWER, RAISE) where there's no standard semantics. This ADR addresses standard actions that DO have standard semantics.

### Design Principle

- **Capability-dispatch actions** (LOWER, RAISE, TURN): No standard semantics → full delegation to behavior
- **Standard actions** (ENTER, THROW, PUT): Standard semantics → interceptor hooks

This matches Inform 7's model: `Instead` for custom verbs, `Before`/`After` for standard verbs.

## Decision

Add **interceptor** support to stdlib standard actions. Entities can register interceptors via traits that hook into action phases without replacing standard logic.

### Interceptor Interface

```typescript
/**
 * Interceptor for standard stdlib actions.
 *
 * Allows entities to hook into action phases without replacing
 * standard logic. All hooks are optional.
 */
interface ActionInterceptor {
  /**
   * Called BEFORE standard validation.
   * Return ValidationResult to block action early.
   * Return null to continue with standard validation.
   */
  preValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): ValidationResult | null;

  /**
   * Called AFTER standard validation passes.
   * Return ValidationResult to block action with custom error.
   * Return null to continue with execution.
   *
   * Use this for entity-specific conditions that should block
   * an otherwise valid action.
   */
  postValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): ValidationResult | null;

  /**
   * Called AFTER standard execution completes.
   * Can perform additional mutations.
   * Cannot prevent the standard execution (use postValidate for that).
   */
  postExecute?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void;

  /**
   * Called AFTER standard report.
   * Return additional effects to emit.
   */
  postReport?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[];

  /**
   * Called when action is blocked (validation failed).
   * Return additional effects or custom blocked message.
   * Return null to use standard blocked handling.
   */
  onBlocked?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null;
}

/**
 * Shared data passed through all interceptor phases.
 * Interceptors can store data here for later phases.
 */
interface InterceptorSharedData extends CapabilitySharedData {
  /** Set by postValidate to indicate a condition for postExecute */
  [key: string]: unknown;
}
```

### Registration

Traits declare interceptor capabilities similar to behavior capabilities:

```typescript
class InflatableTrait extends Trait {
  static readonly type = 'dungeo.trait.inflatable';

  // Declares this trait intercepts entering actions
  static readonly interceptors = ['if.action.entering'] as const;

  isInflated: boolean = false;
  // ...
}
```

Interceptors are registered alongside behaviors:

```typescript
// In story's initializeWorld()
registerActionInterceptor(
  InflatableTrait.type,
  'if.action.entering',
  InflatableEnteringInterceptor
);
```

### Stdlib Action Integration

Standard actions check for interceptors at each phase:

```typescript
// In enteringAction (simplified)
validate(context: ActionContext): ValidationResult {
  const target = context.command.directObject?.entity;
  const interceptor = findInterceptorForAction(target, this.id);
  const sharedData: InterceptorSharedData = {};

  // 1. Pre-validate hook
  if (interceptor?.preValidate) {
    const result = interceptor.preValidate(target, context.world, context.player.id, sharedData);
    if (result !== null) {
      return { ...result, data: { interceptor, sharedData } };
    }
  }

  // 2. Standard validation
  if (!target.has(TraitType.ENTERABLE)) {
    return { valid: false, error: 'not_enterable', data: { interceptor, sharedData } };
  }
  // ... other standard checks

  // 3. Post-validate hook
  if (interceptor?.postValidate) {
    const result = interceptor.postValidate(target, context.world, context.player.id, sharedData);
    if (result !== null) {
      return { ...result, data: { interceptor, sharedData } };
    }
  }

  return { valid: true, data: { interceptor, sharedData } };
}

execute(context: ActionContext): void {
  const { interceptor, sharedData } = context.validationResult?.data ?? {};
  const target = context.command.directObject?.entity;

  // Standard execution
  context.world.moveEntity(context.player.id, target.id);

  // Post-execute hook
  if (interceptor?.postExecute) {
    interceptor.postExecute(target, context.world, context.player.id, sharedData);
  }
}

report(context: ActionContext): ISemanticEvent[] {
  const { interceptor, sharedData } = context.validationResult?.data ?? {};
  const target = context.command.directObject?.entity;
  const events: ISemanticEvent[] = [];

  // Standard report
  events.push(context.event('if.event.entered', { ... }));

  // Post-report hook
  if (interceptor?.postReport) {
    const additionalEffects = interceptor.postReport(target, context.world, context.player.id, sharedData);
    events.push(...effectsToEvents(additionalEffects, context));
  }

  return events;
}
```

### Example: Boat Puncture

```typescript
// stories/dungeo/src/traits/inflatable-interceptors.ts

export const InflatableEnteringInterceptor: ActionInterceptor = {
  postValidate(entity, world, actorId, sharedData) {
    // Check if actor is carrying a sharp object
    const inventory = world.getContents(actorId);
    const sharpObject = inventory.find(item =>
      item.puncturesBoat || item.isPointy
    );

    if (sharpObject) {
      // Store for postExecute - don't block, let them enter
      sharedData.willPuncture = true;
      sharedData.punctureItem = sharpObject.name;
    }

    return null; // Continue with action
  },

  postExecute(entity, world, actorId, sharedData) {
    if (!sharedData.willPuncture) return;

    // Player is now in the boat - puncture it!
    const inflatableTrait = entity.get(InflatableTrait);
    if (inflatableTrait) {
      inflatableTrait.isInflated = false;
    }

    // Eject player (boat deflates)
    const boatLocation = world.getLocation(entity.id);
    if (boatLocation) {
      world.moveEntity(actorId, boatLocation);
    }

    // Update boat identity
    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.name = 'pile of plastic';
      identity.description = 'A punctured pile of plastic.';
    }

    // Remove vehicle traits
    entity.remove(TraitType.ENTERABLE);
    entity.remove(TraitType.VEHICLE);

    sharedData.punctured = true;
  },

  postReport(entity, world, actorId, sharedData) {
    if (!sharedData.punctured) return [];

    return [
      createEffect('dungeo.boat.punctured', {
        messageId: 'dungeo.boat.punctured',
        item: sharedData.punctureItem
      })
    ];
  }
};
```

### Example: Glacier Melt (Throwing)

```typescript
export const GlacierThrowingInterceptor: ActionInterceptor = {
  postValidate(entity, world, actorId, sharedData) {
    // Only interested if this is the glacier being thrown AT
    const identity = entity.get(IdentityTrait);
    if (identity?.name !== 'glacier') return null;

    // Check if item being thrown is a lit torch
    // (itemId comes from action's sharedData)
    const itemId = sharedData.itemId;
    const item = world.getEntity(itemId);
    if (!item) return null;

    const lightSource = item.get(LightSourceTrait);
    if (lightSource?.isLit) {
      sharedData.willMelt = true;
      sharedData.torchId = itemId;
    }

    return null;
  },

  postExecute(entity, world, actorId, sharedData) {
    if (!sharedData.willMelt) return;

    // Melt the glacier - open passage, move torch downstream
    meltGlacier(world, entity.id, sharedData.torchId);
    sharedData.melted = true;
  },

  postReport(entity, world, actorId, sharedData) {
    if (!sharedData.melted) return [];

    return [
      createEffect('dungeo.glacier.melted', {
        messageId: 'dungeo.glacier.melts'
      })
    ];
  }
};
```

## Implementation Plan

### Phase 1: Core Infrastructure

1. **Define interfaces** in `packages/world-model/src/capabilities/`
   - `ActionInterceptor` interface
   - `InterceptorSharedData` type
   - Update exports

2. **Create interceptor registry** in `packages/world-model/src/capabilities/`
   - `registerActionInterceptor(traitType, actionId, interceptor)`
   - `getInterceptorForAction(entity, actionId)`
   - Mirror capability-registry.ts pattern

3. **Create helper** in `packages/stdlib/src/actions/`
   - `withInterceptor()` helper that wraps action phases
   - Or inline pattern for each action

### Phase 2: Prototype with ENTERING

1. **Modify entering action** to check for interceptors
2. **Create InflatableEnteringInterceptor** in dungeo
3. **Delete boat-puncture-handler.ts**
4. **Verify walkthrough tests pass**

### Phase 3: Extend to Other Actions

Priority order based on Dungeo needs:

| Action | Interceptor Use Cases | Priority |
|--------|----------------------|----------|
| ENTERING | Boat puncture | High |
| THROWING | Glacier melt, weapon effects | High |
| PUTTING | Coal machine, altar offerings | Medium |
| DROPPING | Basin ritual, pit falling | Medium |
| PUSHING | Button effects | Low |
| TAKING | (Already has capability check?) | Check |

### Phase 4: Migration

1. **Migrate remaining handlers** to interceptors
2. **Delete handler files** as they're replaced
3. **Update ADR-117** migration plan
4. **Document pattern** in core-concepts.md

## Consequences

### Positive

- **Entity ownership**: Entities control their action participation via traits
- **Standard logic preserved**: Stdlib owns standard semantics, interceptors extend
- **Familiar pattern**: Matches Inform 6/7 Before/After model
- **Safe by default**: Forgetting an interceptor just means standard behavior
- **Testable**: Interceptors can be unit tested in isolation
- **Checkpoint-safe**: Interceptor state stored in traits, not closures

### Negative

- **Two patterns**: Full delegation (LOWER/RAISE) vs interceptors (ENTER/THROW)
- **Limited control**: Can't fundamentally change standard action, only extend
- **Learning curve**: Authors must understand when to use which pattern

### Neutral

- **Similar code volume**: Interceptors vs handlers are roughly same size
- **Performance**: Minimal overhead (one trait lookup per action)

## Alternatives Considered

### Option A: Full Delegation for All Actions

Make standard actions also delegate entirely to behaviors.

**Rejected because:**
- Behaviors must duplicate standard logic
- Risk of behaviors diverging from stdlib
- Higher author complexity

### Keep Event Handlers

Continue using `registerEventHandler` pattern.

**Rejected because:**
- Handlers can't block actions
- Entity doesn't own its logic
- Checkpoint issues with closures

## References

- ADR-090: Entity-Centric Action Dispatch (capability behaviors)
- ADR-117: Eliminate Broad Use of Event Handlers
- Inform 7 Documentation: Before/After rules
- TADS 3 Documentation: dobjFor pattern
