# stdlib — Claude Instructions

> Scoped to `packages/stdlib/`. See the root `CLAUDE.md` for project-wide policy.

Actions follow the four-phase pattern (validate/execute/report/blocked) per ADR-051. Each action lives in `src/actions/standard/<name>/` with `<name>.ts`, `<name>-data.ts`, `<name>-events.ts`, `<name>-messages.ts`, and `<name>-types.ts` (e.g., `taking/taking.ts`, `taking/taking-data.ts`).

## Language Layer Separation (stdlib side)

**stdlib emits semantic events with message IDs, not English strings.** Actual prose lives in `lang-en-us`.

- Define message IDs in `*-messages.ts` files.
- Never hardcode English strings in stdlib (or engine, world-model).
- Pass entity-valued template parameters as `entityInfoFrom(entity)`, not `entity.name` (ADR-158). Bare strings strip the `nounType`/`properName`/`article` metadata the formatter chain needs.

## Capability Dispatch, Actions, and Event Handlers (ADR-090)

**CRITICAL**: Understand when to use each pattern before implementing new puzzles/mechanics.

### Pattern Decision Tree

```
Is this a new verb/command that doesn't exist in stdlib?
├── YES → Create a **Story-Specific Action** (e.g., SAY, INCANT, RING)
└── NO → Does the verb have standard semantics (same mutation for all entities)?
    ├── YES (TAKE, DROP, OPEN, PUT) → Use **stdlib action** + traits
    └── NO (LOWER, TURN, WAVE) → Use **Capability Dispatch**
        └── Create Trait + Behavior, register with stdlib action
```

### Verbs with Standard Semantics (DON'T use capability dispatch)

These verbs do the same thing regardless of entity — stdlib handles them:

| Verb          | Standard Mutation      | Trait Needed                  |
| ------------- | ---------------------- | ----------------------------- |
| TAKE/GET      | Move to inventory      | (portable by default)         |
| DROP          | Move to location       | (any portable)                |
| OPEN/CLOSE    | Change isOpen          | OpenableTrait                 |
| LOCK/UNLOCK   | Change isLocked        | LockableTrait                 |
| PUT IN/ON     | Change containment     | ContainerTrait/SupporterTrait |
| ENTER/EXIT    | Change player location | EnterableTrait                |
| SWITCH ON/OFF | Change isOn            | SwitchableTrait               |

**Example**: "PUT COAL IN MACHINE" — Use stdlib putting action. Machine needs ContainerTrait.

### Verbs with NO Standard Semantics (USE capability dispatch)

These verbs mean different things for different entities:

| Verb       | Entity-Specific Examples                                       |
| ---------- | -------------------------------------------------------------- |
| LOWER      | Basket elevator (move basket), mirror pole (lower pole height) |
| RAISE/LIFT | Same — entity decides what "raise" means                       |
| TURN       | Wheel (rotate), dial (set number), crank (activate)            |
| WAVE       | Sceptre (rainbow), wand (spell)                                |
| WIND       | Canary (sing), music box (play)                                |

**Pattern**: Trait declares capabilities, Behavior implements 4-phase logic.

```typescript
// 1. Trait declares which verbs it responds to
class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator';
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;
  position: 'top' | 'bottom';
  // ...
}

// 2. Behavior implements 4-phase pattern (matching stdlib actions)
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    /* can we lower? */
  },
  execute(entity, world, actorId, sharedData) {
    /* do the lowering */
  },
  report(entity, world, actorId, sharedData) {
    /* return effects */
  },
  blocked(entity, world, actorId, error, sharedData) {
    /* return blocked effects */
  },
};

// 3. Register in story's initializeWorld() — on the world instance (ADR-207:
//    per-world binding map, idempotent; no already-registered guard needed)
world.registerCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering', BasketLoweringBehavior);
```

**Capability-effect messageIds MUST be fully-qualified** (decision 2026-07-02, dungeo
regression findings P1). The engine's universal dispatch forwards effect payloads
unchanged — it does NOT auto-prefix short keys the way `createCapabilityDispatchAction`
does, and the universal path always wins when a binding exists, so short keys render
blank. Emit story-registered IDs like `'dungeo.basket.lowered'` from
`report()`/`blocked()` and from `validate()` error codes; never bare keys like
`'lowered'`. The factory's short-key prefixing is legacy — do not rely on it.

### Action Interceptors (ADR-118 hooks, ADR-208 registration)

Interceptors hook into a standard action's phases (`preValidate`/`postValidate`/
`postExecute`/`onBlocked`/`postReport`) without replacing it. Registration is the
same model as capability behaviors — on the world instance (ADR-208: per-world
binding map, idempotent last-wins; no already-registered guard needed):

```typescript
// In the story's initializeWorld()
world.registerActionInterceptor(TrollAxeTrait.type, 'if.action.taking', TrollAxeTakingInterceptor);
```

Stdlib actions resolve interceptors via `context.world.getInterceptorForAction(entity,
actionId)` — never a module-level registry (the old free-function registry is deleted).

**Lifecycle engine (ADR-228)**: actions never hand-roll hook plumbing. Each action
exports an `ActionLifecycleDescriptor` (`src/actions/lifecycle/`) declaring its
consultable entity slots; the shared engine owns hook order (published, first veto
wins), veto-only guard semantics, structured onBlocked, and per-item multi-object
lifecycles. New actions get interceptor correctness by writing a descriptor —
hand-rolled lifecycle code is a review-rejectable smell.

**Both-ids-fire rule (ADR-228 D6)**: one physical operation can consult hooks under
two action ids — `remove X from Y` fires `if.action.removing` AND `if.action.taking`
on the item (a taking-guard can't be bypassed by phrasing); `insert X in Y` fires
`if.action.inserting` then delegates into putting's `if.action.putting` hooks.
**A trait should register its interceptor under exactly ONE of the ids** to avoid
double-mutation.

When stdlib doesn't have the verb at all, the story creates a full action:

```typescript
// stories/dungeo/src/actions/say/say-action.ts
export const sayAction: Action = {
  id: 'dungeo.action.say',
  group: 'communication',
  validate(context) { /* ... */ },
  execute(context) { /* ... */ },
  report(context) { /* ... */ },
  blocked(context, result) { /* ... */ },
};
```

**Examples**: SAY (speech), INCANT (cheat code), RING (bell), PRAY (blessing)

### Event Handlers (for reacting to existing actions)

When you need custom logic AFTER a stdlib action succeeds:

```typescript
// Listen for if.event.put_in and react
world.registerEventHandler('if.event.put_in', (event, world) => {
  if (event.data.targetId === machineId && isCoal(event.data.itemId)) {
    (machine as any).hasCoal = true;
  }
});
```

**Examples**: Glacier handler (react to THROW), trophy case scoring (react to PUT IN)

### Coal Machine Example (CORRECT approach)

The coal machine puzzle requires:

1. PUT COAL IN MACHINE — stdlib putting action (machine is ContainerTrait)
2. TURN SWITCH — story action (new verb) or event handler

Since "turn switch" is puzzle-specific (not a generic IF verb), the story action is correct.

### References

- ADR-090: Entity-Centric Action Dispatch (full details on capability system)
- ADR-087: Action-Centric Grammar
- ADR-052: Event Handlers for Custom Logic

## Migration Audits Enumerate Emissions, Not Just Mutations

When migrating an entity `on` handler to a capability behavior or action interceptor, the audit must document, for each handler:

1. **State it mutates** — world entities, traits, attributes.
2. **Events it emits, and the semantic each carries** — override-the-primary-message vs append; single message vs multi-line narration; side-effect events vs message reactions.
3. **What the dispatch layer did with those emissions** in the old system — consumed as override, forwarded to text-service, processed as a reaction.

Migrate each responsibility explicitly. If the new pattern has no equivalent for one of them, flag the gap before committing.

The failure mode this prevents: ISSUE-074 / ADR-157. The rug `on['if.event.pushed']` returned a single `game.message`, which the OLD `event-processor.invokeEntityHandlers()` consumed as an override on the original `if.event.pushed.messageId`. ISSUE-068 migrated the rug to an interceptor with the same `Effect[]` return shape, but the interceptor invocation path appends rather than overrides. The override responsibility was silently dropped, and the player saw both the standard "you give the rug a push" line *and* the rug-reveal line. The walkthrough used `[OK: contains "trap door"]`, so the regression was invisible to the test baseline.

The substitution `Effect[]` ↔ `CapabilityEffect[]` is rarely purely structural. Don't assume it is.

## Action Testing — World State Verification

**CRITICAL**: All mutation actions must have tests that verify actual world state changes, not just events.

The "dropping bug" revealed that actions can appear to work (good messages, correct events) while failing to actually change state. This was caused by execute phases that set up data but never called `world.moveEntity()` or behavior mutations.

**Required Test Pattern:**

```typescript
test('should actually move item to player inventory', () => {
  const { world, player, room } = setupBasicWorld();
  const ball = world.createEntity('ball', 'object');
  world.moveEntity(ball.id, room.id);

  // PRECONDITION
  expect(world.getLocation(ball.id)).toBe(room.id);

  const context = createRealTestContext(takingAction, world, command);
  takingAction.validate(context);
  takingAction.execute(context);

  // POSTCONDITION — THE CRITICAL ASSERTION
  expect(world.getLocation(ball.id)).toBe(player.id);
});
```

**Helper utilities** in `tests/test-utils/index.ts`:

- `expectLocation(world, entityId, expected)` — Assert current location
- `expectLocationChanged(world, entityId, from, to)` — Assert location changed
- `expectTraitValue(entity, traitType, prop, value)` — Assert trait property
- `captureEntityState(world, entityId)` — Snapshot for debugging

**See**: `docs/work/test-review/plan-20260406-testing-mitigation.md` for full details.
