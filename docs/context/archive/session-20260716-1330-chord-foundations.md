# Session Summary: 2026-07-16 13:30 — chord-foundations (session 3ed9fb)

## Goals
- Start D0 option B (shared stdlib interceptor lifecycle engine): collect David's rulings on D1–D8, write the ADR, plan the implementation.

## Key decisions
- David ruled on all forks from `docs/work/adr-118-hook-audit/decisions.md` (all recommendations accepted):
  - **D0 = B** — shared lifecycle engine in stdlib + per-action declarative descriptors.
  - **D1 = A** — veto-only guard semantics; C's explicit force marker reserved in the ADR, unimplemented.
  - **D2 = C** — onBlocked returns structured `{ override?, emit? }`, symmetric with postReport.
  - **D3 = B** — all command entities consulted, fixed published order, first veto wins; item-side putting hooks get container in sharedData.
  - **D4 = A** — per-item full lifecycle via shared multi-object helper; upstream expansion (B) noted as out of scope.
  - **D5 = A** — Chord loader fail-fast against a stdlib-exported wired-action registry derived from the descriptor table.
  - **D6 = B** — removing consults removing+taking ids; inserting consults inserting then putting; both-ids-fire rule stated in ADR.
  - **D7 + D8** — both included (path-skip repairs + Chord `while`-gate lowering fix).
  - Rulings recorded in a **new ADR** (ADR-228), ADR-118 marked refined-by.

## Work log
- Pre-session audit: all clear (typecheck green, no blockers, prior sessions COMPLETE).
- Rulings collected via structured Q&A (2026-07-16).
- ADR-228 written: `docs/architecture/adrs/adr-228-interceptor-lifecycle-engine.md`.
- Plan written by session-planner: `docs/work/interceptor-lifecycle-engine/plan.md` (7 phases; plan-review clean after one fix). David prefaced it with the design-stance statement (Sharpee↔Chord alignment, no shortcuts/hacks).

## Phase 1 (COMPLETE): lifecycle engine + D2 signature + pinning tests
- **world-model**: `InterceptorBlockedResult` `{override?, emit?}` added; `ActionInterceptor.onBlocked` signature changed; `applyInterceptorBlockedResult` helper added; both apply helpers gained optional `{searchFrom}` for D4 per-item override targeting (`packages/world-model/src/capabilities/action-interceptor.ts`).
- **stdlib**: new `packages/stdlib/src/actions/lifecycle/` — `descriptor.ts` (ActionLifecycleDescriptor, EntitySlotSpec incl. both-ids D6 + seedData D3 sub-ruling, LifecycleContracts w/ postExecuteReplacesCore), `lifecycle-engine.ts` (resolveLifecycle + 5 hook runners; D1 veto-only, D3 first-veto-wins order + sharedData isolation, single-override hard error), `multi-object-lifecycle.ts` (D4 per-item lifecycle). Exported via actions barrel.
- **14 stdlib call sites** migrated to structured onBlocked via 3 parallel agents (standard blocked event now always emitted; ex-replace actions restructured). Notables: eating/examining/reading/entering/pushing/attacking use success-event-type with `blocked:true` (no dedicated *_blocked type); going has two consumptions (destination ADR-126 then source) with precedence preserved; entering/pushing/putting lack the dot-check messageId passthrough (pre-existing, left as-is).
- **4 Dungeo interceptors** migrated: melee + glacier → `override` (ex-replace, same rendered text); sphere-taking → `emit` (append preserved exactly); gas-room → `override` + death event via `emit` without messageId (sphere pattern).
- **Pinning tests**: `packages/stdlib/tests/unit/actions/lifecycle-engine.test.ts` — 19 tests (17 first pass + 2 from mutation-verification findings: postValidate veto in multi-object path, slotOverride-doesn't-store invariant); plus new `packages/world-model/tests/unit/capabilities/interceptor-blocked-result.test.ts` (8 tests: override/emit/no-op, missing-event warn, searchFrom for both apply helpers). Mutation-verification: everything else GREEN.
- **Verification**: stdlib suite 1366 passed; `./repokit build dungeo` green (after fixing one missed import in glacier interceptor); 7 affected transcripts (cage, gas-room ×2, glacier ×2, troll-recovery, troll-blocking) one good run, 86 passed.

## Flags for David
- **Pre-existing world-model test failures — FIXED on David's instruction**: 22 darkness/light failures were stale tests still using the removed `RoomTrait.isDark` field (renamed `requiresLight` in 3b568abf's refactor; behavior checks go through `VisibilityBehavior.isDark(room, world)`). Renamed the field in 5 test files (room, visibility-behavior, darkness-light scope, visibility-chains, trait-combinations); `VisibilityBehavior.isDark(...)` method calls untouched. World-model suite now fully green: 73 files, 1362 passed.
- Troll transcripts can flake when troll combat RNG kills the player mid-transcript (game.lost → "Engine is not running" for remaining commands) — known combat-RNG flake class, observed ~1-in-5 on troll-blocking, unrelated to this diff.

## Phase 2 (COMPLETE): group A migrated onto the engine
- All 7 actions (taking, dropping, eating, examining, reading, closing, opening) now declare an exported `<name>Lifecycle` descriptor and call the engine at their four phase boundaries; zero hand-rolled hook code remains (grep-verified).
- taking + dropping multi-object paths run the full per-item D4 lifecycle (take-all gains onBlocked per failed item; drop-all's total hook bypass closed). dropping's guard semantics changed short-circuit→veto-only (ADR-blessed D1 fix).
- D7.5 folded in: reading's hardcoded action id → IFActions.READING; examining/reading literal lookup strings gone (descriptors own ids); `_interceptor` vs `interceptor` sharedData split deleted entirely; opening's dead local removed.
- Types cleanup: TakingItemResult/DroppingItemResult → slim ItemScratch interfaces; interceptor fields removed from all shared-data types.
- **Incident**: API 529 overload killed all three migration subagents (multiple resume attempts failed) — taking was already done inline; the remaining six were migrated inline in the main session.
- Verification: stdlib suite 1368 green (no test churn needed — nothing pinned old semantics); `./repokit build dungeo` green; transcripts pass (rug-trapdoor 14, troll-blocking, cage-puzzle, drop-all-empty, take-all-filter, implicit-take ×2); white-hot axe verified flowing through the engine (blocked event carries dungeo.troll.axe.white_hot); **walkthrough chain 876/876 first run**. troll-visibility flakes remain the known combat-RNG death class.
- Mutation-verification follow-up: dropping had zero interceptor-lifecycle tests — added 3 (single-object veto+onBlocked with state assertion, postExecute/postReport override, drop-all per-item hooks mirroring taking's D4 test). Noted pre-existing gap (not from this phase): taking's awardScore has no unit test anywhere.

## Phase 3 (COMPLETE): group B migrated — second-entity gaps closed, live trophy-case bug fixed
- All 14 wired actions now run through the engine; zero hand-rolled hook code anywhere in stdlib (grep-verified + typecheck clean).
- **putting**: item + container slots (D3 sub-ruling: symmetric seedData); multi-object via D4 helpers — **live trophy-case bug fixed and proven** by new `tests/transcripts/trophy-case-put-all.transcript` ("put all in case" → score 7 = egg 5 + canary 2, end-to-end). Engine extension: `seedData(ctx, entity, multiObjectItem?)` so shared slots seed per-item context in D4 loops.
- **going**: source (GOING) + destination (ENTERING_ROOM, ADR-126) + door (GOING — the dead surface) slots via implicit-entity resolvers; D7.1 dark-path fix (postReport hooks before the early return); blockedBy precedence split replaced by all-consultations + single-override arbitration. Ordering note: destination-entry preValidate now precedes standard door checks (canonical chain).
- **attacking**: target + weapon slots (weapon = the audit's dead surface; explicit weapons only — inferred weapons aren't command entities, documented); postExecute-replaces-combat now a declared descriptor contract (`contracts.postExecuteReplacesCore`), action seeds combat context onto the target consultation and reads attackResult back; D7.3 hooks unconditional across combatant/non-combatant branches and on failed non-combat attacks (which also no longer drop implicit-take events).
- **throwing**: single-winner retired — item AND target slots both fire, published order item-first (D3-B); both seeded with full item/target context; D7.2 capability path runs hooks after the behavior instead of returning early. One test updated: throwing-item-interceptor.test.ts pinned the old single-winner rule, now pins both-fire.
- **entering/pushing/switching_on**: migrated by agent (clean run this time); pushing's targetId/targetName hook-context seed restored via seedData after the agent dropped it (out-of-repo authors may rely on it).
- Verification: stdlib 1371 green; `./repokit build dungeo` green; transcripts pass (gas-room ×2, glacier ×2, troll-blocking, rug-trapdoor, troll-combat, trophy-case-put-all 8/8); **walkthrough chain 869/869 first run**.

## Phase 4 (COMPLETE): nine high-plausibility unwired actions declared
- drinking, pulling, touching, switching_off, searching, unlocking, locking, wearing, taking_off — all wired via exported descriptors + engine calls (3 parallel agents, clean runs). switching_on/off asymmetry closed (mirror wiring). 36 new interceptor pinning tests (4 per action, all state-asserting).
- Notables: searching's no-target path folded to a single validate exit (behavior identical); unlocking/locking are single-slot — the KEY is deliberately not a slot yet; taking_off wired around its execute-phase ad-hoc refusals (checkRemovalBlockers/hasRemovalRestrictions) — **OPEN QUESTION for David: fold those refusals into validate/interceptor surface, or leave as trait-driven execute checks?**
- Phase-3 mutation-verification gaps closed in the same pass (5 tests): putting multi-object container hooks through the real action, engine seedData 3-arg pin, going dark-path postReport (D7.1 regression guard), attacking postExecuteReplacesCore + weapon slot + violence_not_the_answer, throwing capability-then-hooks order (D7.2). attacking/index.ts barrel now re-exports attackingLifecycle.
- Grep confirmed no story registers interceptors under the nine newly-wired ids (nothing silently changes); thealderman's if.action.searching hit is a grammar alias only.
- Verification: stdlib 1415 green (89 files); `./repokit build dungeo` green; **walkthrough chain 876/876 first run**.

## Phase 5 (COMPLETE): 33/33 actions covered — D6 seams closed, troll-talking fixed end-to-end
- Final 10 wired: climbing, smelling, listening, hiding, giving, showing, talking (agents); removing, inserting, exiting (inline). 24 new agent pinning tests + 9 inline (removing/inserting/exiting interceptor test files).
- **D6-B removing**: item consulted under removing+taking ids (specific first) — TrollAxe REMOVE-FROM bypass pinned closed (guard blocks REMOVE FROM; remove-all leaves guarded item, takes rest). Source container consulted under removing per D3.
- **D6-B inserting**: consults inserting-id on outer command, then delegates into putting (putting-id hooks fire inside delegation); order pinned: inserting.preValidate → putting.preValidate → putting.postExecute → inserting.postExecute. Both-ids rule documented in stdlib CLAUDE.md.
- **exiting**: implicit current-container resolver (EXIT takes no noun); `on exiting it` on cage/boat/bed live.
- **giving/showing**: two-slot symmetric descriptors; giving's item-side validate limitation documented in descriptor (declared, not silently omitted); giving runs hooks on both standard and ADR-090 capability paths.
- **talking (live bug)**: TrollTalkingInterceptor (preValidate veto when troll incapacitated) now fires. Agent added the dot-check passthrough to talking's blocked() so the canon id renders. **Discovery: core grammar has NO talk pattern** — if.action.talking was player-unreachable in every story without custom grammar (why the bespoke talk_to_troll action exists). Story-level fix: Dungeo speech-grammar gains `talk to :target`/`speak to :target` → if.action.talking (troll literals at 200 still win). New `troll-talking.transcript` 8/8 proves the canon line via the interceptor ("speak to troll" while KO'd).
- Verification: stdlib 1455 green (99 files); build green; interceptor transcripts + trophy-case pass; **walkthrough chain 885/885 first run**.

## Open questions for David (accumulated)
1. taking_off's execute-phase ad-hoc refusals — fold into validate/interceptor surface or leave? (Recommend leave; separate decision.)
2. unlocking/locking: KEY as a consultable slot — later declaration if wanted.
3. **parser-en-us: core grammar lacks a `talk to :target` pattern** — talking exists in stdlib+lang verbs but no pattern reaches it; stories must define their own. Platform fix needs discussion.
4. Dungeo's talk_to_troll story action is now redundant for its 3 literal phrasings (the interceptor covers all phrasings incl. the alive-troll passthrough — but the story action also carries the alive-troll GROWLS flavor the stdlib passthrough lacks). Consolidation is a canon decision — not touched.

## Status: IN PROGRESS — Phases 1-5 complete, awaiting go for Phase 6 (D5 registry export + Chord loader fail-fast)
