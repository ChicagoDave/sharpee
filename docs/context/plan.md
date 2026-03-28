# Session Plan: ISSUE-064 and ISSUE-065 — VisibilityBehavior Deduplication and Scope System Audit

**Created**: 2026-03-27
**Overall scope**: Two related platform refactors in the world-model/parser area. ISSUE-064 extracts a shared container-walk helper in VisibilityBehavior to eliminate three near-identical traversal loops. ISSUE-065 audits and documents the three separate scope evaluation systems to determine whether consolidation is warranted and, if so, what the consolidation path should be.
**Bounded contexts touched**: N/A — infrastructure/platform (no domain behavior change)
**Key domain language**: N/A

## Investigation Findings (pre-planning)

### ISSUE-064: VisibilityBehavior

`VisibilityBehavior.ts` (`packages/world-model/src/world/`) has three private static methods that each walk the containment chain from an entity upward to its room, checking for closed opaque containers at every hop:

- `isAccessible` (line 334): while-loop, checks ACTOR/CONTAINER/OPENABLE per hop, returns bool
- `hasLineOfSight` (line 375): uses `getContainmentPath()` then iterates the path array, same logic
- `isVisible` (line 447): while-loop, same logic plus a SceneryTrait/capability check at the top

The inner logic is identical: skip ACTOR containers, check CONTAINER for `isTransparent`, then check OPENABLE for `isOpen`. `hasLineOfSight` is the only one that also uses a pre-built `getContainmentPath()` helper.

Public API callers (stdlib, dungeo story) only call `isDark`, `canSee`, `getDescribableLocation`, `getVisible`, and `isVisible` — no caller reaches the three private traversal methods directly. The refactor is safe to do without changing any public signature.

### ISSUE-065: Scope System Audit

Three systems exist:

1. **world-model `ScopeRegistry` + `ScopeEvaluator`** (`packages/world-model/src/scope/`): Rule-based, triple-indexed. Used by `WorldModel` via `evaluateScope()` → `getInScope()`. `WorldModel` exposes `addScopeRule()`, `removeScopeRule()`, `getScopeRegistry()`. Also exposed on WorldModel barrel export. `evaluateScope` has a stub `ScopeService` that wraps it but the service itself is a TODO stub.

2. **parser-en-us `ScopeEvaluator`** (`packages/parser-en-us/src/scope-evaluator.ts`): Static class. Used only by `entity-slot-consumer.ts` during grammar matching. Calls `context.world.getVisibleEntities()`, `getTouchableEntities()`, `getCarriedEntities()`, etc. — it delegates to WorldModel methods, it does **not** call into the world-model `ScopeRegistry/ScopeEvaluator`.

3. **stdlib `StandardScopeResolver`** (`packages/stdlib/src/scope/scope-resolver.ts`): Used by `CommandValidator` for entity resolution during command validation. Completely independent of both systems above.

**Key finding**: The two `ScopeEvaluator` classes have the same name but no relationship. The world-model one is rule-based extension infrastructure. The parser one is a static utility that delegates to WorldModel methods. The stdlib one is validation-layer entity resolution. None of the three call each other in a circular way. The systems are parallel, not actually disconnected — they serve different callers at different stages of the turn cycle.

**Recommended path for ISSUE-065**: This is an investigation-first issue. Phase 1 should produce a documented call-chain map and a written recommendation (consolidate / document-and-leave / rename to disambiguate). Only after that recommendation is approved should any code change happen.

---

## Phases

### Phase 1: Extract Shared Container-Walk Helper in VisibilityBehavior (ISSUE-064)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform structural cleanup
- **Entry state**: `packages/world-model/src/world/VisibilityBehavior.ts` has three near-identical container traversal loops in `isAccessible`, `hasLineOfSight`, and `isVisible`
- **Deliverable**:
  - New private static helper `walkContainmentChain(entityId, roomId, world, visitor)` (or equivalent name) that encodes the single traversal with a per-hop predicate/callback
  - `isAccessible` rewritten as a thin wrapper: returns false as soon as visitor signals blocked
  - `hasLineOfSight` rewritten as a thin wrapper: removes the separate `getContainmentPath()` pre-pass and reuses `walkContainmentChain`
  - `isVisible` rewritten as a thin wrapper: SceneryTrait/capability checks remain at the top, then delegates to the shared walker
  - All existing visibility tests pass; full walkthrough chain passes
  - No public method signatures change
- **Exit state**: Three traversal implementations are gone; one canonical implementation exists; `getContainmentPath()` may be removed if it becomes dead code
- **Status**: DONE

### Phase 2: Scope System Audit and Recommendation (ISSUE-065, Investigation)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform architecture investigation
- **Entry state**: Phase 1 complete; three scope systems exist with overlapping names and unclear boundaries
- **Deliverable**:
  - Written call-chain map added to `docs/work/dungeo/scope-audit.md` covering:
    - Which callers use world-model `ScopeRegistry/ScopeEvaluator` and when in the turn cycle
    - Which callers use parser-en-us `ScopeEvaluator` and when
    - Which callers use stdlib `StandardScopeResolver` and when
    - Whether `ScopeService` (the stub) is referenced by any live code path
  - A clear recommendation: rename / document-and-leave / consolidate, with rationale
  - No code changes in this phase — investigation only
- **Exit state**: David has reviewed the audit doc and approved a path forward; code changes for ISSUE-065 are scoped into Phase 3 if needed, or the issue is resolved as "document-and-close"
- **Status**: DONE — Audit written to `docs/work/dungeo/scope-audit.md`. Recommendation: rename + document + delete dead code (no consolidation).

### Phase 3: Scope System Resolution (ISSUE-065, Implementation) — conditional
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform structural cleanup
- **Entry state**: Phase 2 audit complete and approved; a specific code change path is chosen
- **Deliverable**: Depends on Phase 2 outcome. Possible deliverables:
  - **Rename path**: Rename `parser-en-us/ScopeEvaluator` to `GrammarScopeResolver` and `world-model/ScopeEvaluator` to `RuleScopeEvaluator`; update all imports; add header comments to each explaining its role
  - **Consolidate path**: Merge one system into another with a migration; update all callers; delete dead code
  - **Document-and-close path**: Add header comments to all three files clarifying their role and why they are separate; close the issue
  - In all cases: build passes, full walkthrough chain passes
- **Exit state**: ISSUE-065 is closed; scope system boundary is clearly documented and either simplified or explicitly justified
- **Status**: DONE — Renamed classes, deleted dead ScopeService, added pipeline header comments.
