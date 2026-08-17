# Session Summary: 2026-08-15 - feat/adr-310-318-implementation

## Status: COMPLETE

## Goals
- Record David's ruling: Phase 7 owns the polished Chord Writer "explain this NPC's turn" panel.
- Formally close Phase 2 of the ADR-310/318 plan; start Phase 3 (Chord grammar — ADR-310 descriptive constructs).
- Execute Phase 3 to completion (nine sub-steps) — DONE this session; Phase 3 closed in plan.md.

## Completed
- Phase 2 closed DONE in `docs/work/adr-310/plan.md` with evidence and the ownership ruling recorded; Phase 3 stamped CURRENT (since 2026-08-15).
- Phase 3 survey complete: ADR-310 (all grammar decisions D2–D10, D13, D14) + contracts.md re-read; chord compiler mapped — `parseCreate`/`parseCompositionLine` (parser.ts:1073/1370, multi-word compositions like `very honest` already tokenize), one condition grammar (`parseCondition` parser.ts:4685, predicates is/is-a/is-in/has/holds/wears/can), `define` dispatch (parser.ts:1832), closed vocabulary in catalog.ts + generated stdlib-manifest.ts (ADR-276, `repokit manifest` + freshness gate), manifests are pure data (manifests/types.ts), IR carries per-entity compositions/config (`IREntity`, ir.ts:179).
- Phase 3 design questions identified for David (vocabulary plumbing, IR wire shape, AC1 round-trip test home) — presented in-session before any chord edits; David approved all three calls ("proceed").
- **Sub-step 1 complete (2026-08-15)**: (a) world-model `character-vocabulary.ts` gained data-only runtime arrays for the descriptive lists (PERSONALITY_TRAITS, INTENSITY_WORDS, DISPOSITION_WORDS, MOODS, THREAT_LEVELS, FACT_SOURCES, CONFIDENCE_WORDS, RESISTANCE_MODES, COGNITIVE_DIMENSIONS) + drift tests (78 passing); dist + dist-esm rebuilt. (b) `repokit manifest` now generates a second module `packages/chord/src/character-manifest.ts` (CHARACTER_MANIFEST: 57 vocabulary words, 8 presets, kebab-keyed preset dimensions from character's `COGNITIVE_PRESETS`); freshness gate covers both modules; `./repokit manifest --check` green; stdlib-manifest byte-identical. (c) chord IR wire shapes landed: `IREntity.character?: IRCharacter` (personality/mood/feels/knows/thinks/profile — words never numbers), `StoryIR.facts?: IRFactDef[]`; profile *definitions* deliberately don't reach the wire (D4 compile-time completion inlines them); spreads/goals/influences shapes join with their grammar sub-steps. chord 740 passing, repokit 80 passing.
- **Sub-step 2 complete (D2 — personality adjectives)**: analyzer `routeCharacterComposition` routes bare person compositions matching the manifest into `character.personality` (word + intensity, as written); consumed words never reach traits/parser vocabulary; diagnostics: unknown-personality-word (intensity-led), personality-person-only/-player/-config/-conditional/-duplicate; story-defined traits shadow personality words. 11 tests.
- **Sub-step 3 complete (D3 — mood/feels/knows + change transitions)**: parser branches (`mood`, `feels` with longest-match dispositions + structural fallback, `knows` with raw comma slots), AST `moods/feels/knows` on CreateDecl (golden AST snapshots refreshed — additive-only, 75 insertions), analyzer gates (person-only/player, unknown-word with vocabulary, duplicates, order-free knows slots, knows-missing-source), new IR statements `change-mood`/`change-feeling` (mutations in phase-order; has-model gate deliberately deferred to the loader — dynamic `it`). chord 762 passing (22 in character-declarations.test.ts).
- **Sub-step 4 complete (D14 — define fact + thinks)**: `define fact` block (parser + AST + Declaration union), fact table built before entities (`buildFacts`, canonical values: entity IDs or literal words), `thinks <fact> is <value>[, slots]` create-line, shared knows/thinks slot classifier, `StoryIR.facts` optional emission. Diagnostics: duplicate-fact, fact-empty, fact-value-duplicate, unknown-fact (+suggestion), unknown-fact-value (AC6 misspelled value), theory-of-mind (AC6 — mental verb in knows topic or thinks fact ref), thinks-duplicate. chord 770 passing; AST snapshots refreshed again (additive `thinks: []`, 100 insertions 0 deletions total).
- **Sub-step 5 complete (D4/D5 — cognitive profiles)**: `define profile` block (partial rows complete from `clear-headed` at compile), `cognitive-profile <name> [with <dim> <value> and …]` rides the existing composition-config grammar (analyzer-routed, no new parse); preset shadowing refused; diagnostics unknown-profile/-dimension/-dimension-value, profile-duplicate/-row-duplicate/-conditional. chord 776 passing.
- **Sub-step 6 complete (D10 — spreads)**: `spreads nothing` | `spreads [<topics>] [chatty] to <audience>[, except …]`; `PROPAGATION_AUDIENCES` runtime array added to character package (dist+esm rebuilt), audiences slice added to the generated manifest (60 words now); `IRSpreads` on the wire; diagnostics parse.spreads-* (incl. `mute` fix-it), analysis.unknown-audience/spreads-duplicate/spreads-topic-duplicate. chord 780 passing; snapshots additive-only again.
- **Sub-step 7 complete (D8/D9 — goals + influence/resists)**: `goal <name>, <priority> … end goal` (active-when with `it` = owner, eight step verbs per ADR-145 shapes: seek [in], acquire, wait for <condition>, move to, act/say <phrase-key> [to], give … to, drop [in]); `influence <name>, <mode>, <range> … end influence` (order-free header slots, `clouds focus` / `makes mood|threat <word>` / `phrase <key> on witnessed|resisted`); `resists <name>[, except from <ref>]` (classifier vs entity by article); cross-entity dead-resists check (`analysis.unknown-influence`, post-build); GOAL_PRIORITIES/INFLUENCE_MODES/INFLUENCE_RANGES runtime arrays added to character package (dist+esm rebuilt), manifest at 69 words. chord 783 passing; snapshots additive-only.
- **Sub-step 8 complete (D13/D16 — entity-scoped predicates + phrasebook specificity)**: `feels <disposition> toward <entity>` and `knows <topic>` predicates in the one condition grammar (new IR kinds `feels`/`knows-topic`; `feels`/`knows` joined PHRASE_STOPS); mood/threat words admitted as `is` values (entity's own declared state wins the word on collision); `IRPhrasebook.specificity: 'character'` stamped when a `while` gates interior state (loader's D16 arbitration marker); `analysis.phrasebook-tie` refuses two character-scoped books that could be active together for the same speaker (single same-axis different-word `is` pairs are provably exclusive and pass). Exhaustive-switch fixes in conditionReferencesIt/conditionFingerprint. chord 789 passing, no snapshot churn.
- **~60-min session-checkpoint (rule 16)**: no drift, no orphaned artifacts, no new blockers; flagged the Files Modified gap in this file (fixed below) and suggested raising the custom-vocabulary syntax question before sub-step 9 — actioned (check-in to David; three-option write-up delivered; **David ruled Option 2**).
- **Sub-step 9 complete (Option 2 custom vocabulary + AC1 harness + thealderman port)**:
  - `define personality <name>` and `define mood <name> like <mood>[, but <modifier>]` (modifiers restless/stiller/darker/brighter; `MOOD_MODIFIERS` + `applyMoodModifier` in world-model — runtime owns the step sizes; manifest at 73 words); custom words join every compile-time vocabulary check (mood lines, change-mood, is-values, D16 classification, makes-mood, personality routing); shadow/anchor/modifier diagnostics. contracts.md §7 updated with the ruling.
  - `applyCompiledCharacter` in `@sharpee/character` (new `@sharpee/chord` dependency — rule 8b direct type import): drives the normalized CharacterBuilder from IRCharacter + story custom vocabulary; `knows()` gained `source?: FactSource` (the witnessed-boolean collapse couldn't express `told`); `GoalDef.activeWhenCompiled` + `WaitForStep.conditionCompiled` carry IR conditions typed (Phase 5 evaluator wiring); resist-excepts canonicalized as `from a <classifier>` / `from <entity-id>` strings.
  - AC1 round-trip: 13 tests in `packages/character/tests/roundtrip/compiled-roundtrip.test.ts` — per construct, compiled-Chord-applied trait vs independently built builder output (personality/custom mood axes/dispositions/knowledge/factBeliefs/profile/propagation/goals/influences/resists + baselineMood).
  - thealderman descriptive layer authored at `stories/thealderman/chord/thealderman.story` (D18 incremental port home): six suspects translated from ConversationBuilder source with documented translation rules; compiles clean and applies through the real seam (4 tests in `thealderman-port.test.ts`). **Port findings — no Chord surface yet for**: propagation pace/coloring/withholds; goal turn-count waits (ADR-316); opportunistic/prepared modes, interruptedBy, per-step witnessed; influence schedules/lingering/disposition/propagation effects; non-`from` resist-excepts; mood-trigger chains. Flagged in the story-file header, carried to Phases 4/6/ADR follow-up.
  - story-loader `evaluator.ts`: the two new IRCondition kinds (`feels`, `knows-topic`) gained loud not-yet-wired `LoadError` cases (exhaustive switch; refuse loudly, never silent-false).
- **Final verification (2026-08-15)**: chord 792 passing; character 369 passing; world-model character-model 78 (incl. drift tests); repokit 80 passing; `npx tsc --noEmit` clean; **`pnpm exec turbo run test:ci` 65/65** (after the story-loader fix; first run failed 41/45 on exactly that exhaustiveness error). dist + dist-esm rebuilt for world-model, character, chord (the dist-esm staleness trap bit once — chord's ESM build was stale for vitest until rebuilt).
- **Phase 3 closed DONE in plan.md** with evidence and the port-findings list; Phase 4 (normative constructs) remains PENDING, entry state satisfied.

## Key Decisions
- **Chord Writer readout ownership (David, 2026-08-15)**: the polished "explain this NPC's turn" IDE panel rides Phase 7 on this branch — not the parallel IDE session.
- **Phase 3 design calls (David approved "proceed")**: (1) character vocabulary reaches chord via a second generated manifest module (`repokit manifest`, freshness-gated) — never hand-copied; (2) IR carries words, never numbers; `define profile` inlines at compile (no wire presence), `define fact` reaches the wire; (3) AC1 round-trip tests live in `packages/character` against the `applyCompiledCharacter` seam the Phase 5 loader will call.
- **Custom-vocabulary syntax (David, 2026-08-15): Option 2** — `define mood <name> like <mood>[, but <modifier>]` with the four closed modifiers; anchor must be a platform mood; recorded in contracts.md §7.
- Vocabulary-driven parsing is allowed where structure is ambiguous (two-word dispositions before bare proper names) — the `starts <state>` precedent; the parser stays vocabulary-free everywhere else.
- D16's compile-time tie rule: two character-scoped phrasebooks sharing a speaker error unless provably exclusive (single same-axis different-word `is` pairs); `IRPhrasebook.specificity` carries the classification for the loader's arbitration.

## Open Items
- Carried: stale plans `adr-280-chord-writer-project-model` + `live-derived-state` undispositioned; 23 stranded event logs.
- Carried: N1–N3 thealderman scene slots await David's pick (Phase 6 blocker only).
- Carried: "proxy signal standing in for the real property" systemic audit flag untracked.

## Files Modified

**Docs** (3): `docs/work/adr-310/plan.md` (Phase 2 DONE + ruling; Phase 3 CURRENT → DONE + evidence); `docs/work/adr-310/contracts.md` (§7 Option 2 ruling); this session file (new).

**`@sharpee/world-model`** (2): `src/traits/character-model/character-vocabulary.ts` (runtime word arrays: PERSONALITY_TRAITS, INTENSITY_WORDS, DISPOSITION_WORDS, MOODS, THREAT_LEVELS, FACT_SOURCES, CONFIDENCE_WORDS, RESISTANCE_MODES, COGNITIVE_DIMENSIONS; MoodModifier + MOOD_MODIFIERS + applyMoodModifier); `tests/unit/traits/character-model.test.ts` (drift tests).

**`tools/repokit`** (2): `src/commands/manifest.ts` (character-manifest generation, both-module freshness gate); `src/commands/verify.ts` (message).

**`@sharpee/chord`** (9): `src/character-manifest.ts` (NEW, generated — 73 words, 8 presets); `src/ast.ts`, `src/parser.ts`, `src/analyzer.ts`, `src/ir.ts`, `src/index.ts` (the full Phase 3 grammar per sub-steps 2–9); `tests/character-declarations.test.ts` (NEW, 52 tests); `tests/__snapshots__/{parser,parser-phase-b,parser-each-package}.test.ts.snap` (additive-only refreshes).

**`@sharpee/character`** (12): `package.json` (+`@sharpee/chord`); `src/apply-compiled.ts` (NEW — the loader seam); `src/index.ts`; `src/character-builder.ts` (`knows()` source parity); `src/goals/goal-types.ts` + `src/goals/builder.ts` + `src/goals/index.ts` (GOAL_PRIORITIES, activeWhenCompiled/conditionCompiled); `src/influence/influence-types.ts` + `src/influence/index.ts` (INFLUENCE_MODES/RANGES); `src/propagation/propagation-types.ts` + `src/propagation/index.ts` (PROPAGATION_AUDIENCES); `tests/roundtrip/compiled-roundtrip.test.ts` (NEW, 13 tests) + `tests/roundtrip/thealderman-port.test.ts` (NEW, 4 tests).

**`@sharpee/story-loader`** (1): `src/evaluator.ts` (loud not-yet-wired cases for `feels`/`knows-topic`).

**Stories** (1): `stories/thealderman/chord/thealderman.story` (NEW — D18 incremental port home, descriptive layer for all six suspects + translation rules + expressiveness-gap register).

**Root** (1): `pnpm-lock.yaml` (character → chord dependency).

## Notes
- Session started: 2026-08-15 14:13 CDT; Phase 3 executed start-to-finish in one session (nine sub-steps), contracts-first against Phase 1's frozen contracts.md, Behavior-Statement-before-tests discipline held per construct, phase closed with evidence inline.
- Next session: get David's go-ahead for **Phase 4** (Chord grammar — ADR-318 normative constructs; entry state satisfied). Raise the port-findings gap list (propagation pace/coloring/withholds, ADR-316 turn waits, pursuit modes, influence schedules/effects, resist-excepts) when Phase 6 planning or an ADR-310 amendment comes up.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — Phase 3 fully closed; Phase 4 awaits David's go-ahead.
- **Rollback Safety**: safe to revert — `pnpm exec turbo run test:ci` 65/65 (2026-08-15), `npx tsc --noEmit` clean, no destructive changes; all changes uncommitted on `feat/adr-310-318-implementation` at summary time (committed by this finalize).

## Mutation Audit

- Files with state-changing logic modified: `packages/character/src/apply-compiled.ts` (new — constructs and attaches CharacterModelTrait), `packages/character/src/character-builder.ts` (`knows()` source), `packages/story-loader/src/evaluator.ts` (loud not-yet-wired throws), `tools/repokit/src/commands/manifest.ts` (writes the generated character-manifest module). Compiler emission (chord analyzer/parser) produces IR data, not runtime state.
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/character' test run` → 369 passing incl. 13 round-trip tests asserting on persisted trait fields (personality/dispositions/knowledge/factBeliefs/cognitiveProfile/mood axes) and 4 thealderman-port tests asserting the trait attaches via `entity.get('characterModel')`; `pnpm --filter '@sharpee/chord' test run` → 792 passing asserting on emitted IR and exact diagnostic codes; world-model drift tests → 78 passing; repokit → 80 passing; `./repokit manifest --check` green; `pnpm exec turbo run test:ci` → 65/65, all 2026-08-15).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? PARTIAL — the tsf dist-esm staleness trap bit once again (chord's ESM build stale for vitest until `tsf build --package chord --target esm`), already a recorded memory/pattern; handled per the known fix, no new pattern. Same-session test-expectation fixes (3 instances) were all fixture defects in newly written tests, not carryover patterns.

## Test Coverage Delta

- Tests added: `packages/chord/tests/character-declarations.test.ts` (52 tests across D2/D3/D14/D4-D5/D5-custom/D10/D8-D9/D13/D16); `packages/character/tests/roundtrip/compiled-roundtrip.test.ts` (13); `packages/character/tests/roundtrip/thealderman-port.test.ts` (4); world-model vocabulary drift tests (7 in character-model.test.ts).
- Tests passing before → after: chord 740 → 792; character 352 → 369; world-model character-model 71 → 78; repokit 80 (unchanged, still green). Repo gate: `pnpm exec turbo run test:ci` 65/65.
- Known untested areas: runtime evaluation of `feels`/`knows-topic` conditions and goal `…Compiled` condition fields (Phase 5 evaluator wiring — currently loud throws); D16 loader-side specificity arbitration (wire marker emitted, loader consumes in Phase 5+); the thealderman port's flagged unexpressed features (no surface yet).
