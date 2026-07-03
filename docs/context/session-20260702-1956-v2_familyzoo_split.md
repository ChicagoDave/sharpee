# Session Summary: 2026-07-02 19:56 - v2_familyzoo_split (CST)

## Goals
- Implement Phase 1 of the ADR-208 plan (`docs/work/adr-208-interceptor-registry/plan.md`):
  replace the `globalThis` action-interceptor registry with a per-`WorldModel` binding map,
  delete `interceptor-registry.ts`, and unit-test the new world surface.

## Phase Context
- **Plan**: `docs/work/adr-208-interceptor-registry/plan.md`
- **Phase executed**: Phase 1 — "World-Model — Replace the Global Interceptor Registry
  with a Per-World Binding Map" (Medium tier, 250 tool-call budget)
- **Phase outcome**: Completed well under budget (~20 tool calls).

## Completed

### World-model changes (ADR-208 Phase 1)
- New `packages/world-model/src/capabilities/interceptor-binding.ts` — relocated
  `TraitInterceptorBinding` / `InterceptorRegistrationOptions` / `InterceptorLookupResult`
  plus `interceptorBindingKey(traitType, actionId)`; header docs the ADR-118/ADR-208
  ownership split (mirrors `capability-binding.ts`).
- `packages/world-model/src/world/WorldModel.ts` — private per-instance
  `interceptorBindings` map + 4 new methods on `IWorldModel`/`WorldModel`:
  `registerActionInterceptor` (idempotent, last-wins, never throws),
  `getInterceptorForAction` (same ADR-118 highest-priority-wins semantics, reads this
  world's map), `getInterceptorBinding`, `getAllActionInterceptors` (read-only
  introspection, mirrors `getAllCapabilityBindings`). Doc comments keep the three
  "capability-ish" surfaces (ADR-129 data capabilities / ADR-207 behavior bindings /
  ADR-208 interceptor bindings) visually distinct.
- `packages/world-model/src/world/AuthorModel.ts` — 4 delegates.
- `packages/world-model/src/capabilities/index.ts` — registry exports dropped, relocated
  binding types exported; root barrel is `export * from './capabilities'` so no root edit
  needed.
- **Deleted `packages/world-model/src/capabilities/interceptor-registry.ts`**
  (user-confirmed): the `globalThis` map, compat wrapper, and all 7 free functions.
  `unregisterActionInterceptor`/`clearInterceptorRegistry` not carried forward (ADR-208
  Open Question 2 — no production caller).
- `interceptor-helpers.ts` untouched (pure trait-declaration helpers, ADR-208 scope: Out).

### Tests
- New `packages/world-model/tests/unit/capabilities/interceptor-bindings.test.ts`
  (12 tests): registration + lookup, AC-4 idempotent last-wins, priority default/explicit,
  AC-10 missing-binding undefined/never-throws, ADR-118 priority resolution across traits,
  action-scoped matching, AC-2 two-world independence, AC-3 sequential-load isolation,
  enumeration keyed `traitType:actionId`, AuthorModel live-map delegate, AC-9
  non-serialization + re-init repopulation.

## Verification
- `pnpm --filter '@sharpee/world-model' build` clean (cjs + esm).
- `pnpm --filter '@sharpee/world-model' test`: **1318 passed / 10 skipped** (baseline
  1306 + 12 new).
- Partial AC-1: grep for `interceptor-registry` / `__sharpee_interceptor_registry__` /
  deleted free functions inside `packages/world-model/` (src + tests) → nothing.
- Expected breakage confirmed and exactly matches the ADR's consumer survey: 11 stdlib
  actions, `packages/engine/src/game-engine.ts`, `stories/dungeo/src/index.ts` still
  import the deleted free functions — resolved by Phase 2, not this phase. No consumers
  beyond the survey found.

## Key Decisions
- None beyond the plan — Phase 1 executed as specified (the plan itself encodes the
  decisions: no deprecated-retention staging, drop unregister/clear, mirror the
  capability-binding.ts type-relocation pattern).

# Phase 2 (same session): Engine + Stdlib Reader Migration and Dungeo Registration Migration

## Completed (Phase 2, user go-ahead: "go ahead with phase 2")

### Stdlib reader migration (12 call sites, 11 files)
- All `getInterceptorForAction(entity, actionId)` free calls →
  `context.world.getInterceptorForAction(...)`; dead imports removed (going.ts has two
  sites: GOING + ENTERING_ROOM destination check). Lookup-mechanism swap only — hook
  contract, invocation order, and emissions untouched (stdlib migration-audit discipline).

### Engine migration
- `game-engine.ts` — both introspection loops → `this.world.getAllActionInterceptors()`;
  the last capability-file free-function import in the engine is gone.

### Dungeo registration migration
- **14** guarded sites (the ADR survey's "15" counted the import line) → bare
  `world.registerActionInterceptor(...)`; guards + dead imports removed in the same edit.

### Consumers discovered beyond the survey (re-grep step — the `packages/*/src` glob
### had missed one directory level)
- `packages/extensions/basic-combat/src/index.ts` — public API changed:
  `registerBasicCombat(world: IWorldModel)`, calls `world.registerActionInterceptor`;
  README example updated (genai-api docs regenerate on build).
- `packages/devkit/fixtures/basic-story/src/world-setup.ts` — its caller; the try/catch
  guard around the old global-registry throw removed, passes `world`.
- **ADR-207 leftovers found in the same fixture** (missed by ADR-207 Phase 4 — nothing
  compiles the fixture in-workspace; its real gate is env-gated DEVKIT_INTEGRATION):
  `hasCapabilityBehavior` guard + `registerCapabilityBehavior` free call in
  world-setup.ts, `getBehaviorForCapability` free call in actions.ts. Migrated to the
  world-method form. Fixture now type-checks clean vs workspace-built packages
  (scratchpad tsconfig harness). Runtime proof rides ADR-207 Phase 5's overlay run.
- familyzoo v1.5.0 old-API references: intentionally untouched (frozen ^1.5.0 edition).

### Tests + docs
- New `packages/engine/tests/interceptor-dual-instance.test.ts` — AC-8 dual-module-copy
  test (vi.resetModules pattern, mirrors ADR-207's).
- `packages/stdlib/CLAUDE.md` — ADR-208 interceptor registration section added (per ADR
  Consequences).

## Verification (Phase 2)
- stdlib: build clean; **1294 passed / 27 skipped**.
- engine: build clean; **463 passed / 7 skipped** (42 files, includes new AC-8 test).
- `./repokit build dungeo`: clean (after the two discovered consumers were migrated;
  first run failed at ext-basic-combat — that's how the missed consumer surfaced).
  Note: `--skip ext-basic-combat` skipped THROUGH the package (stale dist .d.ts);
  rebuilt it explicitly + `./repokit bundle` after.
- Dungeo unit suite via bundle: **green on three consecutive full runs**
  (106 transcripts, ~1695-1706 passed + 9 expected failures + 4 skipped — count varies
  with WHILE-loop retries; "All tests passed!" each time). AC-6 named puzzles green
  explicitly: rug-trapdoor, troll-visibility, troll-interactions, trophy-case-scoring
  (68/68 + 1 expected failure), brick-explosion (safe rusted-shut) + gas-room 31/31.
- Repo-wide re-grep (packages/stories/tutorials/scripts/tools, .ts+.js, excluding
  dist/node_modules): every remaining match is the world-method form or the
  world-model surface itself.

# Phase 3 (same session): End-to-End Verification — Full AC Matrix and Hand-Back

## Completed (Phase 3, user go-ahead: "go ahead with phase 3")
- **AC-1 (bundle + sources)**: 0 hits for `__sharpee_interceptor_registry__` /
  `interceptor-registry` in `dist/cli/sharpee.js`, packages/, stories/.
- **Unit suite**: green via bundle ("All tests passed"). **Walkthrough chain: 868/868
  on the first run** (one-good-run rule) — also re-confirms AC-3 at integration level.
- **AC-7**: new `packages/engine/tests/introspect-interceptors.test.ts` (2 tests) —
  `engine.introspect()` enumerates the running world's interceptor bindings
  (traitType/actionId/priority/phases/kind + trait-summary interceptors list); a
  second engine/world sees none (world-scoped, not global). Engine suite 465/7 skipped.
- **AC-9**: new `stories/dungeo/tests/transcripts/interceptor-save-restore.transcript`
  (7/7) — rug interceptor fires again on restored state across `$save`/`$restore`;
  save blob has zero interceptor content and no new top-level field
  (keys: pluginStates, worldState). Save files are gitignored.
- ADR-208 header → IMPLEMENTED with pointers; plan Phases 1-3 all DONE.
- **`.current-plan` moved back to `docs/work/adr-207-capability-registry/plan.md`** —
  ADR-207 Phase 5 (published-package overlay harness) is the active phase again and
  now closes out BOTH migrations in one run.

## Investigation: troll-combat flake (NOT an ADR-208 regression)
First Phase 3 unit-suite run failed `troll-combat.transcript` (2 assertions). Root
cause chase: verbose run showed the player losing the melee fight repeatedly (UNTIL
matches "You are dead", ENSURES troll-alive fails, RETRY loops). Measured 20 isolated
runs on the current build (19/20; 2/30 across wider sampling ≈ 5%/run) **and 20 runs
on a pre-ADR-208 baseline** (scratchpad git worktree at HEAD 4b75e230, full platform +
bundle build): **19/20 — identical failure rate**. Conclusion: pre-existing troll
knockout-RNG flake; the prior session's "deterministically green" was 2-3 lucky
consecutive runs of a ~5% flake. Worktree removed after use.

**Pre-existing platform observation (flagged, not fixed — platform gate)**:
transcript-tester RETRY with `max=10` passed on attempt 11 ("Passed after 11
retry(s)") — off-by-one in the retry limit accounting.

# ADR-207 Phase 5 (same session, "Continue"): Published-Package Overlay Verification

## Completed (closes ADR-207 — and carries ADR-208's published-path proof)
- **Stale-artifact finding first**: local `dist/`/`dist-esm/` and the tsf staging
  (`~/.tsf-publish/sharpee`) still carried compiled `capability-registry.js` and
  `interceptor-registry.js` (tsc keeps outputs of deleted sources; `tsf build --npm`
  overlays staging without cleaning) — a publish would have shipped the deleted
  `globalThis` code. `./repokit clean` + full rebuild + staging wipe/regen; AC-1 then
  re-confirmed clean at bundle, source, AND staging level for both registry keys.
  Dungeo units green on the clean rebuild.
- **Overlay harness**: devkit `generateConsumer` (mode 'local') — `npm pack` tarballs
  of the full closure from staging, grafted as `file:vendor/*.tgz` into a scratchpad
  copy of familyzoo v2.0.0 (script: scratchpad `make-overlay.cjs`). Three transitive
  dev-chain packages (bootstrap, ext-testing, ide-protocol) initially resolved from
  the npm registry — caught via package-lock inspection, repacked from staging;
  final install has **0 registry-resolved @sharpee packages** (21 local).
- **AC-6 (the ADR's acceptance bar)**: `sharpee build --test` standalone on the
  overlay: **201/201 in 17 transcripts**; v16-scoring's `pet goats` message and
  "perfect score" (75/75) both pass against published-equivalent resolution.
- **AC-2/AC-3**: same run = 17 sequential per-entry story loads in one process, no
  throw/leak. **AC-8**: the overlay is the real-world dual-instance topology;
  end-to-end pass confirms the unit tests' assumption. **AC-9**: scratch v99
  transcript ($save/$restore around pet goats, 4/4; blob keys pluginStates/worldState,
  no binding fields). **AC-10**: node script on the overlay's installed packages —
  declared-but-unbound → `undefined`, no throw (207 + 208 surfaces).
- **friendly-zoo**: 36/36 (story dist rebuilt after the clean —
  `pnpm --filter '@sharpee/story-friendly-zoo' build`).
- **familyzoo v1.5.0 EXCLUDED per user direction** — frozen old-line edition; v2 work
  does not regression-test it (memory saved: familyzoo-v1.5-out-of-scope). The
  pre-direction run had confirmed its known 196/197 baseline; its touched files
  (pnpm-lock.yaml, version.ts) reverted — freeze byte-exact.
- ADR-207 header → IMPLEMENTED; plan Phase 5 → DONE (all phases complete).

## Follow-up decision for David (flagged, not taken)
- **Publish**: dry-run publish fails on the 2.0.0 version collision — shipping the
  fixed platform to npm needs a lockstep version bump. Overlay proof ≠ release.
- **RESOLVED (2026-07-03)**: David published lockstep **2.1.0** to npm. Registry
  verification: published world-model tarball has the per-world API, zero stale
  registry files; fresh familyzoo v2.0.0 installed purely from the registry
  (`^2.0.0` → 2.1.0) passes **197/197** incl. v16 75/75 — AC-6 on the true
  published path. (Workspace 2.1.0 version-bump edits are David's, uncommitted.)

## Open Items (small, carried)
- dungeo SW-vs-SOUTH map deviation (N/S Passage → Round Room), ADR-206 CI guard test,
  familyzoo book v2.0.0 prose updates for the per-world capability API.
- transcript-tester RETRY `max=10` off-by-one ("Passed after 11 retry(s)") — platform,
  needs discussion.
- troll-combat is a ~5%/run RNG flake (baseline-identical pre/post ADR-208) — the
  "deterministically green" unit-suite standard should account for it (hardening the
  transcript further or accepting the flake is a story-level call).

## Files Modified

**Phase 1** (world-model):
- `packages/world-model/src/world/WorldModel.ts` — interface + impl + map field
- `packages/world-model/src/world/AuthorModel.ts` — delegates
- `packages/world-model/src/capabilities/interceptor-binding.ts` — new (relocated types)
- `packages/world-model/src/capabilities/interceptor-registry.ts` — DELETED
- `packages/world-model/src/capabilities/index.ts` — barrel
- `packages/world-model/tests/unit/capabilities/interceptor-bindings.test.ts` — new (12 tests)

**Phase 2**:
- 11 stdlib action files (taking, going, throwing, switching_on, putting, pushing,
  opening, entering, dropping, closing, attacking) — context.world lookup + import
- `packages/engine/src/game-engine.ts` — 2 loops + import
- `packages/engine/tests/interceptor-dual-instance.test.ts` — new (AC-8)
- `stories/dungeo/src/index.ts` — 14 registrations, guards + imports removed
- `packages/extensions/basic-combat/src/index.ts` + `README.md` — world param
- `packages/devkit/fixtures/basic-story/src/world-setup.ts` + `src/actions.ts` —
  ADR-208 + ADR-207 leftovers migrated
- `packages/stdlib/CLAUDE.md` — ADR-208 registration note

**Phase 3**:
- `packages/engine/tests/introspect-interceptors.test.ts` — new (AC-7, 2 tests)
- `stories/dungeo/tests/transcripts/interceptor-save-restore.transcript` — new (AC-9)
- `docs/architecture/adrs/adr-208-interceptor-registry-engine-owned.md` — header → IMPLEMENTED
- `docs/context/.current-plan` — → `docs/work/adr-207-capability-registry/plan.md`

**Docs**:
- `docs/work/adr-208-interceptor-registry/plan.md` — Phases 1-3 → DONE
- `docs/context/session-20260702-1956-v2_familyzoo_split.md` — this file

## AC Matrix (ADR-208, all confirmed)
| AC | Evidence |
|----|----------|
| AC-1 | grep clean: world-model (Phase 1), full sources + `dist/cli/sharpee.js` (Phase 3) |
| AC-2 | interceptor-bindings.test.ts two-world independence test |
| AC-3 | unit test (sequential loads) + 868/868 walkthrough chain |
| AC-4 | unit test (idempotent last-wins re-register) |
| AC-5 | dungeo: 14 bare `world.registerActionInterceptor` calls, no guards/dead imports (re-grep clean) |
| AC-6 | unit suite green (incl. rug-trapdoor, troll-visibility, troll-interactions, trophy-case-scoring, brick-explosion safe) + walkthrough chain |
| AC-7 | introspect-interceptors.test.ts (enumeration + no cross-world leak) |
| AC-8 | interceptor-dual-instance.test.ts (vi.resetModules dual module copy) |
| AC-9 | unit test (getState/setState) + interceptor-save-restore.transcript + save-blob inspection |
| AC-10 | unit tests (undefined resolution, never throws) |

## Session Metadata
- **Status**: DONE — ADR-208 fully implemented (Phases 1-3, all AC confirmed) AND
  ADR-207 Phase 5 completed (published-package overlay, 201/201 incl. v16 75/75) —
  **both capability/interceptor registry migrations are now closed end-to-end.**
  Uncommitted; awaiting commit/push direction.
- **Blocker**: N/A
- **Rollback Safety**: ADR-208 Phases 1-3 revert as one unit (Phase 2 alone would
  restore imports of functions Phase 1 deleted). Phase 5 changed no product code
  (docs + one new engine test + one new dungeo transcript only).

## Mutation Audit
- Phase 1's `registerActionInterceptor` is the only new mutation (12 state-asserting
  tests; background mutation-verification agent: clean, no RED/YELLOW findings).
  Phase 2 is lookup-mechanism swaps (reads) + registration-call rewrites; no new
  mutation surface. The extension signature change alters no behavior (same binding,
  now per-world).
