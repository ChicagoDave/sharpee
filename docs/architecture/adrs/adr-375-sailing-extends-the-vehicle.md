# ADR-375: Sailing extends the vehicle: bearings in degrees, naval commands, wind and sails

**Status**: **ACCEPTED** (David, 2026-10-17, session 95606b: "yes, accept it", after the open questions interview resolved all three questions and `adr-review` returned 19/19 with three wording fixes applied). History: written DRAFT the same day (David: "yes, do the split", after his question "should we have a base vehicle set, then extensions for naval, space, car+streets, tram/train, bicycle, motorcycle+streets"). Split out of ADR-366, where this material was written the same day as its D5j, the `naval` bullet of D5i and Q-10, Q-14 and Q-15. The open questions interview ran on 2026-10-17 and resolved all three: Q-1 → D3 (the rest of the naval set), Q-2 → D1 (no wind on the compass type), Q-3 → D7 (sails). No Open Questions section remains. No implementation is authorized; every `packages/` change is gated on its discussion at its plan phase. **Amended 2026-10-17, session 32f84f** (David: "fix and accept", four-record `adr-review`): AC-2 reworded off "not understood" to ADR-366 D7a's `vehicle-no-such-command`; D5's `vehicle-missing-pace` citation now points at ADR-366 D5c, which names it. No decision changed.

**Scope**: `packages/chord` (the `use sailing` line, the bearing forms, the `naval` command set, the `wind:` line, the `sailing` block, the `sails:` and `sails start:` lines, the `is in irons` and sails conditions, `chord.ebnf`), `packages/story-loader` (their lowering), `packages/world-model/src/traits/vehicle/` (bearing and sail setting on the vehicle's machine), `packages/stdlib` (the `steering` action's naval turns and sail words), `packages/parser-en-us` and `packages/lang-en-us` (the set's words and lines)

## Date: 2026-10-17

**Kind**: technical

## Parent

- **ADR-366** (a vehicle is a kind with a movement model). **D12** there closes the base vehicle, names sailing as an extension, and requires an extension that builds on another to say so; **D5i** gives the command sets this record adds one to. Nothing here changes a base decision: without `use sailing`, ADR-366 reads as if this record did not exist.
- **ADR-376** (expanses). This record builds on it: **D3** there gives the `open` movement type this record extends, and **D2** the expanse that carries the wind. A story writes both `use expanses` and `use sailing`.
- **ADR-215** (extensions). `use sailing` is a `use` line in the shape `use scoring` and `use hunger` already have: a shipped extension, selected by name, with no package to install.

## Context

David, 2026-10-17, on the tall ship: "speed has to be an authored thing"; "naval sailing should be by degrees (starboard 15 degrees)"; "wind might be a factor if the author chooses or the author could decide there is always wind and the ship just needs to be steered. if the author wants wind as a factor than pace would either decrease (headwind) or increase (tailwind) or the ship might flounder until it turns into or away from the wind"; "then pace is effected by sails". Each is domain knowledge about ships. Written into the base vehicle, every author of a bucket or a tram would meet bearings, wind and sails in the grammar, the guide and the diagnostics. The base vehicle (ADR-366) is geometry: a line of stops, a room graph, a heading, places jumped between, a position in an expanse. Sailing is what a ship adds on top of a position and a heading.

## Decision

**D1 — `use sailing` turns the extension on, and every word below needs it.** Each line, block, command set and condition in this record, written in a story without `use sailing`, is `analysis.sailing-needs-use`. It builds on `use expanses` (ADR-366 D12): `use sailing` without `use expanses` is `analysis.sailing-needs-expanses`, and neither line turns on the other. The extension applies to `movement: open` vehicles only (ADR-376 D3); on any other type its words are `analysis.sailing-not-open`, and a region or room carrying `wind:` is the same error (David, 2026-10-17, Q-2: "no, as recommended"). A sea where the wind matters is an expanse; the compass type is a room graph whose eight exits a degree turn cannot land on. A story that wants weather on a sea of rooms writes it with its own conditions and prose, without wind-driven pace; a later record may put `wind:` on a region without changing anything here.

**D2 — Headings are bearings in whole degrees.** Under `use sailing`, an open vehicle's heading is a bearing, 0 to 359, 0 north, clockwise. A compass direction names its bearing (`northeast` is 45), so the base `compass` set, `start <vehicle> heading <direction>` and `is heading <direction>` keep working, and each also takes `<n> degrees`. A step moves the vehicle's `stride` along the bearing (ADR-376 D3), so coordinates become fractional; they stay plain data on `VehicleTrait` (ADR-366 D5g). A bearing arrives at a landmark, comes alongside a floating thing and stops at an edge exactly as a heading does, by the step whose path crosses the cell, each coordinate rounded (ADR-376 D3, D8, D10).

**D3 — The `naval` command set: `commands: naval`.** `port <n> degrees` and `starboard <n> degrees` turn the heading by `n` from where it points; `ahead` puts the vehicle under way on its heading; `heave to` takes it out. The words are parser-en-us grammar on the stock `steering` action, with lines in lang-en-us, as every ADR-366 D5i set is. A vehicle may combine it with the base sets (`commands: naval, compass`: a ship answering both "starboard 15 degrees" and "steer north"). The rest of the set (David, 2026-10-17, Q-1: "yes, as recommended"):

- **The word `degrees` is optional**: `starboard 15` is `starboard 15 degrees`.
- **A bare `port` or `starboard` asks how far**: it refuses with the stock `naval-how-far` ("How many degrees?"), so no turn size is invented for the author.
- **`hard to port` and `hard to starboard` turn 90 degrees**, the nearest a stepped movement comes to the helm hard over.
- **`come about` tacks through the wind**: it needs D4's wind, and turns the heading to the same angle off the wind on the other side of it (wind from 45, heading 90, comes about to 0). Aboard a vehicle without a `sailing` block, or in a calm, it refuses with the stock `naval-no-wind`; dead into or dead before the wind, where there is no other side, with the stock `naval-cannot-come-about`.
- **No turn starts the ship.** Turns change the heading, under way or not; `ahead` puts it under way.

**D4 — Wind is the author's choice, and the place carries it.** The two choices are written, never inferred:

- **Always wind, just steer.** The vehicle writes the base `pace:` line and wind is not read, whether or not the expanse has any.
- **Wind as a factor.** The expanse writes `wind: from <direction or bearing>` or `wind: calm`, and the story changes it with the shipped `set the <expanse>'s wind to <direction, bearing or calm>`; no statement is added. The vehicle writes a `sailing` block (D5) in place of `pace:`.

**D5 — The `sailing` block: pace by the angle off the wind.** Each row is a band of degrees off the wind, `<a> to <b> degrees: <n> turn[s]` or `<a> to <b> degrees: stopped`, measured between the heading and the bearing the wind comes from (0 is dead into the wind, 180 dead before it), plus one `calm: <n> turn[s]` or `calm: stopped` row. After each step, the band the ship is in sets the pace of the next, so a tailwind is faster and a headwind slower at exactly the paces the author wrote. In a `stopped` band, or a calm written `stopped`, the ship keeps its heading and stays under way but does not move: `vehicle-in-irons` is reported once, `<vehicle> is in irons` holds, and it moves again as soon as the player turns it out of the band or the wind shifts. How sails change the row's pace is D7.

**D6 — Under `use sailing`, an unwritten edge is weather.** ADR-376 D8 lets a domain extension replace the stock `expanse-edge` line; this extension does, with the stock `sailing-edge` ("Wind and sea drive you back."), for any edge of an expanse that carries no blocked-exit line, when the vehicle reaching it is a sailing vehicle. It is a stated exception to ADR-366 D7a's rule that a stock line never explains the world's reason: at a sea's edge there is no author prose to carry the reason, and David asked for this default ("we could make defaults for map edges with wind or a storm", 2026-10-17). A written edge line, or `override message`, still wins.

**D7 — Sails are optional, author-named settings on the vehicle, and set the pace within each band** (David, 2026-10-17: "then pace is effected by sails"; Q-3: "yes, as recommended").

- **Declared in order, with a start.** `sails: <setting>, <setting>, ...` names the settings from least to most canvas, and `sails start: <setting>` the one the ship starts in (`analysis.sails-missing-start`; a start not in the list is `analysis.sails-unknown-setting`). A sailing vehicle with no `sails:` line keeps D5's one pace per row. `sails:` on a vehicle without a `sailing` block is `analysis.sails-without-sailing`.
- **Each row gives a pace per setting.** With sails, a band row reads `<a> to <b> degrees: <setting> <n> turn[s] | stopped, ...`, naming every setting once (`analysis.sailing-row-missing-setting`). The `calm:` row keeps one value, since sails do nothing without wind. A new setting sets the pace from the next step, as a change of band does.
- **Irons is the wind's, not the canvas's.** D5's `vehicle-in-irons` and `is in irons` apply when the band is `stopped` under the fullest setting; a ship lying still only because its setting is `stopped` in a band where more canvas would move it reports nothing, and the story reads its setting.
- **The `naval` set gains the sail words**, understood only aboard a vehicle with `sails:`: `make sail` (one setting up), `shorten sail` (one down), `furl sails` (to the first). At the ends they refuse with the stock `sails-at-full` and `sails-already-furled`, whose lines name no setting, since the settings are the author's.
- **The story writes and reads it** with the shipped `set the <vehicle>'s sails to <setting>` and the condition `<vehicle>'s sails are <setting>`.
- **Sails are not things aboard.** Rigging the author makes (a halyard, a capstan) is an ordinary thing whose `on` handler writes `set`; the `sailing` block never reads entity states.
- **Wind has no strength.** Too much canvas in a gale is the author's story, written with the sails condition and the story's own state; the platform adds no strength to D4's wind.

Diagnostics for D4 and D5 (D7's are named there): `analysis.sailing-and-pace` (both written), `analysis.vehicle-missing-pace` (neither; ADR-366 D5c names it), `analysis.sailing-gap` and `analysis.sailing-overlap` (the bands cover 0 to 180 once each), `analysis.sailing-no-calm`, `analysis.sailing-without-wind` (a sailing vehicle starts in an expanse with no `wind:` line).

## The language, as an author reads it

Every line below is **unshipped syntax**; nothing here compiles today.

```chord
use expanses
use sailing

create the Sargasso
  an expanse
  size: 40 by 40
  wind: from northeast
  aka sea, weed

  Weed-choked water under a sky the colour of pewter.

  landmarks
    Port Royal: 3, 4
    the Reef: 12, 30
    the Wreck of the Dolphin: 25, 18
  end landmarks

create the Marigold
  a vehicle, openable, transparent
  in the Sargasso at 3, 5
  movement: open
  carries: in
  drive: player
  commands: naval
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  aka ship, barque

  sailing
    0 to 44 degrees: stopped
    45 to 74 degrees: 4 turns
    75 to 119 degrees: 2 turns
    120 to 180 degrees: 1 turn
    calm: stopped
  end sailing

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore

create the Reef
  a room
  seen from afar: a line of white where the swell breaks

create the Wreck of the Dolphin
  a room
  seen from afar: a canted mast standing out of the weed

create the weather glass
  a thing, scenery
  in the Marigold

  on the player tapping
    set the Sargasso's wind to southwest
  end on
```

`starboard 15 degrees` turns the Marigold fifteen degrees from her heading, and `ahead` puts her under way. With the wind from the northeast (45) and her heading 225, she runs dead before it, a unit a turn; at 180 she is 135 degrees off the wind and still makes a unit a turn; turned to 90 she is 45 degrees off the wind and makes a unit every four turns; turned to 60 she is in irons until the player turns her off the wind or the weather glass shifts it. The heading reads "The Sargasso, in the Marigold" until she reaches the Wreck of the Dolphin, whose room she is then in. `heave to` stops her. Run to the Sargasso's unwritten edge, she stops with "Wind and sea drive you back."

The same ship with sails (D7):

```chord
create the Marigold
  a vehicle, openable, transparent
  in the Sargasso at 3, 5
  movement: open
  carries: in
  drive: player
  commands: naval
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  sails: furled, reefed, full
  sails start: furled

  sailing
    0 to 44 degrees: furled stopped, reefed stopped, full stopped
    45 to 74 degrees: furled stopped, reefed 6 turns, full 4 turns
    75 to 119 degrees: furled stopped, reefed 3 turns, full 2 turns
    120 to 180 degrees: furled 6 turns, reefed 2 turns, full 1 turn
    calm: stopped
  end sailing

create the capstan
  a thing, scenery
  in the Marigold

  on the player turning
    refuse when the Marigold's sails are full: sails-at-full
    set the Marigold's sails to full
  end on
```

Furled, `ahead` puts her under way but she makes no way except before the wind, and she is not in irons. `make sail` sets her reefed, `make sail` again full, and running before the wind she makes a unit a turn; `shorten sail` drops her to reefed, a unit every two turns. Turning the capstan sets her full at once; turned to 60 under full sail she is in irons.

## Acceptance Criteria

Each is discharged by a test named in its plan phase; none is discharged by this record.

1. **AC-1 (D2–D7, Phase 13).** A sailing ship in a fixture story under `packages/*/tests` is turned by `starboard <n> degrees`, makes the pace its `sailing` row gives for its angle off the wind, lies in irons in a `stopped` band until turned out of it or the wind is set elsewhere; with sails, makes each setting's pace in its band, changes pace on the step after `make sail`, `shorten sail`, `furl sails` or a story's `set`, lies still without being in irons when only its setting is `stopped`, and refuses `make sail` at full and `shorten sail` furled; and is restored from a save taken under way at its coordinates, bearing and sail setting. **REAL-PATH** through the assembled engine (rule 13a).
2. **AC-2 (D1, D3, D5, Phase 13).** `starboard 15 degrees` is refused with `vehicle-no-such-command` (ADR-366 D7a) aboard a vehicle without `commands: naval`; aboard one, `starboard 15` turns as `starboard 15 degrees` does, a bare `starboard` refuses with `naval-how-far` and leaves the heading unchanged, `hard to port` turns 90 degrees, `come about` mirrors the heading across the wind, and refuses with `naval-no-wind` in a calm and `naval-cannot-come-about` dead into the wind; `commands: naval` on a compass vehicle and `wind:` on a region are `analysis.sailing-not-open`; every diagnostic this record names has a compile test.

## Consequences

- **The grammar grows by** the `use sailing` line, the `<n> degrees` bearing form, the `naval` command set, the expanse line `wind:`, the vehicle's `sailing` block, the vehicle lines `sails:` and `sails start:`, the per-setting row form, the sail words, the conditions `is in irons` and `<vehicle>'s sails are <setting>`, each under `docs/architecture/chord-grammar-changes.md` with its EBNF row and guide page, in the phase that implements it.
- **`VehicleTrait`'s machine state gains** a bearing and the sail setting; ADR-366 D8's rule holds, since the language writes each.
- **Plan Phase 13 implements this record** after ADR-376's `use expanses` in the same phase; ADR-376 is ACCEPTED (2026-10-17) and this record has no open questions.
- **New stock lines in lang-en-us**, each overridable: `sailing-edge` (D6), `naval-how-far`, `naval-no-wind` and `naval-cannot-come-about` (D3), `sails-at-full` and `sails-already-furled` (D7).
- **The other extensions ADR-366 D12 names (space, roads, rail) are not designed here.**

## Session

Session 95606b, 2026-10-17, on `chord-4-0`, during the Phase 11 grammar discussion. The material was first written into ADR-366 that day and moved here on David's "yes, do the split".
