# Phase 11 proposal: a vehicle in Chord

**Status**: PROPOSAL, for discussion before any `packages/` change (CLAUDE.md: platform changes are discussed first).
**Date**: 2026-10-17, session 95606b
**Implements**: ADR-366 as accepted 2026-10-17 (the base vehicle) and ADR-377 (state machines are core, ACCEPTED 2026-10-17, session 32f84f). ADR-376 and ADR-375 are Phase 13. All four passed a joint `adr-review` on 2026-10-17 (READY WITH CLARIFICATIONS, five SMALL findings, all folded).
**Plan phase**: Phase 11 of `plan-20261013-chord-4-0.md` (CURRENT).

Every Chord line in this document is **unshipped syntax**. The full author-facing example is ADR-366's "The language, as an author reads it" (bathtub, bucket, tram, funicular, drop shuttle, bicycle, Marigold, Sparrow); this proposal is how that text gets parsed, checked, lowered and played.

## What exists today

- **Chord** knows nothing of vehicles. `KIND-NOUN` is `thing | room | door | person | container | supporter | region` (`chord.ebnf:1187`). The only vehicle words in the package are message aliases.
- **Phase 10's platform half**: `VehicleTrait` carries `model?: VehicleLineModel | VehicleStreetsModel` and nothing else (`packages/world-model/src/traits/vehicle/vehicleTrait.ts`); `RoomTrait.admits?: string[]` (`roomTrait.ts:101`); `going` rides, stays or steers by the model; one enclosure rule for seeing out.
- **Statements and anchors already in the grammar** that the vehicle reuses: the timer verbs `start` / `stop` (`chord.ebnf:1800`), the state anchor `when <name> becomes WORD` (`chord.ebnf:1648`), `move` (D4), the blocked-exit line, `extend action` with `means`.
- **The per-turn host D5e names was gated.** `StateMachinePlugin` (priority `TURN_BANDS.platformPhases.floor + 40`) is registered only by the `state-machines` extension's `installFromIR`, i.e. only under `use state-machines` and only when the story has a `define machine` (`packages/story-loader/src/extensions/state-machines.ts:123-135`), while the base vehicle has no `use` line (ADR-366 D12). David ruled 2026-10-17: "we should merge state machine usage into the base system". Slice 0 does it.

## Slices

Ordered by risk, smallest platform surface first. Each slice ends green on chord, story-loader and the touched packages, and the Dungeo chain unchanged.

### Slice 0 — State machines join the base

David, 2026-10-17: "we should merge state machine usage into the base system"; "at some point, we don't need to hold to older ADRs and can supersede them". The decision is **ADR-377** (ACCEPTED 2026-10-17; ADR-215 stamped), which supersedes ADR-215's gating of state machines; the precedent is ADR-215 Q4, which made NPCs core. The slice below is ADR-377's D1–D4.

- **chord**: `STATE_MACHINES_MANIFEST` gains `core: true` (`packages/chord/src/manifests/state-machines.ts`), so `define machine` needs no `use` line and `use state-machines` is `analysis.extension-core` ("vocabulary is core — it is always available; remove the `use` line", the shipped message at `analyzer.ts:1066-1072`). The analyzer's gate on `define machine` without the `use` is removed. `chord.ebnf`'s `use-plain-line` note drops state-machines from the gated list and names it with npc as core.
- **story-loader**: `state-machines` leaves `EXTENSION_REGISTRY` (`extension-registry.ts:175`), which removes its `gatedConstruct` backstop. The loader's core path registers one `StateMachinePlugin` for every story, beside the NPC service and the scheduler, and registers the story's lowered machines on it (today's `installFromIR` body, moved). The vehicle machine (Slice 3) runs as a phase of that same plugin. An empty plugin is a no-op per turn.
- **Corpus**: the line is removed from every story and fixture that writes it: `branch-stories/fernhill`, `branch-stories/ides-of-march`, `stories/character-acceptance/chord/p10-threads.story`, `packages/chord/tests/fixtures/drawbridge.story` and `gatehouse.story`, `docs/work/stdlib-reference/fixtures/plugins/machine.story`, `tools/explorer-probe/fixtures/declared-state-fixture`, `tools/ide/test-fixtures/fernhill-frozen/fernhill.story`, `packages/world-index/tests/branches.test.ts`, `packages/chord/tests/phrasebooks.test.ts`, and the chord and story-loader tests that build a `use state-machines` source (ADR-377 D4 lists them). The tests that assert the gate (`compile-gate-sweep`, `extension-install`, `state-machine.test.ts`) flip to assert the core behavior: `define machine` compiles and runs with no `use`, and `use state-machines` is `analysis.extension-core`.
- **Docs**: the website's `use` guide, grammar reference, and the two plugin pages; the IDE docs tab regenerates from them. `docs/architecture/chord-grammar-changes.md` gets the row.
- **ADRs**: ADR-377 supersedes the state-machine gating in ADR-215 (stamped at ADR-377's acceptance), and ADR-366 D5e gets one sentence: the plugin is core, so the vehicle machine needs no `use` line.
- **Measured**: the Dungeo chain is unchanged (Dungeo is TypeScript and registers what it uses itself); fernhill's and ides-of-march's transcripts are unchanged apart from the removed header line.

### Slice 1 — Chord front end: parse, IR, analyzer

**Grammar** (each row added to `chord.ebnf` and `docs/architecture/chord-grammar-changes.md`):

```ebnf
KIND-NOUN     = ... | "vehicle" ;
create-line   = ...
              | movement-line | carries-line | drive-line | commands-line
              | stops-line | direction-line | pace-line
              | destinations-line | passage-line
              | aboard-line | boarded-through-line
              | admits-line                               (* rooms, rooms groups, regions *)
              | position-block ;
movement-line = "movement" ":" ( "none" | "line" | "streets" | "compass" | "flight" ) NL ;
carries-line  = "carries" ":" ( "in" | "on" ) NL ;        (* distinct from `carries <name>`, start inventory, by the colon *)
drive-line    = "drive" ":" ( "state" | "control" | "player" ) NL ;
commands-line = "commands" ":" WORD { "," WORD } NL ;     (* base sets: compass, destinations *)
stops-line    = "stops" ":" name { "," name } NL ;
direction-line= "direction" ":" ( "both" | "one-way" ) NL ;
pace-line     = "pace" ":" NUMBER ( "turn" | "turns" ) NL ;
destinations-line = "destinations" ":" name { "," name } NL ;
passage-line  = "passage" ":" NUMBER ( "turn" | "turns" ) NL ;
aboard-line   = "aboard" ":" name { "," name } NL ;
boarded-through-line = "boarded" "through" ":" name NL ;
admits-line   = "admits" ":" name { "," name } NL ;
position-block= "position" NL
                >>> { "when" condition ":" name NL }
                    "otherwise" ":" name NL
                "end" "position" NL ;
exit          = DIRECTION "to" ( name | "outside" ) [ "through" name ] ;   (* D7 *)
statement     = ...
              | "start" name [ "heading" DIRECTION ] [ stmt-when ] NL      (* vehicle or timer, resolved by kind *)
              | "send" name "to" name [ stmt-when ] NL ;
condition     = ...
              | name "is" "under" "way"
              | name "is" "at" name
              | name "is" "heading" DIRECTION ;
step-anchor   = ... | "when" name "becomes" "under" "way" ;               (* one fixed phrase, D5e *)
```

`start` and `stop` stay one statement with the timer verbs; the analyzer resolves the name: a timer gets ADR-325's meaning, a vehicle gets D5f's, anything else is the existing unknown-target error. `heading` is legal only on a vehicle.

**IR**: `IREntity` gains `vehicle?: IRVehicle` (movement, carries, drive, commands, stops, direction, pace, destinations, passage, aboard, boardedThrough, position rows as resolved conditions plus stop ids) and `admits?: string[]` on rooms and regions; exits gain `toOutside: true`. New statement and condition IR nodes for the four forms above.

**Analyzer**: every diagnostic ADR-366 names, each with a compile test (AC-2):
`vehicle-already-enterable`, `vehicle-missing-movement`, `vehicle-missing-carries`, `carries-with-aboard`, `carries-not-vehicle`, `vehicle-missing-drive`, `vehicle-drive-not-moving`, `vehicle-line-not-for-movement`, `vehicle-drive-not-for-movement`, `vehicle-statement-not-for-movement`, `vehicle-missing-commands`, `commands-not-player-driven`, `commands-not-for-movement`, `vehicle-not-at-stop`, `line-too-few-stops`, `line-repeated-stop`, `line-missing-direction`, `vehicle-missing-pace`, `position-no-otherwise`, `not-a-stop`, `position-against-direction`, `position-without-state`, `state-without-position`, `move-state-driven-vehicle`, `flight-too-few-destinations`, `flight-no-passage`, `admits-not-steered-vehicle`, `aboard-without-boarding-room`, `boarding-room-not-aboard`, `vehicle-aboard-openable`, `outside-not-aboard`.

**Catalog / IDE**: the kind noun, the colon-line words and the diagnostics land in the catalog the IDE reads; the protocol types regenerate (`repokit protocol`).

### Slice 2 — Lowering and the trait

- `story-loader` gets a `vehicle` case beside `container`: `createEntity(..., 'object')`, `IdentityTrait`, `EnterableTrait` with `preposition` from `carries:` (D2), `ContainerTrait` or `SupporterTrait` for what may be put inside (with `holds`), `VehicleTrait`.
- `VehicleTrait.model` widens to the five types, each carrying its declaration and its machine state as plain fields (D5g):
  - `none` — `{ kind: 'none' }`
  - `line` — stops, oneWay, drive (`state` or `control`), pace, and state `underWay`, `travelDirection`, `turnsToStep`
  - `streets` — `{ kind: 'streets' }`
  - `compass` — drive, pace, and state `heading`, `turnsToStep`
  - `flight` — destinations, passage, drive, and state `destination`, `turnsRemaining`
  - `commands: string[]` beside the model for `drive: player`.
  Constructor guards hold the invariants the analyzer reports first (two stops, no repeats, two destinations, a pace of at least 1).
- `admits:` on a room, a `rooms` group or a region lowers to `RoomTrait.admits` on every member room (D6).
- `<direction> to outside` lowers to an exit whose destination is resolved on each use to the containing vehicle's room (D7); the resolution lives in world-model beside the existing exit lookup.
- The `position` block lowers to an ordered list of `{ guard, stopId }` with the guard a compiled Chord condition, as `chordGuard` already does for machines. Guards are code, not state; the trait holds only data, so D5g's save rule holds.

### Slice 3 — The machine

One stepping function per type in world-model (`vehicleBehavior.ts`), pure over the trait and the world: read the trait, decide the step, call `moveEntity` (D4 carries the riders), write the trait's state, return the event (`vehicle-arrived`, `vehicle-stopped`). The core `StateMachinePlugin` (Slice 0) calls it for every vehicle each turn, as a phase beside the story's own machines, at D5e's priority.

The statements reach the machine through stdlib/engine effects the loader already routes statements through: `start` sets `underWay` (and `heading`), `stop` clears it, `send` sets `destination` and `turnsRemaining`. `when <vehicle> becomes under way` is emitted by the machine's transition, so the existing state-anchor plumbing fires the sequence.

### Slice 4 — stdlib and parser

- New stdlib action **`steering`** (four-phase, ADR-051): `steer <direction>` and, from inside a `commands: compass` vehicle, `go <direction>`, setting the heading of a `compass` vehicle or moving a `streets` one by one exit (today's `going` branch moves here, so `going` delegates rather than duplicating); `heave to` clears the heading.
- New stdlib action **`setting-course`**: `set course for <destination>` on a `flight` vehicle (playing is Phase 12; Phase 11 lands the action's validate and its refusal off a flight vehicle).
- `board` / `disembark` grammar on `entering` / `exiting`, only for a vehicle with rooms aboard; `vehicle-not-boardable`, `vehicle-not-at-hatch`.
- Stock lines in lang-en-us for every D7a key, plus `vehicle-arrived` and `vehicle-stopped`.
- The test D5i promises: `extend action steering` with a pattern line `means direction east` binds `steering`'s direction slot.

### Slice 5 — Fixtures and demonstration

- **Bucket fixture**: a dedicated test story (never Dungeo itself) with the bucket as one `drive: state` line vehicle, checked against the bucket's walkthrough sequence: fill, rise, empty, fall.
- **Two-direction line fixture**: a `drive: control` car with `pace: 2 turns`, `start`, the end stop, the run back, `vehicle-at-end` on a one-way line.
- **Compass fixture**: a `drive: player` boat on a region with `admits:`, steered, stopped at a room that does not admit it, `stop` from a story clause; a save under way restores heading and step count.
- **UPPS tram car**: the tram line at Piazzi becomes a `drive: control` line vehicle behind the brake lever (UPPS is the testing story whose rooms Claude may author within David's premise).
- `none` and `flight` parse, analyze and lower here; `flight` plays in Phase 12.

## Findings that need David's call

**Finding 1 — Where the machine ticks. RESOLVED** (David, 2026-10-17: "we should merge state machine usage into the base system"): state machines become core, Slice 0.

**Finding 2 — A command set's word aboard a vehicle that lacks the set. RESOLVED** (2026-10-17, the four-record `adr-review`, folded on David's "fix and accept"): the words are always in parser-en-us grammar, so the refusal is the action's, not the parser's. ADR-366 D7a gained the stock line `vehicle-no-such-command`; `steering` and `setting-course` refuse with it in validate when the vehicle the player is in does not list the set. ADR-366 AC-10, ADR-375 AC-2 and ADR-376 AC-2 now say so. Slice 4 ships the line with the other D7a keys.

**Finding 3 — Dungeo's balloon daemon.** ADR-366 D10 keeps the balloon daemon "until D5e's machine lands", which is this phase. Recommendation: leave Dungeo's balloon on its daemon in Phase 11 and record a follow-up issue. The balloon is TypeScript, not Chord, and moving it is a Dungeo content change to be measured by the chain on its own, not folded into the Chord phase.

## Tests (rule 13a)

The phase's acceptance is REAL-PATH through the assembled engine: the fixture stories compiled by the real Chord front end, loaded by the real loader, played by the bundle (`node dist/cli/sharpee.js --test`) with transcripts, plus unit suites in chord (parse, analyzer diagnostics), story-loader (lowering), world-model (stepping functions, save round-trip) and stdlib (`steering`). No stub of the loader or engine stands in for the acceptance tests.

## Next step

David rules on Finding 3; Slice 0 is authorized (ADR-377 ACCEPTED) and starts next, then Slice 1 with the EBNF and grammar-log rows written first.
