# Session Summary: 2026-05-10 - adr-174-phase2-consumer-migration

## Goals

- Resolve OQ-1: where the `renderToString` replacement helper lives.
- Migrate all wire-production consumers off `@sharpee/text-service` to `@sharpee/channel-service` (AC-8).
- Preserve the Phase 1 regression baseline throughout all sub-phases.

## Phase Context

- **Plan**: `docs/work/adr-174-prose-pipeline/plan-20260510-phase2.md` (superseded prior plan at `a23d5a6d`)
- **Phase executed**: Phase 2 — "Migrate wire-production consumers off renderToString" (sub-phases 2.1–2.4)
- **Tool calls used**: 241 / unbudgeted
- **Phase outcome**: Completed on budget; all four sub-phases landed; AC-8 satisfied; branch local, not pushed

## Completed

### OQ-1 Resolution (commit `52acacee`)
Open question from Phase 1: where does the `renderToString` replacement helper live? Surface alternatives presented to user (text-blocks, channel-service, new package), resolved to `@sharpee/channel-service/src/render-to-string.ts`. Rationale: channel-service already owns the `IChannel` types the helper consumes; placing it in text-blocks would invert the dependency direction; a new package is unnecessary overhead. Prior Phase 2 plan (`a23d5a6d`) had tentatively chosen text-blocks — superseded. New plan written at `docs/work/adr-174-prose-pipeline/plan-20260510-phase2.md`. ADR-174 §Open Questions OQ-1 updated with resolution record.

### 2.1 — Port renderToString to channel-service (commit `59b9d745`)
New file `packages/channel-service/src/render-to-string.ts`: the `renderToString` and `renderStatusLine` helpers ported from `packages/text-service/src/cli-renderer.ts`. Filename is `render-to-string.ts`, not `cli-renderer.ts` — the name `cli-renderer` was an implementation accident; the helper is channel-agnostic string serialization. 20 parity tests ported to `packages/channel-service/tests/render-to-string.test.ts` covering 29 leaf cases via `it.each`.

AC-16 grep-gate interlude: the channel-service grep-gate test (`ac-16-cleanup-grep-gate.test.ts`) had two false-positive matches — doc comments in audibility handlers cited `media.sound.play` as a type reference, not a live import. Added a per-file allow-list so doc citations of known-clean patterns don't trip the gate. Gate now accurate.

`packages/channel-service/src/index.ts` updated to export `renderToString` and `renderStatusLine`.

### 2.2 — Migrate transcript-tester (commit `8cccc344`)
`packages/transcript-tester/src/story-loader.ts` re-pointed from `@sharpee/text-service` to `@sharpee/channel-service`. `packages/transcript-tester/package.json` dependency updated.

Cloak-of-darkness deferred: discovered during entry that `stories/cloak-of-darkness/` is outside `pnpm-workspace.yaml`, uses manually-maintained symlinks, and was already in pre-existing build-broken state before Phase 2 began. Confirmed pre-existing via git-stash test. Deferred as accepted collateral; falls out of build at Phase 3 cleanup. Cloak files (`package.json`, `run-platform.js`, `src/test-runner.ts`, `test-parser-events.js`) left in their current broken state — not modified.

### 2.3 — Re-route bridge / runtime / sharpee re-exports (commit `e7e6b582`)
Re-exported `renderToString` / `renderStatusLine` in `packages/bridge/src/index.ts`, `packages/runtime/src/index.ts`, and `packages/sharpee/src/index.ts` re-pointed to `@sharpee/channel-service`. Dead re-exports (`ITextService`, `createTextService`, `TextService`) dropped from bridge, runtime, and sharpee — engine has its own engine-private `ITextService` since Phase 1; no first-party consumer instantiates a text-service through these public re-export paths.

`scripts/bundle-entry.js` line 27 and `scripts/test-bundle-template.js` line 35 cleaned so the platform CLI bundle no longer spreads text-service symbols into the global scope.

`packages/bridge/package.json`, `packages/runtime/package.json`, `packages/sharpee/package.json` dependencies updated: channel-service added, text-service removed.

Phase-1-stale `dist-esm/` directories discovered in `packages/sharpee/` and `packages/transcript-tester/` — rebuilt via `tsc -p tsconfig.esm.json`. `packages/platform-browser/dist-esm/` is older still (Feb 19) and has a stale text-service import in `BrowserClient.js`; does not affect the CLI bundle (which aliases to `dist/`, not `dist-esm/`); logged as Phase 3 cleanup target.

### 2.4 — Final regression and AC-8 verification (commit `2e074f8b`)
Full test suite run and AC-8 grep sweep.

Test results:
- Engine vitest: 398/0 (7 skipped) — Phase 1 baseline preserved exactly
- Channel-service vitest: 94/0
- Text-service vitest: 147/0 — kept compilable through Phase 2
- Platform-browser vitest: 68/0
- Dungeo walkthrough chain: 930/0 (1 RNG re-run per `feedback_flakey_walkthroughs.md`; first run had thief RNG cascade)

AC-8 grep over `packages/`, `stories/`, `scripts/` with accepted carve-outs (text-service package internals, platform-browser dist-esm): zero matches. CLI bundle smoke: `renderToString` resolves to channel-service; dead symbols (`ITextService`, `createTextService`) absent. Browser bundle built clean.

ADR-174 Phase 2 status set to ACCEPTED.

## Key Decisions

### 1. OQ-1 resolved to channel-service, not text-blocks (session start)
Three candidate homes were evaluated: `@sharpee/text-blocks`, `@sharpee/channel-service`, and a new package. text-blocks was ruled out because the helper depends on `IChannel` types that live in channel-service — putting it in text-blocks inverts the dependency direction. A new package adds registry overhead for a single helper. channel-service is the correct architectural home. Prior plan that had tentatively chosen text-blocks superseded.

### 2. render-to-string.ts filename, not cli-renderer.ts
The source file in text-service was named `cli-renderer.ts`, which implied CLI-specificity. The helper serializes channel blocks to a plain string — it is not CLI-specific. Renamed at the port boundary to clarify the semantic.

### 3. Drop dead text-service re-exports rather than stub them
`ITextService`, `createTextService`, and `TextService` were re-exported from bridge, runtime, and sharpee. On audit, no first-party consumer instantiates a text-service through these paths (engine carries its own engine-private `ITextService` since Phase 1). Kept as re-exports would have extended the text-service surface area into Phase 3 with no consumer benefit. Dropped clean.

### 4. Cloak-of-darkness deferred as accepted collateral
Cloak is outside `pnpm-workspace.yaml` and was build-broken before Phase 2 started (confirmed via git-stash). Migrating it would require fixing pre-existing symlink and dependency issues unrelated to ADR-174. Deferred — it falls out of build when Phase 3 deletes text-service, at which point a proper workspace integration is the right fix.

### 5. Zifmia hard-deferred — not a partial migration
Zifmia (`ChatOverlay.tsx`, `GameContext.tsx`) imports `renderToString` from text-service. Platform-browser is the primary release mechanism; Zifmia is parked. Migrating Zifmia during Phase 2 would require spinning up a build path that is currently dormant. Accepted collateral at Phase 3 deletion; future revival is a redesign rather than a port.

### 6. AC-16 per-file allow-list for doc-comment citations
The AC-16 grep gate tests for live `media.sound.play` imports that should not exist outside audibility handlers. Two audibility handler doc comments cited `media.sound.play` as a type reference, not a live import — causing false positives. Allow-list approach chosen over rewording doc comments, because the doc comments are architecturally accurate and should not be changed to satisfy a test heuristic.

## Next Phase

- **Phase 3**: "Delete @sharpee/text-service" (AC-9)
- **Tier**: unbudgeted
- **Entry state**: A fresh implementation plan (`docs/work/adr-174-prose-pipeline/plan-NNNN-phase3.md`) must be written before work starts. The plan must enumerate every remaining text-service reference (Zifmia, cloak, platform-browser dist-esm) and specify accepted collateral vs. required cleanup.
- Phase 3 deletes `packages/text-service/` outright. Zifmia and cloak fall out of build as accepted collateral. platform-browser dist-esm/ stale import is a Phase 3 cleanup target or earlier if a dist-esm consumer surfaces.

## Open Items

### Short Term

- Branch `adr-174-phase1-prose-pipeline` (carrying Phase 2 commits) is local only — push and open PR when David is ready.
- `packages/platform-browser/dist-esm/BrowserClient.js` has a Feb-19 stale text-service import. Does not affect CLI bundle. Phase 3 cleanup target.
- `runtime/src/bridge.ts` has 5 pre-existing TS errors on `Story`-as-`never`. Confirmed pre-existing via git-stash. Not Phase 2 caused.

### Long Term

- **AC-9** (Phase 3): delete `@sharpee/text-service` entirely. Write plan before starting.
- Zifmia revival (if/when): redesign from platform-browser patterns, not a text-service port.
- Cloak-of-darkness workspace integration: should be added to `pnpm-workspace.yaml` and symlinks replaced with proper pnpm dependency declarations.

## Files Modified

**channel-service — new files** (3 files):
- `packages/channel-service/src/render-to-string.ts` — ported `renderToString` / `renderStatusLine` helpers
- `packages/channel-service/tests/render-to-string.test.ts` — 20 tests, 29 leaf cases via `it.each`
- `packages/channel-service/tests/ac-16-cleanup-grep-gate.test.ts` — per-file allow-list added for doc-comment false positives

**channel-service — modified** (1 file):
- `packages/channel-service/src/index.ts` — exports `renderToString` and `renderStatusLine`

**transcript-tester — modified** (2 files):
- `packages/transcript-tester/src/story-loader.ts` — re-pointed to channel-service
- `packages/transcript-tester/package.json` — dependency updated

**bridge / runtime / sharpee — modified** (6 files):
- `packages/bridge/src/index.ts` — re-exports re-pointed; dead text-service symbols dropped
- `packages/bridge/package.json` — channel-service added, text-service removed
- `packages/runtime/src/index.ts` — re-exports re-pointed; dead symbols dropped
- `packages/runtime/package.json` — channel-service added, text-service removed
- `packages/sharpee/src/index.ts` — re-exports re-pointed; dead symbols dropped
- `packages/sharpee/package.json` — channel-service added, text-service removed

**build scripts — modified** (2 files):
- `scripts/bundle-entry.js` — line 27: no longer spreads text-service into bundle scope
- `scripts/test-bundle-template.js` — line 35: same cleanup

**docs / plan** (3 files):
- `docs/architecture/adrs/adr-174-decoration-and-prose-pipeline.md` — Phase 2 status set to ACCEPTED; OQ-1 resolution recorded
- `docs/work/adr-174-prose-pipeline/plan-20260510-phase2.md` — new Phase 2 plan (supersedes prior)
- `docs/context/session-20260509-2300-adr-174-phase1-prose-pipeline.md` — OQ-1 Open Items entry updated to RESOLVED

**cloak-of-darkness — deferred, not migrated** (4 files touched in session state but not modified for migration):
- `stories/cloak-of-darkness/package.json` — pre-existing broken state; no migration applied
- `stories/cloak-of-darkness/run-platform.js` — pre-existing broken state; no migration applied
- `stories/cloak-of-darkness/src/test-runner.ts` — pre-existing broken state; no migration applied
- `stories/cloak-of-darkness/test-parser-events.js` — pre-existing broken state; no migration applied

**disposition doc — updated** (1 file):
- `docs/work/channel-io-unification/text-service-disposition-20260503.md` — Phase 2 status recorded

## Notes

**Session duration**: ~6 hours (early morning 2026-05-10 CST, starting ~01:37 CST)

**Approach**: Sub-phase sequencing identical to Phase 1. OQ-1 resolved before any code touched. Each sub-phase shipped passing tests before the next began. AC-8 grep sweep deferred to 2.4 so all changes could be verified in a single sweep rather than re-running after each sub-phase.

**Branch state**: 5 Phase 2 commits stacked on top of Phase 1 commits, all local on `adr-174-phase1-prose-pipeline`. Not pushed. No PR opened.

**Pre-existing debt confirmed non-regressive**: `runtime/src/bridge.ts` TS errors (`Story`-as-`never`) and `platform-browser/dist-esm/` stale import both confirmed pre-existing via git-stash test. Neither attributed to Phase 2 work.

**Cloak-of-darkness session-state entry**: cloak files appear in the session-state `files` array because they were opened/read during the entry investigation. They were not modified for Phase 2 migration purposes.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: safe to revert — Phase 2 changes are re-routing and deletion of dead re-exports. Reverting Phase 2 restores text-service imports in bridge/runtime/sharpee/transcript-tester and removes the channel-service render-to-string module. The CLI bundle and platform-browser bundle are unaffected by a Phase 2 revert (they alias to dist/, which Phase 2 did not change). Reverting Phase 1 + Phase 2 together requires re-introducing the IDecoration.type rename and ReadOnlyActionContext in reverse order.

## Dependency/Prerequisite Check

- **Prerequisites met**: OQ-1 resolved at session start (channel-service as render-to-string home); Phase 1 engine cutover complete; channel-service package exists and is in the workspace; `feedback_flakey_walkthroughs.md` policy known and applied (thief RNG re-run).
- **Prerequisites discovered**: `packages/platform-browser/dist-esm/` is stale from Feb-19 and has a text-service import — this was not visible from the Phase 1 plan. Does not block Phase 2 completion (CLI bundle unaffected) but is a Phase 3 prerequisite to verify.

## Architectural Decisions

- **ADR-174** Phase 2 status advanced from PROPOSED → ACCEPTED. `renderToString` / `renderStatusLine` helpers land in `@sharpee/channel-service`, not in `@sharpee/text-blocks`. This is the definitive resolution of OQ-1; not ADR-worthy beyond the OQ-1 record already in ADR-174.
- Cloak-of-darkness and Zifmia accepted as Phase 3 collateral — documented in the Phase 2 plan and this summary; not ADR-worthy (carve-outs, not architectural decisions).
- Dead re-export removal (`ITextService`, `createTextService`, `TextService` from bridge/runtime/sharpee) — authorized per project no-backwards-compatibility policy; not ADR-worthy.

## Mutation Audit

- Files with state-changing logic modified: none — Phase 2 is a dependency re-routing migration. No new state-mutating logic introduced.
- Tests verify actual state mutations: N/A — render-to-string is a pure function (blocks → string). Tests assert on return value, which is the complete state for a pure function.

## Recurrence Check

- Similar to past issue? NO — the cloak-of-darkness discovery (outside workspace, pre-existing broken) is specific to ADR-174's scope definition; not a recurrence of a prior session problem. The AC-16 false-positive pattern (doc comments tripping grep gates) is new and documented in the allow-list approach.

## Test Coverage Delta

- Tests added: 20 in `render-to-string.test.ts` (29 leaf cases via `it.each`); incremental additions to `ac-16-cleanup-grep-gate.test.ts` (allow-list entries). Net new: ~22 tests.
- Tests passing before → after: channel-service 74 → 94; engine 398 → 398 (unchanged); text-service 147 → 147 (unchanged); platform-browser 68 → 68 (unchanged); Dungeo walkthrough 930/0 (Phase 1 baseline maintained; 961 first-run variance is RNG, not regression).
- Known untested areas: Phase 3 scope — text-service package deletion and Zifmia/cloak collateral behavior are not tested until Phase 3.

---

**Progressive update**: Session completed 2026-05-10 12:48 CST
