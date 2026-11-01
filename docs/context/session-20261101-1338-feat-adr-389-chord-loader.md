# Session Summary: 2026-11-01 - feat/adr-389-chord-loader (CST, started 13:38)

## Goals
- Record David's ruling on I-640 (the D6 story-loader floor after Phase 5) in the ADR and the plan, and close Phase 5.
- Land Phase 6 "validateIR, use-gated construct gates and backstop closure (D4c)" at David's instruction.

## Phase Context
- **Plan**: ADR-389 Chord loader — one identity, validateIR in chord, named build steps, adjective table (`docs/work/adr-389-chord-loader/plan.md`)
- **Phase executed**: Phase 6 — "validateIR, use-gated construct gates and backstop closure (D4c)" (Medium, ~250 budget); closed this write, `plan-phase.sh flip` exit 0: `Phase 6 "validateIR, use-gated construct gates and backstop closure (D4c)" is DONE`. Phase 5 was closed by the earlier checkpoint (committed `e377e74ab`).
- **Tool calls used**: ~205 / 250 for the session (state file `toolCalls`), of which ~19 were the Phase 5 ruling/flip checkpoint
- **Phase outcome**: Completed on budget, with one measured deviation from the Exit state: AC-4's `grep -ci backstop packages/story-loader/src/loader.ts` reads 5, not 3 (rows 2, 5, 9, 16, 28); the ADR's AC-4 was amended with the reason.
- **Out-of-scope changes**: `plan-phase.sh flip` printed 266 `out of scope: <path>` lines, not reproduced here (relayed in the checkpoint report to the main session). The flip diffed against Phase 6's `**Files**` list and counted the whole ADR-390 / Phases 3-6 landing range, so the list includes paths this session did not touch (engine, stdlib, world-model, character, branch-tester, platform-browser, parser-en-us tests, `stories/dungeo`, ADRs 276/327/342/344/388/390, `packages/sharpee/docs`). It also names paths this session did edit that fall outside the Files list: `packages/chord/tests/adr-330-chapters.test.ts`, `packages/chord/tests/validate-ir.test.ts`, `packages/story-loader/src/extensions/chapters.ts`, `expanses.ts`, `sailing.ts`, and the ADR-389 file. Counts by directory: stories/dungeo/src 42, packages/stdlib/tests 38, packages/engine/tests 32, packages/story-loader/src 25, packages/engine/src 19, packages/world-model/tests 14.
- **Demonstrated**: the plan's Phase 6 line carries `[reported by session, unverified: ...]` for the suite counts, tree runs and AC-4 greps (the event log has no passing test row for them) and `verified:` for chord `tsc -p tsconfig.json --noEmit` Build passed at 2026-11-01T20:24:16Z, after the last chord source edit at 20:24:11Z. The plan line was re-marked this write to say so.

## Completed

### I-640 ruling: D6 story-loader floor is 1524
- David ruled 2026-11-01 that the D6 floor is 1524, not 1525: two grammar-alterations backstop tests moved to chord in Phase 5. Issue 640 closed via `issues.sh` (completed) earlier this session. ADR-389 D6 / AC-6 and the plan's standing exit gate line amended.

### Phase 6: use-gated construct gates move into `validateIR` (D4c)
- David's ruling (option a) for the AST-gate class: make the fact reach the IR and gate once in `validateIR`. He also confirmed deleting `packages/story-loader/tests/adr-276-backstops.test.ts` after its two tests moved.
- `packages/chord/src/validate-ir.ts`: new gates for scoring (`scoring-needs-use` once per kind: scores, a rank rung, `award`), chapters (rows and chapter condition), expanses (movement type via `manifestForMovementType`, per-entity "writes expanses vocabulary", clause-body words), sailing (wind/sailing/sails/naval per entity; clause-body words: set wind, set sails, bearing on start/heading, in irons, sails read), extension adjectives (`extension-not-used`, `extension-config-key`, `extension-config-value`, `config-list-host`), `missing-kind-noun`, `exit-non-room`. Clause-body words are found by one generic IR walk, `irNodes`, with nearest-enclosing span. Helpers `HEADER_SPAN`, `irNodes`, `stringField`, `numberField`, `hasOwnField` added.
- `packages/chord/src/analyzer.ts` and `analyzer/entity/*` (compositions, exits, expanse, host-gates, sailing, vehicle): the corresponding analyzer emits deleted (`checkScoringUse` pass, `reportScoringGate`, award gate, three expanses word emits, expanse/vehicle/sailing gates, extension block, `missing-kind-noun`, `exit-non-room`); `buildChapters` early return removed; `requireSailing` keeps only `sailing-not-open`; exits builder now requires compositions and drops folded `exits:` line exits on non-rooms.
- `packages/story-loader/src/loader.ts`: rows 4, 6 (the `gatedConstruct` loop), 11, 19 pure throws deleted; rows 14, 24, 25 re-commented as value-yielding branches refused upstream; rows 2, 9, 16, 28 re-commented as load-time facts (row 2 is a registry drift guard: an unknown `use` name never reaches `ir.uses`). `extension-registry.ts`: `gatedConstruct` slot deleted; `extensions/chapters.ts`, `sailing.ts`, `expanses.ts` lose their implementations (sailing and expanses are now empty registrations that hold registry order).
- Tests: chord `validate-ir.test.ts` +11 cases (D4c block); `adr-330-chapters.test.ts` span re-pinned to the first row. story-loader: `adr-276-backstops.test.ts` `git rm`'d with its two grammar seam cases folded into `adr-389-validate-ir-seam.test.ts`; `rank-ladder`, `extension-install`, `adr-330-chapters`, `adr-359-d1-thing` re-pinned to `createStory`; `use-combat` unknown-use case uses `['combat','foo']`.
- Docs: ADR-389 D4 as-landed note for the third gate group and AC-4 amendment (count 5, with reason); plan Phase 6 Demonstrated line; issue 638 commented (rows closed; row 2 stays; row 5 still pending).

## Key Decisions

### 1. D6 floor is 1524 (I-640)
Tests that move to the layer that now owns the gate do not count against the loader floor. Ruled by David, 2026-11-01.

### 2. AST-level use gates reach the IR (option a, #638)
The `use`-gated constructs the analyzer used to refuse by reading the AST are lowered either way and refused once in `validateIR`, so compile and load share one rule. One inventory row (2) could not move: it is a drift guard between the analyzer's and loader's registries, not an IR fact, so it stays as a loader throw and AC-4's backstop count is 5. Ruled by David, 2026-11-01.

## Next Phase
- **Phase 7**: "Core adjective table (D3)" — `CORE_TRAIT_ROUTES` replaces the 41-arm switch in `applyTraitAdjectives`; unmatched word is a LoadError naming the word; two bidirectional assertions in `manifest-conformance.test.ts` against chord's `TRAIT_ADJECTIVES`; the four route-table `unknown` casts become typed writes and AC-5's grep must then print nothing.
- **Tier**: Medium (~250 tool-call budget)
- **Entry state**: Phase 6 committed; David's go. Platform change: discussion with David first per the plan's D7 line.
- `plan-phase.sh advance` was deliberately not run in this write, per the invoker (Phase 7 waits for David's go); `commit-local` may run it after the phase commit, which is not the same as David's go.

## Open Items

### Short Term
- 638: ADR-389: Chord loader — one identity, validateIR in chord, named build steps, adjective table, typed Story/Parser seam (carried; row 5 ruling pending, Phases 7-10 remain)

### Long Term
- None new this session.

## Files Modified

**chord source** (8 files):
- `packages/chord/src/validate-ir.ts` - D4c gates, `irNodes` walk, helpers, header
- `packages/chord/src/analyzer.ts` - scoring/award/expanses/chapters analyzer emits removed
- `packages/chord/src/analyzer/entity/compositions.ts`, `exits.ts`, `expanse.ts`, `host-gates.ts`, `sailing.ts`, `vehicle.ts` - gates and emits removed; exits requires compositions

**chord tests** (2 files):
- `packages/chord/tests/validate-ir.test.ts` - +11 D4c cases
- `packages/chord/tests/adr-330-chapters.test.ts` - span re-pinned

**story-loader source** (5 files):
- `packages/story-loader/src/loader.ts` - rows 4, 6, 11, 19 deleted; rows 2, 9, 14, 16, 24, 25, 28 re-commented
- `packages/story-loader/src/extension-registry.ts`, `extensions/chapters.ts`, `extensions/expanses.ts`, `extensions/sailing.ts` - `gatedConstruct` removed

**story-loader tests** (7 files):
- `packages/story-loader/tests/adr-276-backstops.test.ts` - deleted (staged `git rm`)
- `adr-389-validate-ir-seam.test.ts`, `adr-330-chapters.test.ts`, `adr-359-d1-thing.test.ts`, `extension-install.test.ts`, `rank-ladder.test.ts`, `use-combat.test.ts` - re-pinned or extended

**Docs** (3 files):
- `docs/architecture/adrs/adr-389-chord-loader-one-identity-and-a-build-list.md` - D6/AC-6 floor 1524; D4 as-landed note; AC-4 amended
- `docs/work/adr-389-chord-loader/plan.md` - Phase 5 and Phase 6 Demonstrated lines, both phases flipped DONE by script
- `docs/context/session-20261101-1338-feat-adr-389-chord-loader.md` - this summary

## Notes

- Closed this session by the invoker: I-640 (ruling). Not closed again here; no issue closed by this write.
- Phase 5's code is committed `dad0f5f5d`; its phase close is `e377e74ab`. Phase 6's work is uncommitted at write time and ships in the next commit.
- Out of scope, untouched: `docs/context/archive/session-20261029-1923-main.md` (modified by a prior session) and `docs/work/save-restore-551/` (untracked). `docs/context/session-20261101-0702-feat-adr-389-chord-loader.md` is a duplicate progressive file awaiting David's deletion confirmation; not touched.
- Reported by the invoker, not corroborated by the event log `[reported by session, unverified]`: chord 1779 passing in 111 files (was 1768); story-loader 1524 passing / 1 skipped in 191 files (floor 1524); `./repokit build` exit 0; AC-4 greps (gatedConstruct empty, backstop 5, each moved code one emit site in `validate-ir.ts`); fixture census identical; tree runs vs `docs/work/adr-389-chord-loader/baseline/`: secret-letter byte-identical (exit 1, same failing cards), ides-of-march byte-identical, fernhill identical except one wall-clock field (1.1s to 1.0s). Verified from the event log: chord `tsc -p` Build passed 2026-11-01T20:24:16Z (fresh after the last chord edit). The story-loader `tsc --noEmit` pass at 20:20:47Z predates later story-loader test edits (20:22:19Z), so it is also reported, not verified, for the final tree.
- Rule 15 `mutation-verification` not fired (no edited function matches the name signal; `validateIR` is pure and the loader edits delete guards). No rule 12 Behavior Statement (no side-effect function changed).

**Session duration**: ~1 hour at this checkpoint

**Approach**: Record the floor ruling, flip Phase 5; then per David's option-a ruling move each remaining AST-level gate to a fact in the IR plus one `validateIR` emit, delete the loader's duplicate throws and the registry slot, and re-pin tests to the compile-seam entry point.

---

## Session Metadata

- **Session**: 73b023
- **Status**: IN-FLIGHT
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert
- **Commits**: `e377e74ab` (Phase 5 close, landed this session) — this write is staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261101-1338-feat-adr-389-chord-loader.md`

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 5 committed; David's I-640 ruling; David's option-a ruling and deletion confirmation for Phase 6.
- **Prerequisites discovered**: row 5 ruling (#638) still pending; not blocking Phase 7.

## Architectural Decisions

- ADR-389 D4 (third gate group as-landed), AC-4 (backstop count 3 to 5, with reason), D6 / AC-6 (floor 1524); ADR-276 D1 amended earlier in Phase 4.
- Pattern applied: gate once in `validateIR` over the IR, one emit site per code; loader keeps only value-yielding branches and load-time facts.

## Mutation Audit

- Files with state-changing logic modified: `packages/chord/src/validate-ir.ts` (pure), analyzer builders (gate emits removed), `packages/story-loader/src/loader.ts` (guards deleted)
- Tests verify actual state mutations (not just events): N/A — no side-effect function added; the new gates are pure diagnostics asserted on codes, spans and counts in `validate-ir.test.ts` `[reported by session, unverified]`

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 11 in chord `validate-ir.test.ts`; two grammar seam cases moved from the retired `adr-276-backstops.test.ts` into `adr-389-validate-ir-seam.test.ts`
- Tests passing before: chord 1768, story-loader 1524 / 1 skipped → after: chord 1779, story-loader 1524 / 1 skipped `[reported by session, unverified]`
- Known untested areas: row 5 (ruling pending); row 2 drift guard is a loader throw covered only by `use-combat` unknown-use case

---

**Progressive update**: checkpoint 2026-11-01 13:54 — Phase 5 flipped DONE through plan-phase.sh after David's I-640 ruling (floor 1524); ADR-389 and plan amended; Phase 6 next.
**Progressive update**: checkpoint 2026-11-01 14:38 — Phase 6 (D4c) flipped DONE through plan-phase.sh (exit 0; advance not run per invoker); gates moved into validateIR, gatedConstruct slot and adr-276-backstops test deleted; Phase 7 next.
