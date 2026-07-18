# ADR-234: Chord Door Loading — `through` exit sugar

## Status: ACCEPTED (2026-07-17 — all four open questions ruled by David, session 615882; adr-review 15/16, fixes applied pre-flip)

## Date: 2026-07-17

## Parent: ADR-233 (go-live gate G1); scope fixed by its Q-1 ruling (2026-07-17, session f5c22c)

## Context

`create the oak door / a door` throws a LoadError today
(`loader.ts` `case 'door'`: "doors need `between` placement, which the
Phase A loader does not support yet") — the most basic IF furniture
fails to load from Chord, and going's `door_closed`/`door_locked`
branches (`going.ts`, via `exit.via`) are dead code for every Chord
story. The platform side is complete and battle-ready:

- `DoorTrait { room1, room2, bidirectional }` + `DoorBehavior`
  (`getOtherRoom`, `connects`) ship in world-model.
- `world.createDoor(name, { room1Id, room2Id, direction, … })` builds a
  door end-to-end: DoorTrait + SceneryTrait + OpenableTrait (starts
  closed) [+ LockableTrait], stamps `via` on BOTH rooms' exits
  (forward + inferred opposite), and places the door in room1 for
  scope resolution.
- The TS authoring idiom is `door('iron door').between(room1, room2,
  Direction.NORTH)` (helpers `DoorBuilder`) — room pair + explicit
  direction in one call. Chord's exit-line form carries the same
  three facts (pair, direction, door) on one line; the TS builder's
  `between` name stays TS-only.
- `world.connectRooms(a, b, dir)` already wires plain Chord exits
  bidirectionally (forward + opposite), so "reverse side inferred" is
  the established convention, not a new invention.

ADR-233 Q-1 originally fixed the scope as BOTH authoring forms
(placement-on-the-door `between` + exit-line `through` sugar).
**Superseded 2026-07-17 (session 615882): David ruled the `between`
placement form OUT** — "between leaves too much inferred
(directions)"; a form whose direction must be recovered from a
different block is not good syntax. One form ships: the exit-line
sugar, whose direction is explicit on the line and whose reverse is
the opposite cardinal direction. The rest of Q-1 stands: the `with
key` redundancy drop rides this ADR; the general cross-room `between`
primitive (windows, bridges) stays excluded and unforeclosed — and
with `between` no longer entering the grammar at all, that future
conversation now starts from a clean slate. Design only —
implementation gets its own follow-on plan.

## Decision

### D1 — One authoring form: exit-line sugar (David's ruling, 2026-07-17)

The door relationship is written on the room's exit line — direction
explicit, nothing recovered from another block:

```
create the Kitchen
  a room
  north to the Hall through the oak door

create the oak door
  a door, lockable with the iron key

  A heavy oak door, iron-banded.
```

This produces: DoorTrait `{room1: Kitchen, room2: Hall}`, `via`
stamped on the Kitchen's north exit AND the inferred opposite exit
(Hall south → Kitchen, same door — the established `connectRooms`
bidirectional convention; no matching line needed in the Hall). The
door must be declared (`create the oak door / a door`) — `through`
references it and never creates it (never-guess: an unknown name
after `through` is the standard unresolved-entity load error). The
door's own `create` block is pure entity declaration: kind, traits,
description, phrases, `on`/`after` clauses — it never names the
rooms. The rejected alternative (a `between` line on the door,
ADR-233 Q-1's Form A) died on exactly that point: its direction had
to be inferred from a different block's exit line, and "between
leaves too much inferred" (David, 2026-07-17).

### D2 — Direction resolution (never guessed)

The exit line carries the forward direction; the reverse is the
opposite direction (`getOppositeDirection` — every axis: cardinals,
diagonals, up/down, in/out; the same inference every plain `north to
the Hall` line already performs). There is no directionless door form.

### D3 — Consistency gates (load-time analysis)

- A door connects **exactly two rooms**. `through` references that
  resolve to more than one room pair for the same door are a load
  error naming the conflicting spans.
- Redundant agreement is legal: the Hall may also write `south to the
  Kitchen through the oak door`; it must resolve to the same pair with
  opposite directions, else load error.
- A declared `a door` with no `through` reference anywhere is a load
  error (an unconnected door is unanswerable — same never-guess class
  as direction).
- A door `create` block with an `in <place>`/`on <place>`/`starts in`
  placement line is a load error: a door's location IS its room pair
  (the loader places it in room1 per the platform convention).

### D4 — Door defaults mirror the platform, traits stay orthogonal

- `a door` composes SceneryTrait + OpenableTrait automatically,
  starting **closed** (createDoor parity; D5b closed-by-default).
  `starts open` (D5a) is the author's escape hatch. A permanently
  open passage needs no door entity at all — that's a plain exit.
  (Ruled: David, 2026-07-17, session 615882.)
- `lockable` is composed explicitly. **On a door, a lockable door is
  assumed LOCKED** (David's ruling, 2026-07-17): composing `lockable`
  starts the door locked unless the author overrides it to start
  unlocked. This is a deliberate, documented kind-scoped default —
  doors match the IF convention (a lockable door is a locked-door
  puzzle until stated otherwise) and match `createDoor`'s
  `isLocked ?? true`, while `lockable` elsewhere keeps the trait
  default (`startsLocked = false`: a lockable chest starts unlocked).
  The override is the existing D5a initializer — `a door, lockable,
  starts unlocked` — zero new grammar, one form per concept (David,
  2026-07-17, session 615882; the bare-state-word sketch was
  considered and dropped).
- All other traits, phrases (`detail`, Z3 channels), state
  initializers, and `on`/`after` clauses compose on doors exactly as
  on any entity. Nothing about door-ness restricts the composition
  surface.
- One-way doors (`DoorTrait.bidirectional = false`) do not land in
  this gate, but the surface is **reserved now** (David, 2026-07-17,
  session 615882): the `, one-way` exit-line modifier — `north to the
  Hall through the oak door, one-way` — riding the established
  comma-modifier slot (the `, once`/`, reversible` pattern). Reserved
  meaning: the exit (and door, when present) is traversable in the
  written direction only; no reverse exit is wired;
  `DoorTrait.bidirectional = false`. The same modifier is reserved
  for plain exits (`north to the Hall, one-way`) so doors and plain
  exits stay symmetric when it lands. Reservation only — the form is
  a parse error until its own ratchet entry lands ("`, one-way` is
  reserved but not yet wired").

### D5 — One wiring path in the platform

The loader must not re-implement door wiring. Extract the shared
mechanics of `createDoor` (via-stamping on both exits + room1
placement) into a platform seam usable with a **pre-built** entity —
e.g. `wireDoor(door, room1Id, room2Id, direction)` — so `createDoor`
(TS convenience) and the Chord loader (entity built by the normal
builder path, preserving description/phrases/clauses) share one
implementation. Two independent wiring paths is the invariant
violation this ADR exists to prevent.

### D6 — Ratchet entries carried (drafted here; land with the implementation, David's approval logged per entry)

- **R2**: `through the <door>` — optional tail on a room exit line
  (`<dir> to the <room> through the <door>`). The only door
  relationship form (R1, the `between` placement line, was struck by
  David's 2026-07-17 ruling before ever entering the grammar).
- **R3**: **the config keyword is dropped from every single-entity
  composition config — one uniform rule** (Q-1 ruling for lockable;
  extended to all single-entity configs by David, 2026-07-17, session
  615882): `lockable with the iron key`, `cuttable with the knife`,
  `diggable with the shovel`, `openable with the crowbar`. Parse
  rule: an article directly after `with` starts the entity-name value
  for the adjective's single entity config; the old keyed forms
  (`with key X`, `with tool X`) become parse errors with fix-its
  naming the new form (one form per concept, Given 7). Word-valued
  configs keep their keyword (`hiding-spot with position behind`,
  `readable with text …`) — the article is what disambiguates.
  Existing fixtures (lockable-key, cuttable, quickwin-adjectives,
  shipping stories) update when this lands.

### D7 — Acceptance criteria for the follow-on implementation plan

- AC-1: the one-line form (`north to the Hall through the oak door`,
  no matching line in the Hall) and the redundant two-line form load
  the identical world (trait/exit parity asserted).
- AC-2: going through an open door succeeds both directions; closed
  door refuses with `door_closed`, locked with `door_locked` — the
  going.ts branches exercised from a Chord-loaded world (REAL-PATH).
- AC-3: the door is examinable, openable, and lockable/unlockable
  from BOTH rooms (room1 placement + scope special-casing verified,
  not assumed).
- AC-4: door state (open/locked) survives save/restore (the
  platform's Chord save/restore guarantee — not this ADR's AC-6).
- AC-5: every load error in D2/D3 has a test asserting its diagnostic.
- AC-6: R3's parse error fix-it verified; fixtures migrated.

## Consequences

- The last ❌ of the parity audit's action table (going's door leg,
  the one ⚠️ with a hard-gap component) becomes closeable; ADR-233 G1's
  door line is satisfied by this ADR reaching ACCEPTED + its follow-on
  plan shipping.
- The `between` word does NOT enter the grammar at all (David struck
  the placement form 2026-07-17) — the future cross-room-primitive
  conversation starts from a clean slate rather than a door-shaped
  special case, which satisfies "don't foreclose" even more strongly
  than Q-1 originally required.
- Doors carry a documented kind-scoped lockable default (locked),
  diverging from the composition-wide trait default (unlocked) — the
  one place a trait's start state depends on what it's composed onto,
  justified by the IF convention and pinned by test in the follow-on
  plan.
- R3 changes an already-shipped form (`lockable with key X`) — a
  breaking fixture migration inside the gate, accepted by the Q-1
  ruling; the ratchet log records the supersession.
- The platform gains a shared door-wiring seam (D5), and the
  createDoor lockable-default divergence gets reconciled instead of
  silently duplicated.

## Session

Drafted 2026-07-17, session 615882 (chord-go-live plan Phase 4),
from ADR-233's Q-1 ruling (session f5c22c). Code grounding verified
this session: `DoorTrait`/`DoorBehavior`, `createDoor` wiring +
room1 placement, `connectRooms` bidirectional convention, going.ts
via-branches, loader door LoadError, helpers `DoorBuilder.between`,
`LockableTrait.startsLocked` default, chord parser exit-line and
placement grammar.
