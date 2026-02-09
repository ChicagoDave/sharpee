# ADR-127: Location-Scoped Interceptors

## Status: PROPOSED (not yet needed)

## Date: 2026-02-09

## Context

ADR-118 introduced action interceptors on the direct object of an action. ADR-126 extended this to destination rooms for the going action. A third gap remains: **rooms cannot intercept actions performed within them.**

### Motivating Example

The Gas Room should explode if the player lights a torch while already inside:

```inform7
Before switching on something in Gas Room when the noun provides light:
    say "BOOM!";
    end the story.
```

In Inform 7, `Before [action] in [Room]` is a location-scoped rule — the room intercepts any action performed within it. Sharpee has no equivalent. When the player does `turn on torch`, the switching_on action checks `getInterceptorForAction(torch, 'if.action.switching_on')` — the torch is consulted, not the room.

### Interceptor Taxonomy

After ADR-126, Sharpee supports three interceptor scopes. Location-scoped would be the fourth:

| Scope | Entity Checked | Inform 7 Equivalent | Example |
|---|---|---|---|
| Direct object | Target of the action | `Before taking the axe` | Troll axe blocks taking |
| Source room | Room player is leaving | `Before going from Troll Room` | Troll blocks passage |
| Destination room (ADR-126) | Room player is entering | `Before going to Gas Room` | Gas room checks for flame on entry |
| **Location** (this ADR) | Room where action happens | `Before switching on in Gas Room` | Gas room checks flame-lighting |

## Decision

Deferred. Document the pattern and implement when needed.

### Proposed Design (for future implementation)

Stdlib actions would add a location interceptor lookup alongside their existing direct-object lookup:

```typescript
// In switching_on action validate phase (simplified)
const target = context.command.directObject?.entity;
const currentRoom = context.currentLocation;

// Existing: check the target entity
const targetInterceptor = getInterceptorForAction(target, 'if.action.switching_on');

// NEW: check the current room
const locationInterceptor = getInterceptorForAction(currentRoom, 'if.action.switching_on');
```

The location interceptor receives the **room** as its entity and can inspect the action's target via sharedData.

### Registration

```typescript
// Gas room intercepts switching_on performed within it
registerActionInterceptor(
  GasRoomTrait.type,
  'if.action.switching_on',
  GasRoomSwitchingOnInterceptor
);
```

The gas room trait would register interceptors for both `if.action.entering_room` (ADR-126, entry with flame) and `if.action.switching_on` (this ADR, lighting flame inside).

### Scope

This would affect ALL stdlib actions that support interceptors — each would need an additional `getInterceptorForAction(currentRoom, actionId)` call. This is a broader change than ADR-126 (which only modifies the going action) and should be implemented when a concrete need arises beyond the gas room.

### Alternative: Daemon

For the gas room specifically, a simpler approach is a daemon that checks each turn whether the player is in the gas room with a lit flame. This doesn't require any platform changes but doesn't generalize to other "action in room" patterns.

---

## Related ADRs

- **ADR-118**: Stdlib Action Interceptors (foundation)
- **ADR-126**: Destination Interceptors for Room Entry Conditions (companion)
- **ADR-090**: Entity-Centric Action Dispatch
