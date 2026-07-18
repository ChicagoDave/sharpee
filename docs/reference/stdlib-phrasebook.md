# The Sharpee Standard Library — Phrasebook

A table-first companion to the standard library reference
(`stdlib-reference.md`): every standard action's phrasings, the trait that
makes an entity eligible, and the refusal keys it speaks — then, for the
actions you will reach for most, a worked example in story context: the
Chord `.story` scene an author writes, and the transcript a player sees.

> **Status: FIXTURE-VERIFIED** (2026-07-17) — written against the
> post-ADR-230 grammar (`packages/parser-en-us/src/grammar.ts` is the
> phrasings' source of truth). Every `.story` block below is a verbatim
> excerpt of a complete, loadable fixture under
> `docs/work/stdlib-phrasebook/fixtures/`, and every transcript line is
> genuine engine output, replayed on every run of
> `docs/work/stdlib-phrasebook/verify.mjs` — compile with
> `@sharpee/chord`, load with `@sharpee/story-loader`, execute the
> commands, diff the text. Nothing here is hand-typed from memory.

## How to read this

Each category opens with a table: the action, the phrasings that actually
parse (grounded in the parser's grammar, not the help lists), what an
entity **needs** to be eligible, and the message keys the action **refuses
with**. Refusal keys prefix as `if.action.<action>.<key>` — they are IDs,
not fixed text; `stdlib-reference.md` §1.4 explains how a story retargets
them. Success keys, events, and the full check order live in the
corresponding `stdlib-reference.md` entry; this document is the quick
lookup and the gallery.

Below each table, the worked examples come in pairs — *the author writes*
a small scene, *the player sees* a few commands against it, always
including at least one refusal and one success. `<direction>` in a
phrasing means any of the twelve direction words (`north`/`n` … `up`/`u`,
`in`, `out`).

Two authoring notes that recur in the examples:

- Give every multiword entity an `aka` alias. Besides being kind to
  players, it is currently what makes the article form parse — with no
  alias, `x the iron key` misses while `x iron key` hits.
- Where an example carries a custom refusal on a *standard* action, its
  phrase is declared under the fully-qualified dotted key (`define phrase
  if.action.taking.ring-fused`) and named in full by `refuse`. That is
  the form that renders today: the short form (`refuse ring-fused` with a
  local phrase) blocks the action but currently prints no text, and a
  handful of actions (giving, showing, throwing, wearing among them)
  don't render custom refusal keys at all — platform note, under review.
  Refusals inside a `define action` (see turning, §6) are free of all
  this: short keys render fine on the dispatch path.

## 1. Manipulation

Moving things by hand — and by mouth. `stdlib-reference.md` §2 (and §8.3
for eating/drinking) carries the full entries.

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **take** | `take`/`get`/`grab`/`acquire`/`collect X` · `take up X` · `pick up X` · `take all` / `take X and Y` / `take all but X` | anything portable (scenery blocks) | `fixed_in_place`, `already_have`, `cant_take_self`, `cant_take_room`, `container_full`, `too_heavy`, `nothing_to_take` |
| **drop** | `drop`/`discard`/`release X` · `put down X` · `throw away X` · `let go of X` · `drop all` | a held item | `not_held`, `still_worn`, `container_full`, `cant_drop_here`, `nothing_to_drop` |
| **put (on)** | `put`/`place X on`/`onto Y` · `hang X on Y` · `move X to Y` | destination: `a supporter` | `no_destination`, `not_surface`, `cant_put_on_itself`, `already_there`, `no_space` |
| **insert** | `put`/`place X in`/`into`/`inside Y` · `insert X in`/`into Y` | destination: `a container` | `not_container`, `container_closed`, `cant_put_in_itself`, `already_there`, `no_room` |
| **remove (from)** | `remove`/`extract X from Y` · `take X from Y [with`/`using Z]` | a container or supporter source | `no_source`, `not_in_container`, `not_on_surface`, `container_closed`, `already_have`, `nothing_to_remove` |
| **push** | `push`/`press`/`shove`/`move X` · `move X <direction>` | `pushable` | `fixed_in_place`, `pushing_does_nothing`, `wont_budge`, `too_heavy` |
| **pull** | `pull`/`drag`/`yank`/`tug X` | `pullable` | `cant_pull_that`, `already_pulled`, `worn` |
| **lower** | `lower X` | a capability behavior (ADR-090) | `cant_lower_that` |
| **raise** | `raise`/`lift X` | a capability behavior (ADR-090) | `cant_raise_that` |
| **eat** | `eat`/`consume`/`devour`/`munch`/`nibble X` · `munch`/`nibble on X` | `edible` | `not_edible`, `is_drink`, `already_consumed` |
| **drink** | `drink`/`sip`/`quaff`/`swallow`/`imbibe X` · `drink`/`sip from X` | `edible` liquid, or a liquid container (TypeScript today) | `not_drinkable`, `already_consumed`, `container_closed` |

### taking and dropping

Anything is takeable unless something says otherwise. The two classic
"otherwise"s: the `scenery` trait, which refuses with the platform's
`fixed_in_place`, and an `on taking it` guard, which refuses with the
entity's own words.

The author writes:

<!-- fixture: taking-dropping.story -->
```story
create the Lamp Room
  a room

  Shelves of unlit lamps line every wall.

create the brass lantern
  aka lantern
  in the Lamp Room

  A dented brass lantern with a wire handle.

create the marble statue
  aka statue
  scenery
  in the Lamp Room

  A blank-eyed statue, far too heavy to move.

create the iron ring
  aka ring
  scenery
  in the Lamp Room

  A ring set into the floor slab.

  on taking it
    refuse if.action.taking.ring-fused
  end on

create the player
  starts in the Lamp Room

define phrase if.action.taking.ring-fused
  The ring is fused to the slab; your fingers just slip off it.
end phrase
```

The player sees:

<!-- transcript: taking-dropping.story -->
```transcript
> take the statue
The marble statue is fixed in place.

> take the ring
The ring is fused to the slab; your fingers just slip off it.

> take the lantern
Taken.

> drop the lantern
Dropped.
```

### putting and inserting

`put X on Y` needs a supporter; `put X in Y` (which parses as inserting)
needs a container — and an openable container must be open. Neither
requires the item in hand: putting performs the take for you.

The author writes:

<!-- fixture: putting-inserting.story -->
```story
create the Kitchen
  a room

  A stone-flagged kitchen, warm from the oven.

create the breadbox
  a container, openable, starts open
  in the Kitchen

  A rolltop breadbox of waxed pine.

create the kitchen table
  aka table
  a supporter
  scenery
  in the Kitchen

  A long oak table, scrubbed pale.

create the loaf
  in the Kitchen

  A round loaf, still warm.

create the carving knife
  aka knife
  in the Kitchen

  A carving knife with a worn horn handle.

create the player
  starts in the Kitchen
```

The player sees:

<!-- transcript: putting-inserting.story -->
```transcript
> put the loaf in the breadbox
(first taking the loaf)

Taken.

You put the loaf in the breadbox.

> close the breadbox
You close the breadbox.

> insert the knife in the breadbox
The breadbox is closed.

> put the knife on the table
You put the carving knife on the kitchen table.
```

(Openable things start **closed** (ADR-231); the breadbox declares
`starts open`, which is why the first `put` succeeds and the transcript
closes the breadbox itself before showing the refusal.)

## 2. Movement

Getting an actor from place to place. Full entries: `stdlib-reference.md`
§3 (hiding: §8.4).

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **go** | `<direction>` · `go`/`walk`/`run`/`head`/`travel <direction>` | a room exit that way | `no_exit_that_way`, `movement_blocked`, `door_closed`, `door_locked`, `not_in_room`, `no_exits` |
| **enter** | `enter X` · `get in`/`into X` · `climb in`/`into X` · `go in`/`into X` · `board X` · `get on X` | `enterable` | `container_closed`, `already_inside`, `not_enterable` |
| **exit** | `exit` · `leave` · `get out` · `go out` · `climb out` · `disembark` · `alight` | being inside or on something | `already_outside`, `container_closed`, `nowhere_to_go` |
| **climb** | `climb [up`/`down] X` · `scale`/`ascend`/`descend X` | `climbable` | `not_climbable`, `already_there`, `cant_go_that_way` |
| **hide** | `hide`/`duck`/`crouch behind`/`under X` · `hide [in`/`inside`/`on] X` | `concealment` (TypeScript today) | `cant_hide_there` |
| **reveal** | `stand up` · `come out` · `unhide` · `stop hiding` | being hidden | — |

### going

Exits are lines in the room's `create` block; a blocked exit speaks the
story's own phrase. `go north` and the `walk`/`run`/`head`/`travel`
synonyms all parse since ADR-230 — as does the bare direction, which is
what players actually type.

The author writes:

<!-- fixture: going.story -->
```story
create the Meadow
  a room
  north to the Orchard
  east is blocked: hedge-thick

  Knee-high grass, and a dark hedge along the eastern edge.

create the Orchard
  a room
  south to the Meadow

  Apple trees in crooked rows.

create the player
  starts in the Meadow

define phrases en-US
  hedge-thick:
    The hedge is a wall of blackthorn. Not that way.
```

The player sees:

<!-- transcript: going.story -->
```transcript
> east
The hedge is a wall of blackthorn. Not that way.

> go north
Orchard
Apple trees in crooked rows.

> walk south
Meadow
Knee-high grass, and a dark hedge along the eastern edge.

> west
You can't go that way.
```

### entering and exiting

One trait — `enterable` — and the parser will not even match the ENTER
patterns against anything else. Compose `openable` alongside it and a
closed door refuses entry with `container_closed`. (Prefer `enter X` in
play and in tests: the `get in`/`get into` forms currently lose to
taking's `get X` when the target is scenery — platform note.)

The author writes:

<!-- fixture: entering.story -->
```story
create the Carriage House
  a room

  Straw on the flagstones and one relic of better days.

create the sedan chair
  aka chair, sedan
  enterable, openable
  scenery
  in the Carriage House

  A gilt sedan chair with a door on the near side.

create the player
  starts in the Carriage House
```

The player sees:

<!-- transcript: entering.story -->
```transcript
> enter the sedan chair
The sedan chair is closed.

> open the sedan chair
You open the sedan chair.

> enter the sedan chair
You get into the sedan chair.

> exit
You get out of the sedan chair.
```

## 3. Containers & locks

Getting things open, and locked. Full entries: `stdlib-reference.md` §4.

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **open** | `open X` · `open up X` · `unwrap`/`uncover X` · `open X with`/`using Y` | `openable` | `already_open`, `locked`, `no_tool`, `tool_not_held`, `wrong_tool` |
| **close** | `close`/`shut`/`cover X` | `openable` | `already_closed`, `not_closable`, `prevents_closing` |
| **lock** | `lock X [with`/`using Y]` · `secure X` | `lockable` | `no_key`, `key_not_held`, `wrong_key`, `not_closed`, `already_locked`, `not_lockable` |
| **unlock** | `unlock X [with`/`using Y]` · `unsecure X` | `lockable` | `no_key`, `key_not_held`, `wrong_key`, `already_unlocked`, `not_lockable` |

### opening, with a tool in the command

`open X with Y` maps onto the standard opening action (ADR-230 D3b), and
an explicitly named tool is a consulted command entity — the tool itself
can veto the operation. (The trait-side tool *requirement* —
`toolId`/`toolIds` on the openable — is TypeScript territory today.)

The author writes:

<!-- fixture: opening-tool.story -->
```story
create the Cellar
  a room

  Brick arches, cold air, one bare bulb.

create the shipping crate
  aka crate
  openable
  scenery
  in the Cellar

  A pine crate. The lid sits loose on top.

create the letter opener
  aka opener

  Your grandfather's silver letter opener.

  on opening it
    refuse if.action.opening.opener-precious
  end on

create the player
  starts in the Cellar
  carries the letter opener

define phrase if.action.opening.opener-precious
  You are not prying anything with your grandfather's letter opener.
end phrase
```

The player sees:

<!-- transcript: opening-tool.story -->
```transcript
> open the crate with the letter opener
You are not prying anything with your grandfather's letter opener.

> open the crate
You open the shipping crate.
```

### locking and unlocking, with a key

`lockable with key <entity>` declares the key contract in one line —
forward references are legal. Keyless LOCK on a keyed lock asks for the
key; the wrong key refuses; lock state then gates opening. (A Chord
lockable starts unlocked, and this strongbox declares `starts open`; the
transcript locks the box itself first — a story could seed the state
instead with `starts locked`.)

The author writes:

<!-- fixture: locking-unlocking.story -->
```story
create the Strong Room
  a room

  A windowless room with one iron shelf.

create the strongbox
  a container, openable, lockable with key the brass key, starts open
  in the Strong Room

  A squat strongbox with a bright keyhole.

create the brass key
  aka key
  in the Strong Room

  A small brass key.

create the hairpin
  in the Strong Room

  A sturdy steel hairpin.

create the deed
  in the strongbox

  A property deed, folded in thirds.

create the player
  starts in the Strong Room
```

The player sees:

<!-- transcript: locking-unlocking.story -->
```transcript
> take the brass key
Taken.

> take the hairpin
Taken.

> close the strongbox
You close the strongbox.

> lock the strongbox
What do you want to lock it with?

> lock the strongbox with the brass key
You lock the strongbox with the brass key.

> open the strongbox
The strongbox is locked.

> unlock the strongbox with the hairpin
The hairpin doesn't fit the strongbox.

> unlock the strongbox with the brass key
You unlock the strongbox with the brass key.

> open the strongbox
You open the strongbox.

Inside the strongbox you see deed.
```

## 4. Wearing

One trait powers the whole family. Full entries: `stdlib-reference.md` §5.

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **wear** | `wear`/`don`/`equip X` · `put on X` | `wearable` | `not_wearable`, `already_wearing`, `hands_full`, `cant_wear_that` |
| **take off** | `take off X` · `take X off` · `remove X` · `doff`/`unequip X` | a worn item | `not_wearing`, `prevents_removal`, `cant_remove` |

### wearing and taking off

You don't have to be holding a garment — wearing takes it first. A worn
garment blocks dropping (`still_worn` lives on the *dropping* action):
take it off, then drop it.

The author writes:

<!-- fixture: wearing.story -->
```story
create the Dressing Room
  a room

  A tall mirror, a rack, and not much else.

create the velvet cloak
  aka cloak
  wearable
  in the Dressing Room

  A midnight-blue cloak with a silver clasp.

create the anvil
  in the Dressing Room

  A blacksmith's anvil, inexplicably.

create the player
  starts in the Dressing Room
```

The player sees:

<!-- transcript: wearing.story -->
```transcript
> wear the cloak
(first taking the velvet cloak)

Taken.

You put on the velvet cloak.

> drop the cloak
You'll need to take off the velvet cloak first.

> take off the cloak
You take off the velvet cloak.

> drop the cloak
Dropped.
```

## 5. Senses

How the player perceives the world. Full entries: `stdlib-reference.md`
§6 (touching: §2.6).

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **look** | `look` · `l` · `look around` | — | (`room_dark` in the dark) |
| **examine** | `examine`/`x`/`inspect`/`check`/`view`/`observe X` · `look [carefully] at X` | visibility only | `no_target`, `not_visible` |
| **search** | `search [X]` · `look in`/`inside X` · `look through X` · `rummage in`/`through X` | — | `container_closed` |
| **read** | `read`/`peruse`/`study X` | `readable` | `not_readable`, `cannot_read_now` |
| **listen** | `listen [to X]` · `hear [X]` | — | (`no_sound`, `silence` as the miss) |
| **smell** | `smell`/`sniff [X]` | — | `too_far` (`no_scent`, `no_particular_scent` as the miss) |
| **touch** | `touch`/`feel`/`rub`/`pat`/`stroke`/`poke`/`prod X` | reach | `not_reachable`, `not_visible` |

### examining and searching

Examining is trait-aware — a container reports its open state and
contents. Searching is the action that looks *inside* on purpose, and the
one that reveals `concealed` items; a closed openable refuses first.

The author writes:

<!-- fixture: examining-searching.story -->
```story
create the Study
  a room

  Book-lined walls and a smell of pipe smoke.

create the portrait
  aka painting
  scenery
  in the Study

  A stern woman in oils, following you with her eyes.

create the sea chest
  aka chest
  a container, openable, starts open
  in the Study

  A brass-bound sea chest.

create the ship's log
  aka log, logbook
  in the sea chest

  A salt-stained logbook.

create the player
  starts in the Study
```

The player sees:

<!-- transcript: examining-searching.story -->
```transcript
> examine the portrait
A stern woman in oils, following you with her eyes.

> examine the sea chest
A brass-bound sea chest.

In the sea chest you see a ship's log.

> close the sea chest
You close the sea chest.

> search the sea chest
The sea chest is closed.

> open the sea chest
You open the sea chest.

Inside the sea chest you see ship's log.

> search the sea chest
In the sea chest you see: a ship's log.
```

### listening and smelling

Pure flavor seams with no preconditions — the platform answers from what
things are: a running device hums, food smells like food, and the misses
(`no_sound`, `no_scent`) are honest rather than errors. Both are
favorites for `on listening it` / `on smelling it` clauses.

The author writes:

<!-- fixture: listening-smelling.story -->
```story
create the Bakery
  a room

  Floured counters and a cold brick oven.

create the wireless
  aka radio
  switchable
  in the Bakery

  A walnut-cased wireless set.

create the warm loaf
  aka loaf, bread
  edible
  in the Bakery

  A loaf fresh enough to fog its own crust.

create the player
  starts in the Bakery
```

The player sees:

<!-- transcript: listening-smelling.story -->
```transcript
> listen
You hear nothing out of the ordinary.

> turn on the wireless
The wireless hums to life.

> listen to the wireless
The wireless is making a soft humming sound.

> smell the warm loaf
The warm loaf smells delicious.

> smell
You smell food nearby.
```

## 6. Devices & tools

Things that switch on and off, and the three verbs whose *outcome*
belongs to the entity: cutting, digging, turning. Full entries:
`stdlib-reference.md` §7, §2.7–2.8.

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **switch on** | `turn`/`switch`/`flip on X` · `turn X on` · `activate`/`start X` · `power on X` | `switchable` | `already_on`, `no_power`, `not_switchable` |
| **switch off** | `turn`/`switch`/`flip off X` · `turn X off` · `deactivate`/`stop X` · `power off X` | `switchable` | `already_off`, `not_switchable` |
| **turn** | `turn`/`rotate`/`twist X` | per-entity behavior (dispatch) | `cant_turn_that` |
| **cut** | `cut X with`/`using Y` (no bare `cut X` in core grammar) | `cuttable` + exactly one cut implementation | `not_cuttable`, `no_tool`, `tool_not_held`, `wrong_tool` |
| **dig** | `dig X with`/`using Y` (no bare `dig X` in core grammar) | `diggable` + exactly one dig implementation | `not_diggable`, `no_tool`, `tool_not_held`, `wrong_tool` |

### switching on and off

All forms are parser-gated on `switchable`. A `light-source` that
switches on in a dark room banishes the darkness and describes the room;
switching the sole light off plunges you back.

The author writes:

<!-- fixture: switching.story -->
```story
create the Parlor
  a room
  dark

  Heavy curtains keep the Parlor in permanent dusk. A ceiling fan hangs
  overhead.

create the brass lamp
  aka lamp
  switchable, light-source
  in the Parlor

  A brass oil lamp converted to electricity.

create the ceiling fan
  aka fan
  switchable
  scenery
  in the Parlor

  A four-bladed ceiling fan.

create the player
  starts in the Parlor
  carries the brass lamp
```

The player sees:

<!-- transcript: switching.story -->
```transcript
> look
It's pitch dark, and you can't see a thing.

> turn on the lamp
Parlor
Heavy curtains keep the Parlor in permanent dusk. A ceiling fan hangs overhead.

The brass lamp switches on, banishing the darkness.

> switch on the lamp
The brass lamp is already on.

> activate the ceiling fan
The ceiling fan hums to life.

> power off the lamp
You switch off the brass lamp, plunging the area into darkness.
```

### cutting

The platform gates eligibility (`cuttable`) and validates the tool
(`with tool <entity>` — the same contract as lockable keys); the outcome
is the entity's own `on cutting it` clause, and exactly one
implementation is required at load. Note there is no bare `cut X` in the
core grammar — the tool is part of the phrasing.

The author writes:

<!-- fixture: cutting.story -->
```story
create the Bell Tower
  a room

  Dust, bird droppings, and one taut bell rope.

create the bell rope
  aka rope
  cuttable with tool the shears
  scenery
  in the Bell Tower
  states: taut, severed

  A rope as thick as your wrist, humming with tension.

  on cutting it
    change it to severed
    phrase rope-severed
  end on

create the shears
  in the Bell Tower

  Heavy tin shears.

create the butter knife
  aka knife

  A knife for butter, and butter only.

create the player
  starts in the Bell Tower
  carries the butter knife

define phrases en-US
  rope-severed:
    The shears bite through strand after strand until the rope parts with
    a crack. Somewhere above, the bell swings free.
```

The player sees:

<!-- transcript: cutting.story -->
```transcript
> cut the rope with the butter knife
The butter knife won't cut the bell rope.

> take the shears
Taken.

> cut the rope with the shears
The shears bite through strand after strand until the rope parts with a crack. Somewhere above, the bell swings free.
```

### digging

The same design as cutting, and the classic use: something buried. The
clause is the mutation — here `move` brings an off-stage entity into
play, and `, once` spends the discovery.

The author writes:

<!-- fixture: digging.story -->
```story
create the Strand
  a room

  Wet sand, low tide, and gulls arguing over the wrack line.

create the sandy patch
  aka sand, patch
  diggable with tool the spade
  scenery
  in the Strand

  A patch of sand a shade darker than the rest.

  on digging it, once
    move the scarab to the Strand
    phrase sand-yields
  end on

create the spade
  in the Strand

  A short garden spade.

create the scarab
  aka beetle

  A faience scarab, blue as a kingfisher.

create the seashell
  aka shell

  A scallop shell, pretty and useless.

create the player
  starts in the Strand
  carries the seashell

define phrases en-US
  sand-yields:
    Two spadefuls down, the blade rings against something small and hard.
    You lift out a faience scarab.
```

The player sees:

<!-- transcript: digging.story -->
```transcript
> dig the sand with the seashell
The seashell won't dig the sandy patch.

> take the spade
Taken.

> dig the sand with the spade
Two spadefuls down, the blade rings against something small and hard. You lift out a faience scarab.

> take the scarab
Taken.
```

### turning (a per-entity verb)

`turn`/`rotate`/`twist X` parse out of the box, but the platform refuses
to invent what turning *means* (`cant_turn_that`, ADR-090). An entity
claims the verb through the dispatch-action pattern — a `define action`
owns the verb, a trait's `on turning it` clause carries the behavior —
and everything else falls through to the action's own refusals, which
render from plain short keys on this path.

The author writes:

<!-- fixture: turning.story -->
```story
define action turning
  grammar
    turn :target
    rotate :target
    twist :target
  the target must be reachable
  refuse without target: turn-what
  otherwise refuse cant-turn

  phrases en-US
    turn-what:
      Turn what?
    cant-turn:
      That isn't something you can turn.

define trait stiff-valve
  states, reversible: shut, wide-open

  phrases en-US
    valve-opened:
      The wheel gives with a squeal of rust, and water hammers through the
      pipes below.
    valve-already-open:
      It's already open as far as it goes.

  on turning it
    it must be shut: valve-already-open
    change it to wide-open
    phrase valve-opened
  end on
end trait

create the Pump Room
  a room

  Pipes crowd every wall, all of them leading to one bronze valve.

create the bronze valve
  aka valve, wheel
  stiff-valve
  scenery
  in the Pump Room

  A wheel-valve the size of a dinner plate, painted bronze.

create the workbench
  aka bench
  scenery
  in the Pump Room

  A workbench bolted to the floor.

create the player
  starts in the Pump Room
```

The player sees:

<!-- transcript: turning.story -->
```transcript
> turn the workbench
That isn't something you can turn.

> turn the valve
The wheel gives with a squeal of rust, and water hammers through the pipes below.

> turn the valve
It's already open as far as it goes.
```

## 7. Social

The people a story writes, and the rougher interactions. Full entries:
`stdlib-reference.md` §8 (throwing: §2.5).

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **talk** | `talk to`/`with X` · `speak to`/`with X` · `chat with X` · `converse with X` | a person (checked in validate, not the parser) | `not_actor`, `too_far`, `self`, `not_available` |
| **ask** | `ask X about Y` · `question X about Y` · `inquire of X about Y` | a person; the topic must name something in scope | `not_actor`, `too_far`, `not_visible` (`unknown_topic` as the default reply) |
| **tell** | `tell X about Y` · `inform X about Y` | a person; topic as above | `not_actor`, `too_far`, `not_visible` (`not_interested` as the default reply) |
| **give** | `give`/`hand X to Y` · `give`/`hand Y X` · `offer X to Y` | recipient: `a person` | `not_actor`, `self`, `not_interested`, `inventory_full`, `too_heavy` |
| **show** | `show X to Y` · `show Y X` · `display`/`present X to Y` | recipient: `a person`, same room | `not_actor`, `self`, `viewer_too_far`, `not_carrying` |
| **attack** | `attack`/`kill`/`fight`/`slay`/`murder`/`hit`/`strike`/`break`/`smash`/`destroy X` · `attack`/`kill`/`hit`/`strike X with`/`using Y` | anything (combat needs `combatant` + an interceptor) | `self`, `not_reachable`, `not_holding_weapon` |
| **throw** | `throw`/`toss`/`hurl X at Y` · `throw`/`toss`/`hurl X to Y` | a visible target in the room | `self`, `too_heavy`, `target_not_here`, `not_holding` |

### giving and showing

Giving moves the item; showing is purely social. The recipient must be a
person — hand something to the furniture and the action tells you so.
The default NPC accepts anything; richer reactions are `on giving it` /
`on showing it` clauses on the item or the recipient.

The author writes:

<!-- fixture: giving-showing.story -->
```story
create the Gatehouse
  a room

  A stone arch, a brazier, and one unimpressed sentry.

create the sentry
  aka guard
  a person
  in the Gatehouse

  A sentry in a rain-dark cloak, eyes on the road.

create the brazier
  scenery
  in the Gatehouse

  An iron brazier, down to embers.

create the silver medallion
  aka medallion

  A silver medallion stamped with the garrison's crest.

create the player
  starts in the Gatehouse
  carries the silver medallion
```

The player sees:

<!-- transcript: giving-showing.story -->
```transcript
> give the medallion to the brazier
You can only give things to people.

> show the medallion to the sentry
You show the silver medallion to the sentry.

> give the medallion to the sentry
You give the silver medallion to the sentry.
```

### asking and telling

Deliberately minimal (ADR-230): the platform validates the social
preconditions and reports an interceptable default — asking's
`unknown_topic`, telling's `not_interested`. An `on asking it` clause on
the person is where real dialogue hooks in; note the topic slot must
name something in scope (`ask the hermit about the gull` parses; a topic
that matches nothing gets the parser's "can't see any such thing").

The author writes:

<!-- fixture: asking-telling.story -->
```story
create the Hermitage
  a room

  A driftwood hut above the tide line.

create the hermit
  a person
  in the Hermitage

  A weathered hermit mending a net.

  on asking it
    phrase hermit-answers
  end on

create the gull
  aka seagull
  a person
  in the Hermitage

  A herring gull with an air of officialdom.

create the player
  starts in the Hermitage

define phrases en-US
  hermit-answers:
    The hermit squints seaward. "Weather's turning. It always is."
```

The player sees:

<!-- transcript: asking-telling.story -->
```transcript
> ask the gull about the hermit
The gull says, "I don't know anything about that."

> ask the hermit about the gull
The hermit squints seaward. "Weather's turning. It always is."

> tell the gull about the hermit
The gull doesn't seem interested.
```

### attacking

Real combat is the `combatant` trait plus a combat interceptor
(TypeScript today — `stdlib-reference.md` §8.2). What a `.story` file
does have is the reaction seam: an `on attacking it` clause whose phrase
replaces the standard reply.

The author writes:

<!-- fixture: attacking.story -->
```story
create the Training Yard
  a room

  Packed dirt and a straw dummy on a post.

create the training dummy
  aka dummy
  scenery
  in the Training Yard

  A straw man on a post, much abused.

  on attacking it
    phrase dummy-thud
  end on

create the player
  starts in the Training Yard

define phrases en-US
  dummy-thud:
    You catch the dummy square in the chest. It rocks back on its post,
    then swings around to face you again, unimproved.
```

The player sees:

<!-- transcript: attacking.story -->
```transcript
> attack me
Violence against yourself isn't the answer.

> hit the training dummy
You catch the dummy square in the chest. It rocks back on its post, then swings around to face you again, unimproved.
```

### throwing

The one dice-rolling action in this document — where a thrown thing
lands is probabilistic by design (and per project policy the dice stay
live). Thrown at an open container, a hit lands inside; the miss line is
the other genuine outcome you may see.

The author writes:

<!-- fixture: throwing.story -->
```story
create the Courtyard
  a room

  A cobbled courtyard with a rain barrel under the downspout.

create the rain barrel
  aka barrel
  a container
  scenery
  in the Courtyard

  An open rain barrel, half full.

create the horseshoe
  in the Courtyard

  A lucky horseshoe. Allegedly.

create the player
  starts in the Courtyard
```

The player sees:

<!-- transcript: throwing.story -->
```transcript
> take the horseshoe
Taken.

> throw the horseshoe at me
You can't throw things at yourself.

> throw the horseshoe at the rain barrel
The horseshoe lands in the rain barrel.
```

## 8. Meta

Free with every story; no traits, no interceptors, no worked examples
needed. Full entries: `stdlib-reference.md` §10.

| Action | Phrasings | Needs | Refuses with |
|---|---|---|---|
| **inventory** | `inventory` · `inv` · `i` | — | — |
| **wait** | `wait` · `z` | — | — |
| **sleep** | `sleep` · `nap` · `doze` · `rest` · `slumber` | — | — |
| **score** | `score` · `points` | — | `no_scoring` |
| **help** | `help` · `?` · `commands` | — | — |
| **about** | `about` · `info` · `credits` | — | — |
| **version** | `version` | — | — |
| **save** | `save` · `save game` | a client save hook | `save_not_allowed`, `save_in_progress` |
| **restore** | `restore` · `load` · `load game` · `restore game` | a client restore hook | `restore_not_allowed`, `no_saves` |
| **restart** | `restart` | — | — |
| **quit** | `quit` · `q` · `exit game` | — | — |
| **undo** | `undo` | a prior substantive turn | `nothing_to_undo`, `undo_failed` |
| **again** | `again` · `g` | a repeatable last command | `nothing_to_repeat` |

## Appendix: what this document leans on

- **`stdlib-reference.md`** — the full catalog this phrasebook indexes:
  check order, success keys, events, traits, and the honest platform
  notes.
- **`chord-language.md`** — the `.story` language the "author writes"
  halves are written in.
- **`docs/work/stdlib-phrasebook/`** — the fixtures and the
  `verify.mjs` harness that replays every transcript above against the
  real engine. If the engine's words change, verification fails and this
  document gets refreshed — that is the drift protection.
