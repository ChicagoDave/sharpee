# Session Plan: ADR-389 — Chord loader: one identity, a build list, a table for adjectives

**Created**: 2026-10-31
**Plan Status**: ACTIVE
**Overall scope**: Implement ADR-389 (GitHub #638) against `packages/story-loader`, `packages/chord`, `packages/engine` and `packages/if-domain`, in the order D6 fixes: typed seams (D5), then ADR-390 (GitHub #639, the player as a role — inserted 2026-10-31 because D1's `player`-sentinel premise was wrong), one identity (D1), `validateIR` gate by gate (D4), core adjective table (D3), then the named step lists (D2). Every phase lands byte-identical; the ADR-390 phase adds the Dungeo chain to its net.
**Bounded contexts touched**: Chord story-loader (ChordStory facade, build steps, evaluator seam, extension registry); Chord compiler analyzer (`ANALYSIS_PASSES`, new `validateIR`); engine `Story` contract; if-domain `Parser` contract.
**Key domain language**: IR id = world id; `validateIR`; `WORLD_BUILD_STEPS` / `ENGINE_READY_STEPS`; `CORE_TRAIT_ROUTES`; backstop; ChordStory facade.

## Standing rules for every phase
- **Discuss first (ADR D7)**: every phase touching `packages/` needs David's explicit go before implementation starts. Present the phase's concrete change set and wait.
- **Exit gate (AC-6, D6)**: the three tree runs (`./sharpee test branch-stories/secret-letter --tree`, `branch-stories/fernhill`, `branch-stories/ides-of-march`) byte-identical to the run before the phase, one run each, never re-run for flakiness; `pnpm --filter '@sharpee/story-loader' test` at 1525 passing or higher; chord suite at its Phase 0 count or higher. Evidence is written inline in the phase's Demonstrated line (command, count, date).
- vitest reads source but `./sharpee` reads dist: tsf-build touched packages (`./repokit build`, never `pnpm build`) before any `./sharpee test`. Never `2>&1` with pnpm.
- No `unknown`/`any` introduced; rule-9 headers on every new file; no ADR references in error messages (cite in a comment above the throw).
- A build or test failure is reported and waits for David; no auto-retry.

## References consulted
- `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md` — the authoritative record: decisions D1-D7, ACs AC-1..AC-7, fixed phase order, byte-identical exit gate.
- `docs/architecture/adrs/adr-390-the-player-is-a-role-the-session-holds.md` — Phase 2: one world fact (the role flag), `Player` in the engine, one writer, the sentinel resolved at use time; closes GH #394.
- `docs/architecture/adrs/adr-335-story-loader-decomposition.md` — the method reused (facade does not move, `RUNTIME_BIND_STEPS` shape, bodies moved verbatim); D5 public surface of `createStory`/`ChordStory`/`ChordRuntime` continues to hold.
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` — explicit stage list pattern that D2 copies one level down.
- `docs/architecture/adrs/adr-388-persisted-identity-for-chord-saves.md` — D1 as amended: Chord entities take their IR id as world id; makes D1 here a deletion.
- `docs/architecture/adrs/adr-336-chord-analyzer-structure.md` — D3 `ANALYSIS_PASSES` is the named list `validateIR` joins as the last entry.
- `docs/architecture/adrs/adr-276-chord-source-authoritative-errors.md` — D1 backstop is amended (one-line note, written in the phase landing the first gate; Status line unchanged).
- `docs/architecture/adrs/adr-215-chord-extensions-and-combat.md` — names-vs-mappings split; D3 extends conformance pinning to core adjectives.
- `docs/architecture/adrs/adr-237-loader-helpers-boundary.md` — D3: loader composes traits on the world-model surface directly; unchanged.
- `docs/architecture/adrs/adr-210-story-language.md` — direction rule: chord imports no platform package; story-loader consumes IR.
- `docs/context/project-profile.md` — stack and module conventions.
- GitHub #638 (this ADR's issue), #639 (ADR-390's), #394 (player identity, closed by Phase 2) and #377 (the loader cleanup it follows).
- Product ADRs not consulted (no Scope intersection): none

## Phases

### Phase 0: Baseline and gate inventory
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Evidence floor for AC-6; the 25-gate census D4 depends on.
- **Entry state**: Branch `feat/adr-389-chord-loader` at f7aaf68fd; ADR-389 ACCEPTED. No packages/ edits in this phase (read and run only).
- **Deliverable**: `docs/work/adr-389-chord-loader/baseline.md` (new) recording: story-loader suite count (expect 1525 passing, 1 skipped), chord suite count, `tsc --noEmit` result, the three tree-run outputs captured to files under `docs/work/adr-389-chord-loader/baseline/` (new) with counts; a gate inventory table of the 28 backstop throws in `packages/story-loader/src/loader.ts` (found by `grep -ci backstop`; only 18 carry the phrase "defensive backstop") (line, analysis code, what it reads: IR record vs built world vs AST/analyzer state), classifying the 25 to move vs 3 that stay (2188, 1567, 3101), and checking the ADR's claim that 13 of 25 read IR records only; proposed grouping of gates into D4 sub-phases (now Phases 4-6; adjustable here).
- **Files**: `docs/work/adr-389-chord-loader/`
- **Exit state**: Baseline numbers and the gate inventory are written; any gate found to need analyzer state is flagged for David before Phase 4.
- **Demonstration**: `grep -ci backstop packages/story-loader/src/loader.ts` prints 28 and the story-loader and chord suites run; baseline.md lists every count and the tree outputs saved byte-for-byte.
- **Demonstrated**: 2026-10-31 at f7aaf68fd — `grep -ci backstop` 28; story-loader 189 files, 1525 passing, 1 skipped; chord 110 files, 1747 passing; `npx tsc --noEmit` clean; three tree runs captured to `baseline/` (secret-letter 1458 cards passing / 11 failing, exit 1, pre-existing; fernhill 86 passing; ides-of-march 39 passing). Inventory in `baseline.md`: 25 move, 3 stay, all 25 IR-expressible; one flag for David (row 5, loader check has no analyzer twin). [verified in part: event log build row "Build passed" `npx tsc --noEmit` 2026-10-31T09:11:15Z; suite counts and tree runs reported by session, unverified — the test row at 09:14:36Z aggregates "1729 passing 1499 passing 237 passing 371 passing", which does not match the stated counts]
- **Status**: DONE

### Phase 1: Typed engine seam (D5)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Engine `Story` contract and `Parser` contract; ChordStory consumer. Satisfies AC-5.
- **Entry state**: Phase 0 baseline recorded; David's go for packages/ edits.
- **Deliverable**: `Story.getCustomActions?(): Action[]` (stdlib `Action`) in `packages/engine/src/install/story.ts`; `Parser.getStoryGrammar(): GrammarBuilder` declared on if-domain's `Parser`; ChordStory.getCustomActions, ChordRuntime.buildDispatchActions, DispatchVerbsSection.buildDispatchActions return `Action[]`; the `as unknown as` cast in `extendParser` removed; `span: unknown` becomes chord's `Span` at the five loader sites.
- **Files**: `packages/engine/src/install/story.ts`, `packages/if-domain/src/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/src/runtime.ts`, `packages/story-loader/src/runtime/dispatch-verbs.ts`
- **Exit state**: AC-5 grep returns only the four route-table casts deferred to Phase 7 (David, 2026-10-31); the three D5 seams and the capabilities seam (packages/story-loader/src/loader.ts line 1233, evaluator typed to `ClientCapabilities`) carry no cast; `parser-en-us` compiles without edit; exit gate passes.
- **Demonstration**: Run the AC-5 grep on the four files and it prints nothing; `./repokit build` succeeds; three tree runs diff clean against baseline; suites at or above baseline.
- **Demonstrated**: 2026-10-31 — `npx tsc --noEmit` clean; `./repokit build` exit 0 (14:09); story-loader 1525 passing / 1 skipped; chord 1747; engine 877 / 7 skipped; stdlib parser-factory 13. AC-5 grep prints only the four route-table casts deferred to Phase 6 (loader.ts 2124, 2496, 2569; dispatch-verbs.ts 91); `getStoryGrammar(): GrammarBuilder` is on if-domain's `Parser` (parser-types.ts:142) and `parser-en-us` compiled without edit; two test mock parsers (engine fixtures, stdlib parser-factory) gained the method. Tree runs vs Phase 0 captures: secret-letter byte-identical (exit 1, same 11 failing cards), ides-of-march byte-identical, fernhill identical except two wall-clock timing fields (`1.1s`→`1.0s`, `0.1s`→`0.2s`), the one variance ADR-293 allows. [reported by session, unverified: event log has no test row for these counts in the phase window; the "Build passed" rows at 09:25Z and 19:07Z are python edit heredocs, not builds]
- **Status**: DONE

### Phase 2: The player is a role the session holds (ADR-390)
- **Tier**: Large
- **Budget**: ~450 tool calls
- **Domain focus**: One world fact for the player (the actor's role flag), one session `Player` object, one writer; resolves GH #394; the `player` sentinel resolves through `world.playerCharacter`. Inserted ahead of D1 (David, 2026-10-31) so Phase 3 is the pure deletion ADR-389 D1 describes.
- **Entry state**: Phase 1 committed (5d0ebab3e); ADR-390 ACCEPTED; David's go.
- **Deliverable**: world-model — the stored playerId field, getPlayer, the plain setPlayer setter, the actor trait's makePlayer and the snapshot's playerId deleted (concrete class and the thin interface alike); playerCharacter (throws when none or more than one holder), hasPlayerCharacter, setPlayer(entityId) for the first assignment and changePlayer(entityId) for a move (David, 2026-10-31), both over one private writer that requires isPlayable, clears every other flag and moves the role vocabulary with the world's own self words; the actor behavior's findPlayer becomes the getter's implementation. engine — a new module packages/engine/src/player.ts declaring the Player interface (character, is(actorId), permits(actorId, actionId), viewpointId), exposed as a readonly player member on GameEngine; the context's player member becomes a getter over the Player's character; `switchPlayer` = `assignPlayerRole` + resync (flag juggling at game-engine.ts ~1119-1132 gone); `createPlayerStep` reads the world's playerCharacter; `executeAsActor` refuses a meta action for a non-player actor via `permits`; packages/engine/src/turn/enrich-events.ts (near lines 55, 59, 75) and packages/engine/src/turn/sound-dispatch.ts (near line 52) read the viewpoint from the engine's Player. story-loader — the start block's `change the player to X` calls `world.assignPlayerRole(X)` at the moment it runs (statements.ts ~201); `assignedPlayerId`, `playerWorldId()`, `finalizeRoleHolder`'s stamping, `createPlayer`'s re-stamping, `EntityIdResolver` (and its export from packages/story-loader/src/index.ts), the `'player'` alias write deleted; `createPlayer` keeps the ADR-344 refusal wording on `!hasPlayerCharacter`; one `worldIdOfRef(ref, world)` with `PLAYER_SENTINEL` in packages/story-loader/src/state-keys.ts; the ten hand-written is-this-the-player comparisons read the world's playerCharacter id. Every reader moves in one cut: 137 non-test `getPlayer()` sites (59 in `stories/dungeo/src`, one file each in family-zoo-tutorial and channel-service-test), 127 in tests, 2 production + 247 fixture `setPlayer` calls → `assignPlayerRole` (a fixture whose player is not `isPlayable` is corrected). ADR-327 D10 and ADR-344 gain a one-line note; GH #394 closed by this phase's commit.
- **Files**: `packages/world-model/src/world/WorldModel.ts`, `packages/world-model/src/traits/actor/{actorTrait,actorBehavior,playerRole}.ts`, `packages/engine/src/{player.ts (new),game-engine.ts,types.ts}`, `packages/engine/src/install/create-player.ts`, `packages/engine/src/turn/{enrich-events,sound-dispatch}.ts`, `packages/engine/src/command/command-executor.ts`, `packages/story-loader/src/{loader,evaluator,index,state-keys}.ts`, `packages/story-loader/src/runtime/{statements,timers,move-clauses}.ts`, `packages/stdlib/src/` (21 reads), `stories/dungeo/src/` (59), `stories/family-zoo-tutorial/src/index.ts`, `stories/channel-service-test/src/channels.ts`, test fixtures across world-model, stdlib, engine, story-loader, transcript-tester, dungeo; `docs/architecture/adrs/adr-327-explicit-references.md`, `docs/architecture/adrs/adr-344-player-role-holder-at-the-install-seam.md` (notes).
- **Exit state**: ADR-390 AC-1..AC-7 hold; the exit gate passes WITH Dungeo in the net for this phase: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` at its count before the phase (952 passing / 17 transcripts last recorded, session b173a9 — re-measure first), plus the three trees and the world-model, engine, stdlib, story-loader suites at or above their counts.
- **Demonstration**: `grep -rn "playerId\|getPlayer\|setPlayer\|makePlayer" packages/world-model/src` prints nothing; the same grep for getPlayer and setPlayer over packages, tools and stories (archives excluded) prints nothing; the grep for assignedPlayerId, playerWorldId and EntityIdResolver over packages/story-loader/src prints nothing; the three throw-or-refuse tests are green (an unassigned read, two holders, a non-player actor performing the saving action); the start-block story that reassigns the role to Alex and then starts the player's bell loads with the timer on Alex; Dungeo chain count unchanged; trees byte-identical to the Phase 0 captures.
- **Demonstrated**: 2026-10-31 — per-package `tsc --noEmit` clean for world-model, engine, story-loader, stdlib, event-processor, character, basic-combat, bridge, runtime, platform-browser, bootstrap, branch-tester, transcript-tester, ext-testing, devkit, dungeo; `./repokit build` exit 0 (second run; the first failed on two ext-testing reads a path filter had hidden, fixed before the rerun David approved) and `./repokit bundle` rebuilt dist/cli/sharpee.js. Suites: world-model 1687 passing (was 1686 + 1 new); stdlib 1905; engine 877 / 7 skipped (+4 new in tests/unit/adr-390-player-role.test.ts for AC-2, AC-4 and the install order); story-loader 1528 passing / 1 skipped (190 files); chord 1747; event-processor 28; character 641; basic-combat 32; transcript-tester 371; branch-tester 377; platform-browser 172 / 5 skipped; bootstrap 57; devkit 204 / 1 skipped; dungeo unit 58. Dungeo chain 952 passing in 17 transcripts, identical to the Phase 2 baseline except the Duration line. Trees vs Phase 0 captures: secret-letter byte-identical (exit 1, same 11 failing cards), ides-of-march byte-identical, fernhill identical except one wall-clock field after the claims walk's snapshot identity was repointed at the live world (`claims-game.ts`). ADR-390 AC greps: world-model src clean of playerId/getPlayer/makePlayer/assignPlayerRole; repo-wide `getPlayer()|assignPlayerRole(` clean including .js and .template; story-loader clean of assignedPlayerId/playerWorldId/the alias (EntityIdResolver stays, shrunk, until Phase 3); no `context.player =` write in engine; no `isPlayer =` writer outside world-model. 77 fixtures corrected (bare or non-playable players), 252 fixture setPlayer calls now reach the one writer; `setPlayer`/`changePlayer` split (David) with `setPlayer` a no-op on the same holder. Rule 15 mutation-verification found every mutation present and five test gaps, all closed and green: the role-vocabulary move and a refused change (world-model.test.ts), the start block's set-then-change and the outside-start-block request (tests/adr-390-start-block-role.test.ts, 3 tests), the refusal leaving the world byte-identical and the install no-op on a pre-assigned holder (engine tests/unit/adr-390-player-role.test.ts, now 7 tests), and `readWorldSnapshot.playerId` (branch-tester tests/read-world-snapshot.test.ts).
- **Status**: DONE

### Phase 3: One identity (D1)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Entity identity across compiler, loader, runtime, evaluator, extensions, save. Satisfies AC-1.
- **Entry state**: Phase 2 (ADR-390) committed, so the `player` sentinel already resolves through `world.playerCharacter` and `playerWorldId`/`EntityIdResolver` are gone; David's go.
- **Deliverable**: Delete `worldIds`, `irIds`, `entityId`, `irIdOf`, loader and evaluator `requireWorldId`, ExtensionInstallContext.worldId and requireWorldId; one `requireEntity(world, irId)` in one module; `buildEntity` asserts `entity.id === irEntity.id` after each `createEntity` (LoadError naming both ids); all 13 consumer files updated. Ruling (David, 2026-10-31, "Go" on option a): `entityId` and `irIdOf` are public members of `ChordStory` and ARE deleted — ADR-389 AC-7 amended to allow exactly those two removals; the 313 test calls to `story.entityId(x)` across 77 files and the 7 `story.irIdOf(x)` calls become the IR id literal/expression `x`. The two evaluator existence checks (`ids.entityId(e.id) !== undefined`, evaluator.ts ~708, ~879) become `world.getEntity(e.id) !== undefined`. The `player` sentinel is no longer this phase's concern (ADR-390 D3 resolves it in Phase 2).
- **Files**: `packages/story-loader/src/`, `packages/story-loader/tests/` (77 files), `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md` (AC-7 note)
- **Exit state**: AC-1 grep returns nothing; the assertion test (world whose `createEntity` ignores the requested id) passes; exit gate passes.
- **Demonstration**: AC-1 grep on `packages/story-loader/src` prints nothing; new assertion test green; tree runs byte-identical; suites at or above baseline.
- **Demonstrated**: 
- **Status**: CURRENT (since 2026-10-31)

### Phase 4: validateIR, entity and composition gates (D4a)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: IR invariants in `@sharpee/chord`; first gate group (kind nouns, composition/trait adjectives, hiding positions, dark-rooms, setting names/booleans, door-unconnected, worn-not-wearable, patrol route, per Phase 0 inventory). Opens AC-4.
- **Entry state**: Phase 3 committed; inventory approved; David's go.
- **Deliverable**: `packages/chord/src/validate-ir.ts` (new) exporting `validateIR(ir): Diagnostic[]` with this group's gates, added as the last `ANALYSIS_PASSES` entry, exported from `packages/chord/src/index.ts`; analyzer copies and loader backstops for these gates deleted; `createStory` calls `validateIR` once after format and identity checks, throwing a LoadError on the first error-severity diagnostic; matching tests moved from `packages/story-loader/tests/adr-276-backstops.test.ts` to chord (one per gate); a loader seam test (mutated IR throws LoadError carrying the diagnostic; warning-only IR loads); the ADR-276 D1 amendment note written in this phase's commit. Gates needing analyzer state stay in the analyzer and are reported, not forced.
- **Files**: `packages/chord/src/`, `packages/chord/tests/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/`, `docs/architecture/adrs/adr-276-chord-source-authoritative-errors.md`
- **Exit state**: Each moved analysis code appears exactly once in chord src; chord fixture diagnostics byte-identical to before; exit gate passes.
- **Demonstration**: chord suite green with new per-gate tests; compile diagnostics for chord fixtures diff clean; tree runs byte-identical; ADR-276 D1 note present.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: validateIR, grammar gates (D4b)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Grammar extension and removal gates (extend-target, removal-target, deadly-while-unsupported and kin per inventory).
- **Entry state**: Phase 4 committed; David's go.
- **Deliverable**: These gates moved into `validateIR` (analyzer and loader copies deleted, tests moved, one per gate). Grammar removal matched-no-live-rule (loader 1567) stays as a load-time fact.
- **Files**: `packages/chord/src/validate-ir.ts`, `packages/chord/src/analyzer.ts`, `packages/chord/tests/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/`
- **Exit state**: Exit gate passes; no moved gate remains in loader.
- **Demonstration**: per-gate chord tests green; fixture diagnostics unchanged; tree runs byte-identical.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 6: validateIR, use-gated construct gates and backstop closure (D4c)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Extension-gated constructs; closing AC-4.
- **Entry state**: Phase 5 committed; David's go.
- **Deliverable**: Remaining gates (including `analysis.unknown-extension` / gated-construct ones) moved; the ExtensionRegistration gatedConstruct slot and its loop deleted; `packages/story-loader/tests/adr-276-backstops.test.ts` removed; the three remaining backstops (2188, 1567, 3101) re-commented as load-time facts.
- **Files**: `packages/chord/src/`, `packages/story-loader/src/extension-registry.ts`, `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/`
- **Exit state**: All of AC-4 holds: `grep -rn "gatedConstruct" packages/story-loader/src` empty; `grep -ci backstop packages/story-loader/src/loader.ts` is 3; every moved code appears once in chord src.
- **Demonstration**: run the AC-4 greps and show the expected output; suites and tree runs gate.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 7: Core adjective table (D3)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Core trait adjective lowering; names-vs-mappings conformance. Satisfies AC-3.
- **Entry state**: Phase 6 committed; David's go.
- **Deliverable**: `CORE_TRAIT_ROUTES` replaces the 41-arm switch in `applyTraitAdjectives` (conditional-composition prelude stays the one guard); unmatched word is a LoadError naming the word; two bidirectional assertions added to `packages/story-loader/tests/manifest-conformance.test.ts` against chord's `TRAIT_ADJECTIVES` (NPC and combat words excluded). Deferred here from Phase 1 (David, 2026-10-31): the four route-table field writes that cast a trait through `unknown` (packages/story-loader/src/loader.ts near lines 2124, 2496 and 2569; packages/story-loader/src/runtime/dispatch-verbs.ts near line 91) become typed writes when a route is a function; AC-5's grep is re-run at this phase's close and must then print nothing.
- **Files**: `packages/story-loader/src/loader.ts`, `packages/story-loader/src/extension-registry.ts`, `packages/story-loader/tests/manifest-conformance.test.ts`
- **Exit state**: AC-3 holds; exit gate passes.
- **Demonstration**: conformance test green both directions; a deliberately missing row fails by word name (shown then reverted); tree runs byte-identical.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 8: World build steps, entity family (D2a)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: `WORLD_BUILD_STEPS` scaffold; `BuildContext`; entity construction and wiring.
- **Entry state**: Phase 7 committed; David's go.
- **Deliverable**: `packages/story-loader/src/build/` (new) with the step-list module (entries with `requires`, copying `RUNTIME_BIND_STEPS`) and the entity step family (`buildEntity`, `wireEntity`, `wireExit`, adjective lowering and `CORE_TRAIT_ROUTES`) moved verbatim, this.X retargeted to the context; order-pin test faulting a reordered copy by name; `ChordStory` facade unchanged.
- **Files**: `packages/story-loader/src/build/` (new), `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/`
- **Exit state**: Entity steps live under `packages/story-loader/src/build/` with rule-9 headers; exit gate passes; AC-7 build of dependents.
- **Demonstration**: order-pin test green and faulting on swap; tree runs byte-identical; dependents build.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 9: World build steps, grammar and remaining stages (D2b)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Remaining `initializeWorld` stages and grammar extension.
- **Entry state**: Phase 8 committed; David's go.
- **Deliverable**: `src/build/grammar.ts` (new) holding `extendParser` and `registerPassageGrammar`; remaining world stages (extension registerWorld, exit admittance, door check, story state/counters/scores/ranks, removal observer, detail channels, location names, pending refs, runtime bind, cuttable check, start block and role holder) one module each; `initializeWorld` becomes a loop over `WORLD_BUILD_STEPS`.
- **Files**: `packages/story-loader/src/build/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/tests/`
- **Exit state**: World build is fully data-listed; exit gate passes.
- **Demonstration**: order test green; tree runs byte-identical; suites at or above baseline.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 10: Engine-ready steps, restore, and final acceptance sweep (D2c)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `ENGINE_READY_STEPS`; restore reconciliation; AC-1..AC-7 close-out.
- **Entry state**: Phase 9 committed; David's go.
- **Deliverable**: `onEngineReady` stages (NPC service, character phase, state machines, extensions, scheduler, deadly exits, present entries) as `ENGINE_READY_STEPS` modules; `onWorldRestored`/`reconcileRestoredWorld` moved beside `packages/story-loader/src/reconcile.ts`; `packages/story-loader/src/loader.ts` holds `ChordStory`, its context, and no step bodies; final sweep running every AC grep and the genai-api check for removed public members; plan marked DONE and archived via plan-archive.sh.
- **Files**: `packages/story-loader/src/build/`, `packages/story-loader/src/loader.ts`, `packages/story-loader/src/reconcile.ts`, `packages/story-loader/tests/`
- **Exit state**: AC-1..AC-7 all hold with evidence inline; issue #638 updated.
- **Demonstration**: each AC grep/test shown with output; `./repokit build` of bootstrap, devkit, branch-tester, transcript-tester, platform-browser clean; final tree runs byte-identical to Phase 0 baseline.
- **Demonstrated**: 
- **Status**: PENDING
