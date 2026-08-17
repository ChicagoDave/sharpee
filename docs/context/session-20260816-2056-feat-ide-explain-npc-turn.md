# Session Summary: 2026-08-16 - feat/ide-explain-npc-turn

## Goals
- Close Phase 7 (final phase) of the ADR-310/318 character implementation plan.
- File the ADR-319 (Flashbacks) roadmap issue at David's request.

## Phase Context
- **Plan**: `docs/work/adr-310/plan.md` — "Acceptance closure: diagnostics completeness, isolation, cost regression, whole-platform regression, IDE surface" (ADR-310 character-model-in-Chord + ADR-318 normative character layer).
- **Phase executed**: Phase 7 — "Acceptance closure — diagnostics completeness, isolation, cost regression, whole-platform regression, IDE surface" (Medium tier).
- **Tool calls used**: 91 / 250.
- **Phase outcome**: Completed under budget. Plan Status → DONE (all seven phases DONE, both ADRs' Acceptance sections discharged per `acceptance-audit.md`); plan archived to `docs/work/archive/adr-310/`; `.current-plan` pointer released.

## Completed

### ADR-319 roadmap issue
Filed https://github.com/ChicagoDave/sharpee/issues/267, "Feature roadmap: ADR-319 Flashbacks", labeled `enhancement` + `ADR`, summarizing D1–D5, the ephemeral-vs-persistent spectrum, and next steps (open-questions interview at Q10 → ACCEPTED → plan).

### Phase 7 closure — click-to-assert round trip
- Built a fresh Debug Chord Writer via `xcodebuild` (no prior build carried the explain-NPC-turn panel; only build was Aug 15 pre-panel). Verified `devkit`/`platform-browser` dists fresh and the `ts-character-assert` marker present in the built app before handing off for live verification.
- Closed the prior session's mutation-audit gap: added "click-to-assert character fragments persist through the document round trip (ADR-318 D11)" to `tools/ide/web/testing-surface/tests/model.test.ts` — asserts fragments survive `model.addChannel({id:'character',contains})` → serialize → deserialize, including byte-stability. Testing-surface suite went 75 → 76 passing (event log: "8 passed 76 passed", 2026-08-17T02:03:20Z, after the model.test.ts edit at 02:03:10Z). `tsc --noEmit` clean.
- Added the discoverability hint David requested: a `[SKIP]` card whose turn carried character rows now renders "assert from the NPC panel →" (clickable, opens the panel) — `cards.ts` `renderAssertions` + `.ts-skip-npc-hint` in `surface.css`. Presentational only; `compose.ts` untouched so document claims stay verbatim. Bundle rebuilt into `SharpeeIDE/Resources`; Debug app rebuilt and marker-reverified; testing-surface suite re-confirmed 76 passing (event log 02:24:18Z).
- David verified LIVE in the built app (screenshot, 2026-08-16 21:26 CDT): asserted Viola's `pressure_deposit` line from the panel; claim persisted as a `character` channel `contains` claim with fragments `"kind":"character.author.pressure_deposit"`, `"npcId":"a05"`, `"feed":"pin:killer"`; re-run PASS — 4 cards passing, 9 assertions passing. This was Phase 7's sole remaining exit criterion.
- `plan.md` Phase 7 marked DONE with that evidence inline; Plan Status set to DONE; archived via `plan-archive.sh` to `docs/work/archive/adr-310/`; `.current-plan` released (event log: build passed 02:29:15Z — `pnpm --filter @sharpee/repokit build` + `./repokit manifest --check`).

### Stale-path sweep after archive
Repointed `docs/work/adr-310/` → `docs/work/archive/adr-310/` in `packages/character/src/tick-phases.ts`, `packages/chord/src/character-manifest.ts`, `packages/world-model/src/traits/character-model/character-vocabulary.ts`, `tools/repokit/src/commands/manifest.ts` (the generator emitting two of those headers), plus ADR-310, ADR-318, ADR-145, `docs/roadmap/roadmap-002.md`, `website/src/lib/roadmap-data.json`. Repokit rebuilt; `./repokit manifest --check` green. Session summaries and dist artifacts deliberately left untouched (history/regenerable).

## Key Decisions

### 1. `tsf build --npm` regression leg stays retired
Confirmed per David's 2026-08-16 ruling: npm-publish builds run in CI, `tsf` is a version-bump tool only. Phase 7's original plan text listed this as a gate; closure proceeded without it.

### 2. Skip-hint is presentational, not a document mutation
The "assert from the NPC panel →" hint on `[SKIP]` cards changes only `cards.ts` rendering; `compose.ts` (which builds document claims) was deliberately left untouched so the auto-assertion policy (room-name-and-description channels only; dialogue prose not auto-pinned, since it's volatile under the character model) stays intact.

## Next Phase
Plan complete — all phases done. No successor phase in this plan.

## Open Items

### Short Term
- ADR-319 open-questions interview — David indicated starting at Q10.

### Long Term
- Recurring deferred audit findings (flagged again this session by `pre-session-audit`, not newly discovered): 23 stranded event logs; two stale plans (`adr-280-chord-writer-project-model`, `live-derived-state`); the 4-way ADR-location split. All still await deliberate disposition.

## Files Modified

**ADR-310/318 closure** (5 files):
- `docs/work/adr-310/plan.md` (now `docs/work/archive/adr-310/plan.md`) - Phase 7 marked DONE with evidence; Plan Status → DONE.
- `tools/ide/web/testing-surface/tests/model.test.ts` - new round-trip persistence test (ADR-318 D11).
- `tools/ide/web/testing-surface/src/cards.ts` - `[SKIP]`→NPC-panel discoverability hint.
- `tools/ide/web/testing-surface/src/surface.css` - `.ts-skip-npc-hint` styling.
- `tools/ide/SharpeeIDE/Resources/testing-surface/{surface.css,surface.js}` - rebuilt bundle output.

**Stale-path sweep** (7 files):
- `packages/character/src/tick-phases.ts`, `packages/chord/src/character-manifest.ts`, `packages/world-model/src/traits/character-model/character-vocabulary.ts`, `tools/repokit/src/commands/manifest.ts`, `docs/architecture/adrs/adr-145-npc-goal-pursuit.md`, `docs/architecture/adrs/adr-310-character-model-in-chord.md`, `docs/architecture/adrs/adr-318-normative-character-layer.md` - repointed `docs/work/adr-310/` → `docs/work/archive/adr-310/`.
- `docs/roadmap/roadmap-002.md`, `website/src/lib/roadmap-data.json` - same repoint.

**Session lifecycle** (2 files):
- `docs/context/project-profile.md` - refreshed by `dev-context-detector` (character arc now dominant domain; platform 5.0.1 / Chord 3.0.0).
- `docs/context/.current-plan` - deleted (pointer released on plan closure).

**Author-recorded artifact** (1 file):
- `stories/thealderman/chord/thealderman.tests.json` - David's app-recorded character assertion from the live verification run (s→south edit, removed skipped ask-viola card, added the recorded `character` channel claim).

## Notes

**Session duration**: ~1.5 hours (2026-08-16 20:56 CDT start).

**Approach**: Session-start lifecycle (recap, pre-session-audit, dev-context-detector) surfaced only recurring/deferred findings, no new blockers. Main work was closing the last exit criterion of a seven-phase plan via a live human verification pass in a freshly built Debug app, plus a mutation-audit gap closure and a small UX addition requested mid-session. Finished with an ADR-location stale-path sweep triggered by the plan archive move.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes uncommitted at session end; plan archive move is a git rename, reversible)

## Dependency/Prerequisite Check

- **Prerequisites met**: fresh `devkit`/`platform-browser` dists for the Debug Chord Writer build; testing-surface bundle rebuild pipeline; `plan-archive.sh` script.
- **Prerequisites discovered**: none — no existing app build carried the explain-NPC-turn panel, so a fresh Debug build was required before David could verify live (not a blocker, just a precondition surfaced early in the session).

## Architectural Decisions

- ADR-310 (character-model-in-Chord) and ADR-318 (normative character layer): both Acceptance sections discharged this session per `acceptance-audit.md`; no new ADR content written.
- Pattern applied: capability dispatch / author-channel wire (ADR-310/318) — click-to-assert persistence exercised through the real document round trip, not a mock.
- `tsf build --npm` regression leg formally dropped as a Phase 7 gate per David's standing ruling (2026-08-16) that tsf is a version-bump tool, not a regression harness.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/web/testing-surface/src/cards.ts` (rendering only, no state mutation — see Key Decision 2), `tools/ide/web/testing-surface/tests/model.test.ts` (test file, not source).
- Tests verify actual state mutations (not just events): YES (evidence: testing-surface suite "8 passed 76 passed" at 2026-08-17T02:03:20Z, and re-confirmed "76 passed" at 2026-08-17T02:24:18Z after the cards.ts/surface.css edits — both timestamps post-date the edits they cover). The new test asserts on the deserialized document's persisted channel claim fragments, not on return values or events alone.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — the 23 stranded event logs, two stale plans, and 4-way ADR-location split are the same recurring findings `pre-session-audit` has flagged across prior sessions (per this session's audit output); no new pattern introduced.
- If YES: Consider the deliberate disposition pass on those three items that has been deferred across multiple sessions — not undertaken this session.

## Test Coverage Delta

- Tests added: 1 (`model.test.ts` — click-to-assert round-trip persistence, ADR-318 D11).
- Tests passing before: 75 → after: 76 (evidence: event log rows at 2026-08-17T02:03:20Z and 02:24:18Z, both post-dating the relevant edits).
- Known untested areas: none newly identified this session.

---

**Progressive update**: Session completed 2026-08-16 21:31 CDT
