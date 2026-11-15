# ADR-118: Stdlib Action Interceptors

## Status: ACCEPTED

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
| SWITCHING_ON | Coal machine transformation | Medium |
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

### Edge Case: Utility Modules With Mutations

Some files (e.g., `tiny-room-handler.ts`) are not true handlers or interceptor candidates — they export helper functions called from story-specific actions. The mutations are correct (actions may mutate in their execute phase), but the indirection through a utility module obscures ownership.

**Resolution:** These don't need interceptors. Inline the mutations into each story action's execute phase so ownership is clear. The utility module can be deleted once its callers own their own mutations. This is a refactoring task, not an architectural pattern.

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

## Amendment 1 — composed-clause consultation order (2026-09-03)

**Status**: ACCEPTED — David, 2026-11-14 (session ff7996), ruling "A" on GH #708's three designs: this amendment as drafted, own clauses first, plus an explicit-ordering override (A6 below). Built 2026-11-15. Gates `docs/proposals/publish-readiness-defects.md` P-11 (GH #332, GH #350). Refined by ADR-228 (the lifecycle engine); this amendment changes the registry lookup ADR-228 D3-B consults, not the hook contract.

**Corrected at acceptance (2026-11-15).** The Context below cites the code as it stood on 2026-09-03. The loader's runtime has since been split into sections: `define trait` clauses register in `packages/story-loader/src/runtime/dispatch-verbs.ts` (`bindTraitClauses`), `create`-block clauses and topic tables in `packages/story-loader/src/runtime/on-clauses.ts` (`bindOnClauses`, `mergeArms`). A1's "three `hasInterceptor` sites" are now one function, `hasInterceptorImplementation` in `packages/stdlib/src/actions/standard/dispatch-shared.ts`, and a fourth single-lookup reader existed that the draft did not list: `doorOpeningVeto` in `packages/stdlib/src/actions/standard/going/going.ts`.

### Context

- `WorldModel.getInterceptorForAction` (`packages/world-model/src/world/WorldModel.ts:851-884`) collects every trait on the entity that has a binding for the action, sorts by priority, and returns `candidates[0]`. Every Chord-registered binding has priority 0, so the winner is the entity's trait-map insertion order — an accident, not a rule.
- The Chord loader registers one merged interceptor per (trait type, action) for `define trait` clauses (`packages/story-loader/src/runtime.ts:450-458`) and one per action under `ChordBehaviorTrait` for every `create`-block clause plus the owner's topic table (`runtime.ts:372-395`). An entity composing two Chord traits with clauses for the same action, or one trait beside its own block or topic table, therefore has exactly one binding consulted; the rest are silent dead code (GH #332: the fruit stallkeeper's `wary` + `cleaning-up`).
- GH #350 is the same defect seen from the topic table: a trait's `on the player asking while it is waiting` wins the single slot; with the guard false it returns null without answering, and the owner's `define topics` — registered under `ChordBehaviorTrait` — is never reached. Fernhill's Tobias works only because there the clause and the table share one owner arm (ADR-239 D5's catch-all).
- The consultation rules already exist one level out and one level in: ADR-228 D3-B consults every *command entity* in a fixed published order with first-veto-wins, and the loader's `mergeArms` (`runtime.ts:910`) runs every clause of one owner in declaration order under the same rule. The gap is only *across bindings on one entity*.

### Decision

- **A1 — Every binding is consulted.** `getInterceptorForAction` is replaced by `getInterceptorsForAction(entity, actionId): InterceptorLookupResult[]`, returning every binding on the entity in the A2 order. `resolveLifecycle` (`packages/stdlib/src/actions/lifecycle/lifecycle-engine.ts`) pushes one consultation per (slot, action id, binding) instead of one per (slot, action id); the actor consultation (ADR-327 D1) does the same. The hook semantics ADR-228 defines carry over unchanged: validate-phase hooks run in order and the first veto wins; `postExecute` runs for every consultation; `postReport`'s first `override` wins and `emit` effects append in order (GH #340's rule). The three `hasInterceptor` sites (digging, cutting, turning) read "any binding".
- **A2 — The order.** For one entity and one action: (1) the entity's **own clauses** — the `create` block's clauses and its topic table, the `ChordBehaviorTrait` binding — then (2) its **composed traits in composition order**: the order the trait adjectives appear on the `create` block (for a TypeScript story, `add()` order). `priority` (higher first) remains the only override of that order, and registration order is the final tie-break. Within one binding, `mergeArms`' declaration order stands. The rule in one sentence: **the specific outranks the generic** — an entity's own arm is consulted before any shared trait's.
- **A3 — A gated-out clause falls through.** A clause whose `while` guard or `, once` sits it out returns null in validate and `{}` in report and consumes nothing: the next binding is consulted in every phase. A false guard therefore never shadows a topic table (GH #350). ADR-239 D5's catch-all rule is unchanged *inside* the owner's arm (table hit owns the response; the unfiltered clause serves misses).
- **A4 — Refusals are validate-phase; rows are report-phase.** A trait's guarded `asking` refusal fires in `preValidate`, before the owner's table serves in `postReport`: guard true, the refusal vetoes; guard false, the table serves. That is GH #350's story need ("you cannot speak to a partner who is not your hand" across six ballgoers) without repeating the refusal on every row.
- **A5 — No diagnostic.** Composition is legal and nothing is dead once A1 lands, so the analyzer adds no collision warning. The loader's existing refusal of two clauses for one *dispatch* action in one trait stands — the capability registry (ADR-090) is one behavior per (trait, action) and is outside this amendment.
- **A6 — A stated order overrides A2 (added at acceptance).** `, before <trait>` and `, after <trait>` on a clause head were parsed and carried in the IR (`IROnClause.ordering`) and read by nothing. They now place the clause:
  - On a thing's **own clause**, `, after <trait>` moves that clause behind every trait the thing composes; `, before <trait>` asks for where an own clause already stands.
  - On a **trait's clause**, the word places that trait's whole binding for the action ahead of, or behind, the named trait's. One trait's clauses for one action are consulted together, so they take one place. Both traits a stated order names leave the written order: the earlier stands before, and the later after, every trait no order touches. Every consistent set of stated orders is honored, the same order stated from both sides included.
  - The order is carried by A2's `priority` and nothing else, so world-model gains no new surface: own clauses register at 1000; a trait's at the number of stated orders that run behind it less the number that run ahead of it, zero when none touches it; and an own clause marked `, after` at −1000 under a second marker trait (`chord.behavior.late`). The numbers live in `packages/story-loader/src/clause-order.ts`.
  - An order that cannot be honored refuses to load: a name that is no `define trait`; traits that order one another in a circle; an order on a clause nothing consults in an order (an every-turn clause, an event reaction, a clause on a story-defined action, a bare head); and `, after <trait>` on a topic table owner's own clause for a topic gerund, which is the table's catch-all (ADR-239 D5) and answers inside the table's arm.
- **A7 — Attacking's combat contract over several bindings (added at acceptance).** Attacking took "the" target consultation as the combat resolution (ADR-228 D7.3). With every binding consulted, every target consultation is seeded with the swing, and the one whose `postExecute` leaves an `attackResult` is the resolution; a second binding beside it reacts and resolves nothing.

### Consequences

- A world-model registry API change: the single-lookup form goes; `resolveLifecycle` and the three `hasInterceptor` sites follow in the same landing. ADR-228 D3-B's "each action resolves an interceptor per command entity" now reads "resolves every interceptor per command entity".
- Trait placement on a `create` block becomes semantic for same-action clauses (composition order), the way definition order is semantic for grammar (ADR-268). The trait page documents it.
- Secret Letter's GH #332 workaround (the second refusal folded into the shared keeper trait with a `when` naming the stall) can revert to two traits; the 2026-11-15 landing does not touch the story, which is on hold.
- A6's three refusals are load errors, not analyzer diagnostics: a story that states an impossible order compiles gate-clean and fails when it is loaded.
### Ruled

1. **Own block first (A2 as written) or composed traits first?** Own block first — David, 2026-11-14, choosing it over traits-first and over an analyzer refusal of the combination. Specific over generic: the topic table (own block) serves after a trait's guard-false fall-through under the one rule, and an author who wants the trait asked first writes `, after <trait>` on the own clause (A6).
2. **Do A7 and the mechanism of A6 stand as built?** Both stand — David, 2026-11-15 (session 1bd246), on GH #745. They were added at acceptance and built before he ruled on them; he confirmed each as built, with no amendment.

### Session

effb6f, 2026-09-03 — drafted in publish-readiness plan Phase 1 (`docs/work/publish-readiness/plan.md`). ff7996, 2026-11-14/15 — accepted and built for GH #708, with A6.
