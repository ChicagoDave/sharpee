# Session Summary: 2026-09-03 - feat/adr-321-world-index

## Status: COMPLETE

## Goals
- Walk David through GH #354 (step 4a hand-off order) and GH #355 (tree-document state pins for Chord entity state) and get his rulings.
- Plan the two together as one platform plan, with the W-10 dance prototype as the real-path acceptance for both.

## Completed
- Session start: recap presented, pre-session-audit relayed (type check clean, no stale artifacts, no open blockers; 7 stranded event logs noted as a SessionEnd hook gap, left alone per standing feedback), core concepts read, gate cleared.
- GH #354 and #355 laid out from the code (`packages/character/src/tick-phases.ts` step 4a; `packages/branch-tester/src/runner.ts` `evaluateStateExpression`; `packages/story-loader/src/state-keys.ts`).
- David ruled **A on both**: two-pass step 4a (challenges before floor turns); Chord-spelled pin form (`the first partner is waiting`, `the story is ended`). Rulings recorded as comments on both issues.
- `docs/work/secret-letter-port/plan.md` stamped `Superseded by: docs/work/hand-off-order-and-state-pins/plan.md` (rule 18b "still live", per David's standing ruling on port interruptions).
- `session-planner` wrote `docs/work/hand-off-order-and-state-pins/plan.md` (4 phases; plan-review clean against 11 references, one advisory tension on ADR-307's pin family — David to say if the pin form wants its own ADR; default is a one-line ADR-307 addendum in Phase 4). David: "go".
- **Phase 1 (GH #354) built**: `packages/character/src/tick-phases.ts` step 4a split into a challenge pass (every ready candidate not seated with the player calls `resolveIntrusion`; `blocks` recorded in `blockedThisTurn`) and a serve pass (readiness re-probed; a partner parked in pass one reads not-ready because `readyThreadMove` re-engages a parked thread only when its `opens when` holds). Behavior Statement produced in conversation before tests.
- Tests: `packages/character/tests/tick-phases/thread-interruption.test.ts` +2 (`threadTurnReady` stub now models parked → not ready; GH #354 reproduction with the seated owner sorting first; blocking owner + ready challenger); `packages/story-loader/tests/adr-320-d10-interruption.test.ts` +3 (source parametrized by `gated`; ungated hand-off asserts Jacobs's cursor unchanged and no `jacobs-beat-two` on the park turn; hand-back). Verified the reproduction: with the source change stashed, exactly the two new hand-off tests fail (character 1 failed / 5 passed; story-loader 1 failed / 5 passed), all six pass with the fix.
- Suites (2026-09-03 01:09): character 599 passing (was 597), story-loader 1025 passing (was 1022). `mutation-verification`: clean. Phase 1 marked DONE in the plan.
- **Phase 2 (GH #355) built**: `CHORD_IR_ID_ATTRIBUTE = 'chordIrId'` in `packages/story-loader/src/state-keys.ts` (exported from the barrel); `loader.ts` stamps `entity.attributes[CHORD_IR_ID_ATTRIBUTE] = irEntity.id` at the per-entity creation tail (the playable person goes through the same site). `packages/branch-tester/src/runner.ts` `evaluateStateExpression` tries `[the] <name> is [not] <state>` last (new `evaluateChordStateClaim`): `the story` reads the phase key; any other name resolves through `findEntity` (spaces allowed) and reads `chord.state.<ir-id>` via the attribute; rejection branches never throw. Behavior Statements for both produced before tests; Integration Reality Statement produced.
- Tests: `packages/story-loader/tests/ir-id-attribute.test.ts` (4, real compile → loader; every kind stamped, player stamped, stamp reaches the state key, stateless entity stamped with no key); `packages/branch-tester/tests/chord-state-claim.test.ts` (12: article optional, multi-word name, alias, actual-state message, negation, state movement, not found / no IR id / no states / story without states, `story.state =` untouched). Real path: dedicated fixture `packages/branch-tester/tests/fixtures/state-pins/` (`state-pins.story` + `state-pins.tests.json`) via `./sharpee test packages/branch-tester/tests/fixtures/state-pins` — 3 cards / 13 assertions passing (2026-09-03), old and new pin forms side by side. First fixture draft mis-guessed the fuse timing (lamp lit after the first `wait`, not the second); the new form's own failure message reported the actual state, and the tree was re-pinned to the story's real behaviour.
- Phase 2 marked DONE (`mutation-verification`: clean).
- **Phase 3 in progress**: `dance.chord` six `beat, when the <nth> partner is dancing:` gates → bare `beat:`; the existing W-10 tree passed unchanged (15 cards / 46 assertions) on the two-pass engine — the GH #354 acceptance bar. Partner/dance/story state pins added to the boot card, every hand-off card, and the music's-end card: 15 cards / 69 assertions passing. README rewritten ("hold gates are gone", "State pins"). Baselines via `./sharpee test` (2026-09-03): fernhill 36 cards / 40 assertions, secret-letter 562 / 953, thealderman 4 / 9 — all exactly as expected. **Correction**: the first gate-removal `sed` (BSD sed, `\|` alternation) matched nothing — noticed when `git status` did not list `dance.chord`; redone in Python (6 replacements). The committed 46-assertion tree then ran against the truly gate-free story: 15 / 46 passing, unchanged. Pinned tree: 15 / 69. Dungeo chain 952 passed (bundle from `./repokit build dungeo`); `pnpm exec turbo run test:ci` 67 tasks successful — character 599, story-loader 1029, engine 680, stdlib 1663, branch-tester 104. Phase 3 DONE.
- Suites: story-loader 1029 passing (was 1025), branch-tester 104 passing (+12). `npx tsf build --packageList story-loader,branch-tester` compiled clean (the author CLI is CommonJS and loads `dist`, so the real-path run saw the change). Root `npx tsc --noEmit` clean.

## Key Decisions
- GH #354 → A: interruptions resolve before any floor turn is served; D14 `blocking` remains the story's lever to let a seated owner finish. Removes the entity-id dependence and the need for per-beat hold gates.
- GH #355 → A: pins mirror Chord's own `is` condition rather than growing the dotted `entity.property` grammar. Implementation route: the loader stamps the IR id on the world entity so the runner resolves `chord.state.<ir-id>` from the world alone.

## Open Items
- None from this plan. Carried: GH #347 (D10 shared-floor family) open; ADR-331 DRAFT by design; the one-time audit of every-turn `while <npc> knows <topic>` clauses across the Chord corpus still flagged for David.
- ADR-307 addendum vs own ADR for the Chord-spelled pin form — David's call, defaulting to the addendum.

## Files Modified
- `packages/story-loader/src/state-keys.ts`, `src/index.ts`, `src/loader.ts` — IR-id attribute constant, export, stamp (GH #355)
- `packages/branch-tester/src/runner.ts` — Chord-spelled pin form (GH #355)
- `packages/story-loader/tests/ir-id-attribute.test.ts` — new
- `packages/branch-tester/tests/chord-state-claim.test.ts` — new
- `packages/branch-tester/tests/fixtures/state-pins/` — dedicated fixture story + tree (new)
- `packages/character/src/tick-phases.ts` — step 4a two-pass split (GH #354)
- `branch-stories/secret-letter/prototypes/w10-dance/dance.chord`, `w10-dance.tests.json`, `README.md` — gates dropped, pins added, README corrected
- `packages/character/tests/tick-phases/thread-interruption.test.ts` — stub + 2 tests
- `packages/story-loader/tests/adr-320-d10-interruption.test.ts` — parametrized source + GH #354 describe
- `docs/work/archive/hand-off-order-and-state-pins/plan.md` — new (session-planner), all four phases DONE, archived this session
- `docs/context/.current-plan` — repointed to the new plan, then back to `docs/work/secret-letter-port/plan.md` at close-out
- `docs/work/secret-letter-port/plan.md` — Superseded-by stamp (repointed to the archive path) + Resumed line
- `docs/work/secret-letter-port/watch-list.md` — W-10 residuals resolved
- `docs/architecture/adrs/adr-320-conversation-and-complex-dialogue.md` — Status line + D10a addendum
- `docs/architecture/adrs/adr-307-testing-tree-model-v2.md` — D2 `states` grammar addendum
- `stories/dungeo/src/version.ts` — build-date stamp from `./repokit build dungeo`
- `docs/context/session-20260903-0700-feat-adr-321-world-index.md` — this file

## Notes
- Session started: 2026-09-03 ~07:00 CDT (session 89ce13)

---

## Session Metadata

- **Session**: 89ce13
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes uncommitted at summary time; nothing pushed)

## Dependency/Prerequisite Check

- **Prerequisites met**: David's rulings (A on both GH #354 and GH #355) obtained before Phase 1/2 build; the W-10 dance prototype available as the shared real-path acceptance bar for both issues (Phase 3).
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-320: Status line and D10a addendum updated to reflect the two-pass step 4a split (GH #354 ruling A).
- ADR-307 D2: `states` string-grammar addendum recorded for the Chord-spelled pin form (GH #355 ruling A) — an addendum rather than a new ADR, per David's standing default and not objected to.
- GH #354 → A: interruptions resolve in a challenge pass before any floor turn is served in the same tick (two-pass step 4a); D14 `blocking` remains the story's lever to let a seated owner finish.
- GH #355 → A: state pins mirror Chord's own `is` condition (`[the] <name> is [not] <state>`) rather than growing the tree grammar's dotted `entity.property` head; the loader stamps the IR id (`CHORD_IR_ID_ATTRIBUTE`) on the world entity so the runner resolves `chord.state.<ir-id>` from the world alone.
- Pattern applied: rule 18b "still live" disposition — `docs/work/secret-letter-port/plan.md`'s Superseded-by stamp was repointed from the interruption plan to this session's archive path with a new Resumed line, the same handling used in the immediately prior session (ef1966) for the adr-320-d10-interruption plan.

## Mutation Audit

- Files with state-changing logic modified: `packages/character/src/tick-phases.ts` (step 4a two-pass split); `packages/story-loader/src/loader.ts` and `src/state-keys.ts` (IR-id attribute stamp); `packages/branch-tester/src/runner.ts` (Chord-spelled pin form evaluator, `evaluateChordStateClaim`).
- Tests verify actual state mutations (not just events): YES (evidence: reproduction run against the real code path — `git stash push packages/character/src/tick-phases.ts -m "gh354-verify"` then `pnpm --filter '@sharpee/character' test` / `pnpm --filter '@sharpee/story-loader' test`; event log `.devarch-events-89ce13.jsonl` records "Build failed" at 2026-09-03T06:09:39Z with the source stashed, then "Build passed" at 06:09:48Z (character) and 06:09:55Z (story-loader) after unstash — exactly the two new hand-off tests failed with the fix removed, matching the session narrative. Suite totals after the fix are corroborated by the same log: "Build passed" for `pnpm --filter '@sharpee/story-loader' test` at 06:15:00Z and `pnpm --filter '@sharpee/branch-tester' test` at 06:15:02Z, both after the last edits to their test files (06:13:38Z / 06:14:00Z), and by `pnpm exec turbo run test:ci` "Build passed" at 06:20:23Z, after the session's last source edit).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? Uncertain — the BSD `sed` `\|` alternation silently matching nothing (caught this session via `git status`, redone in Python) is a shell/tooling-portability defect class; no prior `docs/context/` summary was checked against this specific class in this pass, so it is recorded here as a single-session catch rather than a confirmed recurrence.
- If YES: N/A.

## Test Coverage Delta

- Tests added: character +2 (`tests/tick-phases/thread-interruption.test.ts`); story-loader +7 (+3 in `tests/adr-320-d10-interruption.test.ts`, +4 new `tests/ir-id-attribute.test.ts`); branch-tester +12 (new `tests/chord-state-claim.test.ts`) — 21 unit tests total, plus a dedicated real-path fixture (`packages/branch-tester/tests/fixtures/state-pins/`, 3 cards / 13 assertions via `./sharpee test`).
- Tests passing before: character 597 → after 599; story-loader 1022 → after 1029; branch-tester (no prior state-pin suite) → after 104 (evidence: event log `.devarch-events-89ce13.jsonl` "Build passed" for `pnpm --filter '@sharpee/story-loader' test` at 06:15:00Z and `pnpm --filter '@sharpee/branch-tester' test` at 06:15:02Z, plus `pnpm exec turbo run test:ci` "Build passed" at 06:20:23Z covering all 67 tasks including character, engine, and stdlib — all timestamped after the session's last source edit).
- Known untested areas: none newly introduced this session.

---

**Progressive update**: Session completed 2026-09-03 01:24 CDT
