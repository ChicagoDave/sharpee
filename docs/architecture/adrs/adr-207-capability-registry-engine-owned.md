# ADR-207: Capability Registry is Engine-Owned, not Process-Global

## Status: ACCEPTED

> Accepted 2026-07-02 by David (adr-review 14/14, READY). Captures a **v2 regression +
> design defect** found while migrating the Family Zoo tutorial to 2.0.0:
> capability-behavior bindings (ADR-090) live in a `globalThis` process-wide singleton
> that never resets between story loads, so the *first* story/chapter loaded into a
> process wins the binding for every game after it. The visible symptom was `familyzoo`
> scoring 70/75 instead of a perfect 75 (petting silently stopped awarding). Fix: the
> per-game **binding map** moves to `WorldModel` ownership; behavior *definitions* remain
> shareable stateless strategies. Implementation planned in
> `docs/work/adr-207-capability-registry/`.

## Date: 2026-07-02

## Terminology

- **Behavior definition (ADR-090)** — a `{validate, execute, report, blocked}` object.
  A **stateless strategy**: pure logic, no per-game fields. Safe to share; may be a
  module-level constant.
- **Binding** — the association of a behavior definition to a `(traitType, capability)`
  key *for a specific running game*. This is **per-game state**: two games can bind the
  same key to different behaviors.
- **Binding map (the "registry")** — the collection of bindings in effect for one game.
  Today it is `capability-registry.js`, a single `Map` hung off `globalThis` — one map
  for the whole process.
- **Game / world instance** — one assembled `GameEngine` + `WorldModel` produced by one
  `bootstrap.loadStory` / `assembleGame` call. A single process may assemble many
  (transcript suites; multi-user zifmia).
- **Load** — one `loadStory(path, entry?)` call. The transcript-tester issues several per
  process (`cli.js` 266/301/328).

The defect is a **category error**: the binding map (per-game state) is stored as a
process singleton, conflating it with the behavior definitions (which *are* legitimately
shareable). See "Object classification" below.

## Context

Capability bindings are **per-game state** — they describe *this story's* trait→behavior
wiring — but they are stored as **process-global state**:

- `capability-registry.js:20-27` keeps the registry on
  `globalThis['__sharpee_capability_behaviors__']`, explicitly "shared across module
  boundaries" (introduced in v2 to survive the bundle's dual-instance problem: story code
  imports `@sharpee/*` from `node_modules` while the dispatch runs from the bundle).
- `registerCapabilityBehavior` **throws** on a duplicate key (`:79`).
- Nothing (`bootstrap`, `engine`, `transcript-tester`) ever calls the exported
  `clearCapabilityRegistry` — there is **no per-load reset**.

That single mistake — per-game state stored globally — produces a cluster of smells:

1. **Global mutable singleton.** Unowned, cross-cutting state with no lifecycle tie to the
   game it describes.
2. **Throw-on-duplicate registration.** A registration op that is fatal on re-entry
   exports its fragility to every caller.
3. **Leaked abstraction in author code.** To survive (2), stories wrap registration in
   `if (!hasCapabilityBehavior(...))` (e.g. `tutorials/familyzoo/**/ch23-scoring.ts`,
   dungeo). The platform's global-state problem is now in every story's setup.
4. **False test isolation.** "Fresh game per unit test" is a half-truth: the world is
   fresh, the bindings are not. Results become **load-order dependent**.
5. **Silent-wrong failure mode.** With the guard, a second load doesn't throw — it
   *silently runs a different story's behavior*. Loud-wrong is recoverable; this ships.
6. **Global key namespace.** `traitType:capability` is a process-global key, so any two
   games sharing a trait-type string collide by construction — fatal for concurrent
   games (zifmia multi-story in one process).
7. **Redundant eager pre-load.** `transcript-tester/cli.js:301` loads the *default*
   (no-entry) story, discards the game, and its only lasting effect is polluting the
   global registry before the real entry loads at `:328`.

**Reproduction (familyzoo v2).** The `v16-scoring` transcript declares `entry: ch23`
(max score 75). The tester pre-loads the default entry (`ch24-27`) at `cli.js:301`, whose
`initializeWorld` registers *its* `pettingBehavior` first. When `ch23` then loads,
`hasCapabilityBehavior` is already `true`, so its guard **skips** registering the
scoring-aware behavior. `pet goats` runs the earlier chapter's behavior, prints the pet
message, and never calls `awardScore(PET_ANIMAL)` → 70/75. Instrumentation confirmed:
ch23's behavior phases never fire; forcing registration throws "already registered". The
same eager-load pollution occurs in devkit (`build.ts` loads the default when a story has
no walkthroughs). **v1 did not exhibit this** (per report) — the global registry is a v2
introduction; the bundle fix it enabled brought the cross-load leak with it.

## Object classification & singleton requirements

The fix is not "avoid singletons" — it is to **classify each object and hold it to the
requirements of its kind**. A process-wide singleton is legitimate only if *all* of:

1. **Genuinely one instance** — never more than one per process by nature.
2. **No per-consumer state** — holds nothing two callers would legitimately want to differ
   on (the "SHARED?" test).
3. **Stateless or safe-shared** — immutable/stateless, or its mutable state is truly
   process-global and concurrency-safe.
4. **Lifecycle = process** — created once, no meaningful teardown.
5. **Test-isolable** — resettable/injectable so tests don't leak into each other.

Applying it:

| Object | Kind | Singleton-legit? |
|---|---|---|
| **Behavior definition** (`{validate,execute,report,blocked}`) | stateless strategy | ✅ Yes — pure logic, no per-game state; fine as a shared module constant. |
| **Binding map** (`(traitType,capability) → behavior` for a game) | per-game state | ❌ No — fails #1 (one per game), #2 (ch23 vs ch24-27 legitimately bind `pettable:petting` to different behaviors), #4 (should die with the game), #5 (never reset → the order-dependence observed). |
| **GameEngine / WorldModel** | per-game instance | ❌ Not a singleton (zifmia hosts many). |

So behaviors may stay shared/stateless; only the **binding map** must move, and it must
move to per-game ownership because it fails the singleton test on four of five points.

### Boundary Statement (DEVARCH 8a) — the binding map

- **OWNER:** the `WorldModel` instance.
- **SHARED?:** yes — two games in one process legitimately disagree on the same key ⇒
  per-consumer state ⇒ **must not** be a process singleton.
- **PROMISE:** `capability-registry.js`'s header promises state "shared across module
  boundaries" — that promise is exactly what is wrong for a per-game binding.
- **ALTERNATIVES:** per-`WorldModel` map (chosen); per-load reset of a global (band-aid,
  fails concurrency); process singleton (status quo — fails #2/#4/#5).

## Decision

**The binding map is owned by the `WorldModel` instance; behavior definitions remain
shareable, stateless strategies.**

1. **Per-world binding map.** The `(traitType, capability) → behavior` map lives on the
   `WorldModel` instance (chosen over `GameEngine` because dispatch and registration both
   already hold `world` — see contract). Created with the world, dropped with it. No
   `globalThis`.
2. **Dispatch resolves through `world`.** Behavior lookup goes through the `WorldModel`
   the action is running in (`context.world`), never a global. This preserves the bundle
   dual-instance guarantee by threading the *instance* rather than re-importing a module —
   the running `world` is one object regardless of how many `@sharpee/world-model` module
   copies exist (validated by AC-8).
3. **Registration is scoped and idempotent.** `world.registerCapabilityBehavior(...)`
   binds into *this world's* map during `initializeWorld`, and does **not** throw on
   re-registration within a world (last-registration-wins, or explicit priority/override
   per ADR-090's existing `options`). Authors call it once, plainly — **no
   `hasCapabilityBehavior` guard.**
4. **Loader owns nothing extra.** Because the map is per-world, each
   `loadStory`/`assembleGame` gets a fresh map for free; there is no global to reset. The
   process-global `clearCapabilityRegistry` is **removed** (its existence is the tell that
   the state was mis-scoped).

### Interface contract

The binding map moves behind `IWorldModel`; free functions that read `globalThis` become
world methods. Approximate shapes (final names in implementation):

```ts
interface IWorldModel {
  // producer — called by stories during initializeWorld, and by stdlib actions
  registerCapabilityBehavior(traitType: string, capability: string,
                             behavior: CapabilityBehavior, options?: CapabilityOptions): void; // idempotent
  // consumer — called by the dispatch helper and standard actions
  getBehaviorForCapability(trait: ITrait, capability: string): CapabilityBehavior | undefined;
  getBehaviorBinding(traitType: string, capability: string): CapabilityBinding | undefined;
}
```

- `findTraitWithCapability(entity, capability)` stays a pure helper (reads the trait's
  static `capabilities`), independent of the map.
- Every current free-function call site (`engine/capability-dispatch-helper.ts`, stdlib
  `giving`/`throwing`, story registrations) is rewritten to the `world.*` method on the
  `world` already in scope.

## Options considered

- **A — Per-load `clearCapabilityRegistry()` in the loader (band-aid).** Keep the global
  Map but reset it at the start of every `loadStory`. Fixes *sequential* isolation
  (transcript suites) and lets authors drop guards. **Rejected as the end state:** still a
  global (smell 1/6), still cannot hold two *concurrent* games (zifmia), still throws on
  intra-load double-register. Acceptable only as an interim stopgap if B must be staged.
- **B — World-owned binding map (this Decision).** Removes smells 1–6 at the source;
  supports concurrent games; makes registration a normal scoped operation. Behavior
  *definitions* stay shared/stateless — only the *binding map* moves.
- **Status quo + author guards.** Rejected: institutionalizes smells 3 and 5 (leaked
  abstraction + silent-wrong) in every story.

## Scope

**In — producer/storage side:** the binding-map storage + API on `WorldModel`
(`packages/world-model/src/capabilities/*`), removing the `globalThis` map and
`clearCapabilityRegistry`.

**In — consumer/read side (the ADR's original blind spot):** every call site that resolves
a behavior must read the per-world map:
- `packages/engine/src/capability-dispatch-helper.ts` — the generic dispatch for **all**
  stdlib actions (the primary reader).
- `packages/stdlib/src/actions/capability-dispatch.ts` — the dispatch action wrapper.
- Standard actions doing inline lookups: `stdlib/.../giving/giving.ts` (`:205-207`),
  `throwing/throwing.ts` (`:319-321`); the `raising`/`lowering` capability actions.

**In — lifecycle + callers:** loader wiring (`bootstrap`/`engine`) is simplified (no reset
needed); the eager default pre-load in `transcript-tester/cli.js:301` and the devkit
no-walkthrough eager load are dropped/made side-effect-free. Migration: delete the
`if (!hasCapabilityBehavior)` guards from every story that carries them (dungeo, familyzoo
v1.5.0 + v2.0.0, friendly-zoo) and any custom capability action that threaded the behavior
via `sharedData` from a global lookup.

**Out:** the behavior contract shape and ADR-090 resolution/priority semantics (unchanged,
now applied per-world); non-capability registries (grammar, audio, event-data) — evaluate
separately if they share the singleton-misuse pattern.

**Out:** the shape of a behavior (`validate/execute/report/blocked` stays, ADR-090); the
ADR-090 resolution/priority semantics (unchanged, now applied per-game); non-capability
registries (grammar, audio) — evaluate separately if they share the pattern.

## Consequences

- **Authors stop reasoning about process state.** Register once, no guards, no throws.
- **Tests isolate for real** — no load-order dependence; the eager pre-load can be dropped.
- **Concurrent games become correct** (zifmia can host multiple stories in one process).
- **familyzoo `pet` awards again** (75/75) once ch23's guard is removed and its behavior
  registers into its own game — validating the fix end-to-end against published packages.
- **Breaking for the dispatch/registration internals** (v2, pre-1.0-of-this-subsystem):
  the dispatch lookup signature and the registry API change; every in-repo story's
  registration is migrated in the same change. `we currently don't care about backward
  compatibility` (project policy) applies.
- **Cost:** touches `world-model`, `stdlib`, `bootstrap`/`engine`, and every story that
  registers a capability behavior — a cross-package change requiring a coordinated sweep.

## Acceptance Criteria

1. No capability state on `globalThis`; the registry is created per `GameEngine`/world and
   dropped with it.
2. **Concurrency test:** two games assembled in one process with the same trait-type
   string resolve *their own* behaviors independently.
3. **Isolation test:** loading the same story (or two entries of it) sequentially in one
   process neither throws nor leaks bindings between loads.
4. `registerCapabilityBehavior` is idempotent within a game (no throw on re-register;
   last-wins or explicit priority per ADR-090).
5. All in-repo stories register **without** a `hasCapabilityBehavior` guard; the guards are
   removed from dungeo, familyzoo (v1.5.0 + v2.0.0), and friendly-zoo.
6. `familyzoo` `v16-scoring` reaches **75/75** (`pet goats` awards `PET_ANIMAL`) under
   `sharpee build --test` against the published `@sharpee/*@2.0.x`.
7. `transcript-tester` no longer eager-loads the default entry solely to discard it (or the
   pre-load has no cross-game side effect).
8. **Dual-instance:** dispatch resolves the behavior registered by the *same game* even
   when story code and the dispatch resolve `@sharpee/world-model` from different module
   copies (the failure mode the `globalThis` hack existed to avoid) — because the binding
   map is reached through the shared `world` *instance*, not a module-level global. A test
   exercises a bundled dispatch against a story-registered behavior.
9. **Persistence:** bindings are re-established by story init on **every** load and restore
   (they are code wiring, not serialized state); a restored save does not deserialize the
   map, and re-running init repopulates it. No new save-blob field.
10. **Missing binding (negative path):** an entity whose trait statically declares a
    capability but has no behavior registered in *this* world resolves to the action's
    normal rejection (the "can't do that" message), never a throw — exercising the empty
    per-world map.

## Open Questions

1. **Migration ordering (non-blocking, but must be sequenced).** The per-world map + all
   read-side call sites must land **before** the author guards are deleted — deleting a
   guard while the global still exists reintroduces the throw. Proposed order: (a) add the
   `world` methods alongside the deprecated globals; (b) migrate `engine`/`stdlib` readers
   and story registrations to `world.*`; (c) delete the `globalThis` map,
   `clearCapabilityRegistry`, and the author guards in one commit.

   **Resolved-by-plan (2026-07-02):** the implementation plan in
   `docs/work/adr-207-capability-registry/plan.md` deliberately does not stage a
   deprecated-alongside-new period. Per explicit user direction ("there is no need to retain
   deprecated methods") and the project's standing "we don't care about backward
   compatibility" policy, each phase deletes what it replaces in the same commit: Phase 1
   deletes `capability-registry.ts`'s `globalThis` map and free functions in the same commit
   that adds the `WorldModel` methods; Phase 4 removes each author guard in the same edit
   that rewrites its registration call to `world.*`. This still avoids the ordering hazard
   this Open Question exists to prevent — engine/stdlib/story packages simply fail to build
   between Phase 1 and Phase 4 (an accepted intermediate state within one gated, coordinated
   session sequence) rather than silently reintroducing the throw. Treat the "proposed order"
   above as superseded by the plan's phase sequencing for this implementation.
2. **Idempotency policy.** "Last-registration-wins" vs "explicit priority/override
   required" for a re-register within one world. Lean last-wins for author ergonomics;
   ADR-090's `options.priority` remains available for deliberate layering. Confirm.
3. **Standard-action behaviors' definition scope.** Behaviors bundled with stdlib actions
   (raising/lowering) are shared definitions — confirm they carry no per-game state (they
   shouldn't) so sharing them across worlds stays safe.

## Relationships

- **Refines ADR-090** (Capability Dispatch) — fixes the registry's ownership/lifecycle,
  leaves the behavior contract intact.
- **Root cause of the ADR-129** (Scoring) symptom observed in familyzoo (lost `awardScore`
  in a capability `execute`).
- **Surfaced by ADR-180** entry-selection: honoring `entry:` in devkit (this session's
  fix) is what made the multi-load pollution observable per chapter.
- Same investigative lineage as the ADR-192+ phrase-migration regressions (ADR-203/206):
  a v1→v2 behavior shift exposed only once stories could run end-to-end on v2.

## Session

Authored 2026-07-02 (session `3c69ac`, branch `v2_familyzoo_split`) during the Family Zoo
v1.5.0/v2.0.0 tutorial split + v2 migration. Root-caused from the `v16-scoring` 70/75
failure: bisected the lost 5 points to `pet goats` → traced the capability dispatch →
found the `globalThis` registry + throw-on-duplicate + author guard + tester eager
pre-load. All probing was done in a throwaway scratchpad copy; no `packages/` code changed
pending acceptance of this ADR.
