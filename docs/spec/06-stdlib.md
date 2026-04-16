# Sharpee Standard Library Specification

**Subsystem**: Stdlib — four-phase action contract, standard verb catalog, message-ID protocol
**Prerequisites**: `02-world-model.md` (traits, capability dispatch), `03-parser.md` / `04-grammar.md` (ParsedCommand, patterns), `05-engine.md` (turn cycle, ActionContext)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The standard library is the core catalogue of player verbs. Every stdlib action:

1. Declares a unique action ID (`if.action.taking`, `if.action.opening`, ...).
2. Implements the four-phase contract (`validate → execute → report → blocked`).
3. Declares message IDs the language layer provides (`no_target`, `already_open`, `taken`, ...).
4. Depends only on traits + behaviours from `world-model`, events from `core`, and action context from `engine`.
5. Emits semantic events with message IDs — never prose.

A conforming implementation MUST provide actions whose **observable behaviour** matches the catalogue below: same event types, same trait prerequisites, same success/failure conditions. It MAY choose a different code structure.

---

## Invariants

1. **Four phases.** Every action has `validate`, `execute`, `report`, `blocked`. The engine calls them in order: `validate → (execute → report) | blocked`.
2. **Validate is pure.** `validate(context)` MUST NOT mutate world state. It reads; it returns a `ValidationResult`; it never emits events.
3. **Execute only mutates.** `execute(context)` performs mutations. It emits no events in the preferred pattern; any events it returns are legacy.
4. **Report owns success events.** `report(context)` runs only after `execute` succeeded. It emits all success events with captured state snapshots.
5. **Blocked owns failure events.** `blocked(context, result)` runs only after `validate` rejected. It emits failure events using the `error` message ID from the validation result.
6. **ValidationResult.data flows to later phases.** Anything `validate` discovers (a trait, a target, a pre-computed answer) is returned via `ValidationResult.data` and read from `context.validationResult.data` in execute/report/blocked. Context pollution is an anti-pattern.
7. **Events carry messageIds, never prose.** Every event payload either carries a `messageId: <namespaced-id>` or carries no text at all. English is resolved by the text service (`07-text-service.md`).
8. **Each action owns its message IDs.** An action's message IDs are namespaced under the action's ID (`if.action.taking.already_have`). Stories override by registering replacement language.
9. **Behaviours perform mutations; actions coordinate.** The mutation that opens a door is in `OpenableBehavior`, not in `openingAction`. The action wires validation, delegates mutation, and formats events.
10. **Capability dispatch has priority.** Before running its default logic, an action MUST check `findTraitWithCapability(target, actionId)` (ADR-090). If a trait claims the capability, the action delegates all four phases to the trait's `CapabilityBehavior`.

---

## Public Contract

### Action interface

```
interface Action {
    id:                   ActionId                       // e.g., "if.action.taking"
    group?:               String                         // semantic grouping
    priority?:            Integer                        // pattern priority (default 0)
    defaultScope?:        Map<SlotName, ScopeLevel>      // slot → required level
    requiredMessages?:    List<String>                    // for docs / validation
    descriptionMessageId?: String                         // help text
    examplesMessageId?:    String

    // Four-phase contract
    validate(context: ActionContext) -> ValidationResult
    execute(context: ActionContext) -> Void | List<SemanticEvent>
    report?(context: ActionContext) -> List<SemanticEvent>
    blocked?(context: ActionContext, result: ValidationResult) -> List<SemanticEvent>

    // Optional metadata
    targetRequirements?: {                                 // ADR-104 inference
        trait?:       TraitTypeId
        condition?:   String                               // e.g., "not_open"
        description:  String
    }
    requiresHolding?:         Boolean                      // auto-take if not held
    allowImplicitInference?:  Boolean
    allowImplicitTake?:       Boolean

    // Legacy
    canExecute?(context) -> Boolean                        // deprecated
}

ValidationResult {
    valid:      Boolean
    error?:     String                                     // message ID on failure
    params?:    Map<String, Any>                           // template params
    messageId?: String                                     // explicit override
    data?:      Map<String, Any>                           // flow to execute/report/blocked
}
```

### ActionContext

The engine assembles this object and passes it through every phase:

```
interface ActionContext {
    // Read-only view of the world + command
    world:            WorldModel
    player:           IFEntity
    currentLocation:  IFEntity
    command:          ValidatedCommand
    action:           Action
    scopeResolver:    ScopeResolver
    validationResult?: ValidationResult                  // set after validate

    // Shared data across phases
    sharedData:       Map<String, Any>                    // prefer ValidationResult.data

    // Scope / perception helpers
    canSee(entity)   -> Boolean
    canReach(entity) -> Boolean
    canTake(entity)  -> Boolean
    isInScope(entity) -> Boolean
    getVisible()     -> List<IFEntity>
    getInScope()     -> List<IFEntity>
    getEntityScope(entity) -> ScopeLevel
    getSlotScope(slot)     -> ScopeLevel
    requireScope(entity, required) -> ScopeCheckResult
    requireSlotScope(slot, required) -> ScopeCheckResult
    requireCarriedOrImplicitTake(entity) -> ImplicitTakeResult

    // Event creation helper
    event(type: String, data: Any) -> SemanticEvent       // auto-enriches with entities + metadata
}

enum ScopeLevel {                                          // from 02-world-model.md
    UNAWARE   = 0
    AWARE     = 1
    VISIBLE   = 2
    REACHABLE = 3
    CARRIED   = 4
}

enum SenseType {
    SIGHT
    HEARING
    SMELL
    TOUCH
    VIBE
}

ScopeCheckResult {
    ok:            Boolean
    error?:        { valid: false, error: String, params?: Map }
    actualScope?:  ScopeLevel
}

ImplicitTakeResult {
    ok:                  Boolean
    error?:              { valid: false, error: String, params?: Map }
    implicitTakeEvents?: List<SemanticEvent>              // prepend in report()
}
```

### Four-phase execution semantics

```
1. validate(context) → ValidationResult
     - Runs first. Pure. Checks preconditions.
     - Returns { valid: true, data?: ... } or { valid: false, error: <msgId>, params?: ... }
     - MAY pre-resolve data (trait lookups, target entity selection) into `data` for later phases.

2. if ValidationResult.valid:
       execute(context)
         - Mutates the world (via behaviours, e.g., OpenableBehavior.open(entity))
         - Does not emit events
       report(context) → List<SemanticEvent>
         - Emits success events
         - Reads captured state from context.sharedData or context.validationResult.data

   else:
       blocked(context, result) → List<SemanticEvent>
         - Emits failure events with messageId derived from result.error
```

### Action registry

The engine maintains a registry of actions keyed by action ID:

```
interface ActionRegistry {
    register(action: Action) -> Void
    unregister(actionId: String) -> Void
    get(actionId: String) -> Action?
    getAll() -> List<Action>
    getByGroup(group: String) -> List<Action>
}
```

Stories register custom actions via `story.getCustomActions()`. Stdlib registers the 49 standard actions at engine initialisation.

### Scope error codes

Standard scope failure messages are provided by every conforming implementation:

| Message ID              | Meaning                                           |
|-------------------------|---------------------------------------------------|
| `scope.not_known`       | Entity not known to player                        |
| `scope.not_visible`     | Entity known but not visible                      |
| `scope.not_reachable`   | Entity visible but not reachable                  |
| `scope.not_carried`     | Entity must be carried; is not                    |
| `scope.out_of_scope`    | Generic out-of-scope failure                      |

`ActionContext.requireScope(entity, level)` returns one of these as the error code when the check fails.

### Implicit take (ADR-104)

Actions that require the target to be held set `requiresHolding: true`. When validation encounters a non-held target that is reachable and takeable, the engine automatically performs a TAKE before the main action:

1. `requireCarriedOrImplicitTake(entity)` in the action's `validate`.
2. If the item is already carried → success.
3. If reachable and takeable → perform implicit TAKE, return `implicitTakeEvents` to prepend.
4. If reachable but not takeable (scenery, etc.) → fail with the TAKE error.
5. If unreachable → fail with a scope error.

The `implicit_take` event is prepended to the report output so text services render "(first taking the leaflet)" before the main action's response.

### Implicit inference (ADR-104)

When a pronoun resolution results in a target that doesn't meet `targetRequirements` (e.g., "read it" where `it=mailbox` but mailbox isn't readable), the engine MAY re-run with an alternative in-scope target that satisfies the requirement. Controlled per story by `implicitActions.inference` and per action by `allowImplicitInference`.

### Capability dispatch in stdlib (ADR-090)

Every stdlib action SHOULD, at the start of `validate`, call:

```
check = checkCapabilityDispatch(actionId, target)
if check.shouldDispatch:
    delegate all four phases to check.behavior
```

This lets a trait override the default action logic without forking the action. Resolution modes: `first-wins`, `any-blocks`, `all-must-pass`, `highest-priority`.

### Action interceptors (ADR-118)

Traits MAY also declare `static interceptors = [<actionId>, ...]`. Unlike capability dispatch (which replaces the action), an interceptor runs *alongside* the default logic:

```
interface ActionInterceptor {
    preValidate?(target, world, actorId, sharedData) -> ValidationResult | Null
    onBlocked?(target, world, actorId, errorId, sharedData) -> List<Effect> | Null
    postExecute?(target, world, actorId, sharedData) -> List<Effect> | Null
}
```

Use cases: troll blocks taking its axe, fortune cookie reveals message on opening, door scripted to emit side-events. The interceptor can reject, can add side-effects, but does NOT replace the core action.

---

## Standard Verb Catalog

The full set of standard action IDs the reference implementation registers. The catalog column order:

- **Action ID** — canonical identifier used in grammar and events
- **Slots** — required slot schema (`—` = no target; `T` = target / directObject; `I` = item; `C` = container; etc.)
- **Trait prerequisite** — what the target needs for the default success path
- **Key events** — on success / primary failure
- **Capability-dispatchable** — whether this action routes through capability dispatch (ADR-090) by default

Action groups give a high-level sense of clustering. Legend: **Meta** = outside the turn cycle. **C-D** = capability-dispatchable.

### Observation & senses (group: `sensory`)

| Action ID                    | Slots | Trait prerequisite        | Key events on success                            | Failure cause                                    |
|------------------------------|-------|---------------------------|--------------------------------------------------|--------------------------------------------------|
| `if.action.looking`          | —     | (current room)            | `if.event.looked`                                 | dark + no light → `darkness`                     |
| `if.action.examining`        | T     | —                         | `if.event.examined`                               | scope failure                                    |
| `if.action.searching`        | T     | ContainerTrait (optional) | `if.event.searched`                               | not searchable                                   |
| `if.action.looking_under`    | T     | —                         | `if.event.looked_under`                           | scope failure                                    |
| `if.action.looking_behind`   | T     | —                         | `if.event.looked_behind`                          | scope failure                                    |
| `if.action.listening`        | T?    | —                         | `if.event.listened`                               | nothing to hear                                  |
| `if.action.smelling`         | T?    | —                         | `if.event.smelled`                                | nothing to smell                                 |
| `if.action.touching`         | T     | —                         | `if.event.touched`                                | scope failure                                    |
| `if.action.tasting`          | T     | EdibleTrait (soft)        | `if.event.tasted`                                 | scope failure                                    |
| `if.action.reading`          | T     | ReadableTrait             | `if.event.read`                                   | not readable / too dark                          |

### Inventory & manipulation (group: `inventory`, `container_manipulation`)

| Action ID                    | Slots      | Trait prerequisite                 | Key events on success             | Failure cause                        | C-D |
|------------------------------|------------|------------------------------------|-----------------------------------|--------------------------------------|-----|
| `if.action.inventory`        | —          | —                                   | `if.event.inventory_listed`       | —                                    |     |
| `if.action.taking`           | T          | portable (not SceneryTrait)         | `if.event.taken`                  | scenery / already held / too heavy   | ✓   |
| `if.action.dropping`         | T          | CARRIED                             | `if.event.dropped`                | not carried                          | ✓   |
| `if.action.putting`          | I, C       | ContainerTrait on C                 | `if.event.put_in`                 | not a container / closed / no room   | ✓   |
| `if.action.inserting`        | I, C       | ContainerTrait on C                 | `if.event.inserted`               | same as putting                      | ✓   |
| `if.action.removing`         | I, C       | I ∈ contents(C)                     | `if.event.removed_from`            | not inside                           | ✓   |
| `if.action.throwing`         | I, T       | I CARRIED; T visible                | `if.event.thrown`                 | not held / target out of scope       | ✓   |
| `if.action.emptying`         | C          | ContainerTrait                      | `if.event.emptied`                | not a container / locked             | ✓   |

### State changes (group: `state`)

| Action ID                    | Slots      | Trait prerequisite                 | Key events on success             | Failure cause                        | C-D |
|------------------------------|------------|------------------------------------|-----------------------------------|--------------------------------------|-----|
| `if.action.opening`          | T          | OpenableTrait                       | `if.event.opened`                 | already open / locked / not openable | ✓   |
| `if.action.closing`          | T          | OpenableTrait                       | `if.event.closed`                 | already closed / not closeable       | ✓   |
| `if.action.locking`          | T, key     | LockableTrait + OpenableTrait       | `if.event.locked`                 | already locked / wrong key / open    | ✓   |
| `if.action.unlocking`        | T, key     | LockableTrait                       | `if.event.unlocked`               | already unlocked / wrong key         | ✓   |
| `if.action.switching_on`     | T          | SwitchableTrait                     | `if.event.switched_on`            | already on / not switchable          | ✓   |
| `if.action.switching_off`    | T          | SwitchableTrait                     | `if.event.switched_off`           | already off / not switchable         | ✓   |

### Wearable (group: `wearable`)

| Action ID                | Slots | Trait prerequisite              | Key events on success    | Failure cause                 | C-D |
|--------------------------|-------|----------------------------------|--------------------------|-------------------------------|-----|
| `if.action.wearing`      | T     | WearableTrait + CARRIED          | `if.event.worn`          | not wearable / already worn    | ✓   |
| `if.action.taking_off`   | T     | WearableTrait + worn             | `if.event.removed`       | not worn                       | ✓   |

### Consumption (group: `consumption`)

| Action ID                | Slots | Trait prerequisite              | Key events on success    | Failure cause                  | C-D |
|--------------------------|-------|----------------------------------|--------------------------|--------------------------------|-----|
| `if.action.eating`       | T     | EdibleTrait                       | `if.event.eaten`         | not edible / gone              | ✓   |
| `if.action.drinking`     | T     | EdibleTrait (liquid)              | `if.event.drunk`         | not drinkable / empty          | ✓   |

### Movement (group: `movement`)

| Action ID                | Slots   | Trait prerequisite                  | Key events on success            | Failure cause                         | C-D |
|--------------------------|---------|--------------------------------------|----------------------------------|---------------------------------------|-----|
| `if.action.going`        | direction | RoomTrait + valid exit              | `if.event.moved`, `if.event.room_entered` | no exit / blocked / locked door |     |
| `if.action.entering`     | T        | EnterableTrait / VehicleTrait / ContainerTrait.enterable | `if.event.entered` | not enterable / full            | ✓   |
| `if.action.entering_room`| destination | (ADR-126 interceptor target)    | `if.event.entered_room`         | destination rejects entry         | interceptor |
| `if.action.exiting`      | —        | currently inside something          | `if.event.exited`               | not inside                        | ✓   |
| `if.action.climbing`     | T        | ClimbableTrait                       | `if.event.climbed`              | not climbable                     | ✓   |
| `if.action.jumping`      | —        | —                                    | `if.event.jumped`               | —                                 |     |

### Entity-centric physical (group: `physical`) — *primarily capability-dispatched*

| Action ID                | Slots | Key events on success           | Notes                                 | C-D |
|--------------------------|-------|----------------------------------|---------------------------------------|-----|
| `if.action.pushing`      | T     | `if.event.pushed`                | PushableTrait or capability           | ✓   |
| `if.action.pulling`      | T     | `if.event.pulled`                | PullableTrait or capability           | ✓   |
| `if.action.turning`      | T     | `if.event.turned`                | capability-dispatched                 | ✓   |
| `if.action.setting`      | T     | `if.event.set`                   | capability (e.g., dial → number)      | ✓   |
| `if.action.lowering`     | T     | `if.event.lowered`               | capability-dispatched                 | ✓   |
| `if.action.raising`      | T     | `if.event.raised`                | capability-dispatched                 | ✓   |
| `if.action.waving`       | T     | `if.event.waved`                 | capability-dispatched                 | ✓   |
| `if.action.hiding`       | T?    | `if.event.hid`                   | concealment (ADR-148)                 | ✓   |
| `if.action.revealing`    | T?    | `if.event.revealed`              | concealment                           | ✓   |

### Conversation (group: `communication`)

| Action ID                | Slots           | Key events on success        | Notes                               |
|--------------------------|-----------------|------------------------------|-------------------------------------|
| `if.action.talking`      | T (actor)       | `if.event.talked`            | delegates to NPC dialogue           |
| `if.action.asking`       | T, topic        | `if.event.asked`             | `ask X about Y`                     |
| `if.action.telling`      | T, topic        | `if.event.told`              | `tell X about Y`                    |
| `if.action.answering`    | text            | `if.event.answered`          | response to NPC query               |
| `if.action.giving`       | I, T            | `if.event.given`             | I must be CARRIED                   |
| `if.action.showing`      | I, T            | `if.event.shown`             | I must be CARRIED                   |
| `if.action.kissing`      | T               | `if.event.kissed`            | —                                   |
| `if.action.consulting`   | T, topic        | `if.event.consulted`         | reference material                  |

### Combat & destruction (group: `combat`)

| Action ID                | Slots           | Trait prerequisite     | Key events on success        | C-D |
|--------------------------|-----------------|------------------------|------------------------------|-----|
| `if.action.attacking`    | T (enemy), inst (weapon) | CombatantTrait on T | `if.event.attacked`      | ✓   |

### Sleep / wait (group: `passive`)

| Action ID                | Slots | Key events on success  | Notes                              |
|--------------------------|-------|-------------------------|------------------------------------|
| `if.action.waiting`      | —     | `if.event.waited`       | advances turn only                 |
| `if.action.sleeping`     | —     | `if.event.slept`        | —                                  |
| `if.action.waking`       | —     | `if.event.woke`         | —                                  |

### Meta-commands (group: `meta`, outside turn cycle)

| Action ID                   | Effect                                                     |
|-----------------------------|------------------------------------------------------------|
| `if.action.about`            | Display story metadata                                     |
| `if.action.help`             | Display help                                               |
| `if.action.hints`            | Display hints                                              |
| `if.action.version`          | Display engine + story versions                            |
| `if.action.scoring`          | Display current score                                      |
| `if.action.verifying`        | Self-test / verify story integrity                         |
| `if.action.saving`           | Emit `platform.save_requested`                             |
| `if.action.restoring`        | Emit `platform.restore_requested`                          |
| `if.action.restarting`       | Emit `platform.restart_requested`                          |
| `if.action.quitting`         | Emit `platform.quit_requested`                             |
| `if.action.undoing`          | Emit `platform.undo_requested`                             |
| `if.action.again`            | Emit `platform.again_requested`                            |

A conforming implementation MUST provide at least: SAVE, RESTORE, QUIT, RESTART, UNDO, AGAIN, SCORE, HELP, VERSION, ABOUT. The others are recommended.

---

## Message-ID Protocol

### Namespace convention

- **Core messages**: `if.*` (e.g., `if.action.taking.taken`, `if.scope.not_reachable`).
- **Story messages**: `<story-id>.*` (e.g., `dungeo.thief.appears`).
- **Extension messages**: `<extension-id>.*`.

### Action-scoped message IDs

Each action defines its own message IDs as short suffixes:

```
OpeningMessages = {
    NO_TARGET:       'no_target',
    NOT_OPENABLE:    'not_openable',
    ALREADY_OPEN:    'already_open',
    LOCKED:          'locked',
    CANT_REACH:      'cant_reach',
    CANNOT_OPEN:     'cannot_open',
    OPENED:          'opened',
    REVEALING:       'revealing',
    ITS_EMPTY:       'its_empty',
}
```

When emitted, the action prefixes its own ID:

```
event.data.messageId = `${action.id}.${messageKey}`
// → "if.action.opening.opened"
```

The text service looks up the full ID (`07-text-service.md`).

### Event payload shape (rendering + domain)

Standard stdlib events carry both rendering data (for the text service) and domain data (for event sourcing / handlers):

```
event.data = {
    // Rendering
    messageId:   String              // "if.action.opening.opened"
    params:      Map<String, Any>    // template params: { item: "chest" }

    // Domain
    actorId:     EntityId            // who did it
    targetId:    EntityId            // primary target
    targetName:  String              // captured snapshot
    …action-specific fields…
}
```

Actions MAY emit multiple events: one rich domain event and one simpler backward-compatible event. The text service uses the first one carrying a `messageId`.

### Required message coverage

Every action SHOULD declare `requiredMessages` listing the suffix IDs it emits. Tooling (introspection) checks that the language provider has all required messages for all registered actions.

---

## Event Catalog (stdlib-emitted events)

All `if.event.*` events share the envelope from `01-data-model.md`. Stdlib emits:

| Event type                     | Emitted by                         | Domain fields                             |
|--------------------------------|------------------------------------|-------------------------------------------|
| `if.event.taken`               | taking                              | `itemId`, `fromLocationId`                |
| `if.event.implicit_take`       | (prepended to requiring action)     | `itemId`                                  |
| `if.event.dropped`             | dropping                            | `itemId`, `toLocationId`                  |
| `if.event.put_in`              | putting / inserting                 | `itemId`, `containerId`                   |
| `if.event.inserted`            | inserting                            | same                                      |
| `if.event.removed_from`        | removing                             | `itemId`, `containerId`                   |
| `if.event.thrown`              | throwing                             | `itemId`, `targetId`                      |
| `if.event.opened`              | opening                              | `targetId`                                |
| `if.event.closed`              | closing                              | `targetId`                                |
| `if.event.locked`              | locking                              | `targetId`, `keyId`                       |
| `if.event.unlocked`            | unlocking                            | `targetId`, `keyId`                       |
| `if.event.switched_on` / `switched_off` | switching                    | `targetId`                                |
| `if.event.worn` / `removed`    | wearing / taking_off                 | `itemId`                                  |
| `if.event.eaten` / `drunk`     | eating / drinking                    | `itemId`                                  |
| `if.event.moved`               | going, throwing, internal moves      | `entityId`, `fromLocationId`, `toLocationId` |
| `if.event.room_entered`        | going + entering_room                | `locationId`, `direction`                 |
| `if.event.entered`             | entering                             | `containerId`                             |
| `if.event.exited`              | exiting                              | `fromContainerId`                         |
| `if.event.climbed`             | climbing                             | `targetId`, `direction`                   |
| `if.event.examined` / `searched` / `looked_under` / `looked_behind` | examining-family | `targetId` |
| `if.event.read`                | reading                              | `targetId`, `text` (optional)             |
| `if.event.listened` / `smelled` / `touched` / `tasted` | sensory         | `targetId?`                               |
| `if.event.pushed` / `pulled` / `turned` / `set` / `lowered` / `raised` / `waved` | physical | entity-specific via capability     |
| `if.event.attacked`            | attacking                            | `attackerId`, `defenderId`, `instrumentId?`|
| `if.event.given` / `shown`     | giving / showing                     | `itemId`, `recipientId`                   |
| `if.event.talked` / `asked` / `told` / `answered` / `kissed` | conversation | `targetId`, `topic?`                |
| `if.event.waited` / `slept` / `woke` | passive                       | —                                         |
| `if.event.inventory_listed`    | inventory                             | `items: List<{id, name}>`                 |
| `if.event.open_blocked` / `take_blocked` / etc. | blocked phase       | `reason`, `targetId`                      |
| `message.success` / `message.failure` / `message.info` / `message.warning` / `message.debug` | various | `messageId`, `params?`    |

Full handlers may listen to `if.event.*` and react (ADR-086, ADR-094).

---

## Event Handlers (ADR-052, ADR-086)

Actions are not the only way to react to commands. Any subsystem MAY register an event handler on the world:

```
world.registerEventHandler('if.event.put_in', (event, world) => {
    if (event.data.containerId === trophyCaseId && isTreasure(event.data.itemId)) {
        world.awardScore('treasure-' + event.data.itemId, 5, 'Treasure placed in trophy case');
    }
});
```

Handlers fire during the event processing pipeline (`05-engine.md`). They can:

- Mutate the world.
- Emit additional events (via the event processor).
- Use `registerEventValidator` to veto an event before it's applied.
- Use `registerEventPreviewer` to compute the set of changes an event would produce, without applying it.
- Use `chainEvent` (ADR-094) to emit follow-up events deterministically.

**Event handlers vs capability behaviors** (ADR-117):

- **Capability behaviors** replace an action's default logic for a specific target.
- **Event handlers** react after an event has been emitted, typically for scoring, side-effects, or entity-agnostic rules.

Use the former when an entity needs a custom verb mutation; use the latter when a global rule must fire in response to a specific event type.

---

## Extension Points

1. **Custom actions.** Register via `story.getCustomActions()`. A custom action implements the same four-phase contract.
2. **Custom message IDs.** Emit events with `data.messageId` in your story namespace. Register replacements via `story.extendLanguage()`.
3. **Custom scope check helpers.** Actions MAY call custom `ScopeResolver` methods.
4. **Capability behaviors.** Traits claiming `static capabilities = [actionId]` override the default action logic for their target (ADR-090).
5. **Action interceptors.** Traits claiming `static interceptors = [actionId]` add pre-validate / on-blocked / post-execute hooks (ADR-118).
6. **Event handlers** on `if.event.*` (ADR-086, ADR-094).
7. **Before-action hooks** (ADR-148) — engine-level listeners that fire before the action's validate phase.
8. **Sub-actions** (ADR-063) — An action MAY delegate to another action via the registry (e.g., `pick up` delegates to `taking`).

---

## Mandatory vs Optional

| Feature                                      | Required | Notes |
|----------------------------------------------|----------|-------|
| Four-phase contract (validate/execute/report/blocked) | **Required** |       |
| Action registry                              | **Required** |       |
| ActionContext with world/player/command/scope | **Required** |       |
| ScopeLevel + requireScope helpers            | **Required** |       |
| ValidationResult.data flow                   | **Required** |       |
| Message-ID protocol (no prose in events)     | **Required** |       |
| Capability dispatch check at start of validate (ADR-090) | **Required** |       |
| Action interceptors (ADR-118)                | Recommended | Enables guard behaviours |
| Implicit take (ADR-104)                      | Recommended |       |
| Implicit inference (ADR-104)                 | Optional |       |
| Sub-action delegation (ADR-063)              | Optional |       |
| Core action set: TAKE, DROP, OPEN, CLOSE, EXAMINE, LOOK, INVENTORY, GO, ENTER, EXIT, WAIT, SCORE, HELP, SAVE, RESTORE, QUIT, UNDO | **Required** | Minimum viable IF |
| Standard actions 18+ above core              | Recommended | Most stories need them |
| Combat / NPC actions                          | Optional | Only games that use them |
| Concealment actions (hiding / revealing)      | Optional |       |
| Capability-dispatchable physical actions (LOWER / RAISE / WAVE / TURN / SET) | Optional | Needed for story-specific puzzles |
| Event handlers / validators / chain handlers  | Recommended |       |
| `message.success/failure` shortcuts           | Recommended | Convenience for simple responses |

---

## Implementation Notes

**ADR-051 (Superseded by ADR-058, ADR-090, ADR-094)** — Original action-behavior pattern. Do not implement the superseded design; use the four-phase pattern as specified above.

**ADR-052 (Accepted)** — Event handlers for custom logic. World-model handlers react to emitted events and can mutate state.

**ADR-057 (Accepted)** — Before / after rules. Equivalent to before-action hooks (ADR-148) and after-action event handlers.

**ADR-058 (Accepted)** — The `report()` function. Splits event emission out of `execute()`. Together with `validate` and `blocked`, constitutes the canonical four-phase pattern.

**ADR-058x (Accepted)** — Atomic events. Events SHOULD capture state snapshots at emission time so handlers see deterministic payloads; later world mutations do not retroactively change event data.

**ADR-059 (Accepted)** — Action customisation boundaries. Actions customise via target traits (`hasTrait` / behaviour) or messages (`messageId`), not by subclassing.

**ADR-063 (Accepted)** — Sub-actions pattern. An action can delegate to another (e.g., `pick up` → `taking`). The engine runs the delegate's four phases; the caller composes the result.

**ADR-076 (Accepted)** — Scoring system. Award/revoke via `world.awardScore(id, points, description)`. The `if.action.scoring` action reads current score; handlers can award on event emission.

**ADR-085 (Accepted)** — Scoring refinement: per-treasure trophy-case pattern.

**ADR-090 (Accepted)** — Capability dispatch. The primary pattern for entity-centric verbs.

**ADR-094 (Accepted)** — Event chaining. Chain handlers produce follow-up events deterministically.

**ADR-104 (Partial)** — Implicit actions (inference + auto-take). Per-story and per-action opt-in.

**ADR-117 (Accepted)** — Disambiguation between event handlers and capability behaviors. See above.

**ADR-118 (Accepted)** — Stdlib action interceptors. Alternative to capability dispatch when the target should add side-effects rather than replace core logic.

**ADR-148 (Accepted)** — Before-action hooks. Engine-level listeners; see `05-engine.md`.

**Naming drift.** The reference implementation registers 49 action folders, of which some are meta-commands (`about`, `again`, `help`, `hints`, `inventory`, `quitting`, `restarting`, `restoring`, `saving`, `scoring`, `undoing`, `version`). The oft-quoted "43 standard actions" count omits some meta-commands. A conforming implementation MAY omit any meta-command the game does not need.

**Event field naming.** Reference code uses both `target`/`item` (short) and `targetId`/`itemId` (explicit) in event payloads. Preferred convention: `<role>Id` for identifiers (`actorId`, `targetId`, `itemId`, `containerId`, `recipientId`, `instrumentId`) and `<role>Name` for captured display names.

---

## Glossary (local)

- **Action** — A player-invocable operation with a unique ID and a four-phase implementation.
- **Four-phase contract** — `validate → execute → report → blocked` — the canonical action shape.
- **ActionContext** — The engine-supplied context object passed to every phase.
- **ValidationResult** — `validate` output; may carry data for later phases.
- **Message ID** — Namespaced string identifying a text template in the language layer.
- **Implicit take** — Engine-inserted TAKE before an action that requires holding the target.
- **Implicit inference** — Engine's attempt to pick a different target when a pronoun-resolved target fails requirements.
- **Capability dispatch** — Trait-claimed override of the default action logic (ADR-090).
- **Action interceptor** — Trait-claimed additive hook (ADR-118); does not replace the default logic.
- **Event handler** — World-level listener on a specific event type; reacts after emission.
- **Sub-action** — An action that delegates to another action (ADR-063).

A full glossary will be produced in Phase 8.

---

*End of 06-stdlib.md*
