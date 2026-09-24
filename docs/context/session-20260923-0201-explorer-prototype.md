# Session Summary: 2026-09-23 - explorer-prototype (02:01 CDT)

## Goals
- Phase 1 of `docs/work/testing-explorer/plan-20260922-examinable-lens.md`: lens core — a running mentioned-but-not-examinable report against fernhill.
- (Extended mid-session, with David's go) Phase 2: harden the lens and extend it to secret-letter.

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — build and ship the first scoped lens for the testing-explorer (issue #508's decision): extract noun phrases from a room's rendered prose, execute `examine <phrase>` through the real engine, and report what fails to resolve or resolves to the default response.
- **Phase executed**: Phase 1 — "Lens core — a running report against fernhill" (Tier: Medium), then Phase 2 — "Harden and extend to secret-letter" (Tier: Medium), both closed this session.
- **Tool calls used**: 119 / 250 (Phase 1 budget; Phase 2 ran under its own 220 budget within the same session — see state file `docs/context/.session-state-433db5.json`).
- **Phase outcome**: Both phases completed under budget.

## Completed
- Session start: recap, pre-session audit relayed, core concepts read, gate cleared. David's go for Phase 1 at 02:03 CDT.
- Probed the real examine path on fernhill before writing code (scratchpad probes, 02:10 CDT): non-resolution is NOT a `parser.error.*` message id on the `game.executeCommand` path — the parser accepts `examine zzyzx`, the validator fails with `ENTITY_NOT_FOUND`, and it surfaces as a `command.failed` event (`reason: "Validation failed: ENTITY_NOT_FOUND"`) plus `lastTurnResult.error`. Disambiguation surfaces as a `client.query` event. Success is `if.event.examined` with `messageId: if.action.examining.<variant>`. The plan's classifier assumption was corrected against source and measurement (recorded in the plan's Phase 1 Outcome).
- `tools/explorer-probe/explore.js`: minimal refactor — `explore()` exported; `opts.onRoomFirstSeen({game, world, room, save, restore, path})` fires once per room at first discovery (root included), after the new state's save is queued so the hook cannot pollute the frontier; `opts.stopWhenAllRoomsSeen` adds stop reason `all-rooms-reached`; `roomsDeclared` (count of IR entities with kind `room`) added to the report in declared mode. CLI unchanged — re-run `--hash declared --max-seconds 60`: 12 rooms, 2478 states, 994 cmd/s.
- `tools/explorer-probe/lens-examinable.js`: new. Runs the declared-mode walk, and at each first-seen room extracts noun phrases (`@sharpee/world-index` `extractNounPhrases`) from the room description and every visible entity's description, folds by phrase, restores the room save, executes `examine <phrase>` through the engine, classifies by event/messageId. `readsAsThing` only hides non-resolutions (`--all` shows them). `--json` mode works.
- First real run on fernhill (02:35 CDT): 12 of 13 rooms reached (cellar not reached; walk stopped at max-states 5000 after 96s), 134 phrases examined, 104 not-in-scope, 30 resolved-described, 0 resolved-default, 0 ambiguous, 0 unclassified.
- Phase 1 marked DONE in the plan (2026-09-23); Phase 2 set CURRENT — with David's go to continue.
- **Phase 2** (from ~02:50 CDT):
  - secret-letter run: 19 of 21 declared rooms reached in the 120s walk budget (unreached: Behind Fruit Stall, Commerce Street — both story-gated), 415 phrases: 214 resolved-described, 195 not-in-scope, 6 ambiguous, 0 unclassified.
  - Custom examining clauses verified on real rows: 25 `on the player examining` overrides (shoppers/stalls/wires/market/silk tent) come back as `if.event.examined` with the Chord phrase id as messageId → resolved-described; `after` clauses append `chord.phrase` events. No classifier gap. Mechanism confirmed in `packages/story-loader/src/runtime/on-clauses.ts` (`postReport` override) and `lifecycle-engine.ts` ("override swaps its message").
  - Extractor recall measured against secret-letter's own entity names in the seen prose: 520 mentions, 66% covered, 34% missed; 146 misses have no article before them (`your cloak`, `with shoppers`, `woolen cap`), 33 sit after an anchored article the run overshot (`wires anchor`). Decision: accept the gap in the lens; raise possessive-determiner anchors in `@sharpee/world-index` as a discussion item (platform change, benefits the IDE's static check equally). Not built — filed as issue #514 (see Open Items).
  - Hardening: a room first seen in the game-ending move is flagged `ended` and not examined (reads `world.getEnding()`, the same signal the engine derives its stopped phase from); engine errors are carried into the verdict detail. Lens JSON now includes the seen prose per room. Checked on the rerun: secret-letter's "On the Wire" is NOT an ended room — the slide is two turns and the player gets one command mid-wire — so its rows (`wire`, `fruit stall` unresolved) stand as findings; the first reading of the hand probe was wrong and the comment says so.
  - Phase 2 marked DONE in the plan; Phase 3 set CURRENT (since 2026-09-23). No Phase 3 work started.
  - Issues filed (devarch, bug): #509 storehouse not examinable from the roof; #510 the post not examinable from its top; #511 silk tent walls / narrow gap / tent flap; #512 plurals `support posts`/`posts` do not resolve; #513 own-description adjective mismatches (class, with instances; fernhill list referenced).

## Key Decisions

### 1. Classifier reads the engine's real answer, not the plan's assumption
`if.event.examined` (messageId decides described vs default; `blocked` flag = scope refusal), `client.query` = ambiguous, `command.failed`/`lastTurnResult.error` = not resolved. `parser.error.*` ids never appear on the `game.executeCommand` path. Corrected by probing source and live behavior before writing the classifier, not by trusting the plan's design record.

### 2. `readsAsThing` filters, never decides
Applied only to non-resolutions, per its own contract in `incomplete.ts`; it hides rows, never decides them (`--all` shows hidden rows).

### 3. Dedicated fixture for the default-response path
`tools/explorer-probe/fixtures/lens-fixture/` (compile with `./sharpee compose … -o …/dist/lens-fixture.ir.json`; `dist/` is gitignored) rather than touching a real story, per the project's test-story-isolation rule.

### 4. Accept the extractor recall gap; raise the fix as a platform discussion item, not a local patch
Possessive-determiner anchoring belongs in `@sharpee/world-index` (shared by this lens and the IDE's static check), and `packages/` changes require discussion first per CLAUDE.md. Filed as issue #514 rather than worked around inside the lens.

## Next Phase
- **Phase 3**: "Report shape and regression pin" — finalize the grouped-by-room/folded-by-phrase output plus stable `--json`; add a corpus-style regression test under `tools/explorer-probe/tests/`; write the tool's usage doc (header comment).
- **Tier**: Small (120 tool-call budget).
- **Entry state**: Phase 2's lens produces verified-correct findings on both fernhill and secret-letter — met. Awaiting David's go to start.

## Open Items

### Short Term
- 514: world-index: add possessive determiners as noun-phrase extraction anchors (146 of 179 secret-letter misses had no preceding article; benefits the IDE's static check equally; needs David's platform discussion before it's built).

### Long Term
- None filed as issues this session. Observations carried forward inside the plan's Phase 1/2 Outcome text (not separately ledgered, per the open-items step's rule against filing for plan-tracked work): adjective-mismatch class dominates fernhill findings; carried-item phrases repeat across every room (Phase 3's fold-by-phrase report shape addresses this); extractor noise is ADR-321 D6b's known recall-over-precision tuning; the walk's state budget can leave a puzzle-gated room unreached (fernhill's cellar, secret-letter's Behind Fruit Stall/Commerce Street).

## Files Modified

**Tooling** (3 files):
- `tools/explorer-probe/explore.js` — hook, `roomsDeclared`, `all-rooms-reached`, `explore()` export; CLI unchanged
- `tools/explorer-probe/lens-examinable.js` — new; Phase 2 added prose in JSON, `ended` flag, error detail, header records for recall and authored clauses
- `tools/explorer-probe/fixtures/lens-fixture/lens-fixture.story` — new fixture for the default-response path

**Plan and context** (3 files):
- `docs/work/testing-explorer/plan-20260922-examinable-lens.md` — Phase 1 and Phase 2 marked DONE with outcomes; Phase 3 set CURRENT
- `docs/context/session-20260923-0201-explorer-prototype.md` — this file
- `docs/context/session-20260922-1051-explorer-prototype.md` — pre-existing uncommitted activity-log append from the previous session (not touched this session)

## Notes

**Session duration**: ~1.5 hours (02:03–~03:40 CDT).

**Approach**: probe the real engine behavior before writing the classifier (source reading + scratchpad probes), build the minimal walker hook, run against the smaller story first (fernhill), hand-verify a sample of findings, then extend to the denser story (secret-letter) and harden against what that story's shape exposed (custom `on examining` clauses, ended-state rooms, recall gaps).

- Open items: `#509`–`#513` (this session's filed bugs) and `#514` (the discussion item filed during this write-up) all confirmed present via `gh issue list` against the live store; `issues.sh list-open`'s own default listing window did not surface them (older/unrelated issues by id order), so presence was checked directly rather than assumed.

---

## Session Metadata

- **Session**: 433db5
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — nothing under `packages/` touched; changes are confined to `tools/explorer-probe/`, the plan file, and session context.

## Dependency/Prerequisite Check

- **Prerequisites met**: `tools/explorer-probe/explore.js`/`dimensions.js` existing and working (fernhill 9/9, secret-letter 18/18 in declared mode, per the plan's Phase 1 entry state); `@sharpee/world-index` built with `extractNounPhrases`/`readsAsThing` exported (`packages/world-index/dist/index.js`); `branch-stories/fernhill/dist/fernhill.ir.json` compiled; `branch-stories/secret-letter/secret-letter.story` present.
- **Prerequisites discovered**: none beyond the plan's stated entry state.

## Architectural Decisions

- None this session — no ADR written or amended. Applied existing decisions: ADR-321 D5/D6b (reuse `extractNounPhrases` rather than a private heuristic or NLP dependency), ADR-322 D8/D9 (consume ADR-321's derivations; keep the finding vocabulary open — resolved-described/resolved-default/not-in-scope/ambiguous), ADR-294 D20/D22 (soundness contract — findings are real, absence is not proof; no exhaustiveness claim).
- Discussion item raised, not built: possessive-determiner anchors in `@sharpee/world-index` (issue #514) — a `packages/` change, held for David's discussion per CLAUDE.md's platform-changes rule.

## Mutation Audit

- Files with state-changing logic modified: none in the state-mutation sense. `lens-examinable.js` and the `explore.js` hook execute `examine <phrase>` commands through the real engine to observe classification events, then restore the room's save — they are read/classify tooling, not application logic under `packages/`.
- Tests verify actual state mutations (not just events): N/A — this session's code is a testing/analysis tool with no owned side-effect function (no `execute|handle|process|save|update|...` named function was authored against rule 15's signal) and no persistent mutation it is responsible for asserting on. Verification this session was manual: hand-checked fernhill and secret-letter output rows against each story's own prose (recorded in the plan's Phase 1/2 Outcome sections).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — the mid-session correction (classifier assumption fixed by probing source before coding) is ordinary design verification, not a recurring blocker category from a prior session.

## Test Coverage Delta

- Tests added: 0.
- Tests passing before: N/A → after: N/A (reported by session, unverified) — no automated test suite was run against the lens or the walker hook this session; the only build/test event in the session log is the pre-session-audit's `npx tsc --noEmit` check at 07:02:38Z, which ran before any of this session's edits and does not cover them. Verification was manual hand-checking against story prose, not an automated run.
- Known untested areas: `tools/explorer-probe/lens-examinable.js` (all of it) and the new hook/`roomsDeclared`/`all-rooms-reached` logic in `explore.js` have no automated regression coverage yet. The corpus-style regression pin under `tools/explorer-probe/tests/` is Phase 3's explicit deliverable, not yet started.

---

**Progressive update**: Session completed 2026-09-23 03:40
