# ADR-220: Doors & Portals

## Status: ACCEPTED (2026-07-14 — designed via interview the same session; principle, mechanism, and `between`-retention all resolved)

> Child of ADR-214 (parity). Created as a vision stub during the ADR-218
> interview when door edge-cases (directionless, multiple-per-wall, portals,
> dynamic destinations) exceeded the current world model; David then chose to
> design it fully. **Governing principle (David, 2026-07-14): direct exits stay
> simple; anything richer is logic-gated — the exit *data model* does not grow.**

## Date: 2026-07-14

## Context

Sharpee's world model today: **`DoorTrait`** = `{ room1, room2, bidirectional }`
(two fixed rooms); **room exits** = `Partial<Record<DirectionType, IExitInfo>>`
(direction-keyed, one exit per direction), `IExitInfo = { destination, via,
mapHint }` with a single fixed `destination`. ADR-218 §2 ships the *direct* door
(fixed two-room, directional, `between` spelling). The cases that exceed that:

1. **Directionless doors** — reached by name, no compass slot.
2. **Multiple doors on one wall** — a red and a blue door, both "north", leading
   different places.
3. **Invisible / concealed portals** — not seen until discovered.
4. **Dynamic / multi-room destinations** — the far side chosen at runtime.

## Decision

### The principle — simple direct exits, logic-gated everything else (resolved 2026-07-14)

The exit **data model does not grow**. A direct exit stays exactly as today —
`direction → destination`, one static `IExitInfo`, unchanged for every existing
story and the auto-mapper. All four richer cases are expressed as **gating logic
on the exit**, not as new exit-map structure.

### The mechanism — a conditional/computed exit field (resolved 2026-07-14)

Doors stay **exits** (not re-modeled as free entities). `IExitInfo` gains two
**optional** fields the `going` action consults:

- **`when` (condition)** — a guard; the exit is available only when it holds. A
  direct exit omits it (always available, as today).
- **computed `destination`** — the destination may be a value-expression/behavior
  evaluated at traversal, not only a fixed room ID. A direct exit uses a plain
  room id (as today).

`going` evaluates `when` (falling back to the existing `blockedExits` message
path when gated out) and resolves `destination` (static id, or computed). This is
a **small, additive hook** in `going` + `IExitInfo`; nothing changes for exits
that use neither field. The four cases map onto it:

| Case | Logic-gated expression |
|---|---|
| Dynamic / random destination | computed `destination` (expr/behavior picks the room at traversal) |
| Invisible / concealed portal | `when <discovered>` guard (+ the door entity's own description/scenery for visibility) |
| Two doors on one wall | the wall's exit uses a computed `destination` that resolves by state (which door is open/chosen); the doors themselves are ordinary `via` entities with adjectives, resolved by standard object disambiguation ("open the red door") |
| Directionless door | occupies a non-compass slot (`in`/`out`) or is an enterable door entity whose traversal is the same gated exit; there is no new "directionless" exit channel |

Save/restore and the map view see a normal exit; a computed destination resolves
each turn, so no fixed "other side" is persisted beyond the exit's own state.

### Surfaces

- **World-model**: the two optional `IExitInfo` fields; no change to `DoorTrait`
  or the direction-keyed map shape.
- **stdlib**: `going` consults `when`/computed `destination`; unchanged when
  absent.
- **parser-en-us**: door naming/disambiguation is ordinary entity resolution
  (doors are `via` entities with adjectives) — no special grammar for "which
  door".
- **Chord surface**: a `when`/computed-destination spelling on an exit, under the
  ADR-210 ratchet.

### `between` is retained (resolved 2026-07-14)

ADR-218 §2's `between the Hall (east) and the Study (west)` create-line form
**stands unchanged** — it *is* the simple direct-door case the principle protects.
The `when`/computed-destination fields are optional additions for richer doors;
ADR-220 is **purely additive** on top of ADR-218, not a revision of it.

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4. Concretely:

- **AC-1 — direct exits unchanged.** Existing stories (cloak, zoo) and ADR-218's
  `between` door fixture compile and run identically; a test confirms an
  `IExitInfo` with neither new field behaves exactly as today.
- **AC-2 — conditional exit.** A fixture exit with `when <flag>` is blocked (via
  the `blockedExits` message path) until the flag is set, then traversable.
- **AC-3 — computed destination.** A fixture exit whose destination is computed
  resolves to different rooms as state changes (covers dynamic destination and
  two-doors-on-a-wall disambiguation).
- **AC-4 — additive model.** A test confirms no change to the direction-keyed
  exit map shape, `DoorTrait`, the auto-mapper, or serialization for exits that
  use neither new field.

## Consequences

- Doors/portals gain full expressive range with **no exit-data-model expansion** —
  the direction-keyed map, auto-mapper, map hints, serialization, and every
  existing story are untouched. Only two optional `IExitInfo` fields + a small
  `going` hook are added.
- Complexity lives in logic (conditions, computed destinations), matching Chord's
  on-clause/condition model and the ADR-214 additive-only bar.
- Directionless doors reuse non-compass direction slots or enterable door
  entities; there is deliberately no new directionless exit channel.
- The interim note in ADR-218 §2 ("`between` not frozen; ADR-220 may revise") is
  settled: `between` is **retained**; ADR-220 only adds optional logic-gating.

## Session

Session ae2a61 (2026-07-14) — created as a vision stub during the ADR-218
interview, then designed via interview the same session (exit-model,
dynamic-destination, and disambiguation questions resolved by the logic-gating
principle). Parent/interim: ADR-218 §2 (direct two-room door). Related: ADR-214
(parity), ADR-210 (Chord grammar ratchet), ADR-113 (exit map hints).
