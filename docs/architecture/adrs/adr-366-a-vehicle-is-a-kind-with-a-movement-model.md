# ADR-366: A vehicle is a kind with a movement model

**Status**: **ACCEPTED** (David, 2026-10-13, session 326e9e: "yes", after the open questions interview resolved all six questions and `adr-review` returned 21/21 with six folds applied, none changing a decision. Written the same day on `chord-4-0`, at Phase 2 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`, the first of the two design gates the Chord 4.0 objective (`docs/objectives/chord-4-0.md`, O-2) sets before any vehicle code. Supersedes ADR-350, which recorded the design space as research on 2026-09-14 and was rescheduled by the objective on 2026-10-12. The open questions interview ran the same day and resolved all six (Q-1 → D2, Q-2 → D5e, Q-3 → D7, Q-4 → D5a and D5f, Q-5 → D5d, Q-6 → D7a), so there is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. No implementation is authorized in any state, and every `packages/` change below is gated on its own discussion at its plan phase. The measurements in Context were re-taken today.)

**Scope**: `packages/chord` (the `vehicle` kind, the movement-model lines, the `admits` line, the outside exit, the vehicle statements and conditions, `chord.ebnf`), `packages/story-loader` (the lowering of each), `packages/world-model/src/traits/vehicle/` (the model rewritten to carry only what the language says), `packages/world-model/src/world/VisibilityBehavior.ts` (the enclosure rule), `packages/stdlib` (`going`, `entering`, `exiting`, and the vehicle actions), `packages/parser-en-us` (`board`, `disembark`, `steer`, `heave to`, `set course`), `packages/lang-en-us` (the vehicle messages), `packages/plugin-state-machine` (the per-turn tick of the vehicle's machine, D5e), `stories/dungeo` (the bucket, balloon and boat moved onto the rewritten model), `branch-stories/upps` (the four conveyances).

## Date: 2026-10-13

**Kind**: technical

## Parent

- **ADR-350** (vehicles in Chord, research). **Superseded in full.** Its measurements stand and are re-taken below; its seven Open Questions are each answered by a decision here (the map is in Consequences). Its **D7**, motion as a `define machine` and nothing else, is explicitly replaced by D5: motion is a declared movement model, and a machine or sequence is one of the things that may drive it, never the mechanism itself. Its recommendation of a gated extension is not taken, for the reason D1 gives.
- **ADR-349** (the location heading). **D4a** and **D5** read "a transparent vehicle" and "an opaque vehicle" off `VehicleTrait.transparent`; under D3 here they read the same facts off the enclosure rule, and their text is amended in place (see Consequences). AC-4 and AC-8 there, the bucket cases, become writable in Chord, which is what ADR-350 said they were waiting for.
- **ADR-215** (extensions, `define machine`). Unchanged. A machine remains a story-owned state machine; it may carry a vehicle statement in an `on enter` body exactly as it carries any statement.
- **ADR-325** (`here` as a place, D1; `offstage`, D2). Both stand, and the `move` statement they ride is shipped grammar that predates them. D4 here adds one fact to `move`: moving a vehicle moves what it holds. No new statement is needed for the story-driven case.
- **ADR-360** (regions declare their rooms) and **ADR-362** (room blocks fold). The `admits` line rides a room, a `rooms` group or a region, by the same ownership rule a region's `exits` table uses.
- **ADR-218 §1a** (`enterable` is always explicit). A `vehicle` is a kind, not an adjective, so this is not weakened: `a vehicle` composes enterability the way `a container` composes containment, and `enterable` on a vehicle is `analysis.vehicle-already-enterable`.
- **GH #466** (the feature). Scheduled by this record; its two bug notes (the lidless container and the heading/status divergence) are closed by D3 and were partly closed by ADR-349 D3a already.

## Context — measured, not assumed

### What the platform has (re-measured 2026-10-13)

`VehicleTrait` (`packages/world-model/src/traits/vehicle/vehicleTrait.ts`) carries eight fields. Their readers, measured 2026-10-13 with `grep -rn "canActorWalkInVehicle\|canActorLeaveLocation\|canVehicleMove\|moveVehicle\|VehicleTrait\|TraitType.VEHICLE" packages/*/src stories/*/src --include='*.ts'`, excluding `*.test.*` and the trait's own directory (39 lines returned; each is in the table or the paragraph after it):

| Field | Reader | Reached by |
| --- | --- | --- |
| `transparent` | `getDescribableLocation` (`VisibilityBehavior.ts:569-571`) | every look |
| `blocksWalkingMovement` | `canActorWalkInVehicle` | `going.ts:102, 268` |
| `positionRooms`, `currentPosition` | `moveVehicle`; Dungeo `fill-action.ts:137-164`, `balloon-daemon.ts:77, 231`, `tie-action.ts:125, 239` | story code only |
| `requiresExitBeforeLeaving` | `canActorLeaveLocation` | nothing |
| `isOperational`, `notOperationalReason` | `canVehicleMove` | nothing |
| `vehicleType` | Dungeo `fill-action.ts:139` (`=== 'counterweight'`), `launch-action.ts:43` | story code only; selects no platform behavior |
| `movesWithContents` | nothing | declared `readonly true`, so it is the one invariant and not a field |

Three further places know the word: `if-entity.ts:647` folds `VEHICLE` into "enterable"; `container-utils.ts:59` treats a vehicle as a holder; `deadly-room-transformer.ts:53` checks it. Dungeo's `inflatable-entering-interceptor.ts:138` removes the trait from a deflated boat.

So ADR-350's finding holds: the model is half-wired. Two fields are read on ordinary turns, two are a position record kept for story code, three are inert, and one selects nothing. The three transporting objects in Dungeo use three mechanisms: the bucket and balloon carry the trait and move by story calls to `moveVehicle`; the boat gains the trait when inflated and is moved by `launch-action.ts`; the coal-mine basket has no trait and moves by capability dispatch.

### What the language has

Chord has `container`, `supporter` (kind nouns, `catalog.ts:28-29`) and `enterable` (adjective, `:47`). It has no `vehicle`, and no exit whose destination depends on state (`exit = DIRECTION "to" name [ "through" name ]`, `chord.ebnf:1059`). The `move` statement (`chord.ebnf`, ADR-325) relocates one entity and nothing it holds. `define sequence` (`:1207`) and `define machine` (`:1218`) are the two declared ways a story advances state over turns.

### What the stories need

The objective names four conveyances, each written today as something other than a vehicle:

| Conveyance | Story | Today | Movement |
| --- | --- | --- | --- |
| The well-room bucket | Dungeo | `VehicleTrait` plus `BucketTrait`, moved by `fill-action.ts` | two stops, driven by water weight |
| The Sparrow | UPPS | a scenery thing with `states: buttoned, boarding, underway, landed`; its interior is eight ordinary rooms; one fixed hull opening per world, each blocked off its leg (`upps-design-20261012.md` "The ship and its three doors") | free flight to a chosen destination, arriving after a fold |
| The tram car | UPPS | planned as a room (region D, "Tram Car") with a `define sequence` on the car's state | one line, two ends, both ways, driven by the brake and the clerk's call |
| The drop shuttle | UPPS | planned as a room (region G) with states `docked-high, dropping, docked-low, rising` | one line, two ends, both ways, with a window phrase on the way down |

The design doc's own words on the Sparrow are the gap in one sentence: *"Chord has no vehicle and no exit whose destination varies with state (ADR-350). So the Sparrow gets one fixed hull opening per world, each blocked off its leg."* Three airlocks standing in for one ship that moves.

The objective names four movement models, with the Sparrow, the tram, a tall ship and a street car as the cases. Two of the four conveyances above are lines. The other two models have no story written against them yet, and this record gives each a corpus-style example so the shape is decided before a story needs it, which is the obligation `feedback_language_design_needs_full_code_example` records.

### The invariant this record keeps

ADR-350 D2 stated it and nothing since has weakened it: **a word an author can write must change what the game does.** Every line, statement and condition below names its platform reader, and AC-2 keeps a test on each. A field with no reader is retired rather than exposed; a reader with no word stays platform-only.

## Decision

**D1 — `vehicle` is a kind noun, native to the catalog, not an extension.** `a vehicle` joins `thing`, `room`, `door`, `person`, `container`, `supporter`, `region`. ADR-350 recommended a `use vehicles` gate on the ground that motion is opt-in mechanics; three things changed. The objective makes the vehicle an object type of the language with full capability, which is the sentence that describes a kind. The `going` action already refuses to walk out of a vehicle in every story, gated or not, so the platform behavior a gate would scope is already unscoped. And every extension today contributes adjectives and blocks to things that exist; none contributes a kind, and a vehicle is a kind, because it decides what the player is *in* on every turn, which is what `container` and `supporter` decide. A vehicle is enterable by construction (ADR-218 §1a is unaffected: the kind composes `EnterableTrait` as `container` composes `ContainerTrait`, and writing `enterable` beside it is `analysis.vehicle-already-enterable`).

**D2 — A vehicle holds the player in or on it, and the kind says which** (David, 2026-10-13, Q-1: "a", `ridden` as the adjective and "in" as the default). A vehicle is a container of its passengers and cargo by default: the player is *in the car*, *in the bucket*, *in the tram*. A vehicle the player sits on top of, a raft, a bicycle, a horse, carries the adjective `ridden`: the player is *on the raft*. The two lower to the same `VehicleTrait` with one field, `holds: 'in' | 'on'`, read by `entering`, `exiting`, the room description's "in the bucket" / "on the raft" enclosure part, and `getDescribableLocation` (a ridden vehicle is an open enclosure by definition). `ridden` is legal only on a vehicle (`analysis.ridden-not-vehicle`). This answers ADR-350's second author question in full: what may be put inside is `container` behavior the vehicle kind composes, and `holds <n>` (plan Phase 4) bounds it exactly as it bounds any container.

**D3 — Seeing out is the enclosure's rule, and a vehicle has no transparency field.** `getDescribableLocation` branches on `VEHICLE` before `CONTAINER` and the two branches read a different flag to answer one question, whether the player can see out (ADR-350, "The opaque case decides it"). The two branches collapse into one rule over any enclosure the player is in: **the player sees out when the enclosure is open, or transparent, or ridden; otherwise the enclosure is the place.** `VehicleTrait.transparent` is retired. A bucket (no `openable`) is open, so the player sees the well room. A car (`openable`, closed, `transparent`) shows the street through its windows. A sealed tube (`openable`, closed, not `transparent`) is the place. The coal-mine basket, a lidless container, sees the Shaft Room, which closes the first bug GH #466 notes. The rule is measured against the Dungeo chain before it ships (AC-3), which is ADR-350's Q2a.

**D4 — Moving a vehicle moves what it holds, always, and `move` learns it.** `movesWithContents` was declared `readonly true` and read by nothing because it was never a choice. It becomes the platform fact: `WorldModel.moveEntity` on an entity with `VehicleTrait` relocates the vehicle and every entity it holds, at every depth. `moveVehicle` is retired as a separate function because it no longer does anything `moveEntity` does not. In Chord, `move the bucket to the Well Bottom` (the shipped `move` statement) therefore carries the player sitting in it, with no new statement and no binding line. This answers ADR-350's Q4 with its first candidate, and the risk it named (a story that moves a vehicle deliberately without its passengers) is accepted: a story that wants the passengers left behind moves them out first, in words, which is what it would have to mean.

**D5 — Motion is a declared movement model, one line in the vehicle block, and ADR-350 D7 is superseded.** The author chooses how the vehicle moves by writing one of four lines. Each lowers to a field on `VehicleTrait` with a platform reader; each decides what GO means from inside; each has a shipped way for the story to drive it and, where the model admits it, a way for the player to. A vehicle with no model line does not move and GO from inside is refused (`vehicle-cannot-walk`): a bathtub, a crate the player can sit in.

**D5a — The line: `runs between <Room> and <Room> { and <Room> }`, or `runs from <Room> to <Room> { to <Room> }` for one direction.** The stops are ordered. `continue <vehicle>` steps one stop along the line and `reverse <vehicle>` steps one back (David, 2026-10-13, Q-4: "I don't like onward, but continue might be okay"; `reverse` is the session's pairing, open to renaming); `reverse` on a `runs from` line is `analysis.line-one-way`, and a step past the last stop refuses with `vehicle-at-end`. `move <vehicle> to <Room>` must name a stop (`analysis.not-a-stop`). GO from inside is refused with `vehicle-ride`: the player rides, the story drives. Conditions: `<vehicle> is at <Room>`. This is the bucket, the tram, the drop shuttle, and Dungeo's balloon and river boat.

**D5f — How a vehicle is driven is one pair of statements and one pace line, the same for every model** (David, 2026-10-13, Q-4: "some vehicles will require explicit acceleration or movement while some move on each turn or on a schedule"). `start <vehicle>` puts its machine (D5e) under way and `stop <vehicle>` takes it out; while under way it steps at its pace, `every <n> turns` in the vehicle block, default each turn, and a line vehicle stops by itself at the line's end. A vehicle the story never starts moves only by the explicit statements (`continue`, `reverse`, `move to`): the bucket. A vehicle the player accelerates has `start` and `stop` bound to whatever the player does, a lever, a topic, a `drive` verb the story defines: the tram. The compass's `steer <direction>` is `start` with a heading and `heave to` is `stop`; free flight's `send <vehicle> to <Room>` is `start` with a destination. So the four models share one machine, one pace and one pair of statements, and differ only in what a step is: the next stop, the exit in the heading, the exit the player names, or the destination after `n` turns.

**D5b — The streets: `drives on <Region or Room> { and <Region or Room> }`, or `drives where admitted`.** The player steers by GO: from inside, `go north` moves the vehicle along the current room's north exit when the destination admits it (D6), carrying everyone; a destination that does not admit it refuses with `vehicle-cannot-go` and names nothing (the author's prose, not the platform's, says the alley is too narrow). One exit per command. The vehicle never moves on its own. Walking out is `out` / `exit`, never GO. This is a car, a bicycle, a cart.

**D5c — The compass: `steered by compass`.** The vehicle has a heading. `steer <direction>` (a new stdlib action, `steering`, with `set course <direction>` as a synonym) sets it; `go <direction>` from inside is the same action, so the two gestures mean one thing. On each later turn the vehicle moves one room in its heading while the exit that way exists and admits it; when it cannot, it stops and `vehicle-stopped` is emitted once. `heave to` / `stop` clears the heading. The story drives it with `set the <vehicle>'s heading to <direction>` and `stop the <vehicle>`; the condition `<vehicle> is under way` is true while a heading is set. This is a tall ship, a barge on a canal, anything that keeps going until told otherwise.

**D5e — Automated motion is the vehicle's own built-in state machine, secondary to the vehicle** (David, 2026-10-13, Q-2: "automated movement has to be secondary to the vehicle - like a built in state machine"). A vehicle with a model that moves over turns (the compass, D5c; free flight, D5d) does not get a daemon beside it. The model is a platform state machine the vehicle owns, in the shape ADR-215's `define machine` already gives a story: states `at stop` / `under way` / `stopped`, a per-turn transition that steps the vehicle while under way, and the author's statements and the player's actions as its triggers. The vehicle is the thing; the machine is one of its parts, as `OpenableTrait.isOpen` is a part of a door. The author never declares the machine, never names its states, and reads it only through the shipped conditions (`is under way`, `is at <Room>`) and the shipped anchor (`when the <vehicle> becomes under way`). Ticking it is the engine's turn cycle, in the state-machine turn plugin (`packages/plugin-state-machine`, priority 75 in ADR-215's plugin order) where ADR-215 machines are already advanced, not a scheduler daemon the loader installs. The line and street models carry the same machine with no per-turn transition, so every model is one shape with one field set, and D8's "nothing else" on `VehicleTrait` holds: `model` is the machine's declaration and the machine's state is the trait's transient state.

**D5d — Free flight: `flies between <Room> and <Room> { and <Room> }` with `passage takes <n> turns`.** The stops are destinations, not a line: any to any. `set course for <Room>` (the `setting-course` action, from inside, naming a stop) and the statement `send <vehicle> to <Room>` both put the vehicle *under way*: it leaves its room and is nowhere for `n` turns, then arrives (David, 2026-10-13, Q-5: "a", nowhere rather than a transit room; a story that wants somewhere to be during the voyage writes a line with a middle stop). While under way, its outside exits (D7) refuse with `vehicle-under-way`, and `<vehicle> is under way` is true; `<vehicle> is at <Room>` is false everywhere. `passage takes` is required on this model (`analysis.flight-no-passage`); a story that wants the fold narrated writes a `define sequence` anchored on `when the <vehicle> becomes under way`, which is the shipped anchor form. This is the Sparrow, a lift between floors with doors that close, a teleport booth.

**D5g — The machine's state is plain data on the trait, so a voyage survives a save.** Heading, destination, turns remaining and whether the vehicle is under way are fields on `VehicleTrait`, serialized with every other trait field by `IFEntity.toJSON` and restored by the trait rehydrator, which already handles core trait types. No closure, registry or daemon holds any of it, so a save taken mid-passage restores a Sparrow that arrives on schedule and a Marigold still on its heading (ADR-348: the world is authoritative on restore). This is the reason D5e chose a trait-resident machine over a scheduler daemon, beside the one David gave.

**D6 — A room, a `rooms` group or a region says which vehicles it admits.** The line is `admits <vehicle> { , <vehicle> }`. It is read by D5b and D5c when deciding whether a move may land there, and by nothing else: a line vehicle's stops admit it by being its stops, and a free-flight vehicle's destinations likewise. A region's `admits` reaches every member room (ADR-360's ownership rule for the `exits` table). A `drives on <Region>` line is sugar for `admits` on that region and is reported as a duplicate if both are written (`analysis.admits-duplicate`). The default is that a room admits no vehicle, which is the safe default and the one a street map needs: the alley the car cannot take is the room with no `admits`.

**D7 — A vehicle may have rooms aboard, and an exit inside it may lead outside.** A vehicle block may carry `aboard: <Room> { , <Room> }`. Those rooms are the vehicle's interior: the player in one of them is aboard the vehicle for every purpose above (D4 moves them when the vehicle moves, D5 models apply, D3's enclosure part is not shown because the room is the place). The vehicle itself is then not entered; `enter the Sparrow` from its current room is `going` to the first room listed, through the opening the author names with `boarded through <Room>` (default: the first room). **The player's verbs are the ship's** (David, 2026-10-13, Q-3: "thinking about ships, you board most of the time, but enter might be acceptable in many cases. You also disembark or exit"): `board <vehicle>` is a synonym of `enter`, and `disembark` of `exit` and `out`, both in parser-en-us grammar on the existing `entering` and `exiting` actions, not new actions, and **both only for a vehicle with rooms aboard** (David, Q-3 follow-up: "'board' is for ships only"): a bucket, a car or a bicycle is entered and exited, and `board the bucket` refuses with `vehicle-not-boardable` (a stock line, Q-6). On a vehicle with rooms aboard, `exit` / `disembark` / `out` in the boarding room takes the `to outside` exit; elsewhere aboard they refuse with `vehicle-not-at-hatch`, naming nothing. Inside, the one exit production gains a destination word: `<direction> to outside` (`exit = DIRECTION "to" ( name | "outside" ) [ "through" name ]`), legal only in a room some vehicle lists aboard (`analysis.outside-not-aboard`), and resolved on each use to **the vehicle's current room**. That is the state-dependent exit destination the Sparrow needed, with no state and no condition: *west to outside* from the Airlock lands on pad 14 at Ceres and in the Collar Vestibule at Titan because the ship is there. A `through` door on it works as on any exit. ADR-350 had no answer here because it had no multi-room case; UPPS supplied one.

**D7a — Every vehicle refusal carries a stock line** (David, 2026-10-13, Q-6: "a"). `vehicle-ride`, `vehicle-cannot-go`, `vehicle-stopped`, `vehicle-under-way`, `vehicle-at-end`, `vehicle-not-at-hatch` and `vehicle-not-boardable` each ship with a line in lang-en-us, overridable through `override message` as every stdlib message is, so a vehicle plays before its prose is written. The stock lines name no entity the author did not, and never explain the world's reason (the alley is narrow in the Alley's prose, not in the refusal).

**D8 — The inert fields are retired, not exposed.** `blocksWalkingMovement` and `requiresExitBeforeLeaving` are what the movement model decides (D5: a line or model-less vehicle refuses GO; streets and compass make GO steer; walking out is always `exit`), so both go. `isOperational` and `notOperationalReason` are an author condition, written as the story writes every other guard (`refuse when the balloon is not inflated: balloon-flat` on the action that would move it), so both go. `vehicleType` selected nothing and goes. `positionRooms` and `currentPosition` are the line model's stops and the vehicle's actual location, so both go; Dungeo's three readers move to the model's API in the same change (Consequences). What remains on `VehicleTrait` is exactly the set of fields the language can write: `holds`, `model` (with its stops, heading, destination and passage), and nothing else.

**D9 — The vehicle's own location is the one fact, read, never copied.** Where a vehicle is, which stop it is at, whether it is under way, are derived from `world.getLocation(vehicle)` and the model's transient state. No story state mirrors them (ADR-347 and ADR-348's rule against a second record of one fact). The UPPS `states: buttoned, boarding, underway, landed` on the courier ship become, under this record, the platform's `is at <Room>` and `is under way`, plus whatever authored state the hatch sequence still needs (`boarding` is authored; `underway` and `landed` are not).

**D10 — Every word has a reader and a test, and the three story-side mechanisms converge on the model.** AC-2 is the self-policing gate from ADR-350 carried forward. Dungeo's bucket and balloon are rewritten onto D5a's API (`moveOnward`/`moveBack` and `move to a stop`), the boat onto D5a as well (the river is a line the current advances), and the coal-mine basket is left as it is: ADR-350 D5's ruling that a lidless fixed container that transports is a modelling question stands, and Dungeo is not a Chord design input. Each is measured by the chain, not argued.

## The language, as an author reads it

Every line below is **unshipped syntax** proposed by this record; nothing here compiles today.

### The bucket (a line, two stops, story-driven)

```chord
create the bucket
  a vehicle
  in the Top of the Well
  runs between the Top of the Well and the Well Bottom
  aka pail

  A wooden bucket on a rope, big enough to stand in.

  room name
    in the bucket

create the Top of the Well
  a room
  admits nothing

  after the player filling the bottle from the bucket
    move the bucket to the Well Bottom when the bucket is at the Top of the Well
  end after
```

The bucket is open (no `openable`), so D3 shows the well room around it and the heading reads "Top of the Well, in the bucket" (ADR-349 D5). `move` carries the player (D4). `admits nothing` is not a line; it is the default and is written here only to say so.

### The tram (a line, two ends, both ways, driven by the brake and a sequence)

```chord
create the tram car
  a vehicle
  in the Tram Platform
  runs between the Tram Platform and the Tram Terminus
  states: braked, rolling
  aka car, tram, open car

  A single open car on two rails, with a brake lever at one end.

  room name
    in the tram car

create the brake lever
  a thing, scenery
  in the tram car

  on the player pulling
    refuse when the pad master is unconvinced: quint-blocks
    start the tram car
  end on

define sequence the tram ride
  when the tram car becomes under way
  3 turns later
    phrase tram-halfway
end sequence
```

Started, the car steps each turn and stops by itself at the Terminus (D5f); the `states: braked, rolling` line is not needed, because `under way` is the platform's fact. The clerk's call back is `reverse the tram car` under the clerk's button. GO from inside is refused with `vehicle-ride` ("You're riding, not walking."); the player gets out with `out`.

### The Sparrow (free flight, rooms aboard, an exit to outside)

```chord
create the Sparrow
  a vehicle, openable
  in the Loading Dock
  flies between the Loading Dock, the Landing Pad, the Collar Vestibule and the Docking Tube
  passage takes 5 turns
  aboard: the Hold, the Cockpit, the Airlock, the Galley, the Bunk, the Engine Bay
  boarded through the Airlock
  aka ship, courier, sparrow

  A snub-nosed UPPS courier, dented along one flank where some asteroid
  got the last word.

create the Airlock
  a room
  east to the Hold
  west to outside through the outer hatch
  aka lock, port lock

  A closet of a room in the Sparrow's port side, big enough for one
  carrier in a suit and not much else.

create the outer hatch
  a door, openable
  in the Airlock

  on the player opening
    refuse when the Sparrow is under way: hatch-into-the-fold
  end on

create the route card
  a thing, readable
  states: ceres-leg, titan-leg, kepler-leg, route-empty

create the course plotter
  a thing, scenery
  in the Cockpit

  on the player pushing
    refuse when the outer hatch is open: plotter-hatch-open
    send the Sparrow to the Landing Pad when the route card is ceres-leg
    send the Sparrow to the Collar Vestibule when the route card is titan-leg
    send the Sparrow to the Docking Tube when the route card is kepler-leg
  end on

define sequence the fold
  when the Sparrow becomes under way
  5 turns later
    phrase fold-ends
end sequence
```

One ship, one hull opening, three worlds. The design doc's three airlocks and three per-leg blocks are gone; the leg is still the route card's state, and the plotter reads it. `west to outside` from the Airlock is pad 14 at Ceres and the Collar Vestibule at Titan because the Sparrow is there, and refuses with `vehicle-under-way` during the fold.

### The drop shuttle (a line with a window phrase)

```chord
create the drop shuttle
  a vehicle, openable
  in the Shuttle Gate
  runs between the Shuttle Gate and the Kraken Landing
  every 4 turns
  aka shuttle

define sequence the drop
  when the drop shuttle becomes under way
  2 turns later
    phrase shuttle-window
end sequence
```

### A tall ship (compass; no story has one yet)

```chord
create the Marigold
  a vehicle, openable, transparent
  in the Harbour
  steered by compass
  aka ship, barque

  A three-masted barque with a wheel aft and a cabin you can see the
  sea from.

create the Northern Sea
  a region
  admits the Marigold
  rooms Open Water 1 to 12
    Grey water to every horizon.
  exits
    Open Water 1: north to Open Water 2, east to Open Water 5
    ...

create the Reef
  a room

  The Marigold's keel would not clear it.
```

From inside, `steer north` or `go north` sets the heading; each turn the Marigold moves one room north while the way is admitted; at the Reef, which admits nothing, it stops with `vehicle-stopped`. `heave to` clears the heading.

### A street car (following the ways that admit it; no story has one yet)

```chord
create the bicycle
  a vehicle, ridden
  in the Yard
  drives on the Streets
  aka bike

create the Streets
  a region
  admits the bicycle
  rooms High Street 1 to 4

create the Alley
  a room

  Too narrow for anything on wheels.
```

On the bicycle, `go north` moves it one exit when the destination admits it; into the Alley it refuses with `vehicle-cannot-go` and the Alley's own prose says why. The player is *on the bicycle* (D2), so they see the street around them.

## Acceptance Criteria

Each is discharged by a test named in its plan phase; none is discharged by this record.

1. **AC-1 (D1, D5a, Phase 11).** The well-room bucket is written in Chord as above, compiled, and played through an assembled engine: the player enters it at the top, the story moves it, and the player is at the Well Bottom with the bucket. **REAL-PATH** (rule 13a).
2. **AC-2 (D8, D10, every phase).** For every field the Chord surface writes to `VehicleTrait`, a test exists that fails when the platform stops reading it. **MECHANICAL, self-policing.** A field with no such test is not admitted; this is ADR-350's AC-2 carried forward unchanged.
3. **AC-3 (D3, Phase 10).** The enclosure rule replaces the two branches of `getDescribableLocation`, and the Dungeo walkthrough chain is byte-identical at the pinned seed before and after. A difference is a finding on the rule, reported to David, never absorbed.
4. **AC-4 (D4, Phase 10).** `move` of a vehicle in a Chord story relocates every held entity at every depth, asserted on `world.getLocation` for each, including a thing inside a container inside the vehicle.
5. **AC-5 (D5a–D5d, Phases 11 and 12).** Each model has one Chord fixture story exercising its driving statement, its player gesture where it has one, its refusal, and its condition; the UPPS tram, drop shuttle and Sparrow are the line and free-flight fixtures (Phase 14); the compass and street fixtures live under `packages/*/tests` stories, never in a real story (`feedback_test_story_isolation`).
6. **AC-6 (D7, Phase 14).** The Sparrow's Airlock reaches pad 14 and the Collar Vestibule through one `west to outside` line, on two legs of one UPPS test line, and refuses during the fold.
7. **AC-7 (D8, Phase 10).** `VehicleTrait` carries no field the language cannot write, measured by diffing its declared fields against the loader's lowering; Dungeo compiles and its chain passes with the retired fields gone.
8. **AC-8 (D6, Phase 12).** A street vehicle refuses an exit into a room with no `admits`, and takes the same exit once the room, or its region, admits it.

## Consequences

- **ADR-350 is superseded, and the flip has an owner.** The session that flips this record ACCEPTED stamps ADR-350's Status `SUPERSEDED by ADR-366` and amends ADR-349 D4a and D5 in the same commit; until then ADR-350 reads RESEARCH and this record reads DRAFT, so no reader meets two live answers. Its seven questions resolve: Q1 native (D1); Q2 the enclosure rule (D3), Q2a measured (AC-3); Q3 all five inert or redundant fields retired (D8); Q4 `move` carries contents (D4); Q5 `positionRooms` retired for the line's stops (D5a, D8); Q6 `holds <n>` on the container composition, which Phase 4 lands (D2); Q7 the model decides GO (D5).
- **ADR-349 D4a and D5 are amended in place**: "transparent vehicle" and "opaque vehicle" become "an enclosure the player sees out of" and "one they do not", by D3's rule; nothing about the heading's composition changes.
- **Dungeo changes, and the chain is the gate.** The bucket, balloon and boat move onto the line model's API; `fill-action.ts`, `balloon-daemon.ts`, `tie-action.ts`, `launch-action.ts`, `inflate-action.ts`, `well-room.ts` and `volcano.ts` lose every retired field. The coal-mine basket does not change. Any rendered-text change is reported to David as its own decision (`feedback_default_flips_are_content_changes`).
- **UPPS is rewritten where the design doc wrote around the gap**: three hull openings become one, the courier ship's `underway` and `landed` states become platform facts, the tram car and drop shuttle become vehicles rather than rooms. The design doc's "The ship and its three doors" section is superseded by D7 and says so.
- **The catalog grows by one kind noun and one adjective (`ridden`), the grammar by four model lines, `admits`, `aboard`, `boarded through`, `passage takes`, `every <n> turns`, the `outside` destination, and the statements `start`, `stop`, `continue`, `reverse`, `send`, `set heading`.** Each is a grammar change under `docs/architecture/chord-grammar-changes.md` and lands in the phase that implements it, with its EBNF row and guide page.
- **parser-en-us gains `board` on `entering` and `disembark` on `exiting`** (D7); **stdlib gains two actions** (`steering`, `setting-course`) and three vehicle refusals in `going` (`vehicle-ride`, `vehicle-cannot-go`, `vehicle-cannot-walk`), with the messages in lang-en-us; `entering` and `exiting` read `holds`.
- **Movement over turns is the vehicle's built-in machine (D5e), ticked by the engine's turn cycle** where ADR-215 machines are advanced: the compass model steps once per turn while under way, and free flight arrives after `n` turns. No per-vehicle daemon is installed; Dungeo's balloon daemon is replaced by the model, not wrapped by it. The plan's Phase 10 names the engine seam.
- **Plan phases 10 to 14 implement this record** in the order the plan gives: enforcement and the enclosure rule, the kind and the line, streets and compass with `admits`, the free-flight and `outside` work with UPPS as the fixture. Every `packages/` phase is discussed at its checkpoint.

## Session

Session 326e9e, 2026-10-13, on `chord-4-0`, at Phase 2 of the Chord 4.0 plan, written after David's "proceed" with his reminder that every platform and Chord change in this slice is aligned and elegant with no hacks or shortcuts. The measurements in Context were re-taken this session over `packages/*/src` and `stories/*/src`, and the UPPS cases are from `docs/work/author-narrative-testing/upps-design-20261012.md` and `branch-stories/upps/upps.story` as they stand today.
