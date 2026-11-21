# Session Summary: 2026-11-19 - fix/724-emit-prints-nothing

## Goals
- Run `/devarch:finalize`, the session's request (17:46 CST), on a branch whose previous session (785b7e) had already committed and pushed `489d3aeac` ("a story event is not prose", ADR-405, refs #724).
- When `commit-remote`'s suite run failed: diagnose the failure, fix it (David chose "diagnose first", then fix A), and re-run the full suite to meet rule 14's pre-commit gate.
- Then, at David's requests: open the PR, and after his merge, close out ADR-405 and archive the plan, commit that close-out on `main`, and finalize a second time so `commit-remote` pushes it. The session began on the branch; the checkout is now on `main`, and this one file remains its summary.
- After that terminal write, David asked for "all of it, though just run the dry run action - I will do the live publish": (A) cut 5.7.1 and run the `Publish to npm` workflow as a dry run only, and (C) clean up. The live publish was his.
- After the publish, David said "go ahead and update the manual and the website": plan and carry out the re-pin of *The Chord Manual* and sharpee.net to Sharpee 5.7.1, ending with his deploy.

## Phase Context
- **Plan**: `docs/work/chord-manual-site-5-7-1/plan.md` ("The Chord Manual and sharpee.net brought up to Sharpee 5.7.1"), `**Plan Status**: ACTIVE`, written this session by `session-planner`; `.current-plan` names it. The earlier plan, `docs/work/archive/story-event-not-prose/plan.md`, is DONE and was archived this session.
- **Phase executed**: Phase 1 — "Re-pin the manual to Sharpee 5.7.1, prove it on the published release, and put 5.7.1 on the site" (Medium). The main session flipped it to DONE and advanced to Phase 2.
- **Tool calls used**: 411 for the whole session (state file). Phase 1 ran from counter 354 (event log 01:35:09Z, plan written) to 404 (02:14:37Z, its Demonstrated line written), about 50 of its 250.
- **Phase outcome**: Completed under budget
- **Out-of-scope changes**: `out of scope: docs/brainstorm/multi-world-stories/overview.md`. This is not this session's work. The untracked `docs/brainstorm/multi-world-stories/` belongs to David's second session; this session did not create or touch it. It shows up in the state file's `files` array only because it turned dirty while this session was running.

## Completed

### The suite failure diagnosed
- `commit-remote`'s assessment ran `pnpm exec turbo run test:ci` and got exit 1, with `@sharpee/channel-service` at 1 failed / 136 passed (event log 23:49:14Z, "Tests failed", "1 failed 8 passed 1 failed 136 passed"). The 27-of-39-tasks figure is [reported by session, unverified]. That run stopped before its commit step.
- `pnpm --filter '@sharpee/channel-service' test` named the failure: `tests/ac-16-cleanup-grep-gate.test.ts`, "finds every ADR-101 event-type only in allow-listed locations". It found four references to the literal `'media.sound.play'` that `489d3aeac` added at `packages/engine/tests/unit/story-events.test.ts:79,84` and `packages/engine/tests/prose-pipeline/stages/filter.test.ts:82,87`. This was a guard tripping, not a behaviour break: 785b7e never ran channel-service.

### Fix A: the samples renamed
- Those four lines now use `'yard-chime-played'` (story-events.test.ts) and `'chime-played'` (filter.test.ts): 4 insertions and 4 deletions across two files, and no file under any `src/`.

### The full suite re-run
- The main session ran `pnpm exec turbo run test:ci` once after the fix, and every task passed: "Tasks:    73 successful, 73 total", with the event log's row at 00:03:21Z (18:03:21 CST) reading "Tests passed". That is after the 17:58:32 CST edits, so rule 14's gate was met. Per-package counts are under Test Coverage Delta.

### Landed on main
- `da5ce270c` (the sample rename and this summary) was pushed to `fix/724-emit-prints-nothing` (push line `489d3aeac..da5ce270c`); the commit script also moved `docs/context/session-20261118-1903-main.md` into `docs/context/archive/`.
- At David's "create the PR", PR #820 opened from the branch into `main`. David merged it: `gh pr view 820` read `"state":"MERGED"`, `"mergedAt":"2026-11-20T00:19:56Z"`, merge commit `bb4a58a58`.
- 724 was closed by the merge at 2026-11-20T00:19:58Z (main session's report), not by this agent or the main session.
- The local checkout switched to `main` and fast-forwarded `1db000f2f..bb4a58a58`.
- `commit-local` committed the close-out below on `main` as `d1554e29f`; after the 18:26 terminal write, `commit-remote` committed that write as `9d613317e` and pushed `main` (`bb4a58a58..9d613317e`). The `d1554e29f` gate ran `pnpm exec turbo run test:ci` and passed (event log 00:24:27Z, "Tests passed").

### ADR-405 and the plan closed out
- `docs/architecture/adrs/adr-405-a-story-event-is-not-prose.md`: `**Planning**` moved from OPEN to IMPLEMENTED, and the Status line now names PR #820 and merge `bb4a58a58`. `INDEX.md` was rebuilt with `adr-index.sh`.
- `plan-archive.sh story-event-not-prose` moved the plan to `docs/work/archive/story-event-not-prose/` and released `.current-plan`. ADR-405's two citations of the plan path now point at the archive path (lines 7 and 67).

### Cleanup
- The git-ignored `dist/cli/sharpee-nofilter.js` was deleted at David's "all of it".
- The local branch `fix/724-emit-prints-nothing` (at `da5ce270c`, contained in `origin/main`) was deleted with `git branch -d`. The remote branch was already gone: GitHub removed it at the merge.

### Release 5.7.1 cut, committed, pushed and published
- `npx tsf version 5.7.1` moved 35 packages from 5.7.0 to 5.7.1 (34 under `packages/`, plus `stories/dungeo`). `./repokit build dungeo` restamped `engine-version.ts`, `stories/dungeo/src/version.ts` and `packages/sharpee/docs/genai-api/index.md`. Its exit 0 is [reported by session, unverified]: the event log has no build row for it.
- `commit-remote` committed the cut as `3c0f61b07` ("chore(release): Sharpee 5.7.1 … Chord stays 4.1.0") and pushed `main` (`9d613317e..3c0f61b07`). Its gate ran `turbo run test:ci` afresh: event log 00:35:23Z (18:35:23 CST), "Tests passed". The 73-of-73-tasks figure is [reported by session, unverified].
- `Publish to npm` dry run 44647105749 on `3c0f61b07`: `gh run view` reads conclusion "success", created 00:35:41Z (checked at this write).
- David ran the live publish himself as run 44652390237: `gh run view` reads "success" on head `3c0f61b07`, created 01:16:29Z (checked at this write). The log's last line, "✓ Published 34 package(s)", is the main session's report. Phase 1's Demonstrated line records `npm view … dist-tags.latest --prefer-online` printing 5.7.1 for both `@sharpee/sharpee` and `@sharpee/devkit`.
- The Chord language version stays at 4.1.0, the main session's call, told to David. ADR-405's entry in `packages/chord/src/version.ts` still reads "Pending publish", and David has not overruled the call.

### The manual and site plan
- At David's "go ahead and update the manual and the website", `session-planner` wrote `docs/work/chord-manual-site-5-7-1/plan.md` (2 phases) and pointed `.current-plan` at it. David ruled on D-1 by choosing (a), the 5.7.0-precedent re-check on published 5.7.1 with no naive-reader run: "A - We'll do another naive test when basic tests fail".

### Phase 1: the manual re-pinned to 5.7.1, and 5.7.1 put on the site
These figures come from the plan's Demonstrated line (2026-11-19, session 399582) and are [reported by session, unverified]. The event log has no test or build row between 01:35Z and 02:15Z, so no hook corroborates any of these runs.
- **Re-check.** It ran on `@sharpee/devkit@5.7.1` installed from npm into the scratchpad. `sharpee --version` printed "Sharpee 5.7.1 · Chord 4.1.0". `check-chord-snippets.cjs` printed "snapshots: 43 of 43 load" and "every fence is proven". `sharpee test .` in scratch copies of the 43 companion folders gave "TOTAL 43 directories, 37 exit 0"; the six that exited 2 are the tree-less `part-2` to `part-7`. No quoted reply moved.
- **Pin lines.** Five hand-written lines moved from 5.7.0 to 5.7.1: `book.yaml`, `frontmatter/00-title-page.md`, `frontmatter/00b-copyright.md`, `frontmatter/00-preface.md` and `parts/part-1/04-build-play-read-an-error.md`.
- **Appendices.** All seven were regenerated with `generate-chord-appendices.cjs --sharpee-cli <installed cli.js>`, which printed "Sources at Sharpee 5.7.1 · Chord 4.1.0". The diff stat reads "7 files changed, 7 insertions(+), 7 deletions(-)".
- **Book and downloads.** `build-book.sh chord-v4.1.0 all` and then `web` ran. In the new PDF, `pdftotext` finds "5.7.1" 11 times and "5.7.0" 0 times. `pdfinfo` reports 595 pages and 1769160 bytes, so `content.mdx` line 17 stays as it is. `publish-chord-manual.mjs` printed "58 pages → public/chord-manual/4.1.0/book/" and deleted no file. `git grep -n "Sharpee 5.7.0"` over the edition, the manual page and the web edition printed nothing.
- **Release note.** `docs/releases/release-5.7.1.md` is new. Its claims were read in source: `story.ts:314`, `prose-pipeline/types.ts:153`, `chord/src/ir.ts:36`, and an empty result from `git grep -w narrate -- packages/core/src`. One sentence was corrected while it was being written. The sentence about the loader refusing older IR was checked against `packages/story-loader/src/loader.ts:177`, which throws "Unsupported IR format …" (line re-read at this write), and rewritten to match.
- **Site data and IDE copy.** `npm --prefix website run build` exited 0 and regenerated three files: `versions.json` (`"sharpee": "5.7.1"`), `releases-data.json` (one 5.7.1 entry) and `search-index.json`. `build-docs-tab.sh` updated `chord-writer.html:8` to "Sharpee 5.7.1 / Chord 4.1.0".
- **Local check.** The site was served on port 3917, and `curl` got 200 from five routes. "/chord/manual" names "Sharpee 5.7.1" 3 times and 5.7.0 0 times. Both downloads, the web edition's index and "/releases" also answered, and "/releases" shows 5.7.1.
- **Plan scripts.** `plan-phase.sh flip` set Phase 1 to DONE and printed the out-of-scope line above. `advance` made Phase 2 CURRENT (since 2026-11-19), and `checkpoint-due.sh` said "due — 101 minutes since the last summary write". `git status -- packages stories` prints nothing at this write. This write marked the Demonstrated line `[reported by session, unverified]`.

## Key Decisions

### 1. Rename the samples rather than widen the AC-16 allow-list
The engine cases need some declared story-event name, not a media one in particular, so the ADR-101 gate stays as strict as it was. The plan's Decision 4 (a media `emit` prints nothing) is still pinned by `packages/story-loader/tests/gh-724-emit-prints-nothing.test.ts`, whose `'a media emit'` case uses `type: 'media.sound.play'` (line 223).

### 2. D-1 (a): the 5.7.1 pin is backed by the 5.7.0 precedent, not a naive-reader run
David's ruling. The proof is the npm install, the snippet check and the 43 tree runs. A naive-reader run waits until the basic checks fail.

### 3. Chord stays 4.1.0, so the edition keeps its 4.1.0 paths
Under ADR-257 the Chord language number moves only on a language change, and ADR-405 Decision 2 moves only `IR_FORMAT`. So `docs/book/chord-v4.1.0/`, `the-chord-manual-4.1.0.*` and `website/public/chord-manual/4.1.0/` keep their names.

## Next Phase
- **Phase 2**: "Deploy to sharpee.net and check it live". David runs `website/deploy.sh` on the server, which pulls `main` and rebuilds the site and the playground at 5.7.1. Once he says it is done, the session requests the live pages and records what they return in Phase 2's Demonstrated line.
- **Tier**: Small (100 tool-call budget)
- **Entry state**: Phase 1 is committed at David's word and pushed to `origin/main`, and David has confirmed he will deploy. The session never runs the deploy and never logs in to the server.

## Open Items

### Short Term
- 819: No test pins that prose from a story-header on every turn clause reaches the printed text
- 818: Dungeo unit transcripts: five fail on every run and three fail intermittently
- 815: Role hand-over on a turn that moves the player prints the wrong room heading and "can sees"
- 795: A silent phrase marker at the end of a description leaves a trailing space

### Long Term
- 817: Chord manual print-on-demand interior: spine width, an embedded Apple Color Emoji font, and Apple system font licences are unsettled
- 799: Chord manual PDF: the wrap filter width for listings inside aside boxes is worked out, not seen on a rendered page

## Files Modified

**Engine tests** (2 files, in `da5ce270c`):
- `packages/engine/tests/unit/story-events.test.ts`: sample becomes `'yard-chime-played'` (lines 79, 84)
- `packages/engine/tests/prose-pipeline/stages/filter.test.ts`: sample becomes `'chime-played'` (lines 82, 87)

**ADRs and the old plan** (in `d1554e29f`):
- `docs/architecture/adrs/adr-405-a-story-event-is-not-prose.md`, `docs/architecture/adrs/INDEX.md`, and the `story-event-not-prose` plan's move to `docs/work/archive/`

**Release cut 5.7.1** (38 files, in `3c0f61b07`):
- 35 `package.json` files, plus `engine-version.ts`, `stories/dungeo/src/version.ts` and `packages/sharpee/docs/genai-api/index.md`

**Phase 1, the manual and site re-pin** (staged by the next commit):
- `docs/book/chord-v4.1.0/book.yaml`, `frontmatter/00-title-page.md`, `frontmatter/00b-copyright.md`, `frontmatter/00-preface.md`, `parts/part-1/04-build-play-read-an-error.md`: pin lines 5.7.0 → 5.7.1
- `docs/book/chord-v4.1.0/backmatter/` (7 appendices): regenerated, one line each; `code-snippets/CATALOG.md`: re-extracted
- `docs/releases/release-5.7.1.md` (new)
- `website/src/app/chord/manual/content.mdx`: names Sharpee 5.7.1
- `website/src/lib/versions.json`, `website/src/lib/releases-data.json`, `website/public/search-index.json`: regenerated by the site build's sync
- `website/public/downloads/the-chord-manual-4.1.0.pdf`, `.epub`, and 10 pages under `website/public/chord-manual/4.1.0/book/`: rebuilt and republished
- `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord-writer.html`: rebuilt docs-tab copy

**Plan**: `docs/work/chord-manual-site-5-7-1/plan.md` (new; Phase 1 DONE with its Demonstrated line marked, Phase 2 CURRENT), and `docs/context/.current-plan` (re-created; names it).

**Session record**: this summary. Its 18:23 revision is in `d1554e29f` and its 18:26 revision in `9d613317e`; this write is staged by the next commit.

## Notes

**Session duration**: about 2.5 hours (17:46 to 20:16 CST), plus the side search.

**Approach**: diagnose before fixing; keep the smallest fix that leaves the guard intact; re-pin the manual only after the published CLI proved it.

- Session Start: 785b7e's summary was read, `pre-session-audit` ran (event log 23:46:29Z), the core concepts were read and the gate was cleared. The audit's `npx tsc --noEmit` passed (event log 23:46:40Z, "Build passed").
- Side request, with no repository changes. David asked for an unpushed research branch (several stories in one source, joined by a controller) made in a test container early on 2026-11-18. It was not found [reported by session, unverified]. David will reconstruct it. One route was not tried and was passed to him: local APFS snapshots from 2026-11-18 18:09 onward, which expire in about 24 hours.
- Side effects on the machine: the `alpine/git:latest` Docker image was pulled, and `git fetch --prune` removed the stale ref `origin/feat/adr-389-chord-loader`.
- Still David's: committing and pushing Phase 1 at his word, then the deploy (Phase 2), and overruling the Chord 4.1.0 call if he wants a language move. The live npm publish is done.
- `docs/brainstorm/multi-world-stories/` (untracked) is David's second session's work; nothing in this summary describes it.
- Open items: the list is carried from the 18:04 write (`issues.sh list-open`, 200 open), with 724 dropped after the merge closed it. The store was not re-listed at any later write, including this one. This agent filed, commented on and closed nothing.

---

## Session Metadata

- **Session**: 399582
- **Status**: IN-FLIGHT
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: merged to main
- **Commits**: `da5ce270c` (pushed; merged to `main` as `bb4a58a58` via PR #820), `d1554e29f` and `9d613317e` (pushed, `bb4a58a58..9d613317e`), and `3c0f61b07`, the 5.7.1 release (pushed, `9d613317e..3c0f61b07`). This write and Phase 1's change set are staged by the next commit (rule 18); its hash is in `git log -- docs/context/session-20261119-1746-fix-724-emit-prints-nothing.md`.

## Dependency/Prerequisite Check

- **Prerequisites met**: the AC-16 gate and the loader's gh-724 media case are both present. npm serves 5.7.1 for `@sharpee/sharpee` and `@sharpee/devkit` (Phase 1's entry state, recorded in its Demonstrated line).
- **Prerequisites discovered**: None

## Architectural Decisions

- ADR-405: Planning moved from OPEN to IMPLEMENTED when PR #820 landed; the decision itself did not change. ADR-101's AC-16 gate was applied, not changed.
- ADR-257 applied: the Chord language number is separate from the release train, so the manual's edition stays 4.1.0 at Sharpee 5.7.1.

## Mutation Audit

- N/A: only test sample names, version stamps, documentation and generated site data changed; no state-changing source logic was modified.

## Test Coverage Delta

- Tests added: 0 (four sample strings changed in two existing files).
- Before the fix: channel-service 1 failed / 136 passed (event log 23:49:14Z, "Tests failed").
- After the fix, run by work-summary-writer: `pnpm --filter '@sharpee/channel-service' test run ac-16` gave "Tests 2 passed (2)" (17:59:12 CST), and `pnpm --filter '@sharpee/engine' test run story-events filter` gave "Tests 19 passed (19)" (17:59:16 CST).
- Full suite after the fix: `pnpm exec turbo run test:ci`, "Tasks:    73 successful, 73 total" (event log 00:03:21Z, "Tests passed"). Per-package lines: channel-service 137 passed; engine 928 passed, 7 skipped; story-loader 1733 passed, 1 skipped; chord 1966; world-model 1687; character 641; parser-en-us 553; lang-en-us 484; branch-tester 473; transcript-tester 385; devkit 240 passed, 1 skipped; platform-browser 228; core 152; repokit 143 passed, 1 skipped; story-dungeo 58. These are the main session's grep of the saved output.
- After the 5.7.1 version stamp, the `3c0f61b07` gate re-ran `turbo run test:ci` and passed (event log 00:35:23Z, "Tests passed"). On the 5.7.1 bundle, the walkthrough chain gave "949 tests in 17 transcripts / 949 passed" [reported by session, unverified].
- Phase 1 added no tests. Its manual checks (snippet check, 43 tree runs, book and site builds) are [reported by session, unverified], as set out under Completed.
- Known untested areas, none run this session: `pnpm test:scripts`, `./repokit verify`, and the IDE's Xcode tests (nothing in Swift moved).

---

**Progressive update**: session completed 2026-11-19 17:47 — first write: a finalize-only session with no edits, committed work already on the remote, and the carried open items confirmed in the store.
**Progressive update**: session completed 2026-11-19 18:00 — revised after the failed `test:ci` assessment: AC-16 grep-gate failure diagnosed to `489d3aeac`'s engine test samples, fix A applied (samples renamed), focused re-runs corroborated, full suite not re-run, so the status moves to INCOMPLETE; side search for the research branch recorded.
**Progressive update**: session completed 2026-11-19 18:04 — the full `turbo run test:ci` re-run after the fix passed 73 of 73 tasks (event log 00:03:21Z), so rule 14's blocker clears and the status moves to COMPLETE (unverified: two minor session-reported claims); the suites still not run this session are named.
**Progressive update**: checkpoint 2026-11-19 18:23 — `da5ce270c` pushed, PR #820 merged as `bb4a58a58` (724 closed by the merge), checkout on `main`, ADR-405 Planning moved to IMPLEMENTED, the plan archived and `.current-plan` released; the status is IN-FLIGHT until the terminal write.
**Progressive update**: session completed 2026-11-19 18:26 — terminal write for the second `/devarch:finalize`: `d1554e29f` (the close-out) committed on `main` by `commit-local` with its `test:ci` gate passing (event log 00:24:27Z), unpushed until `commit-remote`; IN-FLIGHT promoted to COMPLETE (unverified: three session-reported figures).
**Progressive update**: checkpoint 2026-11-19 18:32 — the session continued after its terminal write: `d1554e29f` and `9d613317e` pushed (`bb4a58a58..9d613317e`), the cleanup done (nofilter bundle and the merged local branch deleted), 5.7.1 cut across 35 packages with three restamped files, Chord left at 4.1.0, and the walkthrough chain at 949 of 949 [reported]; the status returns to IN-FLIGHT ahead of the release commit and the npm dry run.
**Progressive update**: checkpoint 2026-11-19 20:16 — `3c0f61b07` (5.7.1) pushed with its gate passing (event log 00:35:23Z), the npm dry run and David's live publish both "success" by `gh run view`; the manual-and-site plan written with D-1 ruled (a); Phase 1 (manual re-pinned to 5.7.1, release note, site data, IDE copy) DONE with its Demonstrated line marked reported, Phase 2 (David's deploy) CURRENT; out-of-scope brainstorm path relayed and disowned; status stays IN-FLIGHT.
