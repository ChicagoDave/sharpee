## 3. Movement

Getting an actor from place to place: rooms and their exits, things you can
get inside or on top of, and things you can climb.

### 3.1 going

**go** (`if.action.going`) — `go north`, `walk`/`run`/`head`/`travel
north`, or just the direction (the synonym forms and a fixed
`go <direction>` rule landed with ADR-230 D4). Twelve direction words
parse: `north`/`n`, `south`/`s`, `east`/`e`, `west`/`w`,
`northeast`/`ne`, `northwest`/`nw`, `southeast`/`se`, `southwest`/`sw`,
`up`/`u`, `down`/`d`, plus `in`/`inside` and `out`/`outside`.

Exits are room data — the direction lines of a room's `create` block,
including blocked and conditionally blocked exits (chord-language.md
§2.5 owns that syntax) and deadly exits (§9.2 here). A blocked exit
refuses with `movement_blocked` and speaks the story's own phrase — and
a direction can be blocked without leading anywhere, which is how "the
hedge is too thick" works. An exit may route through a door (§4.3),
which refuses while locked (`door_locked`) or closed (`door_closed`).
Darkness gates seeing, not moving: walking into a dark room succeeds
and only the arrival description is lost, replaced by `too_dark`
(light rules: §6.1; anything worse than not-seeing — a grue — is death
machinery, §9). Vehicles change whose feet move — one line in §3.4,
TypeScript-only today.

The author writes:

<!-- fixture: movement/going.story -->
```story
create the Walled Garden
  a room
  north to the Potting Shed through the green door
  east to the Grotto
  south is blocked: wall-too-high

  Espaliered pears line the old brick walls.

create the green door
  a door
  aka door

  A green door in the north wall, painted and peeling.

  on going it
    refuse when the player holds the wheelbarrow: barrow-too-wide
  end on

  phrase barrow-too-wide:
    The wheelbarrow jams in the doorway. You back out again.

create the Potting Shed
  a room

  Clay pots on every shelf, and the smell of compost.

  after entering it, once
    phrase shed-memory
      You spent a whole summer in here once, pricking out seedlings.
  end after

create the Grotto
  a room, dark
  west to the Walled Garden

  Dripping stone and ferns nobody planted.

create the wheelbarrow
  aka barrow
  in the Walled Garden

  A wooden wheelbarrow, wider than it needs to be.

create the player
  starts in the Walled Garden

define phrases en-US
  wall-too-high:
    The south wall is twelve feet of smooth brick. Not without a ladder.
```

The player sees:

<!-- transcript: movement/going.story -->
```transcript
> south
The south wall is twelve feet of smooth brick. Not without a ladder.

> east
It is pitch dark. You are likely to be eaten by a grue.

> west
Walled Garden
Espaliered pears line the old brick walls.

You can see a wheelbarrow here.

> north
The green door is closed.

> open the green door
You open the green door.

> take the wheelbarrow
Taken.

> north
The wheelbarrow jams in the doorway. You back out again.

> drop the wheelbarrow
Dropped.

> north
Potting Shed
Clay pots on every shelf, and the smell of compost.

You spent a whole summer in here once, pricking out seedlings.
```

One walk covers the seams: the blocked wall speaks the story's phrase,
the dark Grotto lets you in but shows you nothing, the closed door
refuses, the door's own `on going it` guard vetoes the wheelbarrow, and
the shed's `after entering it, once` greets the first arrival.

| | go (`if.action.going.*`) |
|---|---|
| Refusals | `no_direction` · `not_in_room` (in a vehicle, not a room) · `no_exits` · `no_exit_that_way` · `movement_blocked` (the story's blocked phrase) · `door_locked` · `door_closed` · `destination_not_found` |
| Success | `moved` · `moved_to` · `first_visit` · `too_dark` (you arrived; you just can't see) |
| Events | `if.event.actor_exited` / `if.event.actor_moved` / `if.event.actor_entered`, plus `if.event.region_exited` / `region_entered` on region crossings — what `after going` clauses and daemons key off |

Interceptors: going consults three parties in order — the room being
left (`on going it`), the room being entered (its clauses bind as
`entering_room` conditions — this is how a room refuses entry rather
than refusing exit), and the door being passed through (`on going it`
on the door, as the green door shows). First refusal wins. Regions can
react to the crossing events on their own blocks — `after entering it`
/ `after leaving it` (§3.4).

### 3.2 entering and exiting

**enter** (`if.action.entering`) — `enter X`, `get in/into X`, `climb
in/into X`, `go in/into X`, `board X`, `get on X`. One gate: the target
needs the `enterable` trait — anything else refuses with
`not_enterable` (checked in the action: parse by syntax, refuse by
world, since ADR-231). A closed openable refuses with
`container_closed`; already inside → `already_inside`. The trait's one
setting, its preposition, decides whether you are *in* the bathtub or
*on* the park bench (`entered` vs `entered_on`); `on` is a TypeScript
setting today (§3.4). There is no occupancy limit — `too_full` is
reserved but never fires.

**exit** (`if.action.exiting`) — bare `exit`, `leave`, `get out`, `go
out`, `climb out`, `disembark`, `alight`. A named target parses too —
`exit the chair` — and naming something you aren't inside refuses with
`not_in_that` (ADR-231). EXIT undoes an ENTER: out of the container,
off the supporter. Standing in a plain room refuses with
`already_outside` — leaving rooms is GO's job. A closed openable
container refuses with `container_closed`: you can shut yourself in.

The author writes:

<!-- fixture: movement/entering-exiting.story -->
```story
create the Laundry
  a room

  Copper tubs, drying racks, and a mangle with an evil reputation.

create the laundry chest
  aka chest
  a container, enterable, openable, starts open
  in the Laundry

  A wicker chest big enough to hide in.

create the mangle
  scenery
  in the Laundry

  Two iron rollers and a crank. Keep your fingers clear.

create the player
  starts in the Laundry
```

The player sees:

<!-- transcript: movement/entering-exiting.story -->
```transcript
> enter the mangle
You can't enter the mangle.

> get into the chest
You get into the laundry chest.

> close the chest
You close the laundry chest.

> exit
The laundry chest is closed.

> open the chest
You open the laundry chest.

Inside the laundry chest you see yourself.

> exit
You get out of the laundry chest.

> exit the chest
But you aren't in the laundry chest.

> exit
You're not inside anything.
```

One trait draws the line — the mangle turns you away, the chest lets
you in — and the composed openable makes the lid real: closed, it holds
you until you open it from the inside (revealing, honestly, yourself).

| | enter (`if.action.entering.*`) | exit (`if.action.exiting.*`) |
|---|---|---|
| Refusals | `not_enterable` · `container_closed` · `already_inside` (`too_full` reserved, never fires) | `already_outside` · `not_in_that` · `container_closed` (shut in) · `nowhere_to_go` |
| Success | `entered` · `entered_on` (`on`-preposition supporters) | `exited` · `exited_from` |
| Events | `if.event.entered` | `if.event.exited` |

Cross-references: `climb into X` is entering and `climb out` is exiting
(§3.3); the `enterable` trait and the vehicle trait that rides on it
are in §3.4.

### 3.3 climbing

**climb** (`if.action.climbing`) — `climb X`, `climb up/down X`,
`scale`, `ascend`, `descend X`, all gated on the `climbable` trait
(`climb into the basket` is entering; `climb out` is exiting, §3.2).
Climbing something puts you *on* it — the same place putting yourself
on an enterable supporter gets you; an unclimbable target refuses with
`not_climbable`, being already up there with `already_there`.

The author writes:

<!-- fixture: movement/climbing.story -->
```story
create the Orchard Corner
  a room

  One great pear tree leans over the garden wall here.

create the pear tree
  aka tree
  a supporter, climbable
  scenery
  in the Orchard Corner

  Low branches all the way up, practically a ladder.

  after climbing it
    phrase over-the-wall
      From up here you can see clear over the wall into the lane.
  end after

create the garden wall
  aka wall
  scenery
  in the Orchard Corner

  Twelve feet of smooth brick, no handholds.

create the player
  starts in the Orchard Corner
```

The player sees:

<!-- transcript: movement/climbing.story -->
```transcript
> climb the wall
You can't climb the garden wall.

> climb the tree
You climb onto the pear tree.

From up here you can see clear over the wall into the lane.

> climb the tree
You're already on the pear tree.

> climb out
You get out of the pear tree.
```

The supporter composed alongside `climbable` is what makes the perch
real — somewhere to actually be, so the second climb can refuse and
`climb out` has something to leave; with bare `climbable` alone the
climb speaks success but the player never leaves the room floor
(nothing can hold them).

| | climb (`if.action.climbing.*`) |
|---|---|
| Refusals | `no_target` · `not_climbable` · `already_there` · `cant_go_that_way` (directional, off-vertical) — `too_high`/`too_dangerous` reserved |
| Success | `climbed_onto` (object) · `climbed_up` / `climbed_down` (directional) |
| Events | `if.event.climbed`, plus `if.event.entered` (object) or `if.event.moved` (directional) |

Interceptors: `after climbing it` on the target — the pear tree's
comment above, and how a cliff would teleport (below). Two honest
footnotes: the action also implements directional climbing — `climb up`
meaning "take the up exit" — but no core grammar reaches it today (bare
`up`/`down` parse as going, which is usually what you want; a story
adding `climb up` as grammar gets room-exit climbing for free); and the
trait's `destination`/`direction` fields are unread by the standard
action — climbing never teleports you to a destination room, so put an
`after climbing it` clause on the cliff if you want that
(`blockedMessage`/`successMessage` are likewise story data).

### 3.4 Movement traits

**room** (`a room` — kind noun). The place actors stand. Everything a
room does in a `.story` file happens in its `create` block: direction
lines, doors (`north to the Potting Shed through the green door` —
§4.3 has the door story), and blocked exits (chord-language.md §2.5);
`dark` / `dark while <condition>` (§2.3 there); a `first time` arrival
description (§2.9 there); `deadly:` (§9.2 here); states, scores, and
`on`/`after` clauses — including `after entering it`, the room-arrival
reaction the Potting Shed uses in §3.1's example.

**enterable** (`enterable` — adjective). Marks a thing the player can
get inside or on top of — the laundry chest in §3.2 composes it with
`a container, openable` so the lid is real. Composes with defaults
(preposition `in`); the `on` preposition — benches, roofs — is a
TypeScript setting today. First documented here: no story in the repo
uses it yet.

**climbable** (`climbable` — adjective). Marks a thing the CLIMB family
accepts. Defaults only from Chord (`canClimb: true`); compose a
supporter alongside it to give the climber somewhere to be (§3.3's
pear tree); the trait's `destination`/`direction`/message fields are
story-handler data (§3.3).

**exit** (trait). A passage *entity* — the "xyzzy" magic word, a tunnel
that is a thing in its own right. A room exit can route `via` such an
entity (or via a door), and pathfinding resolves it; going checks a via
entity only for open/locked state. No standard action reads the trait's
richer fields (aliases, visibility, bidirectionality) today, and it has
no Chord surface — treat it as Sharpee-Way plumbing.

**vehicle** (trait — TypeScript-only, no Chord surface). Rides on top of
`enterable`: the trait's `blocksWalkingMovement` (default true) is what
makes GO say "you're in something" instead of walking; set it false and
GO moves the vehicle itself along the room's exits, passengers and all
(`movesWithContents`). `positionRooms`/`currentPosition` track
multi-stop vehicles (the Dungeo basket's counterweight shape);
`isOperational` and `requiresExitBeforeLeaving` are read by vehicle
helpers for story use.

**region** (`a region` — kind noun, since ADR-236). A named room group,
authored region-side: `containing the Drive, the Hall` lists members
(additive — regions nest by containing each other), `after entering it`
/ `after leaving it` react to boundary crossings (`leaving` exists only
here), and an `on every turn` clause on the region block is a region
daemon, firing while the player is anywhere in a member room. The
`region_entered`/`region_exited` events going emits (§3.1) are what
these bind to. Full entry in §11.1.

**scene** — a structural trait with no Chord surface and no verb;
cataloged in §11.
