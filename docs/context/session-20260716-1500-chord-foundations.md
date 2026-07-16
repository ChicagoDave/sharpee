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

## Status: COMPLETE — ADR-228 implementation finished (Phases 1-7); uncommitted work from this session: Phases 6-7. Open questions for David unchanged from session 3ed9fb (taking_off refusals, KEY slot, core-grammar talk pattern, talk_to_troll consolidation) plus new: dispatch-verb while-false blank-turn semantics (Phase 7 note).
