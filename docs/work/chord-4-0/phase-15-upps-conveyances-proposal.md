# Phase 15 proposal — UPPS conveyances as vehicles (Sparrow, tram, drop shuttle) and the bucket proof

**Date**: 2026-10-20 · **Session**: aa7a2f · **Plan**: `plan-20261013-chord-4-0.md` Phase 15 (Large, 400) · **Status**: LANDED 2026-10-20 (David: "go"; delete list approved by the same word)

## What exists today (measured 2026-10-20)

- The tram car is already a `line` vehicle under `drive: control` (Phase 11, segment `trampad2`). Nothing to do.
- The Sparrow is `create the courier ship / a thing, scenery` with `states: buttoned, boarding, underway, landed`, and its rooms are joined by fixed exits: Loading Dock `up to the Hold` (blocked `ramp-up` while buttoned); Hold `down to the Loading Dock` (blocked `ramp-sealed` while underway or landed); Airlock `out to the Landing Pad` (blocked `hatch-shut` while the outer hatch is closed); Landing Pad `in to the Airlock`. The fold is `define sequence the fold / when the courier ship becomes underway / 5 turns later / change the courier ship to landed`. This is the per-destination hull opening the phase retires.
- No Titan rooms, no drop shuttle. The guidance selector already carries `ceres, titan, kepler` and refuses kepler.
- The bucket's Chord proof is `stories/vehicles` (Phase 11); the Dungeo chain is the TypeScript bucket's confirmation.
- Baseline: `./sharpee test branch-stories/upps/upps.story` — 206 cards, 296 assertions passing, 8 of 8 rooms.

## Probe (scratch story, `./sharpee play`, 2026-10-20)

A flight vehicle with `aboard:`, `boarded through:`, `to outside` on two rooms, a `blocked while` gate on each, `send` from a switch, a sequence on `becomes under way`:

- `board <ship>` from the room the ship is in lands in the boarding room. `enter` is the same.
- `west is blocked while the outer hatch is closed` holds on a `to outside` exit; so does `down is blocked while the Sparrow is not at the Dock`.
- `send` after `switch on` leaves the ship nowhere for `passage:` turns; with `passage: 2 turns` and `2 turns later` the author's phrase and the stock "The Sparrow arrives at the Pad." land on the same turn, the phrase first.
- `switch off` while under way is refusable with `is under way`; after arrival `switch on` again sends it back. No `once` needed.
- `exit` and `disembark` in the boarding room take the outside exit; `exit` in another aboard room with its own `to outside` line takes that one (the ramp).

Two platform gaps, filed and worked around (both are ADR-366 D7 as landed; discussion first, not this phase):

1. **`to outside through <door>` loads as "never wired"** — the ADR's own Sparrow example. UPPS keeps the hatch as `a thing, openable, scenery` gating the exit with `blocked while … closed`, as today. GH #603.
2. **`out` in the boarding room is not rewritten** (`exit` and `disembark` are). Cards say `exit`. GH #604.

## The shape

```chord
create the courier ship
  a vehicle
  in the Loading Dock
  aka ship, courier, sparrow, ramp, skids
  movement: flight
  drive: control
  destinations: the Loading Dock, the Landing Pad, the Collar Vestibule
  passage: 5 turns
  aboard: the Hold, the Cockpit, the Airlock
  boarded through: the Hold
  states: buttoned, boarding

  A snub-nosed UPPS courier, the Sparrow, …

  on the player entering
    refuse when the courier ship is buttoned: ramp-up
  end on

create the Hold
  a room
  down to outside
  down is blocked while the courier ship is not at the Loading Dock: ramp-sealed
  north to the Cockpit
  north is blocked while the cockpit hatch is dogged: hatch-latched

create the Airlock
  a room
  east to the Hold
  west to outside
  west is blocked while the outer hatch is closed: hatch-shut

create the outer hatch
  a thing, openable, scenery
  in the Airlock

  on the player opening
    refuse when the courier ship is at the Loading Dock: hatch-in-dock
  end on

  after the player opening, once
    kill the player hatch-into-the-fold when the courier ship is under way
    phrase ceres-outside when the courier ship is at the Landing Pad
    phrase titan-outside when the courier ship is at the Collar Vestibule
  end after

create the fold drive
  …
  on the player switching_on
    the player must be in the flight couch: not-strapped-in
    refuse when the outer hatch is open: fold-hatch-open
  end on

  after the player switching_on
    send the courier ship to the Landing Pad when the guidance selector is ceres
    send the courier ship to the Collar Vestibule when the guidance selector is titan
    phrase fold-begins
  end after

  on the player switching_off
    refuse when the courier ship is under way: fold-no-abort
  end on

define sequence the fold
  when the courier ship becomes under way
  5 turns later
    phrase fold-ends
end sequence
```

**Boarding room: the Hold, not the Airlock.** The ADR example boards through the Airlock. In UPPS the carrier walks up the ramp into the Hold at the depot (the robot-loads prose, `ramp-up` while buttoned), and the Airlock's gauge, window and wheel are the way *off* at a destination. Boarding through the Airlock would walk the player through a hatch the story says stays shut in dock. So: `board the ship` is the ramp, at the dock and at Ceres alike ("You board the courier ship." then the Hold); the ramp down is `down to outside` from the Hold, open only at the dock; the hatch is `west to outside` from the Airlock, shut at the dock. One ship, two hull openings written once each, every destination.

**States.** `underway` and `landed` go (ADR-366 D9: `is under way`, `is at`). `buttoned` and `boarding` stay: the robot's loading is authored.

**Fold phrases.** `fold-ends` names Ceres today; it becomes per-destination on the step (`phrase fold-ends-ceres when … is at the Landing Pad`, etc.). The probe showed the step firing before the arrival line; whether `is at` is already true on that turn is settled in Slice 1 by play, and if not the step reads the selector instead. The stock arrival line ("The courier ship arrives at the Landing Pad.") is kept unless it reads badly beside the phrase, in which case `override message going-vehicle-arrived` — reported, not decided here.

## Delete list — WAITS FOR DAVID (plan entry state)

These lines stand in for the conveyance and are replaced by the shape above:

| File:line | Line | Replaced by |
|---|---|---|
| `upps.story:228` | Loading Dock `up to the Hold` | `board the ship` (D7) |
| `upps.story:230` | `up is blocked while the courier ship is buttoned: ramp-up` | `on the player entering` refuse on the vehicle |
| `upps.story:381` | Hold `down to the Loading Dock` | `down to outside` |
| `upps.story:382–383` | `down is blocked while … underway/landed: ramp-sealed` | one line, `while … is not at the Loading Dock` |
| `upps.story:576` | Airlock `out to the Landing Pad` | `west to outside` |
| `upps.story:577` | `out is blocked while the outer hatch is closed: hatch-shut` | same line on `west` |
| `upps.story:629` | Landing Pad `in to the Airlock` | `board the ship` |
| `upps.story:253` | `states: … underway, landed` | `is under way`, `is at` |

Nothing else is deleted; the `create the courier ship` scenery block becomes the vehicle block (same name, aka, prose, `lowering, raising` refusal).

## Slices

- **Slice 1 — the Sparrow as one vehicle.** The shape above; Titan's `Collar Vestibule` created as a stub room so the destination resolves. Re-record the changed cards in `w7eqlqnb` (fold leg: `switch off drive` now before the fold, `out` → `exit`, the ramp) and `a370cont` (`in` → `board ship`, `out` → `exit`). Tree green.
- **Slice 2 — the Titan leg as minimal exercisers.** Collar Vestibule (F1) east to the Shuttle Gate (F6); the drop shuttle (G) as `a vehicle, movement: line, carries: in, drive: control, stops: the Shuttle Gate, the Kraken Landing, direction: both, pace: 4 turns` with a drop lever that starts it and a window phrase `2 turns later`; Kraken Landing (H1). Prose Claude's within the design doc's premise; nothing beyond these four rooms (the customs robot, Rask, the suit gates are later rows). New segment from the pad after `show card to quint`: back aboard, `switch off drive`, `set selector to titan`, couch, `switch on drive`, five turns, hatch, Collar Vestibule, Shuttle Gate, shuttle, lever, window phrase, Kraken Landing, and back.
- **Slice 3 — evidence.** `./sharpee test` on UPPS; `./repokit build dungeo` and the Dungeo chain, one run (no platform change expected, so the count is 952); the grep for `to the Landing Pad`, `to the Airlock`, `underway`, `landed` in `upps.story` returning nothing conveyance-shaped; AC-6 of ADR-366 marked met with the card ids; checklist evidence pointers for any vehicle row still blank; the plan's Demonstrated line; design doc section 3 note already corrected to Phase 15 (done this session).

## Findings that need David's call

1. The two platform gaps above (issues filed). The proposal works around both; neither blocks the phase.
2. Boarding through the Hold rather than the Airlock (above). If David wants the ADR's Airlock shape, the hatch-in-dock prose changes instead.
3. Kepler stays out: `destinations:` lists three; the selector's kepler refusal stands. The Docking Tube and the third fold are not in this phase's deliverable (C–E, F–H only).

## Landed (2026-10-20, session aa7a2f)

All three slices as written, with these departures found by play:

- **Fold-end narration is a story-header clause**, not the sequence the ADR example writes, and not a clause on the ship. A `define sequence` runs once per story (GH #606), so the second fold had no phrase; a clause on the ship is sourced at the ship's room and a carrier aboard never sees it (GH #607); the story-owned `on every turn while the courier ship is at <Room>, once` broadcasts, one turn after the stock arrival line because scheduler daemons run before the vehicle tick (noted on #607). The drop keeps its sequence: the window is on the way down only, as the design doc says.
- **Test-tree `states` claims cannot say a vehicle condition** (GH #605): the two cards that pinned `underway`/`landed` now pin the rendered lines.
- Arriving by vehicle is not `entering` the room, so the Kraken Landing's arrival phrase sits on the shuttle's `after the player exiting … when the drop shuttle is at the Kraken Landing`.
- Prose made destination-neutral: the Hold's "The ramp slopes down to the dock." is "The ramp is aft."; `hatch-shut` no longer names Ceres.

Evidence (one run each after the last edit): `./sharpee test branch-stories/upps/upps.story` — 244 cards, 358 assertions passing, 11 of 11 rooms, 2 of 2 endings (baseline 206/296, 8 of 8); `./repokit build dungeo` clean; Dungeo chain 952 passing in 17 transcripts; the grep for `to the Landing Pad`, `to the Airlock`, `up to the Hold`, `underway`, `landed` in `upps.story` finds only the two `send` lines. No platform file changed. Issues filed: #603, #604, #605, #606, #607.

