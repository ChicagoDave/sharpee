# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- Determine whether David's report — the Secret Letter opening renders "Chapter I - Grubber's Market" AFTER the room description in the IDE Play tab — is a code regression on `explorer-prototype`/`main`.
- If the fix exists elsewhere, land it on `explorer-prototype`.

## Phase Context
- **Plan**: No active plan (`.current-plan` resolved as deleted during this session's cherry-pick conflict — no plan currently pointed to).
- **Phase executed**: N/A — ad hoc investigation and fix, not a plan phase.
- **Tool calls used**: 133+ (session state as of last check) / N/A (no budget set — no plan/tier).
- **Phase outcome**: N/A.

## Completed

### Root-caused the report as a stranded-branch problem, not a regression
- `git log`/`git blame`/`git cherry` across `main`, `explorer-prototype`, and `feat/secret-letter-port` showed commit `fb9b60aee` (2026-09-06, "chapter title announces before the room") exists only on `feat/secret-letter-port` and its two descendants (`feat/adr-333-inline-play-edit`, `feat/adr-333-prose-provenance`) — never merged to `main`.
- `explorer-prototype`'s merge-base with `feat/secret-letter-port` is `f7771c882`, which is also `main`'s tip; `main` is 110 commits ahead of the port branch, and the port branch carries 33 commits `main` lacks (`git cherry` confirmed all 33 unapplied).
- Wider finding surfaced for David, **not acted on**: the port branch also carries platform fixes for GitHub issues that are CLOSED even though `main` doesn't have the code — #255, #275, #352, #356, #364–#375 — plus ADR-333 play-to-write IDE work. Filed as open item #543 below rather than decided here.

### Cherry-picked the fix onto `explorer-prototype`
- `git cherry-pick fb9b60aee` — conflicts resolved and staged; **not yet committed** (`git cherry-pick --continue` is the next action). `.git/CHERRY_PICK_HEAD` confirmed still pointing at `fb9b60aeebfffc995de049ab4133f14216c9388f`.
- Conflict resolutions:
  - `docs/context/.current-plan` — kept deleted (HEAD); no active plan today.
  - `docs/work/archive/publish-readiness/plan.md`, `packages/sharpee/docs/genai-api/index.md`, `stories/dungeo/src/version.ts` — kept HEAD.
  - `packages/story-loader/tests/adr-330-chapters.test.ts` — hand-merged: kept HEAD's `installStory`/no-placeholder boot, added the incoming `manifestIds` capture (`engine.on('channel:manifest', ...)`) and the imports `PREFERRED_LAYOUT_CHANNEL`, `PROSE_CHANNEL_IDS` (if-domain) and `STANDARD_CHANNELS` (stdlib); dropped the incoming `world.removeEntity(placeholder.id)`, `createNpcService`, and `EntityType` import (unused on HEAD).
  - `packages/platform-browser/tests/chapter-before-room.test.ts` (new) — ported from the incoming version to HEAD's engine API: `engine.installStory(story)` instead of `setStory` (ADR-344 D6), no `player` option / placeholder `createEntity`, `EntityType` import dropped.
  - `docs/context/session-20260905-2230-feat-adr-333-prose-provenance.md` — `git mv`'d into `docs/context/archive/` (repo keeps live sessions only).
  - Everything else auto-merged clean: `packages/if-domain/src/channels/{types,index}.ts` (`ChannelRegistrationPosition`, `add(channel, position?)`), `packages/stdlib/src/channels/registry.ts` (positional insert, throws on unknown `before` id), `packages/extensions/chapters/src/chapter-channel.ts` (registers `story.chapter` before `room-name`), ADR-163 §7 / ADR-330 D4 amendments, `docs/work/archive/chapter-before-room/plan.md`, website mdx + IDE docs-tab page, genai-api `if-domain.md`/`stdlib.md`.

### Verified the change with real-path tests, then re-verified independently this write
- `pnpm --filter '@sharpee/stdlib' test channels/registry` — 14 passing, 0 failures (re-run 2026-09-27 21:08 CDT).
- `pnpm --filter '@sharpee/ext-chapters' test` — 8 passing, 0 failures (re-run 2026-09-27 21:08 CDT).
- `pnpm --filter '@sharpee/story-loader' test adr-330-chapters` — 12 passing, 0 failures (re-run 2026-09-27 21:08 CDT); includes the D4-amended manifest-order assertion (`story.chapter` at banner+1, `room-name`-1) against the real engine's manifest.
- `pnpm --filter '@sharpee/platform-browser' test chapter-before-room` — 2 passing, 0 failures (re-run 2026-09-27 21:08 CDT); real `BrowserClient` over a real `GameEngine`, asserting DOM order banner → card → room-name → room-description on turn 1 and on a first-visit arrival.
- Type checks (`pnpm exec tsc --noEmit`) for if-domain, stdlib, ext-chapters, platform-browser, story-loader all exit 0 (event log corroborates two of these — `if-domain` and `ext-chapters` — as `Build passed` rows at 2026-09-28T02:03:02Z/02:03:04Z; the other three were reported by the session, not independently re-run this write).
- `./repokit build dungeo` — all platform packages compiled, genai-api regenerated, dungeo built; the final bundle step failed (see Open Items #542) — pre-existing, confirmed this write: `dist/cli/sharpee.js` is still the Sep 24 03:10 build, predating the 2026-09-26 commit (`aadac7364`) that introduced the offending subpath import.
- Story bundle rebuilt separately: `./sharpee build secret-letter.story` — `dist/web/secret-letter/game.js` carries `before:"room-name"`, confirmed by grep.

## Key Decisions

### 1. Cherry-pick, don't reconcile the whole port branch
The port branch (`feat/secret-letter-port`) stays tabled per existing project direction — only the one commit that fixes the reported symptom was pulled forward. The other 32 commits, including closed-issue fixes not present on `main`, are left for David to triage (filed as open item #543, not decided here).

### 2. Treat the CLI bundle failure as pre-existing, not caused by this session
Confirmed `dist/cli/sharpee.js`'s mtime (Sep 24) predates the commit that introduced the broken subpath import (Sep 26), and the error is in `transcript-tester`, a package untouched by this cherry-pick. Per CLAUDE.md ("never auto-retry failed builds or tests"), reported rather than fixed; filed as open item #542.

## Open Items

### Short Term
- 542: repokit bundle fails: esbuild alias maps @sharpee/story-loader subpath import to a single file

### Long Term
- 543: feat/secret-letter-port carries 15+ platform/IDE fixes (closed GH issues) never merged to main

## Files Modified

**Cherry-pick conflict resolution / housekeeping** (3 files):
- `docs/context/.current-plan` - conflict resolved: kept deleted (HEAD), no active plan
- `docs/context/archive/session-20260905-2230-feat-adr-333-prose-provenance.md` (new) / `docs/context/session-20260905-2230-feat-adr-333-prose-provenance.md` (old path) - `git mv`'d into archive per repo convention
- `docs/work/archive/chapter-before-room/plan.md` (new) - incoming plan, already archived on the source branch

**Channel registration positioning — the cherry-picked fix** (4 files):
- `packages/if-domain/src/channels/types.ts` - adds `ChannelRegistrationPosition`
- `packages/if-domain/src/channels/index.ts` - `add(channel, position?)` signature
- `packages/stdlib/src/channels/registry.ts` - positional insert, throws on unknown `before` id
- `packages/extensions/chapters/src/chapter-channel.ts` - `registerChaptersChannels` now registers `story.chapter` before `room-name`

**Tests, net +9 cases** (4 files):
- `packages/stdlib/tests/channels/registry.test.ts` - 10 → 14 tests
- `packages/extensions/chapters/tests/chapters.test.ts` - 7 → 8 tests
- `packages/story-loader/tests/adr-330-chapters.test.ts` - 10 → 12 tests; hand-merged (see Completed)
- `packages/platform-browser/tests/chapter-before-room.test.ts` (new) - 2 tests; ported to HEAD's engine API

**ADRs** (2 files):
- `docs/architecture/adrs/adr-163-channel-service-platform.md` - §7 amended
- `docs/architecture/adrs/adr-330-chord-chapters.md` - D4 amended

**Generated docs / version stamp** (5 files):
- `packages/sharpee/docs/genai-api/if-domain.md`, `index.md`, `stdlib.md`, `tooling.md` - regenerated by `./repokit build dungeo`
- `stories/dungeo/src/version.ts` - version stamp bumped by the build

**Website & IDE docs mirror** (3 files):
- `website/src/app/chord/guide/flow/chapters/content.mdx`
- `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`
- `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__flow__chapters.html`

## Notes

**Session duration**: ~30 minutes.

**Approach**: Treated David's regression report as a hypothesis to verify against git history (`git log`, `git blame`, `git cherry`, branch diffs) before touching any code — the fix already existed, just not where it was expected. Cherry-picked narrowly rather than reconciling the whole stranded branch.

**Left unstaged, deliberately, not part of this work**:
- `branch-stories/secret-letter/secret-letter.tests.json` - a one-line `"skip": true` on the `ne` death turn; David's own IDE edit from this evening.
- `docs/context/session-20260927-1737-explorer-prototype.md` - an unstaged post-push activity-log append from the prior session in today's sequence; untouched by this session (hook-tracked `files` array confirms it was not modified here).

**Cherry-pick is mid-flight**: staged, not committed. `git cherry-pick --continue` is the next action, with the commit message amended to record the cherry-pick source and the conflict resolutions above.

---

## Session Metadata

- **Session**: 5b6f1f
- **Status**: IN-FLIGHT
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: has orphaned artifacts — an in-progress cherry-pick (staged, uncommitted; `git cherry-pick --abort` would cleanly discard it) plus two intentionally-unstaged, unrelated files (see Notes).

## Dependency/Prerequisite Check

- **Prerequisites met**: `feat/secret-letter-port` still exists locally and was reachable for `git cherry`/diff; `fb9b60aee` was identifiable as the exact fix commit via its message and diff.
- **Prerequisites discovered**: None blocking.

## Architectural Decisions

- ADR-163 §7 amended: channel registration gains a `position` parameter (`{ before: <channelId> }`) — carried forward by this cherry-pick, not authored this session.
- ADR-330 D4 amended: chapter title channel registers before `room-name` — same origin.
- Pattern applied: positional channel registration via `IChannelRegistry.add(channel, position?)` (ADR-163 §7).

## Mutation Audit

- Files with state-changing logic modified: `packages/stdlib/src/channels/registry.ts` (`add()` — positional insert/throw), `packages/if-domain/src/channels/{types,index}.ts` (registration signature), `packages/extensions/chapters/src/chapter-channel.ts` (`registerChaptersChannels`).
- Tests verify actual state mutations (not just events): YES (evidence: `registry.test.ts` 14/14, `chapters.test.ts` 8/8, `adr-330-chapters.test.ts` 12/12, `chapter-before-room.test.ts` 2/2 — all re-run and passing 2026-09-27 21:08 CDT, after the last edit to these files; the platform-browser and story-loader suites assert real DOM/manifest order on a live `GameEngine`/`BrowserClient`, not events alone).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — searched prior session summaries in `docs/context/` for "stranded", "cherry-pick", "never merged"; no matches. This is the first recorded instance of a reported regression tracing to an unmerged branch rather than a code defect.

## Test Coverage Delta

- Tests added: +9 net this session's cherry-pick (registry +4, chapters +1, adr-330-chapters +2, chapter-before-room +2 new file).
- Tests passing before: 27 (10+7+10+0 across the four files pre-cherry-pick, per `git show HEAD:<path>`) → after: 36 (evidence: four fresh test runs, 2026-09-27 21:08 CDT, all green — see Mutation Audit).
- Known untested areas: the wider stranded-branch platform/IDE fixes (#543) have whatever test coverage they carry on the port branch, unexamined here.

---

**Progressive update**: checkpoint 2026-09-27 21:10 — first write this session; root-caused the reported regression to an unmerged branch, cherry-picked the fix (staged, mid-cherry-pick), re-verified all four real-path test suites green, filed open items #542 (pre-existing bundle failure) and #543 (stranded port-branch fixes).
