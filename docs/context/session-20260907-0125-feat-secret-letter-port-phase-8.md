# Session Summary: 2026-09-07 - feat/secret-letter-port (2026-09-07 01:23 CDT)

## Goals
- Recap the previous session (0e7d6f, COMPLETE through Phase 7).
- Phase 8 of `docs/work/secret-letter-port-platform-defects/plan.md` (P-16, GH #374): an unplaced entity never wins scope over a carried one, for every action's `:item` slot. Entry state: present the fix approach to David before editing `packages/stdlib`.

## Phase Context
- **Plan**: Land the fifteen ACCEPTED items of `docs/proposals/secret-letter-port-platform-defects.md` against `packages/`, each with its real-path test, then close out by reverting the port's workarounds, closing nineteen GitHub issues, and updating docs (now archived: `docs/work/archive/secret-letter-port-platform-defects/plan.md`).
- **Phase executed**: Phase 8 — "An unplaced entity never wins scope over a carried one" (P-16, Small) and Phase 9 — "Close-out — regenerate the tree, revert the port's workarounds, close issues, update docs" (Medium).
- **Tool calls used**: 121 / 100 (Phase 8) + 250 (Phase 9) combined budget — the state file's single counter spans both phases worked this session.
- **Phase outcome**: Phase 8 completed under budget (not a platform defect; story fix plus a test-only platform pin). Phase 9 completed on budget; plan's last non-terminal phase, so Plan Status set to DONE and the feature directory archived.

## Completed
- Session start: recap presented, pre-session audit relayed (type check clean, no stale artifacts, Phase 8 CURRENT), gate cleared.
- Phase 8 reconnaissance (no edits). GH #374 does NOT reproduce as a scope defect at HEAD (1584aad18, bundle built 01:00 CDT, seed 1209, the tree's 608-command path to the `wear day dress` card):
  - `wear dress` / `put on dress` parse to `chord.action.changing-outfit` (disguise.chord's literal grammar, story tier over standard per ADR-268 D2) and print `change-not-here`, not the dress's intercept.
  - `don dress` (stdlib-only phrasing) parses to `if.action.wearing`, resolves the carried daydress (scope 4), offstage dress at scope 0 — "You put on the daydress." plus the mirror phrase.
  - Right after `change outfit`: `x gown`, `wear gown`, `don dress`, `x new dress` all "You can't see any such thing." — the offstage dress is out of scope for the platform.
  - The literal `wear dress` grammar line dates to e7e7705bf (2026-08-29), before the issue was observed (2026-09-05).

- Phase 8 executed as a story fix plus a platform pin (David: the story action was "convoluting wearables with specific Secret Letter story lines"):
  - `disguise.chord`: `wear dress` and `put on dress` removed from `changing-outfit`'s grammar; header comment rewritten to say why (a story grammar line outranks the standard one game-wide). Wearing stays stdlib's; the dress/hat `on the player wearing` intercepts carry the redirect.
  - `red-gate.chord`: the GH #374 workaround bullet removed. `secret-letter.tests.json`: the card re-pinned from `wear day dress` to `wear dress` (its three assertions unchanged, still passing).
  - `packages/stdlib/tests/unit/validation/unplaced-entity-scope.test.ts` (new, test only): unplaced entity is UNAWARE; `wear dress` with a carried alias-match resolves the carried one; only-unplaced and unplaced-only-alias both ENTITY_NOT_FOUND. 4 passing, 01:46 CDT.
  - `./sharpee test branch-stories/secret-letter --tree`: 1468 cards, 2642 assertions passing, 01:47 CDT. Dungeo chain: 952 passing, 01:47 CDT.
  - GH #374 closed (not planned) with the evidence above. Plan Phase 8 DONE, Phase 9 advanced to CURRENT. Proposal P-16 PLANNED → DONE, header Status now DONE (15 DONE, 1 REJECTED).

- Phase 9 (close-out) executed:
  - Chapter VI's row reverted to `begins when the player visits the Empty Alleyway for the first time` (`secret-letter.story`), the `becomes opened` stand-in gone; `black-gate.chord` header comment rewritten. Tree card `up` (after `open hatch`) gains `story.chapter.name is rooftops` — the first chapter-channel claim in the tree (GH #369's capability, unused until now).
  - Stale story comments updated to record the fix date where they cited a now-closed issue as an open gap: `gallows.chord` (#373 butler-move placement; #372 player-owned overheard clock), `black-gate.chord` (#367 drag-to-landing order; #364 winch/rope examine refusals). Presence-line notes citing #364 (`gallows.chord:78`, `ball.chord:303`) left alone — #364 fixed description markers, not `phrase present:` lines.
  - Guide: `website/src/app/chord/guide/vocabulary/define-action/content.mdx` "Which pattern wins" gains the whole-game-shadowing paragraph (Phase 8's rule).
  - Tree regeneration via `scripts/make-story-artifacts.mjs` skipped on purpose: `secret-letter.recipe.json` has an empty spine and no branches; running it would replace the 1468-card tree with an empty one.
  - All nineteen issues verified CLOSED (`gh issue list`). Plan Phase 9 DONE; Plan Status DONE. Proposal already DONE after Phase 8.
  - Evidence: `./sharpee test branch-stories/secret-letter --tree` 1468 cards / 2643 assertions passing (after every edit); Dungeo chain 952 passing (01:47 CDT, after the session's only `packages/` change).

## Key Decisions
- **`wear <noun>` is never a story action's grammar (David, 2026-09-07).** A story grammar line outranks the standard pattern for the whole game (ADR-268 D2), so a story that wants to react to wearing uses the entity's `on the player wearing` clause, not a `define action` with `wear dress` in its grammar. Recorded in the plan's Phase 8 outcome as a Phase 9 guide note.

## Next Phase
Plan complete — all nine phases DONE. Plan archived to `docs/work/archive/secret-letter-port-platform-defects/plan.md`; `.current-plan` pointer released (it was unset already at session start — no other plan was pointed to, so nothing to repoint per rule 18b).

## Open Items

### Short Term
- I-3da76c-2: `secret-letter.recipe.json` is empty (no spine, no branches); `scripts/make-story-artifacts.mjs` would replace the 1468-card tree with an empty one if run against it. If the generated-tree path is wanted, the recipe needs a spine and branches first.

### Long Term
- I-3da76c-1: Rework candidates for David: the crowd/gallows placement in the butler's release clause could move to a `when the butler moves` clause in `gallows.chord` (#373); the `overheard` clock could be the raid's own timer instead of the player's (#372); the winch's and rope's state-dependent text could be `{phrase}` markers in their descriptions (#364). Structure is content — David's call, not done this session.
- I-3da76c-3: GH #206 exact-out-of-scope path: an unplaced entity flagged for an action's scope refusal can still be handed to that action when the only in-scope competitor is a word-tier match with a different head, if the lifecycle consults the unplaced entity's intercept (e.g. `on … wearing`) before the action's scope refusal. Not reproducible in Secret Letter (no such competitor exists); no issue filed, worth a look later.

## Files Modified
- `branch-stories/secret-letter/disguise.chord`, `red-gate.chord`, `secret-letter.tests.json`, `secret-letter.story`, `black-gate.chord`, `gallows.chord`
- `website/src/app/chord/guide/vocabulary/define-action/content.mdx`
- `packages/stdlib/tests/unit/validation/unplaced-entity-scope.test.ts` (new)
- `docs/work/secret-letter-port-platform-defects/plan.md` (Phases 8 and 9 DONE, Plan Status DONE)
- `docs/proposals/secret-letter-port-platform-defects.md` (P-16 DONE, header DONE)
- `docs/context/session-20260907-0125-feat-secret-letter-port-phase-8.md` (this file)

## Notes
- Session started: 2026-09-07 01:23 CDT (session 3da76c). Previous session 0e7d6f COMPLETE; working tree clean at 1584aad18.
- A parallel session (354dfe, ADR-334 on `game-engine.ts`) wrote its record to `session-20260907-0123-feat-secret-letter-port.md`, the filename this session first used. This session's record moved here; the other file is that session's and is left alone.

---

## Session Metadata

- **Session**: 3da76c
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (plan complete)
- **Rollback Safety**: safe to revert — all changes uncommitted on `feat/secret-letter-port` at session end.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1-7 all DONE before this session started (confirmed by pre-session-audit at session start); the bundle at HEAD 1584aad18 built 01:00 CDT for Phase 8's probes; `secret-letter.tests.json` and the tree-loader path from Phase 1 for Phase 9's regeneration decision.
- **Prerequisites discovered**: None — Phase 8 turned out not to need the platform fix it was scoped for, but nothing blocked reconnaissance.

## Architectural Decisions

- No ADRs written or amended this session.
- Pattern applied: ADR-268 D2 (story tier outranks standard grammar game-wide) is the finding that redirected Phase 8 from a platform fix to a story fix — `disguise.chord`'s literal `wear dress` grammar was shadowing stdlib's wearing action, not a scope bug.
- Key decision (David, 2026-09-07): `wear <noun>` is never a story action's grammar; a story reacts to wearing via the entity's `on the player wearing` clause instead. Recorded in the plan's Phase 8 outcome and carried into the guide (Phase 9).

## Mutation Audit

- Files with state-changing logic modified: none. The session's only `packages/` change was a new test file (`packages/stdlib/tests/unit/validation/unplaced-entity-scope.test.ts`); all other edits were story content (`.chord`, `.story`, `.tests.json`) and docs.
- Tests verify actual state mutations (not just events): N/A — no side-effect functions were added or changed this session (rule 15's function-name signal did not fire; `mutation-verification` correctly did not run). The story's own mutation coverage is carried by the tree's `states:`/`channels:` claims, per the plan's References-consulted note on this project's convention.
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO. Phase 8's finding (a story grammar line shadowing a standard action game-wide) is a new instance of ADR-268 D2's documented ranking, not a repeat of a previously-flagged defect class; no prior session reported this confusion for `wear`/`disguise`.

## Test Coverage Delta

- Tests added: 4 (`packages/stdlib/tests/unit/validation/unplaced-entity-scope.test.ts`).
- Tests passing before: not separately tracked (new file) → after: 4 passing (evidence: event log `.devarch-events-3da76c.jsonl`, `Build passed` row for `pnpm --filter '@sharpee/stdlib' test unplaced-entity-scope`, timestamped 2026-09-07T06:46:37Z — after the 06:46:32Z write of the test file, so fresh). Secret Letter tree: 1468 cards / 2642 → 2643 assertions passing (the new `story.chapter.name is rooftops` channel claim on the `up` card) — re-run at finalization (`./sharpee test branch-stories/secret-letter --tree`): "1468 cards passing, 2643 assertions passing", 2026-09-07, after all session edits. Dungeo chain — re-run at finalization (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`): "952 passed", 2026-09-07, after the session's only `packages/` change (a test file).
- Known untested areas: the GH #206 exact-out-of-scope/intercept-ordering interaction (I-3da76c-3) has no test — not reproducible in this story, so nothing to pin yet.

---

**Progressive update**: Session completed 2026-09-07 02:05 CDT
