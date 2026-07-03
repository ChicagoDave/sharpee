# Session Plan: ADR-208 — Action-Interceptor Registry is World-Owned, not Process-Global

**Created**: 2026-07-02
**Overall scope**: Move the ADR-118 action-interceptor *binding map* off a `globalThis`
process singleton onto per-`WorldModel` ownership — the identical defect class ADR-207
just eliminated for capability-behavior bindings, at roughly ⅓ the surface (one story
tree, no tutorial editions, no published-package phase of its own). Migrate every
reader/writer call site (11 stdlib standard actions, 2 engine introspection loops,
15 dungeo registration sites) to the new `world.*` surface and delete
`interceptor-registry.ts` in the same coordinated pass.
**Bounded contexts touched**: world-model (ADR-118 interceptor-binding storage), engine
(introspection summary in `game-engine.ts`), stdlib (11 standard actions that dispatch
through an interceptor), and the story layer (dungeo only — no other in-repo story or
tutorial registers interceptors).
**Key domain language**: *interceptor definition* (stateless `{preValidate, postValidate,
postExecute, onBlocked, postReport}` hook object — stays shareable, ADR-118 unchanged),
*binding* (a `(traitType, actionId) → {interceptor, priority}` association scoped to one
running game — moves to `WorldModel`), *binding map* / "the registry" (the per-game
collection of bindings this ADR relocates), *priority resolution* (`getInterceptorForAction`'s
highest-priority-wins pick across an entity's traits — unchanged, ADR-118 scope).

**GATE (CLAUDE.md "Platform changes require discussion first")**: every phase below
touches `packages/` (world-model, engine, stdlib) and is therefore a platform change.
This plan is a plan only — do not begin Phase 1 without the user's explicit go-ahead,
even though the ADR is ACCEPTED. Phase 2's dungeo edits would normally be autonomous
per CLAUDE.md ("story-level changes can proceed autonomously"), but they depend on
Phase 1's platform surface and are sequenced immediately after it in one coordinated
pass per the ADR's own proposed resolution to its Open Question 1 — treat the whole
plan as gated together. **Deleting `interceptor-registry.ts` (Phase 1) needs the same
explicit confirmation** per CLAUDE.md's "never delete files without confirmation," even
though the ADR and the standing no-backward-compatibility policy both authorize it.

**Design note — no deprecated-retention staging.** Mirrors the ADR-207 plan's Design
note exactly: no three-step staged ordering (add-alongside → migrate → delete-later).
Phase 1 deletes `interceptor-registry.ts`'s `globalThis` map and every free function in
the same phase that adds the `WorldModel` methods; Phase 2 removes each dungeo
`hasActionInterceptor` guard in the same edit that rewrites its registration call to
`world.*`. An intermediate broken build (stdlib/engine/dungeo failing to compile
between Phase 1 and Phase 2) is expected and accepted within this one gated,
coordinated sequence — not a regression to fix incrementally.

**Design note — sequencing against ADR-207 Phase 5.** `docs/work/adr-207-capability-registry/plan.md`
Phase 5 ("End-to-End Verification — familyzoo v16-scoring 75/75 and Full AC Matrix") is
currently **CURRENT/PENDING** — it is the only phase left in that plan, and it requires
standing up a published-package overlay harness (pack/overlay `@sharpee/*@2.0.x` locally)
to prove AC-6/AC-8 against a *published* resolution path rather than the in-workspace
build. ADR-208's own Consequences section observes that interceptors have no familyzoo
consumer, so this ADR needs **no published-package phase of its own** — the overlay
harness ADR-207 Phase 5 already has to build covers the shared dual-instance mechanism
(`globalThis` bundle-boundary hack → per-world-instance dispatch) for **both** migrations
at once. Therefore:

- ADR-207 Phase 5 is **deliberately held PENDING** rather than run now, so its one-time
  overlay harness build effort is spent once, after both migrations land, not twice.
- This plan's Phase 3 (verification) proves ADR-208's ACs using in-workspace/bundle-level
  checks only (dungeo has no published-package dependency to prove against — it's an
  in-repo story, same as it was for ADR-207's dungeo-side checks).
- When this plan's Phase 3 completes, **the `docs/context/.current-plan` pointer moves
  back to `docs/work/adr-207-capability-registry/plan.md`** so its Phase 5 becomes the
  active phase again, and that single overlay run becomes the closing verification for
  *both* ADR-207 and ADR-208 together (it will exercise dungeo, familyzoo, and
  friendly-zoo through the published-package path in one pass).
- Do not run ADR-207 Phase 5 in the interim — starting it before ADR-208 lands would
  require rebuilding the overlay harness a second time once interceptor changes land.

## References consulted
- `docs/architecture/adrs/adr-208-interceptor-registry-engine-owned.md` — the governing
  ADR: binding map moves to `WorldModel`; new `IWorldModel` surface
  (`registerActionInterceptor`/`getInterceptorForAction`/`getInterceptorBinding`/
  `getAllActionInterceptors`, idempotent last-wins); `interceptor-registry.ts` deleted
  whole-cloth, types relocated to a new `interceptor-binding.ts`; the 2026-07-02 consumer
  survey (11 stdlib actions, 2 engine loops, 15 dungeo sites); AC-1..AC-10; both Open
  Questions resolved non-blocking (single coordinated pass; `unregisterActionInterceptor`
  NOT carried to the world surface).
- `docs/work/adr-207-capability-registry/plan.md` — the sibling plan this one mirrors:
  exact phase structure, Design-note precedent for no-deprecated-retention, and the
  **Phase 5 CURRENT/PENDING status** this plan's sequencing note depends on. Also
  records execution deviations worth carrying forward here: extra consumers surfacing
  beyond the original survey (`command-executor.ts` threading, `game-engine.ts`
  introspection needing a new `getAll*` method) — the interceptor equivalents of both
  are already named in ADR-208's consumer survey, so no re-discovery risk expected, but
  Phase 2 should still re-grep before closing.
- `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` — precedent ADR:
  the singleton-classification test (5 criteria), the Boundary Statement for the binding
  map, and the interface-contract shape this ADR's `IWorldModel` methods copy structurally.
- `packages/world-model/src/capabilities/capability-binding.ts` — the exact
  type-relocation pattern to mirror: a small file holding only the binding shape
  (`TraitBehaviorBinding`, `BehaviorRegistrationOptions`) and a key-builder function, with
  a header doc stating the ADR-090/ADR-207 ownership split. The new `interceptor-binding.ts`
  copies this shape for `TraitInterceptorBinding`/`InterceptorRegistrationOptions`/
  `InterceptorLookupResult` plus an `interceptorBindingKey(traitType, actionId)` helper.
- `packages/world-model/src/world/WorldModel.ts` — the `IWorldModel` interface region
  (lines 166-247) where ADR-207's capability-binding methods already live, immediately
  above Entity Management. The new interceptor methods land in the same neighborhood;
  must not collide with the **unrelated** ADR-129 `registerCapability`/`getCapability`
  surface (same file, same "capability" word, different concept) or with the ADR-207
  capability-behavior binding methods already present — three distinct "capability"-ish
  surfaces will coexist in this one file after this phase; naming and doc comments must
  keep them visually distinct the way ADR-207's plan already did for its own addition.
- `packages/world-model/src/capabilities/interceptor-registry.ts` — the file being
  deleted: confirms the `globalThis['__sharpee_interceptor_registry__']` map, the
  backward-compat `interceptorRegistry` object wrapper, throw-on-duplicate
  `registerActionInterceptor`, priority-sorted `getInterceptorForAction` (highest
  priority first, `Array.sort` descending), `getInterceptorBinding`, `hasActionInterceptor`,
  `unregisterActionInterceptor`, `clearInterceptorRegistry`, `getAllInterceptorBindings` —
  every one of these free functions must have a `WorldModel`-method or grep-clean-deletion
  fate decided in Phase 1 (`unregisterActionInterceptor`/`clearInterceptorRegistry` are
  dropped per ADR-208 Open Question 2 — no world-surface equivalent, no production caller).
- `packages/world-model/CLAUDE.md` — root barrel discipline: the new
  `interceptor-binding.ts` exports (types) and any new `WorldModel`/`IWorldModel` method
  additions must be re-exported through `src/capabilities/index.ts` **and** the root
  `src/index.ts`, or runtime "X is not a constructor"-class barrel-miss errors follow.
- `packages/stdlib/CLAUDE.md` — migration-audit discipline ("Migration Audits Enumerate
  Emissions, Not Just Mutations"): each of the 11 stdlib action rewrites is a
  lookup-mechanism swap only (`getInterceptorForAction(entity, actionId)` free call →
  `context.world.getInterceptorForAction(entity, actionId)`); the ADR-118 hook contract,
  invocation order, and effect/event emission shape must not change. Also documents the
  capability-effect messageId prefixing gotcha (ADR-090-adjacent, not this ADR's surface,
  but a reminder that "the universal dispatch path forwards effects unchanged" — worth a
  spot-check if any interceptor hook emits a short unqualified messageId).
- `CLAUDE.md` (root) — "Platform changes require discussion first" (packages/ gate,
  honored above); "Never delete files without confirmation" (Phase 1's deletion of
  `interceptor-registry.ts` needs explicit confirmation before starting); "We currently
  don't care about backward compatibility" (licenses the no-retention Design note);
  bundle-first testing discipline (`./repokit bundle` then `dist/cli/sharpee.js
  --test`) governs this plan's verification phase.
- `docs/context/session-20260702-1344-v2_familyzoo_split.md` — most recent session's
  Open Items: **Long Term** explicitly names "Interceptor registry (`globalThis`) shares
  the defect ADR-207 fixes for capability bindings — candidate follow-up ADR" (exactly
  what ADR-208 now formalizes), and **Short Term** confirms ADR-207 Phases 3-5 status at
  the time — Phase 5 ("AC-6 requires validation against published `@sharpee/*@2.0.x`
  packages via a scratchpad overlay/pack harness") is the still-open item this plan's
  sequencing note holds back deliberately.

## Phases

### Phase 1: World-Model — Replace the Global Interceptor Registry with a Per-World Binding Map
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: world-model / ADR-118 interceptor-binding storage — producer side of
  the ADR-208 Decision. Adds the replacement and removes the original in one commit (no
  deprecated-alongside-new staging — see Design note).
- **Entry state**: `packages/world-model/src/capabilities/interceptor-registry.ts` holds
  the `globalThis` map, the `interceptorRegistry` compat wrapper, and throw-on-duplicate
  `registerActionInterceptor`; no `WorldModel` method surface exists for interceptor
  bindings; ADR-207's capability-binding methods already occupy `WorldModel.ts` lines
  166-247 as the pattern to mirror.
- **Deliverable**:
  - A binding-map field owned by the `WorldModel` instance (created with the world, no
    `globalThis`), storing `(traitType, actionId) → TraitInterceptorBinding`.
  - New `IWorldModel` methods (interface + `WorldModel` class implementation,
    `AuthorModel` delegation): `registerActionInterceptor(traitType, actionId,
    interceptor, options?)` (idempotent — last-registration-wins, never throws on
    re-register), `getInterceptorForAction(entity, actionId)` (same priority-resolution
    semantics and `InterceptorLookupResult` return shape as today, now reading this
    world's map), `getInterceptorBinding(traitType, actionId)`,
    `getAllActionInterceptors(): ReadonlyMap<string, TraitInterceptorBinding>`
    (read-only introspection, mirrors `getAllCapabilityBindings`).
  - `interceptor-helpers.ts` (`findTraitWithInterceptor`, `hasInterceptor`,
    `getEntityInterceptors`, …) confirmed untouched — pure trait-declaration helpers
    independent of the map (ADR-208 scope: "Out").
  - **Delete `packages/world-model/src/capabilities/interceptor-registry.ts` entirely**
    in this same phase: the `globalThis` map, the compat wrapper, and every free
    function (`registerActionInterceptor`, `getInterceptorForAction`,
    `getInterceptorBinding`, `hasActionInterceptor`, `unregisterActionInterceptor`,
    `clearInterceptorRegistry`, `getAllInterceptorBindings`). Relocate
    `TraitInterceptorBinding`/`InterceptorRegistrationOptions`/`InterceptorLookupResult`
    into a new `packages/world-model/src/capabilities/interceptor-binding.ts` (the
    `capability-binding.ts` precedent — small file, binding shapes + a
    `interceptorBindingKey(traitType, actionId)` helper, header doc naming ADR-118/ADR-208
    ownership split). `unregisterActionInterceptor`/`clearInterceptorRegistry` are
    **not** carried forward (ADR-208 Open Question 2 — no production caller, no world
    surface equivalent needed).
  - `packages/world-model/src/capabilities/index.ts` and root `src/index.ts` — drop the
    deleted exports, add the relocated `interceptor-binding.ts` types (root-barrel
    discipline, `packages/world-model/CLAUDE.md`).
  - **Confirm the file deletion with the user before executing this phase.**
  - New unit tests (`packages/world-model/tests/unit/capabilities/`, new file — no
    existing test touches these free functions per the 2026-07-02 survey) exercising the
    `WorldModel` methods directly, mapped to acceptance criteria: AC-2 (two `WorldModel`
    instances bind the same `traitType:actionId` key to different interceptors
    independently), AC-3 (sequential registrations across worlds neither throw nor
    leak), AC-4 (re-register on the same world is idempotent, last-wins, never throws),
    AC-9 (bindings are not part of `getState()`/`setState()` — no new save-blob field;
    re-running registration after a simulated restore repopulates the map), AC-10 (an
    entity with no interceptor binding for an action resolves `undefined` from
    `getInterceptorForAction`/`getInterceptorBinding`, never throws), and a partial AC-1
    (grep for `__sharpee_interceptor_registry__`/`interceptor-registry` inside
    `packages/world-model/` returns nothing post-deletion — full-tree + bundle grep is
    Phase 3).
- **Exit state**: `WorldModel` instances can independently register and resolve
  interceptor bindings with no shared state between instances;
  `pnpm --filter '@sharpee/world-model' test` passes including the new tests (baseline
  1306 passed + new tests). **Expected breakage**: `packages/stdlib` (11 actions),
  `packages/engine` (`game-engine.ts`'s 2 introspection loops), and
  `stories/dungeo/src/index.ts` (15 sites) no longer compile — they still import the
  deleted free functions from `@sharpee/world-model`. Resolved by Phase 2, not within
  this phase.
- **Affected files**:
  - `packages/world-model/src/world/WorldModel.ts` (interface + class — new methods,
    new private binding-map field)
  - `packages/world-model/src/capabilities/interceptor-registry.ts` (deleted)
  - `packages/world-model/src/capabilities/interceptor-binding.ts` (new — relocated types)
  - `packages/world-model/src/capabilities/index.ts` (barrel)
  - `packages/world-model/src/index.ts` (root barrel)
  - `packages/world-model/src/world/AuthorModel.ts` (delegate methods)
  - `packages/world-model/tests/unit/capabilities/` (new test file)
- **Status**: CURRENT

### Phase 2: Engine + Stdlib Reader Migration and Dungeo Registration Migration (coordinated single pass)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: interceptor-dispatch consumer side (11 stdlib standard actions,
  engine's introspection summary) and the story-level registration surface (dungeo's 15
  sites). Combined into one phase per ADR-208's Open Question 1 resolution ("the surface
  is ~⅓ the size [of ADR-207]; a single pass is likely right") — unlike ADR-207, which
  split readers (Phase 2) from story registration (Phase 4) across two sessions, this
  phase does both because dungeo is the *only* story consumer and the total edit count
  (11 + 2 + 15 = 28 call sites) fits one session's budget as a single coordinated pass.
  Mandatory immediately after Phase 1 (these packages do not currently compile).
- **Entry state**: Phase 1 complete — `world.registerActionInterceptor` /
  `getInterceptorForAction` / `getInterceptorBinding` / `getAllActionInterceptors` exist
  and are unit-tested in isolation; `packages/stdlib`, `packages/engine`, and
  `stories/dungeo` fail to build because they still import the deleted free functions.
- **Deliverable**: every call site rewritten to use the `world` instance already in
  scope, with the exact same interceptor-hook invocation behavior as before (stdlib
  migration-audit discipline — lookup-mechanism swap only, not a behavior change):
  - 11 stdlib standard actions — `getInterceptorForAction(entity, actionId)` free import
    becomes `context.world.getInterceptorForAction(entity, actionId)` (each action
    already has `context.world` in scope at the call site, per the 2026-07-02 survey):
    `going/going.ts`, `taking/taking.ts`, `throwing/throwing.ts`,
    `switching_on/switching_on.ts`, `putting/putting.ts`, `pushing/pushing.ts`,
    `opening/opening.ts`, `entering/entering.ts`, `dropping/dropping.ts`,
    `closing/closing.ts`, `attacking/attacking.ts`.
  - `packages/engine/src/game-engine.ts` — the 2 `getAllInterceptorBindings()`
    introspection loops (currently at lines ~557 and ~607) become
    `this.world.getAllActionInterceptors()`; drop the free-function import (the last
    capability/interceptor-file free-function import in the engine — per ADR-208
    Consequences, `capabilities/index.ts`'s barrel slims accordingly after this).
  - `stories/dungeo/src/index.ts` — all 15 `hasActionInterceptor`-guarded
    `registerActionInterceptor` sites rewritten to bare
    `world.registerActionInterceptor(TraitType, actionId, Interceptor, options?)` calls —
    **guard and dead import removed in the same edit**, since `hasActionInterceptor` no
    longer exists to import and the world method is idempotent (last-wins, never
    throws), making the guard unnecessary rather than merely unused. Confirm `world` is
    in scope at each site (should already be, via `initializeWorld(world)`).
  - Re-grep both `packages/stdlib/src` and `packages/engine/src` after the rewrite for
    any additional free-function import missed by the original survey (ADR-207's
    execution found extra consumers beyond its own survey — repeat that check here even
    though ADR-208's survey states none exist).
  - New tests: an AC-8 dual-module-copy test (the `vi.resetModules` pattern from
    ADR-207 Phase 2 / `packages/engine/tests/universal-capability-dispatch.test.ts`
    'dual-instance dispatch (ADR-207 AC-8)') proving a dispatch against one
    `@sharpee/world-model` module copy resolves an interceptor registered through a
    second module copy, because both go through the same `world` object instance.
  - Build and run dungeo's own suite after the rewrite, before declaring the phase
    exit-clean: `./repokit build dungeo`, then the interceptor-backed puzzle unit
    transcripts (AC-6): rug-trapdoor, troll-visibility (white-hot take-block),
    troll-interactions (take/talk), trophy-case-scoring, safe rusted-shut, plus a check
    that non-interceptor transcripts still pass (no regression from removing the
    guards).
  - **Confirm the guard-removal sweep with the user before executing this phase's
    dungeo edits**, per the plan's overall gate (dungeo is `stories/`, normally
    autonomous, but this phase is sequenced immediately after a platform change as one
    coordinated pass).
- **Exit state**: `pnpm --filter '@sharpee/stdlib' test` and
  `pnpm --filter '@sharpee/engine' test` pass; no reader in `stdlib` or `engine` calls
  an interceptor free function anymore; `./repokit build dungeo` succeeds; every dungeo
  registration is a bare `world.registerActionInterceptor(...)` call with no
  `hasActionInterceptor` guard or deleted free-function import remaining anywhere in
  `stories/dungeo/`; dungeo's AC-6 unit transcripts pass deterministic-green.
- **Affected files**: the 11 stdlib action files listed above,
  `packages/engine/src/game-engine.ts`, `stories/dungeo/src/index.ts`,
  `packages/engine/tests/universal-capability-dispatch.test.ts` or a new sibling test
  file for the interceptor AC-8 case.
- **Status**: PENDING

### Phase 3: End-to-End Verification — Full AC Matrix and Hand-Back to ADR-207 Phase 5
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: closing the loop against ADR-208's acceptance bar using in-workspace
  and bundle-level checks only — no published-package harness in this plan (see Design
  note "sequencing against ADR-207 Phase 5" above; that harness is deliberately deferred
  to the sibling plan's still-open Phase 5, which will cover both migrations in one run).
- **Entry state**: Phase 2 complete; `pnpm --filter '@sharpee/world-model' test`,
  `'@sharpee/stdlib' test`, `'@sharpee/engine' test` all pass; dungeo's unit transcripts
  pass in the workspace build.
- **Deliverable**:
  - `./repokit bundle` (or `./repokit build dungeo`, whichever produces
    `dist/cli/sharpee.js`), then re-confirm AC-1 against the **built bundle**: grep for
    `__sharpee_interceptor_registry__` and `interceptor-registry` across `packages/`,
    `stories/`, and `dist/cli/sharpee.js` returns nothing.
  - `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript` —
    full unit-transcript suite green, with specific attention to the AC-6 named puzzles:
    rug-trapdoor, troll-visibility (white-hot), troll-interactions, trophy-case-scoring,
    safe rusted-shut, and confirm safe behavior (no interceptor-path regression) across
    the rest of the suite.
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
    — one full run (one-good-run rule; thief/combat/carousel RNG flakes are not
    regressions) as the AC-6 walkthrough-level confirmation and, incidentally, an AC-3
    isolation re-confirmation (multiple sequential loads in one process, chained state,
    no leaked/duplicated bindings).
  - AC-7 re-confirmation at the integration level: exercise the engine's introspection
    summary path (however it's currently surfaced — CLI debug command or
    `game-engine.ts` test) and confirm it enumerates the *running world's* interceptor
    bindings via `getAllActionInterceptors()`, not a stale/global set.
  - AC-9 re-confirmation: save and restore a dungeo game mid-session (transcript-level
    `SAVE`/`RESTORE` or an existing save/restore test), confirm re-running
    `initializeWorld` after restore repopulates interceptor bindings correctly and no
    new field appears in the save blob.
  - Update the ADR-208 header note ("Implementation planned in
    `docs/work/adr-208-interceptor-registry/`") to point at the completed
    implementation summary.
  - **Move `docs/context/.current-plan` back to
    `docs/work/adr-207-capability-registry/plan.md`** so ADR-207's Phase 5 becomes the
    active phase again (see Design note) — this is this phase's final action, not a
    side effect to forget.
- **Exit state**: every ADR-208 acceptance criterion (AC-1 through AC-10) has a
  corresponding passing test or transcript result, enumerated in the phase's work
  summary with a pointer to each; `docs/context/.current-plan` points back at
  `docs/work/adr-207-capability-registry/plan.md`; ADR-207 Phase 5 is unblocked to run
  next (covering both migrations' published-package proof in one overlay harness).
- **Affected files**: none in `packages/`/`stories/` expected beyond the ADR-208 header
  note update; no new test files expected unless AC-7/AC-9 re-confirmation needs a
  dedicated test rather than reusing an existing transcript/CLI path.
- **Status**: PENDING

## Summary of AC coverage by phase

| AC | Description | Primary phase |
|----|--------------|----------------|
| AC-1 | No interceptor state on `globalThis` (packages/stories/built bundle) | Phase 1 (deletion + package-level grep), confirmed Phase 3 (bundle-level grep) |
| AC-2 | Concurrency — two `WorldModel` instances bind the same key independently | Phase 1 (unit) |
| AC-3 | Isolation — sequential loads neither throw nor leak bindings | Phase 1 (unit), confirmed Phase 3 (walkthrough chain) |
| AC-4 | Idempotent registration, no throw, last-wins | Phase 1 (unit) |
| AC-5 | Every dungeo registration is a bare `world.*` call, no guard | Phase 2 |
| AC-6 | Interceptor-backed dungeo puzzles pass (rug-trapdoor, troll-visibility, troll-interactions, trophy-case-scoring, safe) | Phase 2 (unit transcripts), confirmed Phase 3 (bundle + walkthrough chain) |
| AC-7 | Engine introspection summary enumerates the world's bindings via `getAllActionInterceptors()` | Phase 1 (method added), Phase 2 (engine loops wired), confirmed Phase 3 |
| AC-8 | Dual-instance dispatch via shared `world` instance (`vi.resetModules` test) | Phase 2 (unit) |
| AC-9 | Bindings not serialized; re-init after restore repopulates, no new save field | Phase 1 (unit), confirmed Phase 3 (save/restore integration) |
| AC-10 | Missing binding resolves to normal rejection, never throws | Phase 1 (unit) |
