# Session Summary: 2026-06-17 (21:08 CST) - fix/tsbuildinfo-clean-scripts

## Goals
- Restore stable build baseline after fast-and-loose channel-io / ADR-174 tsf work
- Resolve the npm-publish regression (tsf build --npm hanging on 9 packages) left open by session-20260518-0319-main.md

## Phase Context
- **Plan**: No active plan
- **Phase executed**: N/A — build-hygiene / regression closure session
- **Tool calls used**: untracked
- **Phase outcome**: Completed — regression resolved, durable fix committed

## Completed

### Resolved prior-session blocker: tsf build --npm regression (9 packages hanging)

**This closes the INCOMPLETE status from session-20260518-0319-main.md**, which left this as: "Build / Toolchain — `tsf build --npm` hangs for 9 packages; root cause is likely stale node_modules after lockfile update on the mini, but not confirmed and not fixed."

Root cause confirmed as **environment, not code**. The mini's `node_modules` had not been refreshed since May 13; `pnpm-lock.yaml` was updated May 17; the delta was a missing `@types/node`. That broke `typeof import('fs')` / `typeof import('path')` references in `packages/extensions/testing/src/checkpoints/store.ts` with TS2307. Because `ext-testing` sits upstream in the dependency graph, tsf's parallel builder deadlocked waiting on it — presenting as 9 packages hanging (ext-testing, parser-en-us, stdlib, engine, ext-basic-combat, plugin-npc, platform-browser, transcript-tester, sharpee).

Fix: `pnpm install` (the documented prerequisite that had simply never been run). This added `@davidcornelson/tsf 1.0.0`, `@types/node 20.19.27`, and refreshed stryker/vitest. `pnpm-lock.yaml` and `package.json` unchanged — pure node_modules sync, **no repo diff**.

Result: `tsf build --npm` completed 25/25 packages, all 9 previously-hanging packages built, empty stderr, staged to `~/.tsf-publish`.

### Diagnosed and fixed stale tsbuildinfo no-op build failures (durable, committed)

The prior session documented the tsbuildinfo silent-no-op bug. This session applied the durable fix.

Confirmed the failure mode: `pnpm clean` removes `dist/` and `dist-esm/` but left 43 `.tsbuildinfo` files. On rebuild, `tsc` sees stale tsbuildinfo, decides inputs are current, emits nothing with exit 0. `build.sh` prints `[core] ✓` falsely. Then downstream packages fail TS2307 "Cannot find module '@sharpee/core'" because `dist/` was never recreated.

First delete pass used `find packages -maxdepth 2` which missed `packages/extensions/*` (depth 3). Caught when rebuild then failed on `@sharpee/ext-testing` dist-esm resolution. Corrected to delete all tsbuildinfo at any depth; rebuild was then clean.

**Commit 812ba541** — extended `clean` script in all 29 packages that had one to also remove `tsconfig.tsbuildinfo` (and `tsconfig.esm.tsbuildinfo` where an ESM build exists). Verified: `pnpm clean` now clears 43 → 0 tsbuildinfo; full clean+build cycle green.

**Commit 6aa78974** — follow-up: 9 packages (bridge, character, helpers, queries, runtime, platform-browser, interpreter, ext-basic-combat, ext-testing) emit a `dist-esm/` tree via tsf but their clean scripts only removed `dist/`. Added `dist-esm` to those 9 clean scripts. `extension-conversation` correctly left dist-only (no ESM tree). `interpreter` is workspace-excluded via turbo (`!packages/interpreter`) so turbo skips it; its script is corrected regardless. Verified: `pnpm clean` now removes 27/28 dist-esm trees.

This closes the prior session's "Long Term" open item: "Move .tsbuildinfo files into dist/ ... or extend clean scripts" — chose extend-clean-scripts.

### Confirmed runtime baseline green

Walkthrough chain run #1: 553 failures (thief combat RNG cascade — thief kills player, subsequent `$restore` inherits dead state). Per `feedback_flakey_walkthroughs` feedback rule, re-ran. Run #2: **862 passed, 0 failed**. Runtime baseline confirmed green.

### Publish-script hygiene (committed)

**Commit c8c5375b** — `publish:beta` root script still listed a dead 11-package `pnpm --filter ... publish` chain (no caller in CI/build.sh/scripts; confirmed dead across three sessions). Replaced with a thin delegation to the canonical flow: `tsf build --npm && tsf publish --tag beta`. A pure delegation can't drift from tsf's package selection. Validated via `tsf publish --tag beta --dry-run` (reaches npm, stops on the expected "version already published" guard).

**Commit (npm-latest deletion)** — `scripts/npm-latest.sh` deleted. Unreferenced, stale (hardcoded `0.9.61-beta`); its dist-tag promotion function is handled ad hoc / by tsf going forward. User authorized deletion.

## Key Decisions

### 1. npm regression fix produces no committable diff
Environment fix only (`pnpm install`). No source, config, or lockfile change warranted a commit. The `.tsbuildinfo` clean-script commits are the only durable changes from this session.

### 2. Build side-effect artifacts discarded
Running `./build.sh -s dungeo` auto-bumped `stories/dungeo/src/version.ts` and regenerated `packages/sharpee/docs/genai-api/{index,lang}.md`. These were discarded via `git checkout` — unintended side effects, consistent with prior session handling of version.ts.

### 3. Pre-existing working-tree changes left untouched
`.devarch` deletion and `CLAUDE.md` modification predate this session and are not part of this work. Left as-is.

### 4. One-shot migration scripts deleted after use
`scripts/extend-clean-*.mjs` were ephemeral — ran once, deleted. The `package.json` diffs are the durable record.

### 5. Branch pushed on finalize
`fix/tsbuildinfo-clean-scripts` pushed at session end (5 commits). Earlier mid-session "no push" was superseded by the user's "finalize" instruction.

## Next Phase
- No active plan. The build-hygiene tail of ADR-174 Phase 3 (text-service removal → engine-internal prose pipeline) is now closed.
- Branch `fix/tsbuildinfo-clean-scripts` is pushed; open a PR when ready (not yet created).

## Open Items

### Short Term
- Open a PR for `fix/tsbuildinfo-clean-scripts` (pushed, 5 commits) when ready.

### Long Term — owner: David (external npm/release actions)
- `npm deprecate @sharpee/text-service` pointing at `@sharpee/channel-service` — package deleted from source, still live on npm 0.9.113. **David runs the npm command.**
- `tsf publish` — built clean to `~/.tsf-publish` but not published; real release with a version bump. **On David.**
- PR boundary discipline: major ADRs should ship via PRs so regression seams are findable in future.

## Files Modified

Branch `fix/tsbuildinfo-clean-scripts` (5 commits):
- 29 × `packages/**/package.json` (commit 812ba541) — `clean` script extended to remove `tsconfig.tsbuildinfo`
- 9 × `packages/**/package.json` (commit 6aa78974) — `clean` script extended to remove `dist-esm/`: bridge, character, helpers, queries, runtime, platform-browser, interpreter, extensions/basic-combat, extensions/testing
- `package.json` (commit c8c5375b) — `publish:beta` aligned to `tsf build --npm && tsf publish --tag beta`
- `scripts/npm-latest.sh` — deleted (dead, stale)
- `docs/context/session-20260617-2108-fix-tsbuildinfo-clean-scripts.md` — this summary (finalize commit)

No source code changed. No tests added.

## Notes

**Session duration**: ~1-2 hours

**Approach**: Root-cause isolation (environment vs. code), incremental depth-fix (first pass missed depth-3 packages; corrected), then verification via real clean+build cycles.

**This session resolves the INCOMPLETE blocker from session-20260518-0319-main.md** (30 days elapsed between sessions).

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — build-config-only change, no source mutations

## Dependency/Prerequisite Check

- **Prerequisites met**: `pnpm install` (the missing one); clean working tree for the build tests
- **Prerequisites discovered**: None new — the stale node_modules condition was already identified in the prior session summary as the likely root cause

## Architectural Decisions

- None this session — no new ADRs. This session applied the "extend clean scripts" option that was noted as a pending choice in the prior session summary.

## Mutation Audit

- Files with state-changing logic modified: None — all changes are `package.json` script strings
- Tests verify actual state mutations: N/A (build-config change; validated via real clean+build cycles)

## Recurrence Check

- Similar to past issue? YES — session-20260518-0319-main.md documented both the tsbuildinfo bug and the npm-publish regression. This session resolves both. The stale-node_modules pattern has now appeared twice (once in the May tsf migration, once here). If a third occurrence surfaces, a checklist or CI gate is warranted.

## Test Coverage Delta

- No test changes this session.
- Walkthrough regression check: 862 passing, 0 failures (after re-run per RNG flakiness rule).

---

## Addendum — npm local-build consumer test (familyzoo)

After PR #113 merged, added a pre-publish regression harness: `npm-test-familyzoo/`. It compiles and runs the familyzoo tutorial against the **locally built** npm packages in `~/.tsf-publish` (the `tsf build --npm` output), not the registry — the pre-publish sibling of the registry-based `npm-test-dungeo/`.

- `gen-consumer.mjs` computes familyzoo's transitive `@sharpee/*` closure over the staged packages, `npm pack`s each into tarballs, and emits a consumer `package.json` with `file:` refs (third-party deps still resolve from the registry).
- `run.sh` copies familyzoo `src/` + transcripts into a temp dir, `npm install`s the local tarballs, compiles with `tsc`, and runs all 16 transcripts. `--build` runs `tsf build --npm` first.
- **Validated**: 15/16 transcripts pass against the local npm build. The one failure (`v16-scoring`) reproduces **identically in the workspace** build (walkthrough scores 75/100, transcript asserts "perfect score") — a pre-existing story-content issue, not a packaging defect. This confirms the local npm build is consumer-valid.

**New open item (familyzoo content, low priority):** `v16-scoring` walkthrough reaches only 75/100 but asserts "perfect score" — either the walkthrough is incomplete or the assertion is aspirational.

---

**Progressive update**: Session completed 2026-06-17 21:08 CST; addendum 2026-06-17 22:40 CST (familyzoo npm local-build test)
