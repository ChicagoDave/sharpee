# ADR-376: Expanses extend the vehicle: open movement on coordinates

**Status**: **ACCEPTED** (David, 2026-10-17, session 95606b: "yes, accept it", after the interview resolved every question and the adr-review that followed came back clean). History: written DRAFT the same day (David: "agreed", to moving `open` and `expanse` out of ADR-366's base into their own extension, after a Claude Desktop review found that every open decision left in ADR-366 was about them and that none of the four 4.0 conveyances needs them). The decisions below were ADR-366's D5h, D11 and the `coordinates` bullet of D5i, written there on 2026-10-16 and moved here unchanged except where marked. The open questions interview ran the same day and resolved all five: Q-1 → D3 (arrival) and D6 (distant prose, visibility); Q-2 → D8 (edges); Q-3 → D7 (description by position); Q-4 → D9 (leaving the vehicle); Q-5 → D6 (sight is scope). David's further rulings on sight, stride and the voyage became D6 and D7. The review that followed found two gaps, and David closed both the same day ("yes to both, fold them in"): floating things that drift (D10, which narrows D9's lost-by-default to things that do not float) and sight from a landmark room (D6). No Open Questions section remains. No implementation is authorized; every `packages/` change is gated on its discussion at its plan phase. **Amended 2026-10-17, session 32f84f** (David: "fix and accept", four-record `adr-review`): D9 gives the player out of the vehicle a floating position of their own, since "read from the vehicle" was undefined with two vehicles in one expanse; D3 names `analysis.vehicle-missing-pace`; AC-2 reworded off "not understood" to ADR-366 D7a's `vehicle-no-such-command`. No decision changed.

**Scope**: `packages/chord` (the `use expanses` line, the `expanse` kind, `movement: open`, the `in <expanse> at <coordinates>` placement, the `coordinates` command set, `send <vehicle> to <coordinates>`, the `is in <expanse>` condition, `chord.ebnf`), `packages/story-loader` (their lowering), `packages/world-model/src/traits/vehicle/` and a new expanse trait (coordinates, heading and course on the vehicle's machine), `packages/stdlib` (`setting-course` by coordinates; `exiting`, `going`, `dropping` and `throwing` in an expanse, D9; `taking` a floating thing, D10; `looking` and the instrument's `look through`, D6), `packages/world-model/src/world/VisibilityBehavior.ts` (sight as scope in an expanse and from a landmark room, D6), `packages/parser-en-us` (`retrieve`, D10) and `packages/lang-en-us`

## Date: 2026-10-17

**Kind**: technical

## Parent

- **ADR-366** (a vehicle is a kind with a movement model). **D12** there closes the base at five movement types and lets an extension contribute a kind and a movement type; this record is the first that does both. Everything here rides the base: `carries:`, `drive:`, authored `pace:`, the vehicle's machine (D5e) with its state on the trait (D5g), `start`/`stop`, the `compass` command set, the stock refusals (D7a).
- **ADR-375** (sailing) builds on this record and requires its `use` line.
- **ADR-215** (extensions). `use expanses` is a shipped extension whose manifest contributes the kind noun `expanse`, which ADR-215's vocabulary manifest allows ("the kind nouns, trait adjectives, verbs, and state words it adds").

## Context

David asked on 2026-10-16 for open naval and open space movement in 4.0, with assignable commands ("naval: starboard, space: {coordinates}"), and ruled on 2026-10-17 that speed is authored in turns, "either direction or steps to coordinates". The movement types of ADR-366's base are rooms joined by exits or stops; this one is a position in a bounded space, which brings a second kind and a coordinate system with it. Every unresolved question ADR-366 had about vehicles was about this type, so it moved out with them.

## Decision

**D1 — `use expanses` turns the extension on.** The `expanse` kind, `movement: open`, the placement, the `coordinates` set, the coordinate form of `send` and `is in <expanse>`, written without it, are `analysis.expanses-needs-use`.

**D2 — `expanse` is a kind: a bounded space with coordinates, and the place an open vehicle is between landmarks.** Its block carries `size: <w> by <h>` and a `landmarks` block whose rows are `<Room>: <x>, <y>`, each naming a room the expanse holds at those coordinates (`analysis.landmark-not-room`, `analysis.landmark-outside-expanse`, `analysis.landmark-axes`). It has two axes; a third is `use space` (ADR-366 D12). The expanse's own prose describes it; it lowers to a room entity with an expanse trait carrying its size and landmark coordinates, so the room heading, looking and scope read it as they read any room. Only `open` vehicles and floating things (D10) may be placed in an expanse (`analysis.expanse-not-open-vehicle`), and a literal `move` of anything else into one is the same error.

**D3 — `movement: open`: a vehicle with a position in an expanse rather than a room.** The vehicle starts `in <expanse> at <coordinates>` and carries `pace: <n> turn[s]` and `stride: <n> units`, both required (`analysis.vehicle-missing-pace`, ADR-366 D5c; `analysis.open-missing-stride`): how many turns a step takes, and how far a step goes (David, 2026-10-17: "speed has to be an authored thing...the default is turns and either direction or steps to coordinates"; "pace would be part of the authored solution along with navigation"). Together they are the vehicle's speed, entirely the author's; no command set here changes either. A long voyage is long by the author's own numbers, and the platform neither compresses it nor fills it: what happens aboard on the way is the story's, and D7 gives the story what it needs to write it. It has a heading, one of the eight compass directions, set by the base `compass` set under `drive: player` or `start <vehicle> heading <direction>` under `drive: control`; or a course, set by the `coordinates` set (D4) or `send <vehicle> to <coordinates or landmark>`. While under way, every `pace` turns the vehicle's machine takes one step of `stride` units: along its heading, or toward its course (x grows east, y grows north; on a diagonal each axis advances `stride`, and a course runs diagonally until one axis matches, then straight, never overshooting its target; *the course rule added 2026-10-17 from the Desktop review: the route was undefined*). Everything a step does is checked along its whole path, not only where it ends, so a stride wider than a landmark never jumps it and nothing in sight is passed unseen. Where the vehicle is, when it is not at a landmark, is the expanse itself: the expanse is the room. **Arrival is automatic** (David, 2026-10-17, Q-1: "yes"): a landmark occupies its unit cell, and the step whose path crosses that cell (each coordinate rounded, so fractional positions under `use sailing` arrive the same way) ends there, stops the vehicle, and puts it in the landmark's room, whether it came by heading or by course. Words such as `land`, `dock` and `make port` are a domain extension's, not this record's. `stop <vehicle>` clears heading and course; under `drive: player` too, as for a compass vehicle (ADR-366 D5f).

| Lines | Drives | `commands:` sets | Statements | Conditions |
| --- | --- | --- | --- | --- |
| `pace:`, `stride:`, `sight:` (D6); starts `in <expanse> at <coordinates>` | `player`, `control` | `compass`, `coordinates` | `start <vehicle> heading <direction>`, `send <vehicle> to <coordinates or landmark>` (`control`), `stop` | `is at <landmark>`, `is under way`, `is heading <direction>`, `is in <expanse>`, and D7's |

**D4 — The `coordinates` command set.** `set course for <x>, <y>` and `set course for <landmark>`, on the stock `setting-course` action, with words in parser-en-us and lines in lang-en-us, as every ADR-366 D5i set is.

**D5 — Coordinates are held only while the vehicle is in the expanse** (*added 2026-10-17 from the Desktop review, enforcing ADR-366 D9*). At a landmark, where the vehicle is, is its location, the one record; the trait holds no coordinates there. On departure the vehicle takes the landmark's row as its starting point. Heading, course and coordinates are plain data on `VehicleTrait` (ADR-366 D5g), so a voyage survives a save.

**D6 — Sight: whoever looks sees a distance, in bands, and out of sight is out of scope** (David, 2026-10-17: "a tall ship or even a small ship would be able to see in the distance without a telescope and futher with one"; "there should def be distance bands"; resolving the former Q-5). An open vehicle carries `sight: <n>`, required (`analysis.open-missing-sight`), in expanse units: how far one sees from it with the naked eye, a tall ship farther than a rowboat. A thing carrying `sight: <n>` is an instrument: `look through <instrument>` aboard an open vehicle looks once with the instrument's sight instead (the telescope takes the verb by capability dispatch, ADR-090, from `searching`, where `look through` maps today). What sight reaches is every landmark, every other open vehicle and every floating thing (D10) in the same expanse within that distance, measured from the looker's coordinates; each is named when looking, in one of three **distance bands**, fixed at thirds of the sight in use: *close by*, *in the distance*, *on the horizon*, with its compass direction. Within sight a thing may be examined, at any band, and what it shows from there is its `seen from afar: <text>` line, required on every landmark room and every open vehicle (`analysis.missing-seen-from-afar`; David, 2026-10-17, Q-1: "yes"), so distant prose is always the author's; a floating thing needs none, and is named and shown by its own name and description. **A landmark room looks out with its own optional `sight: <n>`** (David, 2026-10-17: "yes to both"): from it, the player sees the open vehicles, floating things and other landmarks of its expanse within that distance of the landmark's coordinates, in the same bands, so a harbour can watch for sails; a landmark room without the line sees nothing of the expanse, and rooms keep not seeing rooms. `sight:` on a room is that room's outlook; on a thing it makes an instrument, and an instrument used in a landmark room looks with its own sight from there. The expanse may carry `visibility: <n>`, optional, capping every looker's sight in it, naked or through an instrument; the story changes it with the shipped `set the <expanse>'s visibility to <n>`, for fog and night (David, Q-1: "yes"). **In an expanse, scope is sight**: `canSee` between two things in one expanse compares their distance with the looker's sight rather than answering "same room", so two ships thirty units apart do not see each other until one comes within range. The answer to "how far" is always the author's number.

**D7 — The voyage is the author's story, and the platform gives it every hook** (David, 2026-10-17: "the author would also be responsible for the monotony of boring part of a voyage by implementing story on the ship itself - not our problem, but we need to enable all of it"). Beside the base conditions, a story can read and react to:

- **Sight:** `<thing> is in sight`, `<thing> is close by`, `<thing> is in the distance`, `<thing> is on the horizon`, each seen from where the player looks: their vehicle, its cell when they are out of it (D9), or a landmark room with `sight:` (D6). The anchor `when <thing> comes into sight`, usable wherever a state anchor is (a `define sequence`, an `after` clause).
- **Distance:** `<vehicle> is within <n> of <landmark or x, y>`.
- **Time under way:** the shipped `when <vehicle> becomes under way` anchor with `<n> turns later`, as ADR-366 already gives every vehicle.
- **Position:** the vehicle's heading, course and coordinates, readable as values in prose and conditions.

**The expanse's description varies by position with no new structure** (David, 2026-10-17, Q-3: "a"). It is one description, and the author varies it with the shipped per-entity override, `phrase <key> while <condition>:`, gated on the conditions above (`phrase description while the Marigold is within 20 of the Reef:`). Named areas inside an expanse are not added; a later record takes them up if a story needs areas for scope, sight or rules rather than prose.

So a voyage of a hundred turns is as eventful as the author makes it: the bosun's quarrel at turn twenty, a sail on the horizon, the cook's fever as the Azores come into sight.

**D8 — Edges are authored as any IF map edge, and a vehicle never crosses one** (David, 2026-10-17, Q-2: "authored as in any IF map edge...we could make defaults for map edges with wind or a storm and just don't allow the ship to sail towards the edge"; "yes, fold it in"). Each side of an expanse may carry the shipped blocked-exit line, `<direction> is blocked: <phrase-key>`, for `north`, `south`, `east` or `west`, with its text in the phrasebook; `while` is not taken there, since nothing lies past an edge to open onto (`analysis.edge-while`). The step whose path would pass an edge ends at the edge, stops the vehicle, and reports that edge's phrase once; while the vehicle is at an edge, a heading with any component toward it is refused with the same phrase, so a ship cannot sail toward the edge it has reached. An edge with no line uses the stock `expanse-edge` line ("You can go no farther that way."), plain because the base serves space as well as water; a domain extension may replace that default (`use sailing` gives weather, ADR-375), and `override message` replaces either. Literal coordinates outside the size, in `send` or a placement, are `analysis.coordinates-outside-expanse`; coordinates the player types outside it are refused with the stock `coordinates-outside-expanse`. The expanse is left only at a landmark, so any exit on an expanse other than its edge lines is `analysis.expanse-exit`.

**D9 — Leaving the vehicle in the expanse is allowed by default, and the player stays with the ship** (David, 2026-10-17, Q-4: "authored, default to allow but keeping PC and ship in same cell so player can return to the ship (AC Black Flag style) and throwing things into the water is allow and lost by default (sinks or floats aways)").

- **The player.** `exit` from the vehicle, or ADR-366 D7's `to outside` from a vehicle with rooms aboard, puts the player in the expanse room, in the vehicle's cell. Out of the vehicle, the player holds a floating position (D10's trait, with no drift) at the vehicle's cell, held only while they are out, as a vehicle at a landmark holds none (D5); which vehicle they left is never recorded, and `enter` (or `board`) reaches any open vehicle in that cell. They cannot move from the cell (`go` in the expanse refuses with the stock `stays-by-vehicle`). *(Amended 2026-10-17, session 32f84f, from the four-record review: the position was "the vehicle's, read, never copied", which left a player between two vehicles in one expanse undefined.)* While the player is out, the vehicle's machine holds: it keeps its heading or course and takes no step, so the ship is there to return to; `enter` (or `board`, for a vehicle with rooms aboard) takes the player back, dropping their position, and the machine resumes on the next step. Out of the vehicle, the player sees with the vehicle's sight (D6), since they are beside it. Both are the author's to change: a story that forbids leaving writes `refuse when` on `exiting`, and the stock lines are overridable.
- **Things.** A floating thing dropped or thrown into the expanse floats (D10). Any other thing dropped or thrown by a player in the expanse room, or thrown from the vehicle into it, is lost by default, and so is one the story moves there at runtime: it goes offstage (ADR-325 D2), and the stock `lost-overboard` reports it ("The <thing> drifts away."), worded to serve water and space alike. A thing's own `phrase lost-overboard` says how it goes (the anchor sinks, the bottle floats off), and the story may bring it back with `move`. What the player carries stays with them.

**D10 — Floating things drift, and are retrieved alongside** (David, 2026-10-17: "the expanse should support floating items that drift randomly. when they're in the same cell as the ship, the player can 'RETRIEVE X'"; "yes to both, fold them in").

- **What floats is marked.** A thing marked `floats` may be in an expanse with coordinates of its own, placed `in <expanse> at <coordinates>` or arriving there by D9. Its coordinates are plain data on a floating trait, held only while it is in the expanse, so it survives a save as a vehicle does.
- **Drift is the expanse's.** The expanse writes `drift: 1 unit every <n> turns`; each drift step moves every floating thing in it one unit in a random compass direction, drawn from the engine's seeded random service (`packages/core/src/random/seeded-random.ts`, used by `packages/engine/src/session/engine-random-service.ts`) so a run is deterministic at its seed. A story with any `floats` thing and an expanse without `drift:` is `analysis.floats-without-drift`. Drift never crosses an edge (D8): a step that would is not taken. A floating thing whose drift enters a landmark's cell washes up: it moves into that landmark's room and leaves the expanse.
- **Thrown overboard, it floats where it fell.** A floating thing dropped or thrown into the expanse takes the vehicle's cell and drifts from there; one that does not float sinks, by D9.
- **Seen, and steered for.** Within sight a floating thing is named in the distance bands (D6), so the player can steer for it.
- **Coming alongside.** The step whose path crosses a floating thing's cell (rounded, as for arrival, D3) ends there and stops the vehicle under either drive, clearing heading and course as `stop` does, reported by the stock `vehicle-alongside`; a stride wider than a cell never passes it.
- **Retrieved.** A floating thing in the vehicle's cell is in scope and within reach, for a player aboard or out of the vehicle in its cell (D9). `retrieve <thing>` is a stock parser-en-us word on the shipped `taking` action, reported by the stock `retrieved` ("You haul the <thing> aboard."); `take <thing>` works as well. Taken, it leaves the expanse and its coordinates. No new action is added, and `taking`'s own rules and a story's `refuse when` on it apply.

**Scale is the author's, and large expanses cost nothing extra.** An expanse stores its size and its landmarks, not its cells, so `size: 1000 by 500` is as cheap as `20 by 20`; sight and stride are numbers on the same scale, and bands are fractions of sight, so every rule above reads the same at any size (David, 2026-10-17: "we should make sure we allow for very large water bodies (200 x 200 or 1000 x 500)").

## The language, as an author reads it

Every line below is **unshipped syntax**; nothing here compiles today.

```chord
use expanses

create the Belt
  an expanse
  size: 20 by 20
  aka belt, void

  Black, and the slow tumble of rock against it.

  landmarks
    the Mining Platform: 3, 3
    the Derelict: 14, 9
  end landmarks

create the skiff
  a vehicle, openable
  in the Belt at 3, 4
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark
  aka craft

create the Mining Platform
  a room
  seen from afar: a cluster of lights on a lopsided rock

create the Derelict
  a room
  seen from afar: a long dead hull, turning slowly end over end
```

`steer east` puts the skiff under way on a heading. `set course for 14, 9` or `set course for the Derelict` sets a course instead: five diagonal steps to 8, 9, then six east, and on the eleventh turn it is in the Derelict's room. With sight 6, the Derelict is *on the horizon* from 6 units out, *in the distance* from 4, *close by* from 2. A story that flies it instead writes `drive: control` and `send the skiff to the Derelict` under a console.

A large sea, with an instrument and a voyage hook:

```chord
use expanses

create the Western Ocean
  an expanse
  size: 1000 by 500
  visibility: 80
  drift: 1 unit every 3 turns
  north is blocked: ice-fields
  west is blocked: storm-wall

  Grey swells to every horizon.

  landmarks
    Port Royal: 40, 250
    the Azores: 610, 300
  end landmarks

create the Marigold
  a vehicle, openable, transparent
  in the Western Ocean at 40, 251
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 10 units
  sight: 30
  seen from afar: three masts and a press of grey canvas

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore
  sight: 20

create the Azores
  a room
  seen from afar: a line of blue peaks standing out of the sea

create the brass telescope
  a thing
  in the Marigold
  sight: 75

create the cask of rum
  a thing, floats
  in the Western Ocean at 300, 260
  aka cask, rum

  A tarred cask, riding low.

define sequence landfall
  when the Azores comes into sight
    phrase lookout-cries-land
  3 turns later
    phrase cook-takes-ill
end sequence
```

On `set course for the Azores` at ten units a turn, the Marigold closes the forty-nine units north in the first five steps and the rest east, arriving in fifty-seven turns, and the story fills them; on a plain heading east she would hold y 251 and pass south of the islands without arriving. Through the telescope the islands show 75 units out; to the naked eye they come into sight at 30, which fires `landfall`; examined at any band, they show "a line of blue peaks standing out of the sea". A story that brings fog in writes `set the Western Ocean's visibility to 5`, and both the eye and the telescope see no farther than 5. Steered north to the ice, the Marigold stops at the edge with the author's `ice-fields` line and will not take a northerly heading again until she has turned away; the south and east edges, unwritten, use the stock line.

The cask drifts a unit every three turns. When it comes within thirty units the player sees "a cask, on the horizon" in its direction and can steer for it; the step whose path crosses its cell brings the Marigold alongside and stops her, and `retrieve cask` hauls it aboard. A bottle thrown over the side bobs off from her cell the same way, if it `floats`; the anchor sinks. From Port Royal, with its `sight: 20`, a player ashore sees the Marigold come in from twenty units out.

## Acceptance Criteria

Each is discharged by a test named in its plan phase; none is discharged by this record.

1. **AC-1 (D2–D5, Phase 13).** A craft in a fixture story under `packages/*/tests` is steered by heading and sent by course across an expanse, arrives at a landmark's room, and stops when told; a save taken under way restores it at its coordinates with its heading or course; at a landmark the trait holds no coordinates; a stride wider than a landmark's cell still arrives on the step whose path crosses it; a vehicle reaching a written edge stops there with its phrase and is refused a heading toward it, and an unwritten edge does the same with the stock line; a player who exits mid-expanse is in the expanse room at the vehicle's cell, cannot `go`, finds the vehicle has not moved, and boards it again, after which it resumes; a thing that does not float, thrown into the expanse, is offstage with its `lost-overboard` line. **REAL-PATH** through the assembled engine (rule 13a).
2. **AC-1b (D10, Phase 13).** In a fixture expanse at a pinned seed, a floating thing drifts one unit every written interval, never past an edge, and washes up in a landmark's room when its drift enters that cell; a floating thing thrown overboard takes the vehicle's cell and drifts from there; a vehicle whose step crosses a floating thing's cell, with a stride wider than the cell, stops alongside with `vehicle-alongside`; `retrieve <thing>` and `take <thing>` there take it, out of the expanse; `retrieve` out of the cell does not reach it; a save restores a floating thing at its coordinates. **REAL-PATH**.
3. **AC-1a (D6, D7, Phase 13).** In a fixture expanse, a landmark is out of scope beyond the vehicle's sight, named in the right band and direction inside it, examinable there with its distant prose, and visible farther through an instrument; a second open vehicle and a floating thing are out of scope beyond sight in the same way; from a landmark room with `sight:` the player sees an open vehicle within its range in the right band, and from one without it sees nothing of the expanse; a sequence anchored on `when <landmark> comes into sight` fires on the first step that brings it within sight, including a step that crosses the sight boundary mid-path. **REAL-PATH**.
4. **AC-2 (D1, D4, Phase 13).** `set course for <x>, <y>` sets a `coordinates` craft's course and is refused with `vehicle-no-such-command` (ADR-366 D7a) aboard a vehicle without that set; every diagnostic this record names has a compile test.

## Consequences

- **The catalog gains the kind noun `expanse` under `use expanses`, and the grammar** the `use expanses` line, `movement: open`, the `in <expanse> at <coordinates>` placement, the expanse lines `size:` and the `landmarks` block, the vehicle lines `stride:` and `sight:`, `seen from afar:` on landmark rooms and open vehicles, the expanse lines `visibility:` and `drift:`, the trait adjective `floats`, `sight:` on a landmark room, the blocked-exit line on an expanse as its edge (the line is shipped; its reading on an expanse is new), `sight:` on a thing (an instrument), the `coordinates` set, the coordinate form of `send`, the conditions `is in <expanse>`, `is in sight`, `is close by`, `is in the distance`, `is on the horizon` and `is within <n> of`, and the anchor `when <thing> comes into sight`, each under `docs/architecture/chord-grammar-changes.md` with its EBNF row and guide page, in the phase that implements it.
- **`VehicleTrait`'s machine state gains** coordinates and a course; a new expanse trait carries size, landmark coordinates and drift; a new floating trait carries a floating thing's coordinates; a landmark room's `sight:` is room data.
- **Plan Phase 13 implements this record** with ADR-375; this record's part of the phase's entry condition is met.
- **New stock lines in lang-en-us**, each overridable: `expanse-edge`, `coordinates-outside-expanse`, `stays-by-vehicle`, `lost-overboard`, `vehicle-alongside`, `retrieved`, the `retrieve` grammar word, and the sight report's band and direction wording.

## Session

Session 95606b, 2026-10-17, on `chord-4-0`, during the Phase 11 grammar discussion. Written into ADR-366 on 2026-10-16 and moved here on David's "agreed" to a Claude Desktop review's recommendation. The review's answers to the open questions were carried as proposals; David then resolved each in the interview the same day, adopting some, replacing others (sight, edges, leaving the vehicle), and adding stride and the voyage hooks. The review then found two gaps, things without coordinates in an expanse and sight from a landmark; David answered the first with floating things (D10) and accepted the second as proposed.
