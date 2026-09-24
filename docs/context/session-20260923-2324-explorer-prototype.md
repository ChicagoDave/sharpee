# Session Summary: 2026-09-23 - explorer-prototype

## Goals
- Phase 3 of `docs/work/testing-explorer/plan-20260922-examinable-lens.md`: report shape (fold repeated findings across rooms, stable `--json`), a regression pin under `tools/explorer-probe/tests/`, and the tool's usage doc in its header.
- Phase 4: ADR-294 amendment recording the pivot to scoped lenses, the §4C / ADR-321 D13 relationship, the next-lens issue, and the executed record on #508.

## Phase Context
- **Plan**: Build and ship the first scoped testing-explorer lens (issue #508's decision) — for every reachable room in a Chord story, extract noun phrases from rendered descriptions, drive each through the real parser/engine as `examine <phrase>`, and report what fails to resolve or resolves to the default response.
- **Phase executed**: Phase 3 — "Report shape and regression pin" (Small, budget 120) and Phase 4 — "Close the loop — ADR amendment and the next lens" (Small, budget 90), both completed in this session.
- **Tool calls used**: 68 / 120 (Phase 3's tracked budget; Phase 4 carries its own 90-call budget in the plan and also finished within it).
- **Phase outcome**: Both phases completed under budget.

## Completed

### Report shape (`tools/explorer-probe/lens-examinable.js`)
- JSON gains `lens: "examinable"`, `format: 1`, and a top-level `findings` array folded across rooms by `(phrase, kind, detail)`, most-rooms first, each entry naming the rooms it recurs in and the union of sources. `rooms` stays the full per-room record in discovery order.
- Console form prints recurring findings once under "seen in more than one room", then each room with only its unique findings plus a count of what was folded away — on fernhill this took `house` from five listings to one and the carried letter's phrase from eleven to one hidden row.
- A first cut counted hidden not-a-thing rows as "listed above"; fixed so only visible folded rows count.
- `printReport` takes an `out` sink so tests capture it without touching stdout. `foldFindings` and `isFinding` moved above their call sites.

### Regression pin (`tools/explorer-probe/tests/lens-examinable.test.js`, new)
- Plain `node:test`, no new package or vitest config — run with `node --test 'tools/explorer-probe/tests/*.test.js'`.
- Pins: the classifier against the engine's measured event shapes; the fold and console form against synthetic rows; the one-room fixture through the real engine (compiled from source in the test, as `world-index`'s corpus tests do); fernhill at seed 1209 / 600 states as the corpus pin (11 of 13 rooms, 119 phrases, 92 not-in-scope / 27 described, the full folded finding list as the specification).
- The pin cost was measured before designing the test: fernhill at `--max-states 600` reaches the same 11-of-13 rooms with the same class counts as at 1500 states (13s vs 36s) — a state budget, not a seconds budget, is what keeps the pin deterministic.
- A missing fernhill build fails the pin loudly rather than skipping it.
- **Re-run this session for corroboration** (2026-09-24T05:52:33Z, after the last edit to the covered files at 05:42:29Z): `node --test 'tools/explorer-probe/tests/*.test.js'` → `tests 25`, `suites 5`, `pass 25`, `fail 0`, `duration_ms 13202.51`.

### Usage doc
- The lens header now covers invocation and flags, the five classification classes and what decides each, the format-1 JSON shape, the fold, and the test command. No separate `.md` file was needed.

### Phase 4 — ADR amendment and next-lens issue
- ADR-294 gains Amendment 2 / **D23**: the explorer is a family of scoped lenses over the walker's room reachability; D20's enumeration is retired as the mechanism; the three D20 commitments (soundness contract, real-path-only, the walker as shared substrate) carry forward; the shipped lens is cited by path with its filed defects; the relationship to `state-space-analysis.md` §4C (the executed, state-relative check in the same family) and ADR-321 D13 (the adjacent static, story-wide check) is named, not merged. D22 stands. A top-of-file "Amended 2026-09-23" note was added alongside the existing D21/D22 note.
- Issue #515 filed for the next candidate lens (declared states nothing assigns), carrying forward the spike's `fruiting` lesson: trait-defined clauses assign state too, so the write side must read all five IR surfaces.
- Issue #508 commented with the executed record (the pivot from D20 enumeration to scoped lenses is now shipped, not just decided); left open — closing it is David's call.
- Plan: Phase 3 and Phase 4 both marked DONE with outcomes; **Plan Status set DONE**.
- Not archived: `docs/work/testing-explorer/` also holds `spike-20260922-explorer-measurement.md`, a second document in the same topic directory. `plan-archive.sh` moves the whole feature directory to `docs/work/archive/<slug>/`, which would take the spike document with it even though only the plan is terminal. Archiving was deliberately skipped this session rather than archiving the spike as a side effect; this is a real directory-granularity gap in the archive script worth a future issue, not something worked around here.

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
`docs/work/testing-explorer/` is a multi-document topic directory (plan + spike). The archive script operates on the whole directory, so running it here would relocate the still-relevant spike document as a side effect of closing the plan. Judged safer to leave the directory in place and flag the gap than to archive blind.

## Next Phase
Plan complete — all phases done. The next unit of testing-explorer work is issue #515 (a lens for "declared states nothing assigns"), which will need its own plan when picked up — this plan's scope ends at the first shipped lens.

## Open Items

### Short Term
- #515: next candidate lens — declared states nothing assigns (filed this session, carries the `fruiting` half-false-positive lesson: trait-defined clauses assign state too, so the write side must check all five IR surfaces).
- #508: scoped-lenses pivot decision — commented with the executed record this session; left open for David to close.

### Long Term
- #514: possessive-determiner anchors for `@sharpee/world-index`'s noun-phrase extractor — recall-gap finding from Phase 2's secret-letter run, awaiting David's platform discussion (platform change, per CLAUDE.md, not a story-level call).

*(Note on this ledger: `issues.sh list-open` returns open issues oldest-first and its result this session topped out at issue #317 — it did not reach #508/#514/#515, which are real, already-filed GitHub issues referenced throughout this plan and its predecessor session files. Cited above by number on that basis rather than re-filed. This looks like a pagination/ordering limit in the tool rather than evidence these issues are missing from the store; worth a look if the ledger is relied on for high-numbered issues again.)*

## Files Modified

**Lens tool** (2 files):
- `tools/explorer-probe/lens-examinable.js` — header usage doc; `foldFindings`/`isFinding` moved up; `printRow`/`printReport` take an `out` sink; format-1 JSON report; exports for testing
- `tools/explorer-probe/tests/lens-examinable.test.js` — new, 25 tests across 5 suites

**Plan and ADR** (2 files):
- `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — Phase 3 and Phase 4 marked DONE with outcomes; Plan Status set DONE
- `docs/architecture/adrs/adr-294-golden-transcripts-tester-rebuild.md` — Amendment 2 / D23 appended; top-of-file amended-note line added

**Session record** (1 file):
- `docs/context/session-20260923-2324-explorer-prototype.md` — this file (renamed in place from the `2330` stamp the progressive writer used, to match the state file's `summaryPrefix`)

**Pre-existing, not from this session's work** (dirty at session start, left untouched):
- `docs/context/pattern-recurrence-baseline.json` — deleted before this session began
- `docs/context/session-20260923-0201-explorer-prototype.md` — modified before this session began

## Notes

**Session duration**: ~28 minutes (state file `started` 2026-09-24T05:24:57Z / `startedLocal` 2026-09-23 23:24 MDT, through the work-summary-writer pass ending ~05:53 UTC).

**Approach**: Measure before designing (pin cost, fold semantics) rather than guessing at a report shape; treat the ADR amendment as a phase deliverable rather than a separate ask, since the sign-off condition (a shipped lens to cite) was already on record in #508.

**Naming discrepancy this pass fixed**: the progressive summary was written to `session-20260923-2330-explorer-prototype.md`, but the state file's `summaryPrefix` is `20260923-2324` (the session's actual start stamp). Renamed to match — the finalize gate and the dashboard glob on the state file's stamp, not on whatever time the writer happened to run.

---

## Session Metadata

- **Session**: 97dd17
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — plan complete
- **Rollback Safety**: safe to revert (nothing from this session committed; working tree only)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2's verified-correct lens output on fernhill and secret-letter (entry condition for Phase 3); `@sharpee/world-index` built; fernhill compiled from source for the fixture and the pin; the plan's own Phase 3 deliverable text (report shape, regression pin, usage doc) as the spec to build against.
- **Prerequisites discovered**: None blocking. The `dist/` directory for the one-room test fixture had to be created before `./sharpee compose` would write into it — handled inside the test itself, not a structural gap.

## Architectural Decisions

- ADR-294 Amendment 2 / **D23**: the explorer is a family of scoped lenses over the walker's room reachability; D20's enumeration mechanism is retired; three D20 commitments (soundness contract, real-path-only execution, the walker as shared substrate) carry forward unchanged; relationship to `state-space-analysis.md` §4C and ADR-321 D13 named explicitly as adjacent, not merged.
- Pattern applied: none from `packages/` — this is tooling under `tools/explorer-probe/`, and the session's own text confirms nothing under `packages/` was touched.

## Mutation Audit

- Files with state-changing logic modified: `tools/explorer-probe/lens-examinable.js` (`foldFindings`, `printReport`) — the "mutation" here is report construction and console/sink output, not persisted application state; there is no database or entity-state write in this tool.
- Tests verify actual state mutations (not just events): YES (evidence: `node --test 'tools/explorer-probe/tests/*.test.js'` run 2026-09-24T05:52:33Z — `pass 25`, `fail 0` — asserting on the folded `findings` array's contents and the captured console output via the `out` sink, not on return values or mocks).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — the state-budget-vs-seconds-budget decision echoes the project's existing "walkthroughs deterministic at pinned seed" convention (memory: `feedback_flakey_walkthroughs.md`) but is a design choice applied consistently, not a repeat of a prior defect.

## Test Coverage Delta

- Tests added: 25 (new file; 5 suites: classifier, `foldFindings`, `printReport`, the one-room fixture through the real engine, and the fernhill corpus pin).
- Tests passing before: 0 (file did not exist) → after: 25 passing, 0 failing (evidence: `node --test 'tools/explorer-probe/tests/*.test.js'`, 2026-09-24T05:52:33Z, `duration_ms 13202.51`, timestamped after the last edit to the covered files at 05:42:29Z).
- Known untested areas: the pin covers fernhill only; Phase 2's secret-letter run (19/21 rooms, 415 phrases) was verified by hand that session but has no corresponding regression pin — a gap if secret-letter's lens output regresses silently.

---

**Progressive update**: Session completed 2026-09-23 23:53 MDT
