# Session Summary: 2026-08-19 - feat/adr-321-world-index

## Goals
- Implement Phase 2 of the World Index plan: Map and Reach derivation (D4 fixed point, D7 auto-layout).
- Implement Phase 3: Incomplete derivation (vocabulary check, candidate-list heuristic).
- Implement Phase 4: the subprocess JSON contract and failure-state handling (AC-9).

## Phase Context
- **Plan**: docs/work/world-index/plan.md — "Build the World Index feature end to end: a new `packages/world-index` derivation package... a synthetic-corpus timing gate (AC-8); the new World tab in the macOS IDE; and, last, retirement of the superseded `tools/vscode-ext/src/world-explorer.ts`." (ADR-321, ACCEPTED)
- **Phases executed**: Phase 2 — "Map and Reach derivation — the D4 fixed point and D7 auto-layout (AC-1..AC-5)" (Large); Phase 3 — "Incomplete derivation — vocabulary check and candidate-list heuristic (D5, D6, D6b, AC-7)" (Medium); Phase 4 — "Subprocess JSON contract and failure-state handling (AC-9)" (Small)
- **Tool calls used**: 131 this session (state file `toolCalls`), against a combined budget of 750 (400 + 250 + 100) across the three phases
- **Phase outcome**: All three phases completed on budget

## Completed

### Phase 2 — Map and Reach (D4, D7, AC-1..AC-5)
- New modules: `containment.ts` (where a thing sits at start), `statements.ts` (`change`-writer and `move` walks with firing context), `conditions.ts` (tri-state `holdsAtStart`/`canBeFalsified` over `IRCondition`), `reach.ts` (the D4 fixed point over locks and gates together), `map.ts` (D7 compass-grid layout with collision resolution).
- Added `wiredEdges`, `oppositeDirection`, `platformStateHoldsAtStart` to `loader-semantics.ts`.
- AC-1 through AC-5 verified against real story IR compiled fresh each run (Fernhill, The Alderman, Ides of March) — no committed `.ir.json` fixtures pinning a stale compiler.

### Phase 3 — Incomplete (D5, D6, D6b, AC-7)
- New modules: `vocabulary.ts` (the parser's own resolution model) and `incomplete.ts` (noun-phrase extractor, three finding classes, documented stop/boundary lists).
- `deriveNameVocabulary` is imported from `@sharpee/world-model` rather than restated, making `@sharpee/world-model` a runtime dependency of `@sharpee/world-index` (`package.json`, `tsconfig.json` project reference both updated).
- Pinned corpus figures (D6b): Fernhill 20 missing-word / 9 ambiguous / 58 no-object; The Alderman 4 / 0 / 36; Ides of March 7 / 0 / 30.

### Phase 4 — Subprocess JSON contract (AC-9)
- New modules: `document.ts` (the wire contract — `WORLD_INDEX_SCHEMA`, `buildDocument`, `buildFailure`) and `cli.ts` (the `node`-invocable entry point).
- Four failure causes as documents, not stack traces: `usage`, `unreadable-ir`, `malformed-ir`, `internal`.
- `tests/cli.test.ts` spawns the built `dist/cli.js` as an actual child process against a freshly compiled Fernhill IR — real-path per DEVARCH rule 13a, not a stub.

### Verification (this session)
- `pnpm --filter '@sharpee/world-index' test:ci` → "Test Files 5 passed (5)", "Tests 83 passed (83)", 2026-08-19 04:09 local. Breakdown: 21 loader-semantics, 17 Reach, 12 Map, 24 Incomplete, 9 CLI.
- `npx tsf build` from the repo root → "✓ Build complete", run after Phase 4; both `local` and `esm` targets emitted for `@sharpee/world-index`.
- Tests mutation-checked, not just run green: inverting `blocked while` polarity fails both sealed-gate tests; disabling the lock check fails all three AC-2 tests; corrupting one row of the direction-opposites table fails the platform pin; weakening vocabulary coverage from `every` to `some` fails five Incomplete tests.

## Key Decisions

### 1. Gates are directional, locks are not
A blocked-exit line is keyed to one room and one direction, and governs the loader's mirrored exit as readily as an authored one — `wiredEdges` replaced `undirectedExits` for this reason (Fernhill's study gate sits on the mirrored `entrance-hall west`, never authored directly).

### 2. Platform trait state vs. author state
A platform trait state (`boiler is off`) lifts because a standard action can flip it; an author-declared state (`mrs-kettle is guarded`) lifts only because a `change` statement on her own clause moves her out of it. Missing this distinction would have reported Fernhill's greenhouse gate permanently sealed.

### 3. `deriveNameVocabulary` imported, not restated
Writing a private copy of the parser's content-word rule inside a tool whose purpose is "resolve the way the parser resolves" is the exact D3-class error ADR-321 exists to avoid. This makes `@sharpee/world-model` a runtime dependency of `@sharpee/world-index` (cost is low — its only deps are `core` and `if-domain`).

### 4. Two version fields in the wire contract
The document carries a hand-bumped `WORLD_INDEX_SCHEMA` (`world-index/1`) the IDE switches on, separate from `analyzerVersion` (the package version, diagnostics only) — because the package version rides the platform's lockstep release train and would churn the wire version on every release with no wire change.

### 5. Extractor tuning changed by measurement, not taste
`here`/`there` added to the boundary list (locatives end a noun phrase); minimum head length dropped from four letters to three (recovers three-letter IF staples like *tin*, *pot*, *bar* against one junk hit in the whole corpus). Both documented at their constant per D6b.

## Next Phase
- **Phase 5** (CURRENT since 2026-08-19): "AC-8 — synthetic corpus and scale timing" — generate synthetic Chord stories (or direct IR) at 20/40/60/80/100 rooms with a representative lock/key/gate mix, time the Phase 4 CLI against each, and record five timing figures.
- **Tier**: Medium (250 tool-call budget).
- **Entry state**: Phase 2 (Reach fixed point) and Phase 4 (CLI entry point) are both complete, satisfying Phase 5's stated entry condition.
- Exit requires **David's sign-off** on the authoring-speed budget — the ADR sets no number in advance, so this phase ends in a decision, not just a measurement.

## Open Items

### Short Term
- Phase 5 (AC-8) is unstarted; it is the next session's work and cannot proceed to a decision without David.
- Scope is not modelled in the Incomplete view (a generic noun resolves against the whole story, e.g. `wall` in the Study's prose reaches the Folly's wall niche and stays quiet) — a design decision ADR-321 does not make; should be settled before Phase 6 renders the view.
- A verb the boundary list does not name swallows the phrase after it (part-of-speech pass is the documented fix, deferred by D6b); pinned by a test so the loss stays visible.

### Long Term
- ADR-321's quoted figure of "17 missing-word cases" for Fernhill was the prototype's (head-noun model, four-letter head floor, first-visit prose unread); the real, re-measured figures are 20/9/58 (Fernhill), 4/0/36 (The Alderman), 7/0/30 (Ides of March). Worth an ADR-321 amendment when convenient — not done this session.
- Phase 6 (IDE World tab) and Phase 7 (retire `tools/vscode-ext/src/world-explorer.ts`) remain PENDING, gated on Phase 5's timing decision.

## Files Modified

**Modified** (8 files):
- `docs/work/world-index/plan.md` - Phases 2, 3, 4 marked DONE with Outcome sections; Phase 5 advanced to CURRENT
- `packages/world-index/package.json` - added `@sharpee/world-model` runtime dependency
- `packages/world-index/tsconfig.json` - added `../world-model` project reference
- `packages/world-index/src/index.ts` - barrel exports for all Phase 2-4 modules
- `packages/world-index/src/loader-semantics.ts` - added `wiredEdges`, `oppositeDirection`, `platformStateHoldsAtStart`
- `packages/world-index/src/story.ts` - extended for AC-9 failure handling
- `packages/world-index/tests/loader-semantics.test.ts` - extended (14 → 21 tests)
- `pnpm-lock.yaml` - lockfile update for new `@sharpee/world-model` dependency

**New — source** (9 files):
- `packages/world-index/src/containment.ts`, `statements.ts`, `conditions.ts`, `reach.ts`, `map.ts` - Phase 2 (D4 fixed point, D7 layout)
- `packages/world-index/src/vocabulary.ts`, `incomplete.ts` - Phase 3 (Incomplete derivation)
- `packages/world-index/src/document.ts`, `cli.ts` - Phase 4 (wire contract, CLI entry point)

**New — tests** (5 files):
- `packages/world-index/tests/reach.test.ts`, `map.test.ts` - Phase 2 (17 + 12 tests)
- `packages/world-index/tests/incomplete.test.ts` - Phase 3 (24 tests)
- `packages/world-index/tests/cli.test.ts`, `corpus.ts` - Phase 4 (9 tests + shared corpus helper)

## Notes

**Session duration**: started 2026-08-19 03:29 CDT; verification evidence timestamped through 04:09 local (~40 minutes of active development).

**Approach**: fault-injection testing against real compiled story IR (Fernhill, The Alderman, Ides of March) rather than synthetic fixtures, with every green suite mutation-checked before being trusted.

**Verification gap**: nothing is committed yet as of this summary — this is the first commit-eligible point of the session.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (session complete for phases attempted)
- **Rollback Safety**: safe to revert — nothing pushed, no merge to main

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 (loader-semantics module, IR loading, `StoryIRReadError`) was complete entering this session; Phase 2 and Phase 4 completed within this session in turn satisfy Phase 5's entry state.
- **Prerequisites discovered**: Phase 3 required `@sharpee/world-model` as a new runtime dependency (for `deriveNameVocabulary`) — not anticipated in Phase 1's scaffold, added this session to `package.json` and `tsconfig.json`.

## Architectural Decisions

- No new ADR written or amended this session; ADR-321 (ACCEPTED) governs throughout.
- Pattern applied: fault-injection testing against real Chord IR (never committed `.ir.json` snapshots), matching Phase 1's precedent.
- Notable finding worth carrying forward: the parser's WORDS-tier vocabulary match requires *every* content word to resolve against one entity, not a head-noun-plus-modifiers heuristic — three Fernhill Incomplete findings moved once this was modelled correctly (see plan Phase 3 Outcome for the full list).

## Mutation Audit

- Files with state-changing logic modified: N/A — this package is a pure static analyzer (Map/Reach/Incomplete derivation over an IR); it has no persistent state mutations of its own kind. "Mutation" here means fault injection into the analyzer's own decision logic.
- Tests verify actual analyzer behavior under fault injection, not just event/return-value checks: YES (evidence: inverting `blocked while` polarity fails both sealed-gate tests; disabling the lock check fails all three AC-2 tests; corrupting one row of the direction-opposites table fails the platform pin; weakening vocabulary coverage from `every` to `some` fails five Incomplete tests — reported inline in the task context for this session, re-stated here as the session's own verification record).
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this session extended an established plan (Phases 2-4) without hitting a blocker matching a prior session's recorded issue.

## Test Coverage Delta

- Tests added: 69 net new this session (21 loader-semantics [+7 from Phase 1's 14], 17 Reach, 12 Map, 24 Incomplete, 9 CLI, all new).
- Tests passing before: 14 (Phase 1, end of prior session) → after: 83 (evidence: `pnpm --filter '@sharpee/world-index' test:ci` → "Test Files 5 passed (5)", "Tests 83 passed (83)", 2026-08-19 04:09 local).
- Known untested areas: AC-9's third failure case (absent `node` binary) is not testable from inside a Node process — it is IDE-side by nature and belongs to Phase 6. AC-8 (scale timing at 20/40/60/80/100 rooms) is Phase 5, not yet run.

---

**Progressive update**: Session completed 2026-08-19 04:09
