# Session Summary: 2026-07-02 13:44 - v2_familyzoo_split (CST)

## Goals
- Implement Phase 2 of the ADR-207 plan (`docs/work/adr-207-capability-registry/plan.md`):
  migrate every engine/stdlib behavior-resolution call site off the deleted capability
  free functions onto the per-`WorldModel` methods added in Phase 1.
- Implement Phase 3 (same session, second user go-ahead): loader lifecycle audit +
  removal of the eager load-and-discard pre-loads in the test tooling (AC-7).

## Phase Context
- **Plan**: `docs/work/adr-207-capability-registry/plan.md`
- **Phase executed**: Phase 2 — "Engine + Stdlib Reader Migration" (Medium tier, 250 tool-call budget)
- **Phase outcome**: Completed well under budget (~40 tool calls).

## Completed

### Engine reader migration
- `packages/engine/src/capability-dispatch-helper.ts` — `checkCapabilityDispatch` and
  `checkCapabilityDispatchMulti` now take a leading `world: IWorldModel` parameter; the
  binding lookup is `world.getBehaviorBinding(trait.type, actionId)`. Dropped the deleted
  `getBehaviorForCapability`/`getBehaviorBinding` imports (the former was an unused import).
  `findTraitWithCapability` and `getCapabilityConfig` stay as free functions (pure helper /
  static defaults — ADR-207 scope: "Out").
- `packages/engine/src/command-executor.ts` — both `checkCapabilityDispatchMulti` call sites
  (primary dispatch and ADR-104 inferred-target re-check) pass the in-scope `world`.
- `packages/engine/src/game-engine.ts` — **consumer discovered beyond the plan's Affected
  files**: the engine-introspection summary (trait/behavior enumeration for the IDE protocol)
  called the deleted `getAllCapabilityBindings()` free function in three loops. Now calls
  `this.world.getAllCapabilityBindings()`.

### World-model addition (in support of the above)
- New read-only enumeration method `getAllCapabilityBindings(): ReadonlyMap<string,
  TraitBehaviorBinding>` on `IWorldModel` (doc'd as introspection-only) + `WorldModel`
  implementation (returns the per-instance map) + `AuthorModel` delegate. Needed because
  Phase 1 deleted the free-function enumeration without a per-world replacement and
  game-engine.ts could not compile otherwise.

### Stdlib reader migration
- `packages/stdlib/src/actions/capability-dispatch.ts` — `createCapabilityDispatchAction`'s
  `validate()` resolves via `context.world.getBehaviorForCapability(trait, config.actionId)`.
- `packages/stdlib/src/actions/standard/giving/giving.ts` — inline ADR-090 consumer now
  `context.world.getBehaviorForCapability(capTrait, IFActions.GIVING)`.
- `packages/stdlib/src/actions/standard/throwing/throwing.ts` — same for `IFActions.THROWING`.
- `packages/stdlib/src/actions/standard/raising/raising.ts` + `lowering/lowering.ts` —
  confirmed pure consumers of `createCapabilityDispatchAction` (no inline lookups of their
  own; re-grep clean). Doc comments updated: registration guidance now says
  `world.registerCapabilityBehavior(...)` in the story's `initializeWorld()`.
- Emission/effect behavior unchanged everywhere — lookup-mechanism swap only, per the stdlib
  migration-audit discipline. No event shape, message ID, or sharedData contract touched.

### Tests
- `packages/engine/tests/universal-capability-dispatch.test.ts` — rewritten for the
  per-instance model: fresh `WorldModel` per test in `beforeEach` with
  `world.registerCapabilityBehavior(...)`; the `afterEach` unregister/clear teardown is gone
  (nothing global to clean). Added a per-world isolation test (same trait, world without the
  binding → `shouldDispatch: false`).
- **AC-8 dual-instance test added** (`dual-instance dispatch (ADR-207 AC-8)`): uses
  `vi.resetModules()` + dynamic import to load a genuinely second module copy of
  `@sharpee/world-model` (asserts `wmCopyB.WorldModel !== WorldModel`), registers a behavior
  through only the shared world object, and confirms engine-side dispatch (statically imported
  first copy) resolves it. This is the bundler dual-instance scenario the deleted `globalThis`
  hack existed to paper over.
- `packages/stdlib/tests/unit/actions/hiding-golden.test.ts` — fixed a Phase 1 leftover: the
  two end-to-end pipeline tests called `ensureVisibilityBehavior()` with no argument (before
  the world even existed), passing `undefined` into `registerConcealedVisibilityBehavior`.
  Moved the call after `setupBasicWorld()` and passed `world`.
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` — already
  migrated in Phase 1; no further change needed (listed in the plan's Phase 2 files but the
  Phase 1 session had covered it).

## Key Decisions

### 1. Added `IWorldModel.getAllCapabilityBindings()` (small surface addition beyond plan)
Phase 1 deleted the global enumeration free function with no per-world replacement, but
`game-engine.ts`'s introspection summary depends on enumerating bindings. Rather than leave
engine unbuildable or hack around it, a read-only `ReadonlyMap` view method was added to
`IWorldModel`/`WorldModel`/`AuthorModel` — consistent with ADR-207 (the map is per-world;
enumeration is now per-world introspection). Registration remains only via
`registerCapabilityBehavior`.

### 2. ADR-207 Open Question 3 confirmed (no code change)
The plan asked to audit whether stdlib-bundled raising/lowering behaviors carry per-game
state. Finding: **stdlib bundles no `CapabilityBehavior` implementations at all** — grep hits
in raising/lowering/giving/throwing are type imports and doc comments only. All behavior
definitions are story-owned and now registered per world, so cross-world sharing of behavior
definitions is safe by construction (they remain stateless strategies; per-game state flows
through `(entity, world, actorId, sharedData)` args).

### 3. Interceptor registry left as-is (out of scope, flagged)
`packages/world-model/src/capabilities/interceptor-registry.ts` still uses the same
`globalThis` pattern ADR-207 removes for capability bindings (`getAllInterceptorBindings`
et al., consumed by throwing.ts and game-engine.ts). Same defect class, but outside ADR-207's
scope — left untouched and flagged as a potential follow-up ADR.

---

# Phase 3 (same session): Loader, Transcript-Tester, and Devkit Lifecycle Cleanup

## Completed (Phase 3)

### Loader audit (deliverable 1)
- Grep across `packages/bootstrap/src`, `packages/engine/src`, `packages/transcript-tester/src`,
  `packages/devkit/src`: **no reset/clear code exists** (`clearCapabilityRegistry`,
  `unregisterCapabilityBehavior`, etc.) — confirms the ADR's Context claim; nothing to remove.

### Load-and-discard pre-loads removed (AC-7)
- `packages/transcript-tester/src/cli.ts` — the pre-loop `loadStory` now runs only in
  `--chain` mode (where that one game instance is used for the whole chain). In
  per-transcript mode the loop's own `loadStory(storyPath, transcript.header.entry)` is the
  only load; it gained the same try/catch + exit(3) error handling the pre-loop load had.
  `--play` mode untouched.
- `packages/devkit/src/standalone/build.ts` — `runTranscriptTests` loads the chained
  walkthrough game only when `walkthroughs.length > 0`; with unit tests only, each test's own
  per-entry `loadStory` is the only load. (Edge note: with no walkthroughs and a broken dist,
  failure now surfaces per-unit-test as "Failed to reload story" rather than one fatal
  "Failed to load story" — acceptable since `sharpee build --test` compiles the story
  immediately before this code runs.)
- **Third site discovered beyond the plan**: `scripts/bundle-entry.js` (the source of
  `dist/cli/sharpee.js` — the primary testing CLI) had the identical eager pre-loop
  `loadStoryAndCreateGame(options.storyPath)` discarded per-transcript in non-chain mode.
  Now `let game = options.chain ? loadStoryAndCreateGame(...) : undefined;`. Bundle rebuilt
  via `./repokit bundle`.

### Phase 2 coverage gap closed (mutation-verification follow-up)
- Added `getAllCapabilityBindings` tests to
  `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` (now 30 tests):
  enumeration keyed `traitType:capability` after registration, and the `AuthorModel` delegate
  reflecting the live per-world map. Both pass.

## Verification (Phase 3)
- Builds: transcript-tester, devkit clean; `./repokit bundle` clean.
- End-to-end (behavior preservation): `stories/channel-service-test`
  `walkthroughs/wt-stat.transcript` — **6/6 PASS, identical results in all four
  combinations**: bundle CLI × package CLI, chain × per-transcript mode.
- **Exit-check deviation**: the plan's dungeo walkthrough-chain check is NOT runnable until
  Phase 4 — dungeo's compiled `initializeWorld` calls the deleted `hasCapabilityBehavior`
  (verified: `TypeError: (0 , world_model_1.hasCapabilityBehavior) is not a function`). The
  plan's assumption that this check was independent of Phase 4 was wrong; re-run the dungeo
  chain at Phase 4 exit.
- Devkit suite: 17 passed, **2 pre-existing failures unrelated to this phase** (neither
  exercises `runTranscriptTests`): `init.test.ts` expects a `^1.x` devkit version but the
  workspace is `2.0.1` (stale expectation since the lockstep bump); `browser-build.test.ts`
  needs `@sharpee/platform-browser` `dist-esm` which isn't built in the current
  intentionally-partial workspace state. Reported, not chased (no-auto-retry rule).

## Observations (not regressions)
- `registerConcealedVisibilityBehavior` has no production caller — true both before and
  after Phase 1 (pre-Phase-1 git grep confirms only the stdlib test called it). If concealment
  NPC-detection is expected to work out of the box in games, some init path should call it
  per-world; candidate follow-up outside ADR-207.
- The bundle CLI (`bundle-entry.js` `parseArgs`) defaults `storyPath` to `stories/dungeo`;
  testing another story requires `--story <path>`.

---

# Phase 4 (same session): Story Registration Migration

## Completed (Phase 4)

### Migrations (user go-ahead: "phase 4")
- `stories/dungeo/src/index.ts` — 6 capability guard sites → bare
  `world.registerCapabilityBehavior(...)` (basket lowering/raising, troll-axe
  `if.scope.visible`, troll giving/throwing, egg opening); `hasCapabilityBehavior` +
  `registerCapabilityBehavior` imports removed. Action-interceptor registrations untouched
  (different registry, out of ADR-207 scope).
- `stories/friendly-zoo/src/index.ts` — guard site → bare `world.*` call; `pettingAction`
  lookup → `context.world.getBehaviorForCapability(...)`; dead imports removed.
- `tutorials/familyzoo/v2.0.0/src/` — all 6 chapter files (ch15, ch20, ch22, ch23,
  ch24-27-presentation/index, ch28-multi-file/index): guards → bare `world.*` calls,
  petting lookups → `context.world.*`, dead imports removed, and the ch15/ch20 teaching
  comment blocks rewritten to teach the per-world idempotent API (these are tutorial files —
  the prose is part of the deliverable).

### DEVIATION: familyzoo v1.5.0 intentionally NOT migrated
The ADR-207 plan listed both editions, but v1.5.0 is **frozen** and pins published
`@sharpee/*@^1.5.0` (familyzoo-v2-migration plan: "v1.5.0 freeze"), where the old
free-function API remains correct. Rewriting it to an API that will never exist on the 1.5
line would break the frozen edition. Recorded in the plan's Phase 4 status.

## Verification (Phase 4)
- `./repokit build dungeo` (canonical gate): clean.
- Dungeo walkthrough chain: **17 transcripts, 871/871 PASS** (also closes Phase 3's
  deferred exit check). Troll give/throw, basket elevator registration, egg opening all
  resolve via the per-world binding map.
- Dungeo unit suite vs **pre-ADR-207 baseline**: built commit aa99440d in a scratchpad git
  worktree (full platform + dungeo + bundle) and ran the same 106-transcript suite there.
  Baseline 1372 passed / 100 failed; current 1372 passed / 101 failed. Per-transcript diff:
  only `carousel` (documented random-exit room) and `combat-disengagement` (combat RNG —
  confirmed: same current build produced 19/0 then 18/1 on consecutive runs) differ. All
  other failures, including `basket-elevator`'s 7, are **byte-identical pre-existing**.
  Worktree removed after use.
- friendly-zoo: **36/36 PASS** (5 walkthroughs + 1 unit transcript, per-transcript mode —
  its walkthroughs are independent scenarios; chaining them is invalid and produces
  spurious failures). Manual end-to-end: `pet goats` renders the petting message and awards
  PET_ANIMAL (5 points) — the ADR-207 motivating scenario class, now working through
  `world.getBehaviorForCapability`.
- familyzoo v2.0.0: `tsc --noEmit` **clean** against workspace-built packages (scratchpad
  tsconfig mapping `@sharpee/*` → `packages/*/dist/index.d.ts`). Runtime transcript
  validation (v16-scoring 75/75, AC-6) requires the published-package overlay harness —
  Phase 5, per plan (the plan's "75/75 in-workspace at Phase 4 exit" assumed familyzoo could
  run in-workspace; it cannot — it is a standalone project with no workspace membership and
  no installed node_modules).

## Pre-existing platform findings (present in pre-207 baseline; NOT fixed — platform gate)
1. **Engine universal dispatch does not prefix capability-effect messageIds.**
   `packages/engine/src/capability-dispatch-helper.ts` `effectsToEvents` passes payloads
   through unchanged, while stdlib's `createCapabilityDispatchAction` prefixes short
   messageIds with the actionId. Story behaviors written for the prefix convention (dungeo's
   basket behaviors emit `'lowered'`, comment says "e.g., 'lowered' →
   'if.action.lowering.lowered'") render **blank output** when the engine universal path
   intercepts before the stdlib action. This is why `basket-elevator.transcript` fails 7
   assertions — identically pre- and post-ADR-207. Candidate fix (needs discussion): make the
   engine helper's effectsToEvents apply the same prefix convention.
2. **"You can see a [object Object] here."** in the Shaft Room contents list (basket
   container rendering) — identical in the pre-207 baseline.
3. (From Phase 3, still open) `registerConcealedVisibilityBehavior` has no production
   caller — before or after the migration.

---

# Dungeo regression cleanup (same session, user directive: "there should be no errors in dungeo regression")

## Outcome
- **Unit suite (stories/dungeo/tests/transcripts, 106 transcripts): deterministically GREEN**
  — "All tests passed" on consecutive full runs (~1690 assertions + 9 expected failures).
  Previously ~100 failures + ~12 non-running transcripts, documented as deferred follow-ups
  since the Phrase Algebra migration (session-20260630-2339: "box_rotates residual",
  "pre-existing failures: content/navigation, combat RNG, [NOT:]/missing-assertion").
- **Walkthrough chain: GREEN under the one-good-run rule** (user-confirmed: "if there is a
  single successful run, that's the baseline"; multiple full passes observed). Residual
  flakes are canonical MDL RNG — chiefly the thief stealing the torch from the player's
  possession (MDL ROB-ADV, torch has no SACREDBIT — verified in original_source/util.16),
  which no scripted transcript can absorb mid-route. Saved as memory `one-good-run-rule`.

## How (4 parallel agents on disjoint transcript sets + direct fixes)
Story-source fixes (stories/dungeo/src — all rebuilt + verified):
- basket-elevator behaviors: fully-qualified `dungeo.basket.*` messageIds + MDL-canonical
  texts registered (engine universal dispatch doesn't auto-prefix short keys) — 13/13.
- cake handler: shrink/enlarge now moves room objects into/out of the Alice world per MDL
  EATME/CAKE-FUNCTION (blue cake was unreachable).
- `room` info command: payload keys fixed (`roomName`/`roomDescription`).
- flooding fuse: mutate the STORED capability object (registerCapability copies initialData
  — daemon never saw level > 0; second press also hit duplicate registerDaemon).
- GDT `kl` thief/troll now applies `applyVillainDeathSideEffects` (max score 616→650, loot
  scatter, frame spawn, exit unblock — parity with combat kills).
- melee interceptor: unarmed attacks blocked with "Fighting unarmed is suicide." (MDL
  KILLER semantics); help/about/save/undo narration registered story-side; troll got
  OpenInventoryTrait so `take axe` reaches the white-hot interceptor; push-panel nests
  params (ADR-206) — killed the box_rotates stderr residual (the "second render path" was
  ADR-097's domain-message handler, which binds nested-only).
Transcript fixes: ~45 files — stale echo/article/event-taxonomy expectations updated after
verifying current output is canonical (MDL-checked where contested: cyclops passage,
carousel semantics, troll geography, royal-puzzle route), missing assertions/headers added
to 12 never-running transcripts, `[NOT:]` → `[OK: not contains]`, GDT-mode ordering fixed
(commands were running inside GDT input mode), combat sequences hardened with
WHILE-take-weapon guards (unarmed-block interplay), wt-13/15/16 now bank lantern battery
at lit checkpoints (wt-17 grue death was battery exhaustion; wt-17 now lights before
descending).

## Platform findings ledger (packages/** untouched — for discussion)
> Full writeup with root causes, repros, and fix options:
> `docs/work/dungeo-regression-cleanup/findings-20260702.md`
1. Engine universal capability dispatch doesn't prefix short effect messageIds
   (capability-dispatch-helper effectsToEvents) — stdlib factory does; story behaviors
   written for the prefix convention render blank when the engine path intercepts.
   **DECIDED (user, 2026-07-02): fully-qualified messageIds are the requirement** —
   all in-repo behaviors swept conformant (last violator `dungeo.egg.opened` fixed);
   documented in packages/stdlib/CLAUDE.md; factory prefix logic flagged as legacy
   for later removal.
2. `[object Object]` contents list: stdlib switching_on.ts (~352) passes a bare
   `nounPhraseFor` array where looking-data.ts passes a PhraseList; light-reveal path.
   **FIXED (user-directed, 2026-07-02)**: auto-LOOK block aligned with looking's emission
   contract (PhraseList items; room description without messageId so the specialized room
   handler renders — also killed the "a Shaft Room" article symptom). stdlib 1291 green,
   dungeo units green, chain one-good-run green.
3. stdlib `MAIN_KEYS` drops `help.text`/`about.text` block keys → canonical HELP/ABOUT
   render nowhere; lang-en-us keys don't match stdlib's emitted messageIds.
   **FIXED (user-directed, 2026-07-02)**: lang-en-us help keys renamed to match emitted
   ids (`general`/`first_time`/`topic`), about gained a `success` StoryInfo template, and
   engine `setStory` auto-creates the StoryInfo entity from StoryConfig when the story
   doesn't (author overrides via same-id registration still win — dungeo's do). Engine
   unit test added. Residuals CLEANED UP (user-directed): help first-time tracking now
   real via the gameMeta capability (helpRequested flag, 3 unit tests asserting the
   mutation); dead engine prose-pipeline help/about handlers deleted (files, dispatch
   cases, barrel exports, tests) — help/about render solely via lang templates through
   the domain-message path.
4. Platform events (`platform.undo_completed` etc.) carry `payload` but
   handleGenericEvent reads `data` → can never render text.
   **FIXED (user-directed, 2026-07-02)**: deeper cause found — the pipeline filter
   stage dropped ALL platform.* events. Outcome events now pass the filter and render
   via new `handlePlatformEvent` (event type = messageId, params from payload) with
   standard lang-en-us texts ("Saved.", "Previous turn undone.", "Nothing to undo.", …),
   author-overridable by same-id registration. Dungeo's undo-override/save-message
   workarounds retired. Engine 455 green; all transcript gates green.
5. ADR-206 contract gap: domain-message handler (ADR-097) intercepts any event with
   `data.messageId` and binds NESTED-only, then generic binds FLAT — flat-emit +
   messageId = stderr warn + double render attempt. Needs ADR clarification.
   **FIXED (user-directed, 2026-07-02, option 1)**: domain path now binds
   `data.params ?? data` (nested wins); ADR-206 amended (original rejection superseded,
   reasoning recorded); 6 unit tests added; zero `[phrase]` stderr across the full dungeo
   suite; all transcript gates green. troll-combat knockout-RNG flake hardened in passing
   (sword-recovery guard, RETRY max=10).
6. `WorldModel.registerCapability` copies initialData — audit other register-then-mutate
   call sites.
   **AUDITED + FIXED (user-directed, 2026-07-02)**: all 15 call sites classified (12
   safe, flooding already fixed, dc.ts misuse found). registerCapability now returns the
   LIVE stored data object (existing one on re-register), initialData is deep-copied
   (structuredClone — function fields throw), the three rules documented on IWorldModel,
   dc.ts scheduler handle moved to a per-world WeakMap (out of serializable capability
   data). 5 new world-model tests; all suites + transcript gates green.
7. `take all` with zero candidates emits no text (blank = unconditional transcript fail).
   **FIXED (user-directed, 2026-07-02)**: the action already emitted `nothing_to_take`;
   lang-en-us just lacked the template. Added with the user's text: "You take in
   everything you see and enjoy the moment."
8. Transcript-tester `[SKIP]` does not execute the command outside DO/WHILE — silently
   shifts scheduler timing.
9. Stray "a " article on non-noun params ("a Treasure Room", "a You can make out...").
   **FIXED (user-directed, 2026-07-02)**: bare `{param}` atoms noun-treat their values —
   the two remaining sites switched to `{verbatim:...}` (reading `cannot_read_now` in
   lang-en-us; dungeo push-wall room_description); the room-title case was already fixed
   by P2. Sweep found no other bare full-sentence templates.
10. `registerConcealedVisibilityBehavior` has no production caller (pre-existing).
    **FIXED (user-directed, 2026-07-02)**: identified as ADR-148's hide-and-spy mechanic
    (intended for The Alderman), unwired since its "partial implementation" commit.
    engine setStory now registers it per-world before initializeWorld (story-overridable
    last-wins); hiding success messages also fixed (flat targetName → nested nounPhrase
    params); concealment-test story built and its transcript passes 21/21 (was 16/5-blank).
11. N/S Passage → Round Room wired SW; MDL PASS5 + map-connections.md say SOUTH.
12. P10 interceptor registry: **ADR-208 PROPOSED** (2026-07-02) — mirrors ADR-207 for
    the interceptor binding map (world-owned, idempotent, guard-free); full consumer
    survey included (11 stdlib readers, engine introspection ×2, dungeo ×15 guarded
    sites); awaiting acceptance.

## Next Phase
- **Phase 5**: End-to-End Verification (Medium, 250 tool calls) — pack/overlay the
  workspace-built `@sharpee/*` packages into a scratchpad copy of familyzoo v2.0.0 in place
  of its published-package resolution, run `sharpee build --test` with `entry: ch23`
  (v16-scoring, expect 75/75 / AC-6), re-run both familyzoo-relevant suites + friendly-zoo,
  and close out the AC-1..AC-10 matrix (AC-8 end-to-end via the overlay's real dual-instance
  resolution path). Note: devkit's entry-selection fix (familyzoo-v2-migration session
  3c69ac) already threads `entry:` headers, so the prior 196/197 harness gap is closed.
- **Entry state met**: all stories/tutorials in scope build (dungeo, friendly-zoo,
  channel-service-test in-workspace; familyzoo v2.0.0 type-clean); walkthrough/unit suites
  at parity with the pre-ADR-207 baseline.

## Open Items

### Short Term
- Phases 3-5 remain (lifecycle cleanup; story registration migration across
  dungeo/familyzoo v1.5.0+v2.0.0/friendly-zoo; end-to-end verification vs published packages).
- Stories/tutorials still expectedly fail to build until Phase 4 — intentional per the plan's
  Design note, not a regression.

### Long Term
- Interceptor registry (`globalThis`) shares the defect ADR-207 fixes for capability
  bindings — candidate follow-up ADR.
- Phase 5 AC-6 requires validation against published `@sharpee/*@2.0.x` packages via a
  scratchpad overlay/pack harness.

## Files Modified

**World-model** (2 files):
- `packages/world-model/src/world/WorldModel.ts` - `IWorldModel.getAllCapabilityBindings()` + impl
- `packages/world-model/src/world/AuthorModel.ts` - delegate

**Engine** (3 files):
- `packages/engine/src/capability-dispatch-helper.ts` - `world` param threaded; per-world lookup
- `packages/engine/src/command-executor.ts` - pass `world` at both dispatch-check call sites
- `packages/engine/src/game-engine.ts` - introspection loops use `this.world.getAllCapabilityBindings()`

**Stdlib** (5 files):
- `packages/stdlib/src/actions/capability-dispatch.ts` - `context.world.getBehaviorForCapability`
- `packages/stdlib/src/actions/standard/giving/giving.ts` - same
- `packages/stdlib/src/actions/standard/throwing/throwing.ts` - same
- `packages/stdlib/src/actions/standard/raising/raising.ts` - doc comment only
- `packages/stdlib/src/actions/standard/lowering/lowering.ts` - doc comments only

**Tests** (2 files):
- `packages/engine/tests/universal-capability-dispatch.test.ts` - rewritten per-world + AC-8 dual-instance test
- `packages/stdlib/tests/unit/actions/hiding-golden.test.ts` - Phase 1 leftover fix (world arg)

**Phase 3** (4 files):
- `packages/transcript-tester/src/cli.ts` - pre-loop load only in chain mode
- `packages/devkit/src/standalone/build.ts` - chain load only when walkthroughs exist
- `scripts/bundle-entry.js` - same fix in the bundle CLI (site discovered beyond plan); bundle rebuilt
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` - +2 getAllCapabilityBindings tests

**Phase 4** (8 files):
- `stories/dungeo/src/index.ts` - 6 guard sites → world.*, dead imports removed
- `stories/friendly-zoo/src/index.ts` - guard + pettingAction lookup migrated
- `tutorials/familyzoo/v2.0.0/src/ch15-capability-dispatch.ts` - imports/lookup/registration + teaching prose
- `tutorials/familyzoo/v2.0.0/src/ch20-npcs.ts` - same
- `tutorials/familyzoo/v2.0.0/src/ch22-timed-events.ts` - imports/lookup/registration
- `tutorials/familyzoo/v2.0.0/src/ch23-scoring.ts` - same
- `tutorials/familyzoo/v2.0.0/src/ch24-27-presentation/index.ts` - same
- `tutorials/familyzoo/v2.0.0/src/ch28-multi-file/index.ts` - same
- (familyzoo v1.5.0: intentionally untouched — frozen ^1.5.0 edition)

**Docs** (2 files):
- `docs/work/adr-207-capability-registry/plan.md` - Phases 2-4 → DONE, Phase 5 → CURRENT
- `docs/context/session-20260702-1344-v2_familyzoo_split.md` - this file

## Notes

**Verification**: `pnpm --filter '@sharpee/world-model' build` / `'@sharpee/stdlib' build` /
`'@sharpee/engine' build` all clean, in dependency order. Test suites: world-model 66 files /
1299 passed / 10 skipped; stdlib 70 files / 1291 passed / 27 skipped; engine 41 files /
459 passed / 7 skipped. Exit-state grep confirms no free-function capability call remains in
`packages/engine` or `packages/stdlib` (source or tests) — every reference goes through a
`world` instance.

**One test-fix iteration**: the first full stdlib run failed 2 tests in hiding-golden.test.ts
(the Phase 1 leftover above). Fixed the missing `world` argument, re-ran the file, then the
full suite — all green. No other retry loops.

---

## Session Metadata

- **Status**: DONE — PAUSED at a clean checkpoint. This session: ADR-207 Phases 2-4
  implemented; dungeo regression suite driven to deterministic-green (~1690 assertions;
  walkthrough chain green under the user-confirmed one-good-run rule); platform findings
  P1-P9 all RESOLVED per user direction (P1 fully-qualified messageId requirement,
  P2 light-reveal transform, P3 standard Help/About + StoryInfo auto-creation,
  P4 platform-event prose rendering, P5 unified params binding + ADR-206 amendment,
  P6 registerCapability live-return/deep-copy + dc.ts WeakMap, P7 take-all message,
  P8 ADR-148 concealment wiring [The Alderman spy mechanic], P9 verbatim templates);
  **ADR-208 ACCEPTED + planned** (plan-review clean after key-name fix). REMAINING:
  ADR-208 implementation (Phases 1-3, awaiting go-ahead; .current-plan points at it),
  then ADR-207 Phase 5 (published-package overlay, covers both migrations), plus minor
  open items: dungeo SW-vs-SOUTH map deviation, ADR-206 CI guard test, familyzoo book
  v2.0.0 content updates for the new capability API prose.
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): ~1 session (Phase 5, per plan budget: 250 tool calls)
- **Rollback Safety**: safe to revert together with Phase 1 (reverting Phase 2 alone would restore imports of free functions Phase 1 deleted — engine/stdlib would not build)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 complete (per-world binding map unit-tested; world-model 1299 green at entry). User go-ahead for Phase 2 given explicitly ("phase 2").
- **Prerequisites discovered**: `game-engine.ts` introspection needed a per-world enumeration method that Phase 1 had not provided — added `IWorldModel.getAllCapabilityBindings()` (see Key Decisions).

## Architectural Decisions

- ADR-207 implementation continued: consumer-side migration done; AC-8 now has its unit-level
  proof (dual module copies resolving through one world instance).
- No change to the ADR-090 dispatch contract (`validate/execute/report/blocked`,
  `findTraitWithCapability`, resolution/priority semantics) — lookup mechanism only.

## Mutation Audit

- Files with state-changing logic modified: none gained or changed mutations. The changes are
  lookup-mechanism swaps (reads) plus signature threading; `getAllCapabilityBindings` is a
  read-only view. Behavior `execute()` delegation paths are byte-identical in semantics.
- Tests verify actual state mutations: pre-existing dispatch tests assert on
  `sharedData.executed`/behavior-phase effects as before; hiding-golden end-to-end tests
  assert on `ConcealedStateTrait` presence and `VisibilityBehavior.canSee` outcomes against a
  real world.

## Recurrence Check

- Similar to past issue? YES in one narrow sense — the hiding-golden fix is the second session
  in a row touching that file for per-world migration (Phase 1 rewrote it, missed the two
  end-to-end call sites). Contained to the same coordinated migration, not a new pattern.

## Test Coverage Delta

- Tests added: +2 in engine's universal-capability-dispatch.test.ts (per-world isolation;
  AC-8 dual-instance). 13 existing tests in that file migrated to per-world registration.
- Tests passing before: engine suite did not compile at entry (expected Phase 1 breakage) →
  after: 459 passed / 7 skipped. Stdlib: 2 failing (hiding-golden e2e) → 1291 passed.
  World-model: 1299 passed (unchanged, plus new enumeration method exercised via engine tests).
- Known untested areas: story registration migration (Phase 4) and published-package
  resolution path (Phase 5 / AC-6) remain uncovered by design.

---

**Progressive update**: Session completed 2026-07-02 ~13:55
