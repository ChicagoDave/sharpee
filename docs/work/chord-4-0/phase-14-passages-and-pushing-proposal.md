# Phase 14 proposal: passages, conditional exits, pushing between rooms — and traversal's one home

**Status**: PROPOSAL, for discussion before any `packages/` change (CLAUDE.md: platform changes are discussed first).
**Date**: 2026-10-19, session b86789
**Implements**: ADR-378 (passages named by a command, exits that exist while a condition holds, pushing a thing between rooms; ACCEPTED 2026-10-19) as the first worked example of ADR-379 (systems are domain services; ACCEPTED 2026-10-19). Both passed the two-record `adr-review` the same day with five seam findings folded.
**Plan phase**: Phase 14 of `plan-20261013-chord-4-0.md` (CURRENT since 2026-10-19).

Every Chord line in this document is **unshipped syntax**. The author-facing text is ADR-378's "Before and after" (the Cable Trench passage, the mail trolley); this proposal is how it gets parsed, checked, lowered and played, and how traversal becomes one query.

## What exists today

- **Exits are compass-keyed** on `RoomTrait.exits` (`roomTrait.ts:36`), read by `RoomBehavior` (`getExit:27`, `isExitBlocked:46`, `getComputedExitDeclaration:236`, `resolveExit:271`), by `going` (`going.ts:90-99, 319-415`), by `stepCompass` (`vehicleBehavior.ts:676-699`), by NPC movement (`npc-service.ts:403-433`), by sound (`propagation.ts:161-198`), by the map index and the introspector. Four of these decide traversal for themselves and disagree (ADR-379 Context).
- **A second exit vocabulary is unwired**: `src/traits/exit/` (`ExitTrait`, `ExitBehavior`), read only by the path-finder branch `WorldModel.ts:1438` and the introspector filter `bootstrap/src/introspect.ts:84`; its tests are `world-model/tests/unit/traits/exit.test.ts` (39 cases), one case in `entity-system-updates.test.ts`, and two stdlib fixtures borrowing `TraitType.EXIT` (`sensory-extensions.test.ts:35-40`, `container-visibility-knowledge.test.ts:41-46`).
- **Blocked exits are live evaluators** keyed `exit.blocked.<room>.<direction>` / `exit.message.*`, named in stdlib (`going.ts:119-125`), registered by the loader's `derived.ts:32-70` at bind, consulted by `going` before the exit is read (`going.ts:319`).
- **Grammar rules have no gate**: `GrammarRule` (`grammar-builder.ts:440-451`); `findMatches` tries every rule (`english-grammar-engine.ts:54-110`); `GrammarContext` carries `world`, `actorId`, `currentLocation` (`:68-74`). `define action` registers at story tier through `registerActionGrammar` (`loader.ts:1562-1660`), with `.where()` applied per rule (`:1653`).
- **Pushing with a direction moves nothing** (`pushing.ts:196-245`); only `move the target <dir>` parses (`standard-en-us.story:157-180`); `PushableTrait` has thirteen fields, `state` read by Dungeo's rug interceptor (`rug-push-interceptor.ts:47, 73`), the rest by nothing that changes the world. Chord's `pushable` lowers to `new PushableTrait({})` (`loader.ts:2141`).
- **Delegation speaks the inner action's words**: `inDelegateWords` (`delegation-shared.ts`), used by lighting (ADR-374 D9).
- **`admits:`** is a room line lowered by `wireAdmits` (`loader.ts:708`) to `RoomTrait.admits: string[]` (`roomTrait.ts`), read by `admitsVehicle` (`vehicleBehavior.ts:508`); the IR field is `IREntity.admits` (`ir.ts:443`), vehicle ids only.
- **No exits listing exists**: `looking.exits` in lang-en-us (`looking.ts:28`) has no emitter.

## Slices

Ordered by risk, smallest platform surface first; the system's home before its readers; the language last, so every word lands on a reader that already exists (ADR-350 D2). Each slice ends green on the touched packages, every `--check` gate clean, and the Dungeo chain unchanged (952 passing in 17 transcripts, one run).

### Slice 1 — world-model: traversal's home, `ExitKey`, the retirements

- **`ExitKey`** in `constants/directions.ts`: `type PassageKey = \`passage:${string}\``, `type ExitKey = DirectionType | PassageKey`, `isPassageKey()`. `RoomTrait.exits` and `blockedExits` keyed by `ExitKey`; `RoomBehavior`'s six exit methods, `connectRooms`, `IComputedExitDeclaration` and the resolver context take `ExitKey`; `connectRooms` infers a reverse only for a `DirectionType`. `tsc` across the workspace is the audit of every other reader (ADR-378 D1a's named assumption).
- **The query** — `src/world/TraversalBehavior.ts`, static functions over `WorldModel` beside visibility and reach (ADR-379 D3): `wayFor(world, room, key, mover): Way` where `mover` is `{ kind: 'walker' | 'steered' | 'pushed' | 'npc', entity }` and `Way` is `{ kind: 'exit', exit, destination } | { kind: 'refused', reason, params }` with reasons `hidden`, `no_exit`, `blocked` (carrying the live message), `door_closed`, `door_locked`, `not_admitted` (vehicle), `pushing_not_admitted`. Order: existence (the hidden key), blocking, the door, admittance (ADR-378 D0, D3). Computed exits: `wayFor` reports `{ kind: 'computed', declaration }` for a walker so `going` keeps its one-draw resolution (ADR-295 D5); deadly stays the engine's transformer. The key names `exitHiddenKey`, `exitBlockedKey`, `exitMessageKey` move here from `going.ts`; stdlib re-exports them so `derived.ts`'s import path holds.
- **`RoomTrait.admits`** widens to `Array<string | 'pushing'>` with one reader: `admitsPushing(room | exit)`; `IExitInfo` gains `admits?: string[]` for the exit-line form; `wayFor` reads the exit's list first, then the room's.
- **`stepCompass`** reads `wayFor(... { kind: 'steered' })` and drops its own door and admits checks; a vehicle on a heading now stops at a blocked exit (ADR-378 AC-0 pins the fix).
- **Retirements**: `src/traits/exit/` deleted (David's "ExitTrait is retired", 2026-10-19 — a deletion list is in ADR-378 D1b, confirmed before the slice runs); the barrel, `behaviors/index.ts`, `all-traits.ts`, `implementations.ts`, `trait-types.ts`, `entity-types.ts` (`EXIT`, prefix `e`) and the path-finder's exit branch follow; `PushableTrait` becomes a field-less marker; `PushedEventData` drops `pushType`, `sound`, `requiresStrength`, `revealsPassage`.
- **Structural test** (ADR-379 AC-4, the template): `tests/unit/world/traversal-readers.test.ts` scans `packages/*/src` for `RoomTrait.exits`, `.exits[`, `exitBlockedKey`, `exit.blocked.` outside `TraversalBehavior.ts` and fails on any file not in the enumerated set: `going.ts`, `vehicleBehavior.ts`, `pushing.ts`, `derived.ts`, the map index, `propagation.ts`, `npc-service.ts`, `WorldModel.ts` (path-finder), `introspect.ts`.
- **Tests**: `traversal.test.ts` — every `Way` outcome for each mover kind, hidden before blocked, passage key with no reverse, exit-line admits over room admits; `vehicle-machine.test.ts` gains the blocked-exit stop; `exit.test.ts` and the `entity-system-updates` case go; the two stdlib fixtures move to `TEST_MARKER_TRAIT` (that edit is Slice 4's, where stdlib is open). Behavior Statements before each (rules 12, 13).

- **LANDED 2026-10-19, session b86789** (David: "Go", deletions confirmed; then "2 be thorough" on the scan's findings). `constants/directions.ts`: `PassageKey`, `ExitKey`, `isPassageKey`, `passageKey`. `RoomTrait.exits`/`blockedExits` by `ExitKey`; `IExitInfo.admits`; `RoomTrait.admits` documented to take `pushing`. `RoomBehavior`, `computedExitContract`, `exit-resolver-binding` and `connectRooms` take `ExitKey`; a passage key infers no reverse and marks a door one-way. **`src/world/TraversalBehavior.ts`** (the home): `wayFor` (hidden → blocked → exit/computed → door locked/closed → destination → admittance by the exit's list then the room's), `exitOf`, `isExitHidden`, `isExitBlocked`, `blockedMessage`, `admitsMover`, the three key builders, `PUSHING`; exported from the world barrel. `stepCompass` reads `wayFor` as a steered mover and drops its own door and admits checks (it now stops at blocked, hidden and locked ways). `vehicleOutsideExitResolver` answers only for a compass key. **Retired**: `src/traits/exit/` (three files) and `exit.test.ts` (39 cases), the barrels, `all-traits`, `implementations`, `trait-types`, `entity-types` (`EXIT`, prefix `e`), the path-finder's exit branch, the introspector's filter; the core-concepts entity list and ADR-346 D7 carry the change. **Tests**: `tests/unit/world/traversal.test.ts` (18 cases: every `Way` outcome per mover, hidden before blocked, the stamped fallback, admittance precedence, passage keys and wiring); `traversal-readers.test.ts` (the structural scan, ADR-379 AC-4: readers enumerated by role — home, data, consumer, copy, lister, writer, key-reader — with `chord` outside the scan; the three `copy` entries pinned to GH #601's names); `vehicle-machine.test.ts` gains blocked/hidden and locked/stamped-map cases; one case rewritten in `entity-system-updates.test.ts`; `bootstrap/introspect.test.ts` and two stdlib fixtures moved off the retired trait. **Found by the scan**: two more hand copies of the rule than ADR-379 counted (`hasTraversableExit`, `adjacentRooms`); David chose enumeration for #601 over moving them here; ADR-379 Context, D6 and D8 corrected, #601 widened. **Left from mutation-verification**: a `findPath` test pinning that a non-door `via` is skipped (small; the branch removal is covered by tsc and the door tests). **Evidence** (2026-10-19 ~20:05 CDT): world-model 1621 passing (96 files); stdlib 1846; story-loader 1319 + 1 skip; `tsc --noEmit` clean on world-model, stdlib, bootstrap, story-loader, engine, world-index, character, branch-tester, plugin-state-machine, event-processor, transcript-tester; `./repokit build dungeo` clean; Dungeo chain 952 passing in 17 transcripts; vehicles 19 cards / 21 assertions, expanses 19 / 23, sailing 21 / 22, UPPS 194 / 275, fernhill 86 / 106, all passing.

### Slice 2 — if-domain and parser-en-us: the rule gate, push with a direction

- **`GrammarRule.when?: (context: GrammarContext) => boolean`**; `ActionGrammarBuilder.when(predicate)` applies to every rule the block registers (as `.where()` does per slot); `findMatches` skips a gated-off rule before `tryMatchRuleWithFailure`, recording neither a match nor a failure (ADR-378 D5). The standard grammar registers no gates.
- **Grammar**: `push the target <direction>` and `shove the target <direction>` for the twelve directions beside the `move` forms; `./repokit grammar` regenerates `grammar.ts`, `stdlib-manifest.ts`, the website blocks; `--check` clean.
- **Tests**: `grammar-gate.test.ts` — a rule with `when` false is skipped and the next rule matches, failures unaffected, a story-tier gated rule over a standard rule of the same text; `pushing-grammar.test.ts` — the twelve forms parse to pushing with `extras.direction`.

- **LANDED 2026-10-19, session b86789** (David: "Go"). **if-domain**: `GrammarGate` type; `GrammarRule.when?`; `.when(predicate)` on `PatternBuilder` and `ActionGrammarBuilder`, the action builder applying it to every rule it emits (verb×pattern, full lines, bare verbs, directions). **parser-en-us**: `findMatches` skips a gated-off rule before matching, recording neither a match nor a failure. **Grammar**: the pushing block now carries `push`, `shove` and `move the target the direction` through a `directions` block (ADR-267 D12), so each emitted rule carries `direction: <canonical>` and the parser delivers `extras.direction`; the 24 literal `move the target <dir>` lines are gone. **Finding**: those literal lines never carried a direction — the word was consumed as a literal and nothing recorded it — so `move cart north` has never reached the action with a direction; the pushing action's "moved" text was unreachable from the parser as well as untrue (ADR-378 Context said the latter; the former is new). `grammar.ts`, `stdlib-manifest.ts`, the website grammar blocks regenerated; `grammar --check` and `manifest --check` clean. **Tests**: `tests/grammar-gate.test.ts` (5: gated match and skip, no failure recorded, story rule off → standard rule matches, `forAction().when()` gates every rule, ungated unchanged), `tests/pushing-direction.test.ts` (11 forms plus the bare press). **Evidence** (2026-10-19 ~20:20 CDT): if-domain and parser-en-us `tsc` clean; parser-en-us 350 passing (28 files); chord 1548; stdlib 1846; story-loader 1319 + 1 skip; stdlib, story-loader and engine `tsc` clean; `./repokit build dungeo` clean; Dungeo chain 952 passing in 17 transcripts, one run; vehicles 19 / 21, sailing 21 / 22, UPPS 194 / 275, fernhill 86 / 106 passing. No side-effect function changed (the gate is a read), so rule 15 did not fire.

### Slice 3 — Chord front end

**Grammar** (each row to `chord.ebnf` and `docs/architecture/chord-grammar-changes.md`; the `language-version.test.ts` pin re-recorded, no bump):

```ebnf
create-line    = ... | passage-line ;
passage-line   = "passage" words { "or" words } "to" name [ "through" name ] NL ;
                                     (* words: one or more WORDs, none `to` or `or` (parse.passage-words);
                                        no `, one-way` (analysis.passage-one-way); key passage:<first form> *)
exit           = DIRECTION "to" ( name | "outside" ) [ "through" name ]
                 [ "admits" admits-list ] [ "while" condition ] ;
                                     (* admits and while on a single exit line only;
                                        parse.exits-line-while / parse.exits-line-admits elsewhere *)
admits-list    = admits-word { "," admits-word } ;
admits-word    = name | "pushing" ;      (* a steered vehicle, or the class word *)
admits-line    = "admits" ":" admits-list NL ;            (* room, rooms group, region; gains `pushing` *)
blocked-exit   = ( DIRECTION | "passage" words ) "is" "blocked" [ "while" condition ] ":" phrase-key NL ;
deadly-exit    = ( DIRECTION | "passage" words ) "is" "deadly" ":" phrase-key NL ;
define-action  = "define" "action" WORD [ "while" condition ] NL action-line* ;
```

**Analyzer**: `analysis.passage-one-way`, `analysis.passage-unknown` (a blocked or deadly line naming a passage the room does not declare), `analysis.duplicate-exit` widened to a shared form, `analysis.admits-unknown-word` (widening ADR-366's `admits-not-steered-vehicle` to admit `pushing`), `analysis.exit-line-owner` already gating exit lines to rooms covers the passage line. `pushable between rooms` does not exist; `a thing, pushable` is unchanged.

**IR**: `IRExit.direction` carries the passage key; `IRExit` gains `passage?: string[]`, `condition?: IRCondition | null`, `admits?: string[]`, each present only when written; `IRBlockedExit.direction` / `IRDeadlyExit.direction` may be a passage key; `IRActionDef` gains `condition?: IRCondition`; `IREntity.admits` admits `'pushing'`. `IR_FORMAT` does not move.

**Tests**: `adr-378-passages-front-end.test.ts` — every diagnostic, the lowered IR of the Cable Trench and Sorting Room examples, `define action … while`, byte-identical IR for a story using none of it. `./repokit ebnf --check`.

### Slice 4 — stdlib and lang-en-us: going by key, pushing between rooms

- **`going`**: `resolveDirection` becomes `resolveWay(): ExitKey`; validate and execute consult `TraversalBehavior.wayFor(... { kind: 'walker' | 'steered' })` and drop the inline blocked, door and admits checks (the computed-exit and deadly paths unchanged). Messages unchanged; a passage key never reaches a refusal message because a hidden or absent passage is not grammar (D2).
- **`pushing`**: validate — target reachable, in the actor's room, `PushableTrait`; with a direction, `wayFor(room, direction, { kind: 'pushed', entity: target })`, refusing `cannot_push_that_way` on `pushing_not_admitted`, then `delegateValidate` into `going` with the direction and `inDelegateWords` for its refusals (ADR-378 D7); without a direction, today's press. Execute — move the target to the destination, then `delegateExecute`. Report — `pushed_direction` then `delegateReport`. Descriptor: `contracts` records the delegation as lighting's does; the lifecycle registry test's allowed set gains pushing.
- **lang-en-us**: pushing gains `cannot_push_that_way`; `pushed_with_effort`, `reveals_passage`, `button_clicks`'s `sound` param go with the fields that fed them; `looking.exits` deleted (ADR-378 D4). Alias rows: `pushing-cannot-push-that-way` added; the retired ids' rows removed; `./repokit aliases` regenerates the catalog.
- **Fixtures**: the two stdlib tests borrowing `TraitType.EXIT` move to `TEST_MARKER_TRAIT`.
- **Tests** (through the phase runner, location assertions): ADR-378 AC-4 in full; `going` by a passage key with a door; the vehicle refusals through a push. Dungeo: `./repokit build dungeo`, the chain, one run.

### Slice 5 — story-loader: lowering and the gate

- **Passages**: a passage `IRExit` wires through `connectRooms(room, to, 'passage:<key>', door, { oneWay: true })`; `extendParser` registers, per passage, each form as written and with `a`/`an`/`the` removed as `forAction('if.action.going').withDefaultSemantics({ direction: key }).when(ctx => wayFor(ctx.world, roomOf(ctx.actorId), key, walker).kind !== 'refused' with reason hidden or no_exit).fullPattern(form)`.
- **Hidden**: `derived.ts` registers `exit.hidden.<room>.<key>` for every exit with a condition, on both sides of a two-way exit, beside the blocked evaluators (ADR-240 D2 Option A).
- **Admits**: the exit-line list lowers onto `IExitInfo.admits` by world id (`pushing` passes as the word); the room line's `pushing` passes through `wireAdmits`.
- **`define action … while`**: the compiled condition becomes the `.when()` predicate on the action's builder (bare-verb prefixes included).
- **Tests** (REAL-PATH through `bootTurns`, a fixture story in the Cable Trench shape): ADR-378 AC-5 in full — forms with and without articles, fall-through elsewhere, hidden until lit, the hidden reverse, `define action … while` and the standard clarification elsewhere, the push arriving with the destination's clause firing, the blocked phrase. GH #317 closed with a comment naming ADR-378 D5.

### Slice 6 — map, docs, demonstration

- **world-index**: a passage places like `in`/`out` (ADR-369 D3b), its edge labelled with the first form; a conditional exit carries its condition text; a test for each. `ide-protocol` unchanged; `repokit protocol --check` clean. `bootstrap` introspector's filter drops the `EXIT` clause.
- **Docs**: `docs/core-concepts/README.md` — the `exit (e_)` entity line goes; the system row and the one-home test join the layer table (ADR-379 AC-1); `CLAUDE.md`'s *Logic Location* table gains the system row; ADR-346 D7 gains the retired note; website Chord guide (exits page: passages, `while`, `admits pushing`; actions page: `define action … while`), stdlib reference row for `cannot_push_that_way`; IDE docs tab regenerated.
- **UPPS** (within David's premise, UPPS content authority): the Cable Trench passage line and its one new prose sentence; the mail trolley in the Sorting Room; `east to the Loading Dock admits pushing`. Tree cards: the passage by each form, not by compass, not in the dark; the trolley pushed east arrives with the player; the sealed-door push prints `dock-sealed`. Checklist rows 64, 100, 123 carry the cards; row 64's "unlisted" struck with ADR-378 D4's note.
- **Plan**: Phase 14's Demonstrated line; ADR-378 and ADR-379 landed notes per decision.

## Findings that need David's call

- **UPPS additions** are Claude's within the premise (a trolley in a depot; cables running under the floor to the sorter). Flagged, not blocking.
- **Dungeo**: `move rug <direction>` would now move the rug through an exit if any exit on the rug's room admitted pushing — none does, since Dungeo is TypeScript and writes no `admits`; so nothing changes, and the rug stays a press. Confirmed by the chain.
- **ADR-366's `analysis.admits-not-steered-vehicle`** is widened, not renamed; its message gains "or `pushing`".

## Tests (rule 13a)

- **OWNED**: world-model (the query, keys, retirements), if-domain and parser-en-us (the gate, grammar), chord (front end), stdlib (going, pushing), lang-en-us, story-loader (lowering, registration), world-index, bootstrap, the CLI bundle, UPPS.
- **EXTERNAL**: none.
- **REAL-PATH**: `packages/story-loader/tests/adr-378-passages-runtime.test.ts` through `bootTurns` (Slice 5); the UPPS tree under `./sharpee test` (Slice 6); the Dungeo chain through `dist/cli/sharpee.js` (Slices 4 and 6).
- **STUB JUSTIFICATION**: the stdlib unit tests drive actions through the phase runner on a real `WorldModel` (no stubs); the parser gate test uses a hand-built `GrammarContext`, backed by Slice 5's real-path passage tests.

## Next step

David's "go" on Slice 1. Before it runs, the deletion list (ADR-378 D1b: the three files under `src/traits/exit/` and `exit.test.ts`) is posted and waits for confirmation (CLAUDE.md: never delete files without confirmation).
