# Session Summary: 2026-07-21 - chord-foundations (session 99aee6, continuation #2)

## Goals
- Rule on the royal-puzzle-basic RNG flake before planning (David consulted first).
- Execute `docs/work/post-248-open-items/plan.md` (4 phases) after David's "proceed."

## Phase Context
- **Plan**: Post-ADR-248 open-items sweep — close out the four items parked in session 171837 and reconfirmed in session-20260721-0912 (reboot wiring, ext-testing exports, dungeo dead-code disposition, ADR-247 plan authoring).
- **Phase executed**: All 4 phases — "armoured/thealderman reboot wiring" (Small), "ext-testing exports fix" (Small), "dungeo dead-code disposition" (Medium), "author ADR-247 implementation plan" (Small).
- **Tool calls used**: Not tracked — no `.session-state-*.json` present for this session (session-state file was absent at write time).
- **Phase outcome**: All 4 phases completed on/under budget per `docs/work/post-248-open-items/plan.md` (each phase's Status line already marks COMPLETE with in-plan detail).

## Completed

### Pre-plan ruling: royal-puzzle-basic RNG flake
- David ruled: "as long as we have a full dungeo regression, I'm less concerned about unit tests for the royal puzzle." Joins the accepted death-cascade flake set — no transcript logic gate or RETRY added; wt-14 chain coverage is the accepted premise.
- Memory `one-good-run-rule` updated with this addendum (do not re-raise).
- Sweep then planned via `session-planner`; `plan-review` came back clean with one tension resolved in-plan (tsconfig DOM-lib fixes stay story-local, not a platform change).

### Phase 1 — armoured/thealderman reboot wiring
- Wired both stories' `browser-entry.ts` onto the ADR-248 reboot callback using the cloak-of-darkness pattern: module-level client singleton, `reboot: () => start()`, construct/initialize gated to first boot only.
- Added `"DOM"` to the `lib` array in both stories' own `tsconfig.json` (story-local fix, not the shared `tsconfig.base.json` — stayed inside the CLAUDE.md autonomy boundary).
- `stories/armoured` typechecks fully clean, including removal of the stale `modalOverlay` prop (dropped from `DOMElements` at ADR-170).
- `stories/thealderman` browser-entry itself typechecks clean; its 6 pre-existing `.topic()` errors (calls against a removed character-package conversation API) are PARKED as recorded story-port drift, alongside cloak's 11 stale unit tests.
- Noted but out of scope: cloak's own `tsconfig.json` also lacks `"DOM"` — a repo-wide story-tsconfig pattern, not fixed here.

### Phase 2 — ext-testing dual-build
- Added `packages/extensions/testing/tsconfig.esm.json` extending `../../../tsconfig.base-esm.json`; build script changed to `tsc && tsc -p tsconfig.esm.json`.
- Removed the ts-forge ESM skip for this package — the ESM build passes clean, so the skip was protecting nothing.
- Removed the `packages/bootstrap` vitest config alias workaround that had been routing around the broken `"import"` exports condition.
- `packages/bootstrap` suite: 34/34 green resolving through the real exports map.
- Recorded: `@sharpee/ext-testing` has zero test files of its own (pre-existing, unrelated to this fix).

### Phase 3 — dungeo module-state disposition + confirm-gated deletion
- 29 audited-benign module-state sites (20 monotonic `eventCounter` counters + 9 safe-reseeded refs) recorded as stays-as-is — no hazard, no code change.
- Dead-code inventory re-verified against HEAD and presented to David via an AskUserQuestion confirm gate (per CLAUDE.md's no-delete-without-confirmation rule).
- David confirmed all four deletions:
  - `stories/dungeo/src/handlers/gas-room-handler.ts` (210 lines, zero importers)
  - `stories/dungeo/src/actions/basket/` (4 files — never-registered actions)
  - `stories/dungeo/src/handlers/basket-handler.ts` (268 lines, consumed only by the dead basket-action folder)
  - `river-handler.ts`'s dead `waterRoomIds` set and `registerWaterRooms` lines (the live transformer reads `RiverNavigationTrait` instead)
- Post-deletion verification: zero dangling references (grep-verified), `repokit build` clean, dungeo unit suite 31/31, walkthrough chain 921/921 on the first run (satisfies the one-good-run rule).

### Phase 4 — ADR-247 implementation plan authored
- Wrote `docs/work/adr-247-getcontents-worn-default/plan.md`: 6 phases, `plan-review` clean (advisory tensions recorded in-plan, none blocking).
- Key grounding finding: the real `getContents` call-site count is **176 across 102 files** (platform ~89/51 files, stories ~87/51 files, dungeo 75/45 files) — the ADR's stated figure of 64 is stale. This drift is documented in the plan's Grounding section rather than silently corrected in the ADR.
- All 6 phases are PENDING behind David's explicit ADR-247 go-ahead; `.current-plan` was left pointed at the post-248-open-items plan (not repointed to ADR-247, per Phase 4's own exit-state contract — that repoint is David's decision once he authorizes implementation).

## Key Decisions

### 1. Royal-puzzle-basic RNG flake — accepted, not gated
David's ruling folds this into the existing death-cascade accepted-flake set. Recorded in memory (`one-good-run-rule` addendum) rather than as a new ADR — it's a testing-policy ruling, not an architecture decision.

### 2. Dead-code deletion — confirm gate honored literally
Per CLAUDE.md ("never delete files without confirmation... not even 'to get a build working'") and the no-get-it-done-assumptions memory rule, the audit alone was not treated as standing license to delete — David was asked explicitly per file/group before any deletion happened.

### 3. ext-testing fix direction — sibling dual-build over dropping the import condition
The plan's Phase 2 offered two options (dual-build to match sibling packages like `stdlib`, or drop the `"import"` exports condition entirely). The sibling-convention dual-build was chosen to keep the package consistent with the rest of the platform rather than narrowing its public contract.

## Next Phase
Plan complete — all 4 phases of `docs/work/post-248-open-items/plan.md` done. No phase advances automatically; the next unit of work is ADR-247 implementation, which requires David's separate explicit go-ahead (Phase 4's authored plan, `docs/work/adr-247-getcontents-worn-default/plan.md`, is ready and waiting — not started).

## Open Items

### Short Term
- ADR-247 implementation awaits David's explicit go-ahead; when given, start at `docs/work/adr-247-getcontents-worn-default/plan.md` Phase 1 (the committed 176-site audit table — supersedes the ADR's stale 64-site figure).

### Long Term
- Parked: thealderman `.topic()` conversation-API port (6 errors, pre-existing).
- Parked: cloak-of-darkness's 11 stale unit tests.
- Parked: repo-wide story-tsconfig DOM-lib gap (cloak and possibly others besides thealderman/armoured, which are now fixed).
- Parked: generalized `import <file>` and packaged-book tooling (ADR-245 follow-ons).
- Parked: ADR-243 (unrelated, previously noted as outstanding).

## Files Modified

**Story browser wiring** (Phase 1):
- `stories/armoured/src/browser-entry.ts` - reboot callback + client singleton pattern
- `stories/armoured/tsconfig.json` - added DOM to lib
- `stories/thealderman/src/browser-entry.ts` - reboot callback + client singleton pattern
- `stories/thealderman/tsconfig.json` - added DOM to lib

**Platform packaging** (Phase 2):
- `packages/extensions/testing/tsconfig.esm.json` - new, ESM build config
- `packages/extensions/testing/package.json` - build script updated for dual-build
- `packages/bootstrap/vitest.config.*` - removed exports-condition alias workaround

**Dungeo dead-code removal** (Phase 3, David-confirmed):
- `stories/dungeo/src/handlers/gas-room-handler.ts` - deleted
- `stories/dungeo/src/actions/basket/` - deleted (4 files)
- `stories/dungeo/src/handlers/basket-handler.ts` - deleted
- `stories/dungeo/src/handlers/river-handler.ts` - dead `waterRoomIds`/`registerWaterRooms` lines removed

**Planning** (Phase 4):
- `docs/work/adr-247-getcontents-worn-default/plan.md` - new, 6-phase implementation plan (PENDING, awaiting go-ahead)

## Notes

**Session duration**: Not tracked — no session-state file present for this session.

**Approach**: David's blanket "proceed" authorized the sweep's own four phases but explicitly did not cover two in-flight gates inside it (Phase 3's deletion confirm, Phase 4's ADR-247 implementation go-ahead beyond plan-authoring) — both gates were honored as written rather than treated as pre-cleared by the outer "proceed."

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (sweep fully closed; ADR-247 implementation is separately gated future work)
- **Rollback Safety**: safe to revert — work is uncommitted atop `2ccc2767` at write time; this session's finalize commit is what lands it

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-248 (reboot pattern precedent, `docs/work/adr-248-restart-reboot/plan.md` Phase 3) for Phase 1; sibling dual-build convention (`packages/stdlib`) for Phase 2; the 171837 module-state audit for Phase 3; ADR-247 ACCEPTED text for Phase 4.
- **Prerequisites discovered**: ADR-247's stated 64-site call-audit figure is stale against the current codebase (real count 176 across 102 files) — captured as a grounding finding in the new plan rather than treated as a blocker.

## Architectural Decisions

- No new ADRs written this session. ADR-248 (reboot pattern) and ADR-247 (getContents worn default) were both applied/consulted, not authored.
- Pattern applied: ADR-248 reboot callback (client-owned singleton + `reboot: () => start()`) extended to armoured and thealderman, matching the fernhill precedent.
- Pattern applied: ADR-248 Decision 3 (factory-only story export, no module-level mutable state) used as the classification standard for Phase 3's dungeo module-state disposition.

## Mutation Audit

- Files with state-changing logic modified: `stories/armoured/src/browser-entry.ts`, `stories/thealderman/src/browser-entry.ts` (client lifecycle), `stories/dungeo/src/handlers/river-handler.ts` (dead-code removal only, no live logic changed).
- Tests verify actual state mutations (not just events): N/A — this session's changes were wiring/config/deletion, not new side-effect functions; existing suites (dungeo 31/31, bootstrap 34/34, walkthrough chain 921/921) were used as regression verification, not new mutation-assertion tests.

## Recurrence Check

- Similar to past issue? YES — the confirm-gated deletion pattern and the "audit says dead but ask anyway" discipline directly repeats the no-get-it-done-assumptions memory rule exercised in prior sessions (e.g. 171837's own module-state audit). No new systemic issue; the discipline held.

## Test Coverage Delta

- Tests added: 0 (this session's work was wiring, packaging config, and confirmed deletions — no new behavioral test suites required by the plan's phases).
- Tests passing before: dungeo chain 888/888 (baseline per plan.md) → after: dungeo chain 921/921 (first run, post-deletion). Dungeo unit suite: 31/31. Bootstrap suite: 34/34 (via the real exports map, no alias). Armoured: tsc clean. Repokit build: clean.
- Known untested areas: armoured/thealderman have no restart transcript coverage (neither story currently has a restart test — reboot wiring verified by typecheck + manual reasoning against the fernhill precedent, not a dedicated transcript per the plan's own Phase 1 exit-state note).

---

**Progressive update**: Session completed 2026-07-21 10:30
