# Session Summary: 2026-08-15 - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Execute Phase 5 of the ADR-310/318 plan: story-loader load-time character instantiation and engine save/restore for `CharacterModelTrait` (ADR-310 D17; ADR-318 D12 persistence rides it). **DONE — see Completed.**
- Phase 6 (David's go-ahead + two rulings): thealderman port completion. Rulings: (1) **remove the Clue-like interface — normal murder mystery, one fixed authored solution** (no randomization, no deduction board); (2) **content authority granted** — thealderman is a Chord test vehicle, Claude authors any content needed (memory: feedback_thealderman_content_authority).

## Phase 6 progress (in session)
- **Solution picked (content authority)**: Viola Wainright, the curtain cord, the Ballroom — maximizes ADR-318 machinery (practiced liar → pin/ledger; burdened → bands; theatre program → physical alibi hole; Catherine's confided knowledge → betray-a-confidence centerpiece).
- **Platform sub-step 1 (dialogue consultation in the topic dispatch)**: scope-string interpretation landed in the arbiter (`arbiter/scope.ts` — `scopeMatches`/`exceptLifts`; `ArbiterContext.actObjectId`/`isKindMember`; the Phase 2 `trait.evaluate(except)` placeholder RETIRED — one obsolete arbiter test rewritten to the new contract + 2 added); shared claim bookkeeping extracted (`conversation/claims.ts` — `pinAllowsClaim`/`recordClaimDelivery`; `conversation/author-events.ts`); `arbiter/reveal.ts` (`arbitrateConfidedReveal` — verdict + deposits + author events); `CHARACTER_TURN_KEY` world-state turn mirror (tick phase writes; dialogue mints read +1). Loader runtime: `buildTopicArm` consults the character model — confided-reveal gate (refuse/evade suppresses the row wholesale; the action's default reply is the evasion, D12-safe), pin filter on delivered phrases, mint/maintenance on claims-tagged delivery, betrayal witnessing with `witnessed as` aliases; `RuntimeHost.characterStoryData()`; registry construction moved from engine-ready to load time. 7 real-path tests (`story-loader/tests/character-dialogue.test.ts`) through the REAL askingAction.
- **Platform sub-step 2 (act detection in observe)**: `detectActs`/`witnessActs` wired into the observe sub-step with registry-held `witnessed as` aliases (world-id actors, loader-resolved); +2 observe tests.
- **Story**: `stories/thealderman/chord/thealderman.story` completed (~700 lines): 4 facts (killer/whereabouts/debts/solvency), 8 rooms with exits, 4 evidence pieces (program, curtain, stain, cord), 6 suspects with topic tables + response ladders (claims-tagged lies for Ross/Viola/Jack; confided gates for John/Catherine), the `accusable` dispatch trait (`select on verdict` — zoo idiom; entity on-clauses don't ride the dispatch path), `define counter accusations` + 3-strikes lose, all conversation/ending prose authored. `viola-half-sister` → `viola-secret` rename (gate matches row candidates against knowledge topics); port test updated.
- **Transcripts (all passing via the real bundle)**: `wt-01-the-mystery` (29 steps — evidence, interviews, the maintained lie, both confided refusals, program confrontation, winning accusation), `lie-and-pin` (4), `reveal-gate` (8), `accusations-lose` (4 — 3 strikes → case-collapsed), `conscience-breaking` (8 — deflect → 5 maintained lies → breaking band → confession). Run as `node dist/cli/sharpee.js --test --story stories/thealderman/chord/thealderman.story stories/thealderman/tests/transcripts/*.transcript` (story root holds no .story file, so --story is explicit).
- Suites: character 395 passing, story-loader 494 passing; root tsc clean; `pnpm exec turbo run test:ci` 65/65; **Dungeo walkthrough chain green** (shared-dispatch regression insurance).
- Phase 6 mutation-verification: 1 warning — the `CHARACTER_TURN_KEY` mirror write was untested and the mint's `mirror + 1` arithmetic only exercised its `?? 0` fallback. **Closed same session**: mirror assertion in observe-substep.test.ts; real-tick-then-ask test in character-dialogue.test.ts asserting `turnMinted === mirror + 1`. Everything else scanned GREEN.
- **TS story archived (David: "archive")**: `stories/thealderman/src` + package.json + tsconfig git-mv'd to `stories/_archive/thealderman-ts/` with a README (never a workspace member — the allow-list never included it — so no workspace edits; the friendly-zoo ADR-259 D8 shape: the live story is now a pure Chord story). Zero ConversationBuilder story consumers remain. All 5 transcripts re-run green post-archival (53 steps); root tsc clean. **Phase 6 closed DONE in plan.md.**

## Completed
- **Design re-derivation on David's ask** ("go through this again from the Sharpee↔Chord alignment and elegance measurement"): yardsticks were boundary ownership (loader owns all IR→world translation), seam count, no parallel paths, D17 discipline. Two calls changed from the first pass: observation moved INSIDE the character-model phase (not plugin-level forwarding — §2's ordering contract), and the ad-hoc condition hook became ONE story oracle with a reserved `isKindMember` slot for Phase 6. Dialogue deferral reframed: the ConversationData path is being retired by Phase 6, so wiring it now would build a parallel path. David: "proceed".
- **Sub-step 1 (id translation)**: `CompiledCharacterContext.resolveEntityId` — apply-compiled maps every ref-bearing field (feels targets, goal-step targets/items/rooms, resists excepts, principle/obligation/honor scopes+excepts, spreads excludes); identity default; 3 tests.
- **Sub-step 2 (story oracle)**: `CompiledStoryOracle` (`src/story-oracle.ts`), bound on `CharacterPhaseRegistry` (+ `temperamentDefs` field); goal activation + wait-for consult it; unbound-oracle-with-compiled-condition throws loudly; 5 tests. Contracts.md §2.2 added.
- **Sub-step 3 (observation)**: `NpcTickContext.actionEvents` (additive, stdlib) → NpcPlugin pass-through → `runObserveSubStep` between decay and influence (contracts.md §2 amended: decay → observe → influence → propagation → goals); room-scoped, D7-safe; 4 tests.
- **Sub-step 4 (loader)**: `applyCharacterBlocks` at finalizePlayer (order-proof — second lifecycle hook, same reason as Gap-2 composition); passive `NpcTrait` composed on character-model persons without a behavior adjective (tick enumeration requires NPC — carrying the model makes the entity an NPC); engine-ready registration (configs + baselineMood + temperamentDefs + oracle + `registerCharacterModelPhase`). story-loader gained `@sharpee/character` dep (tsf topo-sorts by workspace deps — verified in tsf resolver/graph.ts — no cycle).
- **Sub-step 5 (evaluator)**: `feels`/`knows` loud throws replaced with trait reads; interior `is`-values (mood/threat/band; custom moods over extended coordinate table mirroring `nearestMood`'s metric), symmetric with `stateAdjectiveHolds`.
- **Sub-step 6 (persistence)**: audit found a REAL defect — trait rehydration is `Object.create`+`Object.assign` (no constructor), and the own-field predicate `Map` serialized as `{}`, so any restored character-model NPC crashed on `evaluate()`. Fixed: module-level WeakMap predicate store with lazy platform registration; regression test through real `IFEntity.toJSON/fromJSON`. **AC7 + ADR-318 AC5 leg discharged** through the real `SaveRestoreService` (gzip→`loadJSON`→rehydrator) asserting trait state after restore (`story-loader/tests/character-loading.test.ts`, 6 tests).
- **Enablers**: character package `ts-forge.json` esm skip removed + `import`/`module` export conditions added (story-loader is its first ESM consumer); dist+dist-esm rebuilt for world-model/stdlib/plugin-npc/character/story-loader (the dist-esm staleness trap bit mid-session, per the recorded pattern).
- **Verification (2026-08-15)**: character 390 passing, world-model 1479 passing (10 skipped), stdlib 1616 passing (27 skipped), story-loader 486 passing, `npx tsc --noEmit` clean, `pnpm exec turbo run test:ci` 65/65.
- **Phase 5 closed DONE in plan.md** with evidence and carried-forward list.

## Key Decisions
- **One oracle, not accreting hooks**: `evalCondition` now, `isKindMember` reserved — Phase 6 arbitration extends the seam instead of adding one (classifier-scope kind membership lives in the IR).
- **Observation is a phase sub-step**, not plugin forwarding — §2's ordering contract stays a contract; placement decay→observe so the turn evaluates settled state then reacts to the player's action.
- **A character-model person IS an NPC**: loader composes passive `NpcTrait` rather than widening stdlib's NPC predicate (two definitions of NPC-ness avoided).
- **Dialogue stays unwired in Phase 5 deliberately**: Phase 6 converges chord topic tables with the selector socket (claims mint/pin at that meeting point); the ConversationData path's producer is being retired, so wiring it would be a parallel path.
- **Restore machinery is zero-code**: chord-path transient state verified empty (custom moods resolve to axes at compile; predicates rebuild lazily); the fix made the trait self-rehydrating rather than adding onWorldRestored re-application.

## Open Items
- Carried: stale plans `adr-280-chord-writer-project-model` + `live-derived-state` undispositioned; 23 stranded event logs; ADR-location split (4 dirs) raised by audit, undecided.
- Carried: N1–N3 thealderman scene slots await David's pick (Phase 6 blocker only).
- Carried to Phase 6: dialogue convergence, claims/witnessedTopics consumption, arbitration scope interpretation via the oracle slot.
- Carried to Phase 7: `tsf build --npm` regression across touched packages; Dungeo/Fernhill transcript regression; CLI bundle rebuild.

## Files Modified

**Docs** (3): `docs/work/adr-310/plan.md` (Phase 5 CURRENT → DONE + evidence); `docs/work/adr-310/contracts.md` (§2 observe sub-step, §2.2 story oracle); this session file (new).

**`@sharpee/character`** (7): `src/story-oracle.ts` (NEW); `src/apply-compiled.ts` (resolveEntityId walk); `src/goals/goal-activation.ts` (+`CompiledConditionEval`, evaluate() consults it); `src/goals/step-evaluator.ts` (`GoalStepContext.evalCompiled`, wait-for gate); `src/tick-phases.ts` (registry oracle/temperamentDefs, observe sub-step, goal threading); `src/index.ts` (exports); `package.json` + `ts-forge.json` (ESM exports, esm target un-skipped).

**`@sharpee/world-model`** (1): `src/traits/character-model/characterModelTrait.ts` (WeakMap predicate store — rehydration fix).

**`@sharpee/stdlib`** (1): `src/npc/npc-service.ts` (`NpcTickContext.actionEvents`).

**`@sharpee/plugin-npc`** (1): `src/npc-plugin.ts` (actionEvents pass-through).

**`@sharpee/story-loader`** (3): `src/loader.ts` (applyCharacterBlocks, storyOracle, engine-ready registration, character dep import); `src/evaluator.ts` (feels/knows/interior is-values); `package.json` (character dep).

**Tests** (5 files, +26 tests): `character/tests/roundtrip/id-translation.test.ts` (NEW, 3); `character/tests/tick-phases/oracle-goals.test.ts` (NEW, 5); `character/tests/tick-phases/observe-substep.test.ts` (NEW, 4); `world-model/tests/unit/traits/character-model.test.ts` (+1 rehydration); `story-loader/tests/character-loading.test.ts` (NEW, 6 — real loader + real SaveRestoreService).

## Notes
- Session started: 2026-08-15 17:23 CDT. Phase 5 executed with the alignment re-derivation first (David's request), then six sub-steps, Behavior Statement before tests per construct.
- Phase 6 executed in the same session (David's go-ahead + the two scope rulings): dialogue convergence, the fixed-solution story, five bundle transcripts, TS-story archival. **Phases 5 AND 6 both closed DONE this session.**
- Next session: David's go-ahead for **Phase 7**, the plan's final phase (acceptance closure — AC-by-AC audit, AC2 fixture confirmation, D12 channel isolation, Dungeo/Fernhill byte-identical regression, ADR-318 AC8 cost regression, IDE author-channel polish, `tsf build --npm` across touched packages).
