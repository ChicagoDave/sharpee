# Session Summary: 2026-08-16 - feat/ide-explain-npc-turn

## Goals
- Write the ADR-320 (Conversation & Complex Dialogue) implementation plan — TS contracts first, theatre-story player task specified before mechanism.

## Phase Context
- **Plan**: `docs/work/adr-320-conversation/plan.md` — land ADR-320's conversational surface (scene/exchange two-level model, manner fallback, time-as-words, disposition-driven initiative, world-bounded agency, threading, multi-party floor/interruption, witnessed player claims, presentation-agnostic wire, theatre-company demonstration story). 11 phases, `.current-plan` pointer newly set (no prior plan named — no supersession).
- **Phase executed**: Phase 1 — "TS-level contracts — scene, memory, wire, and scoring shapes" (Large, budget 400), status CURRENT (since 2026-08-16). Not yet started — this session wrote and reviewed the plan; implementation of Phase 1 itself is future work, gated on David's platform-change confirmation for `packages/character`/`packages/world-model`.
- **Tool calls used**: 76 / 400 (plan-writing session, not yet Phase 1 execution).
- **Phase outcome**: N/A — this was a planning session; Phase 1 has not started.

## Completed

### Session-start lifecycle
- Recap presented; `pre-session-audit` ran clean (`npx tsc --noEmit` clean, no active plan at session start, project profile fresh from 2026-08-16 20:59). Re-flagged the same recurring deferred cluster: 23 stranded event logs, 2 stale plans (`adr-280-chord-writer-project-model`, `live-derived-state`), 4-way ADR-location split. Session gate cleared.

### ADR-320 implementation plan
- Written via `session-planner` to `docs/work/adr-320-conversation/plan.md`: 11 phases — Phase 1 (TS contracts, CURRENT since 2026-08-16, Large/400); Phase 2 (theatre-story player task spec, REQUIRES DAVID'S CONTENT); Phases 3–4 (Chord grammar); Phase 5 (`@sharpee/character` scene runtime); Phase 6 (stdlib dispatch integration); Phase 7 (`world-model` + `story-loader`); Phase 8 (`engine` NPC↔NPC scheduling + save/restore); Phase 9 (D12 wire schema, `platform-browser`/`devkit`/IDE testing surface); Phase 10 (story authoring, DAVID'S CONTENT); Phase 11 (acceptance closure, ADR-142 supersession confirmation).
- `.current-plan` pointer set to `docs/work/adr-320-conversation/plan.md`. No supersession triggered — the pointer was absent before this session.

### Plan review
- `/devarch:plan-review` run against the plan in the main session: no conflicts found against 7 references (ADR-320, ADR-142, ADR-090, ADR-316, ADR-180, `project-profile.md`, this session's own file).
- Additional verification performed: confirmed the D15 dialogue-selector socket types (`DialogueSelector`, `DialogueSelectionResult`, `ConversationIntent`) live in `@sharpee/world-model` — `packages/stdlib/src/actions/helpers/dialogue-selector.ts` imports them from there — placing them inside Phase 1's stated package scope (`@sharpee/character` and `@sharpee/world-model`).

### Phase 1 code contracts (post-merge continuation, branch `feat/adr-320-implementation`)
- Both merges executed: PR #270 (`feat/adr-310-318-implementation`, 12 commits) and PR #271 (`feat/ide-explain-npc-turn`, 6 commits) merged into main 2026-08-17T04:27–04:28Z; local main synced.
- David authorized Phase 1 start ("go - start Phase 1") — the platform-change confirmation for `packages/character`/`packages/world-model`.
- `docs/work/adr-320-conversation/contracts.md` written (PROPOSED), mirroring the ADR-310 contracts shape.
- Types declared, unconsumed: `packages/world-model/src/traits/character-model/conversation-scene.ts` (ConversationSceneState, SceneStrength, SceneOpenedBy, ExchangeState, SceneBoundaryKind, ConversationMemory); `packages/world-model/src/capabilities/scene-wire.ts` (SceneWireEvent, ResponseAffordance, ExchangeAffordances); D15 socket extended additively in `dialogue-selector-binding.ts` (`scene?`, `sceneDirectives?`, `wireEvents?`, SceneDirective); `packages/character/src/conversation/scene-scoring.ts` (SceneOccasion, FloorBid, FloorDecision, InterruptionChallenge, InterruptionOutcome). Leaf barrels updated in both packages.
- Repo-wide `npx tsc --noEmit` clean (2026-08-16, this session). No runtime behavior change — types only.
- Two decisions flagged for David before Phase 1 closes: contracts.md §1.3 (scene state home: world-state key `character.scenes` proposed over per-trait mirroring) and §7 (`ConversationIntent` double-booking; `ContinuationIntent` rename proposed for Phase 5).
- **Phase 1 CLOSED**: David approved both flagged decisions and, from the PlayerTrait discussion, ruled the modeled-PC fold — the player entity may carry `CharacterModelTrait` (no state-bearing PlayerTrait; a thin role-marker consolidation of `ActorTrait.isPlayer` + `WorldModel.playerId` is a separate ADR-132-scale decision, not part of ADR-320). Recorded as contracts.md §2.1; contracts.md now APPROVED. plan.md Phase 1 → DONE with evidence; Phase 2 (theatre-story player task, David's content) → CURRENT, gating Phases 3–9 per AC13.
- David's mid-session ruling folded: test stories carry no ADR references — plain requirements language in story files; traceability tables stay in docs/work (plan Phases 2/10 updated; memory `no-adr-refs-in-test-stories` saved).

### Phase 3 executed and CLOSED (2026-08-17, same session)
- Vocabulary freeze review: `vocabulary-freeze-phase3.md` written (grounded in a chord-package survey: create-block character lines, `define topics` idiom, condition-kind system, manifest pipeline) and FROZEN by David as proposed — `define greetings` spelling; `fresh`/`recent`/`stale`; `again so soon`/`after a while`/`after days`; `asked once`/`asked again`/`asked many times`; open `voice` vocabulary.
- Implementation: AST (`DefineManner`/`DefineGreetings` + condition/predicate node kinds), parser (block parsers, `the subject changes`, `asked <rep>`, recency-standalone rule, `was discussed` with `was` joining PHRASE_STOPS), analyzer (`applyManner`/`applyGreetings` folds with duplicate/host/voice gates, deterministic beat phrase-key minting `<owner>.manner-<row>-<line>` registered in pass 1 and re-derived in pass 2), IR (dedicated condition kinds `recency`/`discussed`/`asked`/`subject-changes`; entity `manner`/`greetings` fields), disjointness axes (recency, asked).
- Behavior Statements produced before tests (parser blocks, analyzer folds, condition lowering); tests derived line-for-line: `tests/adr-320-phase3.test.ts`, 16 tests, all asserting on emitted IR / minted phrase-table entries / named diagnostic codes. Full chord suite: 870 passing, 60 files. Repo `npx tsc --noEmit` clean.
- Surface pin (ADR-257 D5) moved as one unit: `chord.ebnf` grammar additions, `CHORD_LANGUAGE_VERSION` 3.0.0 → 3.1.0 (first ordinary minor after the 3.0.0 freeze; 3.x shipped with platform 5.0.x), pin hash re-recorded in `language-version.test.ts`. Golden IR snapshots: 4 updated, diff verified to be ONLY the `languageVersion` stamp — the AC3 cost leg (byte-identical compiles for stories without the constructs) holds.
- plan.md: Phase 3 → DONE with evidence; Phase 4 → CURRENT (chord confirmation carries per its entry state; opens with the Phase 4 freeze review).

### Phase 2 executed and CLOSED (same session)
- `theatre-story-task.md` written by interview: **William Shakespeare and the Lord Chamberlain's Men, 1599, the new Globe, rehearsing *Julius Caesar***; the crisis is **Kemp leaving the company** (David's calls, recorded as given). Cast is the minimum three (Shakespeare, Burbage, Kemp) with historically-derived personality sketches David confirmed.
- Player: **Henslowe's agent in disguise** among the hired men (David asked for a rival in disguise; the Admiral's Men at the Rose next door is the historical fit he accepted). Task: **both** objectives — poach Kemp and steal the play-book — by opening night, disguise intact. Clock: the last 3 days of rehearsal. Places: stage, tiring-house, yard/galleries, Bankside tavern.
- Construct-to-beat table written tracing AC1–13 to story beats; the tracing lives in docs/work only per David's no-ADR-refs-in-stories ruling.
- David: "confirmed - close Phase 2" — spec is the fixed reference for Phases 10–11. Phase 2 → DONE in plan.md; Phase 3 (Chord grammar A) is next, gated on David's platform-change confirmation for `packages/chord`.

### Branch-merge direction (executed — see above)
- David directed: PR and merge `feat/adr-310-318-implementation` (conversation/character implementation, 12 commits ahead of main, direct ancestor of the current branch) and `feat/ide-explain-npc-turn` (current branch, 17 commits ahead of main — the 12 plus 5 IDE/ADR-320-docs commits). Merge order: 310-318 first, then the IDE branch. Confirmed via `git log --oneline main..<branch> | wc -l`: 12 and 17 respectively. This summary is the first step of that flow; PRs and merges follow immediately after.

## Key Decisions
- (None this session — planning and review only, no architectural decisions made or ADRs written.)

## Next Phase
- **Phase 4** (CURRENT): "Chord grammar — exchange, initiative, agency, and multi-party constructs" (Large, budget 400) — exchange blocks, `then asks`/`deflect to`/`leave`, act/event response rows, authored initiative rows, strength markers. The `packages/chord` confirmation carries from Phase 3 per the plan's entry state. Opens with the Phase 4 vocabulary freeze review (exchange words, strength markers, initiative rows) — not yet drafted.

## Open Items

### Short Term
- Draft the Phase 4 vocabulary freeze proposal for David's review (the phase's opening step).
- Optional housekeeping: prune merged branches `feat/adr-310-318-implementation` and `feat/ide-explain-npc-turn` (local + origin).

### Long Term
- Phase 5 carries the approved renames (`ContinuationIntent`, strength/redirect union collapses) and the modeled-PC tick coverage from contracts §2.1, plus the ADR-310 doc-line amendment note.
- Recurring deferred cluster flagged again by `pre-session-audit`: 23 stranded event logs, 2 stale plans (`adr-280-chord-writer-project-model`, `live-derived-state`), 4-way ADR-location split — none actioned this session.

## Files Modified

**Planning batch — committed `5cb32fa8`, merged via PR #271** (3 files):
- `docs/work/adr-320-conversation/plan.md` - the 11-phase ADR-320 implementation plan
- `docs/context/.current-plan` - pointer set to the new plan
- `docs/context/session-20260816-2315-feat-ide-explain-npc-turn.md` - this session summary

**Phase 1/2 batch — uncommitted on `feat/adr-320-implementation`**:
- `docs/work/adr-320-conversation/contracts.md` - new; APPROVED (scene home, rename, modeled-PC fold)
- `docs/work/adr-320-conversation/theatre-story-task.md` - new; CONFIRMED (Phase 2 exit)
- `packages/world-model/src/traits/character-model/conversation-scene.ts` - new; scene/memory shapes
- `packages/world-model/src/capabilities/scene-wire.ts` - new; D12 wire schema
- `packages/world-model/src/capabilities/dialogue-selector-binding.ts` - D15 socket extension (additive optional fields)
- `packages/character/src/conversation/scene-scoring.ts` - new; floor/interruption scoring shapes
- Leaf barrels: `world-model` traits/character-model + capabilities indexes; `character` conversation + root indexes
- `docs/work/adr-320-conversation/plan.md` - Phases 1–3 DONE with evidence; Phase 4 CURRENT; Phase 2/10 story-plainness rulings folded
- `docs/context/session-20260816-2315-feat-ide-explain-npc-turn.md` - progressive updates (this file)

**Phase 3 batch — same branch**:
- `docs/work/adr-320-conversation/vocabulary-freeze-phase3.md` - new; FROZEN by David
- `packages/chord/src/ast.ts` - DefineManner/DefineGreetings + condition/predicate node kinds
- `packages/chord/src/parser.ts` - block parsers, condition/predicate forms, `was` in PHRASE_STOPS
- `packages/chord/src/analyzer.ts` - applyManner/applyGreetings, beat phrase minting, condition lowering, fingerprint/open-closed coverage
- `packages/chord/src/ir.ts` - IRMannerRow/IRGreetingRow + four IRCondition kinds
- `packages/chord/src/condition-disjoint.ts` - recency and asked axes
- `packages/chord/src/version.ts` - CHORD_LANGUAGE_VERSION 3.0.0 → 3.1.0
- `packages/chord/chord.ebnf` - surface additions (blocks, condition forms, word lists)
- `packages/chord/tests/adr-320-phase3.test.ts` - new; 16 tests
- `packages/chord/tests/language-version.test.ts` - pin re-recorded (3.1.0 + new hash)
- `packages/chord/tests/__snapshots__/*` - 4 snapshots, languageVersion stamp only

## Notes

**Session duration**: ~1 hour (23:13 CDT start).

**Approach**: Planning-only session — no source code touched. `session-planner` produced the phased plan against ADR-320's Implementation section and D1–D13; `/devarch:plan-review` cross-checked it against 7 references with no conflicts found; one additional manual verification (D15 socket type location) confirmed Phase 1's package scope is accurate before treating the plan as ready to resume from.

---

## Session Metadata

- **Status**: COMPLETE (planning + merges + Phases 1–3 of the ADR-320 plan closed, each on David's explicit gate; Phase 4 CURRENT, opens with its freeze review)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: Phases 4–11 of the plan (future sessions)
- **Rollback Safety**: safe to revert — planning batch is merged to main (PR #271); the Phase 1–3 batch is committed via this finalize on `feat/adr-320-implementation` (Phase 1 types unconsumed; Phase 3 grammar additive with the cost leg verified byte-identical)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-320 ACCEPTED (2026-08-16, prior session) before planning began; `pre-session-audit` confirmed clean type check and no conflicting active plan.
- **Prerequisites discovered**: Phase 1 cannot start without David's platform-change confirmation for `packages/character`/`packages/world-model` (CLAUDE.md requirement, newly surfaced as this plan's first gate).

## Architectural Decisions

- None this session. ADR-320 itself was accepted in the prior session (`b0f7e52a`); this session only planned against it.

## Mutation Audit

- Files with state-changing logic modified: none — documentation/planning only.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is a new plan for a newly accepted ADR, not a recurrence of a prior blocker.

## Test Coverage Delta

- Tests added: 16 (`packages/chord/tests/adr-320-phase3.test.ts` — derived from Phase 3 Behavior Statements; IR/diagnostic-code assertions throughout)
- Tests passing before: 854 → after: 870 (full chord suite, 60 files, run 2026-08-17 this session)
- Known untested areas: the new IR condition kinds have no evaluator yet by design — Phase 7 adds evaluator cases with loud not-yet-wired failures; runtime behavior (rotation, layering, boundary selection) is Phase 5's test surface

---

**Progressive update**: Session completed 2026-08-16 23:26 CDT
