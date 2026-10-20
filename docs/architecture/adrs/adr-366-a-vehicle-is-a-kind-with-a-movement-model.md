# ADR-366: A vehicle is a kind with a movement model

**Status**: **ACCEPTED** (David, 2026-10-13, session 326e9e: "yes", after the open questions interview resolved all six questions and `adr-review` returned 21/21 with six folds applied, none changing a decision. Written the same day on `chord-4-0`, at Phase 2 of `docs/work/chord-4-0/plan-20261013-chord-4-0.md`, the first of the two design gates the Chord 4.0 objective (`docs/objectives/chord-4-0.md`, O-2) sets before any vehicle code. Supersedes ADR-350, which recorded the design space as research on 2026-09-14 and was rescheduled by the objective on 2026-10-12. The open questions interview ran the same day and resolved all six (Q-1 → D2, Q-2 → D5e, Q-3 → D7, Q-4 → D5a and D5f, Q-5 → D5d, Q-6 → D7a), so there is no Open Questions section, which is the condition ADR-0009 Decision 2 requires of an ACCEPTED record. No implementation is authorized in any state, and every `packages/` change below is gated on its own discussion at its plan phase. The measurements in Context were re-taken today. **Amended 2026-10-16, session 95606b, at Phase 11, David's direction ("explicit > implied"; "define all types here before moving forward")**: the declaration surface is restated so that every vehicle names its movement type, how it carries the player and what drives it, in Chord's colon-line form, with no defaults to infer. D2, D5, D5a–D5d, D5f, D6, D7 and D7a are rewritten in place, and the language section is replaced. The prose forms `ridden`, `runs between`/`runs from`, `steered by compass`, `drives on`, `drives where admitted`, `flies between`, `passage takes`, `every <n> turns`, `continue`, `reverse` and `set the <vehicle>'s heading` are withdrawn; nothing of them shipped. D1, D3, D4, D8, D9 and D10 are unchanged. **Extended the same day** (David: "add it, and put open in the 4.0 phases and we need to be able to assign movement commands (naval: starboard, space: {coordinates})"): a sixth type, `open` (D5h), the `expanse` kind it moves in (D11), and assigned movement command sets (D5i). Those three decisions carry Open Questions and are **DRAFT** until the questions resolve; no code for them starts before then. **Split 2026-10-17** (David: "should we have a base vehicle set, then extensions for naval, space, car+streets, tram/train, bicycle, motorcycle+streets"; "yes, do the split"): D12 closes the base vehicle and names the domain extensions; the sailing material written here that day (bearings in degrees, the `naval` set, wind, the `sailing` block, sails, and Q-10, Q-14, Q-15) moved to ADR-375, and Q-7 resolved as two axes in the base, three in `use space`. D12 is ACCEPTED with the rest. **Split again the same day** (David: "agreed", to a Claude Desktop review): `open` and `expanse` (D5h, D11, the `coordinates` set, Q-8, Q-9, Q-12, Q-13) moved to ADR-376 as `use expanses`, and D12 now lets an extension contribute a kind and a movement type. Q-11 then resolved (David: "a. No new syntax", folded into D5i), along with the Desktop review's corrections (D2 and D7: no `carries:` or `openable` on a vehicle with rooms aboard; D5f: `move` placed; D5e: stale sentence fixed; stale cross-references), so this record has no Open Questions section. **ACCEPTED as amended** (David, 2026-10-17, session 95606b: "yes, fix it and accept", after `adr-review` returned 21/22 with the one finding, D5e's stale plugin priority, fixed). **Amended 2026-10-17, session 32f84f** (David: "fix and accept", after the four-record `adr-review` of ADR-366, 375, 376 and 377 returned READY WITH CLARIFICATIONS): `analysis.line-missing-direction` and `analysis.vehicle-missing-pace` named in D5a and D5c, where the lines were required with no diagnostic for their absence; `vehicle-no-such-command` added to D7a, and AC-10 reworded off "not understood", which D5i's always-present grammar cannot produce. No decision changed. **Amended 2026-10-18, session d76183, at Phase 11 Slice 1** (David: "proceed"): six diagnostic codes the implementation needed and this record had not named are folded into D5, D5d and D6 — `not-a-vehicle`, `vehicle-condition-not-for-movement`, `vehicle-line-owner`, `vehicle-line-duplicate`, `not-a-destination`, `admits-owner`. No decision changed. **Amended 2026-10-18, session 4b8554, at Phase 11 Slice 3**: D5e records the machine as landed and its three timing readings; D7a records where the machine's reports are keyed and who reads them. No decision changed. **Amended 2026-10-18, session 4b8554, at Phase 11 Slice 4**: D5i records `steering` and `setting_course` as landed with the transformer that makes `go` and `steer` one action, the typed destination, the `giddyup` test's result and the actions' own lines; D7a records where boarding and the hatch refusals are keyed. No decision changed.)

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

**D2 — A vehicle says whether it carries the player in or on it: `carries: in` or `carries: on`, always written** (David, 2026-10-13, Q-1, the two cases; 2026-10-16, explicit rather than defaulted). The player is *in the car*, *in the bucket*, *in the tram*, or *on the raft*, *on the bicycle*, *on the horse*. The line is required on every vehicle without rooms aboard (`analysis.vehicle-missing-carries`), and forbidden on one with them (`analysis.carries-with-aboard`, D7); there is no default and no adjective. It lowers to `EnterableTrait.preposition`, which `entering`, `exiting`, the room description's "in the bucket" / "on the raft" enclosure part and `getDescribableLocation` already read (Phase 10 found that a separate `holds` field would be a second record of one fact). `carries:` is legal only on a vehicle (`analysis.carries-not-vehicle`). This answers ADR-350's second author question in full: what may be put inside is `container` behavior the vehicle kind composes, and `holds <n>` (plan Phase 4) bounds it exactly as it bounds any container.

**D3 — Seeing out is the enclosure's rule, and a vehicle has no transparency field.** `getDescribableLocation` branches on `VEHICLE` before `CONTAINER` and the two branches read a different flag to answer one question, whether the player can see out (ADR-350, "The opaque case decides it"). The two branches collapse into one rule over any enclosure the player is in: **the player sees out when the enclosure is open, or transparent, or carries the player on it (`carries: on`, D2); otherwise the enclosure is the place.** `VehicleTrait.transparent` is retired. A bucket (no `openable`) is open, so the player sees the well room. A car (`openable`, closed, `transparent`) shows the street through its windows. A sealed tube (`openable`, closed, not `transparent`) is the place. The coal-mine basket, a lidless container, sees the Shaft Room, which closes the first bug GH #466 notes. The rule is measured against the Dungeo chain before it ships (AC-3), which is ADR-350's Q2a. *(Amended 2026-10-16, Phase 10, session 0f4ef3: the rule covers every enclosure, container, supporter or vehicle, so a supporter the player is on also shows the room around it rather than describing itself. Only a closed, openable, non-transparent container entered `in` blocks sight. The Dungeo chain was byte-identical before and after, 952 of 952.)*

**D4 — Moving a vehicle moves what it holds, always, and `move` learns it.** `movesWithContents` was declared `readonly true` and read by nothing because it was never a choice. It becomes the platform fact: `WorldModel.moveEntity` on an entity with `VehicleTrait` relocates the vehicle and every entity it holds, at every depth. `moveVehicle` is retired as a separate function because it no longer does anything `moveEntity` does not. In Chord, `move the bucket to the Well Bottom` (the shipped `move` statement) therefore carries the player sitting in it, with no new statement and no binding line. This answers ADR-350's Q4 with its first candidate, and the risk it named (a story that moves a vehicle deliberately without its passengers) is accepted: a story that wants the passengers left behind moves them out first, in words, which is what it would have to mean.

**D5 — Every vehicle declares its movement type, and a moving vehicle declares what drives it. ADR-350 D7 is superseded.** (Rewritten 2026-10-16, session 95606b: explicit > implied.) Three lines are written in every vehicle block, with no defaults:

```
movement: none | line | streets | compass | flight
carries: in | on                       (D2)
drive: state | control | player        (every type but none)
commands: <set> { , <set> }            (every drive: player vehicle, D5i)
```

`movement:` is required (`analysis.vehicle-missing-movement`). `drive:` is required on every type but `none` and forbidden on `none` (`analysis.vehicle-missing-drive`, `analysis.vehicle-drive-not-moving`). The three drives mean:

- **`state`**: the vehicle is wherever its `position` block says (D5a). No statement moves it; the world's state does.
- **`control`**: the story moves it with statements (`start`, `stop`, `send`), which the author binds to whatever the player operates: a lever, a button, a plotter, a topic.
- **`player`**: the player's own commands move it, and the vehicle's `commands:` line says which commands those are (D5i). Nothing about the player's command words is implied by the movement type.

Each type admits a fixed set of lines, drives, statements and conditions, and anything outside its row is an error (`analysis.vehicle-line-not-for-movement`, `analysis.vehicle-drive-not-for-movement`, `analysis.vehicle-statement-not-for-movement`, and for a read or the `under way` anchor `analysis.vehicle-condition-not-for-movement`; a statement, read or anchor whose subject is no vehicle is `analysis.not-a-vehicle`; a vehicle line off a vehicle block is `analysis.vehicle-line-owner`, and a second line of one key is `analysis.vehicle-line-duplicate` — the four added at Slice 1, 2026-10-18):

| `movement:` | Required lines | `drive:` | `commands:` sets it may take | Statements | Conditions |
| --- | --- | --- | --- | --- | --- |
| `none` | none | (none) | (none) | none | none |
| `line` | `stops:`, `direction:`; `position` block with `state`, `pace:` with `control` | `state`, `control` | (none) | `start`, `stop`, `move <vehicle> to <stop>` (`control` only) | `is at <stop>`, `is under way` |
| `streets` | none (rooms say `admits:`, D6) | `player` | `compass` | `move <vehicle> to <room>` | `is at <room>` |
| `compass` | `pace:` (rooms say `admits:`) | `player`, `control` | `compass` | `start <vehicle> heading <direction>` (`control`), `stop` | `is at <room>`, `is under way`, `is heading <direction>` |
| `flight` | `destinations:`, `passage:` | `player`, `control` | `destinations` | `send <vehicle> to <destination>` (`control`) | `is at <destination>`, `is under way` |

The table is the base vehicle; an extension adds lines, sets, conditions, kinds and movement types and is written with `use` (D12). `open`, a position in an expanse, is the first such type (ADR-376).

GO from inside a vehicle is a movement command only when the vehicle's `commands:` include `compass`; otherwise it is refused, with `vehicle-cannot-walk` on `none` and `vehicle-ride` on every other type. `none` is a bathtub, a crate the player sits in: it does not move. A line or flight vehicle starts at one of its stops or destinations (`analysis.vehicle-not-at-stop`).

**D5a — The line: `stops:` lists the stops in order, and `direction: both` or `direction: one-way` says which ways it runs.** At least two stops, none repeated (`VehicleTrait` already refuses both; the analyzer reports them first as `analysis.line-too-few-stops` and `analysis.line-repeated-stop`). `direction:` absent is `analysis.line-missing-direction`. GO from inside is refused with `vehicle-ride`: the player rides, the world or the story drives. A line is driven one of two ways:

- **`drive: state`, with a `position` block.** The block's rows are `when <condition>: <stop>`, read top to bottom, and its last row is `otherwise: <stop>` (`analysis.position-no-otherwise`). Each row names a stop on the line (`analysis.not-a-stop`). After each turn the vehicle's machine (D5e) reads the block; when the answer differs from where the vehicle is, the vehicle moves there, carrying what it holds (D4), and `vehicle-arrived` is reported. On a `one-way` line a row may not name a stop behind an earlier row's (`analysis.position-against-direction`). The block is legal only under `drive: state`, and `drive: state` requires it (`analysis.position-without-state`, `analysis.state-without-position`). No statement moves a state-driven line: its position is the world's state (D9), so `start`, `stop` and `move` aimed at it are `analysis.vehicle-statement-not-for-movement`. This is the bucket (at the top while it holds the water) and Dungeo's balloon (aloft while its receptacle burns).
- **`drive: control`, with `pace: <n> turn[s]`.** `pace:` absent is `analysis.vehicle-missing-pace`. `start <vehicle>` puts it under way: it steps one stop every `n` turns in its current direction and stops by itself at the line's end, where a `both` line's next `start` runs it back the other way. `stop <vehicle>` halts it at the stop it is at. `move <vehicle> to <stop>` relocates it directly and must name a stop (`analysis.not-a-stop`). `start` on a vehicle at the end of a `one-way` line refuses with `vehicle-at-end`. This is the tram, the funicular, the drop shuttle.

**D5f — The driving statements are one set, read by one machine** (David, 2026-10-13, Q-4: "some vehicles will require explicit acceleration or movement while some move on each turn or on a schedule"; restated 2026-10-16). `start`, `stop` and `send` put the vehicle's machine (D5e) under way or take it out; `pace:` is how many turns a step takes. Which statements a type takes is D5's table, and a statement is legal only under `drive: control`, with one exception: `stop` may also halt a `drive: player` compass vehicle (a storm becalms the Marigold whoever is steering). `move <vehicle> to <place>` is not a driving statement: it is D4's shipped `move`, legal on any vehicle under any drive except a `drive: state` line, whose `position` block owns its place (`analysis.move-state-driven-vehicle`); on a `control` line it must name a stop (`analysis.not-a-stop`). The types share one machine and differ only in what a step is: the next stop, the exit in the heading, the destination after the passage (or, under ADR-376, one unit across an expanse).

**D5b — The streets: `movement: streets`, `drive: player`, `commands: compass`.** The player steers by GO: from inside, `go north` moves the vehicle along the current room's north exit when the destination admits it (D6), carrying everyone; a destination that does not admit it refuses with `vehicle-cannot-go` and names nothing (the author's prose, not the platform's, says the alley is too narrow). One exit per command. The vehicle never moves on its own. Walking out is `out` / `exit`, never GO. The story may relocate it with `move <vehicle> to <room>`. This is a car, a bicycle, a cart, and Dungeo's boat.

**D5c — The compass: `movement: compass`, with `pace:`.** `pace:` absent is `analysis.vehicle-missing-pace`. The vehicle has a heading. Under `drive: player`, the player sets it with the `compass` command set (D5i): `steer <direction>` (a new stdlib action, `steering`) and `go <direction>` from inside are the same action, so the two gestures mean one thing; `heave to` clears it. (The `naval` set is not in the base; it belongs to `use sailing`, ADR-375, D12.) Under `drive: control`, the story sets it with `start <vehicle> heading <direction>`. Either way, every `pace` turns the vehicle moves one room in its heading while the exit that way exists and admits it (D6); when it cannot, it stops and `vehicle-stopped` is reported once. `stop <vehicle>` clears the heading under either drive. Conditions: `<vehicle> is under way` while a heading is set, `<vehicle> is heading <direction>`. This is a tall ship, a barge on a canal, anything that keeps going until told otherwise.

**D5h — Moved to ADR-376** (2026-10-17). Open movement in an expanse was written here on 2026-10-16 and is now the `use expanses` extension (D12). Speed there is authored `pace:` in turns, as everywhere in this record (David, 2026-10-17: "speed has to be an authored thing"); no base command set changes a vehicle's pace.

**D5i — The player's movement commands are assigned, never implied: `commands: <set> { , <set> }`.** Every `drive: player` vehicle writes the line (`analysis.vehicle-missing-commands`), and it is forbidden on every other drive (`analysis.commands-not-player-driven`). Each set is a shipped vocabulary with its words in parser-en-us grammar and its lines in lang-en-us, mapped onto the stock `steering` and `setting-course` actions, and a set the movement type does not take is `analysis.commands-not-for-movement` (D5's table). The sets:

- **`compass`**: `go <direction>`, `steer <direction>`, `heave to`. Absolute directions.
- **`destinations`**: `set course for <destination>`, naming one of a flight vehicle's `destinations:`.

A vehicle may take more than one set where its type allows. An extension may ship further sets (`coordinates`, ADR-376; `naval`, ADR-375).

**An author's own command words need no new syntax** (David, 2026-10-17, Q-11: "a. No new syntax"). Extra words for a shipped set are ADR-270's `extend action` on the set's stock action, with a pattern line carrying `means direction <dir>` (`extend action steering` with a `giddyup` line meaning east). A vocabulary of the author's own is `define action` with a `directions` block (ADR-267, ADR-275; the `nautical` fixture's shape), whose body drives a `drive: control` vehicle with `start <vehicle> heading <direction>`. A `commands` block mapping words to directions on the vehicle is not added: it would be a second home for the binding `extend action` already holds, the ground on which D6 withdrew `drives on`. Relative turns ("turn from where you're pointing": gee and haw, port and starboard) are not a base concept; a domain extension supplies them, as ADR-375 D3 does for ships and a future `use riding` would for a horse. That a `means direction` line on `extend action steering` binds the new action's direction slot is a Phase 11 test, not an assumption, since `steering` does not exist yet. *(Landed 2026-10-18, Phase 11 Slice 4, session 4b8554: `steering` and `setting_course` are stdlib actions, their grammar in the Chord standard grammar file, with four readings this record left open. The "same action" of D5c is a parsed-command transformer the engine registers for every story (`packages/stdlib/src/actions/standard/vehicle-command-transformer.ts`): `go <direction>` aboard a compass vehicle listing `compass` becomes `steering`, `steer <direction>` aboard a streets vehicle becomes `going`, so neither action duplicates the other's work and a Chord `on the player steering` clause sees both gestures. `set course for <destination>` takes the destination as free text, matched by name against the vehicle's `destinations:`, because those rooms are never in the player's scope. The `giddyup` test passed as written: `extend action steering` with a pattern line `means direction east` binds the direction. Beyond D7a's stock refusals the two actions carry their own lines — `not_in_vehicle`, `cannot_steer`, `not_under_way`; `no_destination`, `not_a_destination`, `already_there` — on the same footing as any action's `no_target`.)*

**D5e — Automated motion is the vehicle's own built-in state machine, secondary to the vehicle** (David, 2026-10-13, Q-2: "automated movement has to be secondary to the vehicle - like a built in state machine"). A vehicle with a model that moves over turns (a line under `drive: control` or `drive: state`, D5a; the compass, D5c; free flight, D5d) does not get a daemon beside it. The model is a platform state machine the vehicle owns, in the shape ADR-215's `define machine` already gives a story: states `at stop` / `under way` / `stopped`, a per-turn transition that steps the vehicle while under way, and the author's statements and the player's actions as its triggers. The vehicle is the thing; the machine is one of its parts, as `OpenableTrait.isOpen` is a part of a door. The author never declares the machine, never names its states, and reads it only through the shipped conditions (`is under way`, `is at <Room>`, `is heading <direction>`) and the shipped anchor (`when the <vehicle> becomes under way`, with `under way` read as one fixed phrase). A `drive: state` line's machine has one per-turn step: read the `position` block and move when its answer changed (D5a). Ticking it is the engine's turn cycle, in the state-machine turn plugin (`packages/plugin-state-machine`, priority 240, `TURN_BANDS.platformPhases.floor + 40`, in the platform-phases band (`packages/plugin-state-machine/src/state-machine-plugin.ts:27`, re-measured 2026-10-17)) where ADR-215 machines are already advanced, not a scheduler daemon the loader installs. That plugin is core under ADR-377 (2026-10-17): the loader registers it for every story, so the vehicle's machine needs no `use` line. *(Landed 2026-10-18, Phase 11 Slice 3, session 4b8554, with three readings this record had left open: the tick on the turn a vehicle is started counts toward its pace, so `pace: 1` moves the vehicle on the turn of the `start` or the steer; a `drive: control` line found off its stops by an author's `move` halts where it is; a flight vehicle's departure turn is not counted against `passage:`, so it is nowhere for exactly `n` turns. The stepping functions are `stepVehicle` in `packages/world-model/src/traits/vehicle/vehicleBehavior.ts`; the phase is `tickVehicles` in `packages/plugin-state-machine/src/vehicle-machine.ts`, handed a `drive: state` line's `position` answer by the loader.)* The street model and the `none` type carry the same machine with no per-turn transition, so every model is one shape with one field set, and D8's "nothing else" on `VehicleTrait` holds: `model` is the machine's declaration and the machine's state is the trait's transient state.

**D5d — Free flight: `movement: flight`, with `destinations:` and `passage: <n> turn[s]`.** The destinations are not a line: any to any, at least two (`analysis.flight-too-few-destinations`). Under `drive: player`, `set course for <destination>` (the `setting-course` action, from inside, naming a destination) puts the vehicle *under way*; under `drive: control`, the statement `send <vehicle> to <destination>` does (a room not among the `destinations:` is `analysis.not-a-destination`, added 2026-10-18). Either way the vehicle is under way: it leaves its room and is nowhere for `n` turns, then arrives (David, 2026-10-13, Q-5: "a", nowhere rather than a transit room; a story that wants somewhere to be during the voyage writes a line with a middle stop). While under way, its outside exits (D7) refuse with `vehicle-under-way`, and `<vehicle> is under way` is true; `<vehicle> is at <Room>` is false everywhere. `passage:` is required on this type (`analysis.flight-no-passage`); a story that wants the fold narrated writes a `define sequence` anchored on `when the <vehicle> becomes under way`, which is the shipped anchor form. This is the Sparrow, a lift between floors with doors that close, a teleport booth.

**D5g — The machine's state is plain data on the trait, so a voyage survives a save.** Heading, destination, turns remaining and whether the vehicle is under way are fields on `VehicleTrait`, serialized with every other trait field by `IFEntity.toJSON` and restored by the trait rehydrator, which already handles core trait types. No closure, registry or daemon holds any of it, so a save taken mid-passage restores a Sparrow that arrives on schedule and a Marigold still on its heading (ADR-348: the world is authoritative on restore). This is the reason D5e chose a trait-resident machine over a scheduler daemon, beside the one David gave.

**D6 — A room, a `rooms` group or a region says which vehicles it admits, and it is the only place that says so.** The line is `admits: <vehicle> { , <vehicle> }`. It is read by D5b and D5c when deciding whether a move may land there, and by nothing else: a line vehicle's stops admit it by being its stops, and a flight vehicle's destinations likewise. A region's `admits:` reaches every member room (ADR-360's ownership rule for the `exits` table). The vehicle block carries no counterpart (the withdrawn `drives on` was a second place to say one fact). A room with no `admits:` line admits no vehicle, which is what a street map needs: the alley the car cannot take is the room with no `admits:`. Each name listed must be a `streets` or `compass` vehicle (`analysis.admits-not-steered-vehicle`), since no other type reads the line; the line on anything but a room, a `rooms` group or a region is `analysis.admits-owner` (added 2026-10-18).

**D7 — A vehicle may have rooms aboard, and an exit inside it may lead outside.** A vehicle block of any moving type may carry `aboard: <Room> { , <Room> }`, and then must carry `boarded through: <Room>`, naming one of them (`analysis.aboard-without-boarding-room`, `analysis.boarding-room-not-aboard`). Such a vehicle writes neither `carries:` (`analysis.carries-with-aboard`) nor `openable` (`analysis.vehicle-aboard-openable`): the player is never in or on the vehicle entity, so D3's enclosure rule never reads either, and its hatch is a door with its own `openable` (2026-10-17, from the Desktop review, David's answer with Q-11; a word with no reader is retired by the rule D8 applied). Those rooms are the vehicle's interior: the player in one of them is aboard the vehicle for every purpose above (D4 moves them when the vehicle moves, D5 models apply, D3's enclosure part is not shown because the room is the place). The vehicle itself is then not entered; `enter the Sparrow` from its current room is `going` to the boarding room. **The player's verbs are the ship's** (David, 2026-10-13, Q-3: "thinking about ships, you board most of the time, but enter might be acceptable in many cases. You also disembark or exit"): `board <vehicle>` is a synonym of `enter`, and `disembark` of `exit` and `out`, both in parser-en-us grammar on the existing `entering` and `exiting` actions, not new actions, and **both only for a vehicle with rooms aboard** (David, Q-3 follow-up: "'board' is for ships only"): a bucket, a car or a bicycle is entered and exited, and `board the bucket` refuses with `vehicle-not-boardable` (a stock line, Q-6). On a vehicle with rooms aboard, `exit` / `disembark` / `out` in the boarding room takes the `to outside` exit; elsewhere aboard they refuse with `vehicle-not-at-hatch`, naming nothing. Inside, the one exit production gains a destination word: `<direction> to outside` (`exit = DIRECTION "to" ( name | "outside" ) [ "through" name ]`), legal only in a room some vehicle lists aboard (`analysis.outside-not-aboard`), and resolved on each use to **the vehicle's current room**. That is the state-dependent exit destination the Sparrow needed, with no state and no condition: *west to outside* from the Airlock lands on pad 14 at Ceres and in the Collar Vestibule at Titan because the ship is there. A `through` door on it works as on any exit. ADR-350 had no answer here because it had no multi-room case; UPPS supplied one.

**D7a — Every vehicle refusal carries a stock line** (David, 2026-10-13, Q-6: "a"). `vehicle-cannot-walk`, `vehicle-ride`, `vehicle-cannot-go`, `vehicle-stopped`, `vehicle-under-way`, `vehicle-at-end`, `vehicle-not-at-hatch`, `vehicle-not-boardable` and `vehicle-no-such-command` (a command set's word aboard a vehicle that does not list the set, D5i; the words are always grammar, so the refusal is `steering`'s or `setting-course`'s, never the parser's; added 2026-10-17 from the four-record review) each ship with a line in lang-en-us, as does the report `vehicle-arrived` (a vehicle moved by its machine reaches a stop, naming the vehicle and the stop), overridable through `override message` as every stdlib message is, so a vehicle plays before its prose is written. The stock lines name no entity the author did not, and never explain the world's reason (the alley is narrow in the Alley's prose, not in the refusal). *(Slice 3, 2026-10-18: the machine's two reports and `vehicle-under-way` are keyed under going, as the vehicle refusals already were, so the alias bijection and `override message` hold — `going-vehicle-arrived`, `going-vehicle-stopped`, `going-vehicle-under-way`. `vehicle-arrived` is reported to a player aboard the vehicle or standing in the room it reached; `vehicle-stopped` to a player aboard; a flight departure is silent, the fold being the author's sequence on `becomes under way`.)* *(Slice 4, 2026-10-18: `vehicle-not-boardable` and `vehicle-not-at-hatch` ship under entering and exiting (`entering-vehicle-not-boardable`, `exiting-vehicle-not-at-hatch`), `vehicle-no-such-command` under each of steering and setting_course. D7's boarding is `VehicleTrait.boardingRoom`, lowered from `boarded through:`; `enter` and `board` on such a vehicle move the player there and describe the room, through a closed hatch door they refuse with entering's `container_closed`; `exit`, `disembark` and `out` in the boarding room are rewritten by the transformer into going along the `to outside` exit, so the under-way refusal and the door are the exit's own; `board` on anything without rooms aboard refuses because the word is now in entering's vocabulary, which the parser previously left empty. That refusal stopped the Dungeo chain at wt-08's `board boat`, the boat having no rooms aboard; David ruled 2026-10-18, session 7a7637, "keep D7 and re-record wt-08", so wt-08 and the three boat unit transcripts now say `enter boat`, the rendered text unchanged.)*

**D8 — The inert fields are retired, not exposed.** `blocksWalkingMovement` and `requiresExitBeforeLeaving` are what the movement model decides (D5: a line or model-less vehicle refuses GO; streets and compass make GO steer; walking out is always `exit`), so both go. `isOperational` and `notOperationalReason` are an author condition, written as the story writes every other guard (`refuse when the balloon is not inflated: balloon-flat` on the action that would move it), so both go. `vehicleType` selected nothing and goes. `positionRooms` and `currentPosition` are the line model's stops and the vehicle's actual location, so both go; Dungeo's three readers move to the model's API in the same change (Consequences). What remains on `VehicleTrait` is exactly the set of fields the language can write: `holds`, `model` (with its stops, heading, destination and passage), and nothing else. *(Amended 2026-10-16, Phase 10, session 0f4ef3: done. `VehicleTrait` carries `model` alone, `holds` being `EnterableTrait.preposition` by D2's amendment; `transparent`, `movesWithContents` and every field named above are gone, along with `moveVehicle`, `canVehicleMove`, `canActorLeaveLocation` and `canActorWalkInVehicle`. Phase 10 lands the line and streets shapes; heading, destination and passage arrive with the compass and free-flight phases.)*

**D9 — The vehicle's own location is the one fact, read, never copied.** Where a vehicle is, which stop it is at, whether it is under way, are derived from `world.getLocation(vehicle)` and the model's transient state. No story state mirrors them (ADR-347 and ADR-348's rule against a second record of one fact). The UPPS `states: buttoned, boarding, underway, landed` on the courier ship become, under this record, the platform's `is at <Room>` and `is under way`, plus whatever authored state the hatch sequence still needs (`boarding` is authored; `underway` and `landed` are not).

**D11 — Moved to ADR-376** (2026-10-17). The `expanse` kind was written here on 2026-10-16 and is now contributed by `use expanses`.

**D12 — The base vehicle is closed, and domains extend it with `use`** (David, 2026-10-17: "should we have a base vehicle set, then extensions for naval, space, car+streets, tram/train, bicycle, motorcycle+streets"; "yes, do the split"; and "agreed", to a Claude Desktop review that moved `open` and `expanse` out of the base). Everything above is the base: the `vehicle` kind, `carries:`, `drive:`, the five movement types (`none`, `line`, `streets`, `compass`, `flight`), authored `pace:`, the `compass` and `destinations` command sets, the machine, the enclosure rule and the outside exit. It needs no `use` line, and it is closed: domain knowledge is not added to it. It is not gated behind a `use vehicles` line either: its grammar applies inside a `vehicle` block, so an author who never writes `a vehicle` never meets it, and ADR-215 made NPCs core on the same ground. A domain is a shipped extension selected by name, as `use scoring` and `use hunger` are (ADR-215; built-ins ship with the platform). Extensions are cut by domain, not by vehicle, because the movement types are geometry and a domain is what one kind of craft adds to them: a bicycle and a motorcycle are both `streets`, and differ only in what the roads extension would add. An extension adds lines, blocks, command sets and conditions to the base types and their places, and may contribute a kind and a movement type, as ADR-215's vocabulary manifest allows. Its words written without its `use` line are an analyzer error it names. An extension that builds on another says so, and the author writes both lines: no `use` line turns on another, and a dependent's words without the line it builds on are an analyzer error (`use sailing` without `use expanses` is `analysis.sailing-needs-expanses`). The extensions:

- **`use expanses`** (ADR-376, ACCEPTED 2026-10-17; landed Phase 13, 2026-10-19): the `expanse` kind, `movement: open` on coordinates, the `coordinates` set. The first to contribute a kind and a movement type.
- **`use sailing`** (ADR-375, ACCEPTED 2026-10-17, builds on `use expanses`; landed Phase 13, 2026-10-19): bearings in degrees, the `naval` set, wind on the expanse, the `sailing` block, sails.
- **`use space`** (not designed, builds on `use expanses`): the third axis and how the player commands it, thrust or fuel if wanted.
- **`use roads`** (not designed): fuel, parking, one-way streets for streets vehicles.
- **`use rail`** (not designed): timetables on a line; it may prove to be nothing beyond base `drive: control`.

Each undesigned domain gets its own record before any of its syntax is written.

**D10 — Every word has a reader and a test, and the three story-side mechanisms converge on the model.** AC-2 is the self-policing gate from ADR-350 carried forward. Dungeo's bucket and balloon are rewritten onto D5a's API (`moveOnward`/`moveBack` and `move to a stop`), the boat onto D5a as well (the river is a line the current advances), and the coal-mine basket is left as it is: ADR-350 D5's ruling that a lidless fixed container that transports is a modelling question stands, and Dungeo is not a Chord design input. Each is measured by the chain, not argued. *(Amended 2026-10-16, Phase 10, session 0f4ef3, David's "proceed": the boat goes on D5b's streets model, not the line. The river is not a line the player rides; they paddle it by GO, so each river room, its beaches and Dam Base `admits` the boat and every other room does not, which also keeps the boat off dry land as Zork does. The bucket and balloon are lines whose current stop is read from their location (D9). The balloon daemon stays until D5e's machine lands, now reading the line instead of a position copy.)*

## The language, as an author reads it

Every line below is **unshipped syntax** proposed by this record; nothing here compiles today. (Replaced 2026-10-16, session 95606b, to follow the explicit declaration of D5.) Each vehicle writes `movement:`, `carries:` and, when it moves, `drive:`.

### A vehicle that does not move (`none`)

```chord
create the bathtub
  a vehicle
  in the Bathroom
  movement: none
  carries: in

  A claw-footed tub, dry, big enough to sit in.
```

GO from inside is refused with `vehicle-cannot-walk`; the player gets out with `out`.

### The bucket (`line`, driven by state)

```chord
create the bucket
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: state
  stops: the Well Bottom, the Top of the Well
  direction: both
  aka pail

  A wooden bucket on a rope, big enough to stand in.

  position
    when the bucket holds the water: the Top of the Well
    otherwise: the Well Bottom
  end position
```

The bucket's place is a reading of what it holds. Water poured in, by any means, puts it at the top after that turn; water taken out, by any means, returns it to the bottom. It carries the player (D4) and reports `vehicle-arrived`. It is open (no `openable`), so D3 shows the well room around it and the heading reads "Top of the Well, in the bucket" (ADR-349 D5).

### The tram (`line`, driven by control)

```chord
create the tram car
  a vehicle
  in the Tram Platform
  movement: line
  carries: in
  drive: control
  stops: the Tram Platform, the Tram Terminus
  direction: both
  pace: 2 turns
  aka car, tram, open car

  A single open car on two rails, with a brake lever at one end.

create the brake lever
  a thing, scenery
  in the tram car

  on the player pulling
    refuse when the tram car is under way: tram-already-rolling
    refuse when the pad master is unconvinced: quint-blocks
    start the tram car
  end on

define sequence the tram ride
  when the tram car becomes under way
  1 turn later
    phrase tram-halfway
end sequence
```

Started, the car steps one stop every two turns and stops by itself at the Terminus; the next `start` runs it back. GO from inside is refused with `vehicle-ride`.

### The funicular (`line`, one way)

```chord
create the funicular
  a vehicle
  in the Upper Station
  movement: line
  carries: in
  drive: control
  stops: the Upper Station, the Middle Station, the Lower Station
  direction: one-way
  pace: 3 turns
```

At the Lower Station, `start the funicular` refuses with `vehicle-at-end`; the story returns it with `move the funicular to the Upper Station`.

### The drop shuttle (`line`, a window phrase on the way down)

```chord
create the drop shuttle
  a vehicle, openable
  in the Shuttle Gate
  movement: line
  carries: in
  drive: control
  stops: the Shuttle Gate, the Kraken Landing
  direction: both
  pace: 4 turns
  aka shuttle

define sequence the drop
  when the drop shuttle becomes under way
  2 turns later
    phrase shuttle-window
end sequence
```

### A bicycle (`streets`; no story has one yet)

```chord
create the bicycle
  a vehicle
  in the Yard
  movement: streets
  carries: on
  drive: player
  commands: compass
  aka bike

create the Streets
  a region
  admits: the bicycle
  rooms High Street 1 to 4

create the Alley
  a room

  Too narrow for anything on wheels.
```

On the bicycle, `go north` moves it one exit when the destination admits it; into the Alley it refuses with `vehicle-cannot-go`, and the Alley's own prose says why. The player is on the bicycle (D2), so they see the street around them.

### A tall ship (`compass`; no story has one yet)

```chord
create the Marigold
  a vehicle, openable, transparent
  in the Harbour
  movement: compass
  carries: in
  drive: player
  commands: compass
  pace: 1 turn
  aka ship, barque

  A three-masted barque with a wheel aft and a cabin you can see the
  sea from.

create the Northern Sea
  a region
  admits: the Marigold
  rooms Open Water 1 to 12
    Grey water to every horizon.
  exits
    Open Water 1: north to Open Water 2, east to Open Water 5
    ...

create the Reef
  a room

  The Marigold's keel would not clear it.
```

From inside, `steer north` or `go north` sets the heading; each turn the Marigold moves one room north while the way is admitted; at the Reef, which admits nothing, it stops with `vehicle-stopped`. `heave to` clears the heading. A story with a storm writes `stop the Marigold`.

### The Sparrow (`flight`, rooms aboard, an exit to outside)

```chord
create the Sparrow
  a vehicle
  in the Loading Dock
  movement: flight
  drive: control
  destinations: the Loading Dock, the Landing Pad, the Collar Vestibule, the Docking Tube
  passage: 5 turns
  aboard: the Hold, the Cockpit, the Airlock, the Galley, the Bunk, the Engine Bay
  boarded through: the Airlock
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

One ship, one hull opening, three worlds. `west to outside` from the Airlock is pad 14 at Ceres and the Collar Vestibule at Titan because the Sparrow is there, and refuses with `vehicle-under-way` during the fold.

A craft in open space is the `use expanses` example in ADR-376, and a ship on open water sailing by the wind is the `use sailing` example in ADR-375.

## Acceptance Criteria

Each is discharged by a test named in its plan phase; none is discharged by this record.

1. **AC-1 (D1, D5a, Phase 11).** The well-room bucket is written in Chord as above, compiled, and played through an assembled engine: the player enters it at the bottom, pours the water in and is at the Top of the Well with the bucket; takes the water out and is back at the Well Bottom. No clause on any verb moves it. **REAL-PATH** (rule 13a).
2. **AC-2 (D8, D10, every phase).** For every field the Chord surface writes to `VehicleTrait`, a test exists that fails when the platform stops reading it. **MECHANICAL, self-policing.** A field with no such test is not admitted; this is ADR-350's AC-2 carried forward unchanged.
3. **AC-3 (D3, Phase 10).** The enclosure rule replaces the two branches of `getDescribableLocation`, and the Dungeo walkthrough chain is byte-identical at the pinned seed before and after. A difference is a finding on the rule, reported to David, never absorbed.
4. **AC-4 (D4, Phase 10).** `move` of a vehicle in a Chord story relocates every held entity at every depth, asserted on `world.getLocation` for each, including a thing inside a container inside the vehicle.
5. **AC-5 (D5, D5a–D5d, Phases 11 and 12).** Each movement type, and each drive a type admits, has one Chord fixture story exercising its driving statement or `position` block, its player gesture where it has one, its refusal, and its condition; every analyzer diagnostic D2, D5 and D5a–D5d name has a compile test; the UPPS tram, drop shuttle and Sparrow are the line and free-flight fixtures (Phase 15); the compass and street fixtures live under `packages/*/tests` stories, never in a real story (`feedback_test_story_isolation`). *(UPPS half met 2026-10-20, session aa7a2f, Phase 15: the courier ship is one `flight` vehicle under `drive: control` sent by the fold drive, the tram car a `line` under control (Phase 11), the drop shuttle a `line` under control started by its lever — `branch-stories/upps/upps.tests/a366titn.json` rides the Ceres-to-Titan fold and the drop both ways; `trampad2.json` the tram.)*
6. **AC-6 (D7, Phase 15).** The Sparrow's Airlock reaches pad 14 and the Collar Vestibule through one `west to outside` line, on two legs of one UPPS test line, and refuses during the fold. *(Met 2026-10-20, session aa7a2f, Phase 15: `w7eqlqnb.json` card tpyumtv3 reaches pad 14 by `exit` through the Airlock's one `west to outside` line; `a366titn.json` cards t1500023 and t1500020 reach the Collar Vestibule through the same line and are refused at the shut hatch and the sealed ramp (t1500018) while the ship is under way. The hatch is an openable scenery thing gating the line, not a `through` door: GH #603. `out` is `exit` in the cards: GH #604.)*
7. **AC-7 (D8, Phase 10).** `VehicleTrait` carries no field the language cannot write, measured by diffing its declared fields against the loader's lowering; Dungeo compiles and its chain passes with the retired fields gone.
8. **AC-8 (D6, Phase 12).** A street vehicle refuses an exit into a room with no `admits`, and takes the same exit once the room, or its region, admits it. *(Met 2026-10-18, session 7a7637: `stories/vehicles` tree `vehroot1` — the car refuses the Footpath, takes the Alley by its own `admits:` and the Market by the High Street region's.)*
9. **AC-9 (moved).** The open-movement criterion moved to ADR-376 (AC-1) on 2026-10-17.
10. **AC-10 (D5i, Phases 11 and 12).** Each base command set drives a vehicle that declares it and is refused on one that does not: `steer north` sets a `compass` vehicle's heading and is refused with `vehicle-no-such-command` (D7a) aboard a `destinations`-only one; `set course for <destination>` sends a `destinations` flight vehicle. (The `coordinates` and `naval` sets' criteria are ADR-376's and ADR-375's.) Every `commands:` diagnostic has a compile test. *(Met 2026-10-18, session 7a7637: the same tree — `steer north` aboard the Sparrow refuses "You can't steer the Sparrow."; `set course for the Orbit Station` sends it and it arrives; the Phase 11 suites cover the compass side and the diagnostics.)*

## Consequences

- **ADR-350 is superseded, and the flip has an owner.** The session that flips this record ACCEPTED stamps ADR-350's Status `SUPERSEDED by ADR-366` and amends ADR-349 D4a and D5 in the same commit (done 2026-10-13, session 326e9e: ADR-350 reads `SUPERSEDED by ADR-366`). Its seven questions resolve: Q1 native (D1); Q2 the enclosure rule (D3), Q2a measured (AC-3); Q3 all five inert or redundant fields retired (D8); Q4 `move` carries contents (D4); Q5 `positionRooms` retired for the line's stops (D5a, D8); Q6 `holds <n>` on the container composition, which Phase 4 lands (D2); Q7 the model decides GO (D5).
- **ADR-349 D4a and D5 are amended in place**: "transparent vehicle" and "opaque vehicle" become "an enclosure the player sees out of" and "one they do not", by D3's rule; nothing about the heading's composition changes.
- **Dungeo changes, and the chain is the gate.** The bucket, balloon and boat move onto the line model's API; `fill-action.ts`, `balloon-daemon.ts`, `tie-action.ts`, `launch-action.ts`, `inflate-action.ts`, `well-room.ts` and `volcano.ts` lose every retired field. The coal-mine basket does not change. Any rendered-text change is reported to David as its own decision (`feedback_default_flips_are_content_changes`).
- **UPPS is rewritten where the design doc wrote around the gap**: three hull openings become one, the courier ship's `underway` and `landed` states become platform facts, the tram car and drop shuttle become vehicles rather than rooms. The design doc's "The ship and its three doors" section is superseded by D7 and says so.
- **The catalog grows by one kind noun (`vehicle`; `expanse` comes with `use expanses`, ADR-376), and the grammar by the vehicle lines `movement:`, `carries:`, `drive:`, `commands:`, `stops:`, `direction:`, `pace:`, `destinations:`, `passage:`, `aboard:`, `boarded through:` and the `position` block; the room line `admits:`; the `outside` destination; the statements `start` (with `heading <direction>` on a compass), `stop` and `send`; the conditions `is at`, `is under way` and `is heading`; and the anchor `becomes under way`** (restated 2026-10-16; no adjective is added). Each is a grammar change under `docs/architecture/chord-grammar-changes.md` and lands in the phase that implements it, with its EBNF row and guide page.
- **parser-en-us gains `board` on `entering` and `disembark` on `exiting`** (D7); **stdlib gains two actions** (`steering`, `setting-course`) and three vehicle refusals in `going` (`vehicle-ride`, `vehicle-cannot-go`, `vehicle-cannot-walk`), with the messages in lang-en-us; `entering` and `exiting` read `holds` *(amended 2026-10-16: they read `EnterableTrait.preposition`, which they already did, per D2's amendment; the three refusals and their lines shipped in Phase 10)*.
- **Movement over turns is the vehicle's built-in machine (D5e), ticked by the engine's turn cycle** where ADR-215 machines are advanced: a `drive: state` line reads its `position` block after each turn, a `drive: control` line and a compass vehicle step every `pace` turns (as does ADR-376's open vehicle) while under way, and free flight arrives after its passage. No per-vehicle daemon is installed; Dungeo's balloon daemon is replaced by the model, not wrapped by it. The plan's Phase 10 names the engine seam.
- **Plan phases 10 to 15 implement this record** in the order the plan gives: enforcement and the enclosure rule (Phase 10); the declaration surface of D5 for `none`, `line`, `streets`, `compass` and `flight`, parsed, analyzed and lowered, with the `compass` command set, and `none`, `line` under both drives and `compass` playing (Phase 11, amended 2026-10-16); `flight` playing (Phase 12); the extensions `use expanses` (ADR-376) and `use sailing` (ADR-375), once their open questions resolve (Phase 13); the `outside` work with UPPS as the fixture (Phase 15). `streets` already plays from Phase 10. Every `packages/` phase is discussed at its checkpoint.

## Session

Session 326e9e, 2026-10-13, on `chord-4-0`, at Phase 2 of the Chord 4.0 plan, written after David's "proceed" with his reminder that every platform and Chord change in this slice is aligned and elegant with no hacks or shortcuts. The measurements in Context were re-taken this session over `packages/*/src` and `stories/*/src`, and the UPPS cases are from `docs/work/author-narrative-testing/upps-design-20261012.md` and `branch-stories/upps/upps.story` as they stand today.

Amended in session 95606b, 2026-10-16, on `chord-4-0`, at the opening of Phase 11, from David's review of the proposed bucket syntax: clauses on player verbs guarded by position checks were rejected, and the declaration surface was restated so that every vehicle names its movement type, carrying preposition and drive explicitly. Extended the same day with `open`, `expanse` and assigned command sets; on 2026-10-17, after David's pace, degrees, wind and sails rulings, split into this base (D12), ADR-375 for sailing and ADR-376 for expanses.
