# Session Summary: 2026-07-16 04:02 — chord-foundations (session accf8b)

## Goals
- Implement **Phase 1** of `docs/work/death-triggers/plan.md` (ADR-227): Falls south-only deadly exit + Grue seeded RNG.

## Key decisions (David, this session)
- **Mechanism amendment settled**: movement-context hazards use the **ParsedCommandTransformer** surface — not Action Interceptor (one-per-(entity,action), destination-resolved so it can't fire for graph-absent exits), and not a scheduler daemon (no command context → can't preserve canon attempt-based grue semantics; post-turn output ordering wrong). Grue stays a transformer (only fix: seeded RNG); falls stays a transformer (fix: south-only).
- **Grounding that settled it**: `SchedulerContext` = `{world, turn, random, playerLocation, playerId}` (no command); stdlib `deadly-room-transformer.ts` is the platform precedent (extras-driven redirect + injected `rng?: SeededRandom`); `SchedulerService.getRandom()` is public and persisted across save/restore; Aragain Falls has `exits: {}` (no south exit in graph → interceptor unimplementable).
- **Chord Phase-4 impact validated**: `kill the player` unchanged; `deadly:` marker stronger (pure trait attach — engine auto-registers the deadly-room transformer); `<direction> is deadly:` MUST lower to a story-loader-registered ParsedCommandTransformer → generic `DEADLY_ROOM_DEATH_ACTION_ID` (the plan's interceptor lowering was latent-broken for graph-absent exits).
- **David approved**: retire `actions/falls-death/falls-death-action.ts` (byte-for-byte twin of platform `deadlyRoomDeathAction`); falls redirects to the generic action with extras.

## Work log
- **ADR-227 amended** (Decision-2 table + amendment paragraph; Decision-4 `<direction> is deadly:` bullet): movement-context hazards → ParsedCommandTransformer; grue row split out; gas/sphere stay interceptors ("resolving on a real entity").
- **Plan amended** (`docs/work/death-triggers/plan.md`): Phase 1 rewritten (transformer, retire falls-death action); Phase 4 `<direction> is deadly:` lowering → loader-registered transformer to `DEADLY_ROOM_DEATH_ACTION_ID`; key-domain-language, ADR-118/208 reference, and advisory (1) re-grounded.
- **Falls implemented**: `falls-death-handler.ts` rewritten — `isDeadlyExit` (going SOUTH/S only) → redirect to generic `DEADLY_ROOM_DEATH_ACTION_ID` with `{cause:'aragain_falls', messageId:'dungeo.falls.death'}` extras. `actions/falls-death/` deleted (David-approved); `actions/index.ts` + `src/index.ts` cleaned. NOTE: falls DOES have a north exit (`setExits` frigid-river.ts:270) — the graph-absent claim holds for SOUTH specifically.
- **Grue implemented**: `createGrueDeathTransformer(rng: SeededRandom)`; `survivalRoll(rng)` = `rng.chance(0.25)`; zero `Math.random()`. Wiring: `SchedulerPlugin` created before transformers in `orchestration/index.ts`; `TransformerConfig.rng = schedulerPlugin.getScheduler().getRandom()` (persisted seed).
- **Tests**: new `tests/transcripts/falls-deadly-exit.transcript` (10/10 — EVENT-false player.died on wait/inventory/take/north; south kills, `cause="aragain_falls"`); new `src/handlers/grue-handler.test.ts` (9/9 — fixed-seed determinism, all four attempt outcomes, blocked-door slithered, GDT immortality, non-going passthrough). Dungeo vitest 17/17. Regressions green: grue×2, gas×2, melt, wave-rainbow.
- **Full unit suite**: failing set swings 28→10→5 across runs, all troll/combat/thief-RNG (pre-existing terminal-death flakes; Phase-5 decision pending). No stable failures.
- **Surfaced, not fixed**: stale comment `frigid-river.ts:237` claims "DOWN leads to death — handled by falls-death-handler" at FR5, but nothing implements the boat-over-falls death (pre-existing canon gap; raised to David).

## Phase 2 (cake → interceptors + stdlib seam-fixes) — COMPLETE
- **Design flip (David-approved after Chord-seam grounding)**: cake = Action Interceptor, NOT Capability Dispatch. Decisive fact: the live Chord loader routes entity `on <action> it` clauses on standard verbs to `world.registerActionInterceptor` (`story-loader/runtime.ts:148-154`); capability = `chord.action.*` dispatch verbs only (§5.4). ADR-227 cake row + Consequences amended (Q-2 premise corrected).
- **Two stdlib seam-fixes (David-approved — both closed silently-dead Chord seams)**: (1) `eating.ts` had NO ADR-118 hooks → wired (taking.ts pattern: pre/postValidate veto, postExecute, postReport via `applyInterceptorReportResult`, onBlocked); (2) `throwing.ts` resolved interceptors on target only → now falls back to the thrown ITEM (target-keyed wins; `sharedData.interceptorEntity` carries the keyed entity; capability hook at :317 untouched — throw-at-troll unchanged).
- **Story re-home**: `traits/cake-trait.ts` (CakeTrait{cakeType}); `cake-handler.ts` rewritten to `CakeEatingInterceptor` + `CakeThrowingInterceptor` (postExecute mutates: teleport+moveRoomContents / killPlayer / pool dissolve; postReport emits cake_effect + PLAYER_DIED_EVENT effects — gas-interceptor precedent); `registerCakeInterceptors` replaces both chainEvent registrations (scheduler-setup.ts); 4 cakes get the trait (well-room.ts, `attributes.cakeType` removed); traits barrel updated.
- **Also fixed**: 11 pre-existing stdlib test failures from the committed `isDark→requiresLight` refactor (fixture constructor keys in sensory-extensions/perception-service/looking-golden; event-payload `isDark` assertions kept).
- **Verified**: stdlib typecheck + full suite 1349 green (7 new seam tests); dungeo vitest 29 green (9 new cake, asserting HealthTrait/location/pool mutations); cake narration byte-identical (verbose diff incl. implicit-take + taste lines); new transcripts cake-orange-explosion + cake-red-pool-dissolve green; cake-mechanics/eat-cake-quick green; melt verify-only confirmed (`melt-action.ts:106`); build clean. Full-suite residuals = troll combat-RNG cascades (verified: "troll puts you to death" → game.ended → engine-not-running; pre-existing).
- **Phase-1 follow-up closed (mutation-verification)**: added `deadly-room-death.test.ts` (stdlib, tests-only) + `grue-death-action.test.ts` (story) — execute-level HealthTrait assertions.
- **Parked**: one-shot audit "which stdlib actions still lack ADR-118 hooks vs. what Chord routes to interceptors" (Phase-5/follow-up candidate, raised to David).

## Phase 3 (basicNpcResolver → killPlayer) — COMPLETE
- `basic-npc-resolver.ts`: player-kill branch routes through `killPlayer({cause:'combat', messageId:'combat.player_died', terminal:true})`; NPC-target branch keeps generic `if.event.death` unchanged.
- **Ordering trap found + pinned by test**: `applyCombatResult` flips `HealthTrait.dead` itself (`combat-service.ts:317`) — `killPlayer` called after it would hit the already-dead idempotence guard and emit NOTHING. Fix: `killPlayer` runs before `applyCombatResult` (which then re-kills idempotently).
- Verified: typecheck + 25/25 package tests (2 new, state-layer assertions); grep-gate clean; full rebuild clean; dungeo death transcripts green (dungeo uses its own melee — only in-repo resolver consumer is devkit's basic-story fixture).

## Phase 4 (three Chord death constructs) — COMPLETE
- **`kill the player [<key>] [when <cond>]`**: STATEMENT_OPENERS + parser case (requires literal `the player`, `parse.kill-statement` diagnostic), KillStmt AST, IR kill variant, analyzer case (phrase-key gate), runtime execStatements case — phraseEvent + `killPlayer(cause: phraseKey ?? 'killed', terminal:true)`; NOT triggerEnding (engine routes off the canonical event).
- **`<direction> is deadly [while <cond>]: <phrase>`**: parseDeadlyExit (mirrors blocked-exit grammar), DeadlyExitDecl/IRDeadlyExit, analyzer mapping; loader collects `{roomWorldId → DIRECTION → {cause,messageId}}` and onEngineReady registers ONE `engine.registerParsedCommandTransformer` (structural probe, registerSlotEntry precedent) redirecting to `DEADLY_ROOM_DEATH_ACTION_ID` with extras — the exact seam Dungeo falls uses (AC-1/AC-3 parity by construction). Conditional form parses + carries IR but loader fail-fasts (role-clause "not wired yet" precedent).
- **`deadly: <phrase>`**: create-body property line (NOT a TRAIT_ADJECTIVES entry — composition grammar has no colon-config form; ADR surface unchanged) → `DeadlyRoomTrait{cause: phraseKey, messageId: phraseKey}`, AC-3 default safeVerbs look/examine (ADR contract wins over the plan's fail-fast advisory). Engine auto-registers the deadly-room transformer — zero loader runtime code.
- **Derivation rule (all three)**: cause = phrase key ('killed' when bare); phrase carries the death text; died event omits messageId (no double-render).
- **Tests**: chord 239 green (13 new parser-death tests incl. all error diagnostics; golden snapshots regenerated — diff verified additive-only deadly fields); story-loader 139 green (8 new death-constructs tests over new `chord/tests/fixtures/death.story`: trait attach, transformer redirect + abbreviations + pass-throughs + no-registration-when-unused, HealthTrait mutations, when-gating); full rebuild clean; dungeo smoke green.
- **Also repaired**: 3 more pre-existing `isDark`→`requiresLight` assertion failures (story-loader loader/runtime dark-while tests) — same class as the stdlib fixture repairs.

## Phase 5 (capstone verification) — COMPLETE (one open decision)
- **Sites verified zero-churn**: all 10 untouched death sites still `killPlayer`; penalty machine untouched.
- **Grep-gates clean**: no dead-flags, no hand-emitted death events (machine hits = subscriptions), `Math.random` = grue doc comment + melee event-ID nonce only.
- **Veto ordering pinned**: falls transcript death turn asserts died → `dungeo.death.penalty` → `sm.transition alive→one_death` → `game.lost`.
- **AC-4 save/restore closed by construction**: cage/explosion countdowns in world state; maintenance/balloon in serialized `SchedulerState` (FuseState + randomSeed); RETRY restore machinery exercises it live. FOUND: `plugin-scheduler` has zero test files — parked follow-up.
- **Walkthrough chain: one clean run** (889/889 run 2; run 1 RNG cascade).
- **Unit suite**: failures confined to troll-combat/troll-blocking RNG cascades. **DECIDED (David): option (b)** — canon troll RNG stays; troll-family transcripts reclassified under the one-good-run rule (memory amended with the accepted-flake signature: melee kill → game.ended cascade; anything else in them is still a regression).
- ADR-227 AC-1..5 all verified (see plan Phase 5 as-built).

## Follow-ups parked (not blockers)
- ADR-118 hook audit: which other stdlib actions lack interceptor wiring vs. what Chord routes to interceptors (the eating/throwing silent-seam class).
- `plugin-scheduler` has no test suite.
- FR5 stale comment (`frigid-river.ts:237`): "DOWN leads to death" boat-over-falls death is unimplemented (pre-existing canon gap).
- Chord `is deadly while <cond>:` parses but loader fail-fasts (post-scope).
## Status: ALL 5 PHASES COMPLETE — ADR-227 fully implemented, all decisions resolved
