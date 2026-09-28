# Work Summary — Secret Letter Port Platform Defects, Phases 3-4

**Date:** 2026-09-06
**Branch:** feat/secret-letter-port
**Target:** `docs/work/secret-letter-port-platform-defects/` (proposal `docs/proposals/secret-letter-port-platform-defects.md`, P-7, P-8, P-10, P-11)
**Plan:** `docs/work/secret-letter-port-platform-defects/plan.md`
**Session:** `docs/context/session-20260906-2229-feat-secret-letter-port.md` (full chronological record, session b8faec)

## Goals
- Land P-7: region daemon presence and offstage-owned timer narration (GH #365, #372).
- Land P-8, P-10, P-11: `select on` state resolution, declared state vs. platform-word collision, and names containing `and`/`&` (GH #370, #366, #361).

## Phase Context
- **Plan**: `docs/work/secret-letter-port-platform-defects/plan.md`
- **Phases executed**: Phase 3 — "Region daemon presence and offstage-owned timer narration (P-7)" (Medium, 250 budget); Phase 4 — "Chord state and entity-name resolution — select-on, declared states, and connective names (P-8, P-10, P-11)" (Large, 400 budget).
- **Phase outcome**: Both completed within budget, same session.

## Completed

### P-7 — GH #365, #372: region daemon presence and offstage-owned timer narration
The region daemon's ungated firing was not new behavior needing a design decision — it was a regression. ADR-328 D3's 2026-08-28 amendment retired the region-owned every-turn gate along with the entity- and trait-owned gates it was actually targeting (a dormant former PC needing to keep living off-stage); regions have no life to freeze, and an off-stage region clause mutates the world where the player isn't looking, which no presence tag can hide. The proposal review had not caught this. David chose A1 (a runtime presence gate) and B1 (an offstage timer owner narrates from the player).

`packages/story-loader/src/runtime.ts`: `playerPresentInRegionOwner` gates `runEntityTurnClause` for a region-owned clause, checked before condition/`, once`/RNG, using `world.isInRegion(player, region)` (nesting transitive). `stepTimers` emits a named-turn line unsourced (defaulting to the player) when the timer owner's `placeOf` is null.

ADR-328 D3 amended (2026-09-06): regions carved back out of the 08-28 retirement, and the offstage-timer rule recorded in the same amendment. ADR-236 D4 gets a short restoration note pointing back at it.

### P-8, P-10, P-11 — GH #370, #366, #361: chord state and name resolution
Three independent analyzer-resolution fixes, findings first:
- `fresh` is the ADR-320 recency word — the parser turns a standalone `<x> is fresh` into a topic test and the analyzer intercepts before entity resolution runs at all. `seen` was never the actual collision the port hit.
- `&` was lexed as punctuation, so `create the Sandler & Sons` silently declared an entity named `Sandler` — the `& Sons` half vanished with no diagnostic.
- `change … and … to` already parsed a full multi-word name correctly; only condition subjects split the name at `and`.

David picked the resolve-the-state / declared-state-wins / whole-name-wins approach for all three.

- **P-8**: `packages/chord/src/analyzer.ts` lowers a `select on <entity>`/`select on it` subject to the entity's `state` field read, so arms validate against declared states (`analysis.undeclared-state` on a miss) and the runtime executes the matching arm. `black-gate.chord`'s winch trait is restored to a `select on` block; the five-guarded-statement `turning` pivot workaround is dropped.
- **P-10**: `subjectDeclaresState` extends the existing mood-word precedent (`resolveIsObject`) into the recency/`concluded` intercept — a subject that declares `fresh`/`recent`/`stale`/`concluded` as one of its own states resolves that word as the state test; a subject that doesn't keeps the platform's ADR-320 recency/thread reading.
- **P-11**: `packages/chord/src/parser.ts`'s `extendNameThroughAnd` folds an `and` immediately following a condition subject into the name. `packages/chord/src/lexer.ts` makes `&` a word token so it carries through every name reader (declaration, exits, placement, conditions, `change`).

Grammar log row added (`docs/architecture/chord-grammar-changes.md`, 2026-09-06 Phase 4 entry) documenting all three with corpus examples.

## Key Decisions

### 1. Region daemons stay presence-gated (David, "go")
ADR-328 D3's gate retirement was scoped to character-shaped concerns; a region is not a character and has no off-stage-life requirement to protect. The amendment now names regions, entities, and traits/story as separate owner kinds so a future gate change checks the full list before repeating the over-reach.

### 2. Offstage timer owner narrates from the player (David, B1)
`placeOf === null` is the trigger — not any broader "unplaced entity" heuristic. The clock is the story's; its beats must be heard regardless of who or what is bookkeeping it.

### 3. Declared state wins over the platform's own reading (David, P-10 pick)
Extends an existing precedent (mood words already deferred to declared state) rather than adding a second, parallel resolution mechanism for the recency/`concluded` case.

### 4. `&` is a name word (David, P-11 pick)
Both `and` and `&` are legal in a declared name going forward, rather than requiring authors to always spell out `and`.

## Next Phase
- **Phase 5**: "Chord phrase-engine fixes — per-entry progress, timer reads on detail lines, and marker splicing in descriptions" (P-9, P-12, P-13).
- **Tier**: Large (400 tool-call budget).
- **Entry state**: Present the three fix approaches to David before editing `packages/chord` (analyzer) and `packages/story-loader` (phrase runtime).

## Open Items

### Short Term
- None opened this session.

### Long Term
- Two pre-existing, unrelated ledger items remain open from the sibling `secret-letter-port` plan, untouched this session: I-c8a56c-1 (David's outstanding Chapters 6-8 placeholder-beat prose), I-c8a56c-2 (GH #356 stallkeeper patience-counter basis).
- Phase 9 close-out still carries: revert the winch/gallows workarounds now closed by this session's fixes, and re-pin any tree branches that depended on them, alongside the workarounds already scoped there from Phases 2 and 6-8.

## Files Modified

**Platform (packages/)** (9 files):
- `packages/story-loader/src/runtime.ts` - region-clause presence gate, offstage-timer-owner sourcing
- `packages/story-loader/tests/gh-365-372-region-gate-offstage-timer.test.ts` (new) - 3 tests, both P-7 cases
- `packages/story-loader/tests/region-daemon.test.ts` - re-pinned to gated semantics
- `packages/story-loader/tests/region-forest.test.ts` - re-pinned (no off-stage birdsong)
- `packages/story-loader/tests/timers-runtime.test.ts` - offstage-owner-unsourced case, placed-owner sourcing case
- `packages/chord/src/analyzer.ts` - select-on state lowering (P-8), `subjectDeclaresState` precedence (P-10)
- `packages/chord/src/parser.ts` - `extendNameThroughAnd` (P-11)
- `packages/chord/src/lexer.ts` - `&` as a word token (P-11)
- `packages/chord/tests/secret-letter-phase4-resolution.test.ts` (new) - 10 tests, all three Phase 4 items
- `packages/story-loader/tests/gh-370-366-select-on-state-collision.test.ts` (new) - 2 tests, bootTurns real path

**Story content** (1 file):
- `branch-stories/secret-letter/black-gate.chord` - winch restored to `select on`, `turning` pivot dropped

**Docs** (5 files):
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` - D3 amended (regions carved back out, offstage-timer rule)
- `docs/architecture/adrs/adr-236-chord-regions.md` - D4 restoration note
- `docs/architecture/chord-grammar-changes.md` - Phase 4 row
- `docs/proposals/secret-letter-port-platform-defects.md` - P-7, P-8, P-10, P-11 PLANNED → DONE
- `docs/work/secret-letter-port-platform-defects/plan.md` - Phase 3, Phase 4 marked DONE with outcomes; Phase 5 advanced to CURRENT

## Notes

**Session duration**: ~1 hour (session start 22:29 CDT through Phase 4 close ~23:32 CDT, per session state and file mtimes).

**Approach**: Both phases presented their fix approaches to David before editing per CLAUDE.md's platform-changes rule; Phase 3's "two approaches" collapsed into one once the regression finding was named. Phase 4's three items were independent but grouped in one phase since each is the same shape of bug (analyzer resolves a name or state wrong) and touches the same three files.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/secret-letter-port`, none pushed.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2's story-loader turn-order audit findings carried into Phase 3 as the plan's entry state required.
- **Prerequisites discovered**: The region-gate absence was a regression from ADR-328 D3's 08-28 amendment rather than new design territory, collapsing Phase 3's presented two-approach decision into a single fix once named.

## Architectural Decisions

- ADR-328 D3 amended (2026-09-06): regions carved back out of the 08-28 gate retirement; offstage-owned-timer-narrates-from-player recorded in the same amendment.
- ADR-236 D4: restoration note added.
- No new ADRs; Phase 4 made no ADR changes.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` (region-clause turn gate, timer sourcing), `packages/chord/src/analyzer.ts` (select-on state lowering, state-vs-platform-word precedence), `packages/chord/src/parser.ts` (name-through-`and`), `packages/chord/src/lexer.ts` (`&` word token).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/chord' test` — 76 files, 1146 tests passed, 2026-09-06 23:27:55 CDT; `pnpm --filter '@sharpee/story-loader' test` — 126 files, 1107 tests passed, 2026-09-06 23:28:00 CDT; both re-run by this writer after the session's last source/test edit at 23:23:02 CDT). `gh-365-372-region-gate-offstage-timer.test.ts` asserts on `world.isInRegion` gating and the narration's `sourced` tag; `gh-370-366-select-on-state-collision.test.ts` drives `bootTurns` and asserts on resulting entity state.
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — Phase 3's finding (an ADR amendment over-retiring a gate beyond its intended scope) is a variant of the recurrence class Phase 2 named for story-loader dispatch-order changes.
- If YES: same counter-measure as Phase 2 — the correction is written into the ADR's own text (naming regions as a distinct, untouched owner kind) rather than left as an undocumented narrow fix.

## Test Coverage Delta

- Tests added: 15 (3 `gh-365-372-region-gate-offstage-timer.test.ts`, 10 `secret-letter-phase4-resolution.test.ts`, 2 `gh-370-366-select-on-state-collision.test.ts`); plus re-pinned (not net-new) assertions in `region-daemon.test.ts`, `region-forest.test.ts`, `timers-runtime.test.ts`.
- Tests passing before → after (evidence: fresh runs by this writer, 2026-09-06 23:27-23:30 CDT, after the session's final edit at 23:23:02 CDT):
  - `@sharpee/chord`: 1146 passing (76 test files).
  - `@sharpee/story-loader`: 1107 passing (126 test files).
  - `./sharpee test branch-stories/secret-letter --tree`: 1468 cards / 2643 assertions passing (unchanged, confirms no regression).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`: 952 of 952 passed (unchanged, confirms no regression).
- Known untested areas: none newly introduced. Phase 9's close-out carries the scoped workaround reverts.

---

**Progressive update**: Session completed 2026-09-06
