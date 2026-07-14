# Session Plan: chord-212-213-seams — the ADR-212/213 Platform Prerequisite Package

**PLAN ONLY. No implementation happens from this document by itself.**
**Implementation starts only on David's explicit go-ahead per phase** — this is
platform work (`packages/`), which CLAUDE.md requires discussing with David
before implementation begins. This plan is that discussion artifact.

**This package sits BETWEEN `chord-211-core` (currently CURRENT per
`.current-plan`) and `chord-zoo-surfaces` (package 2 of the CP7' split).**
It is not itself the active plan — `.current-plan` is deliberately left
pointing at `chord-211-core` (see Sequencing below) — but `chord-zoo-surfaces`
Phase 3 has a hard, explicit prerequisite on this package landing first
(`docs/work/chord-zoo-surfaces/plan.md` Phase 3 entry state and closing note).

**Created**: 2026-07-14
**Overall scope**: Land the two platform seams ADR-212 and ADR-213 mint —
engine's declarative slot-entry registry (`SlotEntry`/`SlotEntryGate`,
`registerSlotEntry`, one built-in staging-pass contributor) and world-model's
pre-removal observer seam (`EntityRemovalObserver`, `onEntityRemoved`, hooked
into `removeEntity` before mutation) — then migrate friendly-zoo's hand-rolled
occupant-presence closure onto the new registry (ADR-212 Q3, in-package,
byte-identical). Both seams are additive: today nothing calls
`registerSlotEntry` or `onEntityRemoved`, so every existing call site and
every existing story is unaffected until something opts in. No Chord grammar,
no story-loader work, and no `remove` statement land here — those are
`chord-zoo-surfaces` Phase 3 (ADR-213 §4/Q3) and ride this package's output.
**Bounded contexts touched**: `engine` (prose pipeline — the `SlotEntry`
registry and staging-pass evaluator; `GameEngine` delegation), `world-model`
(the `removeEntity` choke point and its new observer seam), `stories/friendly-zoo`
(migrate the occupant-presence closure to four `registerSlotEntry` calls).
Anything outside this list is a stop-and-discuss checkpoint per CLAUDE.md.
**Key domain language**: slot entry (a declarative `(slotKey, owner) →
{content, order, gate, counterKey}` record — data in, prose out), owner
(the entity a slot entry describes and whose counter keyspace its `Choice`
content uses), owner-present gate (the default gate: owner shares the
player's containing room at staging time), removal observer (a function
invoked once, synchronously, inside `removeEntity`, before the entity is
deleted, with the live entity and its last containing room), witnessed
(the player's containing room equals the entity's last containing room at
the moment of the transition — a `chord-zoo-surfaces` concept this package's
seam exists to serve, not one this package itself implements).

## References consulted

- `docs/architecture/adrs/adr-212-slot-contributions-as-data.md` (ACCEPTED
  2026-07-13) — the declarative slot-entry registry this package implements
  in full except AC-6 (Chord compile target, rides `chord-zoo-surfaces`):
  `(slotKey, owner)` keying, idempotent-last-wins, the two-member
  `SlotEntryGate` union shipping now (Q1), the registry living in the
  engine's prose pipeline (Q2), friendly-zoo's migration landing in this
  package (Q3), no key validation (Q4).
- `docs/architecture/adrs/adr-213-removed-from-play-signal.md` (ACCEPTED
  2026-07-13) — the pre-removal observer seam this package implements in
  full except AC-2/3/6 (loader wiring + the `remove` statement, ride
  `chord-zoo-surfaces` Phase 3): pre-deletion live entity (Q1), seam only
  — no `if.event.removed` (Q2), orphaning stays unsignaled (Q4).
- `docs/work/chord-211-core/plan.md` — the sibling prerequisite package
  (package 1 of CP7'), read as this plan's format precedent and to confirm
  file/package non-overlap for the sequencing question below. Its
  touched-file list (`if-domain/src/phrase.ts`, `lang-en-us` Assembler,
  `stdlib/src/actions/standard/looking/snippet-resolver.ts`,
  `engine/src/snippet-validation.ts`, and dungeo/friendly-zoo/
  concealment-test TS *snippet* entries) shares no file with this
  package's touched list.
- `docs/work/chord-zoo-surfaces/plan.md` — the downstream consumer. Its
  Phase 3 entry state names this package as a hard prerequisite
  ("the ADR-212/213 implementation package (planned separately, like
  `chord-211-core`) has landed") and its AC coverage split (ADR-212 AC-6,
  ADR-213 AC-2/3/6) is the authoritative boundary this plan's own AC
  coverage list mirrors.
- `docs/context/project-profile.md` — build/test conventions this plan's
  exit gates use: `pnpm --filter '@sharpee/<pkg>' test` for unit suites,
  `node dist/cli/sharpee.js --test [--chain]` for transcripts, the
  one-good-run rule for dungeo RNG flakes, TypeScript strict mode
  (`noFallthroughCasesInSwitch` etc.), and the mutation-signature guidance
  for Domain Modeling/Engine work (assert on persisted `WorldModel`
  state/emitted events, not on "didn't throw").
- `docs/context/session-20260713-1314-v2-210-chord-a.md` (most recent
  completed session) — recorded both ADRs as DRAFT with open questions
  and flagged `chord-zoo-surfaces` Phase 3 as needing a re-cut once they
  resolved. Both conditions are now satisfied (ADRs ACCEPTED 2026-07-13;
  Phase 3 re-cut 2026-07-14, confirmed by reading `chord-zoo-surfaces/plan.md`
  directly above) — no open item from that session blocks this plan.

No `docs/ddd/notation.yaml` or `docs/ddd/notation/` directory exists in this
repository, and no `docs/proposals/` directory exists — both reference types
are a graceful no-op.

## Investigation notes (source verification, 2026-07-14)

Every file:line citation below was checked against the current tree (branch
`v2-210-chord-a`). Three findings are worth flagging to David during review;
none block planning.

- **The engine staging pass is the right insertion point and is currently
  empty of any entry-shaped concept.** `packages/engine/src/prose-pipeline/pipeline.ts:120-130`
  stages every registered `SlotContributor` (closures) once per turn, before
  any message realizes; `packages/engine/src/prose-pipeline/types.ts:35`
  defines `SlotContributor = (ctx: RenderContext) => void` and
  `IProsePipeline` (types.ts:46-71) declares `registerSlotContributor`.
  `GameEngine.registerSlotContributor` (`game-engine.ts:1817-1819`) is the
  literal precedent for `GameEngine.registerSlotEntry`. Friendly-zoo's
  presence closure (`stories/friendly-zoo/src/index.ts:312-343`) is the
  *only* registered contributor anywhere in the repo — confirming ADR-212's
  claim that migrating it is a real single-consumer proof, not a
  hypothetical.
- **`WorldModel.removeEntity`'s current shape has a dead branch that matters
  for exactly how the observer seam must be wired.** The live code
  (`WorldModel.ts:818-833`) is:
  ```
  removeEntity(id) {
    const entity = this.entities.get(id);
    if (!entity) return false;
    this.spatialIndex.remove(id);          // <- clears id's parent pointer too
    const location = this.getLocation(id); // <- now always undefined
    if (location) { this.moveEntity(id, null); }  // <- dead branch, never fires
    return this.entities.delete(id);
  }
  ```
  `SpatialIndex.remove` (`SpatialIndex.ts:36-52`) deletes `id`'s
  `childToParent` entry as its first step ("remove as child from its
  parent"), so the subsequent `getLocation(id)` call always returns
  `undefined` and the `moveEntity(id, null)` branch never executes today.
  ADR-213's Q1 implementation note describes the seam as firing "before
  that internal null-move" (citing `WorldModel.ts:828-830`) — the *intent*
  (capture the room before any detach mutation) is correct and is exactly
  what this package implements, but the literal null-move it references is
  already inert, not a live behavior this package needs to preserve or
  route around. The correct fix is simpler than the ADR's framing suggests:
  capture `lastRoomId` via `this.getContainingRoom(id)?.id ?? null` as the
  *first* statement in the method (before `spatialIndex.remove`), invoke
  observers, then run the existing three lines unchanged. The dead branch
  itself is left untouched — flagged for David, not silently removed (same
  posture 211-core used for its own stale-comment finding).
- **`registerSlotEntry`/`onEntityRemoved` are session-lifetime registrations,
  not restore-time ones — the CLI's in-game RESTORE does not re-invoke
  `onEngineReady`.** `GameEngine.loadSaveData` (`game-engine.ts:2011-2032`,
  called from both `restore()` and the platform-operation RESTORE path)
  deserializes save data into the *existing* `this.world` instance via
  `saveRestoreService.loadSaveData` and never calls `setStory` or
  `story.onEngineReady` again — so the same `ProsePipeline` and `WorldModel`
  objects (and therefore the same `slotEntries` map and `removalObservers`
  array) persist across an in-game RESTORE untouched. "Re-register every
  story load" (both ADRs) refers to a fresh *process* starting the story
  (the one real `onEngineReady` call), not to the in-game RESTORE verb —
  `restartGame` (`game-engine.ts:839-876`) is the one path that does clear
  and re-call `setStory`/`onEngineReady`, and that's the "restart" meta
  command, not "restore." This matters for how Phase 1's AC-4 counter test
  must be built: it must exercise a *process-fresh* registration plus a
  restored `textState` capability value (proving the `Choice`'s
  `(entityId, messageKey)` keying survives real save-file serialization),
  not merely an in-process `undo()`/`restore()` call, since the latter
  doesn't touch registration at all and would prove nothing about
  re-registration.
- **Counter keying is the caller's responsibility, not the registry's.**
  `Choice` (`packages/if-domain/src/phrase.ts:251-268`) already carries
  required `entityId`/`messageKey` fields that `selectChoice`/
  `pickChoiceAlternative` (`english-assembler.ts:541-586`) key
  `ctx.textState` reads/writes on directly. ADR-212 §4's `counterKey`
  field is therefore a *documented contract*, not new plumbing: whoever
  constructs a `SlotEntry`'s `Choice` content (friendly-zoo TS in this
  package; the Chord loader in `chord-zoo-surfaces`) must set
  `content.entityId = entry.owner` and `content.messageKey =
  entry.counterKey ?? entry.slotKey` themselves — the built-in contributor
  does not rewrite them. This package's implementation should assert the
  invariant defensively (a dev-time `console.warn`, never a throw, matching
  the render-graceful posture) rather than silently trust it, since a
  mismatch would be a silent double-counter bug. Friendly-zoo's actual
  migration doesn't exercise this at all — its four entries are `Literal`
  content (`{ kind: 'literal', text }`, `index.ts:340`), not `Choice`, so
  AC-4's `Choice`-counter coverage is a new fixture test, not something the
  zoo migration proves incidentally.
- **The predicate gate's `WorldModel` type is a non-issue** — `@sharpee/engine`
  already depends on and imports `WorldModel`/`IFEntity` directly from
  `@sharpee/world-model` in several files (e.g. `action-context-factory.ts:6`,
  `vocabulary-manager.ts:9`, `snippet-validation.ts:19-20`), so
  `SlotEntryGate`'s `{ kind: 'predicate'; holds: (world: WorldModel) =>
  boolean }` member needs no new dependency.

## Sequencing relative to `chord-211-core` (investigated per the task's request)

**Finding: this package is independent of `chord-211-core` — no file or
package overlap exists between the two.** `chord-211-core` touches
`if-domain/src/phrase.ts`, the `lang-en-us` Assembler, `stdlib`'s
`snippet-resolver.ts`, `engine/src/snippet-validation.ts`, and the TS
*snippet*-entry files in dungeo/friendly-zoo (`zoo-items.ts`)/concealment-test
— the room-description marker/`{slot:detail}`/ADR-209 machinery. This package
touches `engine/src/prose-pipeline/{types.ts,pipeline.ts}` and
`engine/src/game-engine.ts` (a different registration method, added near but
not overlapping `registerSlotContributor`), `world-model/src/world/WorldModel.ts`
(untouched by `chord-211-core`), and `stories/friendly-zoo/src/index.ts` (the
presence-contributor file — `chord-211-core` only touches `zoo-items.ts` in
that story). ADR-212 itself states the boundary structurally: "world-model /
stdlib / lang-en-us: no change. `{slot:detail}`'s `__slots__` path is out of
scope." **This package may land before, after, or interleaved with
`chord-211-core`'s phases** — there is no ordering dependency in either
direction. It MUST land before `chord-zoo-surfaces` Phase 3 regardless
(that plan's explicit, already-recorded hard prerequisite).
`.current-plan` is intentionally left pointing at `chord-211-core` per the
task's instruction; this plan does not compete for "current" status.

## Phases

### Phase 1: ADR-212 — the engine slot-entry registry
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `engine` prose pipeline — the declarative slot-entry
  registry sitting beside the existing `SlotContributor` staging pass it
  shares a turn-scoped evaluation moment with.
- **Entry state**: ADR-212 ACCEPTED. `packages/engine/src/prose-pipeline/pipeline.ts:120-130`
  stages registered `SlotContributor` closures once per turn; no entry
  concept exists. `packages/engine/src/prose-pipeline/types.ts:35,46-71`
  defines `SlotContributor`/`IProsePipeline` with `registerSlotContributor`
  only. `GameEngine.registerSlotContributor` (`game-engine.ts:1817-1819`) is
  the delegation precedent. No caller anywhere registers a slot entry yet
  (the type doesn't exist), so this phase changes zero runtime behavior for
  any existing story.
- **Deliverable**:
  - `SlotEntry`/`SlotEntryGate` types added to
    `packages/engine/src/prose-pipeline/types.ts` (or a co-located new file
    in the same directory, implementer's call) per ADR-212 §1-2 verbatim:
    `{ slotKey, owner, content: Phrase, order?, gate?: SlotEntryGate,
    counterKey? }`; `SlotEntryGate = { kind: 'owner-present' } | { kind:
    'predicate'; holds: (world: WorldModel) => boolean }`. `IProsePipeline`
    gains `registerSlotEntry(entry: SlotEntry): void`.
  - `ProsePipeline` (`pipeline.ts`) gains a `Map<string, SlotEntry>` field
    keyed `` `${slotKey}\0${owner}` `` (the `selectChoice` memo-key
    precedent, `english-assembler.ts:541`) and a `registerSlotEntry` method
    that does `map.set(key, entry)` — last-wins, satisfying AC-7 structurally
    (a second registration with the same key silently replaces the first;
    add a unit test that proves it, since "Map.set overwrites" is the whole
    mechanism and deserves a named test, not just trust in the data
    structure).
  - The staging step: inside `processTurn`, immediately before (or folded
    into, implementer's call — the ordering constraint is what matters, not
    the code shape) the existing `for (const contributor of
    this.slotContributors)` loop at `pipeline.ts:127-129`, evaluate every
    registered entry: for each, resolve the gate (`owner-present` default —
    `staging.world.getContainingRoom(entry.owner)?.id ===
    staging.world.getContainingRoom(playerId)?.id`, the same transitive
    check friendly-zoo's own closure performs at `index.ts:333-337`, reusing
    the render-context's `ctx.world`/`ctx.narrative.playerId` exactly as
    that closure does — no separate raw-`WorldModel` gate check needed for
    the default case; `predicate` gate — call `entry.gate.holds(this.world)`
    against the raw `WorldModelLike` the pipeline already holds) and, if it
    holds, `staging.contribute(entry.slotKey, entry.content, { order:
    entry.order })`. Platform entries run before story-registered
    `SlotContributor` closures (ADR-212 Interface contracts: "platform
    entries first, then closures in registration order") — implement this
    by running the entry-staging block before the existing contributor loop,
    which the code shape above already guarantees; add a unit test proving
    the ordering with one entry and one contributor targeting the same
    `slotKey`.
  - An owner that no longer exists (`getContainingRoom` on a removed id
    returns `undefined` per the Investigation notes above — no special-case
    code needed) naturally contributes nothing and never throws (AC-3); add
    a unit test pinning this explicitly rather than relying on the
    incidental correctness, since a future change to `getContainingRoom`
    could silently break it.
  - `GameEngine.registerSlotEntry(entry: SlotEntry): void {
    this.textService?.registerSlotEntry(entry); }` added next to
    `registerSlotContributor` (`game-engine.ts:1817-1819`), same
    no-op-if-uninitialized posture.
  - Defensive counter-key assertion (Investigation notes, "Counter keying"
    finding): when `entry.content.kind === 'choice'`, a dev-time
    `console.warn` (never a throw) if `content.entityId !== entry.owner` or
    `content.messageKey !== (entry.counterKey ?? entry.slotKey)` — documents
    and guards the caller contract without changing behavior for a caller
    that gets it right.
- **Tests** (`pnpm --filter '@sharpee/engine' test`): AC-2 (owner absent from
  player's room contributes nothing, slot renders clean), AC-3 (owner id not
  present in a fixture `WorldModelLike` contributes nothing, no throw), AC-4
  (a `Choice`-content fixture entry: counter advances keyed
  `(owner, counterKey)`, persists through a fixture `TextStateStore`
  round-trip proving save-file-shaped persistence — per the Investigation
  notes, this must construct a *fresh* `ProsePipeline` + re-register the
  entry against a `TextStateStore` pre-loaded with a prior counter value,
  not call `undo()`/`restore()`), AC-5 (predicate gate fixture: holds→
  contributes, doesn't hold→nothing; nothing gate-shaped is ever read by a
  serialization boundary because nothing here is serialized at all — assert
  by construction, not by a save/load round-trip), AC-7 (re-registering the
  same `(slotKey, owner)` replaces — one contribution, not two), the
  platform-before-closures ordering test above.
- **Exit state**: `pnpm --filter '@sharpee/engine' test` green. Zero runtime
  behavior change for any existing story — nothing calls `registerSlotEntry`
  yet (friendly-zoo's migration is Phase 3). Committable on its own.
- **Status**: DONE (2026-07-14 — engine suite 501 pass/7 skip including 14
  new slot-entry tests; engine tsc clean. `.current-plan` repointed to this
  plan at implementation start, `chord-211-core` being PACKAGE COMPLETE.)

### Phase 2: ADR-213 — the world-model removal observer seam
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: `world-model` — the one removal choke point gains a
  pre-deletion notification, independent of Phase 1 (different package,
  no shared code — see Sequencing note; may be done before, after, or
  interleaved with Phase 1).
- **Entry state**: ADR-213 ACCEPTED. `WorldModel.removeEntity`
  (`WorldModel.ts:818-833`) is a silent mutation exactly as described in
  the Investigation notes above (including the dead null-move branch). The
  `IWorldModel` interface declares `removeEntity(id: string): boolean;` at
  `WorldModel.ts:319` with no removal-observer concept anywhere.
  `AuthorModel.removeEntity` (`AuthorModel.ts:166-167`) is a bare
  pass-through (`return this.worldModel.removeEntity(id);`).
- **Deliverable**:
  - `EntityRemovalObserver = (entity: IFEntity, lastRoomId: string | null)
    => void` type, exported from `WorldModel.ts` (or a co-located types
    file, implementer's call — follow whatever the file already does for
    similar small exported types).
  - `IWorldModel` gains `onEntityRemoved(observer: EntityRemovalObserver):
    void;` (declared beside `removeEntity` at `WorldModel.ts:319`).
    `WorldModel` implements it: a private `removalObservers:
    EntityRemovalObserver[] = []` array; `onEntityRemoved` pushes
    (registration order, in-memory, nothing serialized — matches the
    ADR-211 gate seam and ADR-212 registry lifecycle contract).
  - `removeEntity` (`WorldModel.ts:818-833`) reordered: capture
    `const lastRoomId = this.getContainingRoom(id)?.id ?? null;` as the
    first statement after the existence check, then invoke every registered
    observer with `(entity, lastRoomId)` wrapped in an individual try/catch
    (one observer's exception is logged — `console.error`, matching the
    codebase's existing render-graceful/log-loud posture used elsewhere in
    this file — and does not stop the remaining observers from running or
    abort the removal, AC-5), THEN run the three existing lines unchanged
    (`spatialIndex.remove`, the dead `getLocation`/`moveEntity` branch left
    exactly as-is per the Investigation notes, `entities.delete`).
  - `AuthorModel.removeEntity` needs no code change (the pass-through at
    `AuthorModel.ts:166-167` inherits the new behavior automatically) — this
    phase includes a verification step (a test calling `AuthorModel.removeEntity`
    and confirming a registered observer fires), not a code change, per the
    "no code change expected but verify" pattern `chord-211-core` used for
    its own downstream-package checks.
  - A failed removal (unknown id — `removeEntity` returns `false` at the
    existing early-return) invokes no observer (AC-1's negative case) —
    already true by construction since the early return precedes the new
    capture/invoke code; add a test pinning it.
- **Tests** (`pnpm --filter '@sharpee/world-model' test`): AC-1 (observer
  invoked exactly once per successful removal, before deletion — assert the
  entity is still queryable via `getEntity`/traits *inside* the observer
  callback, and gone via `hasEntity` immediately after `removeEntity`
  returns; correct `lastRoomId` including `null` for a locationless entity;
  unknown-id removal invokes nothing), AC-5 (a throwing observer is caught,
  logged, removal still completes, and a *second* registered observer still
  runs — proves isolation between observers, not just non-abort), AC-7
  (`moveEntity(id, null)` directly — orphaning, not removal — invokes no
  observer and the entity remains in `entities`/queryable via `getEntity`).
- **Exit state**: `pnpm --filter '@sharpee/world-model' test` green. Zero
  runtime behavior change for any existing call site — nothing calls
  `onEntityRemoved` yet, so every existing `removeEntity` call (dungeo,
  zoo, penny press, destructible transform) executes identically; this
  phase only adds an always-empty observer list being iterated (a no-op
  loop) until Phase 3 exercises it. Committable on its own.
- **Status**: DONE (2026-07-14 — world-model suite 1330 pass/10 skip including
  8 new observer tests; workspace tsc clean. One deviation from the "no
  AuthorModel code change" expectation: adding `onEntityRemoved` to
  `IWorldModel` forces a one-line pass-through on `AuthorModel`, which
  implements the interface — the `removeEntity` pass-through itself is
  unchanged as planned, and the pass-through test fires observers through
  AuthorModel as specified.)

### Phase 3: friendly-zoo migration (ADR-212 Q3) + combined regression gate
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: `stories/friendly-zoo` — retire the hand-rolled
  occupant-presence closure onto the new declarative registry (proving the
  API on a real TS consumer, ADR-212 §5), then run the full regression this
  package's two additive-but-real seams need before `chord-zoo-surfaces`
  Phase 3 is allowed to start.
- **Entry state**: Phases 1 and 2 both committed and independently green
  (`registerSlotEntry` API available and unit-tested; the removal observer
  seam wired and unit-tested with zero registered observers in production).
  This is the only phase that touches a shipping story, and the only phase
  that proves the two seams together under real turn/render/removal
  pressure rather than in isolated fixtures.
- **Deliverable**:
  - Replace `stories/friendly-zoo/src/index.ts:312-343`'s
    `engine.registerSlotContributor((ctx) => { ... })` closure with four
    `engine.registerSlotEntry(...)` calls, one per occupant
    (`zookeeper`/`parrot`/`goats`/`rabbits`), each: `slotKey: 'here'`,
    `owner: this.characterIds.<occupant>`, `content: { kind: 'literal',
    text: language.getMessage(PresenceMessages.<OCCUPANT>) }` (resolved
    once at `onEngineReady` time — `language` is already in scope at
    `index.ts:322`, matching current per-turn resolution since the language
    provider is static), `order: <same 0-3 as today>` — no `gate` (defaults
    to `owner-present`, which is exactly what the current closure computes
    by hand via `ctx.world.getContainingRoom`), no `counterKey` (content is
    `Literal`, not `Choice` — counter keying doesn't apply to this
    migration; see Investigation notes). Delete the closure and the now-dead
    local `presence` array (`index.ts:323-328`); `PresenceMessages` in
    `stories/friendly-zoo/src/language.ts:45,78-81` stays (still the text
    source, just resolved at a different call site).
  - No change to `zoo.story`, `zoo-items.ts`, or any other friendly-zoo
    file — the dormant `phrase presence:` blocks in `zoo.story` and their
    activation are `chord-zoo-surfaces` Phase 4's job, not this package's.
- **Tests / regression** (run in order; never auto-retry a failure — report
  and wait, per CLAUDE.md):
  - `pnpm --filter '@sharpee/engine' test` and `pnpm --filter
    '@sharpee/world-model' test` — still green (no regression from the
    migration itself, which touches neither package).
  - `./repokit build dungeo` (or whichever repokit invocation covers
    friendly-zoo's build — confirm via `./repokit` usage before assuming;
    same caution `chord-211-core` Phase 4 flagged for its own build-order
    check).
  - `node dist/cli/sharpee.js --test --chain stories/friendly-zoo/walkthroughs/wt-*.transcript`
    — full chain green, **byte-identical** occupant-presence text across
    0/1/N occupants and ordering (ADR-212 AC-1) — the walkthrough chain
    already exercises the petting zoo/aviary rooms where these occupants
    appear, so no new transcript is needed to prove this, only that the
    existing one still passes unedited.
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
    and the dungeo unit transcripts — green (one-good-run rule for
    thief/combat RNG flakes only; do not modify a working transcript). This
    is the ADR-213 AC-4 gate for dungeo's two removal call sites
    (`melee-interceptor.ts:183,185` troll; `:251,253` thief) — both must
    produce byte-identical death narration and world state with the
    observer seam wired in but zero observers registered.
  - Confirm (via the same chain runs, no separate transcript needed) that
    friendly-zoo's other two shipped removal call sites — the zookeeper
    departure daemon (`events.ts:187-210`, wrapped in `removeEntity` at the
    `ctx.world.removeEntity(characters.zookeeper)` call) and the penny
    press (`index.ts:448`, inside the `if.event.put_in` chain handler) —
    still narrate and score identically (ADR-213 AC-4's zoo half). Neither
    call site changes in this phase; this is a regression check on Phase
    2's `removeEntity` reordering, not new code.
  - `DestructibleBehavior.transformTo`'s removal
    (`destructibleBehavior.ts:134`) has no dedicated walkthrough coverage
    identified in this investigation — if no existing transcript exercises
    a destructible transform, flag this to David as a coverage gap rather
    than writing a new transcript unasked (stop-and-discuss: adding
    transcript coverage is in scope for this phase only if David confirms
    it belongs here rather than as separate follow-up).
- **Exit state**: `stories/friendly-zoo/src/index.ts`'s presence closure is
  gone, replaced by four `registerSlotEntry` calls; friendly-zoo walkthrough
  chain green and byte-identical (ADR-212 AC-1); dungeo chain green
  (ADR-213 AC-4, dungeo half); zoo's zookeeper-daemon and penny-press call
  sites confirmed byte-identical (ADR-213 AC-4, zoo half). This is the
  acceptance gate for the whole `chord-212-213-seams` package — once green,
  `chord-zoo-surfaces` Phase 3 may begin.
- **Status**: DONE (2026-07-14 — migration landed; gate green. Evidence:
  engine 501p/7s + world-model 1330p/10s; `./repokit build friendly-zoo`
  clean (NOTE: `build dungeo` does NOT rebuild friendly-zoo's dist — the
  build-order caution this plan flagged was real); zoo.story wt chain 37/37
  unedited (the 2026-07-12 gate — wt chain runs `--story
  stories/friendly-zoo/zoo.story`, NOT the TS story; this plan's "the
  walkthrough chain already exercises" assumption predated that conversion);
  zoo.story atomic 61/61; TS-story transcripts 10/10; AC-1 byte-identity
  proven directly by an A/B diff of the full 5-chapter TS-story chain
  output, closure vs entries — identical except one RNG parrot ambient
  line; dungeo units green (run 2; run 1 had one RNG flake); dungeo wt
  chain 912/912 on run 3 (one-good-run rule; runs 1–2 were documented-family
  RNG cascades: blue-sphere timing, combat). Flagged to David, not fixed:
  (1) `DestructibleBehavior.transformTo` removal still has no transcript
  coverage; (2) no gating transcript asserts the TS story's presence lines
  post-zoo.story-conversion — the A/B diff is the standing evidence.)

## PACKAGE COMPLETE (2026-07-14)

All three phases DONE; the Phase 3 combined gate is green. `chord-zoo-surfaces`
Phase 3 is unblocked.

## AC coverage summary (this package vs. `chord-zoo-surfaces`)

| ADR | AC | Covered here | Rides `chord-zoo-surfaces` |
|-----|----|----|----|
| 212 | AC-1 | Yes — Phase 3 | |
| 212 | AC-2 | Yes — Phase 1 | |
| 212 | AC-3 | Yes — Phase 1 | |
| 212 | AC-4 | Yes — Phase 1 (fixture) | |
| 212 | AC-5 | Yes — Phase 1 | |
| 212 | AC-6 | | Yes — Phase 3 (Chord compile) |
| 212 | AC-7 | Yes — Phase 1 | |
| 213 | AC-1 | Yes — Phase 2 | |
| 213 | AC-2 | | Yes — Phase 3 (`disappeared` narration) |
| 213 | AC-3 | | Yes — Phase 3 (loader re-registration) |
| 213 | AC-4 | Yes — Phase 3 | |
| 213 | AC-5 | Yes — Phase 2 | |
| 213 | AC-6 | | Yes — Phase 3 (`remove` statement) |
| 213 | AC-7 | Yes — Phase 2 | |

## Notes for the implementer

- Never auto-retry a failed build or test (CLAUDE.md) — report and wait for
  explicit go-ahead between phases.
- Platform changes (`packages/`) need David's go-ahead per package before
  implementation starts, per CLAUDE.md's platform-change rule — this plan is
  the proposal; each phase still needs its own explicit "go" before coding.
- Build/test commands: `./repokit build` (full platform + bundle); `node
  dist/cli/sharpee.js --test [--chain] stories/{friendly-zoo,dungeo}/walkthroughs/*.transcript`
  for transcripts; `pnpm --filter '@sharpee/engine' test` / `pnpm --filter
  '@sharpee/world-model' test` for units. Never `2>&1` with pnpm.
- This plan does not update `docs/context/.current-plan` (it stays pointed
  at `chord-211-core`) and does not write `docs/context/.session-state.json`
  — per the task's explicit instruction, this package is a prerequisite
  planned alongside the current package, not a replacement for it. When
  David is ready to start implementation here, the session should either
  resume `chord-211-core` afterward or the pointer should be repointed
  deliberately at that time — this plan takes no position on which.
