# Session Summary: 2026-05-10 - adr-174-phase3-text-service-deletion

## Goals

- Delete `packages/text-service/` from disk and remove every workspace, build-script, and project-reference entry pointing at it (AC-9).
- Preserve all Phase 2 test and bundle baselines through the deletion.
- Satisfy ADR-174 AC-9 and advance Phase 3 status to ACCEPTED.

## Phase Context

- **Plan**: `docs/work/adr-174-prose-pipeline/plan-20260510-phase3.md` (Phase 3 Outcome section appended at session end)
- **Phase executed**: Phase 3 — "Delete @sharpee/text-service" (sub-phases 3.1–3.4)
- **Tool calls used**: 144 / unbudgeted
- **Phase outcome**: Completed; all four sub-phases landed; AC-9 satisfied; branch local, not pushed

## Completed

### 3.1 — Pre-flight grep

Grep inventory matched the plan's table for source-import matches. Config-file scope was narrower than needed — the plan's grep covered only the files explicitly enumerated in the pre-flight table, missing five files that surfaced in 3.3. Stop gate passed on the planned scope; OQ-5 documents the gap.

### 3.2 — Configuration cleanup and dist-esm handling

All DELETE- and CLEANUP-tagged entries removed from the planned file set:

- `package.json`: workspace entry and two script references removed.
- `build.sh`: 8 alias/export lines removed (CLI bundle path, test-bundle path, two browser ESM paths, two Zifmia paths, one package alias map entry, one `dist/cli/sharpee.d.ts` heredoc line).
- `packages/bridge/tsconfig.json`, `packages/runtime/tsconfig.json`, `packages/engine/tsconfig.json`, `packages/sharpee/tsconfig.json`: `{ "path": "../text-service" }` removed from each `references[]` array.
- `scripts/npm-latest.sh`: `text-service` publish entry removed.
- `scripts/generate-genai-api.js`: `{ name: 'text-service', dir: 'packages/text-service' }` entry removed.
- `pnpm-workspace.yaml`: `!packages/zifmia` added (OQ-4 option B — see Key Decisions).

Plan deviation: `packages/platform-browser/dist-esm/` was deleted rather than rebuilt. The plan called for `tsc -p tsconfig.esm.json` to produce a clean artifact; `platform-browser` has no `tsconfig.esm.json` and no current build pipeline produces dist-esm. Deletion was the plan-listed alternative; consumers resolve through `dist/` per `build.sh:824`.

Workspace projects after 3.2: 32 → 31 (zifmia excluded via pnpm-workspace.yaml).

### 3.3 — Delete packages/text-service/

Directory deleted. First `pnpm install` errored: `stories/dungeo/package.json` and `tutorials/familyzoo/package.json` both declared `@sharpee/text-service: workspace:*` as a dependency — not caught by the pre-flight grep (OQ-5). Also discovered `packages/transcript-tester/tsconfig.json` had a stale `../text-service` project reference, and `stories/dungeo/tsconfig.json` plus `stories/dungeo/tsconfig.esm.json` had a `text-services` (plural typo) paths mapping. All five files patched. Second `pnpm install` clean.

Workspace projects after 3.3: 31 → 30 (text-service deleted).

### 3.4 — Final regression and AC-9 verification

Unit test suites:

| Suite | Result | Phase 2 baseline |
|---|---|---|
| Engine vitest | 398 / 0 / 7 skipped | 398 / 0 / 7 skipped |
| Channel-service vitest | 94 / 0 | 94 / 0 |
| Platform-browser vitest | 68 / 0 | 68 / 0 |
| Text-service vitest | N/A — package deleted | 147 / 0 |

CLI bundle: 2.3 MB, 33 ms load. Browser bundle: 1.2 MB. Both built clean.

Dungeo walkthrough chain: 872 / 0 (after walkthrough cascade incident — see Notes).

AC-9 grep: zero source-import matches outside accepted-collateral surfaces (zifmia ×2, cloak-of-darkness ×3). Zero config-file matches in the audited set.

ADR-174 Phase 3 status set to ACCEPTED; OQ-5 recorded in §Open Questions.

## Key Decisions

### 1. OQ-3 resolved: tsconfig project references were no-ops post-Phase-1

Removing `{ "path": "../text-service" }` from engine, bridge, runtime, sharpee, and (mid-flight) transcript-tester tsconfigs caused no `tsc --build` cascades. All five have had zero source-level imports from text-service since Phase 1; the project references were stale metadata.

### 2. OQ-4 resolved as option B: !packages/zifmia in pnpm-workspace.yaml

Zifmia carries `@sharpee/text-service: workspace:*` in its `package.json`. Rather than surgically removing that dep entry (option A), `!packages/zifmia` was added to `pnpm-workspace.yaml`. This is the consistent signal that Zifmia is parked, not actively developed. Discovery: pnpm treats `pnpm-workspace.yaml` as authoritative over `package.json`'s `workspaces[]` field — the plan's edits to `package.json workspaces[]` were retained for documentation consistency but have no effect on pnpm's resolution graph.

### 3. OQ-5 (new): pre-flight grep scope was insufficient for package deletion

The plan's pre-flight grep covered source-import patterns and a fixed enumerated set of config files. It missed: `packages/transcript-tester/tsconfig.json`, `stories/dungeo/tsconfig.json`, `stories/dungeo/tsconfig.esm.json`, `stories/dungeo/package.json`, `tutorials/familyzoo/package.json`. Future package-deletion phases must grep `package.json`, `tsconfig*.json`, `*.sh`, `*.js`, `*.yaml`, and `*.yml` across all of `packages/`, `stories/`, `scripts/`, `tutorials/`. Documented in ADR-174 §Open Questions OQ-5.

### 4. Plan deviation: dist-esm deleted, not rebuilt

`packages/platform-browser/dist-esm/` is a Feb-19 orphan with no `tsconfig.esm.json` to regenerate it from. The plan named deletion as its own alternative; deletion was applied.

## Next Phase

No next phase. ADR-174 is complete across all three phases. No follow-on ADR-174 work planned.

## Open Items

### Short Term

- Branch `adr-174-phase1-prose-pipeline` is local only — push and open PR when David is ready.

### Long Term

- Zifmia revival (if/when): redesign from platform-browser patterns; now outside the workspace via `!packages/zifmia`.
- Cloak-of-darkness workspace integration: outside `pnpm-workspace.yaml`, pre-existing broken state; not an ADR-174 obligation.
- DOC-tagged comments in stdlib, engine, lang-en-us: accurate historical references; future documentation-only cleanup pass if desired.
- `TEXT_SERVICE` constant in `packages/core/src/events/system-event.ts` and `packages/core/src/debug/types.ts`: string literals, not imports; renaming is a semantic change requiring its own ADR if pursued.
- Text-service test coverage gap: the deleted package carried 147 tests. Behavior covered by those tests is split between engine (prose pipeline handlers) and channel-service (render-to-string). A coverage audit belongs to a separate session if gaps surface.

## Files Modified

**root config** (2 files):
- `package.json` — workspace entry removed; two script filter steps removed
- `pnpm-workspace.yaml` — `!packages/zifmia` added

**build script** (1 file):
- `build.sh` — 8 alias/export lines removed (CLI, test-bundle, browser ESM ×2, Zifmia ×2, alias map, sharpee.d.ts heredoc)

**TypeScript project references** (5 files):
- `packages/bridge/tsconfig.json` — `../text-service` reference removed
- `packages/runtime/tsconfig.json` — same
- `packages/engine/tsconfig.json` — same
- `packages/sharpee/tsconfig.json` — same
- `packages/transcript-tester/tsconfig.json` — same (mid-flight discovery)

**build utility scripts** (2 files):
- `scripts/npm-latest.sh` — `text-service` entry removed
- `scripts/generate-genai-api.js` — `text-service` package entry removed

**workspace stories and tutorials** (4 files):
- `stories/dungeo/package.json` — dead `@sharpee/text-service` dep removed
- `stories/dungeo/tsconfig.json` — `text-services` (typo) paths mapping removed
- `stories/dungeo/tsconfig.esm.json` — same typo paths mapping removed
- `tutorials/familyzoo/package.json` — dead dep removed

**docs** (3 files):
- `docs/architecture/adrs/adr-174-decoration-and-prose-pipeline.md` — Phase 3 ACCEPTED; OQ-5 added
- `docs/work/channel-io-unification/text-service-disposition-20260503.md` — final status noted
- `docs/work/adr-174-prose-pipeline/plan-20260510-phase3.md` — Phase 3 Outcome section appended

## Files Deleted

- `packages/text-service/` — entire package (19+ source files, plus `dist/`, `dist-esm/`, `dist-npm/`)
- `packages/platform-browser/dist-esm/` — orphaned Feb-19 artifact

## Notes

**Session duration**: ~45 minutes (approx. 13:00–13:35 CST, starting after David confirmed "phase 3 go" from the Phase 2 recap)

**Walkthrough cascade incident**: first two post-Phase-3 walkthrough runs reported 554 failures beginning at wt-10's `$restore wt-09`. Attributed initially to a Phase 3 regression. Root cause: `stories/dungeo/saves/` held stale save files generated by the baseline bundle from earlier in the same session. The Phase-3 bundle's save format is not byte-compatible with saves produced by the pre-Phase-3 bundle loaded in the same session. Deleted the `saves/` directory; reran with the Phase-3 bundle; saves regenerated; walkthrough chain: 872 / 0. Confirmed non-regressive via `git stash`/`git stash pop` baseline test: baseline bundle produced 863 / 0 (RNG variance on thief combat, not failures). Cross-bundle save-format compatibility is not a Phase 3 acceptance criterion.

**Workspace count**: 32 → 30 (text-service removed by deletion; zifmia excluded via `pnpm-workspace.yaml`).

**Accepted collateral (untouched, will not build)**:
- `packages/zifmia/` — outside workspace via `!packages/zifmia`
- `stories/cloak-of-darkness/` — outside workspace, pre-existing broken state
- `stories/concealment-test/package.json` and `packages/zifmia/package.json` — outside workspace; harmless dead dep declarations, not patched

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: safe to revert — single-commit operation covering all of 3.2 + 3.3 + 3.4. `git revert HEAD && pnpm install` restores the workspace link. Note: `packages/platform-browser/dist-esm/` was deleted, not rebuilt; rollback does not restore it, but the stale artifact is undesirable to keep regardless.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2 COMPLETE (all consumers off text-service); OQ-4 and OQ-3 resolutions available at session start; `feedback_flakey_walkthroughs.md` policy applied (re-run on RNG variance).
- **Prerequisites discovered**: five config files outside the pre-flight grep scope carried live references (OQ-5). `pnpm-workspace.yaml` is authoritative over `package.json workspaces[]` for pnpm — not in the plan; discovered during OQ-4 resolution.

## Architectural Decisions

- **ADR-174** Phase 3 status advanced from IN-PROGRESS → ACCEPTED. ADR-174 now complete across all three phases. OQ-5 recorded as a methodology note for future package-deletion phases — not ADR-worthy as a new ADR, but load-bearing enough to document in ADR-174 itself.
- Zifmia workspace exclusion via `!packages/zifmia` — consistent with "parked, not actively developed" classification per Phase 2. Not ADR-worthy.

## Mutation Audit

- Files with state-changing logic modified: none — Phase 3 is a deletion-and-configuration-cleanup operation. No source-code logic was written or changed.
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? Partially. OQ-5 (pre-flight grep scope insufficient) is new to ADR-174, but the general pattern — "config files outside the planned grep scope carry live references" — is structurally similar to Phase 2's cloak-of-darkness discovery (surface outside the planned audit scope was broken). Not a direct recurrence (different artifact type and failure mode), but the pre-flight scoping discipline is worth standardizing. OQ-5 in ADR-174 serves as that record.

## Test Coverage Delta

- Tests added: 0 — Phase 3 is a deletion phase. No new tests were written.
- Tests passing before → after: engine 398 → 398; channel-service 94 → 94; platform-browser 68 → 68; text-service 147 → deleted; Dungeo walkthrough 930/0 baseline → 872/0 (RNG variance; failures = 0 is the load-bearing count).
- Known untested areas: engine prose-pipeline handlers and channel-service render-to-string cover the functional behavior that text-service's 147 tests exercised, but no explicit coverage audit was performed. A gap audit is a separate session item.

---

**Progressive update**: Session completed 2026-05-10 13:35 CST
