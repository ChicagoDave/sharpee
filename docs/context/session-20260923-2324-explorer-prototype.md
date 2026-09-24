# Session Summary: 2026-09-23 - explorer-prototype

## Goals
- Phase 3 of `docs/work/testing-explorer/plan-20260922-examinable-lens.md`: report shape (fold repeated findings across rooms, stable `--json`), a regression pin under `tools/explorer-probe/tests/`, and the tool's usage doc in its header.
- Phase 4 of the same plan: ADR-294 amendment recording the pivot to scoped lenses, the §4C / ADR-321 D13 relationship, the next-lens issue, and the executed record on #508.
- Plan and ship the second scoped lens (issue #515, filed by Phase 4 above): declared states nothing assigns, and states something assigns but nothing reads — static, zero-execution, decided against the compiled IR. Planned after the first finalize as `docs/work/testing-explorer/plan-20260924-declared-states-lens.md` and executed through all three of its phases in the same session.

## Phase Context
- **Plans**: Two plans executed this session, both now **Plan Status: DONE**.
  - `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — the first scoped testing-explorer lens (issue #508's decision): for every reachable room in a Chord story, extract noun phrases from rendered descriptions, drive each through the real parser/engine as `examine <phrase>`, and report what fails to resolve or resolves to the default response.
  - `docs/work/testing-explorer/plan-20260924-declared-states-lens.md` — the second scoped lens (issue #515): for every entity state a story declares, report which values no rule ever assigns and, separately, which values some rule assigns but no rule ever reads. Static, no walk, no engine invocation — decided against the compiled IR the loader runs.
- **Phases executed**: Plan 1 — Phase 3 "Report shape and regression pin" (Small, budget 120) and Phase 4 "Close the loop — ADR amendment and the next lens" (Small, budget 90). Plan 2 — Phase 1 "Read and write derivation, and the classifier" (Medium, budget 220), Phase 2 "Extend to secret-letter, a dedicated fixture, and report/test shape" (Medium, budget 180), Phase 3 "Close the loop" (Small, budget 80). All five phases DONE.
- **Tool calls used**: 271 total this session (state file's cumulative counter, spanning both plans' five phases — plan 1's Phase 3/4 alone measured 68/120 at the point of the first finalize; no separate per-phase breakdown was tracked after the `.current-plan` pointer moved to plan 2).
- **Phase outcome**: All five phases completed; plan 1 finished under budget; plan 2's phases finished within their stated budgets (Phase 1's exit criterion of "one genuine finding per direction" was not literally met, and the reason — a clean corpus with every candidate a traced false positive — is itself the phase's result, recorded in its Outcome).

## Completed

### Report shape (`tools/explorer-probe/lens-examinable.js`)
- JSON gains `lens: "examinable"`, `format: 1`, and a top-level `findings` array folded across rooms by `(phrase, kind, detail)`, most-rooms first, each entry naming the rooms it recurs in and the union of sources. `rooms` stays the full per-room record in discovery order.
- Console form prints recurring findings once under "seen in more than one room", then each room with only its unique findings plus a count of what was folded away — on fernhill this took `house` from five listings to one and the carried letter's phrase from eleven to one hidden row.
- A first cut counted hidden not-a-thing rows as "listed above"; fixed so only visible folded rows count.
- `printReport` takes an `out` sink so tests capture it without touching stdout. `foldFindings` and `isFinding` moved above their call sites.

### Regression pin (`tools/explorer-probe/tests/lens-examinable.test.js`, new — committed)
- Plain `node:test`, no new package or vitest config — run with `node --test 'tools/explorer-probe/tests/*.test.js'`.
- Pins: the classifier against the engine's measured event shapes; the fold and console form against synthetic rows; the one-room fixture through the real engine (compiled from source in the test, as `world-index`'s corpus tests do); fernhill at seed 1209 / 600 states as the corpus pin (11 of 13 rooms, 119 phrases, 92 not-in-scope / 27 described, the full folded finding list as the specification).
- The pin cost was measured before designing the test: fernhill at `--max-states 600` reaches the same 11-of-13 rooms with the same class counts as at 1500 states (13s vs 36s) — a state budget, not a seconds budget, is what keeps the pin deterministic.
- A missing fernhill build fails the pin loudly rather than skipping it.

### Usage doc
- The `lens-examinable.js` header covers invocation and flags, the five classification classes and what decides each, the format-1 JSON shape, the fold, and the test command. No separate `.md` file was needed.

### Plan 1, Phase 4 — ADR amendment and next-lens issue
- ADR-294 gains Amendment 2 / **D23**: the explorer is a family of scoped lenses over the walker's room reachability; D20's enumeration is retired as the mechanism; the three D20 commitments (soundness contract, real-path-only, the walker as shared substrate) carry forward; the shipped lens is cited by path with its filed defects; the relationship to `state-space-analysis.md` §4C (the executed, state-relative check in the same family) and ADR-321 D13 (the adjacent static, story-wide check) is named, not merged. D22 stands. A top-of-file "Amended 2026-09-23" note was added alongside the existing D21/D22 note.
- Issue #515 filed for the next candidate lens (declared states nothing assigns), carrying forward the spike's `fruiting` lesson: trait-defined clauses assign state too, so the write side must read all five IR surfaces.
- Issue #508 commented with the executed record (the pivot from D20 enumeration to scoped lenses is now shipped, not just decided); left open — closing it is David's call.
- Plan 1: Phase 3 and Phase 4 both marked DONE with outcomes; **Plan Status set DONE**.
- Not archived: `docs/work/testing-explorer/` also holds `spike-20260922-explorer-measurement.md`, a second document in the same topic directory. `plan-archive.sh` moves the whole feature directory to `docs/work/archive/<slug>/`, which would take the spike document with it even though only the plan is terminal. Archiving was deliberately skipped rather than archiving the spike as a side effect; this is a real directory-granularity gap in the archive script worth a future issue, not something worked around here. Plan 2's completion below hits the same gap, for the same reason.

### Plan 2, Phase 1 — read/write derivation and classifier (2026-09-24, David's "phase 1" ~00:20 MDT)
- New `tools/explorer-probe/lens-declared-state.js`: static, reads the compiled IR, runs nothing. Assigned side = `@sharpee/world-index`'s `collectStateWriters` (reuse per ADR-322 D8) unioned with a whole-IR sweep of the same shape; read side = a new local `collectStateReads` over every IR root (`is` predicates, `select-on` arms, `story-state` — no equivalent derivation exists anywhere in `world-index`, and `dimensions.js`'s existing `harvest` walks only two of six surfaces as roots, confirmed empirically against fernhill and secret-letter's real topic/machine `change` nodes). Initial value `states[0]` excluded (loader-assigned, per `packages/story-loader/src/loader.ts:616`).
- Result on all four compiled stories (fernhill, secret-letter, ides-of-march, thealderman): zero findings. Every candidate was a false positive with a traced cause. Two platform facts learned: (a) `collectStateWriters` misses `timerClauses`/`moveClauses`/`exchanges` (8+1+1 writes measured across the four IRs) — **#517 filed** (also affects ADR-321 D4's gate-opening reach); (b) the evaluator answers open/closed/locked/unlocked/on/off/worn/lit/dark and mood/threat/pressure words (including `ir.customMoods`) without a declared state, so those are never read-undeclared findings.
- Secret-letter's spike figure "27 of 40 inert dimensions" is 0 once trait clauses are read.
- The two undeclared-value directions from the original plan text (read-undeclared, assigned-undeclared) were built this phase per ADR-322 D9's open vocabulary, then removed in Phase 2 (below).

### Plan 2, Phase 2 — fixture, secret-letter, report/test shape (David's "phase 2")
- Fixture `tools/explorer-probe/fixtures/declared-state-fixture/declared-state-fixture.story` built (one yard, ten entities, `use state-machines`): an on-clause that reads and writes its own state (lamp), a topic-body write (bell), a machine whose entered state writes a *different* entity than its role (pump → tank), a trait with an `it`-bound `select on its state` clause on two composing entities (apple, pear), a timer-clause write (tap, pinning into `platformGap`), a sequence writing story state read elsewhere, one value never assigned (lamp `broken`), two dimensions written but never read (bell, pump).
- The fixture's first compile showed the Chord compiler already refuses reads (`analysis.unknown-value`) and writes (`analysis.undeclared-state`) of undeclared values — so Phase 1's two undeclared-value directions and their platform-symbol set (and the world-model dist dependency they needed) were deleted. The lens is now the plan's original two directions only.
- `tools/explorer-probe/tests/lens-declared-state.test.js` written from the Phase 1 Behavior Statement: IR fragments, the fixture (compiled at test time), fernhill (9 dimensions, 0 findings, vine writers attributed by line), secret-letter (41 dimensions, 0 findings, the nine writers `collectStateWriters` misses pinned by line). First run: 17 passing, 1 failure — a wrong expectation of the writer's, not the lens's (`guard angry` is genuinely never-assigned); reported and the session waited per the no-auto-retry rule, then fixed on David's explicit "fix it". Both explorer-probe suites together: 43 passing, 0 failures.
- Secret-letter comparison recorded against the spike: 0 inert dimensions vs. the spike's 27 — the difference is entirely trait clauses (`*-ware`, `stall-display`) reading `it is shelved/nicked` and the stalls' `trading/blocked`, which the spike's model never walked.
- No genuine findings on fernhill or secret-letter to file — the corpus is clean in both directions. Nothing committed.

### Plan 2, Phase 3 — close the loop (David's "phase 3")
- Lens header corrected to the shipped design: the platform walk's three missed surfaces, the union + `platformGap` mechanism, the JSON shape, what the pin covers.
- **#518 filed**: a `collectStateReaders` derivation for `@sharpee/world-index`, shaped as this lens's local walk so a future move is an import swap — a discussion item, not built, per CLAUDE.md's platform-change rule (sequenced beside #517, since both would touch `statements.ts`).
- **#515 commented** with the shipped record (ready to close once committed); **#508 commented**, stays closed.
- Rule 11 ask posed to David (not assumed): whether this pivot warrants a tightening of ADR-294 D23 now or waits for a later amendment. David chose "tighten it" — D23's "real path only" bullet now reads: the verdict comes from the platform's own artifact — the real parser and engine for an executed lens, the compiled IR the loader runs for a static one — with a dated tightening note citing this second lens. No new decision number; D23 amended in place.
- Plan 2 Status DONE (all three phases). Nothing from Plan 2's work has been committed since 544a5503e.

## Key Decisions

### 1. Fold key is (phrase, kind, detail), not phrase alone
The same phrase can be a described resolution in one room and unresolved in another — collapsing on phrase text alone would hide that difference.

### 2. Pin by state budget, never by seconds
States are deterministic at a seed; wall-clock is not. Measured before committing to the design: 600 and 1500 states reach identical rooms and counts on fernhill, at 13s and 36s respectively.

### 3. `node:test`, no new package
The tool is plain CommonJS with no `package.json` of its own; adding one to get a test runner would cost the six package-registration points (per this repo's own checklist) for a tool that doesn't need them. The run command lives in the file header instead of a README.

### 4. The pin fails, never skips, on a missing fernhill build
A pin that silently skips when its fixture is absent is not a regression pin — it is a suite that quietly stops testing anything.

### 5. David's "phase 4" taken as rule-11 sign-off for the ADR amendment
The phase's sole deliverable is the amendment, and #508's own decision text already committed to it ("The ADR gets amended to say so once the first lens exists to cite"). No Open Questions section was written, so rule 11a's interview offer does not apply.

### 6. #508 stays open
Closing an issue is David's call; the comment records that the decision it tracked has now been executed, not that the issue is resolved.

### 7. Plan left unarchived despite Plan Status DONE
`docs/work/testing-explorer/` is a multi-document topic directory (plan + spike). The archive script operates on the whole directory, so running it here would relocate the still-relevant spike document as a side effect of closing the plan. Judged safer to leave the directory in place and flag the gap than to archive blind. The same reasoning applies to plan 2's completion.

### 8. Never-read is reported per entity, not per value
Per-value flags things that are actually read, just by a different route: the boiler's `primed` progression step, and initial values read by negation (`tobias is not shaken`). Per-value read coverage stays available in the report's `dimensions[].read`, but the finding itself is entity-scoped.

### 9. Consume-then-sweep for the assigned side
`collectStateWriters` is reused per ADR-322 D8 rather than rebuilt, but it has real gaps (timer/move/exchange clauses). The lens unions the platform walk with its own whole-IR sweep and reports the difference as `platformGap` — false negatives are prevented and the gap is visible, filed as #517, rather than silently worked around.

### 10. Platform symbols read from the evaluator's own word lists, never guessed
The set of state adjectives the runtime answers without a declared state (open/closed/locked/.../`ir.customMoods`) was read directly from `stateAdjectiveHolds`'s source, not inferred from behavior — guessing would have re-created the spike's original error mode.

### 11. The two undeclared-value directions were deleted, not kept as belt-and-suspenders
Once the fixture's own compile proved the Chord compiler already refuses both reads and writes of undeclared values (`analysis.unknown-value`, `analysis.undeclared-state`), keeping the directions would mean shipping dead code paths that could never fire against any compiled IR. Removed along with the platform-symbol set and the world-model dist dependency they required.

### 12. Rule 11: "tighten it" — amend D23 in place, no new decision number
David's choice, posed rather than assumed per rule 11a's neighboring discipline (don't resolve open questions unasked). A static lens genuinely could not satisfy D23's original "real parser and the real engine" wording, so the bullet needed a correction, not a new commitment — hence an in-place amendment with a dated note rather than a D24.

## Next Phase
Both plans are complete — all eight phases across the two plans are DONE, and both plans show **Plan Status: DONE**. `.current-plan` still points at `docs/work/testing-explorer/plan-20260924-declared-states-lens.md`; neither plan has been archived (see Key Decision 7 — the shared topic directory also holds the still-live spike document). The next unit of testing-explorer work has no plan yet: it is whichever of #517 (world-index's `collectStateWriters` gap), #518 (a `collectStateReaders` derivation), or a third scoped lens gets picked up next, each of which would need its own plan per this repo's "fresh plan per task" convention.

## Open Items

### Short Term
- #515: second scoped lens (declared states nothing assigns / assigns-but-never-reads) — shipped and commented with the record this session; ready to close once committed, but closing is David's call.
- #508: scoped-lenses pivot decision — commented with the executed record for both lenses now; left open for David to close.
- #518: a `collectStateReaders` derivation for `@sharpee/world-index`, symmetric to `collectStateWriters` — filed this session as a discussion item, not built (platform change, per CLAUDE.md).
- The declared-state lens work (Plan 2, all three phases) is uncommitted — matches current git status (`lens-declared-state.js`, the fixture directory, and its test are untracked; the plan file and ADR-294 both carry uncommitted edits).

### Long Term
- #517: `@sharpee/world-index`'s `collectStateWriters` misses `timerClauses`, `moveClauses`, and `exchanges` (8+1+1 writes measured) — a platform bug, also a blind spot in ADR-321 D4's gate-opening check. Filed this session; awaiting David's platform discussion per CLAUDE.md.
- #514: possessive-determiner anchors for `@sharpee/world-index`'s noun-phrase extractor — recall-gap finding from Plan 1 Phase 2's secret-letter run, awaiting David's platform discussion (platform change, per CLAUDE.md, not a story-level call).

*(Note on this ledger, carried from the first pass: `issues.sh list-open` returns open issues oldest-first and its result that session topped out at issue #317 — it did not reach #508/#514/#515/#517/#518, which are real, already-filed GitHub issues referenced throughout this and its predecessor plan. Cited above by number on that basis rather than re-filed. This looks like a pagination/ordering limit in the tool rather than evidence these issues are missing from the store; worth a look if the ledger is relied on for high-numbered issues again.)*

## Files Modified

**Committed in 544a5503e** (Plan 1, Phase 3 and Phase 4):
- `tools/explorer-probe/lens-examinable.js` — header usage doc; `foldFindings`/`isFinding` moved up; `printRow`/`printReport` take an `out` sink; format-1 JSON report; exports for testing
- `tools/explorer-probe/tests/lens-examinable.test.js` — new, 25 tests across 5 suites
- `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — Phase 3 and Phase 4 marked DONE with outcomes; Plan Status set DONE
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — Amendment 2 / D23 added; top-of-file amended-note line added
- `docs/work/testing-explorer/plan-20260924-declared-states-lens.md` — created (plan for Plan 2, not yet executed at commit time)

**Uncommitted, this session** (Plan 2, all three phases — matches current `git status`):
- `tools/explorer-probe/lens-declared-state.js` — new, the declared-state lens
- `tools/explorer-probe/fixtures/declared-state-fixture/declared-state-fixture.story` — new fixture
- `tools/explorer-probe/tests/lens-declared-state.test.js` — new regression pin, 18 tests
- `docs/work/testing-explorer/plan-20260924-declared-states-lens.md` — all three phases marked DONE with outcomes; Plan Status set DONE
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — D23's real-path bullet tightened for static lenses, dated note added
- `docs/context/session-20260923-2324-explorer-prototype.md` — this file (this pass folds the three hand-appended progressive sections into the structured template)

**Pre-existing, not from this session's work** (dirty at session start, left untouched):
- `docs/context/pattern-recurrence-baseline.json` — deleted before this session began
- `docs/context/session-20260923-0201-explorer-prototype.md` — modified before this session began

## Notes

**Session duration**: two blocks. First block ~28 minutes (state file `started` 2026-09-24T05:24:57Z / `startedLocal` 2026-09-23 23:24 MDT, through the first work-summary-writer pass and commit 544a5503e, ending ~23:53 MDT). A second block began after that finalize and ran plan 2's three phases (David's own phase timestamps: Phase 1 ~00:20 MDT 2026-09-24, Phases 2 and 3 following in the same continuous session); no separate end timestamp was logged for the second block before this update.

**Approach**: Measure before designing (pin cost, fold semantics, which platform derivations already exist) rather than guessing at a report shape or a write-side deriver; treat each plan's ADR-touching phase as a deliverable rather than a separate ask when the sign-off condition was already on record (Plan 1's #508 text; Plan 2's rule-11 ask, posed rather than assumed).

**Naming discrepancy fixed in the first pass**: the progressive summary was originally written to `session-20260923-2330-explorer-prototype.md`, but the state file's `summaryPrefix` is `20260923-2324` (the session's actual start stamp). Renamed to match — the finalize gate and the dashboard glob on the state file's stamp, not on whatever time the writer happened to run.

**This pass**: folds three hand-appended progressive sections ("Declared-state lens — Phase 1/2/3") into the template's proper structure (Goals, Completed, Key Decisions, Open Items, Files Modified, Test Coverage Delta, Mutation Audit). No new work performed; all facts carried forward from the appended sections, which were written as-accurate.

---

## Session Metadata

- **Session**: 97dd17
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — both plans complete
- **Rollback Safety**: safe to revert — Plan 2's work (declared-state lens, fixture, test, plan/ADR edits) is uncommitted, working-tree only; Plan 1's work is already committed at 544a5503e

## Dependency/Prerequisite Check

- **Prerequisites met**: Plan 1 — Phase 2's verified-correct lens output on fernhill and secret-letter (entry condition for Phase 3); `@sharpee/world-index` built; fernhill compiled from source for the fixture and the pin; the plan's own Phase 3 deliverable text (report shape, regression pin, usage doc) as the spec to build against. Plan 2 — `@sharpee/world-index` built and exporting `collectStateWriters`, verified directly against fernhill's compiled IR before design began; all four story IRs (fernhill, secret-letter, ides-of-march, thealderman) compiled; the platform's own load path (`story-loader`) read to confirm the `states[0]` initial-value exclusion.
- **Prerequisites discovered**: Plan 1 — none blocking; the `dist/` directory for the one-room test fixture had to be created before `./sharpee compose` would write into it, handled inside the test itself. Plan 2 — the Chord compiler already refuses undeclared-value reads and writes at compile time (`analysis.unknown-value`, `analysis.undeclared-state`), discovered via the fixture's first compile, which eliminated two of the four directions Phase 1 had built — not a blocker, but a design input Phase 1 could not have had before the fixture existed.

## Architectural Decisions

- ADR-294 Amendment 2 / **D23** (Plan 1, Phase 4): the explorer is a family of scoped lenses over the walker's room reachability; D20's enumeration mechanism is retired; three D20 commitments (soundness contract, real-path-only execution, the walker as shared substrate) carry forward unchanged; relationship to `state-space-analysis.md` §4C and ADR-321 D13 named explicitly as adjacent, not merged.
- ADR-294 D23, tightened in place (Plan 2, Phase 3, David's "tighten it"): the real-path bullet now names both cases explicitly — the real parser and engine for an executed lens, the compiled IR the loader runs for a static lens — dated note, no new decision number.
- Pattern applied: none from `packages/` — both lenses are tooling under `tools/explorer-probe/`, and Plan 2 explicitly confirmed nothing under `packages/` was touched even though it reused `@sharpee/world-index`'s exported `collectStateWriters`.

## Mutation Audit

- Files with state-changing logic modified: `tools/explorer-probe/lens-examinable.js` (`foldFindings`, `printReport`) and `tools/explorer-probe/lens-declared-state.js` (`collectStateReads`, the union/`platformGap` classifier, report construction) — the "mutation" in both is report construction and console/sink output, not persisted application state; neither tool writes to a database or mutates entity state.
- Tests verify actual state mutations (not just events): YES (evidence: `node --test 'tools/explorer-probe/tests/*.test.js'` — both suites together, 43 passing, 0 failing, 2026-09-24 — asserting on the folded `findings` array's contents, the classifier's `neverAssigned`/`neverRead`/`platformGap` sets, and captured console output via each tool's `out` sink, not on return values or mocks).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — the state-budget-vs-seconds-budget decision echoes the project's existing "walkthroughs deterministic at pinned seed" convention (memory: `feedback_flakey_walkthroughs.md`) but is a design choice applied consistently, not a repeat of a prior defect. Plan 2's "consume, don't rebuild" reuse of `collectStateWriters` is a direct application of ADR-322 D8, not a new pattern; the gap it exposed (#517) is a genuine platform defect, not a recurrence of anything from this session's own predecessor work.

## Test Coverage Delta

- Tests added: 43 total this session — `tools/explorer-probe/tests/lens-examinable.test.js` (25, committed) and `tools/explorer-probe/tests/lens-declared-state.test.js` (18, uncommitted): classifier, fold/report, fixture-through-real-compile, and corpus pins (fernhill for the first lens; fernhill and secret-letter for the second).
- Tests passing before this session: 0 (neither file existed) → after: 43 passing, 0 failing (evidence: `node --test 'tools/explorer-probe/tests/*.test.js'`, 2026-09-24, both suites run together). The declared-state suite's first run was 17 passing / 1 failing on a wrong test expectation (not a lens defect); fixed on David's explicit instruction per the no-auto-retry rule, then green.
- Known untested areas: the examinable-lens pin covers fernhill only — Plan 1 Phase 2's secret-letter run (19/21 rooms, 415 phrases) was verified by hand that session but has no corresponding regression pin, a gap if secret-letter's lens output regresses silently. The declared-state lens has no such gap for its two live directions (fernhill and secret-letter are both pinned), but has zero real-corpus coverage of the `platformGap` mechanism beyond the fixture's single timer-clause case.

---

**Progressive update**: Session completed 2026-09-24 (second block, folded into this template on request; exact end timestamp not separately logged)
