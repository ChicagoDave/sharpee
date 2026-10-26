# Chord 4.0 — alignment audit of `main...chord-4-0`

**Date**: 2026-10-21 · **Session**: ca314d · **Plan**: `plan-20261013-chord-4-0.md` Phase 18 · **Gate**: David, 2026-10-15 — "before we merge this branch, you will be held accountable for all code and proving it is elegant and aligned for Sharpee and Chord."

This is the reading the gate asks for: the whole branch diff, per ADR, with the platform concept each change reuses, the Chord word and the platform enforcement behind it (ADR-350 D2), the seam it crosses and the side it landed on, and every shortcut, heuristic or special case found — each fixed, not listed. The running record behind it is `alignment-ledger.md` (entries written as the work landed); this document reads that file and the diff together. Every file:line below was resolved on 2026-10-21 against the branch at `1cf9a725e` plus this phase's working tree; paths are under `packages/` unless written otherwise.

## The diff

`git diff --stat main...chord-4-0`: 654 files, 54,350 insertions, 6,062 deletions, over 42 commits (2026-10-13 to 2026-10-21). By area: 452 files under `packages/`, 63 `docs/`, 51 `tools/`, 39 `stories/`, 25 `website/`, 23 `branch-stories/`. Under `packages/`, by lines added: chord 10,177 (68 files), stdlib 8,127 (142), story-loader 5,719 (46), world-model 5,294 (65), branch-tester 2,829 (34), sharpee 2,369 (7, the generated API reference), devkit 940 (11), lang-en-us 878 (35), parser-en-us 577 (6), ide-protocol 394 (4), engine 269 (11), plugin-state-machine 200 (3), world-index 182 (7), transcript-tester 90 (6), if-domain 67 (3), event-processor 11 (2), bootstrap 5 (2).

Fourteen ADRs were written on the branch, all ACCEPTED: 366 (22 decisions), 367 (8), 368 (5), 369 (9), 370 (10), 371 (8), 372 (5), 373 (7), 374 (10), 375 (7), 376 (10), 377 (4), 378 (14), 379 (9). Four earlier records were amended in place: ADR-349 (D4a, D5), ADR-350 (SUPERSEDED by 366), ADR-365 (D2, Scope), ADR-215 (superseded by 377 for state machines), ADR-360 (D4, list placements), ADR-346 and ADR-216 (touched for the sound and trait catalog notes).

Every changed source file under `packages/` and the Testing tab, excluding tests and generated modules, was mapped to the ADRs it cites (`scratchpad/audit-map.txt`, 486 lines; counts in §3). Forty-eight changed source files cite no 4.0 ADR; §4 accounts for them.

## 1. Cross-cutting: what the hunt found

The hunt ran over every added line of the diff (`git diff -U0 main...chord-4-0 -- packages tools/ide/web/testing-surface/src`, test files excluded), for: type casts (`as any`, `as unknown as`), suppressions (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`), open markers (`TODO`, `FIXME`, `HACK`), admitted shortcuts (`shortcut`, `interim`, `workaround`, `for now`, `temporary`, `stop-gap`, `special case`, `heuristic`, `stand-in`, `kludge`, `hard-coded`), and story ids inside platform packages (`'dungeo.`, `'fernhill`, `'upps`).

| Pattern | Added lines | Of which code |
|---|---|---|
| casts | 7 | **3** — all three the same finding, fixed below |
| suppressions | 0 | 0 |
| `TODO`/`FIXME`/`HACK` | 0 | 0 |
| admitted shortcuts | 0 | 0 |
| story ids in packages | 1 | 0 (a `stdlib/CLAUDE.md` example) |

The four non-code cast hits are the word "any" in comments ("as any failed card fails it", "entered as any enterable thing is").

**Finding, fixed (2026-10-21).** `SemanticProperties.direction` in `@sharpee/if-domain` (`if-domain/src/grammar/grammar-builder.ts:492` before the fix) was a closed union of the ten compass words plus `in` and `out`. ADR-378 D1 made a way answerable by a custom command (a passage key, `passage:<name>`) and ADR-375 added ship words (`port`, `starboard`, `ahead`), so the loader wrote two casts marked "deliberate" (`story-loader/src/loader.ts`, the `define action` defaults and the passage rule at what is now line 1780) and the grammar engine one (`if-domain/src/grammar/grammar-engine.ts:499`). A contract that three call sites cast past is a contract that is wrong, not three sites that are careless. The field is now `string`, with its doc naming the three vocabularies and the rule that the consumer resolves the word against the ways it knows (the action's per-rule `directions` map, `parser-en-us/src/english-grammar-engine.ts:382`, and traversal's `wayFor`, §ADR-378). All three casts are gone; if-domain 102, parser-en-us grammar-gate and pushing-direction 17, story-loader's passages, sailing and expanses runtimes 35, all passing after the change; `tsc --noEmit` clean for if-domain, parser-en-us, stdlib and story-loader. Recorded in the ledger under Fixed.

**The analyzer's name tests are not heuristics.** `chord/src/analyzer.ts` compares `k.name === 'room'`, `comp.name === 'settable'` and the like some forty times on the branch. These are the compiler reading the language's own words off the parsed kinds and compositions, which is what an analyzer is; they are listed here so the reader does not mistake the grep for a finding.

**Structural guards the branch added.** Two tests pin the one-home rule rather than a run: `world-model/tests/unit/world/traversal-readers.test.ts:35` enumerates every source file allowed to read a room's raw exits or the `exit.*` keys (`ALLOWED_READERS`, each with its role and reason; the two hand copies for GH #601 are listed as `copy`, not blessed) and fails on any other; stdlib's call-site guard holds every caller of the breaking lifecycle to the descriptor's declared causes (`stdlib/src/actions/standard/breaking/breaking.ts:45`, `contracts.firedAsConsequence.causes`). The five generation gates are fresh: `./repokit manifest --check`, `aliases --check`, `ebnf --check`, `grammar --check`, `protocol --check` (run 2026-10-21, each "matches").

## 2. Ledger items still open — David's decisions, not shortcuts

The ledger's Open section holds three items. None is a shortcut in code; each is a design question with the code following the existing pattern, and each is a decision for David before or after merge:

1. **Tool requirements are a per-trait trio.** Cuttable, diggable, flammable, openable and light-source each carry `requiresTool`/`requiredTools`/`canXWith` and a `toolId`/`toolIds` pair; ADR-374 D9 followed the pattern rather than forking it. One shared tool-requirement shape would be cleaner; it is a refactor across five traits. Where to place it is David's.
2. **Heard events skip the enrichment funnel.** The sound stage stores `sound.audibility.heard` events without `enrichTurnEvents`; predates ADR-374. Whether heard events should pass the funnel is a turn-cycle question.
3. **`play sound … when client has sound` gates the world sound too** (ADR-374 D6's one-sound-two-sides). Documented in the guide and the ADR; whether the world side should ignore a client-capability condition is a design call.

## 3. Per ADR

Each entry: the decisions, where they landed (the seam and its side), the concept reused, the Chord word and its enforcement, and what the audit found. File counts are changed source files citing the ADR.

### ADR-366 — a vehicle is a kind with a movement model (72 files)

- **Concept reused.** The vehicle is a kind that composes `EnterableTrait` as `container` composes `ContainerTrait` (D1); where the player rides is `EnterableTrait.preposition`, which entering, exiting and the room description already read (D2, `world-model/src/world/VisibilityBehavior.ts:609`); moving a vehicle is `WorldModel.moveEntity`, which carries contents because containment is relational (D4; `world-model/src/traits/vehicle/vehicleBehavior.ts:21`); automated motion is the state-machine plugin's phase (D5e, `plugin-state-machine/src/vehicle-machine.ts:113` `tickVehicles`, stepping through `vehicleBehavior.ts:616` `stepVehicle`), not a daemon; the machine's state is trait data so a save restores a voyage (D5g).
- **Word and enforcement.** `a vehicle`, `carries:`, `movement:`, `drive:`, `stops:`, `direction:`, `pace:`, `destinations:`, `passage:`, `commands:`, `aboard:`, `boarded through:`, `admits:`, `<direction> to outside`, `start`/`stop`/`send`, `is under way`/`is at`/`is heading`. Gates in the analyzer: `chord/src/analyzer/entity/vehicle.ts:228` (`analysis.vehicle-missing-carries`) and the table in `chord/src/analyzer/vehicles.ts` (`MOVEMENT_TABLE`, D5's table written once); 16 `analysis.*` codes for the vehicle alone (`admits-not-steered-vehicle`, `admits-owner`, `aboard-without-boarding-room`, `boarding-room-not-aboard`, `carries-not-vehicle`, `carries-with-aboard`, `commands-not-for-movement`, `commands-not-player-driven`, `flight-no-passage`, `flight-too-few-destinations`, `line-missing-direction`, `line-repeated-stop`, `line-too-few-stops`, `move-state-driven-vehicle`, `not-a-destination`, `not-a-stop`, `not-a-vehicle`, `outside-not-aboard`). Lowered at `story-loader/src/loader.ts:361` (`new VehicleTrait`). Read by `going` (`stdlib/src/actions/standard/going/going.ts:33` `goingFromVehicle`), `admitsVehicle` (`vehicleBehavior.ts:510`), the outside-exit resolver (`vehicleBehavior.ts:12`), entering's `boardingRoom` (`stdlib/src/actions/standard/entering/entering.ts:70`).
- **Field table re-measured (ADR-350's, the O-2 falsifier).** Grep over `packages`, `stories`, `branch-stories` (dist excluded) for `vehicleType|blocksWalkingMovement|requiresExitBeforeLeaving|isOperational|notOperationalReason|currentPosition|positionRooms|movesWithContents|moveVehicle|canVehicleMove|canActorLeaveLocation|canActorWalkInVehicle`: zero platform hits; one local variable `positionRooms` in `stories/dungeo/src/regions/volcano.ts:455` (Dungeo's own balloon stop list, not the trait). Every field `VehicleTrait` carries has a platform reader outside the trait file: `model` (vehicleBehavior, sightBehavior, expanseBehavior, steering, setting-course, the command transformer, the evaluator, statements); `boardingRoom` (entering, loader); `commands` (vehicleBehavior, loader); `stops`/`oneWay`/`drive`/`pace` (vehicleBehavior, loader, the state-machine plugin, going); `heading`/`destinations`/`passage` (steering, setting-course, going, the evaluator, loader); `stride`/`sight`/`sails`/`sailing` (vehicleBehavior, sightBehavior, steering, looking, examining, the sailing extension). `RoomTrait.admits` is read by pushing, examining-data and traversal. No exposed word is inert.
- **Found.** Nothing open. The one special case in the record is D7's `board`/`disembark` being for vehicles with rooms aboard only — David's ruling, enforced by `vehicle-not-boardable`, re-recorded in the Dungeo chain (`board boat` → `enter boat`).

### ADR-367 — a reached state can be locked as a claim (45 files)

- **Concept reused.** ADR-365's claims runner, fragment and cone (`claim-lock.ts:353` calls `claimCone`); the tree document's cards (`locks` is a card field, ADR-355's writer and reader carry it); the walker's observer (`onCard`, D5) and the assertion core's result shape (`lock-assert` is an `Assertion.type`, never evaluated by the core); the run-event stream for the claims rows; `pinLockOnCard` and `turnOfCard` live with the document they read (`branch-tester/src/tree-document.ts:1096`).
- **Word and enforcement.** No Chord grammar (David, Q-1): a locked claim is an ordinary `claim` block. `sharpee claim` (`devkit/src/commands/claim.ts:65`) and the Testing tab's Lock… drive one function, `proposeLock` (`claim-lock.ts:199`); the floor proves every positive claim at every card (`claim-floor.ts:104`); a broken lock fails its card (`tree-walker.ts:963` `attachLockVerdicts`); the fragment gate (`claim-fragment-gate.ts`) refuses a departing fragment by block and line. The tab posts the CLI's own argument list (`tools/ide/web/testing-surface/src/lock.ts` `lockArgumentsOf`), so the flags have one spelling; the `--json` shapes are `ide-protocol/src/claim-output.ts`, imported by both sides (DEVARCH 8b).
- **Found and fixed in-phase.** `--fragment-only` first read the fragment only when the manifest named it, so a second lock before the page wrote the key would have overwritten the first; it reads the disk now. `claim-report.ts` first imported the runner's types and dragged the engine seams into the tab's program; it is typed structurally. The second mutation audit's gaps closed (Phase 17 summary). Deviation from the record: D4's `##` provenance comment cannot be written inside a block (ADR-249); the card's pin is the record; GH #608 is David's call.

### ADR-368 — a clause head lists its gerunds (8 files)

- **Concept reused.** The parser expands the list into one `OnClause` per gerund sharing body and span (`chord/src/parser.ts:7259`), so the analyzer, IR and loader see the clauses they always saw; the one additive IR field, `actionSpan`, is read by the loader's per-action errors (`story-loader/src/runtime/bind.ts:196`).
- **Found.** Nothing: the corpus fold was measured and reported, not applied (401 of 2,009 clauses, all Secret Letter), per David.

### ADR-369 — container settings and `in`/`out` exits (20 files)

- **Concept reused.** `ContainerTrait.isTransparent` already existed and was read by nothing authorable; `transparent` (`chord/src/catalog.ts:61`) lowers to it and searching and examining read it (`stdlib/src/actions/standard/searching/searching.ts:110`); `holds <n>` lowers to the capacity the loader had left unbounded (`chord/src/analyzer/entity/holds.ts`, `analysis.holds-duplicate`, `holds-owner`); `in` and `out` are `Direction.IN`/`OUT` in `world-model/src/constants/directions.ts:19`, already paired as opposites (`:39`), reached through the one shared `exit` production of ADR-360/362.
- **Found.** D2a removed the three `with` settings the loader read on a kind noun — a removal with a fix-it, not a compatibility shim.

### ADR-370 — stock verbs without an object side (46 files)

- **Concept reused.** Eight stdlib actions in the four-phase shape, the three saying actions from one module (`stdlib/src/actions/standard/saying-shared.ts:56`); descriptors in the lifecycle registry; grammar in `standard-en-us.story`; no Chord surface change — `on the player jumping` already parsed and now fires.
- **Found.** The speaker path for `yes`/`no`/`sorry` in a live scene is pinned by the stdlib test only (UPPS has no conversation block); recorded in the phase, not a shortcut in code.

### ADR-371 — object-side adjectives: lowering, raising, burning, setting (52 files)

- **Concept reused.** Turning's shape, factored into `createImplementationDispatchingAction` (`stdlib/src/actions/standard/dispatch-shared.ts:105`): a verb with no standard semantics runs the target's ADR-090 capability behavior or ADR-228 interceptor inside its own phases; the engine's universal dispatch steps aside for `dispatchesImplementations` actions (`engine/src/command/command-executor.ts:474`). Burning is cutting's shape with `FlammableTrait`/`FlammableBehavior` (`world-model/src/traits/flammable/flammableBehavior.ts:18`); `settable` is a loader capability behavior over the thing's reversible states (`story-loader/src/runtime/settable.ts:35`).
- **Found and fixed (Phase 6, ledger).** D1a: the universal dispatch pre-empted actions and their clauses; a shared clause interceptor counted as every thing's implementation (`ActionInterceptor.claims`). The unused `capability-dispatch.ts` factory was retired (c29c351b7).

### ADR-372 — two-noun and conversation-shaped clauses (48 files)

- **Concept reused.** The clause head's counterpart tail (`chord/src/parser.ts:7349`) rides the lifecycle engine's existing slot matching (`stdlib/src/actions/lifecycle/lifecycle-engine.ts:155`); `consulting` reuses `define topics` on a readable owner (`chord/src/analyzer.ts:2408`, `analysis.topics-readable-conversation`); `buying` is the dispatching shape with `PurchasableTrait` and a loader behavior that spends the buyer's counter (`story-loader/src/runtime/purchasable.ts`, the money model David chose).
- **Found and fixed (Phase 7, ledger).** Two tailed clauses on one owner were refused as duplicates; the tail is part of the key now. Not shipped, recorded in the ADR: `request X from Y`, `look X up in Y`, `buy X from Y`.

### ADR-373 — physical state: attached, breakable, tying (51 files)

- **Concept reused.** Attachment and breakage are traits with behaviors (`world-model/src/traits/attached/attachedBehavior.ts:96` `detach`, `breakable/breakableBehavior.ts`); breaking is one lifecycle id fired by its causes (`stdlib/src/actions/standard/breaking/breaking.ts:41`), the causes declared once on the descriptor (`:45`) and held by the call-site guard; the attached refusal is one shared function for taking and removing (`stdlib/src/actions/standard/attachment-shared.ts:24`); tying uses ADR-372's counterpart tail.
- **Word and enforcement.** `attached to <the thing>`, `detachable`, `breakable`, `fragile`, `starts broken`, `after the player breaking`; gates `analysis.detachable-not-attached`, `fragile-not-breakable`, `breaking-after-only`; the anchor is a setting-schema row (ledger: the bespoke check was removed).
- **Found and fixed (Phase 8, ledger).** The bespoke anchor check; the twice-written list of breaking causes; throwing's name guess and `BREAKS_POINT` retired.

### ADR-374 — backdrop, night-vision, listener, lamps, sound (58 files)

- **Concept reused.** One presence predicate for doors and backdrops (`world-model/src/world/PresenceBehavior.ts:46`), read by the scope rule and both visibility gates instead of the door's three hand copies; `isDarkFor` (`VisibilityBehavior.ts:79`) for the observer's view; sound rides ADR-172 — the existing `ListenerTrait`, propagation and dispatcher, one stage (`engine/src/turn/sound-dispatch.ts:27` `soundDispatchStage`) gathering `sound.emitted` and applying heard events through `withWorldReactions` (`engine/src/events/world-reactions.ts:29`), the event type named once (`if-domain/src/sound/types.ts:147` `SOUND_EVENT_TYPES`); lighting and extinguishing delegate to switching through the one D6-B seam (`stdlib/src/actions/standard/delegation-shared.ts:75`); power is derived from containment and "gives light" is one function (`world-model/src/traits/light-source/lightSourceBehavior.ts:109`).
- **Found and fixed (Phase 9, ledger).** Three readings of "gives light"; delegation plumbing inlined in one action; a duplicated sound event literal; a power flag nobody set; a second sound model withdrawn before code; the placement-list "one name with `and`" guess removed; seven fixtures modelling lamps as `states: dark, lit` reworked. Open: the three items of §2.

### ADR-375 — `use sailing` extends the vehicle (33 files)

- **Concept reused.** The `use` extension registry (`story-loader/src/extensions/sailing.ts`, one registry entry whose `gatedConstruct` is the backstop behind the analyzer's gate); the compass vehicle's heading as a bearing (`chord/src/analyzer/sailing.ts` `COMPASS_BEARINGS`, so a word and a number lower to one shape); the vehicle machine's step with a pace from the sailing table (`vehicleBehavior.ts:240` `paceUnderSail`); the `naval` command set on the stock `steering` action.
- **Word and enforcement.** `use sailing` (`analysis.sailing-needs-use`, `sailing-needs-expanses` at `chord/src/analyzer.ts:8374`), `heading <n> degrees`, `wind:`, the `sailing` block (`sailing-gap`, `sailing-overlap`, `sailing-no-calm`, `sailing-row-missing-setting`), `sails`, `in irons`.
- **Found.** Nothing open; two real defects caught by closing mutation-audit gaps in Phase 13 (an over-the-side throw handing the vehicle id as the expanse; a cardinal bearing's cosine of 6e-17 read as a component toward an edge), both fixed there.

### ADR-376 — `use expanses` extends the vehicle (81 files)

- **Concept reused.** The expanse is a kind with a trait and a behavior (`world-model/src/traits/expanse/expanseBehavior.ts:291` `driftExpanse`), its sight a behavior scope reads (`sightBehavior.ts:125` `sightings`), the vehicle's `open` movement one more model on the same machine, drift drawn from the session's random service in the same plugin phase (`vehicle-machine.ts`); the extension entry is `story-loader/src/extensions/expanses.ts`.
- **Word and enforcement.** `use expanses` (`analysis.expanses-needs-use`, `chord/src/analyzer.ts:3324`, `:6346`), `an expanse`, `size:`, `landmarks`, `at <x>, <y>`, `movement: open`, `stride`, `sight:`, `seen from afar`, `floats`, `drift:`, `comes into sight`; 20 `analysis.*` codes.
- **Found.** The `conditional-composition-unsupported` gate names what the language refuses rather than silently accepting it. Nothing open.

### ADR-377 — state machines are core (17 files)

- **Concept reused.** The existing state-machine plugin becomes core: `story-loader/src/extension-registry.ts:33` lists it beside npc; `use state-machines` is `analysis.extension-core`. The vehicle machine is a phase of that plugin (D3), run after the story's own machines.
- **Found.** Nothing.

### ADR-378 — passages and pushing between rooms (48 files)

- **Concept reused.** One traversal system (ADR-379) answers "may this mover take this way now?" for the walker, the steered vehicle, the pushed thing and the custom-command passage (`world-model/src/world/TraversalBehavior.ts:163` `wayFor`); going reads it (`going.ts:7`), pushing reads it (`stdlib/src/actions/standard/pushing/pushing.ts:33`), and the passage's grammar is built by the loader from the same way (`story-loader/src/loader.ts:1780`, gated by `wayFor` so a hidden way is not understood). `pushable` and the `pushing … end pushing` block are the thing's own ways (D6b, David's "Shape 3").
- **Word and enforcement.** `passage`, `while` and `admits` tails on an exit line, `define action … while`, the `pushing` block; `analysis.passage-one-way`, `passage-unknown`, `pushing-no-exit`, `pushing-not-pushable`, `edge-while`. `ExitTrait.listed`, a never-wired flag, struck (D4).
- **Found and fixed.** The casts of §1 (passage keys forced into the compass union).

### ADR-379 — systems are domain services (5 files)

- **What it adds.** The rule the vehicle chain needed: a rule consulted by more than one mover, action or Chord condition has one home under `world-model/src/world/` (D2, D3), with its story seam a per-world binding (D4) and its Chord vocabulary checked per system (D5). Traversal is the first instance; the structural guard (`traversal-readers.test.ts:35`) is the template later systems copy. Its first defect was filed, not absorbed: NPC movement still reads `RoomTrait.exits` (GH #601, the two `copy` rows in the guard).
- **Found.** GH #601 stays open by the ADR's own D8; it is a filed defect, not a shortcut on this branch.

## 4. The forty-eight files citing no 4.0 ADR

Grouped by why: **barrels and registries** (`world-model/src/index.ts`, `traits/index.ts`, `all-traits.ts`, the four new traits' `index.ts`, `behaviors/index.ts`, `world/index.ts`, `story-loader/src/index.ts`, `plugin-state-machine/src/index.ts`, `transcript-tester/src/index.ts`, `stdlib` action `index.ts` files for lowering, raising, searching) — exports of what the ADRs added; **Phase 1's retirements** (`stdlib/src/actions/meta-registry.ts`, `help/*`, `lang-en-us/src/actions/help.ts`, `event-processor/src/handlers/meta.ts`, `story-loader/src/select-ids.ts`, `chord/src/message-alias-catalog.ts`) — the dead ids and brief mode, Phase 1's deliverable with no ADR by design; **grammar and vocabulary generated or hand-aligned to the stories' words** (`parser-en-us/src/grammar.ts`, `lang-en-us/src/actions/{inserting,pulling,removing}.ts`, `world-model/src/entities/entity-types.ts`, `traits/trait-types.ts`); **Phase 17's own** (`branch-tester/src/runner.ts`, `auto-assertion.ts`, cited in Phase 17's record); **shared code the ADRs' changes routed through** (`stdlib/src/actions/enhanced-context.ts`, `helpers/exit-legality.ts`, `searching-helpers.ts`, `giving.ts`, `inserting.ts`, `putting.ts`, `showing.ts`, `channels/sound-events.ts`, `engine/src/sound/*`, `engine/src/turn/context.ts`, `world-model/src/capabilities/exit-resolver-binding.ts`, `traits/room/{roomBehavior,computedExitContract}.ts`); and `bootstrap/src/introspect.ts` (the introspection manifest learning the new kinds). None introduces a rule of its own; each was read against the ADR whose change it serves.

The `eslint-disable-next-line no-console` pair in `roomBehavior.ts:283, 296` predates the branch (not in the added lines) and is not this audit's.

## 5. Evidence runs (one run each, 2026-10-21, this session)

| Target | Result |
|---|---|
| fernhill `./sharpee test` | 86 cards, 107 assertions passing; 13 of 13 rooms; `claims: 9 of 10 held, 1 violated`; the lock held; exit 0 |
| UPPS `./sharpee test` | 244 cards, 368 assertions passing; 11 of 11 rooms, 2 of 2 endings; `claims: 10 of 10 held`, every lock held, 0 walks; exit 0 |
| Dungeo chain (`./repokit build dungeo`, then `--test --chain wt-*`) | 952 passing in 17 transcripts |
| `stories/vehicles`, `stories/expanses`, `stories/sailing` | 19/21, 19/23, 21/22 passing |
| gates | manifest, aliases, ebnf, grammar, protocol `--check` all match |
| root `npx tsc --noEmit` | clean |
| suites (this session, full) | branch-tester 373, devkit 204 (+1 skipped), transcript-tester 371, ide-protocol 60, testing-surface 246; if-domain 102; parser-en-us and story-loader subsets after the §1 fix; Swift `TestingSurfaceRealPathTests` 26 cases across runs |

## 6. Ready / not ready for the publish

**Ready.**
- The three outcomes' evidence (O-1 the locks held by line and the breaking edit loud; O-2 the four conveyances as vehicles, the field table clean; O-3 the thirty-row slice with every row's exerciser named in `standard-if-checklist.md`'s 4.0 evidence table — the two Phase 14 rows filled this phase).
- The language surface pinned (`chord/tests/language-version.test.ts`, hash unchanged since 2026-10-20; the bump note written; `chord/src/version.ts` lists the 4.0 set); the grammar log current through ADR-378 D6b; `chord.ebnf` well-formed.
- The guide: the claims page gained the lock and the broken-claim report; the Docs tab regenerated (163 pages). The book's trait catalog (`docs/book/v2.0.0/backmatter/appendix-c-trait-catalog.md`) gained the five 4.0 traits (backdrop, expanse, flammable, night-vision, purchasable; 45 rows).
- The alignment hunt clean after one fix; the fourteen ADRs ACCEPTED with their landing notes.

**Not ready — David's.**
- The version bump itself (4.0.0 for Chord, 6.0.0 for the platform since exported API was removed, David 2026-10-16) and the publish date.
- The three ledger items of §2.
- GH #601 (NPC movement onto `wayFor`), GH #608 (D4's comment versus ADR-249), GH #603–#607 (the UPPS conveyance findings), GH #609–#610 (the cone and the verb head) — filed, none blocking.
- The objective's grades (`docs/objectives/chord-4-0.md` stays DRAFT and YELLOW until the window has a date).
- ~~A Wumpus expanse test story (David, 2026-10-21): a third `use expanses` exerciser, his content.~~ Written 2026-10-21 on David's "go" (session d7e942): `branch-stories/wumpus/` — the hunt as an open vehicle on an expanse, `./sharpee test branch-stories/wumpus` 37 cards, 69 assertions, 4 of 4 endings, 4 of 4 claims held at seed 42 (`docs/work/wumpus/`). It surfaced two platform gaps, filed and not fixed: GH #612 (a landmark room's `sight:` outlook is lost aboard the vehicle) and GH #613 (`the player's <counter>` compiles but fails at runtime).
