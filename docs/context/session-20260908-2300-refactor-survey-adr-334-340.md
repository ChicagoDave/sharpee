# Session Summary: 2026-09-08 - refactor/survey-adr-334-340 (23:00 CDT)

## Goals
- Phase 10 of `docs/work/refactoring-survey/plan.md`: ADR-336 D3 (`ANALYSIS_PASSES` as data with `requires`), then D2 (`buildEntity` becomes a runner over `ENTITY_LINE_BUILDERS`), byte-identical IR and play after each step.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340, `**Plan Status**: ACTIVE`.
- **Phase executed**: Phase 10 — "ADR-336 D2, D3 — per-line entity builders and the named pass list" (Large, budget 320).
- **Tool calls used**: ~120 / 320 budget.
- **Phase outcome**: Completed under budget.

## Completed
- Session start: audit relayed (clean), core concepts read, gate cleared. Phase 10 stamped CURRENT. Gate scripts and Phase 0 baseline copied from session 13688e's scratchpad.
- **IR gate added** (scratchpad `ir-gate.cjs`): compiles all 74 `.story`/`.chord` files under `packages/chord/tests`, `packages/story-loader/tests`, `branch-stories/` with the built chord dist and an fs import resolver rooted at each file's directory; writes `{ok, diagnostics, ir}` JSON per file plus the sorted diagnostic-code set. Baseline at HEAD `f1fd6cc53`: 74 files, 32 ok, 37 codes; self-check run byte-identical (23:05 CDT).
- **D3 landed** (23:15 CDT): `Analyzer.run` iterates `ANALYSIS_PASSES` (36 entries, `{name, requires, run}`), declared as `Analyzer.PASSES` inside the class (entries call private methods) and exported beside it. Inline blocks became methods moved verbatim: `validateUses` (announce modes now a field), `checkScoringUse`, `createIR` (the IR literal; `builtIR()` asserts it ran), `buildDeclarations` (the declaration switch), `buildPhrasebooks`, `emitImpliedMainBed`, `emitPhraseTables`, `markHatches`, `emitTemperaments`. `analysisPassOrderViolations` is pure. Test `tests/analysis-passes.test.ts` (6 cases): unique names, order satisfies `requires`, every `requires` exists, a reordered copy fails by name, a `requires` naming no pass is reported, a traced `cloak.story` compile runs all 36 once in list order. **AC-3 evidence**: `buildChapters` moved above `buildTimers` in the real list → `expected [ { pass: 'buildChapters', requires: 'buildTimers' } ] to deeply equal []`; reverted (grep: buildTimers 970, buildChapters 972). chord `test:ci`: 76 files, 1142 passing (1136 + 6). `tsc --noEmit` clean. IR gate after D3: IDENTICAL to baseline (74 files, 32 ok, 37 codes). ADR-336 D3 gained an "as built" note.
- **D2 landed** (23:20–23:55 CDT), bottom-up with the IR gate after every move, all IDENTICAL: step A (draft-based `buildEntity`, everything still inline, `assembleEntity` at the end — the one place the entity's wire key order lives), then clauses; states+counters+prose; exits; placement; host-gates; the character block as three builders (character-host gate, character-lines ADR-310, normative-lines ADR-318); identity (proper/pronouns); starts; compositions; playable. `buildEntity` is four lines. Builders resolve through `EntityBuildContext`, a once-built literal of delegations (23 methods + 8 tables), so the analyzer's helpers stay private; `Scope`/`EntitySymbol` are now exported types; `isPersonDecl`/`isPlayableDecl` moved to `entity/context.ts`; `normalizeTopic` to `analyzer/topic.ts` (re-exported, barrel unchanged); `requiresOrderViolations` in `analyzer/requires.ts` serves both lists. Emission order preserved exactly: the DiagnosticBag keeps report order and 162 test assertions index diagnostics by position, so the builder order is the method's old block order, with the kind-admits-line gates as their own builder (`host-gates`) ahead of the resolving builders. Test `tests/entity-line-builders.test.ts` (5 cases): the fourteen names in order, order satisfies `requires`, a reordered copy fails by name, one module per builder each with a convention-shaped header whose purpose text cites no decision, a traced `cloak.story` compile runs all fourteen once per entity in order. **AC-2 evidence**: `starts` moved above `compositions` in the real list → `expected [ { name: 'starts', …(1) } ] to deeply equal []` plus the names test; reverted. chord `test:ci`: 77 files, 1147 passing (1136 + 6 + 5); story-loader 118 files, 1083 (baseline). The IDE testing-surface bundle does not include chord (no alias in `build.mjs`), so nothing regenerates. Analyzer file header rewritten in the convention shape. ADR-336 D2 gained an "as built" note.
- **Gate (23:25–23:27 CDT)**: `./repokit build dungeo` exit 0, bundle 4,397,603 bytes. `compare-gates.sh baseline phase10`: Dungeo chain, seed-1 unit suite, three Chord trees IDENTICAL; chord 77 files 1147; story-loader 1083, lang-en-us 452 at baseline; world-model 1512, character 641, stdlib 1664, engine 685, parser-en-us 328/0 skipped, transcript-tester 314, branch-tester 134 at recorded post-phase counts. IR gate final: IDENTICAL. mutation-verification: clean. Phase 10 outcome recorded in the plan (`docs/work/refactoring-survey/plan.md` line 217); Status DONE.

## Key Decisions
- **Pass list inside the class, exported beside it**: `Analyzer.PASSES` entries close over private methods, which TypeScript permits only lexically inside the class; `export const ANALYSIS_PASSES = Analyzer.PASSES` is the name the ADR and the test use. Alternatives rejected: bracket-access to privates in a module-level list (an escape hatch), or un-privating ~35 methods (scatters the boundary).
- **`createIR` is a pass**: the IR skeleton literal reads tables the early passes fill, so it cannot be built first; keeping it as one verbatim literal preserves JSON key order, which the byte-identical IR gate reads.
- **The AC-3 scratch pair is `buildChapters`/`buildTimers`**: `resolveOverrideGates` does not exist on this branch (GH #359's fix is on `feat/secret-letter-port`).
- **Draft + assembler, not a skeleton the builders fill**: an `IREntity` skeleton cannot take an optional key (`pronouns`, `character`, `landing`, `timerClauses`, `moveClauses`) in mid-position later, and `undefined`-valued keys break `toStrictEqual`/snapshots; so builders write an `EntityDraft` and `assembleEntity` emits the wire literal in key order. The builder order therefore decides diagnostic order only.
- **Builder order = old emission order; host gates are their own builder**: `DiagnosticBag.all()` is report order and tests index by position, so a family builder that both gated and resolved (placement) would have moved its unknown-entity diagnostics ahead of the first-time/exit gates. `host-gates` is the ADR's "gate spanning line kinds", placed after `compositions` (which it reads) and before the resolving builders.
- **Context by delegation, not `implements`**: making ~30 private helpers public to satisfy an interface would scatter the boundary; a once-built literal of delegations names the surface in one place (`EntityBuildContext`).

## Next Phase
- **Phase 11**: "ADR-335 D4, D2, D3 — the alias table, the core's mutable fields, the extension registry" (Medium, budget 220) — PENDING. Deliverable: (a) D4 — `./repokit aliases`/`--check` derives `@sharpee/chord`'s alias catalog from story-loader's curated map, joins `./repokit verify`; (b) D3 — `ExtensionRegistration` gains an `installFromIR` slot, the five extension loader methods move into registry entries, `loader.ts` drops its direct `@sharpee/ext-*` imports; (c) D2 — the runtime header's false "holds no mutable fields" invariant is rewritten to name the real split (re-entrancy guards/per-turn buffers asserted empty per turn, two cross-turn counters) with a `resetAfterRestore` hook — landed before Phase 12 per D6's order so a leaking guard is caught immediately.
- **Entry state**: Phase 0 baseline recorded (independent of Phases 1-10 except the D6 sequencing note above) — satisfied.
- Phase 12 (ADR-335 D1, thirteen runtime-section modules) depends on Phases 1, 10, 11 — all satisfied once 11 lands. Phases 15-16 (ADR-334) remain, explicitly lowest priority and may not be reached.

## Open Items

### Short Term
- I-13688e-1: a package subpath consumed through another package's `.d.ts` needs `typesVersions` (not per-consumer `paths`) under `moduleResolution: node`; `tsc --noEmit` after a package.json-only change can replay stale diagnostics from `tsconfig.tsbuildinfo` — verify with a clean tsbuildinfo. Unchanged this session.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed. Unchanged this session.

### Long Term
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes. Unchanged this session.
- I-7f0471-1 (amended this session): tracks the survey's overall implementation progress against all seven ADRs — DONE through Phases 0-10, 13, and 14; remaining: Phases 11-12, 15-16.
- New (low priority): `resolveOverrideGates` (GH #359's fix) exists only on `feat/secret-letter-port`. When that branch and this one meet, the fix becomes one more `ANALYSIS_PASSES` entry with `requires: ['buildTimers']` — ADR-336 D3's own example (this session's AC-3 evidence used the `buildChapters`/`buildTimers` pair instead, precisely because this fix isn't here yet).
- `devarch items` is not installed in this environment (`Unknown command: items` / not on PATH) — items recorded in prose only this session, per the ledger's documented degradation path.

## Files Modified

**packages/chord** (Phase 10 core):
- `packages/chord/src/analyzer.ts` - `run` iterates `ANALYSIS_PASSES`; nine pass methods extracted verbatim; `buildEntity` is a four-line runner; `entityContext()`; header in convention shape; `Analyzer`, `Scope`, `EntitySymbol` exported (1299 lines touched: +289/-1017 net, file much smaller)
- `packages/chord/src/analyzer/requires.ts`, `topic.ts` - new: the generic `requires` checker; `normalizeTopic` moved
- `packages/chord/src/analyzer/entity/{context,assemble,index,character-host,character-lines,clauses,compositions,counters,exits,host-gates,identity,normative-lines,placement,playable,prose,starts,states}.ts` - new: 14 builder modules + context/assemble/index (17 files)
- `packages/chord/tests/analysis-passes.test.ts`, `entity-line-builders.test.ts` - new (6 + 5 cases)

**Docs/plan**:
- `docs/architecture/adrs/adr-336-chord-analyzer-structure.md` - D2 and D3 "as built" notes (+2 lines)
- `docs/work/refactoring-survey/plan.md` - Phase 10 outcome recorded, Status DONE (+3/-1)

**Build artifact**: `stories/dungeo/src/version.ts` - build stamp (+1/-1)

## Notes
- Open items ledger: `devarch items` not installed in this environment — items recorded in prose only (see Open Items); no degradation to the summary content itself.

---

## Session Metadata

- **Session**: 56bc75
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted on the feature branch `refactor/survey-adr-334-340`; commit happens via `/devarch:finalize` immediately after this summary.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 (ADR-336 D1) done in session 4a2d5f.
- **Prerequisites discovered**: the chord package has no IR corpus gate of its own — the scratchpad `ir-gate.cjs` supplied it (74 files under `packages/chord/tests`, `packages/story-loader/tests`, `branch-stories/`); and `resolveOverrideGates` (the ADR's AC-3 example) is absent on this branch (it lives on `feat/secret-letter-port`), so AC-3's evidence used `buildChapters`/`buildTimers` instead.

## Architectural Decisions

- ADR-336 D2 and D3 each gained an "as built" note (`docs/architecture/adrs/adr-336-chord-analyzer-structure.md`); no new ADR written this session.
- Pattern applied: the `requires` idiom (`packages/chord/src/analyzer/requires.ts`) now serves both the pass list and the builder list, and is the shape ADR-334's `TURN_STAGES` and ADR-335 D1's bind order are expected to reuse (within their own packages — chord has no dependencies on them).

## Mutation Audit

- Files with state-changing logic modified: `packages/chord/src/analyzer.ts`, `packages/chord/src/analyzer/entity/*.ts` (14 builders + context/assemble).
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification agent ran on the changed files this session; clean — every builder write flows through the `EntityDraft` and `assembleEntity` into the IR the existing suite asserts on; the one write outside the draft, synthesized temperament defs in `normative-lines`, is asserted on IR content by `packages/chord/tests/character-declarations.test.ts`). The two new test files (`analysis-passes.test.ts`, `entity-line-builders.test.ts`) are architecture-pin tests (order/trace), graded as such rather than as state-mutation tests.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no blocker this session.

## Test Coverage Delta

- Tests added: 11 (6 `analysis-passes.test.ts` + 5 `entity-line-builders.test.ts`).
- Tests passing before: chord 75 files/1136 → after: chord **77 files, 1147 passing** (+6 analysis-passes, +5 entity-line-builders) (evidence: `compare-gates.sh baseline phase10`, run 23:25–23:27 CDT: Dungeo chain, seed-1 unit suite, and the three Chord trees IDENTICAL to Phase 0 baseline; story-loader 1083, lang-en-us 452, world-model 1512, character 641, stdlib 1664, engine 685, parser-en-us 328/0 skipped, transcript-tester 314, branch-tester 134 all at their recorded post-phase counts). IR corpus gate: 74 files, 32 ok, 37 codes, byte-identical after every move and on the final code (self-check 23:05 CDT, final check within the 23:25–23:27 CDT gate run). `./repokit build dungeo` exit 0, bundle 4,397,603 bytes, same run.
- Known untested areas: unchanged from prior sessions — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor.

---

**Progressive update**: Session completed 2026-09-09 00:30
