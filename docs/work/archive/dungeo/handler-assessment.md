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

### ~~1. `coal-machine-handler.ts`~~ — NEVER EXISTED

**Status**: ✅ No violation. The coal→diamond puzzle was implemented as a story-specific action (`turn-switch-action.ts`) with proper four-phase pattern. All mutations happen in `execute`. No event handler was ever created for this. Assessment entry was incorrect.

---

### ~~2. `ghost-ritual-handler.ts`~~ — ALREADY MIGRATED

**Status**: ✅ Interceptor replacement (`ghost-ritual-dropping-interceptor.ts`) already exists and is registered. `registerGhostRitualHandler()` is exported but never called — dead code. Handler file can be deleted.

---

### ~~3. `dam-handler.ts`~~ — MIGRATED

**Status**: ✅ Completed 2026-01-27. Handler deleted, mutations moved into `turn-bolt-action.ts` execute phase. See `docs/context/session-20260127-2055-main.md`.

---

### ~~4. `river-handler.ts`~~ — MIGRATED

**Status**: ✅ Completed 2026-01-27. `registerBoatMovementHandler()` was dead code — the stdlib GOING action already handles vehicle movement natively (line 302-303 of `going.ts`). The function was exported but never called. Deleted the dead function and unused imports. Command transformer (read-only, not a violation) remains.

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
| ~~`coal-machine-handler`~~ | ~~Entity lifecycle + state~~ | ~~Interceptor (SWITCHING_ON)~~ | ✅ NEVER EXISTED (was story action) | — |
| ~~`ghost-ritual-handler`~~ | ~~Entity lifecycle + state~~ | ~~Interceptor (DROPPING)~~ | ✅ ALREADY MIGRATED (interceptor active) | — |
| ~~`dam-handler`~~ | ~~Exit blocking + descriptions~~ | ~~Move to bolt-turning behavior~~ | ✅ MIGRATED | — |
| ~~`river-handler`~~ | ~~Entity movement~~ | ~~Interceptor (GOING)~~ | ✅ MIGRATED (dead code) | — |
| `tiny-room-handler` | Trait props + movement | Move mutations into story actions | Medium | No |
| `balloon-handler` | (remaining = daemon + action) | **None — already correct** | — | — |

**Actual violations requiring migration: 1** (dam-handler migrated, river-handler was dead code, coal-machine-handler never existed, ghost-ritual already had interceptor, balloon was already clean). Only `tiny-room-handler` remains.

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
5. ~~**`dam-handler`**~~ — ✅ MIGRATED 2026-01-27

### Daemon Cleanup (Separate Track)

Not violations, but quality improvements:
- `trapdoor-handler.ts` — replace direct trait assignment with world APIs
- `exorcism-handler.ts` — replace direct trait assignment with world APIs
- `endgame-laser-handler.ts` — consider moving event handler mutations into daemon
