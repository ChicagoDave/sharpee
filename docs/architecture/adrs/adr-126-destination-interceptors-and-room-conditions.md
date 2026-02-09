# ADR-126: Destination Interceptors for Room Entry Conditions

## Status: IMPLEMENTED

## Date: 2026-02-09

## Context

### The Problem

ADR-118 introduced action interceptors, allowing entities to hook into stdlib action phases via traits. This works well for most actions — the interceptor is registered on the entity that is the "direct object" of the action (the item being taken, the container being put into, the NPC being attacked).

However, ADR-118 has a blind spot for the **going action**. Going is unique among stdlib actions because it involves **two rooms**: the source (where the player is) and the destination (where the player is going). ADR-118 only checks interceptors on the source room. The destination room is never consulted.

This means rooms can say _"you can't leave me"_ (source interceptor) but NOT _"you can't enter me"_ (no mechanism).

### Motivating Example: Gas Room

In Mainframe Zork, the Gas Room contains flammable gas. Entering with an open flame (torch, candles) causes an explosion and death. The brass lantern (electric) is safe.

In Inform 7, this is trivially expressed:

```inform7
Before going to Gas Room when the player carries a lit flame:
    say "Oh dear. You seem to have let your flame get too close to the gas. **BOOOOOM**";
    end the story.
```

This is a **destination-scoped interceptor** on the going action. Sharpee has no equivalent.

### What ADR-118 Missed

ADR-118 modeled interceptors around a single entity per action — the "target" of the action. For most actions this is correct:

| Action    | Interceptor Entity | Why                                   |
| --------- | ------------------ | ------------------------------------- |
| TAKING    | The item           | Item controls whether it can be taken |
| ENTERING  | The container      | Container controls who can enter      |
| THROWING  | The target         | Target reacts to being hit            |
| ATTACKING | The NPC            | NPC handles combat                    |
| GOING     | Source room        | Room controls exits                   |

But **GOING** has a second relevant entity — the destination room — that should also participate. The Inform 7 model makes this explicit: `Before going to [Room]` and `Before going from [Room]` are distinct rule scopes. ADR-118 only implemented the `from` side.

### The Broader Pattern: Room Entry/Exit Conditions

The gas room is one instance of a general pattern. Other examples from IF tradition:

| Condition                | Type  | Trigger                |
| ------------------------ | ----- | ---------------------- |
| Gas room explosion       | Entry | Carrying open flame    |
| Vampire's lair           | Entry | Not carrying garlic    |
| Puzzle room lock         | Exit  | Haven't solved puzzle  |
| Current pulls downstream | Exit  | Not in a boat          |
| Sacred ground            | Entry | Carrying evil artifact |
| Weight-limited bridge    | Entry | Carrying too much      |

These are all **room-scoped conditions** that should fire when an entity enters or exits the room.

### Non-Going Movement Paths

Not all room entry goes through the going action. Story code has ~15 non-going movement paths that call `world.moveEntity()` directly:

- `bat-handler.ts` — bat kidnap (random room)
- `carousel-handler.ts` — carousel random destination
- `round-room-handler.ts` — round room random destination
- `balloon-handler.ts` — balloon travel
- `basket-elevator-behaviors.ts` — basket elevator
- `pray-action.ts` — prayer teleport to forest
- `inside-mirror-handler.ts` — mirror entry/exit
- `cake-handler.ts` — eat-me cake teleport
- `walk-through-action.ts` — walk through wall/door
- `endgame-trigger-handler.ts` — endgame transition
- `incant-action.ts` — magic word teleport
- `commanding-action.ts` — robot movement
- `puzzle-handler.ts` — royal puzzle teleport
- `launch-action.ts` — boat launch
- `melee-interceptor.ts` — combat knockback

These are all **authored movement paths** — the story author explicitly wrote the handler and knows the destination. They can handle room conditions directly in their handler logic. The going action covers the general case (player typing a direction); non-going paths are story-specific and handle their own concerns.

### Related: Location-Scoped Interceptors

A separate but related gap exists: rooms cannot intercept actions performed *within* them. For example, the gas room should also explode if the player lights a torch while already inside. This is Inform 7's `Before [action] in [Room]` pattern and is addressed separately in **ADR-127**.

---

## Decision

Add **destination interceptors** to the going action using a dedicated action ID: `if.action.entering_room`.

The going action will check interceptors on **both** the source room (`if.action.going`, existing) and the destination room (`if.action.entering_room`, new). The destination check runs after destination resolution but before the player moves.

### Action ID Separation

Source and destination interceptors use **different action IDs**:

| Interceptor | Action ID | Entity | Inform 7 Equivalent |
|---|---|---|---|
| Source (exit) | `if.action.going` | Room being left | `Before going from [Room]` |
| Destination (entry) | `if.action.entering_room` | Room being entered | `Before going to [Room]` |

This is cleaner than reusing the same ID because:
- A room can register both an exit interceptor and an entry interceptor without conflict
- No disambiguation flags needed in sharedData
- The registry key (`traitType:actionId`) uniquely identifies each interceptor
- Semantically distinct operations get distinct identifiers

### Why Not `moveEntity()`?

The previous assessment (Option A/E) proposed adding game logic to `WorldModel.moveEntity()` or `canMoveEntity()`. This is rejected because:

1. **`moveEntity()` is a spatial primitive.** It handles containment, loop detection, and open-container checks — all structural constraints. Room entry conditions are _game logic_ (flame detection, inventory checks, puzzle state). These belong at the action/handler layer, not the world-model layer.

2. **Rich consequences require rich context.** A `canMoveEntity() → boolean` can block a move but can't trigger death, emit messages, or redirect the player. Interceptors return `ValidationResult` with error codes, params, and can trigger effects in their `onBlocked` hook. The gas room doesn't just block entry — it kills you with a specific message.

3. **Context matters.** The same room entry might produce different messages depending on HOW the player entered. Walking into a gas room with a torch → explosion message. Bat drops you in gas room with a torch → different narrative framing. Interceptors receive the action context; `canMoveEntity()` doesn't.

4. **Consistency with ADR-118.** Interceptors are already the established pattern for entity-specific hooks into standard actions. Destination interceptors complete the model rather than introducing a parallel mechanism.

### Why Not a Movement Service?

A `MovementService` layer would catch all paths but requires migrating every `moveEntity()` caller. It's a high-cost, high-complexity solution that introduces a new architectural concept. The interceptor extension achieves the goal for the going action (the dominant path) without new concepts.

### Why Not `entity_moved` Events?

Post-move events work for consequences-after-entry (explosions, traps) but cannot _prevent_ entry. A room that requires a key can't use this — the player is already inside when the event fires. Interceptors handle both prevention and consequences in a unified model.

### Non-Going Paths: Author Responsibility

Non-going movement paths are authored code with explicit destinations. The author who writes `world.moveEntity(playerId, gasRoomId)` in a bat handler knows the destination and can handle conditions in the handler itself — either by excluding dangerous rooms from the destination list or by checking conditions inline. There is no need for a platform utility for what is inherently story-specific authored logic.

---

## Design

### Going Action: Two-Entity Interceptor Flow

```
VALIDATE PHASE
├── Extract direction
├── Vehicle check
├── Get source room
├── Lookup source interceptor: getInterceptorForAction(sourceRoom, GOING)
├── Source preValidate (can block exit)
├── Standard checks (exits, doors)
├── Resolve destination
├── Lookup destination interceptor: getInterceptorForAction(destination, ENTERING_ROOM)
├── Destination preValidate (can block entry)        ← NEW
├── Source postValidate
└── Destination postValidate                         ← NEW

EXECUTE PHASE
├── Move entity to destination
├── Source postExecute
└── Destination postExecute                          ← NEW

REPORT PHASE
├── Standard events (room description, contents)
├── Source postReport
└── Destination postReport                           ← NEW

BLOCKED PHASE
├── Destination onBlocked (if destination blocked)   ← NEW
└── Source onBlocked (if source blocked)
```

**Key points:**

- Destination `preValidate` runs AFTER the destination is resolved but BEFORE the player moves. This is the "Before going to Gas Room" hook.
- Destination `postExecute` runs AFTER the player has moved. This is the "After going to Gas Room" hook.
- Source interceptor hooks run in their current positions (no change to existing behavior).
- If BOTH source and destination have interceptors, both run. Source first for pre-hooks, destination first for blocked (since destination blocking is more specific).

### Interceptor Data

The `InterceptorSharedData` passed to destination interceptors includes:

```typescript
{
  direction: DirectionType,     // Direction of travel
  sourceRoomId: string,         // Where the player came from
  destinationRoomId: string,    // Where they're going (the interceptor's entity)
}
```

The destination interceptor receives the **destination room entity** as its first argument (matching the pattern: interceptor entity = the entity the interceptor is registered on).

### Registration

Story registers a trait + interceptor on the Gas Room:

```typescript
// Trait on the Gas Room entity
class GasRoomTrait extends Trait {
  static readonly type = 'dungeo.trait.gas_room';
  static readonly interceptors = ['if.action.entering_room'] as const;
}

// Interceptor implementation
const GasRoomEntryInterceptor: ActionInterceptor = {
  preValidate(entity, world, actorId, sharedData) {
    // entity = Gas Room (the destination)
    // actorId = player attempting to enter
    if (hasLitFlame(world, actorId)) {
      return {
        valid: false,
        error: 'dungeo.gas_room.explosion',
        params: { type: 'enter' },
      };
    }
    return null; // Safe to enter
  },

  onBlocked(entity, world, actorId, error, sharedData) {
    if (error === 'dungeo.gas_room.explosion') {
      killPlayer(world, actorId);
      return [
        createEffect('dungeo.gas.explosion_death', {
          messageId: GasExplosionMessages.DEATH,
        }),
      ];
    }
    return null;
  },
};

// Registration in story's initializeWorld()
registerActionInterceptor(
  GasRoomTrait.type,
  'if.action.entering_room',
  GasRoomEntryInterceptor
);
```

### Exit Conditions (Symmetric)

Exit conditions already work via ADR-118's source-room interceptor (`if.action.going`). The troll blocking passage is an example. A more explicit exit condition:

```typescript
const RiverCurrentInterceptor: ActionInterceptor = {
  preValidate(entity, world, actorId, sharedData) {
    // entity = source room (river room)
    const vehicle = getPlayerVehicle(world, actorId);
    if (!vehicle) {
      return {
        valid: false,
        error: 'dungeo.river.current_blocks',
        params: {},
      };
    }
    return null; // In a boat, can leave
  },
};

// Registered on if.action.going (source room interceptor)
registerActionInterceptor(
  RiverRoomTrait.type,
  'if.action.going',
  RiverCurrentInterceptor
);
```

No new mechanism needed for exit conditions.

---

## Consequences

### Positive

- **Completes the interceptor model.** Rooms can now intercept both entry (`if.action.entering_room`) and exit (`if.action.going`) via the same mechanism. No new architectural concepts.
- **Matches Inform 7 semantics.** `Before going to [Room]` maps directly to destination `preValidate`. `After going to [Room]` maps to destination `postExecute`.
- **Rich consequences.** Interceptors can block, redirect, kill, or emit custom messages. The gas room blocks with death; a locked room blocks with "you need the key"; a sacred room blocks with narrative text.
- **No world-model changes.** Everything stays in stdlib and story code.
- **Backward compatible.** Existing source-room interceptors (troll blocking) continue to work unchanged.
- **Clean action ID separation.** Source and destination interceptors are independently registerable and don't conflict.

### Negative

- **Going action becomes slightly more complex.** Two interceptor lookups instead of one, using different action IDs. The code change is small (~20 lines).
- **Non-going paths not covered automatically.** Authored movement handlers must handle room conditions in their own logic. This is by design — these paths have explicit destinations and author-controlled context.

### Neutral

- **Performance.** One extra `getInterceptorForAction()` call per going action. This is a trait map lookup — negligible cost.

---

## Coverage Analysis

| Movement Path             | Checks Entry Conditions? | How                                                |
| ------------------------- | ------------------------ | -------------------------------------------------- |
| `go north` (going action) | **Yes**                  | Automatic (destination interceptor in going action) |
| Bat kidnap                | Author's choice          | Exclude dangerous rooms from destination list, or check inline |
| Basket elevator           | Author's choice          | Fixed destinations, author controls |
| Carousel spin             | Author's choice          | Handler picks destinations, can exclude |
| Balloon travel            | Author's choice          | Fixed destinations |
| Prayer teleport           | Author's choice          | Fixed destination (forest) |
| `$teleport` (testing)     | **No** (intentional)     | Uses `AuthorModel`, bypasses all validation |
| Save/restore              | **No** (intentional)     | Uses `AuthorModel`, restores prior state |

---

## Relationship to Previous Assessment

The earlier assessment (`docs/work/platform/room-exit-entrance-conditions.md`) evaluated five options:

| Previous Option                         | Verdict              | Reason                                                           |
| --------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| A: `moveEntity()` hooks                 | Rejected             | Mixes game logic into spatial primitive                          |
| B: Destination interceptor (going only) | **Adopted**          | Core of this ADR                                                 |
| C: Movement service                     | Rejected             | Over-engineered, new concept, migration cost                     |
| D: `entity_moved` events                | Rejected as primary  | Can't prevent entry; useful as supplement for post-entry effects |
| E: `canMoveEntity()` extension          | Rejected             | Same concern-mixing as Option A, poor consequence reporting      |

The key insight: **this isn't a new mechanism — it's completing ADR-118.** The interceptor model already handles everything needed. The destination room was simply overlooked because ADR-118 focused on "direct object" entities and didn't consider that GOING has two relevant entities.

---

## Implementation Plan

### Phase 1: Going Action Destination Interceptor

1. Define `if.action.entering_room` constant in stdlib
2. Modify `going.ts` validate phase: after destination resolution (~line 239), look up `getInterceptorForAction(destination, 'if.action.entering_room')` and run `preValidate`/`postValidate`
3. Modify execute phase: run destination `postExecute` after source `postExecute`
4. Modify report phase: run destination `postReport` after source `postReport`
5. Modify blocked phase: run destination `onBlocked` if the destination interceptor blocked

### Phase 2: Gas Room Implementation

1. Create `GasRoomTrait` with `if.action.entering_room` interceptor registration
2. Implement `GasRoomEntryInterceptor` with flame detection in `preValidate` and death in `onBlocked`
3. Remove the defunct `gas-room-handler.ts` transformer
4. Verify with gas-room-explosion.transcript and gas-room-safe-lantern.transcript
5. Run full walkthrough chain for regression check

---

## Related ADRs

- **ADR-118**: Stdlib Action Interceptors (foundation — this ADR extends it)
- **ADR-127**: Location-Scoped Interceptors (rooms intercepting actions performed within them — future)
- **ADR-090**: Entity-Centric Action Dispatch (capability behaviors)
- **ADR-117**: Eliminate Broad Use of Event Handlers
- **Previous assessment**: `docs/work/platform/room-exit-entrance-conditions.md`
