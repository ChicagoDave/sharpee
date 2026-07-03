# ADR-208: Action-Interceptor Registry is World-Owned, not Process-Global

## Status: ACCEPTED

> Accepted 2026-07-02 by David (adr-review 13/13, READY — two review corrections
> applied: new-tests-not-rewrites scope, explicit root-barrel step).
> **IMPLEMENTED 2026-07-02** (session b65caa, Phases 1-3): see
> `docs/work/adr-208-interceptor-registry/plan.md` (per-phase completion notes and
> execution deviations) and
> `docs/context/session-20260702-1956-v2_familyzoo_split.md` (implementation
> summary, AC-1..AC-10 evidence). Published-package proof (shared with ADR-207)
> rides ADR-207 Phase 5's overlay harness.

> The interceptor registry (ADR-118) has the **identical defect class ADR-207 just
> eliminated for capability-behavior bindings**: trait→interceptor bindings live in a
> `globalThis` process-wide singleton that never resets between story loads, with a
> throw-on-duplicate registration that forces `hasActionInterceptor` guards at every
> story call site. Surfaced as finding **P10** of the dungeo regression cleanup
> (`docs/work/dungeo-regression-cleanup/findings-20260702.md`). This ADR applies the
> ADR-207 treatment to the interceptor registry: the per-game **binding map** moves to
> `WorldModel` ownership; interceptor *definitions* remain shareable stateless hook
> objects.

## Date: 2026-07-02

## Terminology

- **Interceptor definition (ADR-118)** — an object of optional lifecycle hooks
  (`preValidate` / `postValidate` / `postExecute` / `onBlocked` / `postReport`) that a
  trait wires into a standard action. A **stateless strategy**: pure logic over
  `(entity, world, actorId, sharedData)`; no per-game fields. Safe to share across
  worlds; may be module-level.
- **Binding** — a `(traitType, actionId) → { interceptor, priority }` association. This
  is **per-game state**: which interceptor a given running game has wired up for a given
  trait+action. Today it lives in `globalThis['__sharpee_interceptor_registry__']`
  (`packages/world-model/src/capabilities/interceptor-registry.ts`).
- **Binding map / "the registry"** — the per-game collection of bindings. The thing this
  ADR moves onto `WorldModel`.

## Context

`interceptor-registry.ts` is a line-for-line sibling of the `capability-registry.ts`
that ADR-207 deleted:

- The map lives on `globalThis` ("to ensure the registry is shared across module
  boundaries" — the same bundler dual-module-instance hack).
- `registerActionInterceptor` **throws on duplicate** `(traitType, actionId)` keys, so
  every story registration is wrapped in a `hasActionInterceptor` guard — **15 guarded
  registration sites in `stories/dungeo/src/index.ts`** (troll-axe taking, troll
  taking/talking, trophy-case putting, rug pushing, safe opening, and the rest of the
  ADR-118 migrations).
- Nothing ever calls `clearInterceptorRegistry` — bindings from the first story loaded
  into a process silently win for every game loaded after it. This is the exact
  first-load-wins mechanism behind the familyzoo 70/75 regression that motivated
  ADR-207; the interceptor registry simply hasn't had its visible incident *yet*
  (in-repo, only dungeo registers interceptors, and test tooling loads dungeo first —
  the corruption is latent, not absent: any second story registering an interceptor for
  a shared trait type inherits or collides with dungeo's).

**Consumer survey (2026-07-02):**

| Consumer | Call | Count |
|---|---|---|
| stdlib standard actions (going, taking, throwing, switching_on, putting, pushing, opening, entering, dropping, closing, attacking) | `getInterceptorForAction(entity, actionId)` free import | 11 actions |
| engine `game-engine.ts` introspection summary | `getAllInterceptorBindings()` free import | 2 loops |
| `stories/dungeo/src/index.ts` | `hasActionInterceptor` guard + `registerActionInterceptor` | 15 sites |
| world-model `interceptor-helpers.ts` (`findTraitWithInterceptor`, `hasInterceptor`, `getEntityInterceptors`, …) | pure trait-declaration helpers, no map access | out of scope |

No other story or tutorial registers interceptors. No caller of
`unregisterActionInterceptor` or `clearInterceptorRegistry` exists outside tests.

## Decision

Mirror ADR-207, item for item:

1. **The binding map moves to `WorldModel`** — a private per-instance field, created with
   the world, garbage-collected with it, never shared across games.
2. **New `IWorldModel` surface** (implemented by `WorldModel`, delegated by
   `AuthorModel`):
   - `registerActionInterceptor(traitType, actionId, interceptor, options?)` —
     **idempotent, last-registration-wins**, never throws on re-register (the guard
     pattern becomes unnecessary, not merely unused);
   - `getInterceptorForAction(entity, actionId)` — the existing priority-resolution
     lookup across the entity's traits, now reading this world's map (same
     `InterceptorLookupResult` return);
   - `getInterceptorBinding(traitType, actionId)`;
   - `getAllActionInterceptors(): ReadonlyMap<string, TraitInterceptorBinding>` —
     read-only introspection for the engine summary (mirrors
     `getAllCapabilityBindings`, added in ADR-207 Phase 2).
3. **Delete `interceptor-registry.ts` entirely** in the same pass — the `globalThis` map
   and every free function (`registerActionInterceptor`, `getInterceptorForAction`,
   `getInterceptorBinding`, `hasActionInterceptor`, `unregisterActionInterceptor`,
   `clearInterceptorRegistry`, `getAllInterceptorBindings`). Relocate the
   `TraitInterceptorBinding` / `InterceptorRegistrationOptions` /
   `InterceptorLookupResult` type shapes into a new `interceptor-binding.ts` (the
   `capability-binding.ts` precedent), re-exported through
   `src/capabilities/index.ts` **and** the root `src/index.ts` per the world-model
   root-barrel discipline (`packages/world-model/CLAUDE.md`). No
   deprecated-alongside-new retention, per the standing direction recorded in ADR-207's
   plan ("we currently don't care about backward compatibility").
4. **Readers thread the world already in scope**: all 11 stdlib actions have
   `context.world` at the call site (`getInterceptorForAction(noun, id)` →
   `context.world.getInterceptorForAction(noun, id)`); the engine summary uses
   `this.world`.
5. **Stories register per world, guard-free**:
   `world.registerActionInterceptor(TrollAxeTrait.type, 'if.action.taking',
   TrollAxeTakingInterceptor)` — guards and dead imports removed in the same edit across
   dungeo's 15 sites.
6. **Interceptor definitions stay put** — module-level stateless hook objects in story
   code; per-game state flows through `(entity, world, actorId, sharedData)` arguments.
   The ADR-118 hook contract, priority semantics, and the pure helpers in
   `interceptor-helpers.ts` are explicitly unchanged.

## Options considered

- **Leave it global (status quo)** — rejected: latent first-load-wins corruption, the
  guard boilerplate at every story site, and a divergent authoring story now that
  capability behaviors are per-world (authors must learn two registration models where
  one defect was already judged unacceptable in ADR-207).
- **Engine-owned service object** (a registry instance hung off `GameEngine`) —
  rejected for the same reason ADR-207 chose `WorldModel`: dispatch happens in stdlib
  code that has `context.world`, not the engine instance; and the world is the unit of
  game identity (save/restore, dual-instance resolution both key off it).
- **Fold interceptors into the capability binding map** (one map, two binding kinds) —
  deferred: tempting unification, but ADR-118 and ADR-090 have different resolution
  semantics (interceptors: per-entity priority pick; capabilities: resolution modes) and
  merging the stores buys nothing user-visible. Revisit only if a third binding kind
  appears.

## Scope

**In:** the binding map and its whole free-function surface; the 11 stdlib reader call
sites; the engine introspection loops; dungeo's 15 registration sites; **new** unit
tests for the world surface (verified 2026-07-02: no existing test file touches the
registry functions — `interceptor-report-result.test.ts` and
`interceptor-context-binding.test.ts` use inline interceptor objects and stay as-is) —
per-world registration/isolation/idempotency (AC-2/3/4), enumeration (AC-7),
non-serialization (AC-9), missing-binding behavior (AC-10), and an AC-8
dual-module-copy test (the `vi.resetModules` pattern from ADR-207 Phase 2).

**Out:** the ADR-118 interceptor hook contract and invocation order; priority/resolution
semantics; `interceptor-helpers.ts` (pure trait-declaration helpers); the ADR-090/207
capability binding map (already migrated); non-dungeo stories (none register
interceptors).

## Consequences

- One registration model across the platform: **bindings are per-world, idempotent,
  registered in `initializeWorld`** — capability behaviors (ADR-207) and interceptors
  (this ADR) read identically to authors.
- The 15 dungeo guards disappear; `packages/stdlib/CLAUDE.md`'s dispatch reference gets
  the same "register on the world instance" note capability dispatch already has.
- Intermediate breakage during migration (world-model → stdlib/engine → dungeo) is
  expected and accepted, executed as one coordinated pass exactly like ADR-207
  Phases 1–4 — smaller here: one story tree, no tutorial editions, no
  published-package phase (interceptors have no familyzoo consumer, so ADR-207
  Phase 5's overlay harness already covers the published-path proof for the shared
  mechanism).
- The `getAllInterceptorBindings` import in `game-engine.ts` — the last capability-file
  free-function import in the engine — goes away; `capabilities/index.ts` barrel slims
  accordingly.

## Acceptance Criteria

- **AC-1** — No interceptor state on `globalThis`: grep for
  `__sharpee_interceptor_registry__` / `interceptor-registry` returns nothing in
  `packages/`, `stories/`, or the built bundle.
- **AC-2** — Two `WorldModel` instances bind the same `(traitType, actionId)` key to
  different interceptors independently.
- **AC-3** — Sequential story loads in one process neither throw on re-registration nor
  leak bindings between games.
- **AC-4** — Re-registering a key on the same world is idempotent (last-wins, never
  throws).
- **AC-5** — Every dungeo registration is a bare `world.registerActionInterceptor(...)`;
  no `hasActionInterceptor` guard or deleted free-function import remains.
- **AC-6** — The interceptor-backed dungeo puzzles still pass their transcripts:
  rug/trapdoor, troll-axe white-hot take-block, troll take/talk, trophy-case scoring,
  safe rusted-shut (unit suite deterministic-green; walkthrough chain per the
  one-good-run rule).
- **AC-7** — The engine introspection summary enumerates the *world's* interceptor
  bindings via `getAllActionInterceptors()`.
- **AC-8** — A dispatch running against one `@sharpee/world-model` module copy resolves
  an interceptor registered through a second module copy of the package, because both go
  through the same `world` object instance (unit test via `vi.resetModules`).
- **AC-9** — Bindings are not part of `getState()`/`setState()`; re-running
  `initializeWorld` after a restore repopulates the map; no new save-blob field.
- **AC-10** — An entity with no interceptor binding for an action gets the standard
  stdlib behavior unchanged; a missing binding never throws.

## Open Questions

1. **Sequencing** — single coordinated pass (world-model + readers + dungeo in one
   session) vs. phased like ADR-207. The surface is ~⅓ the size; a single pass is
   likely right. Non-blocking.
2. **`unregisterActionInterceptor`** — no production caller exists; the per-world map
   makes "unregister" expressible as re-register-with-replacement or simply omitting the
   registration on the next load. Proposal: do not carry it to the world surface unless
   a story needs runtime unwiring (none does today). Non-blocking.

## Relationships

- **ADR-118 (Action Interceptors)** — the pattern whose *storage* this ADR fixes; hook
  contract untouched.
- **ADR-207 (Capability Registry is Engine-Owned)** — the precedent this ADR mirrors;
  together they complete per-world ownership of all trait→behavior dispatch state.
  ADR-207's Relationships section flagged the interceptor registry as the known sibling.
- **ADR-090 (Entity-Centric Action Dispatch)** — the capability side of the same
  authoring story.

## Session

Proposed 2026-07-02 during the dungeo regression cleanup
(`docs/context/session-20260702-1344-v2_familyzoo_split.md`), as the resolution path for
finding P10 (`docs/work/dungeo-regression-cleanup/findings-20260702.md`).
