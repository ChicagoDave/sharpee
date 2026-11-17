# Critical Assessment: EntityEventHandler Implementation

**Date**: 2025-12-28
**Reviewer**: Claude (as IF platform designer)
**Scope**: Entity event handler system, WorldModel integration, GameEngine dispatch

---

## Executive Summary

The current entity event handler implementation is a **tactical fix masquerading as architecture**. While it solved the immediate troll combat/scoring bug, it introduced inconsistencies and exposed fundamental design tensions that will compound as the system grows.

**Verdict**: Functional but fragile. Needs consolidation before adding more handler-dependent features.

---

## Critical Issues

### 1. Two Competing Dispatch Mechanisms

The system has **two different ways** to dispatch entity handlers:

| Location | Method | Semantics |
|----------|--------|-----------|
| `EventProcessor.invokeEntityHandlers()` | Target-only | Only calls handler on `event.entities.target` |
| `GameEngine.dispatchEntityHandlers()` | Broadcast | Iterates ALL entities, calls any matching handler |

**Problem**: These are fundamentally different event models:
- **Target-only** = "Notify the affected entity"
- **Broadcast** = "Notify everyone who cares"

The codebase currently uses target-only for action events (via EventProcessor) and broadcast for NPC/scheduler events (via GameEngine). This isn't documented and will confuse future contributors.

**Example of confusion**: If an entity wants to react to *any* death in the room (not just its own death), which mechanism supports that? Answer: Only GameEngine's broadcast, but that's only used for NPC/scheduler events.

### 2. Type Safety Erosion

```typescript
// GameEngine line 1413
const handlers = (entity as any).on;
```

The engine bypasses TypeScript to access handlers. This means:
- No compile-time checking that handlers exist
- No IDE autocomplete for handler registration
- Runtime errors instead of compile errors

Compare to EventProcessor which uses proper typing:
```typescript
if (target.on && target.on[event.type]) {
```

### 3. Handler Signature Inconsistency

Two handler types exist with different capabilities:

```typescript
type EntityEventHandler = (event: IGameEvent, world: WorldModel) => void | ISemanticEvent[];
type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];
```

**Story-level handlers get `SimpleEventHandler`** (no world access), while entity handlers get `EntityEventHandler` (full world access).

This is backwards. Story-level daemons and global event listeners are *more likely* to need world access for game-wide effects like:
- Global timers
- Score tracking
- Achievement systems
- Day/night cycles

The current split was a quick fix to avoid breaking the EventEmitter, not a principled design decision.

### 4. WorldModel as God Object

Passing the entire `WorldModel` to handlers gives them unlimited power:

```typescript
'if.event.death': (event, world) => {
  // Handler can do ANYTHING:
  world.moveEntity(anyId, anywhere);
  world.removeEntity(anyId);
  world.getCapability(anything);
  // No scoping, no permissions, no audit trail
}
```

**Problems**:
- Handlers can corrupt world state
- No way to restrict what a handler can access
- Testing handlers requires mocking entire WorldModel
- No transactional semantics (partial failures leave inconsistent state)

A mature IF platform would provide a scoped context:
```typescript
// Better design (not current)
'if.event.death': (event, context) => {
  context.addScore(10);  // Allowed
  context.unblockExit(Direction.EAST);  // Allowed
  context.world.removeEntity(playerId);  // Would throw - not permitted
}
```

### 5. No Handler Lifecycle Management

Current implementation has no:
- **Registration API**: Handlers are set directly on entities via `entity.on = {...}`
- **Priority ordering**: Can't control which handler runs first
- **Cancellation**: No way to prevent default behavior or stop propagation
- **One-time handlers**: Must implement manually (see `createOnceHandler` helper)

Compare to DOM events which have `addEventListener`, `removeEventListener`, `stopPropagation`, `preventDefault`, and capture/bubble phases.

### 6. Silent Failures

```typescript
} catch (error) {
  console.error(`Entity handler error for ${event.type} on ${target.id}:`, error);
}
// Processing continues
```

Handler errors are logged and swallowed. This means:
- Bugs in handlers are easy to miss
- No way to mark a turn as failed
- Partial state changes from failed handlers persist

### 7. Synchronous-Only Execution

```typescript
const handlerResult = target.on[event.type](gameEvent, this.world);
```

No async support. This prevents:
- Handlers that need to fetch external data
- Handlers with deliberate delays (for dramatic effect)
- Handlers that spawn background work

### 8. Mutation During Iteration Risk

GameEngine's dispatch iterates all entities:
```typescript
const entities = this.world.getAllEntities();
for (const entity of entities) {
  // Handler runs and might add/remove entities
}
```

If a handler adds or removes entities from the world, behavior is undefined. The `getAllEntities()` likely returns a snapshot, but this isn't guaranteed or documented.

---

## Architectural Debt Incurred

### Debt from This Fix

1. **SimpleEventHandler exists only because EventEmitter wasn't updated** - Technical debt to avoid a larger refactor
2. **Comment explaining removed dispatch** - The "NOTE" at line 509 explains why code was removed rather than the code explaining itself
3. **Duplicate capability** - Both EventProcessor and GameEngine can dispatch to handlers, for different event sources

### Pre-existing Debt Exposed

1. **No clear event flow documentation** - Which events go through EventProcessor? Which through GameEngine directly?
2. **Entity.on is optional and untyped** - Added via `(entity as any).on = {...}` in story code
3. **IGameEvent vs ISemanticEvent confusion** - Why do we need both? Handler receives IGameEvent but returns ISemanticEvent[]

---

## Recommendations

### Immediate (Before More Handler-Dependent Features)

1. **Consolidate dispatch to one location** - Either EventProcessor owns all dispatch, or GameEngine does. Not both.

2. **Document the event flow** - Add an ADR explaining:
   - What events exist
   - Which path they take (action → EventProcessor vs scheduler → GameEngine)
   - When handlers are called
   - What handlers can/cannot do

3. **Add handler typing to IFEntity** - Make `on` a first-class typed property, not an any-cast addon

### Medium-term (Next Major Feature)

4. **Create HandlerContext instead of passing WorldModel**
   ```typescript
   interface HandlerContext {
     readonly event: IGameEvent;
     readonly actor: IFEntity;
     readonly target: IFEntity;
     addScore(points: number, reason: string): void;
     emitMessage(messageId: string, params?: object): void;
     // Scoped mutations only
   }
   ```

5. **Unify SimpleEventHandler and EntityEventHandler** - Story handlers should get context too

6. **Add handler registration API**
   ```typescript
   world.on('if.event.death', handler, { priority: 10, once: true });
   world.off('if.event.death', handler);
   ```

### Long-term (Platform Maturity)

7. **Event phases** - before/during/after phases like DOM capture/bubble
8. **Cancellation** - `event.preventDefault()` equivalent
9. **Async support** - `async` handlers with proper sequencing
10. **Transactional handlers** - Rollback on failure

---

## Conclusion

The fix works. Troll combat scores correctly. But we've accumulated architectural debt:

- Two dispatch mechanisms with different semantics
- Inconsistent handler signatures
- No lifecycle management
- God object (WorldModel) passed to handlers

This debt is manageable now but will compound. Before implementing features that rely heavily on entity handlers (NPCs, complex puzzles, multiplayer), we should consolidate the event system.

**Recommended next step**: Write ADR-074 documenting the current event flow and deciding on consolidation approach.
