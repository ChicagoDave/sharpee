# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE — Phases 10.3 and 10.4 DONE (plan updated with evidence); committed and pushed this session (finalize). Next: Phase 10.5 (parser-en-us continuation prompts) awaiting David's confirmation.

## Goals
- ADR-320 Phase 10.3: `packages/character` thread runtime (activation,
  switch, park, resume, conclude, beat advance), #273 seize-runner fix,
  ContinuationEntry retirement. David confirmed phase start ("proceed
  with Phase 10.3").
- ADR-320 Phase 10.4: story-loader + stdlib — thread registration,
  dispatch precedence, transition enforcement, tick-side owner floor
  turns, affordance snapshot. David confirmed ("start").

## Phase 10.4 — DONE (this session)
- **D15 select step 1.5** (`serveThreadDispatch`/`serveThreadAdvance`,
  story-loader): on-filter ask/tell (and TALK TO) advances the active
  thread one beat and serves the body as the reply; conclusion serves
  past the last beat (status CONCLUDED, both-sides discussed records);
  blocking off-topic asks serve `on refusing:` first / re-serve the
  current beat second; assertive off-topic asks with authored
  `on parting` spend the turn on the protest and park; parked threads
  resume on their filter (`on resuming` as the reply when authored);
  unopened threads activate (scene opened when none). Asked-count
  bookkeeping preserved for thread-gripped firings.
- **Transition-turn resolution** (D14 table × one-line-per-firing
  delivery freeze — flagged for David's review): passive parks in the
  same firing and the other topic serves that turn (authored parting
  line rides the D12 wire utterance + author channel, not the terminal
  reply); assertive protest consumes the turn (parting body IS the
  reply), other topic serves from the next ask; blocking walls until
  conclusion. Assertive with no `on parting` parks like passive.
- **stdlib thread grip**: `threadClaims` probe on the selector
  registration (world-model type), `threadGrips`/`markThreadGripped`/
  `isThreadGripped` helpers, wired into asking/telling/talking's
  validate chain and lifecycle skip sites — thread-gripped firings skip
  the topic arm (no table bookkeeping), precedence: open exchange >
  active thread > parked resume > topic table.
- **Topic-arm park hook** (postValidate): a table row serving while the
  pair's thread is active parks it (passive path) — parting effects
  exec'd, `character.thread.parting` + wire utterance + thread-parked
  staged to sharedData, emitted in postReport.
- **Tick step 4a — owner floor turns** (`buildThreadTurn`/
  `buildThreadTurnReady` in loader, consumed via SceneBindingOptions →
  SceneRuntimeBinding): the co-located owner takes one thread turn —
  `opens when` opens the scene itself and speaks beat 1, parked resumes
  serve `on resuming`, active threads advance one beat per turn cycle
  (per-pair cycle-key guard prevents doubling a dispatch advance; the
  clock's mirror+1 asymmetry made lastBeatTurn alone ambiguous).
  `deliverSeizureBody` refactored out of buildInitiativeSeizure and
  shared — `then asks` in beat bodies rides `openExchange` (the #273
  mechanism).
- **Scene-close parking** (`parkActiveThreadsOnClose`, called by
  closeScene): a close parks every active thread between participants —
  the next engagement resumes via `on resuming` (D14 persistence).
- **Continuability snapshot**: `threadContinuability` on
  ConversationSceneState (world-model), written by scene-runtime's
  `stampThreadContinuability`, stamped at open/beat/resume, cleared at
  park/conclude — the ExchangeState.responses discipline; Phase 10.6
  projects it to channels.
- **Registration**: loader registers threadTurn/threadTurnReady hooks
  only when a `define conversation` block exists (D2 cost leg).
- **Mutation-verification gaps closed (rule 14)**: 3 flagged, 3 tests
  added — tick-driven `then asks` beat opens its exchange end-to-end;
  tick-path opens-when resume via `on resuming:`; TELL activates/
  advances/refuses and TALK TO advances (the asking grip wiring,
  mirrored). All pass; story-loader suite now 549.
- **Evidence (all run 2026-08-17)**: 13 real-path tests
  (adr-320-phase10-threads.test.ts) — activation→conclusion +
  `is concluded` false-before/true-after through real dispatch, blocking
  authored-first/repeat-second with occurrence-key assertion, passive
  park+resume, assertive protest, tick advance with same-cycle guard,
  opens-when self-open with live continuability, held-beat scene-decay
  park, exchange-precedence hold/release. Suites: character 563,
  story-loader 549, stdlib 1633, world-model 1492 passing; repo-wide
  tsc clean; bundle rebuilt; ides-of-march 132 unit + 34 walkthrough,
  thealderman 75, Dungeo chain 952 — all baselines byte-clean.
- **Story direction (David, mid-session)**: topic tables should carry
  irrelevant/humorous rows; the Phase 10.7 rework must show a FULL
  story with depth of character and dialogue (recorded in the
  ides-of-march content-authority memory; test fixture gained "the
  price of eels").

## Completed
- **Thread runtime** (`packages/character/src/conversation/thread-runtime.ts`,
  new, mirrors scene-runtime.ts): reads (`threadStateFor`,
  `activeThreadFor`), the pure D14 transition table
  (`resolveThreadTransition`: passive→parks, assertive→protests-then-parks,
  blocking→refuses), mutations (`openThread`, `resumeThread`, `parkThread`,
  `advanceThreadBeat`, `concludeThread`) writing real
  `CharacterModelTrait.conversationThreads` state (Phase 10.2 home) with
  at-most-one-ACTIVE-per-pair loud-fail enforcement, the floor-machinery
  consumable (`readyThreadMove` — advance/resume/open, what 10.4's
  dispatch turns into a forcing bid), and the D12 affordance projection
  (`threadContinuabilityFor`). Advance holds on an open exchange (a
  `then asks` beat waits) and on an unmet `beat, when` gate; the advance
  past the last beat serves the conclusion — status CONCLUDED (the exact
  trait read the story-loader `concluded` evaluator performs) and every
  `about` topic candidate recorded discussed on BOTH sides' memory.
  Serving beat bodies stays the loader's (Phase 10.4).
- **#273 fix**: `InitiativeSeizure` gains `openExchange`/`openWord`
  (world-model binding type); story-loader's `buildInitiativeSeizure`
  extracts `then-open` from initiative row bodies (no longer reaches the
  loud-fail statement walker) and returns the built `ExchangeState`;
  tick-phases' scenes sub-step applies it via `applySeizedExchange` —
  only against a scene that includes the player; an NPC↔NPC seizure
  drops the open silently. No throw, no per-turn wedge.
- **ContinuationEntry retired** (lifecycle.ts): `ContinuationEntry`,
  `ConversationContext.continuations`, `scheduleAfter`,
  `getContinuationMessage` deleted; supersession note in the module
  header points at thread-runtime.ts / ADR-320 D14; barrels and
  lifecycle tests updated.
- **Tests** (all asserting on real trait/store state): 20 new
  thread-runtime tests; 2 tick-side #273 cases (player scene opens the
  exchange on real store state; NPC↔NPC drops it); 1 real-path loader
  case (compiled `then asks` initiative row seizes, exchange open on the
  scene, next tick clean). Runs 2026-08-17: character 561 passing,
  story-loader 536 passing, world-model 1492 passing, repo-wide
  `npx tsc --noEmit` clean.

## Key Decisions
- Beat bodies are returned, not executed — the runtime owns cursor/status
  mutations and wire; statement execution stays in the loader (10.4).
- `opens when` on a parked thread resumes it; concluded threads never
  re-engage (terminal per D14).
- An active-but-held thread claims no other move in `readyThreadMove`
  (an opens-when candidate cannot jump a held active thread).
- NPC↔NPC seizure with `then asks`: dropped silently (an exchange
  targets the player) — the row's phrase still serves; per #273's design
  answer the occasion stays servable in player scenes.

## Open Items
- Hit the recorded tsf dist-esm staleness trap: story-loader's real-path
  test read stale @sharpee/character dist-esm; `npx tsf build --target
  esm` resolved it (memory note confirmed again).
- #273 can be closed on GitHub once this lands (regression tests in
  place); #274/#275 untouched.
- Next: Phase 10.4 (story-loader + stdlib registration, dispatch
  precedence, evaluator serving) — needs David's platform confirmation.
  Note: the `is concluded` evaluator case already landed last session.

## Files Modified
Phase 10.4 additions:
- packages/story-loader/src/runtime.ts (serveThreadDispatch/serveThreadAdvance,
  threadClaims probe, buildThreadTurn/buildThreadTurnReady,
  deliverSeizureBody refactor, topic-arm park hook, select step 1.5)
- packages/story-loader/src/loader.ts (conditional thread hook registration)
- packages/story-loader/tests/adr-320-phase10-threads.test.ts (new, 13 tests)
- packages/stdlib/src/actions/helpers/dialogue-selector.ts (threadGrips,
  markThreadGripped/isThreadGripped)
- packages/stdlib/src/actions/standard/{asking,telling,talking}/*.ts (grip chain)
- packages/world-model/src/capabilities/dialogue-selector-binding.ts
  (threadClaims), scene-runtime-binding.ts (threadTurn/threadTurnReady),
  traits/character-model/conversation-scene.ts (threadContinuability)
- packages/character/src/tick-phases.ts (step 4a thread floor turns)
- packages/character/src/conversation/scene-runtime.ts
  (stampThreadContinuability, close-parking), thread-runtime.ts
  (parkActiveThreadsOnClose), scene-binding.ts (hook pass-throughs)

Phase 10.3:
- packages/character/src/conversation/thread-runtime.ts (new)
- packages/character/src/conversation/lifecycle.ts (retirement)
- packages/character/src/conversation/index.ts, src/index.ts (barrels)
- packages/character/src/tick-phases.ts (applySeizedExchange)
- packages/world-model/src/capabilities/scene-runtime-binding.ts
  (InitiativeSeizure.openExchange/openWord)
- packages/story-loader/src/runtime.ts (buildInitiativeSeizure #273)
- packages/character/tests/conversation/thread-runtime.test.ts (new)
- packages/character/tests/conversation/lifecycle.test.ts (retired cases)
- packages/character/tests/tick-phases/scene-sub-step.test.ts (#273 x2)
- packages/story-loader/tests/adr-320-phase8.test.ts (#273 real-path)
- docs/work/adr-320-conversation/plan.md (10.3 → CURRENT)

## Notes
- Session started: 2026-08-17 18:37 (session 590dbd)
