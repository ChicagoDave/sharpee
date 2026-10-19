# Phase 13 proposal: expanses and sailing

**Status**: PROPOSAL, for discussion before any `packages/` change (CLAUDE.md: platform changes are discussed first).
**Date**: 2026-10-18, session 7a7637
**Implements**: ADR-376 (expanses extend the vehicle, ACCEPTED 2026-10-17) and ADR-375 (sailing extends the vehicle, ACCEPTED 2026-10-17), the first two extensions under ADR-366 D12. Both passed the four-record `adr-review` of 2026-10-17 with their findings folded.
**Plan phase**: Phase 13 of `plan-20261013-chord-4-0.md` (CURRENT since 2026-10-18).

Every Chord line in this document is **unshipped syntax**. The author-facing examples are the two "The language, as an author reads it" sections (the Belt and the skiff, the Western Ocean and the Marigold, the Sargasso under sail); this proposal is how that text gets parsed, checked, lowered and played.

## What exists today

- **The base vehicle is whole** (Phases 10–12): `VehicleTrait.model` is a union of five models (`none`, `line`, `streets`, `compass`, `flight`) with the machine's state beside each (`packages/world-model/src/traits/vehicle/vehicleTrait.ts:30-110`); `stepVehicle` steps one per type and `startVehicle` / `stopVehicle` / `sendVehicle` set the state (`vehicleBehavior.ts`); the core `StateMachinePlugin` ticks every vehicle after the story's machines (`packages/plugin-state-machine/src/vehicle-machine.ts:74`), reporting `vehicle_arrived` and `vehicle_stopped` under going's namespace.
- **The Chord front end is table-driven**: `MOVEMENT_TABLE` (`packages/chord/src/analyzer/vehicles.ts`) names, per movement type, the lines, drives, command sets, statements and conditions it admits; `vehicleBuilder` (`analyzer/entity/vehicle.ts`) checks every line against the row and writes `IRVehicle` (`ir.ts:257`). A sixth type is a sixth row plus the lines it adds.
- **Command sets ride stock actions**: `steering` (`steer <direction>`, `heave to`) and `setting_course` (`set course for <topic>`) in stdlib, with grammar in `standard-en-us.story` and lines in lang-en-us; `createVehicleCommandTransformer` makes `go` and `steer` one action aboard. A set is a word in `commands:` that the action checks with `takesCommandSet`.
- **Extensions are manifests**: `ExtensionManifest` (`packages/chord/src/manifests/types.ts`) carries a `use` name, `core`, and `traitAdjectives` — **nothing else**. The analyzer gates a construct behind its `use` by hand (`analysis.scoring-needs-use`, `analysis.chapters-needs-use`). `KIND_NOUNS` is a static set in `catalog.ts:23`. ADR-366 D12 and ADR-376 D2 say an extension "may contribute a kind and a movement type, as ADR-215's vocabulary manifest allows" — the manifest *type* does not allow it yet.
- **Placement is `in <room>` or `starts in <room>`** (`chord.ebnf:1306-1319`); there is no `at <x>, <y>` tail.
- **Scope is "same room"**: `VisibilityBehavior.canSee` (`packages/world-model/src/world/VisibilityBehavior.ts:142`) is the one definition of visible, and nothing in it measures distance.
- **Randomness is a session service**: `SchedulerService.tick` takes the `RandomService` from the turn context (`packages/plugin-scheduler/src/scheduler-service.ts:203`); drift draws the same way (ADR-293).
- **Landed this phase's neighbours**: the `vehicle-at-end` stock line ADR-366 D7a promises never shipped (GH #600) — the same report path this phase builds (`vehicle-alongside`, `expanse-edge`) should carry it when discussed.

## Slices

Ordered by risk, smallest platform surface first; expanses whole before sailing, since ADR-375 builds on every piece of ADR-376. Each slice ends green on chord, story-loader and the touched packages, every `--check` gate clean, and the Dungeo chain unchanged.

### Slice 1 — Chord front end for `use expanses`

**Manifest.** `ExtensionManifest` gains two optional fields: `kindNouns: string[]` and `movementTypes: string[]`. `EXPANSES_MANIFEST = { name: 'expanses', traitAdjectives: [{ word: 'floats', fields: [] }], kindNouns: ['expanse'], movementTypes: ['open'] }`. The analyzer admits a manifest's kind nouns and movement types only when its `use` line is declared; written without it, each is `analysis.expanses-needs-use` (D1), with the fix-it "add `use expanses`". `KIND_NOUNS` stays the core set; the kind check at `analyzer.ts:1476` consults the declared manifests before refusing.

**Grammar** (each row to `chord.ebnf` and `docs/architecture/chord-grammar-changes.md`):

```ebnf
use-line         = ... | "use" "expanses" NL ;
KIND-NOUN        = ... | "expanse" ;                        (* under use expanses *)
movement-line    = "movement" ":" ( ... | "open" ) NL ;
placement        = ( "in" | "on" ) ARTICLE name [ "at" NUMBER "," NUMBER ]   (* at: expanse only *)
                 | "starts" "in" name ;
create-line      = ... | size-line | visibility-line | drift-line | stride-line | sight-line
                 | seen-from-afar-line | landmarks-block ;
size-line        = "size" ":" NUMBER "by" NUMBER NL ;
visibility-line  = "visibility" ":" NUMBER NL ;
drift-line       = "drift" ":" "1" "unit" "every" NUMBER ( "turn" | "turns" ) NL ;
stride-line      = "stride" ":" NUMBER ( "unit" | "units" ) NL ;
sight-line       = "sight" ":" NUMBER NL ;                   (* vehicle, room, thing *)
seen-from-afar-line = "seen" "from" "afar" ":" text NL ;
landmarks-block  = "landmarks" NL >>> { name ":" NUMBER "," NUMBER NL } <<< "end" "landmarks" NL ;
blocked-exit     = DIRECTION "is" "blocked" ":" key NL ;    (* on an expanse: an edge; `while` refused *)
send-stmt        = "send" name "to" ( name | NUMBER "," NUMBER ) ;
set-stmt         = ... | "set" ARTICLE name "'s" "visibility" "to" NUMBER ;
condition        = ... | name "is" "in" name                 (* an expanse *)
                 | name "is" "in" "sight" | name "is" "close" "by"
                 | name "is" "in" "the" "distance" | name "is" "on" "the" "horizon"
                 | name "is" "within" NUMBER "of" ( name | NUMBER "," NUMBER ) ;
anchor           = ... | "when" name "comes" "into" "sight" ;
```

**Movement table.** A sixth row, `open`: lines `drive`, `commands`, `pace`, `stride`, `sight`, `seen-from-afar` (+ aboard lines); drives `player`, `control`; sets `compass`, `coordinates`; statements `start heading` (`control`), `send` (`control`), `stop` (`control`, `player`); conditions `under-way`, `at`, `heading`, plus the new `in-expanse`, `within`, and the four sight conditions. The analyzer: placement `in <expanse> at x, y` required for `open` (`analysis.open-missing-placement`, the name chosen here; ADR-376 names none) and refused on anything but an `open` vehicle or a `floats` thing (`analysis.expanse-not-open-vehicle`); `pace:`, `stride:`, `sight:`, `seen from afar:` required (`vehicle-missing-pace`, `open-missing-stride`, `open-missing-sight`, `missing-seen-from-afar`); `seen from afar:` required on every landmark room; `size:` required on an expanse, `landmarks` rows must name rooms inside the size with two numbers (`landmark-not-room`, `landmark-outside-expanse`, `landmark-axes`); literal coordinates outside the size (`coordinates-outside-expanse`); an exit on an expanse other than an edge line (`expanse-exit`); `while` on an edge (`edge-while`); `floats` with no `drift:` on the expanse (`floats-without-drift`); `sight:` on a thing makes an instrument, on a room an outlook.

**IR.** `IRVehicle.movement` gains `'open'` with `stride`, `sight`, `seenFromAfar`, and `placement: { expanse, x, y }`. `IREntity` gains `expanse?: { width, height, landmarks: Array<{ room, x, y }>, visibility?, drift?, edges: Partial<Record<'north'|'south'|'east'|'west', key>> }`, `floats?: { expanse, x, y } | true`, `sight?: number`, `seenFromAfar?: string`. `send` gains a coordinates form; conditions and the anchor gain their nodes.

**Tests**: compile tests for every diagnostic above and for the lowered IR of the Belt example (`packages/chord/tests/adr-376-expanses-front-end.test.ts`), in the shape of `adr-366-vehicle-front-end.test.ts`. `./repokit ebnf --check` and the grammar log row.

- **LANDED 2026-10-18, session 7a7637.** `EXPANSES_MANIFEST` with the manifest fields `kindNouns`, `movementTypes`, `requires`; the kind-noun check and the vehicle builder read them; `use <x>` without a required `use` is `analysis.<x>-needs-<y>`. Parser: the lines, the `landmarks` block, the `at` tail, `send … to <x>, <y>`, the sight reads, `within`, `comes into sight`. Analyzer: `collectExpanses`, the `expanse` builder (after `vehicle`), the `open` row, `buildOpen`, `resolveSightPredicate`, `resolveExpanseTarget`, `set … visibility` → `expanse-visibility`, the `in sight` anchor state. IR as proposed, with `IREntity.expanse/sight/seenFromAfar` and `vehicle-send.coordinates`. Diagnostic names not in the record, chosen here: `expanse-missing-size`, `landmark-duplicate`, `expanse-line-owner`, `landmarks-owner`, `sight-owner`, `seen-from-afar-owner`, `open-not-in-expanse`, `at-not-expanse`, `placement-missing-at`, `visibility-value`, `sight-subject`; `landmark-axes` is the parser's `parse.landmark-row`. Two base-rule touches: `transparent` admitted on a vehicle (ADR-366 D2/D3, the record's own example writes it), and an expanse's blocked-exit lines pass the exit host gate as edges. EBNF rows and hash re-pinned (no bump), website copy refreshed, grammar log row 2026-10-18. Measured: chord 1531 passing (33 new), `tsc` clean on `src` and `tests`, `./repokit ebnf --check` clean. story-loader: `src/extensions/expanses.ts` registry entry (the `gatedConstruct` backstop; the manifest ↔ registry conformance test requires one per gated manifest); the loader, evaluator and statement walker refuse `movement: open`, the sight reads and `set … visibility` by name with a `LoadError` until Slices 2–3 land. story-loader 1290 passing.

### Slice 2 — world-model: the expanse, the floating thing, the open model

**Traits** (new dirs under `src/traits/`, both barrels, dist and dist-esm): `ExpanseTrait` — `width`, `height`, `landmarks: Record<roomId, {x, y}>`, `visibility?: number`, `drift?: number` (turns), `edges: Partial<Record<Side, messageKey>>`, machine state `turnsToDrift`. `FloatingTrait` — `x`, `y` held only while in an expanse (D10, D5); a player out of the vehicle holds one with no drift (D9). `RoomTrait.sight?: number` (a landmark's outlook, D6). A thing's instrument sight is `SightTrait { sight }` rather than a field on identity, so `look through` can dispatch on it.

**The open model** on `VehicleTrait`: `{ kind: 'open', drive, pace, stride, sight, seenFromAfar, heading: string | number | null, course: {x, y} | null, x: number | null, y: number | null, turnsToStep, atEdge: Side | null }`. Coordinates are `null` at a landmark (D5). `startVehicle(heading)` takes a compass word; `sendVehicle` takes a room id *or* `{x, y}`; `stopVehicle` clears heading and course.

**`stepOpen`** in `vehicleBehavior.ts`: every `pace` turns, one step of `stride` along the heading or toward the course (diagonal until one axis matches, then straight, never overshooting); the path from the old to the new cell is walked cell by cell (each coordinate rounded) and the first of these ends the step: a landmark's cell (move the vehicle into the room, clear coordinates, stop: `arrived`), a floating thing's cell (stop: `alongside`, with the thing), an edge (stop at the last cell inside, `atEdge` set: `edge`, with the side), else the new cell. Leaving a landmark on `start`/`send` takes the landmark's row as the starting point and the vehicle moves into the expanse room. A heading with a component toward `atEdge` is refused by `startVehicle` (false); `atEdge` clears on any step away. `VehicleStep` gains `alongside` and `edge`.

**Drift**: `driftFloating(world, expanse, random)` — one unit in a random compass direction per floating thing every `drift` turns, drawn from the `RandomService` point `vehicle.drift.<expanseId>`; never past an edge; a drift into a landmark's cell washes the thing up into that room and clears its coordinates.

**Distance and sight**: pure functions `distance(a, b)`, `bandOf(distance, sight)` (thirds: close by, in the distance, on the horizon), `directionOf(from, to)` (eight points), `positionOf(entity, world)` (a vehicle's cell, a floating thing's, a landmark room's row), `sightOf(looker, world)` (vehicle sight, or the landmark room's, capped by the expanse's visibility).

**Tests**: `vehicle-open.test.ts` — steps by heading and course, the diagonal rule, arrival on a path that crosses a landmark with a stride wider than the cell, alongside, edge stop and the refused heading, coordinates null at a landmark, `toJSON`/`loadJSON` mid-voyage; `expanse-drift.test.ts` at a pinned seed; the band and direction functions.

### Slice 3 — story-loader and the machine: lowering, ticking, statements, conditions, stock lines

- **Lowering**: an expanse lowers to a room entity with `ExpanseTrait` (so headings, looking and scope read it as a room); each landmark row writes the trait; an open vehicle's placement puts it in the expanse room with coordinates, or in a landmark room with none when placed on a landmark's cell; a `floats` thing placed in an expanse gets `FloatingTrait`; `sight:` on a room and on a thing lower to their fields; edge lines lower to `edges`.
- **Machine**: `tickVehicles` reports the new steps — `vehicle_alongside` (D10, stock `vehicle-alongside`), `expanse_edge` (D8: the edge's own phrase key when written, else the stock `expanse-edge`, once) — and `tickVehicles` gains the drift pass, taking the `RandomService` from the plugin context as the scheduler does.
- **Statements**: `send <vehicle> to <x>, <y>`; `set the <expanse>'s visibility to <n>`; `move` of a non-floating thing into an expanse room sends it offstage with `lost-overboard` (D9).
- **Conditions**: `is in <expanse>`, `is within <n> of`, `is in sight`, `is close by`, `is in the distance`, `is on the horizon`, each from the player's looking position (their vehicle, their own cell out of it, or a landmark room with `sight:`); the anchor `when <thing> comes into sight`, armed by the sequence stepper exactly as `becomes under way` is (`scheduler-constructs.ts:67-76`), reading a per-looker "was in sight last turn" that the machine keeps on the trait so a mid-path crossing counts.
- **Stock lines** (lang-en-us, going's namespace for the machine's, the owning action's for the rest; alias rows and `./repokit aliases`): `vehicle-alongside`, `expanse-edge`, `coordinates-outside-expanse`, `stays-by-vehicle`, `lost-overboard`, `retrieved`, and the sight report's band and direction wording. `vehicle-at-end` (GH #600) lands here if David agrees, since it is the same path.
- **Tests** (REAL-PATH through `bootTurns`, the Belt and the Western Ocean as sources): ADR-376 AC-1 and AC-1b in full — heading, course, arrival, stop, save under way, no coordinates at a landmark, wide stride still arrives, written and unwritten edges, drift at the seed, wash-up, alongside, retrieve in and out of the cell, a floating thing restored at its coordinates.

### Slice 4 — stdlib and the parser: the player in the expanse, sight as scope

- **`setting_course`** takes `<x>, <y>` as well as a landmark name on the `coordinates` set; refuses off-expanse coordinates with `coordinates-outside-expanse`; `vehicle-no-such-command` aboard a vehicle without the set (AC-2).
- **`exiting`** from an open vehicle in the expanse puts the player in the expanse room with a `FloatingTrait` at the vehicle's cell (D9); the machine holds while any player is out at its cell; **`entering`/`board`** any open vehicle in the player's cell drops the position and the machine resumes next step. **`going`** in an expanse room refuses `stays-by-vehicle`. **`dropping`/`throwing`** into the expanse: a `floats` thing takes the cell, anything else goes offstage with `lost-overboard`. **`taking`** a floating thing in the player's cell takes it out of the expanse; parser-en-us gains `retrieve` as a word on taking, reported `retrieved`.
- **Sight is scope** (D6): `VisibilityBehavior.canSee` gains one branch — when observer and target are positioned in the same expanse (a vehicle, a floating thing, a landmark room's outlook), visible iff `distance <= sightOf(observer)`; rooms still never see rooms. `looking` in an expanse, or in a landmark room with `sight:`, appends a sight report: each thing in sight by name, band and direction. `examining` a thing in sight but not in reach shows its `seen from afar:`. **`look through <instrument>`** moves from `searching` to a capability behavior on `SightTrait` (ADR-090) that looks once with the instrument's sight.
- **Tests**: ADR-376 AC-1a (out of scope beyond sight, the right band and direction, examinable with its distant prose, farther through an instrument, a second vehicle and a floating thing the same, a landmark room with and without `sight:`, `comes into sight` on a mid-path crossing) and AC-2; stdlib unit tests per action; `./repokit grammar --check`, `manifest --check`.

### Slice 5 — Chord front end for `use sailing`

`SAILING_MANIFEST` (`requires: ['expanses']` — a third optional manifest field, so `use sailing` without `use expanses` is `analysis.sailing-needs-expanses` generically). Grammar: `<n> degrees` wherever a heading is written (`start ... heading 135 degrees`, `is heading 135 degrees`); `commands: naval`; the expanse line `wind: from <direction | n degrees> | calm`; the vehicle's `sailing` block (`<a> to <b> degrees: <n> turn[s] | stopped`, per-setting rows with sails, `calm:` row); `sails: <setting>, ...` and `sails start: <setting>`; `set the <expanse>'s wind to ...`, `set the <vehicle>'s sails to <setting>`; conditions `is in irons`, `<vehicle>'s sails are <setting>`. Diagnostics: `sailing-needs-use`, `sailing-needs-expanses`, `sailing-not-open`, `sailing-and-pace`, `sailing-gap`, `sailing-overlap`, `sailing-no-calm`, `sailing-without-wind`, `sails-missing-start`, `sails-unknown-setting`, `sails-without-sailing`, `sailing-row-missing-setting`. IR: `IRVehicle.sailing?: { bands, calm }`, `sails?: { settings, start }`; `IREntity.expanse.wind`. Compile tests for all of it (`adr-375-sailing-front-end.test.ts`).

### Slice 6 — sailing runtime

- **world-model**: under sailing the open model's heading is a bearing (number, 0–359); `stepOpen` moves `stride` along the bearing (fractional coordinates, rounded for every path check); `ExpanseTrait.wind: number | 'calm' | null`; the vehicle's `sailing` table and `sails: { settings, current }` on the trait; after each step the band for the angle off the wind sets `turnsToStep` from the row (per setting with sails); a `stopped` band keeps the heading and `underWay` but takes no step, `inIrons` set once (under the fullest setting only, D7); `comeAbout` mirrors the heading across the wind, refusing dead into or before it and in a calm.
- **stdlib `steering`**: the `naval` set — `port <n> [degrees]`, `starboard <n> [degrees]`, bare `port`/`starboard` → `naval-how-far`, `hard to port|starboard` (90), `ahead` (under way), `heave to`, `come about`, `make sail`, `shorten sail`, `furl sails` (`sails-at-full`, `sails-already-furled`); grammar rows in `standard-en-us.story`; lang-en-us lines including `vehicle-in-irons` and `sailing-edge` (the unwritten-edge default for a sailing vehicle, D6).
- **story-loader**: lowering of the block and lines; `set ... wind`, `set ... sails` statements; the two conditions.
- **Tests**: ADR-375 AC-1 and AC-2 REAL-PATH through `bootTurns` with the Sargasso source (turned by degrees, pace by band, irons until turned out or the wind set, sails changing pace next step, still-but-not-in-irons, refusals at the ends, save mid-voyage restoring coordinates, bearing and setting); the refusals aboard a vehicle without the set; `sailing-not-open` compile tests.

### Slice 7 — fixtures, demonstration, docs

- Two fixture stories for the plan's demonstration under `sharpee test`, beside Phase 11's: `stories/expanses/` (the skiff in the Belt: `steer east`, `set course for 14, 9`, arrival at the Derelict, the cask retrieved) and `stories/sailing/` (the Marigold in the Sargasso: `starboard 15 degrees`, `ahead`, the pace by band, in irons, the weather glass), each with a `<id>.tests/` tree. (The ACs' REAL-PATH tests live under `packages/story-loader/tests` per ADR-376 AC-1; the demonstration trees are the author-visible proof — Finding 1.)
- Website: the `use` guide, the vehicle reference page gains the two extensions; `./repokit grammar`, `manifest`, `aliases`, `ebnf`, `protocol` all `--check` clean; IDE docs tab regenerated.
- ADR-376 and ADR-375: landed notes per decision, no decision changed; ADR-366 D12's two DRAFT markers → ACCEPTED (they are stale: both records were accepted 2026-10-17).
- Dungeo chain unchanged, measured.

## Findings that need David's call

**Finding 1 — Where the fixtures live.** ADR-376 AC-1 and ADR-375 AC-1 say "a fixture story under `packages/*/tests`"; the plan's demonstration says "two fixture stories under `packages/*/tests` ... under `sharpee test`". Those two cannot both hold: `sharpee test` runs a story directory with a `<id>.tests/` tree, which `packages/story-loader/tests` has no room for, while the ACs' REAL-PATH assertions on trait fields (`coordinates null at a landmark`, `turnsToStep`) need `bootTurns`. Recommendation: both, as Phases 11 and 12 did — the ACs as `bootTurns` tests in `packages/story-loader/tests` (REAL-PATH, asserting on trait state), and the demonstration as `stories/expanses/` and `stories/sailing/` trees. The plan's Demonstration line is amended to say so when the phase closes.

**Finding 2 — Sight as scope is the one change outside the vehicle's own files.** D6 puts a distance branch into `VisibilityBehavior.canSee`, the single definition of "visible" every action reads. The branch is guarded (both parties positioned in one expanse), so no non-expanse story changes, and the Dungeo chain measures that. Recommendation: proceed as Slice 4, last of the expanse slices, with the chain run before and after as AC-3's rule asks. The alternative — sight as a scope *rule* registered by the expanse trait through the capability registry — keeps `canSee` untouched but puts "what can I see" in two places, which is the defect ADR-273 removed.

**Finding 3 — `vehicle-at-end` (GH #600) rides Slice 3 or waits.** The machine's report path gains two reports in Slice 3; adding the missing third (ADR-366 D7a) there is three lines and an alias row. Recommendation: fold it in, under ADR-366, with its line in the funicular fixture asserted instead of the silence it asserts today.

Not asked, because the ADRs decide them: `open`'s required lines and their diagnostics, the diagonal-then-straight course rule, bands at thirds, arrival by rounded path cell, the player's own floating position out of the vehicle, drift from the seeded point, bearings as numbers with fractional coordinates, irons under the fullest setting only.

## Tests (rule 13a)

Every slice's acceptance is REAL-PATH: the fixture sources compiled by the real Chord front end, loaded by the real loader, played through the real engine (`bootTurns` in story-loader's tests, `./sharpee test` on the demonstration trees). Unit suites in chord (parse, diagnostics, IR), world-model (stepping, drift, bands, save round trip) and stdlib (the actions) back them. No stub of the loader, engine or machine stands in for an acceptance test.

## Next step

**RESOLVED** (David, 2026-10-18, session 7a7637: "go"): all three findings as recommended — ACs through `bootTurns` plus demonstration trees under `stories/`, sight as scope in `canSee` as Slice 4, GH #600 folded into Slice 3. Slice 1 started the same day.
