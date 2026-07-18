# Session Summary: 2026-07-16 15:00 — chord-foundations (session 2c43df)

## Goals
- Phase 6 of `docs/work/interceptor-lifecycle-engine/plan.md` (ADR-228): D5 registry export from the stdlib descriptor table + Chord story-loader fail-fast on unknown gerunds and lowering/raising.
- Then Phase 7 (D8 `while`-gate lowering fix) if time/context allows.

## Key decisions
- D5 valid-gerund surface at the loader: stdlib consulted set ∪ `action` hatch names (author-owned TS actions may consult their own id — loader can't see inside) ∪ dispatch `after` clauses (live via fireAfterClauses). Entity `on <dispatch-verb> it` (silently dead today) now a pointed LoadError ("move into a trait / use after"). Dispatch `after` clauses no longer register the dead interceptor at all.
- Registry lives at `stdlib/src/actions/lifecycle/registry.ts`, exported from the ACTIONS barrel not the lifecycle barrel (actions import the lifecycle barrel — cycle otherwise). Duplicate primary actionId throws at module load.

## Work log
- Pre-session audit: all clear; Phase 6 entry state confirmed (33 descriptors present, runtime.ts:166 fail-fast precedent, analyzer routing seam unchanged).
- Phase 6 implemented:
  - stdlib: `lifecycle/registry.ts` — 33-descriptor table + `interceptorConsultingActionIds` (union of slot actionIds; D6 both-ids + ADR-126 entering_room fall out mechanically). 5 pinning tests incl. fs-scan completeness gate (a 34th descriptor export not listed in the table fails the suite).
  - story-loader: `ChordRuntime.bind()` D5 fail-fast at both registration sites (entity + trait); `deadGerundError` with pointed lowering/raising message; entity on-dispatch pointed error; dispatch-after skips registration (fireAfterClauses owns it). 6 new tests (gerund-fail-fast.test.ts) with state assertions on chord.behavior marker presence/absence.
  - Safety scan pre-implementation: all .story gerunds in stories/ + story-loader tests verified live under the new rule (zoo dispatch clauses are trait-routed capability; `after feeding it` = fireAfterClauses; chord fixtures are analyzer-only).
- Verification: `./repokit build dungeo` green; stdlib 1460 green (100 files); story-loader 145/145; chord 239/239; zoo gate both legs green (5 atomic + wt-01..05 chain 37/37, score 85/85); cloak 9/9 transcripts green (81 batch + 2 AC-6 individually).

- Mutation-verification: clean (no RED/YELLOW) — registration-vs-skip asserted via the chord.behavior marker trait (traced to prepareOnClauseTarget as the faithful mutation signature); LoadError tests pin path-specific diagnostics; fs-scan gate independently reproduced.
- Plan updated: Phase 6 marked COMPLETE.

## Phase 7 (D8 `while`-gate lowering fix) — David said "Go"
- All three runtime.ts lowering sites fixed: gate evaluated at the top of the validate-phase hook BEFORE findRefusal (false gate → chordSkip, whole clause sits out — refusals included); `, once` honored uniformly (entity-path semantics mirrored into both trait routes: preValidate peeks the counter so a consumed clause's refusal sits out; bump stays at validate time and is skipped on refusal); trait postExecute/postReport and capability execute/report now honor chordSkip. D8 evaluation-point comment ("once per firing, at validate time; pre/postValidate double-evaluation safe — no mutation between them") placed at each site per the ruling.
- Capability-route note for David: a while-false trait clause on a dispatch verb now validates `{valid:true}` and does nothing (ruled "sits out" semantics) — if the dispatch action has no body, the player gets a blank-ish turn rather than the `otherwise refuse` miss. Making a gated-out behavior fall through to the dispatch miss would be a new design decision, not part of D8.
- Pinning tests: tests/while-gate-d8.test.ts — 9 tests (entity/trait/capability × while-false + while-true-refusal; trait `, once` vs entity `, once` counters frozen at 1; capability `, once` with state reset between firings). All state-asserting.
- Verification: story-loader 154/154 (Cloak stumble suite in-suite regression green); `./repokit build dungeo` green; cloak 81 transcript tests green; zoo atomic (5 files) + wt-chain green.

- Phase-7 mutation-verification: clean — all three sites gate the `execStatements` mutation call itself (not just the report); once peek/store split verified consistent; every test pairs state assertions with report assertions.
- Plan updated: Phase 7 marked COMPLETE. **All 7 phases of the ADR-228 plan are now COMPLETE.**

## Open-questions rulings (post-finalize, same session)
- David ruled on all 5 accumulated open questions via structured Q&A (2026-07-16):
  1. taking_off/wearing execute-phase refusals → FOLD into validate (cursed probe kept, folded).
  2. KEY slot on locking/unlocking → ADD to both (explicit keys only, target → key, symmetric seedData).
  3. Core `talk to :target` grammar → ADD to parser-en-us (talk/speak/chat/converse, priority 100).
  4. Dungeo talk_to_troll → CONSOLIDATE onto TrollTalkingInterceptor (GROWLS postReport override when alive; bespoke action + 2 literals deleted; `hello troll` kept as grammar line).
  5. Dispatch `while`-false → FALL THROUGH to the dispatch miss (gated-out/once-consumed behaviors don't claim; `otherwise refuse` covers).
- Rulings recorded in **ADR-229** (`docs/architecture/adrs/adr-229-interceptor-surface-completion.md`), ACCEPTED, no open questions. Implementation not started — awaiting planning/go.

- adr-review on ADR-229: two fixes applied (R4's `hello troll` must be a `hello :target` slot pattern — talking requires a direct object; R2 gained explicit pinning-test requirements) → READY FOR IMPLEMENTATION 14/14.
- Plan written (same design-stance preface as the ADR-228 plan): `docs/work/interceptor-surface-completion/plan.md`, 4 phases (R1+R2 stdlib / R5 story-loader / R3 parser-en-us / R4 dungeo, R4 depends on R3); `.current-plan` pointer updated; plan-review clean.

## ADR-229 Phase 1 (R1+R2) — David said "Go"
- R1: taking_off's layering-blocker + cursed-probe refusals and wearing's conflict refusal folded from execute() into validate() (after standard checks, before postValidate); failures now flow blocked() → onBlocked with identical error codes/messageIds; execute keeps only the behavior-result defensive net.
- R2: locking/unlocking descriptors gained the key slot (instrument ?? indirectObject, explicit keys only), order target → key, symmetric seedData both directions (putting's convention).
- Tests: +2 taking_off (folded refusals reach onBlocked, still-worn asserted), +1 wearing (still-unworn), +3 unlocking / +3 locking (key consulted target-first w/ seeded context both ways, key-side veto blocks w/ lock-state asserted, keyless command skips the slot).
- Verified: stdlib 1469 green; build green; grating-key + tiny-room-puzzle 40/40; walkthrough chain 913/913 first run; grep — no story registers lock/unlock interceptors.

- Phase-1 mutation-verification: clean — helpers confirmed pure reads (no mutation stranded behind a refusal); all new tests assert on WearableTrait.worn / LockableTrait.isLocked, not just events. Plan updated: Phase 1 COMPLETE.

## ADR-229 Phase 2 (R5) — David said "Go"
- buildDispatchAction.validate: candidate behaviors probed each with fresh sharedData; chordSkip'd candidates (false gate / consumed once — side-effect-free probes) don't claim; fall-through order next-trait → body → otherwise miss; real refusals still claim immediately; claiming candidate's sharedData (occurrence + decisions) is what's stored.
- Tests: while-gate-d8.test.ts capability block reworked to R5 (2 Phase-7 pins updated to the new ruled semantics — ADR-blessed churn) + 2 new fall-through tests (body, second-trait); 11/11.
- Fixture note: trait-declared states are one namespace per entity (analysis.state-collision) — fall-through second trait must be states-less ('perky').
- Verified: story-loader 156/156; build green; zoo atomic + wt-chain green (dispatch-heavy story unaffected); cloak green.

- P2 mutation-verification: GREEN, one finding (gated-probe tests didn't assert the skipped candidate's occurrence counter was never written) — closed by adding counter-undefined assertions to all three gated-probe tests; suite 156/156. Plan updated: Phase 2 COMPLETE.

## Borrowed-trait test sweep (David: "sweep it - I don't like it")
- All 23 stdlib test files that borrowed real traits (READABLE w/ empty text, dummy PUSHABLE) as interceptor registration keys now use dedicated inert markers `TEST_MARKER_TRAIT`/`SECOND_TEST_MARKER_TRAIT` (new in tests/test-utils). 4 parallel agents, per-file green; full stdlib suite 1469 green; no "Benign trait" remnants.
- Correctly left alone: ACTOR-keyed registrations on give/show recipients (semantically required, not borrows).
- Convention recorded in stdlib CLAUDE.md (never borrow a real trait as a registration key).

## ADR-229 Phase 3 (R3) — David said "go"; mid-phase fork ruled: "Delete the shunt"
- Four core talk patterns in parser-en-us grammar.ts (talk/speak to|with, chat/converse with → if.action.talking, 100). No hasTrait(ACTOR) — not_actor stays hook-visible in the action.
- **Discovery**: english-parser.ts's legacy "slot after literal 'with' → extras" shunt broke chat/converse and made the alternation forms work only by substring accident. Traced: superseded by ADR-080 .instrument() (melt/turn-bolt type their tool slots), zero remaining consumers (dig/push-key/inflate/light ignore their with-slots). Fork presented; David ruled DELETE. Amendment recorded in ADR-229 R3.
- One obsolete test updated (story-grammar multi-slot pinned the shunt; with-slot now positional → indirectObject).
- Verified: parser-en-us 252 green (+6 parse pins); build green; dig/inflate/melt/light/boat/troll-talking 104/104; dungeo walkthrough chain 890/890 first run.

## ADR-229 Phase 4 (R4) — proceeded autonomously per plan (story-level, Phase 3 landed)
- TrollTalkingInterceptor: postReport GROWLS override when conscious (canon moved to TrollCapabilityMessages.GROWLS; npc-messages registration follows). preValidate KO veto unchanged.
- Deleted: talk-to-troll action dir + barrel exports + customActions registration + index.ts imports + 2 talk-to literals + 2 priority-95 generic story patterns. Added: `hello :target` → if.action.talking (slot pattern per ADR amendment).
- troll-talking.transcript rewritten: conscious GROWLS first (1 combat turn exposure), then KO'd cant_hear_you via speak/talk/hello — 12/12.
- Verified: build green; troll family transcripts one-good-run (recovery/blocking/visibility flake at documented combat-RNG rate — clean runs achieved for each; 'attack :target with|using :weapon' confirmed .instrument()-typed, untouched by the shunt deletion); walkthrough chain 883/883 first run; zoo atomic+chain and cloak green post-parser-change.

## Status: ADR-229 COMPLETE — all four phases implemented and verified (R1-R5); uncommitted: Phases 1-4 + marker sweep + ADR-229 amendments. ADR-228 program remains pushed at b083796c.
