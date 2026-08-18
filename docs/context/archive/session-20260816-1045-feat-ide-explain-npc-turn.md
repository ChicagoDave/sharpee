# Session Summary: 2026-08-16 - feat/ide-explain-npc-turn

## Goals
- Refresh the ADR-310/318 acceptance audit for Phase 7 (`docs/work/adr-310/plan.md`) to true up which criteria are DISCHARGED vs. still owed.
- Build the Phase 7 IDE deliverable: an "explain this NPC's turn" author-channel panel in the testing surface, on a new branch cut from `feat/adr-310-318-implementation`.

## Phase Context
- **Plan**: ADR-310/318 character-model-in-Chord implementation (`docs/work/adr-310/plan.md`), Plan Status ACTIVE.
- **Phase executed**: Phase 7 — "Acceptance closure — diagnostics completeness, isolation, cost regression, whole-platform regression, IDE surface" (Medium tier).
- **Tool calls used**: 213 recorded in `.session-state-a6c809.json` (of a 250 budget); event log shows a 70% budget banner fired at call 175 mid-session.
- **Phase outcome**: Audit-refresh half of Phase 7 completed this session; IDE-panel half reached a shippable v1 (tests green, live-rendered in the app) but the click-to-assert workflow is not yet David-verified end to end, so Phase 7 itself stays CURRENT — not flipped to DONE.

## Completed

### 1. Acceptance audit refresh (`docs/work/adr-310/acceptance-audit.md`)
- 310-AC3 and 310-AC4 upgraded from "(unit)" to fully DISCHARGED, backed by the b3-seek-out/recycle transcripts and the D8 edge-minted phrase messageId assertions at `character-model-phase.test.ts:203-244`.
- 318-AC3's forcing-clause caveat closed against the ADR amendment batch landed in `9366a5e4`.
- Work-list items 1-4 and 7 struck as complete; item 9 (`tsf build --npm` regression) RETIRED per David's 2026-08-16 ruling that tsf is a version-bump tool only, not a local regression leg.
- Verdict recorded: all 9 ADR-310 criteria and all 8 ADR-318 criteria DISCHARGED.
- Same-session confirmation run via `dist/cli/sharpee.js`: thealderman 75 passing across 9 transcripts, b1 15 passing, b3 63 passing (b1 variants each need their own `--story` file per their transcript headers).
- This left the IDE author-channel polish as the sole remaining Phase 7 deliverable.

### 2. "Explain this NPC's turn" panel v1, new branch `feat/ide-explain-npc-turn`
- **Wire flip (David pre-approved)**: `packages/devkit/templates/browser/index-testing.html` sets `window.__SHARPEE_AUTHOR_CHANNELS__ = true`; both `browser-entry.ts.template` and `chord-browser-entry.ts.template` read the global and pass `clientCapabilities: { ...BROWSER_CAPABILITIES, authorChannels: true }`. The flip lives on the IDE-only testing page — the publish path (`index.html`) never carries it, keeping D12/AC8 channel isolation intact.
- **Digest addendum**: `WorldDigestEntity.id` added in `packages/platform-browser/src/turn-events.ts` and `world-digest.ts` so the panel can resolve `npcId` to a display name; `world-digest.test.ts` updated to the new shape.
- **Panel module** (`tools/ide/web/testing-surface/src/character.ts`, new, 257 lines): row extraction from the `character` channel capture, per-kind describers for arbitration/ledger/pressure/paralysis/witnessed/`npc.character.*` transitions, party-name resolution (unresolvable id falls back to "the player"), and per-NPC grouping.
- **Card UI**: `cards.ts` gained an `NPC ×n` toggle and inline panel (click a line to see the raw payload); `main.ts` gained the delegate methods; `surface.css` gained panel styling plus a `--ts-warn` token.
- **Click-to-assert**: built after David's objection that "when I run tests, the lie is not validated." Each panel line now carries durable JSON fragments (kind, npcId, identity fields — volatile fields excluded); the assert button writes a `{ id: 'character', contains: [fragments] }` channel claim via `model.addChannel` (`main.ts:342`), which lifts the auto-assertion policy's `[SKIP]`. The CLI run derives the channel from the claim per D15 and validates it.
- **Real-path test additions**: `chord-build.test.ts` now asserts the built testing page carries the `authorChannels` flip, that `game.js` reads it into `authorChannels: true`, and that the player-facing build never carries it.
- **Fixture repair**: `tree-session-real-path.test.ts` and `ac-signoff-cli.test.ts` were failing at the branch point (10 pre-existing failures) because the `mini.story` fixture used the removed inline `authors:` grammar; fixed to list form, clearing all 10.

## Key Decisions

### 1. The author-channel flip is declared by the page, not inferred from embedding
`window.__SHARPEE_AUTHOR_CHANNELS__` is set only in `index-testing.html`, never derived from "am I running inside the IDE." Keeps the isolation boundary (D12/AC8) a static, auditable property of which HTML page shipped, not a runtime guess.

### 2. Assert fragments are durable by design
The click-to-assert fragments intentionally exclude volatile fields (raw payload noise) so a recorded assertion survives replays across turns/seeds rather than pinning incidental values.

### 3. `tsf build --npm` dropped from Phase 7's exit criteria
Per David's 2026-08-16 ruling (tsf is a version-bump tool; npm-publish regression runs in CI, not locally), acceptance-audit work-list item 9 was retired rather than discharged.

## Next Phase
- No Phase 8 exists — Phase 7 is the plan's last phase. It remains CURRENT (not advanced to DONE this session): the panel v1 is built and test-green, but the click-to-assert persist-and-run round trip has not yet been exercised live by David.
- **Entry state for closing Phase 7**: David runs the assert/save/re-run flow in the built Chord Writer app and confirms it holds; on confirmation, plan.md Phase 7 status and the plan-level rollup (`**Plan Status**`) can be updated and the plan archived per ADR-0007 Decision 5.

## Open Items

### Short Term
- David's live verification of the assert → persist → re-run flow (pending — see Blocker below for why the first attempt didn't reflect the change).
- Commit the branch (`feat/ide-explain-npc-turn`) — clean git status is currently all staged-but-uncommitted changes plus new untracked files.
- `stories/thealderman/chord/thealderman.config.json`, `thealderman.tests.json`, and the `ifid:` line added to `thealderman.story` are Chord Writer-generated artifacts from David's live playtest, not authored edits — confirm he wants them committed (they look benign: an IFID stamp + a recorded assertion-card set) before staging.
- Phase 7 status flip in `plan.md` is pending David's sign-off on the panel.

### Long Term
- `/Applications` and any `release/` copies of Chord Writer still predate the panel — only the Debug build under Xcode's `DerivedData` carries `ts-character-assert` today (verified this session).
- Full IDE UI polish may extend past this phase's budget into ADR-294's own surface work, per the plan's own flag — watch for scope growth there.

## Files Modified

**Acceptance audit** (1 file):
- `docs/work/adr-310/acceptance-audit.md` - AC3/AC4 upgraded to DISCHARGED, AC3 forcing-clause caveat closed, work-list items 1-4/7 struck, item 9 retired, verdict added

**devkit (author-channel wire flip)** (4 files):
- `packages/devkit/templates/browser/index-testing.html` - sets `window.__SHARPEE_AUTHOR_CHANNELS__`
- `packages/devkit/templates/browser/browser-entry.ts.template` - reads flag into `clientCapabilities.authorChannels`
- `packages/devkit/templates/browser/chord-browser-entry.ts.template` - same, Chord entry point
- `packages/devkit/src/standalone/chord-build.test.ts` - real-path assertions on testing-page flip, `game.js` read, and player-build isolation

**platform-browser (digest addendum)** (3 files):
- `packages/platform-browser/src/turn-events.ts` - carries `WorldDigestEntity.id`
- `packages/platform-browser/src/world-digest.ts` - `id` field added to the digest entity shape
- `packages/platform-browser/tests/world-digest.test.ts` - updated to new shape

**testing-surface panel** (7 files):
- `tools/ide/web/testing-surface/src/character.ts` - new; row extraction, per-kind describers, party-name resolution, grouping
- `tools/ide/web/testing-surface/tests/character.test.ts` - new; 11 tests covering extraction, grouping, describers, fragment durability
- `tools/ide/web/testing-surface/src/cards.ts` - `NPC ×n` toggle + inline raw-payload panel
- `tools/ide/web/testing-surface/src/main.ts` - delegate methods, click-to-assert `model.addChannel` wiring
- `tools/ide/web/testing-surface/src/surface.css` - panel styling, `--ts-warn` token
- `tools/ide/web/testing-surface/tests/ac-signoff-cli.test.ts` - fixture repair (removed-grammar fix)
- `tools/ide/web/testing-surface/tests/tree-session-real-path.test.ts` - fixture repair (removed-grammar fix)

**IDE bundled resources, rebuilt** (2 files):
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.css` - synced from source bundle rebuild
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js` - synced from source bundle rebuild (+292/-lines from the panel work)

**Incidental** (2 files, untouched by this session's authored work but present in the diff):
- `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`
- `tools/ide/SharpeeIDE/Resources/story-templates/story.story.template`

**Story metadata, IDE-generated during live playtest** (3 files — confirmed by diff, not authored edits):
- `stories/thealderman/chord/thealderman.story` - Chord Writer stamped an `ifid: 0A04F181-78BF-477D-852D-4DE0BDF8C034` line into the story header
- `stories/thealderman/chord/thealderman.config.json` - new; project config stub carrying the same IFID + version, written by the app
- `stories/thealderman/chord/thealderman.tests.json` - new; a recorded assertion-card set (opening card asserting `info.title`/`info.description`, a Foyer description card, more) — David's exploration of the testing surface during the live-verification pass

## Notes

**Session duration**: this chunk ~1.5 hours (audit refresh carried over from the 09:30 checkpoint of the same session; IDE branch work ~15:56-16:58 UTC, plus a post-hoc Xcode rebuild to resolve the build-race blocker below).

**Approach**: audit-refresh first (closing out Phase 7's non-IDE acceptance debt), then cut a dedicated branch for the IDE deliverable per David's ownership ruling from the prior session (session 9f5f5b8d: "the polished Chord Writer panel belongs to Phase 7 on this branch").

**Live verification**: David played thealderman on the testing surface in Chord Writer; the panel rendered correctly (screenshot showed mint + deposit lines grouped under Viola).

---

## Session Metadata

- **Status**: COMPLETE (unverified: the click-to-assert persist-and-run round trip has not been exercised by David in the built app — the fragment-generation logic is unit-tested at `character.test.ts:114`, and `serializeTreeDocument`/`deserializeTreeDocument` round-trip was checked manually during the session, but no automated test drives `model.addChannel` through a full save→CLI-run cycle for a character assertion)
- **Blocker** (if any): resolved during the session — see Recurrence-adjacent note below; not open at session end.
- **Blocker Category**: N/A (resolved)
- **Estimated Remaining** (if incomplete): N/A — remaining work is a single live-verification pass by David, not development work.
- **Rollback Safety**: safe to revert — branch is new (`feat/ide-explain-npc-turn`), nothing merged, working tree not yet committed.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2's raw author-channel readout (session 9f5f5b8d) and Phase 6's completed thealderman Chord story provided the data source and content this panel renders against.
- **Prerequisites discovered**: none beyond the `mini.story` fixture's stale `authors:` grammar, which blocked two real-path suites at the branch point and was fixed in-session.

## Architectural Decisions

- None new this session. Applied existing decisions: D12/AC8 channel isolation (ADR-310), D15 channel-claim derivation (auto-assertion policy).

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/web/testing-surface/src/main.ts` (`model.addChannel` call at line 342, writing a channel claim into the tree document on click-to-assert).
- Tests verify actual state mutations (not just events): **NO, partial** — `character.test.ts:114` asserts the *fragment payload* generated for the assert button (kind/npcId/identity fields present, volatile fields excluded) but no test in this session's diff drives `model.addChannel` end-to-end and asserts on the resulting document's serialized channel claim. The `serializeTreeDocument`/`deserializeTreeDocument` round trip was checked manually, not by an added test.
- If NO: add a test that clicks assert (or calls the equivalent handler), serializes the document, deserializes it, and asserts the `character` channel claim with its `contains` fragments is present and byte-stable.

## Recurrence Check

- Similar to past issue? Uncertain — no prior session summary in this session's context names this specific shape (David rebuilding the app before a session's bundle changes had landed, so the built artifact silently lacked the change under test). It rhymes with the general "verify before declaring done" discipline this project already follows but was not found logged as a named recurring blocker.
- No broader audit triggered this time — the fix applied (verify the built `.app` bundle contains the change via `grep` before asking for a live test) is a one-line habit change, not evidence of a systemic gap.

## Test Coverage Delta

- Tests added: 11 (new `character.test.ts`), plus 3 real-path assertions added to `chord-build.test.ts`.
- Tests passing before → after (fresh runs, this session, 2026-08-16 ~12:00 CDT):
  - `@sharpee/platform-browser`: 142 passing (15 test files) — confirmed via `pnpm --filter '@sharpee/platform-browser' test`.
  - `@sharpee/devkit`: 167 passing, 1 skipped (25 test files + 1 skipped) — confirmed via `pnpm --filter '@sharpee/devkit' test`.
  - `tools/ide/web/testing-surface`: 75 passing (8 test files) — confirmed via `npx vitest run` in that directory; event log shows this suite at 74 passing mid-session (budget 131-174/250) before the final `character.test.ts` addition brought it to 75 (budget 196/250).
  - Root `npx tsc --noEmit`: clean (no output), confirmed fresh this session.
- Known untested areas: the click-to-assert → `model.addChannel` → document-round-trip → CLI-validate chain has no automated end-to-end test (see Mutation Audit above).

---

**Progressive update**: Session completed 2026-08-16 12:15 CDT
