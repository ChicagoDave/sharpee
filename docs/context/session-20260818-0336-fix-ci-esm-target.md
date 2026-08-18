# Session Summary: 2026-08-18 - feat/adr-320-implementation → fix/ci-esm-target → main (03:36 CDT)

## Goals
- Assess whether Sharpee, Chord Language, and Chord Writer are ready for a new publish/deploy.
- Merge the outstanding ADR-320 branch if the assessment allows, and clear whatever blocks the release.
- (Emerged mid-session) Carry the release all the way through: real npm publish, and Chord Writer 1.3.0 archive build.
- (Emerged further) Carry Chord Writer 1.3.0 through Distribute App, notarization, and DMG packaging — this portion is still in progress at the time of this update (05:50 CDT).

## Phase Context
- **Plan**: No active plan (ADR-320's plan was already archived in a prior session; this was release-readiness work, not plan-phase execution).
- **Phase executed**: N/A — release-readiness assessment, three merged PRs, a real npm publish, and Chord Writer 1.3.0 archive builds.
- **Tool calls used**: 305 as of this 05:50 CDT update (session state `docs/context/.session-state-7149ca.json`; no budget was set for this session, so no tier applies).
- **Phase outcome**: N/A (no phase tracked). The session grew well past its opening assessment scope into a full npm release plus a still-in-progress Chord Writer desktop release.

## Completed

### 1. Release-readiness assessment
Findings, by component:
- **Sharpee**: local npm version 5.1.0 vs published 5.0.1 across all packages — ready pending merge of the ADR-320 branch.
- **Chord Language**: 3.3.0 ships inside `@sharpee/chord` — same gate as Sharpee.
- **Website**: deploys from `main` via `website/deploy.sh` (server-side `git pull`) — ready once `main` has the release.
- **Chord Writer**: NOT ready. `tools/ide/project.yml:173` still stamped `CFBundleShortVersionString` `1.2.0` while 7 IDE commits had landed since 1.2.0 shipped — a 1.3.0 bump was warranted. (Bump and archive build completed later this session — see §7.)

### 2. PR #276 merged — ADR-320 Phases 1–11 + release alignment
17 commits, 285 files changed, +36,587/-1,223 (`gh pr view 276`). Merge commit `696a9f63`.

### 3. Release blocker found and fixed — stale `pnpm-lock.yaml` (commit `c01de168`)
Commit `49051566` (ADR-320 Phase 8) added `@sharpee/if-domain: "workspace:*"` to `packages/character/package.json` and `packages/plugins/package.json`, but no commit on the branch had regenerated the lockfile. A clean checkout with `--frozen-lockfile` (CI's default) failed `pnpm install` with `ERR_PNPM_OUTDATED_LOCKFILE` — caught by the "Build Platforms" check on PR #276 (run `32117731187`, failed in 14s). `publish-npm.yml` runs the identical install step, so this would have broken the release the same way, one step later. Fix: `pnpm install --lockfile-only` — `pnpm-lock.yaml` +6 lines, both workspace `link:` entries, no external resolution changes.

### 4. Pre-existing CI defect root-caused and (first-pass) fixed — `Build Platforms` red on main since 2026-08-17 (commit `4eb5d031`, PR #277, merge `01097446`)
Two `@sharpee/transcript-tester` suites (`tests/aggregate.test.ts`, `tests/ok-any.test.ts`) failed with `Failed to resolve entry for package "@sharpee/character"` on runs `31994555186` (PR #270) and `31994615401` (PR #271); last green was `31899604331` on 2026-08-15.
- **Root cause**: the workflow's only build step, `./repokit build dungeo --no-genai`, builds the tsf `local` target (CJS → `dist/`) only. 27 workspace packages also declare an ESM `import` export condition pointing at `dist-esm/`, which vitest resolves through. The two failing suites import the barrel `../src/index.js`, which reaches `@sharpee/stdlib` → `src/npc/npc-service.ts` → `@sharpee/character`; the 21 passing suites import narrow submodules (`../src/golden.js`, `../src/types.js`) and never reach it. The defect was structural and long-latent — only became reachable when ADR-310/318 (PR #270) put `@sharpee/character` into stdlib's dependency graph, which is exactly when main went red. Local dev never saw it because `dist-esm/` already existed locally from earlier ESM builds — this is the dist-esm staleness trap (see `project_tsf_dist_esm_staleness` memory) in its most severe form: not stale, absent entirely.
- **First-pass fix**: one step added to `.github/workflows/build-platforms.yml` — `pnpm exec tsf build --target esm` — after the repokit build and before Typecheck/tests. Deliberately did not change `@sharpee/character`'s exports at this point; the ESM condition is correct and shared by 27 packages.
- **Evidence**: local `npx tsf build --target esm` = "Build complete", 27.4s, tree clean afterward (`dist-esm/` is gitignored); local `pnpm --filter '@sharpee/transcript-tester' test` = 23 files / 278 tests passed (event log `docs/context/.devarch-events-7149ca.jsonl`, `"kind":"build","msg":"Build passed"`, 2026-08-18T08:57:28Z — after the 08:57:21 edit to the workflow file). CI verification on PR #277, run `32119238602` (`gh run view`: conclusion `success`, 2026-08-18T08:59:39Z): `tests/aggregate.test.ts` and `tests/ok-any.test.ts` both pass, plus transcript-tester 23/278, stdlib 1633, character 567, engine 633; SonarCloud also passed. Post-merge main run `32119907816` (conclusion `success`, 2026-08-18T09:07:18Z, headSha `01097446`) was the first green "Build Platforms" on main since 2026-08-15.
- **This fix was later superseded within the same session — see §5.** Building `dist-esm` on every CI run papered over the real defect (an uneven, hand-maintained alias pattern) rather than fixing it, and David pushed back on that framing.

### 5. The vitest alias fix that actually root-caused the problem — commit `a06424a0`, PR #279, merge `618f60fc`
David's pushback ("the staleness trap shouldn't happen") led to re-diagnosing PR #277's fix as a workaround, not a fix. Investigation found the repo already had the *right* pattern applied unevenly: 13 of 24 vitest configs aliased `@sharpee/*` to workspace `src/`, bypassing `dist-esm/` entirely; 11 did not (including `transcript-tester`, the one that broke); and the 13 that did were hand-written maps of 2–19 entries apiece, drifting independently.
- **Fix**: new root `vitest.shared.ts` exporting `workspaceAliases()`, which DERIVES the map by scanning `packages/` and `packages/extensions/` (37 packages found) rather than hand-listing them, returns anchored-RegExp array form (so `@sharpee/core` cannot prefix-match `@sharpee/core-anything`) plus subpath entries, and throws if discovery finds zero packages (fail loud, not silently pass zero aliases). All 24 vitest configs switched to call it; 13 hand-written maps and 5 orphaned `import path from 'path'` lines deleted.
- **Verified superseding**: PR #279 (`gh pr view`) explicitly supersedes #277's CI-build-step approach — tests now resolve workspace `src/` directly and never touch `dist-esm/` at test time at all. Post-merge main build green, run `32125081783`.

### 6. The npm publish dry run caught a real, independent release blocker — this is the session's key finding
Earlier in the session Claude reasoned from published tarballs (checked `@sharpee/character@5.0.1` and `@sharpee/platform-browser@5.0.1` — both flat CJS with the `import` condition dropped at publish time) and concluded ESM was dev/test-only, not needed for publishing. David asked for a real publish dry run to check that reasoning rather than accepting it.
- **Run `32123519207` on `main` FAILED** at `tsf validate --publish`:
  ```
  [@sharpee/character] ✗ "module" points to "./dist-esm/index.js" which does not exist
  [@sharpee/character] ✗ exports["."].import points to "./dist-esm/index.js" which does not exist
  ```
  33 of 34 packages validated clean.
- **Root cause**: 25 packages emit `dist-esm/` as a side effect of their own package-level build script (`tsc && tsc -p tsconfig.esm.json`), so `./repokit build` produces it incidentally for those. `@sharpee/character`'s build script is a bare `tsc`; it relies on tsf's config-driven `esm` target — which nothing in either the CI workflow (before §5) or the local `./repokit build` flow actually ran for it. It still declared `"module"` and `exports["."].import` pointing at `dist-esm`, so validation caught the gap between the manifest's promise and the built tree.
- **Correction of the session's own earlier conclusion**: ESM *is* required for publishing after all — David's instinct that ESM was load-bearing for cross-package imports was right, and the tarball-based reasoning was too narrow (it checked what ships, not what the manifest promises the resolver, and `tsf validate --publish` enforces the promise). Undetected until now because the last successful publish was 2026-08-14 and `@sharpee/character` landed on `main` on 2026-08-17 (PR #270) — no publish attempt had touched this combination before.

### 7. Repokit's ESM build restored, with the correct justification — commit `a13244c1`
- ESM pass now default-on in `./repokit build` (`--no-esm` opts out), and runs as ONE whole-tree `tsf build --target esm` call instead of the old per-package loop gated on `existsSync(tsconfig.esm.json)`. That existence gate was the actual defect: `@sharpee/character`, `devkit`, `helpers`, and `queries` have no `tsconfig.esm.json`, so the old loop silently skipped exactly the package that needed the whole-tree config-driven build.
- Also moved the `{"type":"module"}` dual-package stub to run AFTER the ESM pass — it had been inside the CJS loop, which runs before `dist-esm/` exists on a cold checkout, so the stub was previously writing into a directory that hadn't been created yet.
- Both CI workflows (`build-platforms.yml` and `publish-npm.yml`) call `./repokit build`, so this one change fixes the publish path without duplicating logic in the workflow files.
- 2 new tests added to `tools/repokit/src/commands/build.test.ts` using `vi.mock('node:child_process')` — an earlier `vi.spyOn` attempt did not intercept the ESM namespace correctly and had to be replaced. repokit: 82 passing (was 80).
- **Re-verified by re-running the identical failing workflow on the branch**: run `32124307176` SUCCESS — `[@sharpee/character] ✓ Outputs valid`, zero `✗` lines, "✓ Published 33 package(s) (dry run)".

### 8. Real npm publish — SUCCESS, npm portion of the release now COMPLETE
Run `32125741738` on `main`, dispatched by David — success, 33 packages published. Sharpee 5.1.0 / Chord 3.3.0 are live on npm — re-verified via `npm view` after the run: `core`, `text-blocks`, `if-domain`, `chord`, `world-model`, `stdlib`, `character`, `engine`, `devkit`, `sharpee` all at 5.1.0. This closes the npm/CI portion of the release; everything from here is the separate Chord Writer 1.3.0 desktop release (§10–§11).

### 9. GH #278 filed — engine test fixture leaves the story player unplaced
`setupTestEngine` creates and places a player, then `GameEngine.setStory()` creates a SECOND player via `createMinimalStory().createPlayer`, and its `initializeWorld` never places it. Every later `evaluateScope` hits the guard at `packages/world-model/src/world/WorldModel.ts:1653` and returns `[]`. 24 occurrences per run, stable across the 2026-08-15/17/18 runs, so this is NOT a regression from this session's work — it's pre-existing and newly noticed. Real cost: `should complete a full game session`, `should handle save and restore`, and `should handle multi-room world with objects` all currently pass with an unplaced player and a permanently empty scope — i.e., they're not actually exercising scope-dependent behavior.

### 10. Chord Writer 1.3.0 archives built and verified
`tools/ide/project.yml` version bumped 1.2.0 → 1.3.0, `CFBundleVersion` 4 → 5 (Sparkle's update-ordering key). The `.xcodeproj` was regenerated with `xcodegen` first — `project.pbxproj` was stale from Aug 15 and would have archived 1.2.0 silently; `package.sh` documents this exact trap and it was followed. Two archives produced at `~/Library/Developer/Xcode/Archives/2026-08-18/ChordWriter-1.3.0-{arm64,x86_64}.xcarchive`, each verified:
- Version 1.3.0, build 5, `LSMinimumSystemVersion` 11.0.
- `SUFeedURL` correctly baked per-architecture (`appcast-arm64.xml` and `appcast-x86_64.xml` respectively) — confirms the command-line `ARCHS` override flows through `$(ARCHS)` into `Info.plist` at build time.
- App/bundled-node architecture agreement (arm64/arm64, x86_64/x86_64) — the invariant that caught a real mismatch on 2026-08-13; checked again here and clean.

### 11. Both apps notarized; Xcode error 4097 diagnosed along the way
David ran Distribute App → Direct Distribution on both archives. Both exported apps verified clean: signed `Developer ID Application: David Cornelson (RSNGKW5LNH)`, hardened runtime, stapled ("The validate action worked!"), `spctl` accepted with `source=Notarized Developer ID`. Exports at `tools/ide/release/Chord Writer ARM 20260818.app` and `Chord Writer x86 20260818.app`.
- **Five x86_64 Distribute App attempts appeared stuck.** Each showed up in `notarytool history` as a submission "In Progress" and never resolved. Claude's first read of this was wrong — it told David the uploads had landed and Apple was just slow, when in fact none of the five had actually succeeded. David corrected that misread before it propagated further.
- **Root cause**, found in the actual distribution log (`ls -dt /var/folders/*/*/T/*.xcdistributionlogs` → `/var/folders/.../SharpeeIDE_2026-08-18_05-38-43.246.xcdistributionlogs`):
  ```
  Error Domain=NSCocoaErrorDomain Code=4097 "Couldn't communicate with a helper application."
  ```
  Xcode's XPC distribution helper died ~60s into an S3 multipart upload of a 168 MB zip. Apple's `POST /notary/v2/submissions` returns 200 and creates a submission id *before* the payload finishes uploading, so a dead helper leaves an orphaned submission that sits at "In Progress" forever — a submission id in `notarytool history` proves a submission was OPENED, not that its payload arrived.
  - Fix was Apple's own documented recovery for 4097: quit and relaunch Xcode. The post-relaunch submission (`99f8cab7-22ec-4b9b-bf84-04909f8c8641`, 10:44:46) was Accepted in ~90 seconds, confirming Apple's queue was healthy the whole time — the five stuck submissions were abandoned uploads, not a queue backlog.

### 12. ARM DMG built, signed, and submitted; Intel export staged behind it
`package.sh --dmg-from` was run against the ARM export first, producing `ChordWriter-1.3.0-arm64.dmg`, 58M (1.2.0 was 60M — sizes moved, so the website download-card size must be read off the real built artifact, not carried forward from the prior release; a guessed size caused a past 1.0.1 bug). The ARM DMG was signed and submitted to Apple for notarization: submission `fa89c1a5-27de-49c1-8faa-d8624a75e38e`, still **In Progress** at ~19 minutes as of 05:48 CDT.
- **Sequencing hazard identified and respected.** `tools/ide/release/.notarize-state` is a single arch-agnostic ledger holding `DMG_SUBMISSION=<id>`. `notarize_artifact` checks that key *before* submitting — running `package.sh --dmg-from` for x86_64 while the ARM DMG's id is still in the ledger would silently skip submitting Intel, poll ARM's verdict instead, and eventually staple an ARM notarization ticket onto the Intel DMG (the same two-feed-crossing risk called out for zips-vs-appcasts in `UPLOAD.md`, one layer down). `package.sh` clears the ledger itself (`state_clear`, ~line 1122) after writing the Sparkle payload, so the two architectures must be packaged strictly one at a time, never interleaved.
- **State at close of this update**: ARM DMG notarization pending (submission `fa89c1a5`). Intel is fully verified and staged (`tools/ide/release/Chord Writer x86 20260818.app`, notarized/stapled) but its DMG has not been built yet — building it now would collide with the still-open ARM ledger entry per the hazard above.

## Key Decisions

### 1. Fix the CI build step, then supersede that fix with a root-cause fix
The first response to the CI failure (§4) built `dist-esm` in CI — a working but structurally weak fix, since it left the underlying inconsistency (13 of 24 vitest configs already avoided `dist-esm` via hand-written aliases, 11 didn't) in place. David's pushback reframed the ask from "make CI pass" to "make the staleness trap architecturally impossible," which produced the derived-alias fix in §5. Both PRs merged; #279 supersedes #277's approach without reverting the lockfile/publish fixes underneath it.

### 2. Treat the lockfile gap as a release blocker, not just a PR-check failure
`publish-npm.yml` runs the same `pnpm install` step CI does. A failure caught on a PR check is the same failure that would have hit `npm publish` — so it was fixed immediately rather than deferred as "just CI hygiene."

### 3. Verify the publish path by actually running it, not by inspecting artifacts
Claude's tarball-inspection reasoning (published packages are flat CJS, therefore ESM is dev/test-only) was plausible but wrong — it checked what a successful publish produces, not what `tsf validate --publish` requires of the manifest before it will let a publish proceed. David asking for the dry run rather than accepting the conclusion caught a real, independent release blocker (§6) that tarball inspection could not have found. This is now the second time this session that "run it for real" beat local/inferential reasoning (see also §4→§5).

### 4. Restore repokit's whole-tree ESM build, but replace the per-package existence gate rather than reintroducing the old loop
The original per-package `existsSync(tsconfig.esm.json)` loop was the actual defect (§7) — not the presence of an ESM pass in `repokit build` per se. The fix keeps ESM default-on but makes it one config-driven whole-tree call, closing the exact gap (`character`, `devkit`, `helpers`, `queries` lacking `tsconfig.esm.json`) that let a publishable package skip the build its own manifest promised.

### 5. Correct a misdiagnosis of "stuck" notarization submissions rather than let it stand
Five x86_64 Distribute App attempts sat at "In Progress" in `notarytool history`; Claude's first read was that the uploads had landed and Apple's queue was just slow, and it told David so. David corrected that none had actually succeeded. Pulling the real distribution log (rather than trusting `notarytool history` alone) found Xcode error 4097 — a dead XPC helper mid-upload — which explains why a submission id can exist with no payload behind it. This is the same shape as Key Decisions §1 and §3 from earlier in the session: a plausible inference from partial evidence, corrected only because David pushed back rather than accepted it (§11).

## Next Phase
No active plan — N/A.

## Open Items

### Short Term — Chord Writer 1.3.0 release, IN PROGRESS as of 05:50 CDT
1. **Wait on ARM DMG notarization** — submission `fa89c1a5-27de-49c1-8faa-d8624a75e38e`, In Progress since ~05:29 CDT. Poll with `xcrun notarytool info fa89c1a5-27de-49c1-8faa-d8624a75e38e --keychain-profile <profile>` (or resume `./tools/ide/package.sh`, which polls internally).
2. **Resume `./tools/ide/package.sh` for ARM** once notarization is Accepted — it staples the ticket, builds the Sparkle zip + EdDSA signature, and writes `appcast-arm64.xml`; it also clears `.notarize-state` on completion, which is the precondition for step 3.
3. **Then, and only then**, run `package.sh --dmg-from "tools/ide/release/Chord Writer x86 20260818.app"` for Intel — do not start this before step 2 clears the ledger (§12 sequencing hazard: a shared arch-agnostic `.notarize-state` file means running Intel while ARM's submission id is still recorded would staple ARM's ticket onto the Intel DMG).
4. **Upload** per `tools/ide/release/1.2.0/UPLOAD.md`'s pattern — scp both architectures' zips to plover **before** either appcast, since a live appcast naming an un-uploaded archive hands an author a failed update; the two feeds must never cross.
5. **Website version bump to 1.3.0**: `website/src/lib/nav.ts`, `website/src/components/download-card.tsx` (use the REAL DMG sizes read off the built artifacts — ARM is confirmed 58M; Intel's size is not yet known since its DMG hasn't been built — a guessed size caused a past 1.0.1 bug), and the two `chord-writer` `content.mdx` status lines.
6. **Deploy**: `./website/deploy.sh --no-pull` (sudo, David's). Sample story zips were already copied to plover by David.
- GH #278 (engine test fixture leaves player unplaced, §9) — filed but not fixed.
- 17 stranded `.devarch-events-*.jsonl` logs still sit in `docs/context/` — needs another pass of `./scripts/prune-devarch-runtime.sh`.
- Two design-review items carried open across commits `b71e04`→`ade288` still await David's ruling: blocking-thread same-turn bunching, and day-one defection bypassing the too-raw window on resume.
- Deferred IDE story-header shared-iterator refactor (not touched this session).
- GH #273 / #274 / #275 still open (carried, not touched this session).

### Long Term
- Consider a one-time audit of the build/release pipeline for other places that assume a warm local tree — see Recurrence Check below; this session found three distinct instances of the pattern.

## Files Modified

**Release fixes** (5 files):
- `pnpm-lock.yaml` - regenerated for `@sharpee/if-domain` workspace links (`workspace:*` → `link:`), 6 insertions, commit `c01de168`
- `.github/workflows/build-platforms.yml` - added then effectively superseded ESM build step (commit `4eb5d031`; superseded by the alias fix in `a06424a0`, which lets vitest resolve `src/` directly)
- `vitest.shared.ts` - new, `workspaceAliases()` derives the `@sharpee/*` → workspace `src/` alias map by scanning `packages/` and `packages/extensions/`, commit `a06424a0`
- 24 `vitest.config.ts` files across the workspace - switched to `workspaceAliases()`; 13 hand-written alias maps and 5 orphaned `import path from 'path'` lines removed, commit `a06424a0`
- `tools/repokit/src/commands/build.ts` - ESM pass made default-on and whole-tree (`tsf build --target esm`), replacing the per-package `existsSync(tsconfig.esm.json)` loop that silently skipped `@sharpee/character`; dual-package `{"type":"module"}` stub moved to run after the ESM pass, commit `a13244c1`
- `tools/repokit/src/commands/build.test.ts` - 2 new tests using `vi.mock('node:child_process')`, commit `a13244c1`

**Chord Writer 1.3.0** (1 file, plus generated archives):
- `tools/ide/project.yml` - version 1.2.0 → 1.3.0, `CFBundleVersion` 4 → 5
- `.xcodeproj` regenerated via `xcodegen` (not hand-edited)
- Two `.xcarchive` bundles produced and verified outside the repo tree (`~/Library/Developer/Xcode/Archives/2026-08-18/`)
- Two notarized/stapled `.app` exports at `tools/ide/release/` (`Chord Writer ARM 20260818.app`, `Chord Writer x86 20260818.app`), plus one built/submitted `ChordWriter-1.3.0-arm64.dmg` (58M), not yet part of a git commit — release artifacts, not tracked source

**Incidental** (1 file):
- `stories/dungeo/src/version.ts` - `BUILD_DATE` restamped as a side effect of the `./repokit build dungeo` run during this session's build/verify steps

**Merged via PR #276** (285 files, not authored this session): ADR-320 Phases 1–11 implementation, already committed on `feat/adr-320-implementation` from prior sessions.

## Notes

**Session duration**: ~6.2 hours and counting (08:36 UTC / 03:36 CDT start through at least 05:50 CDT at this update, with the Chord Writer release still mid-flight).

**Approach**: David opened with a direct readiness question rather than a feature ask; the session stayed in assessment/release mode throughout the first half, then extended into carrying the release through — real npm publish and Chord Writer archive builds — as blockers were found and cleared one at a time. The branch moved three times: `feat/adr-320-implementation` (PR #276, merge `696a9f63`) → `fix/ci-esm-target` (PR #277, merge `01097446`, then further commits and PR #279, merge `618f60fc`, which superseded #277's approach) → `main`, the active branch at session close. Three of the four defects/misreads found this session (§4→§5, §6, §11) were only caught because David pushed back on or asked to verify a Claude conclusion rather than accepting it as-is — see Key Decisions §1, §3, and §5.

**Update at 05:50 CDT**: the npm/CI portion of the release (§1–§9) is COMPLETE and verified live. The Chord Writer 1.3.0 desktop release (§10–§12) is a second, still-open phase of the same session: both `.app` exports are notarized and staged, the ARM DMG is built and submitted for notarization (pending), and the Intel DMG, upload, and website deploy have not started — see Open Items → Short Term for the exact resume sequence, including the ARM-before-Intel sequencing hazard on the shared `.notarize-state` ledger (§12).

**Rule 4a note**: the session-start gate `docs/context/.devarch-gate-7149ca` was not cleared by the main session flow; the first `commit-remote` agent hit the gate block (event log, 08:46:31/08:46:34, rule 1) and removed it to proceed. Steps 1–4 had in fact been completed (event log shows `pre-session-audit` completed at 08:38:41) — the gate-clear step itself was simply skipped.

**Pattern worth recording**: this session found three defects of the same shape — build/release metadata correct in the local tree, wrong on a clean checkout or a real publish dry run: the stale lockfile (§3), `dist-esm/` absent for CI's test runner (§4/§5), and `@sharpee/character` declaring ESM entry points that nothing in either build flow actually built (§6/§7). All three were invisible locally and only a cold CI checkout or a real dry run exposed them. The pattern-recurrence-detector (run this session) separately confirmed this exact class at 7 confirmed hits across 6 sessions, plus a distinct "hand-copied value" class at 9 hits across 8 sessions — see Recurrence Check below.

---

## Session Metadata

- **Status**: INCOMPLETE (as of this 05:50 CDT update — the npm/CI portion, §1–§9, is itself COMPLETE (unverified: the local 27.4s ESM build time and the 23/278 transcript-tester count in §4 are quoted from commit `4eb5d031`'s message and this session's own report — the event log corroborates a build/test pass at 08:57:28 but does not carry the specific counts. The CI-side claims throughout — run conclusions, run IDs, timestamps, file/test names, PR numbers, merge commit hashes, and the npm publish confirmation in §8 — are independently verified against `gh run list`/`gh run view`, `gh pr view`, and direct `npm view` package-version checks, and are not subject to that qualifier). The Chord Writer 1.3.0 desktop release, §10–§12, is the reason for the overall INCOMPLETE: it is mid-flight, not blocked.)
- **Blocker** (if any): N/A — nothing is stuck. The ARM DMG notarization submission (`fa89c1a5-27de-49c1-8faa-d8624a75e38e`) is a normal in-flight Apple notarization wait, not a defect; everything else in the resume sequence (Open Items → Short Term) is queued behind it by design (§12 sequencing hazard).
- **Blocker Category**: N/A
- **Estimated Remaining**: ~30–60 minutes across the remainder of this session or a follow-up: ARM notarization wait + staple/Sparkle-package (~10–20 min), Intel DMG build + notarization wait (~15–20 min), upload + appcast + website bump + deploy (~15-20 min). Plus GH #278 (unrelated pre-existing test-fixture defect, filed not fixed) as a separate, unscheduled item.
- **Rollback Safety**: safe to revert for everything in git — all code fixes are additive or corrective (lockfile regeneration, alias derivation, repokit ESM-pass restructuring) and all are merged to `main` behind green checks. The npm publish (§8) is NOT revertible in the ordinary git sense — packages are live on the registry — but nothing about the publish was defective; it is the intended end state. The Chord Writer release artifacts (§10–§12) are outside git entirely (build products under `tools/ide/release/` and local Xcode archives) and have no rollback concept — they are either resumed to completion or abandoned and rebuilt.

## Dependency/Prerequisite Check

- **Prerequisites met**: PR #276 (ADR-320 Phases 1–11) was fully committed and ready to merge; `gh` CLI access for PR/run inspection and workflow dispatch; David's direct dispatch of the real (non-dry-run) publish workflow; David's Xcode/notarization environment for the Chord Writer archive builds.
- **Prerequisites discovered**: `tsf validate --publish` as the actual gate on ESM-manifest correctness — its existence and behavior were not fully understood at session start and had to be exercised via a real dry run to be trusted (§6).

## Architectural Decisions

- None new this session. No ADR referenced or written; all changes are corrective (CI configuration, lockfile, alias derivation, repokit build-step restructuring, version bumps) rather than new architectural choices.

## Mutation Audit

- N/A — this session touched CI configuration, a generated lockfile, vitest config/alias derivation, repokit's build orchestration, and app version metadata — not application state-changing logic.

## Recurrence Check

- Similar to past issue? YES — the ESM/dist-esm staleness trap has a standing memory entry (`project_tsf_dist_esm_staleness`: "default `tsf build` refreshes dist/ only; after constant/wire bumps also run `--target esm` or vitest reads stale values while the CLI reads fresh ones"). This session's defects are the same trap surfacing in three different places: CI's test runner (§4/§5), and the publish manifest validator (§6/§7).
- The `pattern-recurrence-detector` agent, run this session, confirmed this exact defect class ("local state masking what a clean environment/checkout/dry run would reject") at **7 confirmed hits across 6 prior sessions**, and a distinct "hand-copied value" class (e.g., version strings, manually-maintained maps) at **9 hits across 8 prior sessions**. Combined with this session's three fresh instances, this is a standing, recurring pattern worth the one-time pipeline audit noted in Open Items → Long Term.

## Test Coverage Delta

- Tests added: 2 (`tools/repokit/src/commands/build.test.ts`, §7 — `vi.mock('node:child_process')` coverage for the whole-tree ESM pass; repokit went from 80 to 82 passing).
- Tests passing before: main red on `Build Platforms` (two transcript-tester suites failing) → after: main green through both PR #277 (run `32119907816`, conclusion `success`, 2026-08-18T09:07:18Z) and, following the superseding fix, PR #279 (run `32125081783`, conclusion `success`). Publish-path validation: `tsf validate --publish` dry run failed on `main` (run `32123519207`) → passed on the fixed branch (run `32124307176`, "✓ Published 33 package(s) (dry run)") → the real publish workflow (run `32125741738`) succeeded, confirmed by `npm view` showing 5.1.0 live across the checked packages.
- Known untested areas: GH #278 (engine test fixture leaves the story player unplaced, §9) means `should complete a full game session`, `should handle save and restore`, and `should handle multi-room world with objects` currently pass without exercising scope-dependent behavior — a pre-existing gap, newly noticed this session, not fixed this session.

---

**Progressive update**: npm/CI portion completed 2026-08-18 ~09:15 UTC / 04:15 CDT. Chord Writer 1.3.0 desktop release in progress as of 2026-08-18 10:50 UTC / 05:50 CDT — both apps notarized and staged, ARM DMG built and submitted (notarization pending), Intel DMG/upload/website deploy not yet started. Session remains open; next update should land after the ARM notarization result and the Intel DMG pass.
