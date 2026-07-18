# ADR-238: Two-sided door presence — a door is located in BOTH of its rooms

## Status: ACCEPTED (2026-07-18 — David's ruling, session d02586; implemented with ADR-234 Phase 3)

## Date: 2026-07-18

## Parent: ADR-234 (door loading — AC-3 is what surfaced the gap); intersects ADR-237 (the `connectRooms` wiring this presence rides on)

## Context

ADR-234 AC-3 requires driving examine/open/close/lock/unlock against a
door "from both connected rooms," attributing that to "the platform's
scope special-casing for doors" — with the explicit instruction that it
be *verified live, not assumed*. Verification during Phase 3
(2026-07-18) proved the special-casing **did not exist**:

- `WorldModel.registerDefaultScopeRules` carried exactly two core
  rules — current-room contents and carried inventory. Nothing
  surfaced a door to its second room.
- The real play path runs entirely on that scope: the engine's
  vocabulary manager (`vocabulary-manager.ts`) and action-context
  factory both consume `world.getInScope`. A player standing in room2
  could not reference the door at all.
- Perception had the same hole: `VisibilityBehavior.canSee` gates on
  same-room containment, so the door (spatially placed in room1) was
  invisible from room2.

The gap had never bitten because no existing story referenced a door
from its far side (dungeo's trap door is canonically *not* operable
from the cellar). David identified this as the classic IF-platform
gotcha with a known convention answer.

## Decision

### D1 — A door is located in both of its rooms

The door entity is present — referenceable in commands and visible to
perception — from **either** room of its `DoorTrait` pair, regardless
of which room holds it spatially (room1, the platform placement
convention). This matches the established IF convention (Inform's
two-sided doors) and ADR-234 D3's own language: a door's location IS
its room pair.

### D2 — Only the door is two-sided (the no-leak constraint)

Two-sided presence extends to the door entity and nothing else. The
far room, and the far room's contents, must never become referenceable
or visible through the door's presence. This is the gotcha half of the
ruling: "you shouldn't be able to reference room2 from room1 and vice
versa." Tests pin the constraint, not just the presence.

### D3 — Implementation home: one core scope rule + the visibility case

- **Command scope**: a third core rule in
  `WorldModel.registerDefaultScopeRules` — `default_door_visibility` —
  includes every `DoorTrait` entity whose `room1` or `room2` is the
  actor's current room. The engine's vocabulary manager and context
  factory pick it up with no engine change.
- **Perception**: `VisibilityBehavior.canSee` treats a door as
  same-room-present from either pair room (container occlusion cannot
  apply across the boundary, so far-side presence short-circuits the
  line-of-sight walk); `getVisible` lists the room's doors whose
  spatial home is the far side. Darkness rules apply unchanged — a
  dark room hides its doors like anything else.
- Presence derives from `DoorTrait.room1`/`room2`, which
  `connectRooms(…, doorId)` (ADR-237 D4) keeps consistent with the
  exits — the two-sided behavior is therefore automatic for every
  door wired through the one platform path, TS or Chord.

## Consequences

- "Open the oak door" works from either side of the door in every
  loaded world, closed or open, without story code — first exercised
  live by ADR-234 Phase 3's REAL-PATH suite and a full-parser
  transcript (close-from-room2 through the bundle).
- Future scope/visibility work must preserve the no-leak constraint;
  the world-model tests (`connect-rooms-door.test.ts`, two-sided
  presence describe block) fail any change that leaks the far room or
  its contents.
- One-way doors (`, one-way`, reserved by ADR-234 D4) will need a
  presence ruling of their own when they land — reserved, not decided
  here.
- The ADR-234 AC-3 phrase "the platform's scope special-casing for
  doors" is now true by construction; this ADR is the record that it
  was built, not found.

## Session

d02586 (2026-07-18), branch `chord-foundations` — implemented inside
ADR-234 Phase 3 (`docs/work/chord-door-loading/plan.md`).
