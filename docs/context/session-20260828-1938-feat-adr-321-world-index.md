# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- ADR-328 Phase 4 — D2b: actor threading across the standard-action library (mechanical sweep). Every `context.player`/`getPlayer()` read in `packages/stdlib/src/actions/**` (plus the carried `helpers/multi-object-handler.ts` gap) becomes a read of the command's actor; Dungeo walkthrough chain must stay byte-identical (952/17).

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md`
- **Phase executed**: Phase 4 — "D2b — Actor threading across the standard-action library (mechanical sweep)" (Large, budget 400)

## Completed
- Session Start (19:38 CDT): recap presented, pre-session-audit clean, profile fresh (Aug 23), core concepts read, gate cleared.
- Call-site survey: 140 occurrences across 52 files under `packages/stdlib/src/actions` (down from the plan's 150/54 after Phase 3's `taking.ts` + `lifecycle-engine.ts` flips), plus 3 in `helpers/multi-object-handler.ts`.
- Pre-sweep Dungeo chain baseline captured 19:41 CDT (scratchpad `chain-baseline.txt`, 1085 lines, all passing) for the byte diff.
- Sweep shape presented in chat (buckets A/B/C); David asked for a pros/cons HTML doc, then the elegance/alignment pass on it. Published as the "Actor Sweep Decisions" artifact (https://claude.ai/code/artifact/cdfbdcd5-b9d2-43b3-b5fa-45c5bd02be27), two versions: `initial`, `alignment-pass`.
- Alignment pass findings (verified against source 19:45–19:52 CDT): the loader matches heads on `entities.actor`/`data.actorId` (`story-loader/src/event-contract.ts:79-92`, `runtime.ts:765-769`) so flipping `actorId` is what makes `on the mercenaries taking` true; Chord has both `the player` role value (`chord/src/ir.ts:1543`, ADR-327 D9 `change the player to`) and actor heads, so both fields stay; `kill the player` lowers to `killPlayer(world, getPlayer())` (`runtime.ts:3763-3778`); Chord's `first time` greeting row → `RoomTrait.initialDescription` (`parser.ts:4726`, `loader.ts:1725-1729`) is reader-first-look, which the `markVisited` guard preserves; `entering` clauses bind to `if.event.actor_moved` (`event-contract.ts:23`), not `room.first_entered`; Chord's `concealed` (`catalog.ts:47`) is an item marker unrelated to `ConcealedStateTrait`; **no story-loader test references `executeAsActor`** — ADR-327 AC-2's non-player half is unwritten, recommended as a second real-path gate this phase.

- David: "accept all recommendations" (19:55 CDT). Sweep executed 19:56–20:00 CDT: mechanical `context.player` → `context.actor` pass across `packages/stdlib/src/actions/**` (excluding five hand-edit files) + `helpers/multi-object-handler.ts`; misleading `player` locals renamed to `actor` in `hiding.ts`, `revealing.ts`, `inventory.ts`, `looking-data.ts`, `multi-object-handler.ts`; `markVisited` guarded on `actor.id === context.player.id` in `going.ts` and `looking.ts`; survivor comments at `attacking.ts` (victim-is-player), `deadly-room-death.ts`, `concealment-break.ts`, `context-adapter.ts`; doc comments at `enhanced-types.ts:345,384` corrected. Seven `context.player`/`getPlayer()` reads survive under the path, each commented.
- Tests written from the Behavior Statements: `packages/engine/tests/execute-as-actor.test.ts` (+2: implicit take inside wearing as the NPC; `emitSound` source = NPC + NPC's room); `packages/stdlib/tests/unit/helpers/multi-object-actor.test.ts` (3: NPC `take all` expands from and lands in the NPC; NPC `drop all`); `packages/stdlib/tests/unit/actions/visited-guard.test.ts` (2); `packages/story-loader/tests/adr-327-ac2-execution-entry.test.ts` (4: ADR-327 AC-2's non-player half through the real `CommandExecutor.executeAsActor`). `@sharpee/event-processor` and `@sharpee/parser-en-us` added as story-loader devDependencies for that test (`pnpm install --offline`).
- Results 20:00–20:12 CDT after the last source edit: root `npx tsc --noEmit` clean; stdlib 1651 passing + 5 new (27 pre-existing skips); engine 672 passing (7 skips); character 570 passing; loader AC-2 test 4 passing; `./repokit build dungeo` green; Dungeo chain all passing and **byte-identical to the pre-sweep baseline** (diff of the two outputs with `ms` timings masked: 0 lines).
- mutation-verification (20:14 CDT): sweep consistent, survivors hold, new tests GREEN; one warning — `dialogue-selector.ts` `runConversationScene()` now keys scenes on `context.actor` with no NPC-path test, plus a stale "player's own scene" comment. Closed same session: comment corrected; new REAL-PATH `packages/story-loader/tests/adr-328-npc-dialogue-scene.test.ts` (3 passing — Bram addressing Aemilia through `executeAsActor` seats [bram, aemilia] opened by Bram with the player nowhere in it; a later move stamps that scene's `lastMoveTurn` (= `character.turn + 1`); the player's own talk still opens the player's scene). My first draft of the clock assertion assumed `lastMoveTurn === character.turn`; `dialogueTurn` is `+ 1` (`character/src/character-clock.ts:36`), so the expectation was corrected, not the code.
- Story-loader full suite first showed 20 failures in 7 files, all `actor.id` on hand-rolled `context: any` fixtures lacking `actor`; reported and held per CLAUDE.md; David: "continue" (20:30 CDT) → `actor: player,` added at `door-actions:126`, `lockable-key:95`, `region-crossing:143`, `region-daemon:137`, `region-forest:49`, `starts-state:125`, `story-daemon:114`; story-loader 970 passing (963 + 7 new).
- Plan: Phase 4 DONE with evidence; Phase 5 CURRENT (since 2026-08-28) with an entry-state addendum. ADR-327 AC-2 stamped satisfied. ADR-328 Acceptance item 3 stamped *partly* satisfied: AC-2 half green; **AC-5 not green — no test in the repo references `game.pc_switched`**, so `change the player to` has no real-path test on either half; carried to Phase 5's entry state.
- Build artifacts regenerated, not hand-edited: `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/stdlib.md`; `pnpm-lock.yaml` updated by the two devDependencies.

## Key Decisions
- All seven recommendations in the Actor Sweep Decisions artifact accepted as written (David, 19:55 CDT): one mechanical pass + hand exceptions; victim-is-player sites stay `player`; `markVisited` guarded on actor = player; concealment hook stays `getPlayer()`; adapter unchanged; `pushing-original.ts` swept not deleted; byte-diff chain gate plus the ADR-327 AC-2 loader test.

## Next Phase
- Phase 5 — D5 NpcService decision/execution split.

## Open Items

### Short Term
- Nothing committed yet as of this summary — David has not asked for a commit.
- ADR-327 AC-5 real-path test owed (no `game.pc_switched` test exists); dependency is in place, tracked in Phase 5's entry state.

### Long Term
- NPC-visited semantics (`markVisited` guard) and NPC death (`killPlayer` survivors) are open by design until ADR-328 D7's child ADR gives them words.
- Pre-existing #319 and #320 remain open, unrelated.

## Files Modified
- **Platform source** (52 files): 49 under `packages/stdlib/src/actions/**` (mechanical `context.player` → `context.actor`; guards in `going.ts`/`looking.ts`; survivor comments in `attacking.ts`, `deadly-room-death.ts`, `hiding/concealment-break.ts`, `context-adapter.ts`; doc comments in `enhanced-types.ts`; move-clock comment in `helpers/dialogue-selector.ts`), `packages/stdlib/src/helpers/multi-object-handler.ts`.
- **Tests, new**: `packages/stdlib/tests/unit/helpers/multi-object-actor.test.ts`, `packages/stdlib/tests/unit/actions/visited-guard.test.ts`, `packages/story-loader/tests/adr-327-ac2-execution-entry.test.ts`, `packages/story-loader/tests/adr-328-npc-dialogue-scene.test.ts`.
- **Tests, extended**: `packages/engine/tests/execute-as-actor.test.ts` (+2).
- **Test fixtures** (7): `packages/story-loader/tests/{door-actions,lockable-key,region-crossing,region-daemon,region-forest,starts-state,story-daemon}.test.ts` (`actor: player`).
- **Config**: `packages/story-loader/package.json` (+2 devDependencies), `pnpm-lock.yaml`.
- **Plan and ADRs**: `docs/work/adr-328-actors-platform-concept/plan.md`, `docs/architecture/adrs/adr-327-*.md` (AC-2 stamp), `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` (item 3 stamp).
- **Build artifacts**: `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/stdlib.md`.

## Notes
- Session 19:38–20:40 CDT. Approach: survey → present shape → David asked for a pros/cons doc → elegance/alignment pass against Chord's actual surface (source-cited) → all seven recommendations accepted → one mechanical pass, exceptions by hand → tests from Behavior Statements → byte-diff chain gate → mutation-verification's one warning closed with a real-path test. The alignment pass changed the plan in one material way: it surfaced that ADR-327 AC-2's non-player test did not exist, which became this phase's language-side gate.

---

## Session Metadata
- **Status**: COMPLETE (test counts verified in-session 2026-08-28 20:00–20:35 CDT after the last source edit — stdlib 1656, engine 672, story-loader 970, character 570, Dungeo chain 952 byte-identical, presence-test transcripts)
- **Blocker**: N/A
- **Rollback Safety**: safe to revert (nothing committed yet)
