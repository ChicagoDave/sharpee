# Phase 3 implementation shape — `move … to a random adjacent room` (#311)

Written 2026-08-25 (session 8ae644) from the code, for David's go-ahead before any
`packages/` edit. Implements ADR-326 (ACCEPTED 2026-08-25) plus the one slice of ADR-327
it depends on (D5, move-arrival fires the entering clause). Every line reference below was
read this session.

## What lands, by package

### 1. `packages/chord` — the place, its gates, the paper trail

| File | Change |
|---|---|
| `src/ast.ts:2034` `PlaceExpr` | new variant `{ kind: 'adjacent-room'; span }` beside `here`/`offstage` |
| `src/parser.ts:7283` `parsePlace` | before the value-expr attempt: if the next words are `a random adjacent room` (article `a`, then exactly `random adjacent room`), consume and return the new kind. `an adjacent room` / `the adjacent room` / `adjacent room` → `parse.adjacent-room-spelling` with fix-it quoting `a random adjacent room`. A trailing `, randomly` (or any strategy word) after it → `parse.adjacent-room-strategy` ("the randomness is in the noun"). Only `move` reaches this branch via `parser.ts:6806`; the other `parsePlace` caller (`parser.ts:3895`) rejects the kind by name (`parse.adjacent-room-placement`) so the place is legal only as a `move` destination (ADR-326 AC-1) |
| `src/analyzer.ts:6816` `resolvePlace` | `case 'adjacent-room'` → `{ kind: 'symbol', name: 'adjacent-room' }` — reuses the IR `symbol` kind exactly as `offstage` does (`ir.ts:1521`); no IR type change |
| `src/analyzer.ts:258` `placeKey` | add the case (exhaustive switch over `PlaceExpr`) |
| `chord.ebnf` | `place` production gains `"a random adjacent room"` |
| `src/version.ts` | `3.3.0` → `3.4.0` (additive minor, ADR-257 D2) |
| `docs/architecture/chord-grammar-changes.md` | one row, ADR-326 |

### 2. `packages/story-loader` — the draw, the consult, the arrival firing

| File | Change |
|---|---|
| `src/runtime.ts:3892` `resolvePlace` | `symbol adjacent-room` → `this.evaluator.drawAdjacentRoom(moverWorldId, ctx)`; an `undefined` draw throws the ADR-326 D3 diagnostic naming the mover and the room (`LoadError`, the `resolvePlace` posture at `:3903`) and performs no move |
| `src/evaluator.ts` (beside `drawLanding`, `:608`) | new `drawAdjacentRoom(moverWorldId, ctx)`: (1) candidates = `adjacentRooms(room, moverId)`; (2) `n === 0` → `undefined`; (3) draw on a **per-mover persisted stream** — record `{ seed }` under a loader-owned key `chord.adjacent.<moverIrId>`, seed folded from `storySeed` + the mover's IR id exactly as `landingRecord` does (`:653-662`), advanced with `createSeededRandom` / `stream.int` and written back via `world.setStateValue` (`:620-624`). Candidates are recomputed per draw (never stored), so only the seed persists and saves round-trip |
| `src/evaluator.ts` new `adjacentRooms(room, actorId)` | the going read order, lifted from `hasTraversableExit` (`stdlib/src/actions/helpers/exit-legality.ts:34-65`): directions = `RoomBehavior.getAllExits(room).keys()` ∪ `computedExits` keys; per direction: blocked = `world.evaluate(exitBlockedKey(room.id, dir))` if boolean else `RoomBehavior.isExitBlocked` — blocked → skip; destination = **ADR-326 D6**: if `RoomBehavior.getComputedExitDeclaration(room, dir)` → `RoomBehavior.resolveExit(room, dir, { world, actorId, random })` (`world-model/src/traits/room/roomBehavior.ts:271`): `undefined` → static `getExit(room, dir).destination`; `kind: 'exit'` → its `destination`, narration `events` dropped; `kind: 'blocked'` → skip; else static destination; door on the static exit `via` locked (`LockableBehavior.isLocked`) → skip. Result deduped, in direction order (stable for the seed) |
| `src/loader.ts:1043` `onEngineReady` | widen the structural parameter with `getRandomService?(): RandomService` and hand it to the runtime/evaluator. `GameEngine.getRandomService()` exists (`engine/src/game-engine.ts:1851`); the engine calls `onEngineReady` at `game-engine.ts:533-534`. **No engine, bootstrap, or stdlib change** — ADR-326 D6's "threaded at bootstrap" wording is corrected to this seam in the ADR at landing. When no service was handed over (unit tests without an engine), a computed direction is a `LoadError` naming the room — never a silent skip |
| `src/runtime.ts:3915` `moveWithLifecycle` (ADR-327 D5 slice) | after a room transition (`fromRoom !== toRoom`, `placeWorldId !== null`), synthesize the loader's own `if.event.actor_moved` `{ entities: { actor }, data: { fromRoom, toRoom } }` (the shape `enteringDestination`/`movedActorId` read, `event-contract.ts:43-90`) and run `fireEventClauses` + `fireMoveClauses` (`runtime.ts:679-693`, `:726-736` — existing entries) with a runtime-owned re-entry depth counter; the produced events append to the enclosing statement's result. Depth > 8 → `LoadError` `runtime.move-arrival-reentry` naming the room chain. The synthesized event is **not** emitted to the engine's event stream (the engine's own chain would fire the same clauses a second time) — it is the loader firing its own clauses, host-agnostic. Applies to any mover, matching ADR-327 D5; today's heads (`after entering it`) filter only on destination (`runtime.ts:708-713`), and the actor filter arrives with ADR-327 D1, not here |

### 3. Untouched, verified

- `packages/engine`, `packages/stdlib`, `packages/world-model`: read points only (`RoomBehavior.getAllExits/getExit/isExitBlocked/resolveExit`, `exitBlockedKey`, `LockableBehavior.isLocked`) — all already imported by the loader (`runtime.ts:62`) or exported by world-model.
- `packages/world-index`: `statements.ts:172-188` walks `move` for its entity only; a `symbol` place is ignored as `offstage` already is. Verified by running its suite, not assumed.
- Real stories: none edited (feedback: platform tests never touch real stories). The Secret Letter chase increment stays under the paused port plan.

## Tests (rule 12/13 — from the Behavior Statement, asserted on world state)

**`drawAdjacentRoom` / the `move` sink**
- DOES: moves the mover to a room one traversable exit from its containing room; advances and persists the mover's adjacency seed under `chord.adjacent.<irId>`.
- WHEN: `move <entity> to a random adjacent room` executes in a clause body with ≥1 traversable neighbour.
- BECAUSE: the Secret Letter ejects (noisy theft, blocked-stall bounce, monkey chaos) need "somewhere adjacent, honouring blocked exits and locks" without a declared list (ADR-326 Context).
- REJECTS WHEN: no neighbour is traversable → no move, `LoadError` naming mover and room (D3); the place appears outside `move` or is misspelled → compile error by name (D1).

**`moveWithLifecycle` arrival firing (ADR-327 D5 slice)**
- DOES: after a room transition by `move`, runs the destination's `entering` event clauses and every `when <entity> moves` clause for the moved actor, appending their events.
- WHEN: any `move` effect that changes the mover's room (not `offstage`, not same-room).
- BECAUSE: an arrival is an arrival, walked or moved; the blocked-stall bounce composes only if an ejected arrival fires the stall's entering rule (ADR-326 D4/D5).
- REJECTS WHEN: nested arrivals exceed depth 8 → `LoadError` `runtime.move-arrival-reentry`, no further firing.

| Suite | New file | Cases |
|---|---|---|
| chord | `tests/adjacent-room.test.ts` (pattern: `tests/places.test.ts`) | parses in `move`; IR is `symbol adjacent-room`; `an adjacent room` → spelling error + fix-it; `, randomly` → strategy error; outside `move` → placement error; `placeKey` dedupe unaffected |
| story-loader | `tests/adjacent-room-runtime.test.ts` (pattern: `tests/places-runtime.test.ts`, `tests/landing-runtime.test.ts:119-153`) | real `WorldModel` + real runtime clause path via `fireEventClauses`: lands in one of the neighbours (asserted on `world.getLocation(player)`, destination pinned at seed 5); blocked arm (a `blocked … while` line — the #315 composed evaluator) excludes its room; locked door excludes its room; computed direction: resolver active → resolved room only, inactive → static room, `blocked` → nothing (a test resolver registered with `world.registerExitResolver`, `RandomService` = `EngineRandomService` from `@sharpee/engine`, already a loader dependency); empty set → D3 error, location unchanged; NPC mover; seed persists — `getStateValue('chord.adjacent.<id>')` changes across draws and a copied state replays the same pick; **bounce**: a stall with `after entering it, while blocked` → phrase + `move the player to a random adjacent room` re-ejects on arrival (asserts final location ≠ stall and the phrase event count); re-entry: two rooms that eject into each other → `runtime.move-arrival-reentry` after 8 |
| world-index | existing suite (169 passed / 1 skipped baseline) | unchanged; run to prove it |

Rule 13a: OWNED = the loader runtime, the chord compiler, world-model read points. REAL-PATH = the story-loader suite above drives the real `ChordRuntime` against a real `WorldModel` with the real read points; the only stub is the **test exit resolver**, which stands in for a story's resolver (a story-authored dependency, not a platform one — the same posture as ADR-295's own tests), backed by Dungeo's real `CarouselExitTrait` staying green in the walkthrough chain.

## Order of work (one branch, one commit per row is fine)

1. chord: AST + parser + analyzer + EBNF + version + tests → `pnpm --filter '@sharpee/chord' run test:ci` (baseline 991).
2. story-loader: `adjacentRooms` + `drawAdjacentRoom` + `resolvePlace` + `onEngineReady` widening + tests → `pnpm --filter '@sharpee/story-loader' run test:ci` (baseline 610).
3. story-loader: D5 arrival firing + cap + tests (same file).
4. world-index suite (baseline 169/1 skipped); `./repokit build dungeo`; Dungeo walkthrough chain (baseline 952 in 17 transcripts) — `move` is shared machinery.
5. `./sharpee test branch-stories/secret-letter` (baseline 160 cards / 209 assertions) — no story edit, so a diff here is a defect.
6. Paper trail: grammar-changes row; ADR-326 D6 wiring correction + ADR-295 D6 amendment stamp; close #311 with the evidence.

Out of scope here, by the plan: ADR-327's heads/`it` reform and D9; ADR-328's program; the chase increment itself.
