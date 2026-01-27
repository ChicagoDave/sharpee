# Handler Mutation Assessment

**Created**: 2026-01-27
**Status**: Assessment Complete — Migration Needed
**Context**: Previous session (2026-01-26) declared migration "complete" after migrating 3 handlers to interceptors. This assessment reveals that 6 regular event handlers still contain direct mutations, violating the architectural rule that only daemons and NPCs may mutate world state.

## The Rule

> Handlers must not mutate world state. Only daemons and NPCs are exempt.

Event handlers should react to events and return effects. They should not call `world.moveEntity()`, `world.removeEntity()`, `world.createEntity()`, `world.setStateValue()`, or directly assign trait properties.

## Full Handler Inventory

### Daemons (Mutations Allowed) — 8 handlers

These are registered via `scheduler.registerDaemon()` and run turn-based logic. Mutations are architecturally expected.

| Handler | Mutations | Notes |
|---------|-----------|-------|
| `bat-handler.ts` | moveEntity, setStateValue | Moves player to random room on turn tick |
| `endgame-trigger-handler.ts` | moveEntity, setStateValue (7x) | Counts turns in crypt, triggers endgame |
| `round-room-handler.ts` | moveEntity, setStateValue | Randomizes exit destination per turn |
| `trapdoor-handler.ts` | trait props, delete exits, setStateValue | Auto-closes trapdoor after player descends |
| `royal-puzzle/puzzle-handler.ts` | moveEntity, puzzle state | Sliding room puzzle state machine |
| `exorcism-handler.ts` | trait props, unblockExit, setStateValue | Daemon checks ritual completion per turn |
| `inside-mirror-handler.ts` | setStateValue, exits, moveEntity | Helper functions called from actions; daemon manages feedback |
| `endgame-laser-handler.ts` | setStateValue (6x) | **Hybrid** — see below |

**Note on `endgame-laser-handler.ts`**: This is registered as both event handlers (`if.event.dropped`, `if.event.pushed`) AND a daemon. The event handler portions do `setStateValue()` mutations for puzzle state (laser active, button pressed). These are state-flag-only mutations (no entity movement or trait changes), so the violation is mild, but the event handler portions ideally should not mutate.

**Note on `trapdoor-handler.ts`**: Uses dangerous direct trait mutation (`openable.isOpen = false`, `identity.description = ...`) instead of world APIs. Should be cleaned up even though daemons are exempt from the no-mutation rule — direct trait assignment bypasses any future change tracking.

**Note on `exorcism-handler.ts`**: The event handler portions (`if.event.read`, `if.event.switched_on`, `game.message`) only do `setStateValue()` to track ritual steps. The actual mutations (unblockExit, trait props) happen in the daemon's `completeExorcism()` function. This is correctly structured — event handlers track, daemon mutates.

### Already Migrated to Interceptors — 3 handlers

| Handler | Interceptor | Status |
|---------|-------------|--------|
| `boat-puncture-handler.ts` | `InflatableEnteringInterceptor` | Handler deleted, interceptor active |
| `glacier-handler.ts` | `GlacierThrowingInterceptor` | Handler deleted, interceptor active |
| `balloon-handler.ts` (PUT portion) | `ReceptaclePuttingInterceptor` | PUT handler removed, burn daemon + exit transformer remain |

### Non-Mutating Handlers — No action needed

| Handler | Type | Notes |
|---------|------|-------|
| `mirror-room-handler.ts` | Event handler | Returns effects only, no mutations |
| `death-penalty-handler.ts` | Event handler | Returns effects only |
| `rainbow-handler.ts` | Command transformer | Read-only |
| `falls-death-handler.ts` | Command transformer | Read-only |
| `chimney-handler.ts` | Command transformer | Read-only |
| `grue-handler.ts` | Command transformer | Read-only |
| `reality-altered-handler.ts` | Event handler | Read-only |
| `victory-handler.ts` | Event handler | Read-only |
| `basket-handler.ts` | Exports helpers | No direct invocation |

### **VIOLATING: Regular Handlers With Mutations — 6 handlers**

These are event handlers (not daemons, not NPCs) that directly mutate world state. Each needs a migration strategy.

---

## Violation Details

### 1. `coal-machine-handler.ts`

**Registered as**: Event handler on `if.event.switched_on`
**Trigger**: Player turns on the machine switch while coal is inside
**Mutations**:
- `world.removeEntity(coalId)` — destroys coal
- `world.createEntity('huge diamond', ...)` — creates treasure
- Adds `IdentityTrait`, `TreasureTrait` to diamond
- `world.moveEntity(diamond.id, roomId)` — places diamond
- `world.setStateValue()` x2 — tracking flags

**Game logic**: Coal→diamond transformation puzzle. Single entity (machine), single action (SWITCH ON).

**Migration path**: **Interceptor on SWITCHING_ON action**. Create `CoalMachineTrait` on the machine. `SwitchingOnInterceptor` checks for coal inside, transforms in `postExecute`.

**Complexity**: Medium — entity creation/destruction in interceptor is new pattern, but architecturally clean.

---

### 2. `ghost-ritual-handler.ts`

**Registered as**: Event handler on `if.event.dropped`
**Trigger**: Player drops frame piece in Basin Room while incense is burning
**Mutations**:
- `world.removeEntity(framePieceId)` — consumes frame piece
- `createThiefsCanvas(world)` — creates treasure entity
- `world.moveEntity(canvas.id, galleryId)` — places canvas in Gallery
- `world.setStateValue()` x2 — completion flags

**Game logic**: Ghost appears, frame piece consumed, canvas spawns in Gallery. Single action (DROP), specific location + item combo.

**Migration path**: **Interceptor on DROPPING action**. Create `GhostRitualTrait` on the Basin Room (or frame piece). `DroppingInterceptor` checks location + item + incense state, transforms in `postExecute`.

**Complexity**: Medium — needs DROPPING action interceptor support (not yet implemented).

---

### 3. `dam-handler.ts`

**Registered as**: Event handler on custom events `dungeo.dam.opened` / `dungeo.dam.closed`
**Trigger**: Dam bolt is turned, emitting custom domain events
**Mutations**:
- `RoomBehavior.blockExit()` x4 — blocks reservoir room exits
- `RoomBehavior.unblockExit()` x4 — unblocks reservoir room exits
- `identity.description = ...` x6 — updates room descriptions for flooded/drained state

**Game logic**: When dam opens/closes, 4 reservoir rooms change accessibility and descriptions.

**Migration path**: This is the hardest case. It reacts to custom domain events (not stdlib action events) and coordinates 4 rooms. Options:
- **Option A**: Move mutations into the dam's TURNING capability behavior (the bolt turn that emits the events should also do the room updates).
- **Option B**: Keep as handler but return effects instead of mutating directly. Requires an effect type that can block/unblock exits and update descriptions.
- **Option C**: Convert to daemon that watches dam state and applies room changes.

**Recommended**: **Option A** — the bolt-turning behavior already knows the dam state. It should own the downstream room mutations rather than emitting events for a separate handler to mutate.

**Complexity**: High — touches 4 rooms, needs coordination with existing bolt-turning behavior.

---

### 4. `river-handler.ts`

**Registered as**: Event handler on `if.event.actor_moved` + command transformer
**Trigger**: Player moves while in boat on river
**Mutations**:
- `world.moveEntity(boat.id, newRoom)` — moves boat to follow player
- `world.moveEntity(player.id, boat.id)` — re-seats player in boat

**Game logic**: Boat follows player through river rooms. Command transformer blocks entering water without boat.

**Migration path**: **Interceptor on GOING action**. Create `WatercraftFollowTrait` on the boat. `GoingInterceptor` in `postExecute` moves the boat to follow the player when navigating river rooms. The command transformer can remain (it's read-only, just redirects commands).

**Complexity**: Low-Medium — GOING already has interceptor support. Need to check for conflicts with existing `InflatableEnteringInterceptor` (boat puncture). May need interceptor chaining or a combined boat interceptor.

---

### 5. `tiny-room-handler.ts`

**Registered as**: Not actually registered as event handler — exports helper functions and command transformers
**Trigger**: Called directly from story actions (PUT MAT, PUSH KEY, PULL MAT, UNLOCK)
**Mutations**:
- `doorTrait.matUnderDoor = true/false` — trait property
- `world.moveEntity(mat.id, ...)` x3 — moves mat/key
- `matTrait.isUnderDoor = true/false` — trait property
- `doorTrait.keyInLock = false` — trait property
- `doorTrait.keyOnMat = true/false` — trait property
- `keyTrait.isHidden = false` — trait property
- `lockable.isLocked = false` — trait property

**Game logic**: Classic key-under-door puzzle. Multi-step: put mat → push key → pull mat → unlock.

**Migration path**: This is misclassified as a "handler" — it's a **utility module** with helper functions called from story-specific actions. The mutations are the correct behavior for those actions. However, the mutations should live in the **actions themselves** or in **capability behaviors**, not in a shared utility.

**Recommended**: Refactor so each story action (PUT MAT UNDER DOOR, PUSH KEY WITH SCREWDRIVER, PULL MAT) owns its own mutations in its execute phase, rather than delegating to a utility function. The command transformers are fine as-is.

**Complexity**: Medium — 4 separate puzzle steps, each with its own mutations.

---

### 6. `balloon-handler.ts` (remaining portions)

**Registered as**: Daemon (burn timer) + command transformer (exit) + story action (balloon exit)
**PUT handling**: Already migrated to `ReceptaclePuttingInterceptor` ✅
**Remaining mutations**:
- Burn daemon: `burnable.burnTurnsRemaining--`, `burnable.isBurning = false`, `burnable.burnedOut = true`, `balloonState.burningObject = null`, `world.setStateValue()` x2, `inflatableTrait.isInflated = false`, `identity.description = ...`
- Exit action: `world.moveEntity(player.id, destination)` — moves player out of balloon

**Migration path**: The burn daemon is correctly a daemon — mutations allowed. The exit action (`balloonExitAction`) is a story-specific action — mutations in `execute` are correct. **No further migration needed.** The previous session correctly identified this.

**Status**: ✅ Already correct. Burn daemon = daemon (exempt). Exit action = action (mutations in execute are fine).

---

## Summary

| Handler | Violation | Migration Strategy | Complexity | New Interceptor Action Needed? |
|---------|-----------|-------------------|------------|-------------------------------|
| `coal-machine-handler` | Entity lifecycle + state | Interceptor (SWITCHING_ON) | Medium | Yes — SWITCHING_ON |
| `ghost-ritual-handler` | Entity lifecycle + state | Interceptor (DROPPING) | Medium | Yes — DROPPING |
| `dam-handler` | Exit blocking + descriptions | Move to bolt-turning behavior | High | No |
| `river-handler` | Entity movement | Interceptor (GOING) | Low-Med | No — GOING supported |
| `tiny-room-handler` | Trait props + movement | Move mutations into story actions | Medium | No |
| `balloon-handler` | (remaining = daemon + action) | **None — already correct** | — | — |

**Actual violations requiring migration: 5** (not 6 — balloon is clean)

### New Stdlib Interceptor Support Needed

Two actions need interceptor hook support added before migration:
1. **SWITCHING_ON** — for coal machine
2. **DROPPING** — for ghost ritual

GOING, THROWING, PUTTING, PUSHING already have interceptor support.

### Priority Order

1. **`river-handler`** — simplest, GOING interceptor already supported
2. **`coal-machine-handler`** — clear entity+action pattern, needs SWITCHING_ON hooks
3. **`ghost-ritual-handler`** — clear entity+action pattern, needs DROPPING hooks
4. **`tiny-room-handler`** — refactor utility into action execute phases
5. **`dam-handler`** — most complex, architectural decision needed

### Daemon Cleanup (Separate Track)

Not violations, but quality improvements:
- `trapdoor-handler.ts` — replace direct trait assignment with world APIs
- `exorcism-handler.ts` — replace direct trait assignment with world APIs
- `endgame-laser-handler.ts` — consider moving event handler mutations into daemon
