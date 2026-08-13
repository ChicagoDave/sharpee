# Session Summary: 2026-08-12 - feat/adr-312-cli-test-recording (CDT)

## Goals
- Plan ADR-312's implementation.
- Resolve contradictions plan-review found in ADR-312 before touching code.
- Investigate a tree-corruption worry David raised along the way.

## Phase Context
- **Plan**: `docs/work/adr-312-cli-test-recording/plan.md` — "Relocate record-time assertion synthesis into @sharpee/branch-tester; retire the two stale comments; flip ADR-307's status note" (Phase 1) plus 4 further phases, ~1400 tool calls total.
- **Phase executed**: None. Phase 1 remains `CURRENT (since 2026-08-12)`, unstarted — the session's tool calls went into ADR design and investigation, not implementation.
- **Tool calls used**: 199 / 250 (Phase 1's Medium-tier budget; 70% banner fired at 175/250, acknowledged, work continued as ADR drafting, not new sub-tasks).
- **Phase outcome**: Not attempted. `/devarch:plan-review` on the just-written plan found 3 CONTRADICTIONs + 2 TENSIONs before any code was touched; David chose to resolve the design first.

## Completed

### ADR-312 deleted, not amended
Two of the three CONTRADICTIONs traced to one root: ADR-312's Decision 3 ("synthesis has exactly one spelling") was unsatisfiable without editing the `Assertion[] → TreeAssertions` conversion (`recordedTurnAssertions`/`openingDefaultClaims`), which lives only in `tools/ide/web/testing-surface/src/compose.ts` — confirmed by grep matching nothing under `packages/`. David's call, once he saw the design: the command-list-injection approach "was literally a bad idea in every sense." `git rm docs/architecture/adrs/adr-312-recording-tests-from-the-command-line.md` (recoverable at `a5e6f21b`); `docs/architecture/adrs/adr-312-a-bad-decision.md` now holds a single heading, `# ADR-312: A bad decision without any trace of its record`, so the number is occupied by its own epitaph.

### Tree-corruption investigation
Read the read/write paths in the testing surface and found a silent total-loss path: `main.ts:807-820` degrades a `malformed` document to a fresh empty tree with no notice and no write-lock (`refused` documents do get a write-lock; malformed ones don't), and `update()` at `main.ts:352-361` posts the whole document on every change — so one damaged byte plus one typed command destroys the suite. `model.ts:736-738` confirms this is deliberate design, not a bug: "a run fails it by name; deleting your last claim is a visible choice, never silent." This finding fed directly into ADR-313's "malformed never silently replaced" decision.

### ADR-313 written (DRAFT)
`docs/architecture/adrs/adr-313-tree-second-serialization.md` — "The Tree's Second Serialization: Authoring Tests Outside the IDE." 13 decisions, 5 open questions. David's reframing of the problem: tree ↔ JSON round-trip is proven; tree ↔ author-editable-file has never been built. Key decisions: lossless projection, whole-tree not per-line (`flattenTreeLines` derives parentage from nesting, so line-level editing can't preserve it), JSON stays canonical, the projection carries claims (not just commands), malformed documents are never silently replaced. Amends ADR-307 three times.

### Mock format + adversarial test pass
`docs/work/adr-313-second-serialization/mocks/` (README + 5 mock files), built off the real `branch-stories/fernhill/fernhill.tests.json`. A throwaway parser/serializer was written to the scratchpad (`candidate-a.js`, `run-adversarial.js`) and run against the mock catalogue: **37 passing, 1 failure reported by the session** `[unverified — no event-log corroboration; ad-hoc scratchpad script, not the project test suite]`. The one failure was diagnosed as a wrong assertion in the harness itself, not a parser defect, and was not re-run (no-auto-retry rule). Round-trip closed both directions; emitted text was byte-identical to the hand-written mock.

### Empirical CLI runs against the real fernhill project
`node packages/devkit/dist/cli.js test` runs settled a disagreement between David and Claude about what a claim-stripped card does. Baseline: 8 cards / 16 assertions green `[reported by session, unverified — no event-log test/build row for this session]`. A claim-stripped **turn** card fails by name, `break`s the line, and blocks descendant branches — costing 5 of 8 cards. A claim-stripped **opening** card passes, because opening cards never become commands (`tree-walker.ts:574-578`). David's screenshot showed an opening card; Claude's prior code-reading was right for turns and wrong for openings. Mid-session, David's live IDE was observed rewriting `fernhill.tests.json` under these experiments — a live instance of the two-writer window ADR-313 is meant to close.

### ADR-314 written (DRAFT)
`docs/architecture/adrs/adr-314-content-coverage-reports.md` — "Content Coverage Reports: Checking What the Story Has." 12 decisions, 6 open questions. Promotes `docs/work/testing/design-testing-play-surface.md` §14 (captured 2026-08-09, never ruled on). Content is a report, not a test; three checks, the third defined as a subtraction (David's formulation) that splits by portability so only the noun filter needs Apple's NLTagger. Four of David's rulings folded in during writing: findings group into cards (presentation only, not `TreeCard` — Claude's first draft conflated the two and was backed out); `declared(S)` is room-scoped via `WorldModel.evaluateScope()` so the report's referable-here matches the runtime's; corpus is "all prose the player can read," which forces a second source (Chord AST/IR) beyond the manifest.

### New standing rule — no ADR references in error messages
David: error messages should be self-documenting, not point at an ADR number. Quantified: 115 such strings across 15 packages, worst offenders `transcript-tester` (36), Chord parser/analyzer diagnostics (27), `devkit` (11). Saved to memory (`feedback_no_adr_refs_in_error_messages.md`). Sweep **not performed** — deferred, needs its own pass.

### Plan supersession (rule 18b)
`docs/work/character-in-chord/plan.md` stamped `**Superseded by**: docs/work/adr-312-cli-test-recording/plan.md (2026-08-12)` with every phase left untouched — David's explicit "still live" disposition; ADR-310 work parked until 2026-08-15. `.current-plan` repointed to the new plan.

## Key Decisions

### 1. Delete ADR-312 rather than amend it
Once the injected-command design was shown to require an edit its own Implementation section forbade, David judged the design itself unsound rather than patchable. The ADR number stays retired with a one-line epitaph file rather than being reused or silently vacated.

### 2. Whole-tree projection, not line-based
`flattenTreeLines` derives parentage from visual nesting; a per-line diff format can't preserve tree structure under edits. ADR-313 commits to whole-document projection instead.

### 3. Malformed documents are never silently replaced
Directly derived from the corruption investigation. The existing "delete your last claim is a visible choice, never silent" principle (`model.ts:736-738`) is extended to the new projection format as an explicit ADR-313 decision.

### 4. Content coverage findings are presentation, not domain model
David backed out Claude's first instinct to reuse `TreeCard` for coverage findings — grouping findings into cards is a display concern, not a new tree-domain type.

## Next Phase
- Plan `docs/work/adr-312-cli-test-recording/plan.md` is now stale from Phase 2 onward — it was built on the deleted ADR-312 design, and its directory name points at a dead ADR number.
- Phase 1 (relocating the synthesis conversion into branch-tester) survives intact and is carried forward into ADR-313 Decision 7.
- The actual next step is not a plan phase: it is resolving ADR-313's open questions, starting with Q-1 (projection syntax), likely via `/devarch:adr-interview` once David is ready — not yet asked this session, per rule 11a ("do you want to start the open questions interview now?" was not posed).

## Open Items

### Short Term
- ADR-313 Q-1 (projection syntax) is the oldest open blocker — nothing downstream is implementable until it resolves.
- `docs/work/adr-312-cli-test-recording/plan.md` needs re-planning or renaming once ADR-313/314 land (it currently references a deleted ADR).
- 115-message ADR-citation sweep across 15 packages remains unstarted.

### Long Term
- ADR-310 (character-in-chord) parked until 2026-08-15 per David.
- ADR-308 interview still unstarted (carried from prior sessions).
- ADR-313 and ADR-314 each carry their own open-questions interviews once ready.

## Files Modified

**ADRs** (4 files):
- `docs/architecture/adrs/adr-312-recording-tests-from-the-command-line.md` - deleted (`git rm`; recoverable at `a5e6f21b`)
- `docs/architecture/adrs/adr-312-a-bad-decision.md` - new, one-line epitaph occupying the retired number
- `docs/architecture/adrs/adr-313-tree-second-serialization.md` - new, DRAFT, 13 decisions / 5 open questions
- `docs/architecture/adrs/adr-314-content-coverage-reports.md` - new, DRAFT, 12 decisions / 6 open questions

**Plans** (2 files):
- `docs/work/adr-312-cli-test-recording/plan.md` - new, written by session-planner (now stale from Phase 2 on)
- `docs/work/character-in-chord/plan.md` - stamped `Superseded by` per rule 18b, phases untouched
- `docs/context/.current-plan` - repointed to the new plan

**Mocks/scratchpad** (7 files, non-source):
- `docs/work/adr-313-second-serialization/mocks/{README.md,01-05 mock files}` - projection format mocks built off real fernhill data
- scratchpad `candidate-a.js`, `run-adversarial.js` - throwaway parser/serializer used for the adversarial test pass, not committed

**Memory** (2 files, outside repo):
- `~/.claude/projects/.../memory/MEMORY.md`, `feedback_no_adr_refs_in_error_messages.md` - new standing rule recorded

No files under `packages/` were touched this session.

## Notes

**Session duration**: ~5.5 hours (22:24 session start to ~00:39 last ADR edit, per event log).

**Approach**: Planning surfaced its own contradictions via `/devarch:plan-review` before any code was written; the session pivoted entirely into ADR design, an empirical corruption investigation, and adversarial testing of a mocked file format — no `packages/` source was touched, consistent with the platform-changes-need-discussion-first rule.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Three DRAFT ADRs (312's replacement design lives in 313; plus 314) with open questions unresolved — nothing is implementable until ADR-313 Q-1 (projection syntax) and the rest of its open-questions interview resolve (rule 11a).
- **Blocker Category**: Architecture
- **Estimated Remaining**: ~2-3 sessions (ADR-313 interview + review, ADR-314 interview + review, re-plan of the CLI-recording work under the new design) before implementation can start.
- **Rollback Safety**: safe to revert — no `packages/` changes; the deleted ADR-312 is recoverable at `a5e6f21b`.

## Dependency/Prerequisite Check

- **Prerequisites met**: Real fernhill project data (`branch-stories/fernhill/fernhill.tests.json`) was available to ground both the mocks and the empirical CLI runs.
- **Prerequisites discovered**: ADR-312's design depended on code (`compose.ts`'s assertion synthesis) living somewhere other than where it actually lives — this gap is what triggered the plan-review contradictions and the eventual redesign.

## Architectural Decisions

- ADR-312: deleted — command-list-injection design judged unsound (David: "a bad idea in every sense"); number retired with an epitaph file.
- ADR-313 (DRAFT): "The Tree's Second Serialization" — whole-tree lossless projection, JSON stays canonical, malformed documents never silently replaced; amends ADR-307 three times.
- ADR-314 (DRAFT): "Content Coverage Reports" — content checks are reports, not tests; third check is a subtraction split by portability; promotes `design-testing-play-surface.md` §14.
- New standing rule (memory, not an ADR): no ADR references in user-facing error messages; 115 instances across 15 packages found, not yet swept.

## Mutation Audit

- Files with state-changing logic modified: none — session was ADR/plan/mock authoring only, plus a throwaway scratchpad script.
- Tests verify actual state mutations: N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — the tree-corruption investigation reproduces the pattern noted in `project_context_archive_is_dataset` / prior sessions around silent-loss risk in single-writer assumptions; also structurally similar to the two-writer window called out mid-session (David's live IDE rewriting `fernhill.tests.json` during the CLI experiments) — both are instances of the same "two writers, one file, no lock" class ADR-313 is scoped to close.
- If YES: ADR-313 itself is the systemic fix in progress; no separate audit needed beyond finishing that ADR.

## Test Coverage Delta

- Tests added: 0 (no project test suite changes this session)
- Tests passing before: N/A → after: N/A — no event-log test/build rows this session (confirmed: `.devarch-events-787eea.jsonl` has zero `kind:"test"` or `kind:"build"` entries)
- Known untested areas: the adversarial mock-format pass (37/1 reported) and the fernhill CLI baseline (8 cards/16 assertions reported) were both real runs but are `[reported by session, unverified]` — neither is corroborated by the session event log, since both used ad-hoc scripts / manual CLI invocation outside the hook-tracked test path.

---

**Progressive update**: Session completed 2026-08-12 19:44
