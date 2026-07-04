# Session Summary: 2026-07-02 - v2_familyzoo_split (CST)

## Goals
- Produce and review an implementation plan for ADR-207 (Capability Registry is Engine-Owned, not Process-Global).
- With explicit go-ahead, implement Phase 1: move the ADR-090 capability-behavior binding map off a `globalThis` singleton onto per-`WorldModel` ownership.

## Phase Context
- **Plan**: `docs/work/adr-207-capability-registry/plan.md` — move the capability binding map off `globalThis` onto per-`WorldModel` ownership, migrate every reader/writer (engine, stdlib, bootstrap, transcript-tester, devkit, all in-repo stories), prove the fix end-to-end via familyzoo `v16-scoring` reaching 75/75 against published packages.
- **Phase executed**: Phase 1 — "World-Model — Replace the Global Capability Registry with a Per-World Binding Map" (Medium tier)
- **Tool calls used**: 399 (session-wide, covers both planning and Phase 1 implementation)
- **Phase outcome**: Completed on budget.

## Completed

### Planning: ADR-207 implementation plan
- Ran session-planner to write `docs/work/adr-207-capability-registry/plan.md` (5 phases: world-model binding map, engine/stdlib reader migration, loader/transcript-tester/devkit lifecycle cleanup, story registration migration across dungeo/familyzoo/friendly-zoo, end-to-end verification against published packages).
- Ran plan-review against it: result clean, no contradictions against ADR-207, ADR-090, CLAUDE.md, or `packages/world-model/CLAUDE.md` / `packages/stdlib/CLAUDE.md`.
- Per explicit user direction ("there is no need to retain deprecated methods"), revised the plan to drop ADR-207's originally-suggested three-step staged deprecation (add-alongside → migrate → delete-later) in favor of delete-and-replace-in-place per phase: each phase deletes what it replaces in the same commit rather than leaving a deprecated free-function API live during migration.
- Added a "Resolved-by-plan (2026-07-02)" note to `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` Open Questions §1 documenting this deviation from the ADR's suggested ordering and why it's still safe (the hazard the staged ordering guards against — an author guard checking a global that no longer exists — is avoided by removing the guard in the same edit that rewrites the registration call, in Phase 4, rather than leaving it as later-cleanup dead code).

### Implementation: Phase 1 — per-WorldModel capability binding map
- With explicit user go-ahead ("begin"), implemented Phase 1 in `@sharpee/world-model`.
- New file `packages/world-model/src/capabilities/capability-binding.ts` holds the per-instance binding-map logic (replaces the deleted global registry's storage and lookup functions).
- **Deleted** `packages/world-model/src/capabilities/capability-registry.ts` in the same commit — the `globalThis['__sharpee_capability_behaviors__']` map and every throw-on-duplicate free function (`registerCapabilityBehavior`, `getBehaviorForCapability`, `getBehaviorBinding`, `hasCapabilityBehavior`, `unregisterCapabilityBehavior`, `clearCapabilityRegistry`, `getAllCapabilityBindings`). No deprecated-alongside-new staging, per the user's explicit direction.
- Updated `packages/world-model/src/capabilities/index.ts` (barrel — drop deleted exports, add relocated ones), `packages/world-model/src/world/WorldModel.ts` (new `IWorldModel` methods: `registerCapabilityBehavior`, `getBehaviorForCapability`, `getBehaviorBinding`, backed by a per-instance field), and `packages/world-model/src/world/AuthorModel.ts` accordingly.

### Two in-package consumers found and fixed beyond the ADR's stated Scope section
- `packages/world-model/src/world/VisibilityBehavior.ts` — 4 call sites for the `if.scope.visible` capability, updated to use per-instance binding instead of the deleted free functions.
- `packages/world-model/src/traits/concealment/concealedVisibilityBehavior.ts` — `registerConcealedVisibilityBehavior` now takes a `world: WorldModel` parameter instead of reaching into the global registry.

### Downstream test fix
- `packages/stdlib/tests/unit/actions/hiding-golden.test.ts` — its own comment said "the registry is global — re-registration would throw" (literally the bug ADR-207 fixes). Rewrote it to register per-test against a fresh `WorldModel` instance instead of the module-level dedup/try-catch workaround.
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` — test suite migrated to the per-instance model.

## Key Decisions

### 1. Delete-and-replace-in-place instead of staged deprecation
ADR-207's Open Questions §1 suggested a three-step staged migration (add new alongside old, migrate callers, delete old in a final commit) to avoid an author guard checking a since-removed global. Per the user's explicit direction and CLAUDE.md's "we don't care about backward compatibility" policy, the plan instead deletes what each phase replaces in the same commit. The real hazard is avoided differently: guards are removed at the same time their registration call is rewritten (Phase 4), not left as inert dead code. This is recorded in both the plan (Design note) and the ADR itself (Open Questions §1, "Resolved-by-plan" addendum).

### 2. Fix in-package consumers discovered outside the ADR's stated Scope
`VisibilityBehavior.ts` and `concealedVisibilityBehavior.ts` were not named in ADR-207's Scope section but directly consumed the deleted global registry. Since they are in-package (world-model) and would otherwise break the package's own build, they were fixed within Phase 1 rather than deferred — consistent with Phase 1's exit-state contract that world-model itself must build and test clean.

## Next Phase
- **Phase 2**: "Engine + Stdlib Reader Migration" — rewrite every behavior-resolution call site in `packages/engine/src/capability-dispatch-helper.ts` and `packages/stdlib` (capability-dispatch.ts, giving.ts, throwing.ts, raising/lowering) to call the new `world.*` methods instead of the deleted free functions; update `packages/engine/tests/universal-capability-dispatch.test.ts`.
- **Tier**: Medium (250 tool-call budget)
- **Entry state**: Phase 1 complete — `world.registerCapabilityBehavior`/`getBehaviorForCapability`/`getBehaviorBinding` exist and are unit-tested in isolation; `packages/engine` and `packages/stdlib` (non-test source) currently fail to build because they still import the deleted free functions from `@sharpee/world-model`.

## Open Items

### Short Term
- Phase 2 (engine/stdlib reader migration) is next and is mandatory before the platform builds again — this is intentional per the plan's Design note, not a regression to chase down now.
- Phases 3-5 (transcript-tester/devkit lifecycle cleanup, story registration migration across dungeo/familyzoo/friendly-zoo, end-to-end verification against published packages) remain PENDING.

### Long Term
- Phase 5's AC-6 verification requires validation against **published** `@sharpee/*@2.0.x` packages, not just the in-repo workspace build — a scratchpad overlay/pack harness is planned for that phase.

## Files Modified

**Planning** (2 files):
- `docs/work/adr-207-capability-registry/plan.md` - new 5-phase implementation plan for ADR-207
- `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` - added "Resolved-by-plan" note to Open Questions §1

**World-model (Phase 1 implementation)** (7 files):
- `packages/world-model/src/capabilities/capability-binding.ts` - new per-instance binding-map logic
- `packages/world-model/src/capabilities/capability-registry.ts` - deleted (globalThis map + free functions)
- `packages/world-model/src/capabilities/index.ts` - barrel updated for new/removed exports
- `packages/world-model/src/world/WorldModel.ts` - new `IWorldModel` methods, per-instance binding field
- `packages/world-model/src/world/AuthorModel.ts` - updated for per-instance binding API
- `packages/world-model/src/world/VisibilityBehavior.ts` - 4 call sites migrated (discovered beyond ADR Scope)
- `packages/world-model/src/traits/concealment/concealedVisibilityBehavior.ts` - takes `world: WorldModel` param (discovered beyond ADR Scope)

**Tests** (2 files):
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` - migrated to per-instance model
- `packages/stdlib/tests/unit/actions/hiding-golden.test.ts` - rewritten to register per-test against a fresh world instead of global-registry dedup workaround

**Other** (1 file):
- `docs/context/.current-plan` - points to the new ADR-207 plan

## Notes

**Session duration**: single session, 399 tool calls total (planning + Phase 1 implementation).

**Approach**: session-planner → plan-review → user go-ahead → direct implementation, verified with package-scoped build/test before considering Phase 1 done.

**Known/expected build-break state (not a bug)**: `packages/engine`, `packages/stdlib` (non-test source), and every story/tutorial (dungeo, familyzoo v1.5.0/v2.0.0, friendly-zoo) are now EXPECTED to fail to build until Phase 2 (engine/stdlib) and Phase 4 (stories) land. This is intentional per the plan's Design note — the whole plan is gated behind one user go-ahead and executed as a coordinated sequence, not merged incrementally. Do not report this as a regression; it resolves in Phase 2 and Phase 4.

---

## Session Metadata

- **Status**: DONE (Phase 1 of the ADR-207 plan only — the overall ADR-207 plan/feature is NOT complete; Phases 2-5 remain PENDING)
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): ~4 sessions (Phases 2-5, per plan budgets: 250 + 100 + 400 + 250 tool calls)
- **Rollback Safety**: safe to revert (Phase 1 changes are scoped to `packages/world-model` and one downstream test file; reverting the commit restores the prior global-registry build across the whole platform)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-207 was ACCEPTED before planning began; plan-review confirmed no contradictions with ADR-090, ADR-207, or per-package CLAUDE.md conventions; explicit user go-ahead obtained before touching `packages/` per CLAUDE.md's platform-change gate.
- **Prerequisites discovered**: none beyond the two in-package consumers (`VisibilityBehavior.ts`, `concealedVisibilityBehavior.ts`) noted above, which were in-scope for Phase 1 by virtue of being in-package.

## Architectural Decisions

- ADR-207 (Capability Registry is Engine-Owned, not Process-Global) — implementation begun this session; Open Questions §1 amended with a "Resolved-by-plan" note recording the delete-and-replace-in-place deviation from the ADR's suggested staged-deprecation ordering.
- Pattern applied: per-instance ownership of mutable dispatch state (binding map lives on `WorldModel`, not on a process global) — the ADR-090 capability-dispatch contract itself (`validate/execute/report/blocked`, `findTraitWithCapability`) was explicitly out of scope and left untouched.

## Mutation Audit

- Files with state-changing logic modified: `packages/world-model/src/capabilities/capability-binding.ts` (new binding-map register/read/idempotent-overwrite logic), `packages/world-model/src/world/WorldModel.ts`, `packages/world-model/src/world/AuthorModel.ts`, `packages/world-model/src/world/VisibilityBehavior.ts`, `packages/world-model/src/traits/concealment/concealedVisibilityBehavior.ts`.
- Tests verify actual state mutations (not just events): YES — `capability-dispatch.test.ts` and `hiding-golden.test.ts` register behaviors against real `WorldModel` instances and then read them back via `getBehaviorForCapability`/`getBehaviorBinding`, asserting on the resolved behavior rather than on registration not throwing alone.

## Recurrence Check

- Similar to past issue? NO — this is the first session working ADR-207's implementation plan; no prior session file addresses the capability-registry global-state defect.

## Test Coverage Delta

- Tests added: capability-dispatch.test.ts migrated in place (same test count, rewritten for per-instance semantics); hiding-golden.test.ts rewritten in place (same test count, per-test world instance instead of dedup workaround). No net new test files.
- Tests passing before: N/A (world-model's global-registry-based suite was the prior baseline, not separately recorded this session) → after: `pnpm --filter '@sharpee/world-model' test` — 66/66 test files, 1299 passed, 10 skipped, 0 failed.
- Known untested areas: engine/stdlib reader migration (Phase 2) and story registration migration (Phase 4) have no test coverage yet since those packages don't build against the new API until their respective phases land.

---

**Progressive update**: Session completed 2026-07-02 00:52
