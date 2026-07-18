# ADR-237: Loader–helpers boundary — `@sharpee/helpers` is author-facing only

## Status: ACCEPTED (2026-07-18 — all four open questions ruled by David, session d02586; adr-review 12/15, D4 door-side contract fix applied pre-flip)

## Date: 2026-07-18

## Parent: none (boundary ruling); intersects ADR-234 (door loading — its D5 seam shape is affected), ADR-140 (helpers package)

## Context

`@sharpee/helpers` (ADR-140) exists as fluent, author-facing sugar for
TypeScript story authors (`door('iron door').between(...)`,
`room(...)`, `container(...)`). During Chord loader development the
loader adopted it as its own construction path, and that dependency is
now pervasive, not incidental:

- `packages/story-loader/package.json:28` — `"@sharpee/helpers": "workspace:*"`
- `loader.ts:44` — `import { createHelpers } from '@sharpee/helpers'`
- `buildEntity` (`loader.ts:869`) instantiates `createHelpers(world)`
  and routes **every** entity kind through the fluent builders:
  `h.room` (874), `h.container` (889), `h.actor` (905), `h.object`
  (912, 946 — supporter and the default item case).

David's ruling (2026-07-18, session d02586): **the Chord compiler must
not use the helpers package.** Helpers is authoring sugar for the TS
canon; the compiler is platform machinery. A compiler that builds on
author convenience wrappers inverts the dependency direction — sugar
should sit on top of the platform's first-class surface, never
underneath another platform component.

The trigger was the ADR-234 D5 discussion: the proposed
`DoorBehavior.wireDoor` static — extracted so `WorldModel.createDoor`,
helpers' `DoorBuilder.build()`, and the Chord loader could share
wiring — was judged a hack. Deduplicating three call sites is not
design; the deeper signal is that the loader lacks (or is not using) a
first-class world-model construction surface, and reaching for helpers
papered over that gap. Per the elegance-parity principle, if the
loader is cleaner through a fluent author wrapper than through the
world-model API, that is a world-model API seam to close — not a
license for the compiler to keep the wrapper.

The only other workspace consumers of `@sharpee/helpers` are stories
(`stories/friendly-zoo`) — the intended audience, unaffected by this
ruling.

## Decision

### D1 — Boundary: `@sharpee/helpers` is exclusively author-facing

Platform packages — `packages/story-loader`, `packages/chord`, and
platform machinery generally — must not depend on `@sharpee/helpers`.
Its consumers are story authors (TS canon stories, fixtures written as
TS stories). Dependency direction: helpers sits **above** world-model
as sugar; nothing platform-side sits above helpers.

### D2 — Unravel the existing violation

`packages/story-loader` drops the `@sharpee/helpers` dependency.
`buildEntity`'s construction path is rebuilt on the world-model
surface directly.

### D3 — Replacement path: direct trait composition (David, 2026-07-18)

The loader builds entities by direct trait composition —
`world.createEntity(name, kind)` followed by `entity.add(new
KindTrait({...}))` / `entity.add(new IdentityTrait({...}))` per kind
branch. Trait composition IS the platform's first-class construction
surface; no new world-model creators, no loader-private builder
layer. The builders were thin ceremony over exactly these calls
(`h.room().build()` = `createEntity` + `RoomTrait` + `IdentityTrait`),
so this removes a layer rather than re-implementing one. Helpers
remain strictly for Sharpee TS authors. If any loader construction
site reads worse than the builder form did, that names a world-model
API gap to raise explicitly — never a reason to reintroduce a
wrapper.

### D4 — Door wiring home: `connectRooms` grows the door (David, 2026-07-18)

`connectRooms(room1Id, room2Id, direction, doorId?)` becomes the one
exit-wiring implementation, plain or doored — satisfying ADR-234 D5's
one-wiring-path invariant in the primitive that already owns exit
wiring (`RoomBehavior.setExit` already accepts the door id as its
fourth argument; `connectRooms` now passes it). When `doorId` is
supplied, `connectRooms` also places the door in room1
(`moveEntity`) — placement is part of the door-exit invariant, since
scope resolution depends on it. `createDoor` keeps its
convenience-constructor role but delegates its wiring tail to
`connectRooms`; helpers' `DoorBuilder` delegates likewise from the
author-facing side; the Chord loader — having composed the door
entity itself per D3 — calls the same primitive. The
`DoorBehavior.wireDoor` behavior-static extraction is rejected.

Door-side contract: when `doorId` is supplied, `connectRooms` throws
if the id resolves to no entity or to an entity without `DoorTrait`
(same error style as its existing missing-room throw).
`DoorTrait.room1`/`room2` are stamped — or verified, if pre-set — to
match the two rooms passed: the primitive owns the invariant that the
trait and the exits never disagree. Tests: one rejection test per
throw (unknown id, non-door entity, mismatched pre-set
`room1`/`room2`), plus a parity test asserting `createDoor` and
`DoorBuilder.build()` produce identical exit-config/`via`/placement
state through the shared primitive.

### D5 — Sequencing: the unravel is the door plan's revised Phase 1 (David, 2026-07-18)

One workstream, not two. `docs/work/chord-door-loading/plan.md`'s
Phase 1 is rewritten to carry this ADR's implementation: the helpers
unravel (D2/D3), the `connectRooms(…, doorId?)` growth (D4), and the
parity gate. Phase 2 then builds Chord door loading directly on the
cleaned surface — the D4 primitive's first real consumer lands in the
very next phase, which is the best test of the seam.

### D6 — Parity proof: one-time A/B world-state diff + standing gates (David, 2026-07-18)

Before the unravel lands, every chord fixture is loaded with the
current (helpers-backed) loader and the resulting world state
serialized; the unraveled loader must reproduce that state
identically. The A/B comparison is **throwaway verification** for
this migration — recorded in the phase log, goldens not kept — chosen
because it is the only gate that catches drift in fields no existing
test asserts on (builder-vs-naive-composition default differences).
The permanent gate remains the standing suites: story-loader's
world-state assertions plus the cloak (81/81) and zoo (71/71 atomic +
56/56 chained) transcript gates, all green post-unravel.

## Consequences

- The ADR-234 implementation plan
  (`docs/work/chord-door-loading/plan.md`) is revised per D5: its
  original Phase 1 (the `wireDoor` extraction with `DoorBuilder`
  refactored onto it) is replaced by this ADR's implementation —
  helpers unravel + `connectRooms` door growth + parity gate — with
  the door phases building on the cleaned surface.
- The loader currently inherits builder semantics and their history
  (e.g. the ADR-230/231 openable/lockable pre-add removals documented
  at `loader.ts:892-899`). The unravel must preserve loaded-world
  semantics exactly; Q4 fixes the proof obligation.
- `@sharpee/helpers` keeps its role for TS authors; `friendly-zoo` and
  other TS stories are unaffected. Helpers' own test coverage must
  stand alone once loader tests stop exercising it indirectly.
- Future Chord/loader work (doors included) builds against world-model
  first-class APIs from the start; "the loader needs sugar to be
  elegant" becomes a world-model API gap to raise, never a reason to
  re-import helpers.

## Session

d02586 (2026-07-18), branch `chord-foundations`.

