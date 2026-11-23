# Session Summary: 2026-11-22 - description-noun-lens (23:14 CST)

## Goals
- Decide what Phase 6 ("Verbs beyond examine") of the description-noun-lens plan should cover, and close that plan accordingly.
- Plan GH #835's last bullet (lens findings in Chord Writer, highlighting source where a noun has no text), rule its decisions, measure the lens, and record the rulings as ADR-408.

## Phase Context
- **Plan**: lens-findings-in-ide — `docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` (Plan Status ACTIVE; `.current-plan` points at it). Earlier this session: description-noun-lens Phase 6 ABANDONED and that plan archived (commit 8ff5950f9).
- **Phase executed**: Phase 1 — "Rule the lens's place in Chord Writer, measure it, and record it as ADR-408" (Medium); the session flipped it DONE and advanced Phase 2 CURRENT (since 2026-11-23).
- **Tool calls used**: 268 (state file) — budget 250 for Phase 1, 400 now that Phase 2 is CURRENT; the event log's budget banners show Phase 1's 250 was crossed at about tool call 258.
- **Phase outcome**: Ran over budget (planning, plan-review, ADR interview and two adr-review passes all landed in Phase 1).

## Completed

### description-noun-lens Phase 6 abandoned (first write, committed in 8ff5950f9)
- Every rule in `packages/parser-en-us/src/grammar.ts` (571 counted) declares entity slots by seat or type only, so no standard verb narrows its noun slot; per-verb differences are scope levels (e.g. `pushing.ts:102`, `reading.ts:77`), which is the world answering, not a vocabulary gap.
- David ruled option (a): Phase 6 ABANDONED, Plan Status DONE, plan archived by hand to `docs/work/archive/description-noun-lens/` (`plan-archive.sh` cannot take `plan-YYYYMMDD-*` names, #669); #835 commented: https://github.com/ChicagoDave/sharpee/issues/835#issuecomment-7092427062.

### lens-findings-in-ide plan written and reviewed
- `session-planner` wrote the plan (six phases) and set `docs/context/.current-plan`.
- plan-review: 1 STALE ADR (ADR-187 repokit-first staging vs devkit-only commands), 4 MISSING (ADR-365, ADR-185, ADR-351, the declared ADR-reading deviation), 4 TENSION.
- David ruled option (b): D-1(c) the Testing tab (the web pane both heads host, since ADR-351 D2 carries Chord Writer forward on Avalonia); D-2 to D-6 take their leans; review fixes folded in. Plan revised; plan-check exit 0 [reported by session, unverified].

### Phase 1 — timings and ADR-408
- `docs/work/lens-findings-in-ide/timings.md` (new): the spike lens (`--json`, seed 1209, 5000 states, 120 s, depth 40) on the six test stories, every one under 1 s wall (walkMs 6 to 118); on demand on seven real Chord stories, friendly-zoo and fernhill stop at max-seconds on state space (3,454 / 3,049 states), and secret-letter stops at max-seconds on typing (16 of 92 rooms, 1,951 forms). The writer read the file: 6 test-story rows and 7 real-story rows, each with walkMs and stop reason.
- Finding recorded there: no test story exhausts the lens's budget, so Phase 2's re-timing on the packaged walk lacks an ADR-395 floor story that ends at max-seconds.
- `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` (new): open-questions interview (Q-1 a, Q-2 a, Q-3 a), adr-review 10/20, fixes, re-review 20/20, ACCEPTED by David; the writer confirmed `**Status**: **ACCEPTED**` at line 7 and `**Planning**: OPEN`, `**Kind**: technical`.
- Dated notes added to ADR-187 (line 190, devkit-only analysis commands, ADR-408 D6) and ADR-322 (line 311, D12/AC-8 does not gate the lens, ADR-408 D5); `INDEX.md` rebuilt with ADR-408's row at line 420 (both confirmed by this writer's grep).
- Plan Phases 3 to 5 rewritten for D8: no host runners; Phase 4 is the `sharpee test` tier plus run-event variants `lens-finding` / `lens-summary`, the page fold, and #837.
- Phase 1's `**Demonstrated**` line marked `[reported by session, unverified]` by this write: its demonstrations (adr-index.sh, greps, a file read) are not a hook-logged class; the writer re-ran the greps and found them as stated.

## Key Decisions

### 1. Phase 6 of description-noun-lens abandoned (David, option a)
No standard verb narrows which nouns it accepts, so a per-verb lens would find nothing the examinable lens does not.

### 2. ADR-408 — the examinable lens's findings reach Chord Writer's Testing tab
`docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md`: D1 Testing tab (both heads); D2 highlight is a card selecting the phrase; D3 the lens moves to `packages/branch-tester` on its walk with no necessary set, behind devkit's `sharpee lens examinable`; D4 an `@sharpee/ide-protocol` contract carrying passage keys and owner/target IR ids; D5 ADR-322 D12/AC-8 does not gate it; D6 devkit-only exception to ADR-187; D7 the lens never gates; D8 it rides `sharpee test --json` as a tier at the document's seed on its own fixed budget; D9 `openSource` carries a 1-based column and UTF-16 length; D10 "Write the description" opens the target's declaration.

## Next Phase
- **Phase 2**: "The examinable lens earns a package: `sharpee lens examinable`" — branch-tester walk with a room-first-seen observer and no necessary set, lens module under `packages/branch-tester/src/lens/`, devkit `lens.ts` command, parity census against the spike's orchard/scullery pins, re-timing that sets the tier's fixed budget.
- **Tier**: Large (400 tool-call budget)
- **Entry state**: David's explicit go for the `packages/branch-tester` and `packages/devkit` changes (platform changes are discussed first; ADR-408's acceptance does not authorize them).

## Open Items

### Short Term
- 836: A thing answers only to the grammatical number its name and aka words are written in (candles but not candle)
- 669: plan-archive.sh requires docs/work/<slug>/plan.md; this repository names plans plan-YYYYMMDD-<name>.md, so a DONE plan cannot be archived by the script

### Long Term
- 835: IDE testing: report nouns in room and object descriptions that the player cannot use (the examinable lens is broken and only tries examine) — now planned; commented this write with the plan and ADR-408
- 837: Chord Writer: decode the World Index failure cause no-noun-extractor — folded into Phase 4 of the lens-findings-in-ide plan

## Files Modified

**Decision records** (4 files):
- `docs/architecture/adrs/adr-408-lens-findings-in-chord-writer.md` - new, ACCEPTED
- `docs/architecture/adrs/adr-187-devkit-author-only-split-inrepo-build.md` - dated note (ADR-408 D6)
- `docs/architecture/adrs/adr-322-state-space-analysis-umbrella.md` - dated note on D12 (ADR-408 D5)
- `docs/architecture/adrs/INDEX.md` - rebuilt by `adr-index.sh`

**Plan records** (3 paths):
- `docs/work/lens-findings-in-ide/plan-20261122-lens-findings-in-ide.md` - new plan; rulings, Phase 1 DONE, Phase 2 CURRENT, Phases 3 to 5 rewritten for D8
- `docs/work/lens-findings-in-ide/timings.md` - new, Phase 1 timings
- `docs/context/.current-plan` - points at the new plan

**Committed earlier in 8ff5950f9**: `docs/work/archive/description-noun-lens/` (plan and two censuses moved, Phase 6 ABANDONED) and this summary's first write.

## Notes

**Session duration**: ~3 hours 15 minutes (23:14 to 02:29 CST)

**Approach**: Recap, pre-session audit, core-concepts read; Phase 6 closed by a grammar and scope-level code read; then planner, plan-review, David's ruling, timings, ADR-408 through interview and two reviews.

No source code changed this session. The timings were run by a scratchpad script (`lens-timings.sh`) outside the repository, as was the #835 comment draft (`gh-835-phase6.md`); `.commit-files` and `.commit-msg` in the state file are the commit tooling's scratch, not work.

---

## Session Metadata

- **Session**: c68c7b
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert
- **Commits**: 8ff5950f9 — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261122-2314-description-noun-lens.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: description-noun-lens Phases 1 to 5 DONE (10d1c4a0d) with the lens reading through the story language; David's rulings on D-1 to D-6 and on Q-1 to Q-3.
- **Prerequisites discovered**: David's go for `packages/branch-tester` and `packages/devkit` (Phase 2) and later `packages/ide-protocol` (Phase 3); an ADR-395 test story that exhausts the lens's budget, for Phase 2's re-timing.

## Architectural Decisions

- ADR-408: the examinable lens's findings reach Chord Writer's Testing tab as a non-gating `sharpee test` tier, from a branch-tester package behind devkit — ruled through plan approval and the open-questions interview.
- ADR-187 and ADR-322 D12 carry dated notes pointing at ADR-408 (no decision amended).

## Mutation Audit

- N/A (planning, decision records and measurement only)

## Test Coverage Delta

- No test changes this session (the lens timings are measurements, not tests).

---

**Progressive update**: session completed 2026-11-22 23:29 — first write: Phase 6 abandoned, plan DONE and archived, #835 commented
**Progressive update**: checkpoint 2026-11-23 02:29 — lens-findings-in-ide planned and reviewed, Phase 1 DONE (timings, ADR-408 ACCEPTED, ADR-187/322 notes, index rebuilt), Phase 2 CURRENT awaiting David's go; Status back to IN-FLIGHT
