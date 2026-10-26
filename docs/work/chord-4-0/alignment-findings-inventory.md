# Chord 4.0 — alignment findings inventory (re-verified)

**Date**: 2026-10-21 · **Session**: 1588df · **Companion to**: `plan-20261021-alignment-fixes.md` · **Sources**: `alignment-ledger.md` (Open + F1–F23), `ddd-sweep-20261021.md` (D1–D22).

Every file:line below was re-read against the working tree on 2026-10-21. Nothing under `packages/` changed since 2f14ed01c except regenerated files, so almost everything holds. Drift is listed at the end. "Phase" is the plan phase that fixes the row.

Kinds: **fix** = shortcut removed at its home; **design** = David decides first (plan Phase 0, question number given); **rename** = a name change, David picks or confirms the word.

## Inventory

| Id | Home (package / file) | Kind | Depends on / overlaps | Phase | Closed |
|---|---|---|---|---|---|
| Older-1 tool-requirement trio | world-model: cuttable, diggable, flammable, openable, light-source traits; stdlib `tool-shared.ts` | fix (David places it, Q12) | none | 10 | FIXED Phase 10 (ledger) |
| Older-2 heard events skip `enrichTurnEvents` | engine: sound stage, turn-event-processor | fix | none | 9 | FIXED Phase 9 (ledger) |
| Older-3 `play sound … when client has sound` gates world sound | chord / story-loader / engine sound stage | design (Q9) | none | 9 | FIXED Phase 9, Q9 C (ledger) |
| F1 admittance has a second home in going | world-model `TraversalBehavior.ts:190`; stdlib `going.ts:350-363`, `pushing.ts:178-180`; `vehicleBehavior.ts:510-512, :686-691` | fix + design (Q1 compass vehicle) | D17 (same fields), D21 (same mover set); F1/D17/D21 share one phase | 1 | FIXED Phase 1, Q1 A (ledger) |
| F2 seeing inside a container copied | world-model `VisibilityBehavior.ts:607`; stdlib `searching.ts:109-110`, `examining-data.ts:295` | fix | F3, D14 (same file) | 2 | FIXED Phase 2 (ledger) |
| F3 "dark to this observer" re-derived | world-model `VisibilityBehavior.ts:207, :278` vs `isDarkFor :79`; doc `:52-64` | fix | F2 | 2 | FIXED Phase 2 (ledger) |
| F4 vehicle machine's reports have no owner | plugin-state-machine `vehicle-machine.ts:56-63`; stdlib `going-messages.ts:25-26`; lang-en-us `going.ts:46`, `steering.ts:23`, `setting-course.ts:25` | fix | D13 (extends it); F7 (same plugin seam) | 4 | FIXED Phase 4 (ledger) |
| F5 English read outside the parser | parser-en-us `standard-en-us.story:637-652`; stdlib `steering.ts:68-85`, `entering.ts:88`, `setting-course.ts:95, :83, :101`; story-loader `loader.ts:1765, :3040` | fix (Q10 confirms the shape) | D15 (loader and stdlib spell direction words); F6 (same two actions) — F6 first | 5 | FIXED Phases 5 and 7, Q10 A (ledger, two entries) |
| F6 behaviors do not name their refusals | world-model `vehicleBehavior.ts:287-292, :458-462`, `expanseBehavior.ts:79-82`; stdlib `steering.ts:120, :180`, `setting-course.ts:64, :72, :186` | fix | F8 (`placeOf`), F5 (after) | 3 | FIXED Phase 3 (ledger) |
| F7 expanse edge phrase stored twice | story-loader `runtime/derived.ts:105`, `loader.ts:407-410`, `state-machines.ts:148-152`; plugin `vehicle-machine.ts`; chord `analyzer/entity/expanse.ts:190-196` | fix | F4 (same plugin seam) | 4 | FIXED Phase 4 (ledger) |
| F8 open vehicle's place has three homes | world-model `vehicleBehavior.ts:462`, `sightBehavior.ts:130`, `expanseBehavior.ts:253`; stdlib `setting-course.ts:72`; story-loader `evaluator.ts:1005` | fix | D14 (`placeOf` moves to `world/`), F6 | 2 | FIXED Phase 2 (ledger) |
| F9 `exit` aboard a vehicle guesses | stdlib `vehicle-command-transformer.ts:69`; chord `analyzer/entity/vehicle.ts:422-436` | design (Q2) | none | 3 | FIXED Phase 3, Q2 (ledger) |
| F10 boarding checks the hatch by hand | stdlib `entering.ts:79` | fix | F1 (asks traversal) | 3 | FIXED Phase 3 (ledger) |
| F11 `AboardTrait` holds candidates twice | world-model `aboardTrait.ts:52-59` | fix | F1 (carrier contract), F10 | 3 | FIXED Phase 3 (ledger) |
| F12 counter owner resolves two ways | story-loader `runtime/statements.ts:975-985`, `evaluator.ts:660-669` | fix + design (Q3 timer key) | none | 6 | FIXED Phase 6, Q3 and its follow-on (ledger) |
| F13 stale sailing header | story-loader `extensions/sailing.ts:6-9` (loader lowers it at `loader.ts:347-357`) | fix | none | 6 | FIXED Phase 6 (ledger) |
| F14 claim result types mirrored | branch-tester `claim-report.ts:31-70`; originals `claims-walk.ts:48`, `claims-runner.ts:44`, `claim-floor.ts:43` | fix | F23 | 8 | FIXED Phase 8 (ledger) |
| F15 lock verbs cut from typed text | branch-tester `claim-lock.ts:173-187` | fix | F16 (same file) | 8 | FIXED Phase 8 (ledger) |
| F16 Chord claim syntax written outside Chord | branch-tester `claim-lock.ts:326-328, :471-505`; chord `src/claims.ts` | fix | F15 | 8 | FIXED Phase 8 (ledger); devkit's duplicate-name read is GH #621 |
| F17 compass-bearing table on both sides | chord `analyzer/sailing.ts:17-20`; world-model `expanseBehavior.ts:69-73` | fix (a pinning test) | D16 (same kind of test), D15 | 9 | FIXED Phase 9 (ledger) |
| F18 entity-id derivation inline | chord `analyzer.ts:4438, :2070, :5376, :5639`, `analyzer/entity/context.ts:253`, `analyzer/room-groups.ts:64`, `vehicles.ts:139`, `expanses.ts:47` | fix | same-name-rooms syntax round | 7 | FIXED Phase 7 (ledger) |
| F19 `MOVEMENT_TABLE` not the whole table | chord `analyzer/vehicles.ts:7-8`, `entity/vehicle.ts:41, :133-135, :300-376`, `analyzer.ts:6847`, `parser.ts:1876`, `ir.ts:259` | fix | D3 (movement/model name), D1 | 7 | FIXED Phase 7 (ledger) |
| F20 repeated stop vs repeated destination | chord `analyzer/entity/vehicle.ts:455-462, :587`; world-model `VehicleTrait.buildModel` | fix | none | 7 | FIXED Phase 7 (ledger) |
| F21 expanse builder reads raw syntax | chord `analyzer/entity/expanse.ts:38-40` | fix | none | 7 | FIXED Phase 7 (ledger) |
| F22 diagnostic codes reused | chord `analyzer/entity/sailing.ts:61/75, :108, :175/186/197`; `entity/vehicle.ts:281` | fix | none | 7 | FIXED Phase 7 (ledger) |
| F23 Testing tab writes its own ratio | `tools/ide/web/testing-surface/src/claims.ts:59`, `cards.ts:1400-1405`; branch-tester `claim-report.ts:199` | fix | F14 | 8 | FIXED Phase 8 (ledger) |
| D1 `passage` names two concepts | chord `ir.ts:273-274` vs `:1038-1042`, parser, analyzer | design (Q4) + rename | F19 (movement words), D16 | 7 | FIXED Phase 7, Q4 P (sweep) |
| D2 boarding has three names | chord `ir.ts:278`; world-model `vehicleTrait.ts:201`; story-loader `loader.ts:365` | rename (Q11) | D3 | 6 | FIXED Phase 6, Q11 a (sweep) |
| D3 movement type has two names | chord `ir.ts:259`; world-model `vehicleTrait.ts:212` | rename (Q11) | D2, F19 | 6 | FIXED Phase 6, Q11 a (sweep) |
| D4 a claim lock has three words | branch-tester `tree-document.ts:1096`, `claim-floor.ts:43`; ide-protocol `run-events.ts:514`; Testing tab | rename (Q11) | F14 | 8 | FIXED Phase 8, Q11 b (ledger, sweep) |
| D5 predicate spelled with wrong function | stdlib `command-validator.ts:696` | fix | D14 (the `holderOf`/`placeOf` home) | 9 | FIXED Phase 9 (sweep) |
| D6 query named as command | world-model `containerBehavior.ts:282-287`; stdlib `emptying.ts:174-181` | fix + rename (Q11) | none | 9 | FIXED Phase 9, Q11 c (sweep) |
| D7 directory breaks action naming | stdlib `actions/standard/setting-course/` vs `constants.ts:101` | rename | F5/F6 edit files in it — rename after phase 5 | 9 | FIXED Phase 9, move confirmed (sweep) |
| D8 machine reports by containment | plugin `vehicle-machine.ts:117-150` | design (Q5) | D12, F4 | 4 | FIXED Phase 4, Q5 C (sweep) |
| D9 loader writes expanse fields | story-loader `runtime/statements.ts:456, :465`; world-model expanse behavior | fix | none | 6 | FIXED Phase 6 (sweep) |
| D10 one press writes `isOn` twice | event-processor `handlers/device/index.ts:31`; stdlib `pushing.ts:231` | fix | none | 9 | FIXED Phase 9 (sweep) |
| D11 drift is silent | plugin `vehicle-machine.ts:157`, header `:22-23`; world-model `expanseBehavior.ts:261`; story-loader `runtime/move-clauses.ts:30` | fix | D13, D12 | 4 | FIXED Phase 4, D11 a (sweep) |
| D12 riding into a room is not arriving | plugin `vehicle-machine.ts` | design (Q6) | D8, D11 | 4 | FIXED Phase 4, Q6 A (sweep) |
| D13 event names that are not facts | plugin `vehicle-machine.ts:49-53`; story-loader `statements.ts:678-681` | rename | F4 | 4 | FIXED Phase 4, Q11 d (sweep) |
| D14 sight is a system in a trait folder | world-model `traits/expanse/sightBehavior.ts` → `world/`; `ReachabilityBehavior.ts:9-11`; stdlib `examining.ts:115` | fix | F2, F3, F8, D5 | 2 | FIXED Phase 2 (sweep) |
| D15 direction has many spellings | world-model `expanseBehavior.ts:37, :64`, `expanseTrait.ts:37`; story-loader `loader.ts:3046`, `timers.ts:111`, `derived.ts:25`; stdlib `looking.ts:108`, `pushing.ts:174` | fix | F5, F17 | 5 | FIXED Phase 5 (sweep); stdlib's remaining word reads were F24, fixed Phase 11 |
| D16 passage key four spellings | chord `parser.ts:2963`, `entity/exits.ts:39`; world-model `directions.ts:72-87`; stdlib `going.ts:507` | fix | F17 (same pinning test) | 1 | FIXED Phase 1 (sweep) |
| D17 `admits` mixes two kinds | world-model `roomTrait.ts:34, :40, :115, :171` | fix (shape confirmed Q13) | F1 | 1 | FIXED Phase 1, Q13 (sweep) |
| D18 IR encodes outside as `''` | chord `ir.ts:1071-1076`, `analyzer.ts:6541`; world-index `loader-semantics.ts:76, :250` | fix (shape confirmed Q13) | none | 6 | FIXED Phase 6, Q13 (sweep) |
| D19 expanse data on core traits | world-model `identityTrait.ts:54`, `roomTrait.ts:122, :172` | design (Q7) | F8, D14 | 6 | FIXED Phase 2 (moved by Q7 A) (sweep) |
| D20 two events for "now gives light" | stdlib `lighting.ts:118` (`delegateValidate` branch) | design (Q8) | none | 9 | FIXED Phase 9, Q8 A (sweep) |
| D21 climbing moves the climber around traversal | stdlib `climbing.ts:126-131, :269` | fix | F1 | 1 | FIXED Phase 1 (sweep) |
| D22 overboard rule spelled twice | stdlib `dropping.ts:164, :391` | fix | none | 9 | FIXED Phase 9 (sweep) |
| D23 two pattern languages for typed commands (`passage` line vs `grammar` block) | chord `parser.ts:2940-2970` (passage), `:5900-5985` (grammar patterns); story-loader `loader.ts:1765` | language change (ADR superseding ADR-378 D1's form) | F5, D1 | 7 | FIXED Phase 7, ADR-380 (sweep) |

Count: 3 older items + 23 F + 22 D = 48 rows, plus D23 (raised in Phase 0) = 49.

**Closed** (2026-10-22, alignment-fixes Phase 11, session 289aa0): each row's Closed column names the phase that fixed it and the record holding the fix with its file:line, either `alignment-ledger.md` (Fixed) or `ddd-sweep-20261021.md` (its FIXED entries and Closing table). Those cites were re-checked at 8128c8821 and corrected where later phases had moved them. Findings raised after this inventory, F24 and F25, are not rows here; both were fixed in Phase 11 (ledger).

## Overlaps worth stating

- **F4 / D13**: D13 extends F4 (the loader is a third emitter of the vehicle's report, `statements.ts:678-681`); one declaration below both.
- **F5 / D15**: both are English or direction words read where they should arrive resolved; D15's loader conversion and F5's destination data are done in one pass over the loader's direction handling.
- **F17 / D16**: the same fix, a test that pins a zero-dependency Chord copy equal to the platform copy. Built once as a pattern.
- **F1 / D17 / D21**: one traversal-system phase. F1 and D17 touch the same `admits` fields; D21 is the walker mover ADR-379 names.
- **F2 / F3 / D14 / F8**: one file family (`VisibilityBehavior.ts`, `sightBehavior.ts`, `expanseBehavior.ts`); `placeOf` and `holderOf` move to `world/` with sight.
- **F10 / F11 / F1**: boarding asks traversal, so F10 follows F1.
- **F6 / F5 / F8**: setting-course and steering are edited by all three; order is F8, F6, then F5.
- **D2 / D3 / F19 / D1**: all four rename the same vocabulary (`movement`, `model`, `boarded through`, `passage`); decide the words once (Q4, Q11).
- **F14 / F23 / D4**: the claims report module; the lock/pin word decision (Q11) lands with it.

## Drift found on re-verification

No finding was wrong; these are the line or count corrections.

- **F22**: ledger says `sails-unknown-setting` at `sailing.ts:110`; the "named twice" use is `:108` (a second use of the same code at `:121`). `sailing-not-open` is at `:61` and `:75`, and also at `analyzer/entity/vehicle.ts:281`, a third home for the same code. `sailing-row-missing-setting` is at `:175`, `:186`, `:197`.
- **F7**: `analysis.edge-while` is at `expanse.ts:193`, inside the cited 190-196.
- **D22**: the two `receiveInExpanse` calls are `dropping.ts:164` (single-object) and `:391` (multi-object).
- **D14**: examining's five-part condition is at `examining.ts:115`; `ReachabilityBehavior.ts:9-11` imports `holderOf`/`placeOf` from `expanseBehavior` and `lookoutOf` from `sightBehavior`, so `placeOf` and `holderOf` are part of the move.
- **D15**: stdlib's lowercasing is at `looking.ts:108` and `pushing.ts:174`.
- **D20**: the `delegateValidate` call is `lighting.ts:118`.
- **D17**: the `admits` fields are `roomTrait.ts:34` (exit), `:40` (`admitsPushed`), `:115` and `:171` (room).
- **F4**: `going-messages.ts:25-26` holds; the machine's literal at `vehicle-machine.ts:56` is one of the six.

Everything else (F1, F2, F3, F5, F6, F8–F21, F23, D1–D13, D16, D18, D19, D21) matched its cited line within a line or two.
