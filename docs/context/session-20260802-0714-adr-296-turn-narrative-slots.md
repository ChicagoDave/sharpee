# Session Summary: 2026-08-02 - adr-296-turn-narrative-slots (session e9e0c4)

## Goals
- Implement ADR-296 (turn narrative slots, fixes GH #208) per `docs/work/prose-order/plan-20260802-adr-296.md` — as much of the 5-phase plan as possible, autonomously (David asleep; explicit go: "complete as much of the plan as you can without my input").

## Phase Context
- **Plan**: `docs/work/prose-order/plan-20260802-adr-296.md`
- **Phase executed**: All 5 phases COMPLETE (Phase 1 through Phase 5 — the plan's full scope).
- **Tool calls used**: 271 (session state) against a combined 1400 budget across the five phases (250+250+400+250+250).
- **Phase outcome**: Completed well under combined budget. Phase 1 (d72a257b + 4f0436ca): D3 slot stamping + D4 override/phrase-emission partition, both suites green, mutation-verification gaps closed. Phase 2 (21a92133): funnel transaction stamping at both sources, engine 561 green. Phase 3 (6850a56b): `sort.ts` rewritten to slot insertion (the GH #208 fix), 24 tests, all four package suites green, tsc clean. Phase 4 (1571588e): engine-level e2e trap-scenario test through the full real path, `./repokit build dungeo` green, `tsf build --npm` green, genai-api regenerated. Phase 5 (52e769d3): four D8-predicted goldens re-blessed exactly, no unmapped diffs, chain green twice at pinned seeds.

## Completed
- Pulled main to 305cbdd9 (ADR-296 plan landed); confirmed old adrs-264-265 branch fully merged via PR #184.
- Cut branch `adr-296-turn-narrative-slots` from main; cold-start bootstrap (`pnpm install`, `./repokit build dungeo` green pre-change).
- **Phase 1**: `ChainEventOptions.slot` + `_narrativeSlot` stamping on phrase events only (world-model); D4 override/phrase-emission partition (event-processor); ADR-106 dated pointer note. mutation-verification gaps closed (override text/params, slot precedence, error payload).
- **Phase 2**: `EventProcessingContext.transactionId`; both funnels (action, per-plugin batch) stamp per-source ids; data-object creation for data-less events; duplicate `TurnEventProcessor` deprecated (choice recorded below). mutation-verification gap closed (primitive-data no-op).
- **Phase 3**: `sort.ts` rewritten (hoists + depth comparator deleted; never-group; anchor cluster; anchor-less collapse; slot insertion; second-anchor guard); `sort.test.ts` rewritten per D7 (24 tests); ADR-094 A1 closing paragraph appended.
- **Phase 4**: engine-level e2e trap-scenario test (`tests/integration/adr-296-trap-scenario.test.ts`) exercises the full real path (chain dispatch → D4 promotion → funnel stamp → slot insertion → rendered blocks) with no stubs of owned dependencies; save-format changelog entry appended to `save-restore-service.ts`'s header (additive-only, no version bump); `./repokit build dungeo` and `tsf build --npm` both green; genai-api docs regenerated (`ChainNarrativeSlot`, `EventProcessingContext.transactionId` now public surface).
- **Phase 5**: unit corpus 1725 passed / 114 transcripts, no new assertion-tier failures; golden diff matched the D8 prediction exactly — `wt-02` (5× disoriented-above-description), `wt-10` (bearings above Tea Room description only), `wt-14` (climb line above description), `wt-17` (endgame daemon transaction unscrambled) — re-blessed; both bound non-changes verified (wt-10 carousel entry message stays below description; wt-13 byte-identical); walkthrough chain green twice post-bless at pinned seeds; non-dungeo corpus swept, three pre-existing failures (cloak, fernhill, friendly-zoo) proven identical on a pristine main-baseline worktree build, so not regressions.

## Key Decisions
- **Duplicate `TurnEventProcessor` class (ADR-296 v2 finding 12, the ADR's explicit "or")**: chose the deprecation note over duplicated stamping — zero call sites, and its contexts carry no `transactionId`; stamping dead code invites drift.
- **Registration slot wins over a handler-set `_narrativeSlot`** (pinned by test): per-event slot override is deferred by D3 until a scenario needs it.
- **Transaction grouping is group-reassembly by first occurrence**, not a pairwise comparator — matches D0 rule 3 ("sources render in occurrence order") and makes the never-group rule structural.
- **Phase 4 e2e test is engine-level, not a new test story** — the plan allowed either; engine-level avoids new story-build wiring and stays out of dungeo per the project's test-story isolation rule.
- **Save-format changelog location**: no dedicated file exists; the version-history block in `save-restore-service.ts`'s header is the project's actual convention, so the ADR-296 entry (additive `_transactionId`/`_narrativeSlot` fields, D4 stream reorganization, no version bump) landed there.

## Next Phase
- Plan complete — all 5 phases done. No further phase is defined in `docs/work/prose-order/plan-20260802-adr-296.md`.

## Open Items

### Short Term
- Branch `adr-296-turn-narrative-slots` is not yet PR'd — David to open the PR when ready.
- Three pre-existing, non-dungeo corpus failures were documented in the Phase 5 commit and confirmed identical on a pristine main-baseline worktree (not ADR-296 regressions) — may deserve their own issues: cloak (missing golden recording, no assertion and no recording exists), fernhill (12 transcripts use the removed `[OK: contains_any]` syntax, ADR-294 D2, never migrated), friendly-zoo (wt-02 4th `examine parrot` expects "FEEDING TIME," gets the previous announcement again — turn drift).
- GH #208 is closable once the branch merges to main.

### Long Term
- None surfaced beyond the plan's own scope — the plan's flagged risk (`death-penalty-handler`'s D4 classification producing a fifth affected transcript outside the D8 set) did not materialize; the diff set matched the prediction exactly.

## Files Modified

**world-model** (2 files):
- `packages/world-model/src/world/WorldEventSystem.ts` - `ChainEventOptions.slot` + `_narrativeSlot` stamping on chain-produced phrase events (D3)
- `packages/world-model/tests/unit/world/event-chaining.test.ts` - slot-stamping and default-slot tests

**event-processor** (2 files):
- `packages/event-processor/src/processor.ts` - D4 override/phrase-emission partition on the ADR-106 path
- `packages/event-processor/tests/unit/adr-296-d4-partition.test.ts` - partition semantics tests (new)

**engine** (7 files):
- `packages/engine/src/game-engine.ts` - `processPluginEvents` per-plugin-batch transaction stamping
- `packages/engine/src/turn-event-processor.ts` - action-funnel transaction stamping, data-object creation guard fix, `TurnEventProcessor` deprecation note
- `packages/engine/src/prose-pipeline/stages/sort.ts` - rewritten to slot insertion (hoists + depth comparator deleted; never-group, anchor cluster, collapse, slot insertion, stability, second-anchor guard)
- `packages/engine/src/save-restore-service.ts` - ADR-296 save-format changelog entry
- `packages/engine/tests/unit/adr-296-transaction-stamping.test.ts` - funnel stamping tests (new)
- `packages/engine/tests/prose-pipeline/stages/sort.test.ts` - rewritten per D7 (24 tests)
- `packages/engine/tests/integration/adr-296-trap-scenario.test.ts` - end-to-end trap scenario (new)

**ADR pointer notes** (2 files):
- `docs/architecture/adrs/adr-106-domain-events-and-event-sourcing.md` - D4 narrowing addendum
- `docs/architecture/adrs/adr-094-event-chaining.md` - Amendment A1 closing paragraph (D5)

**Generated docs** (3 files):
- `packages/sharpee/docs/genai-api/engine.md`, `index.md`, `lang.md` - regenerated for new public surface (`ChainNarrativeSlot`, `EventProcessingContext.transactionId`)

**Dungeo goldens** (5 files):
- `stories/dungeo/src/version.ts` - version bump
- `stories/dungeo/walkthroughs/wt-02-bank-puzzle.golden`, `wt-10-tea-room.golden`, `wt-14-royal-puzzle.golden`, `wt-17-endgame.golden` - re-blessed to the D8-predicted diff set

**Project maintenance** (1 file):
- `docs/context/project-profile.md` - refreshed (10 days stale)

## Notes

**Session duration**: ~40 minutes (07:06–07:46 UTC), autonomous end-to-end across all 5 phases.

**Approach**: Executed the pre-written plan phase by phase, one commit per phase, running each phase's specified verification (package test suites, `tsc --noEmit`, then `./repokit build dungeo` / `tsf build --npm` at Phase 4) before moving on; Phase 5's golden re-bless was gated strictly to the D8 predicted-diff set with a hard-abort-on-surprise discipline, and the diff matched exactly on the first run — no abort triggered.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (plan fully executed)
- **Rollback Safety**: safe to revert — branch not yet merged to main (7 commits ahead), working tree clean

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-296 ACCEPTED at v3.1; the 5-phase plan from the prior planning session; clean pre-change build baseline.
- **Prerequisites discovered**: The ADR's explicit "or" on the duplicate `TurnEventProcessor` class needed a decision at implementation time (resolved: deprecation note, see Key Decisions); the save-format changelog's actual location wasn't pinned in plan sources and had to be located during Phase 4 (resolved: `save-restore-service.ts` header).

## Architectural Decisions

- ADR-296 (turn narrative slots) implemented in full — D1 (transaction stamping), D2/D3/D5 (slot insertion sort rewrite), D4 (override/phrase-emission partition), D8 (gated golden re-bless).
- ADR-106 amended with a dated pointer note narrowing the override path to messageId-bearing triggers only.
- ADR-094 Amendment A1 amended with a closing paragraph: the ordering promise is now delivered via slots, not the depth-sort mechanism (retired), while provenance stamps remain.
- Pattern applied: capability/registration-based extension (chain registration declares a slot) rather than ad-hoc type-based hoists — consistent with the project's "extend existing patterns" discipline.

## Mutation Audit

- Files with state-changing logic modified: `WorldEventSystem.ts` (chain dispatch stamping), `processor.ts` (event partition/promotion), `turn-event-processor.ts` + `game-engine.ts` (transaction stamping), `sort.ts` (event stream reordering).
- Tests verify actual state mutations (not just events): YES — tests assert on emitted event `data` fields (`_narrativeSlot`, `_transactionId`, `_chainedFrom`, `messageId`), on rendered block order in the Phase 4 e2e test, and on golden-file byte diffs in Phase 5; mutation-verification findings from Phase 1/2 (override text/params, slot precedence, error payload, primitive-data no-op) were closed inline before those phases were called done.

## Recurrence Check

- NO — no blockers hit this session. The plan itself flagged the D4 override path as a known recurrence risk ("the rug seam," per ADR-157 precedent where override-vs-append regressed silently once before); Phase 1's tests were written specifically to lock that partition semantics as the plan's stated mitigation, and no regression recurred.

## Test Coverage Delta

- Tests added: ~39 new/rewritten test cases across the five phases — Phase 1 (4 world-model + 6 event-processor, plus 3 mutation-verification gap closures), Phase 2 (4 unit + 2 integration), Phase 3 (24 tests in the rewritten `sort.test.ts`), Phase 4 (1 e2e integration test).
- Tests passing before: not separately baselined at session start → after: world-model 1453, event-processor 24, engine 571, stdlib 1587, all green; dungeo unit corpus 1725/114 transcripts, no new assertion-tier failures; walkthrough chain 952/952 green (run twice).
- Known untested areas: none flagged by the plan; the three pre-existing non-dungeo corpus failures (cloak, fernhill, friendly-zoo) are documented gaps unrelated to ADR-296.

---

**Progressive update**: Session completed 2026-08-02 07:47 UTC
