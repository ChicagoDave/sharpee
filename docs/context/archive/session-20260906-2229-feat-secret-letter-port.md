# Session Summary: 2026-09-06 - feat/secret-letter-port

## Goals
- Execute Phase 3 of `docs/work/secret-letter-port-platform-defects/plan.md` (P-7): region daemon presence (#365) and offstage-owned timer narration (#372).
- Execute Phase 4 (P-8, P-10, P-11): `select on` state resolution (#370), declared state vs. `fresh` collision (#366), names containing `and`/`&` (#361).

## Phase Context
- **Plan**: `docs/work/secret-letter-port-platform-defects/plan.md` — "Land the fifteen ACCEPTED items ... against `packages/`, each with the real-path test its Done-when names."
- **Phase executed**: Phase 3 — "Region daemon presence and offstage-owned timer narration (P-7)" (Medium, 250 budget), then Phase 4 — "Chord state and entity-name resolution — select-on, declared states, and connective names (P-8, P-10, P-11)" (Large, 400 budget).
- **Tool calls used**: 182 (Phase 3) — session state's last progressive checkpoint recorded 179, closing near 182; Phase 4's tool calls ran in the same session under the Phase 4 budget separately tracked in the plan.
- **Phase outcome**: Both completed within budget.

## Completed

### Phase 3 (P-7) — GH #365, #372
- Finding: the ungated region daemon was not new behavior to fix but a regression — ADR-328 D3's 2026-08-28 amendment retired the region-owned every-turn gate along with the entity/trait gates (the proposal review had not caught this). David chose A1 (a runtime presence gate) and B1 (an offstage timer owner keyed on "no place now, narrate from the player").
- `packages/story-loader/src/runtime.ts`: `playerPresentInRegionOwner` gates `runEntityTurnClause` for a region-owned clause — it fires only while `world.isInRegion(player, region)`, checked before condition/`, once`/RNG. `stepTimers` emits a named-turn line unsourced (defaults to the player) when the owner's `placeOf` is null.
- ADR-328 D3 amended (2026-09-06 stamp: regions carved back out of the 08-28 gate retirement; the offstage-owned-timer rule recorded in the same amendment). ADR-236 D4 gets a "Restored" note pointing at the amendment.
- Tests: new `gh-365-372-region-gate-offstage-timer.test.ts` (3, state-asserting); re-pinned `region-daemon.test.ts` (gated semantics restored), `region-forest.test.ts` (no off-stage birdsong — a second ADR-328-era pin caught by the same sweep), `timers-runtime.test.ts` (offstage owner narrates unsourced; a placed-owner sourcing case added at `mutation-verification`'s request).
- GH #365, #372 closed with evidence.

### Phase 4 (P-8, P-10, P-11) — GH #370, #366, #361
- Findings: `fresh` is the ADR-320 recency word — the parser makes a standalone `<x> is fresh` a topic test and the analyzer intercepts it before entity resolution — `seen` was never the actual collision. `&` was lexed as punctuation, so `create the Sandler & Sons` silently declared an entity named `Sandler`. `change … and … to` already parsed a full name; only condition subjects split the name at `and`.
- `packages/chord/src/analyzer.ts`: a `select on <entity>`/`select on it` subject lowers to the entity's `state` field read, so arms validate against declared states (`analysis.undeclared-state`) and the runtime runs the matching arm (P-8). `subjectDeclaresState` gives a subject's own declared state priority over the `fresh|recent|stale|concluded` platform reads when that word is one of its declared states (P-10, extending the existing mood-word precedent).
- `packages/chord/src/parser.ts`: `extendNameThroughAnd` folds an `and` immediately following a condition subject into the name rather than treating it as the connective (P-11).
- `packages/chord/src/lexer.ts`: `&` is a word token, so `Sandler & Sons` carries through every name reader (declaration, exits, placement, conditions, `change`).
- `branch-stories/secret-letter/black-gate.chord`: the winch trait restored to a `select on` block; the five-guarded-statement `turning` pivot workaround dropped.
- Grammar log row added (`docs/architecture/chord-grammar-changes.md`, 2026-09-06 Phase 4 entry).
- Tests: `packages/chord/tests/secret-letter-phase4-resolution.test.ts` (10, new); `packages/story-loader/tests/gh-370-366-select-on-state-collision.test.ts` (2, new, bootTurns real path, state-asserting).
- GH #370, #366, #361 closed with evidence.

## Key Decisions
- **Region daemons stay presence-gated (David, "go", 2026-09-06).** ADR-328 D3's 08-28 gate retirement was scoped to character-shaped concerns (a dormant former PC must keep living off-stage); a region has no life to freeze, and what its daemon does off-stage is mutate the world unseen, which no presence tag hides. The amendment carves regions back out; entity-, trait-, and story-owned clauses are unaffected.
- **An unplaced timer owner narrates from the player, not `absent` (David, B1).** The clock is the story's and its beats must be heard; `placeOf === null` is the trigger, not any other unplaced-entity heuristic.
- **`select on` resolves to declared state, not a guarded-statement chain (David, P-8 pick).** Reverts the port's `turning` pivot workaround; the winch's `raised`/`lowered` arms are now the actual reversible-state pattern the guide describes.
- **Declared state wins over the platform's own reading of the same word (David, P-10 pick, "declared-state-wins").** Extends the existing mood-word precedent (`resolveIsObject`) to the recency/`concluded` intercept rather than adding a second resolution path.
- **`&` is a name word, not punctuation (David, P-11 pick, "whole-name-wins").** Chosen over requiring authors to write `and` exclusively; both spellings are now legal in a declared name.

## Next Phase
- **Phase 5**: "Chord phrase-engine fixes — per-entry progress, timer reads on detail lines, and marker splicing in descriptions" (P-9, P-12, P-13).
- **Tier**: Large (400 tool-call budget).
- **Entry state**: Present the three fix approaches to David before editing `packages/chord` (analyzer) and `packages/story-loader` (phrase runtime).

## Open Items
- No items opened or closed in the ledger this session (`devarch items list --json` unchanged before/after).
- Two pre-existing, unrelated ledger items remain open from the sibling `secret-letter-port` plan — untouched this session: I-c8a56c-1 (David's outstanding prose lines for Chapters 6-8 placeholder beats), I-c8a56c-2 (GH #356 stallkeeper patience-counter basis, David's ruling pending).

## Files Modified
- `packages/story-loader/src/runtime.ts`
- `packages/story-loader/tests/{gh-365-372-region-gate-offstage-timer (new), region-daemon, region-forest, timers-runtime}.test.ts`
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` (D3 amended), `adr-236-chord-regions.md` (D4 restoration note)
- `packages/chord/src/{lexer,parser,analyzer}.ts`
- `packages/chord/tests/secret-letter-phase4-resolution.test.ts` (new)
- `packages/story-loader/tests/gh-370-366-select-on-state-collision.test.ts` (new)
- `branch-stories/secret-letter/black-gate.chord` (winch `select on` restored)
- `docs/architecture/chord-grammar-changes.md` (Phase 4 row)
- `docs/proposals/secret-letter-port-platform-defects.md` (P-7, P-8, P-10, P-11 PLANNED → DONE, rule 18a)
- `docs/work/secret-letter-port-platform-defects/plan.md` (Phase 3 and Phase 4 marked DONE with outcomes; Phase 5 advanced to CURRENT)

## Notes
- Session started: 2026-09-06 22:29 CDT (session b8faec, previous session b87995 closed at Phase 2).
- This finalization re-ran the two package suites and both story-level regression suites fresh, rather than trusting the session's own narrative (ADR-0019) — all four are corroborated below in Session Metadata / Test Coverage Delta, all timestamped after the session's last source edit (23:23:02 CDT).

---

## Session Metadata

- **Session**: b8faec
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/secret-letter-port`, none pushed.

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 2's story-loader turn-order audit findings carried into Phase 3's region/timer work as the plan's entry state required; Phase 3's landing then let Phase 4's independent chord-analyzer fixes proceed without further story-loader dependency.
- **Prerequisites discovered**: Phase 3 surfaced that the region gate's absence was a regression from ADR-328 D3's 08-28 amendment, not new-territory design work — the proposal review had not flagged this, so the plan's presented "two approaches" collapsed once the regression was named.

## Architectural Decisions
- ADR-328 D3 amended (2026-09-06): regions carved back out of the 08-28 gate retirement; offstage-owned-timer-narrates-from-player rule recorded in the same amendment.
- ADR-236 D4: restoration note added, pointing at the ADR-328 amendment.
- No new ADRs written; both are amendments to existing accepted decisions, driven by the Phase 3 regression finding. Phase 4 made no ADR changes — P-8/P-10/P-11 are analyzer resolution-order fixes, not decisions with future-session consequences beyond the grammar log entry.

## Mutation Audit
- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (region-clause turn gate, timer-owner sourcing), `packages/chord/src/analyzer.ts` (select-on state lowering, declared-state-vs-platform-word precedence), `packages/chord/src/parser.ts` (name-through-`and` extension), `packages/chord/src/lexer.ts` (`&` as a word token).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/chord' test` — 76 test files passed, 1146 tests passed, 2026-09-06 23:27:55–23:27:57 CDT; `pnpm --filter '@sharpee/story-loader' test` — 126 test files passed, 1107 tests passed, 2026-09-06 23:28:00–23:28:07 CDT — both runs after the session's last source/test edit at 23:23:02 CDT). `gh-365-372-region-gate-offstage-timer.test.ts` asserts on `world.isInRegion` gating and on the rendered narration's `sourced` tag directly, not on return values; `gh-370-366-select-on-state-collision.test.ts` drives `bootTurns` (the real interpreter path) and asserts on the entity's resulting state.
- If NO: N/A

## Recurrence Check
- Similar to past issue? YES — Phase 3's finding (an ADR amendment silently over-retiring a gate it did not intend to touch) is a variant of the recurrence class the plan's Phase 2 named: prior amendments to `story-loader`'s dispatch rules landing without a systemic check of every clause-owner kind they touch.
- If YES: this session's counter-measure was the same as Phase 2's — write the correction into the ADR itself (D3's amendment now names regions explicitly as untouched) rather than leaving the narrower fix undocumented, so a future gate change checks this amendment's list of owner kinds before repeating the over-reach.

## Test Coverage Delta
- Tests added: 15 (3 in `gh-365-372-region-gate-offstage-timer.test.ts`, 10 in `secret-letter-phase4-resolution.test.ts`, 2 in `gh-370-366-select-on-state-collision.test.ts`), plus re-pinned assertions in `region-daemon.test.ts`, `region-forest.test.ts`, and `timers-runtime.test.ts` (existing tests changed to match restored/corrected behavior, not net-new).
- Tests passing before → after (evidence: fresh runs by this writer, 2026-09-06 23:27–23:30 CDT, all after the session's final source/test edit at 23:23:02 CDT):
  - `@sharpee/chord`: 1146 passing (76 test files).
  - `@sharpee/story-loader`: 1107 passing (126 test files).
  - `./sharpee test branch-stories/secret-letter --tree`: 1468 cards / 2643 assertions passing (unchanged from pre-session baseline — confirms no regression from either phase).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`: 952 of 952 passed (unchanged — confirms no regression).
- Known untested areas: none newly introduced by either phase. Phase 9's close-out still carries the winch/gallows workaround reverts and tree re-pins scoped to it in the plan.

---

**Progressive update**: Session completed 2026-09-06
