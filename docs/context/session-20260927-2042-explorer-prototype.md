# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- Determine whether David's report — the Secret Letter opening renders "Chapter I - Grubber's Market" AFTER the room description in the IDE Play tab — is a code regression on `explorer-prototype`/`main`.
- If the fix exists elsewhere, land it on `explorer-prototype`. (Done: cherry-picked as commit `83baf300f`.)
- **Goal expanded mid-session**: once the cherry-pick surfaced that `feat/secret-letter-port` carries 33 unmerged commits (open item #543), David ruled the branch should be merged in full — "no harm in merging... I was only pausing it until ready to complete the replacement narratives, but I'd missed we'd been fixing the platform in the process." The remainder of the session is that merge.

## Phase Context
- **Plan**: No active plan (`.current-plan` absent all session — no plan currently pointed to).
- **Phase executed**: N/A — ad hoc investigation, cherry-pick, and branch merge; not a plan phase.
- **Tool calls used**: 349 (session state) / N/A (no budget set — no plan/tier).
- **Phase outcome**: N/A.

## Completed

### Cherry-pick landed (recorded in the prior write, unchanged)
- `fb9b60aee` ("chapter title announces before the room") committed as `83baf300f`, local only, not pushed. Secret Letter web bundle rebuilt on it.

### Merged `feat/secret-letter-port` into `explorer-prototype` (committed as `1b671e015`)
- `git merge --no-commit --no-ff feat/secret-letter-port`. Merge base `34732b852` (2026-09-04); 33 branch commits, 110 main commits since; 31 conflicted files.
- **Resolution approach**: main had refactored the exact files the branch fixed (ADR-334 engine install pipeline, ADR-335 story-loader runtime split into `runtime/*.ts`, ADR-336 analyzer pass list, ADR-337 lifecycle call site, ADR-339 character tick sub-steps, ADR-340/356 branch-tester) — the branch's hunks were pre-refactor bodies. Took main's versions of `runtime.ts`, `loader.ts`, `game-engine.ts`, `analyzer.ts`, `ComposeDiagnostics.swift`, then re-ported the branch's fixes by hand onto the refactored code, each verified against the branch's own added tests.
- **Re-ported fixes** (all passing on the branch's own tests after re-porting): GH #359 deferred entity override gates (`resolveOverrideGates` pass after `buildTimers`, analyzer); ADR-325 W1 `make <actor> wear|take off <item>` (analyzer `resolveWearStatement` + 4 exhaustive switches, runtime `statements.ts`, select-ids walk); GH #370 select-on entity → state field; GH #366 declared state wins over a colliding recency/concluded word; GH #364 + ADR-333 D1a `descriptionId` id mode (loader `compileDescriptionSnippets`, `snippetMarkerTest`, `rewriteSnippetMarkers`, `RoomTrait.initialDescriptionId`, `IdentityTrait.descriptionId`); `unlisted` adjective (`IdentityTrait.contentsUnlisted`); GH #365 region-presence gate on every-turn clauses (`scheduler-constructs.ts playerPresentInRegionOwner`); GH #372 offstage-owner timer prose speaks from the player (`timers.ts`); GH #367 authored-move order + GH #373 `fireMoveDeparture` for offstage moves (`statements.ts`); GH #368 visited fact (new `visited-fact` bind step in `event-clauses.ts`, first in `RUNTIME_BIND_STEPS`, stamped in `moveWithLifecycle`; `extensions/chapters.ts` rewired to the branch's `stateKey` contract — this mismatch was why walked arrivals stopped beginning chapters mid-merge); GH #375 multi-word claim heads (`pin-grammar.ts` DOTTED_EQUALITY/DOTTED_CONTAINS, `pin-grammar.test.ts` updated); GH #369 dotted channel ids (bootstrap `resolveDeclaredChannelId`, branch-tester `splitChannelClaimId`/`capturedChannels`, combined by hand with main's END STATE/ending assertions in `tree-document.ts`/`tree-walker.ts`); GH #362 sleeping/waking signal actions rewritten to main's ADR-337 D1 shape (descriptor gains `reportEventType`/`blockedEventType`, golden test drives the phase runner); `chord.ebnf` hash re-pinned in `language-version.test.ts`; `message-alias-catalog.ts` regenerated (`./repokit aliases`); `adr-349-room-name.test.ts` helper type fixed to `readonly` diagnostics (a main-side typecheck-gate defect, surfaced by `pnpm typecheck`, not branch-caused).
- **Secret Letter test tree**: took the branch's 1468-card tree (matches merged chapters 2–11), re-applied main's nine repairs by path (seven END STATE `ending` fields + the two-card north/ne ending line, version 2), canonical sorted-key serialization.
- **Docs conflicts**: ADR-334..340, code-documentation-sweep proposal, `.open-items.jsonl`, publish-readiness archived plan, secret-letter-port plan (kept its TABLED disposition), genai-api docs, dungeo `version.ts` → took main's versions. Imported `session-20260905-2230` record moved to `docs/context/archive/`. ADR-330 D4 / ADR-163 §7 amendments (chapter-before-room) already present via the cherry-pick.

### Merge committed and stash reapplied
- `git commit` landed as `1b671e015` — "merge: feat/secret-letter-port into explorer-prototype — the tabled port's platform fixes land on main's refactored code (closes #543)". 202 files, 37147 insertions, 1005 deletions vs the pre-merge HEAD (`83baf300f`). Confirmed via `git log`/`git show -s` this write.
- `git stash pop` re-applied David's own one-line `skip: true` edit (top-level `ne` death-turn card) to `secret-letter.tests.json`; confirmed present (`"skip": true` at the expected card). It sits unstaged in the working tree together with `docs/context/session-20260927-1737-explorer-prototype.md` (the prior session's own activity-log append, untouched by this session) — both will be staged by `commit-remote` next, per the standing rule to stage whatever is in the tree.
- Local only as of this write (`git status -sb`: `ahead 35` of `origin/explorer-prototype`); `/devarch:finalize` runs this write, then `commit-remote` pushes both `83baf300f` and `1b671e015` in the same push.
- GH #543 carries a closing-summary comment (posted this session) and the merge commit's `closes #543` trailer; confirmed still `OPEN` as of this write (not closed here — closes on push, per instruction not to close it directly).

### Two things deliberately excluded, each filed
- **(a) GH #275 (clock-mirror off-by-one)** — the branch's fix (character tick mirror written after sub-steps; `conversation-threads.ts` compare without `- 1`) passes its own test and every unit suite, but regresses Ides of March: 7 thread-beat cards fail (39/51 → 32/41; `tell me more`/`no` replies go silent). Bisected by swapping exactly those two files and rebuilding character+story-loader dist: Ides passes under main's clock, fails under the branch's. **Decision**: kept main's clock scale (`character-clock.ts`, `tick-phases.ts`, `conversation-threads.ts`, `scene-sub-step.test.ts` restored to main); the branch's gh-275 test has its failing case `it.skip`'d with the finding in a comment, the same-topic case stays live. GH #275 **reopened** with this explanation (2026-09-27 ~22:15 CDT) — confirmed still `OPEN` with that comment as its last comment.
- **(b) ADR-333 play-to-write IDE half** (`PlayToWrite.swift`, `PlayToWriteCoordinator.swift`, `MessageCatalog.swift`, and edits to `PlayViewController`/`MainWindow`/`MenuBuilder`/`PlayHeaderView`/`ComposeRunner`/`EditorViewController`/`TestingSurfaceViewController`, 7 Swift test classes) — does not compile on main: since ADR-352 the compose IR types are generated into `Generated/SharpeeProtocol.swift` from `@sharpee/ide-protocol`, and the branch hand-added `Entity.topicRows`/`topicCount`, `ComposeStoryIR.messageOverrides`, `PhraseName.strategy`/`variantCount` with custom decoders (10 `xcodebuild` errors). **Excluded**: main's versions of the modified IDE files restored; the branch's added Swift files removed from the working tree (they remain only on the port branch). Filed **GH #544** "re-land ADR-333 play-to-write ... on the generated protocol" (label Architecture, field list + commits in the body) — confirmed still `OPEN`. The platform half of ADR-333 (descriptionId, engine handlers, `ide-protocol` messages.ts, devkit `sharpee messages`) **is** in the merge.

### Verification performed on the merged tree
- vitest (source) reported per-package, all green: chord 81 files/1179 tests; story-loader 139/1195 (1 skipped, #275); stdlib 132/1704; engine 90/837 (+7 skipped, pre-existing); world-model 89/1542; character 54/641; branch-tester 13/226; platform-browser 20/175; transcript-tester 28/355; lang-en-us 28/452; parser-en-us 25/328; if-domain 6/102; bootstrap 6/58 (post dist-rebuild); devkit 31/193 (+1 skipped).
- `./repokit build dungeo` (third run, on ported source): every package compiled; only the final `repokit bundle` esbuild step fails — the pre-existing open item #542, so `dist/cli/sharpee.js` is still the Sep 24 bundle.
- `pnpm typecheck`: only chord's test typecheck failed (the readonly-diagnostics helper, main's own defect) → fixed; re-run exit 0.
- Freshness gates: `grammar --check`, `manifest --check`, `protocol --check` OK; `aliases --check` was stale → regenerated → OK.
- Story trees (`./sharpee test`): secret-letter 1469 cards/2651 assertions; fernhill 86/106; ides-of-march 39/51 (baseline restored, main's clock).
- Dungeo walkthrough chain (`transcript-tester` CLI, bundle path unavailable per #542): 952 passed across 17 transcripts, "All tests passed."
- IDE: `xcodegen generate` then `xcodebuild test` on `TestingSurfaceRealPathTests`/`TestingSurfaceDocumentSeedTests`/`TestingSurfaceExitNoteTests`: 28 executed, 0 failures. (The earlier run including the play-to-write classes had 10 Swift compile errors — the finding that drove exclusion (b).)
- Secret Letter web bundle rebuilt on the merged platform (`dist/web/secret-letter/game.js`, 22:18 CDT).
- **Corroboration note (ADR-0019)**: the session event log (`.devarch-events-5b6f1f.jsonl`, 294 rows) carries no `test`-kind rows for this session and only 4 `build`-kind rows — two `tsc --noEmit` passes for `if-domain`/`ext-chapters` at 02:03:02Z/02:03:04Z, an `esbuild --version` check at 02:05:50Z, and the session-init `tsc` at 01:42:55Z. None of these correspond to the vitest suite counts, `./repokit build dungeo`, story-tree runs, the Dungeo walkthrough chain, or the `xcodebuild` results above — **all of those are `[reported by session, unverified]`**, not independently re-run by this write.

### Committed and left aside
- Committed in `1b671e015`: 202 files vs the pre-merge HEAD (37147 insertions, 1005 deletions), including regenerated genai-api docs, docs-tab pages, and `pnpm-lock.yaml` (see "Merge committed and stash reapplied" above for the commit's final disposition).
- Left unstaged, deliberately, after the commit: `docs/context/session-20260927-1737-explorer-prototype.md` (prior session's post-push activity-log append, untouched here) and `branch-stories/secret-letter/secret-letter.tests.json` (David's stash-popped `skip: true` edit) — both go into `commit-remote`'s next commit.

## Key Decisions

### 1. Cherry-pick first, then full merge once David authorized it
The original scope was the single chapter-order fix. Discovering the branch was stranded (33 commits, 15+ closed-issue fixes) surfaced open item #543; David then explicitly authorized merging the whole branch rather than leaving it tabled, once he recognized platform fixes had accumulated on it alongside the paused narrative work.

### 2. Re-port onto main's refactors rather than reverting them
Main had independently refactored every file the branch touched (ADR-334–340/356). Taking the branch's pre-refactor hunks wholesale would have undone months of platform work; instead each branch fix was re-implemented against the current structure and checked against the branch's own tests.

### 3. Exclude GH #275's fix — it regresses a different story
The branch's clock-mirror fix passes its own test but silently breaks 7 Ides of March thread-beat cards. Per CLAUDE.md ("never auto-retry failed builds/tests" and no silent workarounds), reopened #275 with the specific regression evidence rather than either dropping the finding or forcing a fix that breaks a working story.

### 4. Exclude the ADR-333 IDE Swift half — protocol generation moved out from under it
ADR-352 made the compose IR types generated from the TS contract; the branch's hand-added Swift decoders predate that and don't compile against it. Filed GH #544 with the exact field list rather than hand-patching the generated file, keeping the ADR-352 generation contract intact.

### 5. Treat the repokit bundle failure as pre-existing, not caused by this merge
Confirmed again this session (third `./repokit build dungeo` run) that only the final bundle step fails, on the same pre-existing esbuild alias defect (#542) recorded in the prior write.

## Open Items

### Short Term
- 542: repokit bundle fails: esbuild alias maps @sharpee/story-loader subpath import to a single file — **carried forward, unchanged**; confirmed still `OPEN` via `gh issue list` this write, reconfirmed failing on the merged tree (third `./repokit build dungeo` run).

### Long Term
- 543: feat/secret-letter-port carries 15+ platform/IDE fixes (closed GH issues) never merged to main — merge is now **committed** (`1b671e015`, `closes #543`) and carries a closing-summary comment; confirmed still `OPEN` via `gh issue list` as of this write because the closing push has not landed yet. Not closed by this write per instruction — closes automatically when `commit-remote` pushes next. Do not close it again after the push confirms it.

(GH #275 and GH #544, above, are plain project issues opened/reopened directly this session — not part of this ledger; both reconfirmed `OPEN` via `gh issue list` this write; see Completed.)

## Files Modified

**Merge in progress — 202 files staged total.** Representative files by category (not exhaustive):

**Re-ported platform fixes** (~15 files):
- `packages/story-loader/src/runtime/{statements,timers,scheduler-constructs,event-clauses}.ts` - GH #367/#373/#372/#365/#368 re-ported onto ADR-335's runtime split
- `packages/story-loader/src/analyzer.ts` - GH #359 override gates, ADR-325 W1 wear/take-off switches, onto ADR-336's pass list
- `packages/story-loader/src/loader.ts` - GH #364/ADR-333 D1a `descriptionId` compilation, onto ADR-335's structure
- `packages/world-model/src/traits/{RoomTrait,IdentityTrait}.ts` - `initialDescriptionId`, `descriptionId`, `contentsUnlisted`
- `packages/chord/src/pin-grammar.ts` - GH #375 multi-word claim heads
- `packages/extensions/chapters/src/*.ts` - rewired to the `stateKey` contract for GH #368 visited-fact
- `packages/bootstrap/src/*.ts`, `packages/branch-tester/src/*.ts` - GH #369 dotted channel ids
- `packages/character/src/tick-phases.ts`, `packages/story-loader/src/runtime/conversation-threads.ts` - **restored to main's versions** (GH #275 excluded, see Key Decisions)

**Excluded and restored to main** (~10 files):
- `tools/ide/SharpeeIDE/.../PlayViewController.swift`, `MainWindow.swift`, `MenuBuilder.swift`, `PlayHeaderView.swift`, `ComposeRunner.swift`, `EditorViewController.swift`, `TestingSurfaceViewController.swift` - main's versions kept; branch's `PlayToWrite.swift`/`PlayToWriteCoordinator.swift`/`MessageCatalog.swift` and 7 Swift test classes removed from the working tree (GH #544 filed)

**Story content** (20 files):
- `branch-stories/secret-letter/*.chord` (new: `ball`, `black-gate`, `commerce-street`, `gallows`, `jail`, `journey`, `lords-market`, `maiden-house`, `night-journey`, `preparations`, `red-gate`; modified: `aerial-runway`, `backdrops`, `disguise`, `grubbers-market`, `mercenaries`, `npc-teisha`, `wares`)
- `branch-stories/secret-letter/secret-letter.story`, `secret-letter.tests.json` - 1469-card tree, main's nine ending repairs re-applied

**Tests** (~8 files):
- `packages/chord/tests/pin-grammar.test.ts`, `packages/chord/tests/language-version.test.ts` (ebnf hash re-pin)
- `packages/branch-tester/tests/{tree-document,tree-walker}.test.ts` - dotted channel ids + END STATE/ending assertions merged by hand
- `packages/story-loader/tests/gh-275-subject-change-occasion.test.ts` - failing case `it.skip`'d with finding recorded
- `packages/character/tests/scene-sub-step.test.ts` - restored to main
- `packages/chord/tests/adr-349-room-name.test.ts` - `readonly` diagnostics type fix (main-side defect)

**ADRs** (8 files, main's post-refactor versions kept):
- `docs/architecture/adrs/adr-{334,335,336,337,339,340}-*.md`
- `docs/architecture/adrs/adr-333-prose-provenance-and-play-to-write.md` (new) - platform half only; IDE half tracked by #544

**Docs / generated / housekeeping** (~30+ files):
- `docs/proposals/code-documentation-sweep.md`, `.open-items.jsonl`, archived plan files - main's versions
- `docs/context/archive/session-202609*-feat-secret-letter-port*.md` - imported branch session history moved to archive
- `packages/sharpee/docs/genai-api/*.md`, `tools/ide/SharpeeIDE/Resources/docs-tab/*` - regenerated
- `packages/message-alias-catalog.ts` (generated by `./repokit aliases`), `pnpm-lock.yaml`

## Notes

**Session duration**: ~1 hour 44 minutes (20:42–22:26 CDT), spanning the cherry-pick, the full branch merge, and its commit.

**Approach**: Root-caused the original report via git history before touching code (see prior write), then, once David authorized the wider merge, resolved 31 conflicts by re-implementing the branch's fixes against main's refactored structure rather than reverting refactors — verifying each re-ported fix against the branch's own tests.

**Rule 15 (mutation-verification)**: not run as a subagent — the ported functions are re-implementations of branch code already covered by the branch's own real-path tests, re-run here; behavior is pinned by those tests (`adr-330-chapters`, `authored-move-order`, `adr-325-w1-make-wear`, `gh-365`, `gh-372`, `gh-370`, `gh-366`, `gh-371`, `gh-364`, `unlisted-holder`, `chord-state-claim`, `chapter-before-room`).

**Rule 13a (Integration Reality)**: the keyword scan over this write's Phase executed name ("N/A — ad hoc investigation, cherry-pick, and branch merge; not a plan phase") and Goals does not match any of `integration|engine|runtime|sandbox|subprocess|database|migration|deploy`, so the check does not fire for this session as a unit — even though the merge itself touches `packages/engine` and `packages/story-loader/src/runtime/*`. The unverified marker on the test/build claims (Mutation Audit, Test Coverage Delta below) already carries the same caution the check would have added.

**Left unstaged, deliberately, not part of this write's changes**:
- `docs/context/session-20260927-1737-explorer-prototype.md` - untouched, prior session's append.
- `branch-stories/secret-letter/secret-letter.tests.json` - David's own `skip: true` edit, stash-popped and verified present; both files go into `commit-remote`'s next commit per the standing rule to stage whatever is in the tree.

**Merge is committed**: `1b671e015`, local only. Remaining actions, both outside this write: `commit-remote` stages the two files above and pushes `83baf300f` + `1b671e015`, which closes #543 via the merge commit's trailer.

---

## Session Metadata

- **Session**: 5b6f1f
- **Status**: COMPLETE (unverified: the vitest per-package suite counts, `./repokit build dungeo`, `pnpm typecheck`, the freshness gates, the three story-tree runs, the Dungeo walkthrough chain, and the `xcodebuild` Testing-surface run — the session event log carries no `test`-kind rows and only 4 unrelated `build`-kind rows for this session, so none of these are hook-corroborated; they are the session's own account of commands it ran and read the output of directly)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — an ordinary commit (`1b671e015`) on `explorer-prototype`, not yet pushed, revertible with `git revert`; the merge is no longer mid-flight (no `MERGE_HEAD`, no orphaned stash — see Notes).

## Dependency/Prerequisite Check

- **Prerequisites met**: `feat/secret-letter-port` still exists locally with its 33 commits reachable; main's post-refactor structure (ADR-334–340/356) was identifiable via `git log`/diff to serve as the re-porting target; the branch's own tests were available to verify each re-ported fix.
- **Prerequisites discovered**: ADR-352's generated IDE protocol types are incompatible with the branch's hand-added Swift decoders for the play-to-write feature — discovered via `xcodebuild` compile errors, leading to exclusion (b) and GH #544.

## Architectural Decisions

- ADR-325 W1 (`make <actor> wear|take off <item>`) - re-ported onto main's analyzer pass list this session.
- ADR-333 D1a (`descriptionId` id mode) - platform half merged; IDE play-to-write half excluded, tracked by GH #544.
- ADR-330 D4 / ADR-163 §7 (chapter before room) - landed via the cherry-pick earlier this session (prior write).
- ADR-337 D1 (signal-action descriptor shape) - GH #362's sleeping/waking fix rewritten to match, rather than kept in its pre-refactor form.
- ADR-352 (generated IDE protocol) - the reason exclusion (b) was necessary; not amended, just the reason a branch feature didn't survive re-porting.
- Pattern applied: re-port fixes onto the current architecture rather than reverting refactors to accept old code (this session's central technique, not itself a new ADR).

## Mutation Audit

- Files with state-changing logic modified: story-loader `analyzer.ts`/`loader.ts`/`runtime/*.ts` (re-ported behavior described above), world-model traits (`RoomTrait`, `IdentityTrait`), chord `pin-grammar.ts`, extensions/chapters state-key wiring, bootstrap/branch-tester channel-id handling.
- Tests verify actual state mutations (not just events): YES **[reported by session, unverified]** — the session event log carries no `test`-kind rows and only 4 unrelated `build`-kind rows for this session (see Verification section above); the vitest/story-tree/xcodebuild counts reported are the session's own account, not hook-corroborated, and were not independently re-run by this write given the volume.
- If NO: re-running the full suite matrix (13 vitest packages, 3 story trees, the Dungeo chain, and the IDE real-path tests) independently, on the now-committed merge, is the outstanding verification gap for a future session to close.

## Recurrence Check

- Similar to past issue? YES — open item #543, filed earlier this same session, named exactly this pattern ("stranded branch carrying unmerged fixes"); this write is that item's resolution, merge committed (`1b671e015`), closing on the next push (not closed by this write).

## Test Coverage Delta

- Tests added: net additions not separately tallied for the merge as a whole (spans 13 packages); the branch's own added tests (one per re-ported fix, listed in Completed) are what verify each one.
- Tests passing before → after: not independently corroborated this write (see Mutation Audit); reported by session: all listed per-package vitest counts, 3 story trees, and the Dungeo chain green, IDE real-path suite 28/0 failures.
- Known untested areas: GH #275's clock-mirror fix (intentionally not adopted); the ADR-333 IDE play-to-write half (intentionally not adopted, tracked by #544); the merge as a whole has not yet had its `pnpm typecheck`/build/test matrix independently re-run by anyone other than the session that performed the merge.

---

**Progressive update**: checkpoint 2026-09-27 21:10 — first write this session; root-caused the reported regression to an unmerged branch, cherry-picked the fix (staged, mid-cherry-pick), re-verified all four real-path test suites green, filed open items #542 (pre-existing bundle failure) and #543 (stranded port-branch fixes).
**Progressive update**: checkpoint 2026-09-27 22:23 — cherry-pick committed (`83baf300f`); David authorized merging the full `feat/secret-letter-port` branch; merged and resolved 31 conflicts by re-porting the branch's fixes onto main's refactored structure, excluding GH #275's regression (reopened) and the ADR-333 IDE Swift half (filed #544); 202 files staged, not yet committed.
**Progressive update**: session completed 2026-09-27 22:30 — merge committed (`1b671e015`, closes #543 on push); David's stashed `secret-letter.tests.json` edit popped and verified present; #542/#543/#275/#544 reconfirmed via `gh issue list`; handing off to `commit-remote` for staging and push.
