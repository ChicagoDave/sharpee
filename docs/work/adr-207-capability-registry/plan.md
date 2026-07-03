# Session Plan: ADR-207 — Capability Registry is Engine-Owned, not Process-Global

**Created**: 2026-07-02
**Overall scope**: Move the ADR-090 capability-behavior *binding map* off a `globalThis`
process singleton onto per-`WorldModel` ownership, migrate every reader/writer call site
(engine, stdlib, bootstrap, transcript-tester, devkit, and every in-repo story) to the new
`world.*` surface, and prove the fix end-to-end via `familyzoo` `v16-scoring` reaching 75/75.
**Bounded contexts touched**: world-model (capability dispatch storage — ADR-090 refinement),
engine (turn cycle / generic action dispatch), stdlib (standard actions), bootstrap/engine
loader wiring, transcript-tester + devkit (test/build tooling), and the story layer (dungeo,
familyzoo v1.5.0 + v2.0.0, friendly-zoo).
**Key domain language**: *behavior definition* (stateless `{validate,execute,report,blocked}`
strategy — stays shareable), *binding* (a `(traitType, capability) → behavior` association
scoped to one running game), *binding map* / "the registry" (the per-game collection of
bindings — moves to `WorldModel`), *capability dispatch* (ADR-090's trait→behavior routing).

**GATE (CLAUDE.md "Platform changes require discussion first")**: every phase below touches
`packages/` (world-model, engine, stdlib) and is therefore a platform change. This plan is a
plan only — do not begin Phase 1 without the user's explicit go-ahead, even though the ADR
is ACCEPTED. Story-level phases (Phase 4's story-tree edits) would normally be autonomous
per CLAUDE.md, but they depend on the platform work in Phases 1–2 and are sequenced after it,
so treat the whole plan as gated together.

**Design note — no deprecated-retention staging.** ADR-207's Open Questions §1 proposes a
three-step staged ordering: (a) add `world.*` alongside the deprecated globals, (b) migrate
readers/registrations, (c) delete the globals + guards in a separate final commit. That
staging exists to avoid a specific hazard (deleting an author guard while the old global is
still live). Per explicit user direction on 2026-07-02 ("there is no need to retain
deprecated methods") and CLAUDE.md's standing policy ("we currently don't care about backward
compatibility"), this plan **does not retain the deprecated free-function API during the
migration**. Instead, each phase deletes what it replaces in the same commit:
- Phase 1 deletes the `globalThis` map and every free function in `capability-registry.ts` in
  the same phase that adds the `WorldModel` methods — world-model no longer exports the old
  API after Phase 1.
- Phase 2 and Phase 4 are then **mandatory, not optional**, immediately after: engine, stdlib,
  and every story that imports the deleted free functions will fail to build until migrated.
  This is intentional — the whole plan is gated behind one user go-ahead and executed as one
  coordinated sequence, not merged incrementally, so an intermediate broken build between
  Phase 1 and Phase 4 is acceptable and expected. Each phase's exit state says explicitly
  which downstream packages are still broken and which phase fixes them.
- The original ADR ordering's *real* hazard — an author guard checking a global that no
  longer exists — is avoided by removing the guard **at the same time** the registration call
  is rewritten (Phase 4), rather than leaving it as inert dead code for a later phase to clean
  up.

## References consulted
- `docs/architecture/adrs/adr-207-capability-registry-engine-owned.md` — the governing ADR:
  binding map moves to `WorldModel` ownership; behavior definitions stay shared/stateless;
  new `IWorldModel` surface (`registerCapabilityBehavior`/`getBehaviorForCapability`/
  `getBehaviorBinding`, idempotent/last-wins); `globalThis` map + `clearCapabilityRegistry`
  removed; AC-1..AC-10 define the acceptance surface, AC-6 is the end-to-end proof gate
  (familyzoo `v16-scoring` 75/75 against published `@sharpee/*@2.0.x`). Open Questions §1's
  staged-migration suggestion is explicitly overridden by this plan (see Design note above) —
  the ADR itself flags that ordering as "non-blocking."
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` — the capability-dispatch
  pattern being refined: behavior contract shape (`validate/execute/report/blocked`),
  resolution/priority semantics, and the `findTraitWithCapability` pure-helper contract are
  explicitly **out of scope** for ADR-207 and must not change.
- `CLAUDE.md` — "Platform changes require discussion first" (packages/ gate, honored above);
  "We currently don't care about backward compatibility" (directly licenses the no-retention
  approach in the Design note above); logic-location table (world-model owns traits/
  behaviors/entity state — the binding map belongs there, not in engine); "Never delete files
  without confirmation" (Phase 1's deletion of `capability-registry.ts`'s free-function
  exports and Phase 4's guard removals both need explicit user confirmation before starting,
  even though the ADR + user direction authorize the removal).
- `packages/world-model/CLAUDE.md` — root barrel discipline: any new export surface added to
  `WorldModel`/`IWorldModel`, or any binding-shape type relocated out of the deleted
  `capability-registry.ts`, must be re-exported through `src/capabilities/index.ts` and
  `src/index.ts` per the barrel rule.
- `packages/stdlib/CLAUDE.md` — capability-dispatch decision tree and migration-audit
  discipline ("Migration Audits Enumerate Emissions, Not Just Mutations"): Phase 2's rewrite
  of `giving.ts`/`throwing.ts`/`raising`/`lowering` call sites must preserve the existing
  event/effect emission behavior exactly — only the lookup mechanism (free function →
  `world.*` method) changes.
- `packages/world-model/src/capabilities/capability-registry.ts` — current implementation:
  `globalThis['__sharpee_capability_behaviors__']` Map, `registerCapabilityBehavior` throws
  on duplicate key (line 118-122), `clearCapabilityRegistry` exists but is never called by
  any loader. This entire file is deleted in Phase 1 (see Phase 1 Deliverable for where its
  reusable type shapes go).
- `packages/engine/src/capability-dispatch-helper.ts` — the generic dispatch reader for ALL
  stdlib actions; calls `findTraitWithCapability`, `getBehaviorBinding`, `getCapabilityConfig`
  as free functions imported from `@sharpee/world-model`.
- `packages/stdlib/src/actions/capability-dispatch.ts` — `createCapabilityDispatchAction`
  factory (backs `raising`/`lowering`); calls `findTraitWithCapability` and
  `getBehaviorForCapability` as free functions.
- `packages/stdlib/src/actions/standard/giving/giving.ts` (lines 205-207) and
  `packages/stdlib/src/actions/standard/throwing/throwing.ts` (lines 319-321) — inline
  capability-dispatch consumers, same free-function pattern.
- `packages/world-model/src/world/WorldModel.ts` — `IWorldModel` interface (line 159) and
  `WorldModel` class (line 322) already define an unrelated `registerCapability`/
  `getCapability`/`hasCapability` surface (ADR-129 scoring/data capabilities — a different
  "capability" concept). The new ADR-207 methods must not collide with these names; the
  ADR's proposed names (`registerCapabilityBehavior`, `getBehaviorForCapability`,
  `getBehaviorBinding`) already avoid the collision — Phase 1 must preserve that distinction
  in naming and in doc comments (the word "capability" is overloaded in this codebase).

## Phases

### Phase 1: World-Model — Replace the Global Capability Registry with a Per-World Binding Map
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: world-model / ADR-090 binding storage — producer side of the ADR-207
  Decision. Adds the replacement and removes the original in one commit (no deprecated-alongside-new staging — see Design note).
- **Entry state**: `packages/world-model/src/capabilities/capability-registry.ts` holds the
  `globalThis` map and throw-on-duplicate `registerCapabilityBehavior`; no `WorldModel`
  method surface exists for capability bindings.
- **Deliverable**:
  - A binding-map field owned by the `WorldModel` instance (created with the world, no
    `globalThis`), storing `(traitType, capability) → TraitBehaviorBinding`.
  - New `IWorldModel` methods (interface at `packages/world-model/src/world/WorldModel.ts:159`,
    implementation on the `WorldModel` class at `:322`): `registerCapabilityBehavior(traitType,
    capability, behavior, options?)` (idempotent — last-registration-wins, never throws on
    re-register), `getBehaviorForCapability(trait, capability)`, `getBehaviorBinding(traitType,
    capability)`.
  - `findTraitWithCapability` (in `capability-helpers.ts`) is untouched — confirmed still a
    pure helper independent of the map (ADR-207 scope: "Out").
  - **Delete `packages/world-model/src/capabilities/capability-registry.ts` entirely** in this
    same phase: the `globalThis` map, `getCapabilityRegistry`, `behaviorRegistry`, and every
    free function (`registerCapabilityBehavior`, `getBehaviorForCapability`,
    `getBehaviorBinding`, `hasCapabilityBehavior`, `unregisterCapabilityBehavior`,
    `clearCapabilityRegistry`, `getAllCapabilityBindings`). Relocate the still-needed
    `TraitBehaviorBinding`/`BehaviorRegistrationOptions` type shapes into
    `packages/world-model/src/capabilities/types.ts` (or a new `capability-binding.ts` if
    `types.ts` is a poor fit) so `WorldModel.ts` and the barrel can import them without
    resurrecting the deleted file's "shared across module boundaries" framing (the ADR's
    Boundary Statement calls that promise out as the root defect).
  - `packages/world-model/src/capabilities/index.ts` — drop the deleted exports; keep the
    relocated types.
  - **Confirm the file deletion with the user before executing this phase** (CLAUDE.md: never
    delete files without confirmation) — even though the ADR and the user's no-retention
    direction both authorize it.
  - Unit tests (new, in `packages/world-model/tests/unit/capabilities/`) exercising the new
    `WorldModel` methods directly, mapped to ADR-207 acceptance criteria: AC-1 (no
    `globalThis` reference anywhere in the package after deletion — grep check), AC-2 (two
    `WorldModel` instances bind the same `traitType:capability` key to different behaviors
    independently), AC-3 (register → read → register-again on the same world neither throws
    nor leaks), AC-4 (re-register is idempotent, last-wins), AC-9 (bindings are not part of
    `getState()`/`setState()` — no new save-blob field; re-running registration after a
    simulated "restore" repopulates the map), AC-10 (a trait with a statically-declared
    capability but no registered behavior on this world's map returns `undefined` from
    `getBehaviorForCapability`/`getBehaviorBinding`, never throws).
- **Exit state**: `WorldModel` instances can independently register and resolve capability
  bindings with no shared state between instances; `pnpm --filter '@sharpee/world-model' test`
  passes including the new tests. **Expected breakage**: `packages/engine`, `packages/stdlib`,
  `stories/*`, and `tutorials/familyzoo/*` no longer compile — they still import the deleted
  free functions from `@sharpee/world-model`. This is resolved by Phase 2 (engine/stdlib) and
  Phase 4 (stories); it is not resolved within this phase.
- **Affected files**:
  - `packages/world-model/src/world/WorldModel.ts` (interface + class — new methods, new
    private binding-map field)
  - `packages/world-model/src/capabilities/capability-registry.ts` (deleted)
  - `packages/world-model/src/capabilities/types.ts` (relocated type shapes)
  - `packages/world-model/src/capabilities/index.ts` (barrel — remove deleted exports, add
    relocated ones)
  - `packages/world-model/tests/unit/capabilities/` (new test file for the `WorldModel`
    binding-map methods)
- **Status**: DONE — see `docs/context/session-20260702-0052-v2_familyzoo_split.md`. Two
  in-package consumers beyond this phase's listed Affected files were also migrated:
  `packages/world-model/src/world/VisibilityBehavior.ts` (4 call sites) and
  `packages/world-model/src/traits/concealment/concealedVisibilityBehavior.ts`
  (`registerConcealedVisibilityBehavior` now takes a `world: WorldModel` param). Downstream
  test fix required in `packages/stdlib/tests/unit/actions/hiding-golden.test.ts`.
  `pnpm --filter '@sharpee/world-model' build` clean; `pnpm --filter '@sharpee/world-model'
  test` — 66/66 files, 1299 passed, 10 skipped, 0 failed. Expected breakage confirmed:
  `packages/engine`, `packages/stdlib` (non-test source), and all stories/tutorials do not
  build until Phase 2/4.

### Phase 2: Engine + Stdlib Reader Migration
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: capability dispatch consumer side — engine's generic dispatch helper and
  every stdlib call site that resolves a behavior. Mandatory immediately after Phase 1 (these
  packages do not currently compile).
- **Entry state**: Phase 1 complete — `world.registerCapabilityBehavior` /
  `getBehaviorForCapability` / `getBehaviorBinding` exist and are unit-tested in isolation;
  `packages/engine` and `packages/stdlib` fail to build because they still import the deleted
  free functions.
- **Deliverable**: every behavior-resolution call site rewritten to call the method on the
  `world` instance already in scope (never re-importing a free function), with the exact same
  emission/effect behavior as before (stdlib migration-audit discipline — lookup-mechanism
  swap only, not a behavior change):
  - `packages/engine/src/capability-dispatch-helper.ts` — `checkCapabilityDispatchMulti`'s
    calls to `findTraitWithCapability` (stays a free-function import — unchanged) and
    `getBehaviorBinding` (becomes `world.getBehaviorBinding(...)` — thread a `world: WorldModel`
    parameter through the helper's signature, since today it's a free function with no world
    argument; check current callers in `packages/stdlib` and `packages/engine` for how `world`
    is already available at each call site).
  - `packages/stdlib/src/actions/capability-dispatch.ts` — `createCapabilityDispatchAction`'s
    `validate()` calls to `findTraitWithCapability` (unchanged) and `getBehaviorForCapability`
    (becomes `context.world.getBehaviorForCapability(trait, config.actionId)`).
  - `packages/stdlib/src/actions/standard/giving/giving.ts:205-207` — inline
    `getBehaviorForCapability(capTrait, IFActions.GIVING)` becomes
    `context.world.getBehaviorForCapability(capTrait, IFActions.GIVING)`.
  - `packages/stdlib/src/actions/standard/throwing/throwing.ts:319-321` — same pattern for
    `IFActions.THROWING`.
  - `packages/stdlib/src/actions/standard/raising/raising.ts` and
    `packages/stdlib/src/actions/standard/lowering/lowering.ts` — confirmed consumers of
    `createCapabilityDispatchAction` (no direct free-function calls of their own); re-grep
    after `capability-dispatch.ts` is fixed to confirm no additional inline lookups exist.
  - Confirm ADR-207 Open Question 3: the `raising`/`lowering` stdlib-bundled behaviors carry
    no per-game state (pure functions of `(entity, world, actorId, sharedData)` with no
    closed-over mutable state) so sharing them across worlds is safe. Note the confirmation in
    the session summary; no code change expected if the audit confirms.
  - Existing tests updated: `packages/engine/tests/universal-capability-dispatch.test.ts` and
    `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` — both
    currently exercise the (now-deleted) free functions, including `clearCapabilityRegistry`
    for isolation, and must be rewritten to register through a `WorldModel` instance instead.
    Add the AC-8 dual-instance test here: a dispatch running against a bundled
    `@sharpee/world-model` module copy resolves a behavior registered by story code against a
    *different* module copy of the same package, because both go through the same `world`
    object instance — this is the scenario the `globalThis` hack originally existed to paper
    over (ADR-207 Context, "bundle's dual-instance problem").
- **Exit state**: `pnpm --filter '@sharpee/engine' test` and `pnpm --filter '@sharpee/stdlib'
  test` pass; no reader in `engine` or `stdlib` calls a capability free function anymore.
  **Expected remaining breakage**: `stories/*` and `tutorials/familyzoo/*` still fail to build
  (Phase 4 fixes this); `packages/transcript-tester`/`packages/devkit` are unaffected by this
  phase's changes (they don't import capability functions directly).
- **Affected files**: `packages/engine/src/capability-dispatch-helper.ts`,
  `packages/stdlib/src/actions/capability-dispatch.ts`,
  `packages/stdlib/src/actions/standard/giving/giving.ts`,
  `packages/stdlib/src/actions/standard/throwing/throwing.ts`,
  `packages/stdlib/src/actions/standard/raising/raising.ts`,
  `packages/stdlib/src/actions/standard/lowering/lowering.ts`,
  `packages/engine/tests/universal-capability-dispatch.test.ts`,
  `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts`.
- **Status**: DONE — see `docs/context/session-20260702-1344-v2_familyzoo_split.md`. Beyond the
  listed Affected files, two additional consumers required migration:
  `packages/engine/src/command-executor.ts` (the two `checkCapabilityDispatchMulti` call sites
  now pass `world`) and `packages/engine/src/game-engine.ts` (introspection loops used the
  deleted `getAllCapabilityBindings()` free function — a new read-only
  `IWorldModel.getAllCapabilityBindings()` enumeration method was added to world-model to
  serve it, with `WorldModel` impl + `AuthorModel` delegate). One Phase 1 test leftover fixed:
  `hiding-golden.test.ts` end-to-end tests called `ensureVisibilityBehavior()` without the
  world arg. AC-8 dual-instance test added (vi.resetModules second module copy of
  `@sharpee/world-model`; dispatch resolves through the shared world instance). Open Question 3
  confirmed trivially: stdlib bundles no `CapabilityBehavior` implementations at all —
  raising/lowering behaviors are story-owned and registered per world. Suites: world-model
  1299 passed, stdlib 1291 passed, engine 459 passed. Expected remaining breakage: stories/
  tutorials until Phase 4.

### Phase 3: Loader, Transcript-Tester, and Devkit Lifecycle Cleanup
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: game-loading lifecycle — confirming the per-world map removes the need
  for any reset, and neutralizing the two eager "load and discard" pre-loads the ADR
  identifies as the direct cause of the familyzoo regression (AC-7). Independent of the
  deletion sequencing — these files don't import any capability free function directly, so
  this phase can run any time after Phase 1.
- **Entry state**: Phase 1 (at minimum) complete — the per-world map means a fresh
  `WorldModel` per `loadStory`/`assembleGame` call already gets an empty binding map "for
  free" (ADR-207 Decision item 4).
- **Deliverable**:
  - `bootstrap`/`engine` loader wiring audited: confirm (per ADR Context, "Nothing ever calls
    `clearCapabilityRegistry`") there is no existing per-load reset code to remove; if any
    reset/clear call is found during the audit (it would now be a compile error post-Phase 1
    if it referenced the deleted function), fix it as part of this phase.
  - `packages/transcript-tester/src/cli.ts` — the eager default-entry `loadStory` at line 307
    loads a game with no lasting use when `!options.chain`: it is immediately discarded and
    replaced by the per-transcript `loadStory` call inside the loop (line 338). Restructure so
    the pre-loop load is skipped when the loop is about to reload per-transcript anyway;
    preserve current behavior for `options.chain` mode (where the pre-loop `game` *is* the one
    used for the whole chain) and `options.play` mode (line 268, separate branch, unaffected).
  - `packages/devkit/src/standalone/build.ts` — `runTranscriptTests` (~line 237-247): when
    `walkthroughs.length === 0`, `chainEntry` is `undefined` and the initial `loadStory(
    projectDir, chainEntry)` loads the *default* entry only to be superseded by each unit
    test's own `loadStory(projectDir, transcript.header.entry)` call later in the function.
    Skip or defer this load when there are no walkthroughs to chain.
- **Exit state**: `transcript-tester` and `devkit` no longer perform a load-and-discard call
  purely to populate now-irrelevant global state; `node dist/cli/sharpee.js --test --chain
  stories/dungeo/walkthroughs/wt-*.transcript` still passes with identical results to before
  this phase (dungeo doesn't depend on Phase 4's story migration for this check — it's a
  behavior-preserving cleanup of the tooling, verified independently).
- **Affected files**: `packages/transcript-tester/src/cli.ts`,
  `packages/devkit/src/standalone/build.ts`, and (only if the audit finds one) a
  `bootstrap`/`engine` loader file.
- **Status**: DONE — see `docs/context/session-20260702-1344-v2_familyzoo_split.md` (Phase 3
  section). Loader audit clean: no reset/clear code exists anywhere in bootstrap/engine/
  transcript-tester/devkit (confirms the ADR's "nothing ever calls clearCapabilityRegistry").
  Both listed load-and-discard sites fixed, plus a **third site the plan missed**:
  `scripts/bundle-entry.js` (the `dist/cli/sharpee.js` CLI entry — the primary testing path)
  had the same eager pre-loop `loadStoryAndCreateGame` in non-chain mode; now loads up front
  only when `--chain`. Also added the `getAllCapabilityBindings()` unit tests (world-model
  30/30 in capability-dispatch.test.ts) closing the Phase 2 coverage gap flagged by mutation
  verification. **Exit-check deviation**: the dungeo walkthrough-chain check cannot run until
  Phase 4 — dungeo's compiled story calls the deleted `hasCapabilityBehavior` at
  `initializeWorld` (verified: `TypeError ... is not a function`); the plan's claim that this
  check is independent of Phase 4 was wrong. Behavior-preservation verified instead with
  `stories/channel-service-test` (`wt-stat.transcript`, 6/6) through BOTH CLIs
  (`dist/cli/sharpee.js` and `packages/transcript-tester/dist/cli.js`) in BOTH modes (chain +
  per-transcript). Re-run the dungeo chain at Phase 4 exit as planned. Pre-existing devkit
  test failures noted (init.test version expectation `^1.x` vs workspace `2.0.1`;
  browser-build needs platform-browser dist-esm) — unrelated to this phase.

### Phase 4: Story Registration Migration — dungeo, familyzoo (v1.5.0 + v2.0.0), friendly-zoo
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: every in-repo story's capability-behavior registration surface. Mandatory
  immediately after Phase 1-2 (these packages do not currently compile). Mechanical but broad
  — ~13 files, ~33 `hasCapabilityBehavior` guard sites, plus two custom capability actions
  that thread a behavior through `context.sharedData` from a (now-deleted) global lookup.
- **Entry state**: Phases 1-3 complete — `world.registerCapabilityBehavior` exists and is
  proven correct in isolation and through the engine/stdlib dispatch path. Every story still
  imports the deleted `registerCapabilityBehavior`/`hasCapabilityBehavior`/
  `getBehaviorForCapability` free functions and fails to build.
- **Deliverable**: every story registration call rewritten from the guarded free-function form
  directly to a bare `world.*` call — **guard and dead import removed in the same edit**,
  since `hasCapabilityBehavior` no longer exists to import and `world.registerCapabilityBehavior`
  is idempotent (last-wins, never throws), making the guard unnecessary rather than merely
  unused:
  ```ts
  // before
  if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering')) {
    registerCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering', BasketLoweringBehavior);
  }
  // after
  world.registerCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering', BasketLoweringBehavior);
  ```
  - `stories/dungeo/src/index.ts` — 7 guard sites (basket elevator lowering/raising, troll axe
    `if.scope.visible`, troll giving/throwing, egg opening); confirm `world` is in scope at
    each call site (it should already be — `initializeWorld(world)` receives it).
  - `stories/friendly-zoo/src/index.ts` — 2 guard sites, plus its custom `pettingAction`
    (lines ~137-166) whose `validate()` calls the free-function `getBehaviorForCapability(
    trait, PETTING_ACTION_ID)` directly and threads the result via `context.sharedData
    .capBehavior` — rewrite to `context.world.getBehaviorForCapability(...)`.
  - `tutorials/familyzoo/v1.5.0/src/{ch15-capability-dispatch,ch20-npcs,ch22-timed-events,
    ch23-scoring,ch24-27-presentation/index,ch28-multi-file/index}.ts` — 2 guard sites each
    (12 total); `ch15-capability-dispatch.ts` and `ch23-scoring.ts` additionally define custom
    `pettingAction`s with the same `context.sharedData.capBehavior` free-function pattern as
    friendly-zoo — same rewrite.
  - `tutorials/familyzoo/v2.0.0/src/{ch15-capability-dispatch,ch20-npcs,ch22-timed-events,
    ch23-scoring,ch24-27-presentation/index,ch28-multi-file/index}.ts` — identical set,
    mirrored in the v2.0.0 edition tree (12 total).
  - After each file's rewrite, build and run that story/tutorial's own transcript suite to
    confirm no regression before moving to the next file (dungeo walkthroughs via
    `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`;
    familyzoo/friendly-zoo via their own `sharpee build --test` or transcript-tester
    invocation, per each project's existing test convention).
  - **Confirm the guard-removal sweep with the user before executing this phase**, since it
    touches ~13 files across 4 story trees — even though CLAUDE.md's "story-level changes can
    proceed autonomously" applies to `stories/`, the `tutorials/` tree edits and the
    coordinated scope warrant a heads-up per the plan's overall gate.
- **Exit state**: every story/tutorial registers capability behaviors via bare `world.*`
  calls; no `hasCapabilityBehavior` guard or deleted free-function import remains anywhere in
  `stories/` or `tutorials/familyzoo/`. `pnpm build` / `./repokit build dungeo` succeeds;
  dungeo's walkthrough chain passes (troll give/throw, basket elevator, egg-opening capability
  behaviors all still function). Familyzoo `v16-scoring` should now score **75/75 in the
  in-workspace build** (no guard remains to reintroduce the load-order bug) — this is a good
  interim sanity check, but the ADR's formal AC-6 requires the *published-package* resolution
  path, which is Phase 5's job.
- **Affected files**: `stories/dungeo/src/index.ts`, `stories/friendly-zoo/src/index.ts`, all
  12 listed files under `tutorials/familyzoo/v1.5.0/src/`, all 12 listed files under
  `tutorials/familyzoo/v2.0.0/src/` (24 total across both editions, counting each chapter file
  once).
- **Status**: DONE — see `docs/context/session-20260702-1344-v2_familyzoo_split.md` (Phase 4
  section). User confirmation obtained ("phase 4"). **Deviation: `tutorials/familyzoo/v1.5.0`
  was NOT migrated** — the plan's file list was wrong to include it: that edition is frozen
  and pins published `@sharpee/*@^1.5.0` (see `docs/work/familyzoo-v2-migration/plan.md`,
  "v1.5.0 freeze"), where the old free-function API remains correct; rewriting it to
  `world.registerCapabilityBehavior` would break it against its own dependency line. Migrated:
  dungeo (6 guard sites; interceptor registrations untouched — different registry, out of
  ADR-207 scope), friendly-zoo (guard + pettingAction), all 6 familyzoo **v2.0.0** chapter
  files (guards + pettingActions + teaching-comment prose updated to the per-world API).
  Verification: `./repokit build dungeo` clean; dungeo walkthrough chain **871/871**
  (also closes Phase 3's deferred exit-check); dungeo unit suite matches a freshly-built
  **pre-ADR-207 baseline** (worktree at aa99440d): 100 baseline failures vs 101 current,
  delta fully accounted for by documented carousel/combat RNG — basket-elevator's 7 failures
  (blank `lower basket` output) are **identical in the baseline** (pre-existing platform
  finding, see below). friendly-zoo transcripts 36/36 (per-transcript mode; its walkthroughs
  are independent scenarios, not a chain) + manual `pet goats` awards PET_ANIMAL (5 pts).
  familyzoo v2.0.0: `tsc --noEmit` clean against workspace-built packages via a paths-mapped
  scratchpad tsconfig; runtime AC-6 validation is Phase 5 (per-plan — published-package path).
  **Pre-existing platform findings surfaced (present in the pre-207 baseline, NOT
  regressions, not fixed per the platform-change gate)**: (1) engine universal dispatch
  (`capability-dispatch-helper.ts` `effectsToEvents`) does not prefix short capability-effect
  messageIds with the actionId the way stdlib's `createCapabilityDispatchAction` does →
  story behaviors written for the prefix convention (dungeo basket lowering/raising:
  `'lowered'` → expected `if.action.lowering.lowered`) render blank when the universal path
  intercepts; (2) Shaft Room contents list renders "a [object Object]".

### Phase 5: End-to-End Verification — familyzoo v16-scoring 75/75 and Full AC Matrix
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: closing the loop against the ADR's actual acceptance bar. AC-6 explicitly
  requires validation against **published** `@sharpee/*@2.0.x` packages, not the in-repo
  workspace build — this phase is a verification/publish-harness phase, not further code
  change (barring fixes surfaced by verification failures, which should be reported back
  rather than silently patched, per CLAUDE.md's no-auto-retry rule).
- **Entry state**: Phase 4 complete and all package-level unit/walkthrough suites green in the
  workspace build; familyzoo `v16-scoring` already scores 75/75 in-workspace. The fix has
  never been exercised against a *published* package resolution path — only workspace
  (`workspace:*`) dependencies, which sidestep the dual-instance scenario AC-8 targets and the
  exact resolution path AC-6 specifies.
- **Deliverable**:
  - Stand up a local-resolution or scratchpad-overlay harness mirroring the approach already
    used to investigate this bug this session (per the ADR's Session note: "throwaway
    scratchpad copy"): build the fixed platform packages locally, pack/overlay them into a
    scratchpad copy of `tutorials/familyzoo/v2.0.0` in place of its published
    `@sharpee/*@2.0.x` dependency resolution (`npm pack` + local install, or a `pnpm` local
    registry/link strategy — pick whichever the existing scratchpad approach used and
    document the choice).
  - Run `sharpee build --test` (author-tool path, not `./repokit`) against that overlay for
    the `v16-scoring` transcript with `entry: ch23`; confirm **75/75**, specifically that
    `pet goats` awards `PET_ANIMAL` (AC-6).
  - Re-run the full transcript suite for both familyzoo editions and friendly-zoo to confirm
    no regression from the overlay/publish path itself (separate from the platform fix).
  - Confirm the remaining ACs not fully covered by earlier phases' unit tests, at the
    integration level: AC-1 (grep-level, re-confirmed here against the built bundle
    `dist/cli/sharpee.js` — no `globalThis` capability reference anywhere), AC-2/AC-3
    (already unit-tested in Phase 1 — re-confirm via a multi-load transcript-tester run:
    `node dist/cli/sharpee.js --test --chain tutorials/familyzoo/v2.0.0/...` loading multiple
    entries in one process), AC-8 (dual-instance — the overlay setup in this phase, where
    story code resolves `@sharpee/world-model` from `node_modules` while dispatch runs from
    the bundle, **is** the real-world AC-8 scenario; confirm the Phase 2 unit test's
    assumption holds end-to-end here), AC-9 (save/restore a familyzoo game mid-session,
    confirm re-init repopulates bindings correctly, confirm no new field appears in the save
    blob), AC-10 (verify the "can't do that" rejection path for an entity with a
    declared-but-unbound capability, via a transcript or targeted test).
  - Publish note (per the task brief): if a true publish is warranted for durable CI coverage
    rather than a one-off scratchpad proof, flag that as a follow-up decision for the user —
    this phase's job is to prove the fix, not necessarily to cut a release.
- **Exit state**: `v16-scoring` scores 75/75 against a published-equivalent package
  resolution; every ADR-207 acceptance criterion (AC-1 through AC-10) has a corresponding
  passing test or transcript result, enumerated in the phase's work summary with a pointer to
  each test; the ADR-207 header note ("Implementation planned in
  `docs/work/adr-207-capability-registry/`") can be updated to point at the completed
  implementation summary.
- **Affected files**: none in `packages/`/`stories/` expected (verification-only); scratchpad
  harness files under the session scratchpad or a documented `docs/work/adr-207-capability-
  registry/` verification note; possible new/updated test files if AC-9/AC-10 need a
  dedicated integration test rather than reusing an existing transcript.
- **Status**: DONE (2026-07-02 session b65caa; run after ADR-208 Phases 1-3 per the
  sequencing note, so this one overlay run closes BOTH migrations' published-path proof).
  - **Harness (documented choice)**: devkit's `generateConsumer` (mode 'local') — the
    same mechanism as the DEVKIT_INTEGRATION real-path gate. `npm pack` tarballs of the
    full `@sharpee` closure from the tsf staging (`~/.tsf-publish/sharpee`, regenerated
    via `npx tsf build --npm`), grafted as `file:vendor/*.tgz` deps into a scratchpad
    copy of familyzoo v2.0.0; three transitive dev-chain packages (bootstrap,
    ext-testing, ide-protocol) initially leaked from the npm registry and were added as
    explicit file: deps — final install: **0 registry-resolved @sharpee packages** (21
    local). Script: session scratchpad `make-overlay.cjs`.
  - **Pre-step (stale-artifact finding)**: the tsf staging AND local `dist/` trees still
    carried compiled `capability-registry.js` + `interceptor-registry.js` (tsc doesn't
    delete outputs of deleted sources; tsf overlays staging without cleaning) — a
    published package would have shipped the deleted `globalThis` code. Fixed with
    `./repokit clean` + full rebuild + staging wipe/regen. AC-1 re-confirmed clean at
    bundle, source, and **staging** level for both ADRs' registry keys.
  - **AC-6**: `sharpee build --test` (standalone author path) on the overlay:
    **201/201 in 17 transcripts** including v16-scoring — `pet goats` renders the
    petting message and the final `score` shows "perfect score" (75/75) against
    published-equivalent resolution.
  - **AC-2/AC-3**: the same run is 17 sequential story loads (per-transcript `entry:`
    chapters) in one process — no throw on re-registration, no cross-load leak (plus
    dungeo's 868/868 walkthrough chain, ADR-208 Phase 3).
  - **AC-8**: the overlay IS the real-world dual-instance topology (story dist +
    harness packages resolving `@sharpee/world-model` independently); pet-goats
    dispatch resolving through the shared world instance end-to-end confirms the
    Phase 2 unit test's assumption.
  - **AC-9**: scratch overlay transcript (v99, ch23 entry): `pet goats` → `$save` →
    `$restore` → `pet goats` again, 4/4; save blob keys = {pluginStates, worldState},
    only trait-state mention of "pettable", no binding/behavior fields.
  - **AC-10**: node script against the overlay's installed packages — declared-but-
    unbound trait resolves `undefined` (no throw) on both the capability and
    interceptor surfaces.
  - **Suites**: dungeo units green on the clean rebuild; friendly-zoo **36/36**
    (story dist needed rebuilding after `./repokit clean` — the memory-documented
    `pnpm --filter '@sharpee/story-friendly-zoo' build`).
  - **familyzoo v1.5.0: EXCLUDED per user direction** (2026-07-02): the frozen
    edition belongs to the old platform line; v2 work never regression-tests it.
    (A run performed before that direction confirmed its known 196/197 baseline;
    the two files its tooling touched — pnpm-lock.yaml, src/version.ts — were
    reverted, freeze byte-exact.)
  - **Publish note (follow-up decision for David)**: `./repokit verify`'s dry-run
    publish fails on the 2.0.0 version collision (2.0.0 already on npm) — a real
    publish of the fixed platform needs a version bump (lockstep, per the release
    strategy). This phase proved the fix via the staging overlay; cutting a release
    is a separate decision.

## Summary of AC coverage by phase

| AC | Description | Primary phase |
|----|--------------|----------------|
| AC-1 | No capability state on `globalThis` | Phase 1 (deletion + grep test), confirmed Phase 5 |
| AC-2 | Concurrency — two games, same trait-type string, independent resolution | Phase 1 (unit), confirmed Phase 5 |
| AC-3 | Isolation — sequential loads neither throw nor leak | Phase 1 (unit), confirmed Phase 5 |
| AC-4 | Idempotent registration, no throw, last-wins | Phase 1 |
| AC-5 | All stories register without a guard | Phase 4 |
| AC-6 | familyzoo v16-scoring 75/75 against published packages | Phase 5 (in-workspace preview at Phase 4 exit) |
| AC-7 | No side-effecting eager pre-load | Phase 3 |
| AC-8 | Dual-instance dispatch via shared `world` instance | Phase 2 (unit), confirmed Phase 5 |
| AC-9 | Bindings re-established by init, not serialized | Phase 1 (unit), confirmed Phase 5 |
| AC-10 | Missing binding resolves to normal rejection, never throws | Phase 1 (unit), confirmed Phase 5 |
