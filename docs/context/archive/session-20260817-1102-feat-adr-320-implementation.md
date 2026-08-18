# Session Summary: 2026-08-17 - feat/adr-320-implementation

## Status: COMPLETE (Phase 7 landed and green — 29 new tests, all suites
passing, full walkthrough chain + character-story transcripts green via the
bundle, mutation-verification's one warning closed same session; work
uncommitted pending David's word)

## Goals
- ADR-320 Phase 7: `packages/world-model` + `packages/story-loader` —
  persistence and load-time instantiation (David: "start phase 7" — the
  platform-change confirmation for the phase's package set).

## Completed
- Phase 7 design doc written and CONFIRMED by David ("confirmed as proposed -
  go"): `docs/work/adr-320-conversation/phase7-persistence-design.md` — one
  Phase 1 contract amendment (§1.1 scene thread fields
  `currentTopic`/`subjectChangedTurn`) plus the planned §2 memory re-home;
  the plan's "vocabulary modules" line flagged as discharged by the Phase 3
  freeze (closed grammar, no manifest module to add).
- Implementation landed (world-model, character, stdlib, story-loader):
  - world-model: `ICharacterModelData.conversationMemory` +
    `CHARACTER_MODEL_SCHEMA_VERSION` 1 → 2 (v1 reads as empty — versioned
    reader, no hard break); `ConversationSceneState` thread fields.
  - character: `createTraitMemoryAccess` (trait-backed production memory
    home; unmodeled holders ignore writes), `noteTopicMove` (thread stamp,
    single-writer scene runtime).
  - stdlib: `hasTraversableExit` exported from the actions barrel.
  - story-loader: loader registers `registerCharacterScenes` (trait memory,
    authored-initiative hook) + the D15 production registrant at
    `applyCharacterBlocks`; conversation-blocks-need-a-model LoadError gate;
    the registrant serves exchange answer rows (grip path, occurrence under
    an exchange namespace, pin/mint reuse, close-on-serve, `then-open`/
    `deflect`/`leave` translation with real exit legality — illegal leave
    serves rendered silence instead) and greeting rows (boundary pick from
    pair memory: first-time / absence-refined return / repetition / bare
    return; content rows win scene-opening asks); topic arm extracts
    conversation statements (then-asks/leave applied via the registered
    runtime in postReport, deflect chains depth-guarded), stamps thread +
    asked counts in postValidate (before the mutations pass decides `asked`/
    `subject changes`), records discussed on delivery; evaluator implements
    recency/discussed/asked/subject-changes with loud LoadErrors outside the
    conversation frame; `execStatements` gains loud cases for the four
    conversation statement kinds (closed a silent fallthrough).
- Behavior Statements (rule 12) and Integration Reality Statement (rule 13a)
  produced in-conversation; tests derived: 18-test real-path loader suite
  (compile → load → real stdlib actions → store/trait/occurrence
  assertions), 6 character seam tests, 3 world-model schema-v2 tests,
  loud-failure rewrite of `conversation-predicates-not-wired.test.ts`;
  plus two deflect real-path tests closing the mutation-verification warning
  (29 new/updated tests total).
- Evidence (all run 2026-08-17 this session): story-loader 527 passing
  (77 files), character 519 passing, world-model 1489 passing (2 obsolete
  v1-pin assertions updated to the exported constant), stdlib 1624 passing,
  bootstrap 43 passing; repo-wide `npx tsc --noEmit` clean; `./repokit
  build dungeo` clean; full Dungeo walkthrough chain 952 passing;
  character-acceptance (14 transcripts, 3 story files), thealderman (7
  transcripts), `pnpm test:scripts` (11) all green via the bundle.

## Key Decisions
- Thread/asked bookkeeping stamps in postValidate (validate phase) because
  the mutations pass decides `when` truths — `the subject changes` and
  `asked once` must hold on the very firing they describe.
- Ask counts: matched table asks bump in the arm's postValidate; the
  registrant's select bumps only the paths the arm cannot see (gripped
  firings, unmatched asks) — no double count.
- Chord has no modeled-PC authoring surface (`analysis.character-line-player`)
  — contracts §2.1 symmetry is exercised at the character-package level;
  the loader suite asserts the unmodeled-PC no-change leg instead.
- Illegal `leave` from an exchange row refuses the whole row (rendered
  silence, no mutations, no occurrence); from a table row the delivered
  response stands and only the close is dropped (the Phase 6 stdlib
  semantic) — both emit `character.scene.exit_refused`.

## Open Items
- Phase 7 work uncommitted (awaiting David's commit instruction).
- Mutation-verification: one warning (deflect runtime path untested) —
  closed same session with two state-asserting tests (table-row deflect and
  exchange-answer deflect, both asserting target occurrence keys); suite
  20/20. Everything else traced GREEN.

## Files Modified
- `packages/world-model/src/traits/character-model/characterModelTrait.ts` - conversationMemory, schema v2
- `packages/world-model/src/traits/character-model/conversation-scene.ts` - thread fields
- `packages/world-model/tests/unit/traits/character-model.test.ts` - v2 tests, version-constant pins
- `packages/character/src/conversation/scene-binding.ts` - createTraitMemoryAccess
- `packages/character/src/conversation/scene-runtime.ts` - noteTopicMove
- `packages/character/src/conversation/index.ts`, `src/index.ts` - barrels
- `packages/character/tests/conversation/trait-memory-access.test.ts` - new
- `packages/stdlib/src/actions/index.ts` - hasTraversableExit export
- `packages/story-loader/src/loader.ts` - registration + block gate
- `packages/story-loader/src/runtime.ts` - D15 registrant, topic-arm conversation statements, bookkeeping
- `packages/story-loader/src/evaluator.ts` - four predicate kinds + conversation frame
- `packages/story-loader/tests/adr-320-phase7.test.ts` - new (20 tests)
- `packages/story-loader/tests/conversation-predicates-not-wired.test.ts` - rewritten to frame-required loud legs
- `docs/work/adr-320-conversation/phase7-persistence-design.md` - new (CONFIRMED)
- `docs/work/adr-320-conversation/plan.md` - Phase 7 → DONE (evidence inline)

## Notes
- Session started: 2026-08-17 11:02 (session 844192)
