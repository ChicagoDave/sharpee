# Room Entry/Exit Conditions — Assessment (SUPERSEDED)

> **Superseded by [ADR-126](../../architecture/adrs/adr-126-destination-interceptors-and-room-conditions.md)** — Destination Interceptors and Room Entry/Exit Conditions. The ADR chooses a refined version of Option B (extending ADR-118's interceptor model) rather than the original Option E recommendation.

**Problem**: The gas room in Dungeo needs to kill the player when they enter carrying an open flame. Currently there is no mechanism for a room to declare entry preconditions that are checked regardless of how the entity arrives.

**Motivating Example**: Gas Room explosion — any entity (player, NPC) entering the Gas Room with a lit flame source should trigger an explosion. This applies whether they walk in (`go down`), teleport via magic, get carried by a bat, ride an elevator, or any other mechanism.

---

## Current State

### How Entities Enter Rooms

Every room entry ultimately calls one of two methods:

| Method | File | Validates? | Used By |
|--------|------|-----------|---------|
| `WorldModel.moveEntity()` | world-model/WorldModel.ts:530 | Yes (containment, loops, open containers) | Going action, bat kidnap, basket elevator, balloon exit, boat launch |
| `AuthorModel.moveEntity()` | world-model/AuthorModel.ts:147 | No (bypasses all checks) | $teleport, $take, $move, world setup, save/restore |

### Existing Interceptor Pattern (ADR-118)

The going action already supports interceptors via `getInterceptorForAction()`. These are trait-based: a trait on an entity registers an interceptor for a specific action. Hooks: `preValidate`, `postValidate`, `postExecute`, `postReport`, `onBlocked`.

**Limitation**: The going action only checks interceptors on the **source room** (the room the player is leaving). The destination room is never checked. And the interceptor is specific to the going action — other movement paths (bat, elevator, teleport) don't invoke it.

### Platform Events

`WorldModel.moveEntity()` emits a platform event `entity_moved` after the move completes. This is a notification, not a validation gate.

---

## Options

### Option A: Room Entry Hooks on `WorldModel.moveEntity()`

Add a hook system to `WorldModel.moveEntity()` that checks the destination entity for entry conditions before completing the move.

**Mechanism**:
- New trait: `RoomConditionTrait` (or extend `RoomTrait`) with optional `entryCondition` and `exitCondition` callbacks
- `moveEntity()` checks: if target entity has a room condition trait, call `canEnter(entityId, world)` before moving
- If `canEnter` returns false, `moveEntity()` returns false (move blocked)
- The condition callback receives the moving entity ID and the world, so it can inspect inventory, state, etc.

**Pros**:
- Catches ALL movement paths: going, teleport, bat, elevator, everything
- Single enforcement point — impossible to bypass accidentally
- Consistent with how `canMoveEntity()` already checks container constraints

**Cons**:
- `moveEntity()` is a low-level spatial mutation — adding game logic here mixes concerns
- Callbacks on traits introduce coupling between world-model and game logic
- `AuthorModel.moveEntity()` intentionally bypasses validation; should it bypass room conditions too?
- The condition callback needs to produce a message/event for the blocked case, but `moveEntity()` currently just returns `boolean` — no place for rich error reporting
- Doesn't distinguish between "blocked silently" and "blocked with death" — the gas room doesn't just block entry, it kills you

**Complexity**: Medium (world-model change)

### Option B: Destination Room Interceptor on Going Action

Extend the going action to also check interceptors on the **destination room**, not just the source room. Other movement paths (elevator, bat, etc.) would need similar checks.

**Mechanism**:
- After destination is resolved in `going.ts` validate phase (~line 239), call `getInterceptorForAction(destination, IFActions.GOING)`
- If found, run `preValidate` on the destination interceptor
- Story creates a trait on the Gas Room that registers an interceptor for `if.action.going` with a `preValidate` that checks for flame

**Pros**:
- Uses existing interceptor pattern (ADR-118)
- No world-model changes needed — stdlib only
- Rich error reporting through interceptor result (error message, params)
- Interceptor can trigger death (via blocked effects) or just block

**Cons**:
- Only covers the going action — bat kidnap, elevator, teleport don't check
- Each alternative movement path would need its own interceptor check (fragile, easy to miss)
- Doesn't address the user's core concern: "What if the author uses magic to teleport the PC?"

**Complexity**: Low (stdlib change only, but incomplete)

### Option C: Movement Service Layer

Introduce a `MovementService` that sits between actions/handlers and `WorldModel.moveEntity()`. All movement goes through the service, which checks room conditions.

**Mechanism**:
- New service registered on the world: `if.service.movement`
- API: `movementService.moveEntityToRoom(entityId, roomId, options?)` — returns `{ success, blockedReason?, effects? }`
- Internally calls registered room condition checks, then delegates to `WorldModel.moveEntity()`
- All movement paths (going action, bat handler, elevator, etc.) call the service instead of `moveEntity()` directly
- $teleport and AuthorModel bypass the service (intentional)

**Pros**:
- Single enforcement point for game-level movement rules
- Clean separation: WorldModel handles spatial data, MovementService handles game rules
- Rich return type with effects (death events, messages)
- Story-level room conditions register with the service, not with traits
- Can handle both entry AND exit conditions
- AuthorModel still bypasses (correct for testing/setup)

**Cons**:
- Requires updating every caller of `moveEntity()` to go through the service instead
- New architectural concept — adds complexity to the platform
- Callers that forget to use the service would bypass conditions (same risk as any service pattern)
- Need to define service registration and lifecycle

**Complexity**: High (new platform concept, migration of callers)

### Option D: Event-Driven with `entity_moved` Platform Event

Use the existing `entity_moved` platform event that `moveEntity()` already emits. Register a listener that checks room conditions after the move and triggers consequences.

**Mechanism**:
- Register a platform event listener for `entity_moved`
- Listener checks: if destination is a room with conditions, evaluate them
- If condition fails (e.g., flame in gas room), trigger the consequence (death)
- The move has already happened — this is reactive, not preventive

**Pros**:
- No changes to moveEntity() or any action
- Catches ALL movement paths (moveEntity already emits the event)
- Very simple to implement
- Works for consequences that happen AFTER entry (explosions, traps, environmental damage)

**Cons**:
- Cannot PREVENT entry — the entity is already in the room when the listener fires
- For the gas room specifically, this is fine (you enter and die), but for rooms that should block entry entirely (e.g., "you can't enter without a key"), this doesn't work
- `AuthorModel.moveEntity()` does NOT emit platform events — teleport and setup bypass this
- The listener fires for ALL moves (items being placed in rooms, etc.), needs filtering

**Complexity**: Low (story-level only, no platform changes)

### Option E: Room Trait with Condition Callbacks + `canMoveEntity()` Extension

Extend the existing `canMoveEntity()` validation in WorldModel to check room-level conditions. This is similar to Option A but scoped to the existing validation gate.

**Mechanism**:
- New optional field on `RoomTrait`: `entryConditions: RoomCondition[]` and `exitConditions: RoomCondition[]`
- `RoomCondition` is a registered callback: `(entityId: string, world: IWorldModel) => { allowed: boolean; reason?: string }`
- `canMoveEntity()` checks: if target has RoomTrait with entryConditions, evaluate all of them
- `moveEntity()` already calls `canMoveEntity()` — conditions are automatically enforced
- For the gas room: register an entry condition that checks if the entity carries a lit flame
- Death/consequence handling: a separate listener reacts to `move_entity_failed` platform event when reason matches

**Pros**:
- Uses the existing validation gate — `canMoveEntity()` → `moveEntity()` pattern is established
- Catches all `WorldModel.moveEntity()` calls automatically
- AuthorModel still bypasses (correct)
- Clean: RoomTrait owns the data, conditions are evaluated in the validation path
- Can both BLOCK entry and trigger consequences (via failed-move listener)

**Cons**:
- Callbacks stored on traits are not serializable — must be re-registered on load (same as interceptors and capability behaviors, which already have this pattern)
- `canMoveEntity()` currently returns boolean; extending to carry reason/message needs care
- The "consequence" (death) is separated from the "condition check" — two pieces to coordinate
- Mixing game logic (flame detection) into world-model validation

**Complexity**: Medium (world-model change, but fits existing patterns)

---

## Recommendation

**Option E** (RoomTrait conditions via `canMoveEntity()`) is the best fit for Sharpee because:

1. **It catches all game-level movement** — any code calling `WorldModel.moveEntity()` automatically checks conditions. Bat kidnaps, elevator rides, boat launches all go through this.
2. **AuthorModel bypasses correctly** — testing commands and world setup skip validation, as they should.
3. **It extends an existing pattern** — `canMoveEntity()` already validates containment and openability. Room conditions are the same concept.
4. **Callback registration matches Sharpee's architecture** — interceptors and capability behaviors are already registered callbacks that must be re-registered on load. This is the same pattern.
5. **Entry AND exit conditions** — supports both "can't enter without X" and "can't leave without Y" in one mechanism.

**Option D** (event-driven) is the runner-up for cases where you only need post-entry consequences (like the gas room explosion). It's the simplest approach and requires zero platform changes. But it can't block entry, which limits its usefulness for other puzzles.

A hybrid approach is also viable: implement Option E for the general mechanism, but for the gas room specifically, Option D might be sufficient since the gas room doesn't block entry — it kills you for entering.

---

## Open Questions

1. Should `canMoveEntity()` return a richer result than `boolean`? E.g., `{ allowed: boolean; reason?: string; conditionId?: string }` — this enables the failed-move listener to know WHY the move was blocked.
2. Should room conditions be on RoomTrait directly, or on a separate `RoomConditionTrait`? Separate trait is cleaner but adds another trait type.
3. How should the death/consequence be triggered? Options: (a) the condition callback itself triggers death, (b) a separate listener reacts to the blocked move, (c) the condition returns effects to emit.
4. Should exit conditions work the same way? "You can't leave the cage room" or "the current pulls you downstream" are exit conditions.
5. For NPC movement: should NPCs respect room conditions? The bat carrying you into a gas room with a torch would need to check. But the bat itself doesn't carry a torch — the player does.
