# ADR-227: Death Triggers Use the Prescribed Logic Surfaces — no new mechanism

## Status: ACCEPTED (2026-07-16 — all three open questions resolved via interview, accepted by David) — child of ADR-224

## Date: 2026-07-16

> Child of ADR-224 (Conditional/Hazard Death). ADR-224 built the `killPlayer`
> primitive + canonical event but **deferred the trigger shapes** to
> "interceptor/daemon patterns... an implementation-plan decision" (Decision 3,
> Q-4). Implementing Dungeo's Phase-4 migration against that deferral produced 15
> **bespoke per-site `killPlayer` calls** — correct, but not Chord-mirrorable. An
> earlier draft of this ADR over-corrected by inventing two *new* mechanisms (a
> "death-rule registry" and a "hazard-fuse factory"), which violates CLAUDE.md's
> "Always Trust the Architecture." This ADR replaces both errors with the rule
> below. Grounding: `docs/work/player-death/if-centric-death-triggers-design.md`.

## Context

`killPlayer(world, player, {cause, messageId, terminal})` (ADR-224) is the single
mortality **sink** and is built. The open question was only: *how does a death get
triggered?* The answer is not a new abstraction — Sharpee already prescribes the
ways logic attaches. Verified against the live registration surface
(`WorldModel`, the engine, the ADR-120 plugins), the complete set is:

| Surface | Attach point | ADR | Purpose |
|---|---|---|---|
| Trait + Behavior | `entity.add(Trait)` + behavior | — | entity data + mutations (behaviors own state changes) |
| Action (four-phase) | story/stdlib action registry | 051 | player verbs |
| Capability Dispatch | `WorldModel.registerCapabilityBehavior` | 090 | entity-specific meaning of a generic verb |
| Action Interceptor | `WorldModel.registerActionInterceptor` | 118/208 | hook/block/redirect a standard action's phases |
| Event Handler | `WorldModel.registerEventHandler` / `chainEvent` | 052 | **react** to an already-emitted event (additive, cannot prevent the action) |
| ParsedCommandTransformer | `engine.registerParsedCommandTransformer` | — | rewrite the parsed command pre-validate |
| Plugin: Scheduler | `plugin-scheduler` | 071/120 | daemons / fuses (timed, per-turn) |
| Plugin: State Machine | `plugin-state-machine` | 119/120 | declarative state / policy |
| Plugin: NPC | `plugin-npc` | 070/120 | NPC turns / combat resolver |

Two facts fix the design: (1) **event handlers are reactions**, not primary
triggers (`core-concepts.md:357,380`; ADR-052) — a death that *is* the meaning of a
verb-on-an-entity belongs in Capability Dispatch or an Interceptor, not an
event-handler; and (2) an interceptor can *control/block* an action, which a death
trigger often must, whereas an event handler only fires after the action already
succeeded.

## Decision

**Every death trigger is one of the prescribed surfaces above calling `killPlayer`.
No new platform mechanism is introduced.** The choice of surface per site is the
ADR-090 decision tree, not an ad-hoc call. Policy (reincarnation, −10 penalty,
die-twice) stays a **State Machine** keyed off the canonical event (ADR-224
Decision 4; Dungeo's `death-penalty-machine` already does this).

1. **The sink.** `killPlayer` is the single death primitive (ADR-224, built). No
   trigger hand-mutates a dead flag or hand-emits a death event; each calls
   `killPlayer(cause, messageId, terminal:true)`.

2. **The triggers = the prescribed surfaces, chosen by the ADR-090 tree**:

   | Death | Correct surface | Rationale |
   |---|---|---|
   | Falls (verb-allowlist room) | **Trait+Behavior** (`DeadlyRoomTrait`) via the ParsedCommandTransformer (built, ADR-224 Phase 2) | location + verb-allowlist |
   | Cake eat/throw | **Capability Dispatch** (cake owns the verb's lethal meaning) | eating *this* entity means something entity-specific — not an additive reaction (re-home from today's `chainEvent` event handler) |
   | Melt-glacier, say-echo, pray-basin | **Story Action** | the verb itself is story-owned |
   | Gas-room entry (+flame), sphere/cage, grue-on-move | **Action Interceptor** | must block/redirect a standard action (`going`/`taking`), not merely react |
   | Cage-poison, balloon, flooding, explosion | **Scheduler plugin** (daemon/fuse) | timed / per-turn |
   | Troll/cyclops melee | **NPC plugin** combat-resolver seam | NPC→PC lethal blow |
   | Reincarnation, −10, die-twice | **State Machine plugin** | policy, keyed off `if.event.player.died` |

3. **No new primitive.** The earlier draft's "death-rule registry" and
   "`createHazardFuse` factory" are **rejected**: the first duplicates the surfaces
   above; the second duplicates the scheduler. If the four timed-hazard daemons
   warrant DRY, that is an ordinary shared helper *over the existing scheduler*, not
   a new mechanism or trait — an implementation nicety, not an ADR-level construct.

4. **Chord parity adds three authoring constructs, all in the current Chord idiom,
   all lowering to the surfaces above** — no new Chord mechanism. Idiom (grounded in
   `cloak.story`/`zoo.story`): the death text is always a **`phrase <key>`** (text in
   `define phrases`), never an inline string; conditions are **positive** (no `not` —
   absence via `without`/`no <cond>`/antonym states); probability is **`one chance in
   <n>`**. The death **cause** is *not* a required Chord field (cloak's `win`/`lose`
   carry none) — the platform derives/defaults it; the authored "why" is carried by
   the phrase and the construct itself.
   - **`kill the player`** — a bare statement (peer to `win`/`lose`), paired with a
     preceding `phrase <key>` for the death text, dropped inside Chord's *existing*
     clause forms, which already lower to the right surface: an `on`/`after <action>`
     clause → capability-dispatch/interceptor; an `on every turn [while <cond>]`
     clause → daemon. Lowers to `killPlayer` instead of `triggerEnding`, reusing
     Chord's per-turn `evalCondition` seam and `IRCondition` model unchanged.
   - **`<direction> is deadly: <phrase>`** — a deadly *exit*: going that way takes the
     player to their death. Mirrors cloak's `<direction> is blocked: <phrase>`
     exactly. This is the **common** case and it reads self-evidently *why* (Aragain
     Falls: `south is deadly: falls-death` — over the falls); the player retreats
     another way. Lowers to a `going`-interceptor calling `killPlayer`.
   - **`deadly: <phrase>`** — a room marker for the *rare no-escape position* where
     any action but `looking`/`examining` is fatal (the MDL `OVER-FALLS` shape) →
     `DeadlyRoomTrait` (`safeVerbs` default to look/examine; a `TRAIT_ADJECTIVES`
     entry + `applyTraitAdjectives` case). Its "why" **is** that you are somewhere no
     action can save you — reserved for genuinely inescapable spots, not a generic
     hazard flag.

5. **Combat sink.** The NPC→PC lethal branch calls `killPlayer({cause:'combat'})`.
   Dungeo's melee already does. The one platform gap: migrate the basic-combat
   extension's `basicNpcResolver` from legacy `if.event.death` to `killPlayer`
   (`extensions/basic-combat/src/basic-npc-resolver.ts:108-119`). Full *authorable*
   combat (the `use combat` vocabulary/manifest, ADR-215) is a separable capability,
   deferred — death routes through `killPlayer` regardless of the combat engine.

## Consequences

- **The 15 bespoke Dungeo sites re-home onto their correct prescribed surface** (per
  the Decision 2 table), each calling `killPlayer`. The Phase-4 migration's raw
  re-points are the interim; this is the architecturally-correct end state.
- **Transform-on-use deaths: mechanism follows the ADR-090 tree** (resolved). When
  using a verb on an entity *is* the death, the entity owns the verb's lethal meaning
  and its handler's `execute` does the full outcome (consume/transform + `killPlayer`),
  never an event-handler reaction layered on standard use. Which surface depends on
  the verb: a **standard verb overridden per-entity → Capability Dispatch** (eat the
  orange cake — `eat` is a stdlib verb the cake overrides; Chord's `on <action> it`
  lowers here; cake moves off today's `chainEvent`); a **story-specific verb → its
  Story Action** (melt the glacier — `melt` is a glacier-only story verb, so its
  lethal branch already lives in `melt-action`, calling `killPlayer`). This is the
  precedent for every verb-on-entity that transforms or kills.
- **Standard darkness only blinds — grue is story-specific** (resolved): the
  platform's darkness model makes the player unable to *see*, never dead. Zork's grue
  (act in the dark → ~75% death) is Dungeo-authored — a story daemon/interceptor doing
  a seeded darkness check → `killPlayer({cause:'grue'})`. The platform ships **no**
  darkness-death rule; `DeadlyRoomTrait.chance` keeps only its "specific probabilistic
  deadly room" purpose. (A future Chord port authoring grue would meet Chord's `one
  chance in <n>` numerator limit for 3-in-4 odds — a separate Chord-grammar matter,
  out of scope here.)
- **Falls is a deadly *exit*, not a deadly room** (grounded in MDL `FALLS-ROOM`/
  `OVER-FALLS`, act2.mud:203,292): Aragain Falls keeps its normal north retreat;
  only going *over* the falls (south) is fatal. Today's `falls-death-handler` also
  kills on `wait`/`take`/`inventory` — over-implementation to drop in the re-home
  (`<direction> is deadly`). The true any-action-but-look room is the separate MDL
  `OVER-FALLS` no-escape spot.
- **Dungeo→Chord port becomes mechanical**: each surface has a Chord authoring form
  (traits ← adjective markers, interceptors/capability ← `after <action>` clauses,
  daemons ← `on every turn`, policy ← state machines), and death is expressed by the
  two constructs in Decision 4.
- **No new world-model/stdlib API.** Platform changes are confined to `story-loader`
  + `chord` (the `deadly` marker + `kill the player` statement lowering) and the
  `@sharpee/ext-basic-combat` extension (the `basicNpcResolver` fix) — all under
  CLAUDE.md's gate. No code authorized by this ADR.
- **Behavior change in basic-combat**: a player killed by a basic-combat NPC dies
  terminally via the engine routing (ADR-224) instead of an unrouted
  `if.event.death`. Low risk — that player path was never routed.

## Acceptance Criteria

Inherits ADR-214 AC-1..4 (parity, both Ways) and ADR-224's ACs.

- **AC-1 (parity).** Chord `kill the player when <cond>` and the equivalent
  Sharpee-Way surface produce identical behavior on the same fixture — emit
  `if.event.player.died{cause}`, route to game-over.
- **AC-2 (correct mechanism, no hand-rolling).** After migration, no death site
  hand-mutates a dead flag or hand-emits a death event, and none uses an event
  handler as a primary trigger; each uses its ADR-090-correct surface calling
  `killPlayer`. Verified by grep + the Dungeo suite.
- **AC-3 (deadly exit + deadly room).** `<direction> is deadly: <phrase>` kills only
  on that exit (the player can leave another way); `deadly: <phrase>` (no-escape room)
  kills on any verb but `looking`/`examining` (safeVerbs default) == `DeadlyRoomTrait`
  (inherits ADR-224 AC-2). Both emit `if.event.player.died` via `killPlayer`.
- **AC-4 (timed hazards stay daemons).** Timed-hazard deaths remain scheduler
  daemons/fuses that call `killPlayer`; deterministic under a fixed seed (no
  `Math.random()`); an armed countdown survives save/restore via the scheduler's
  existing `getRunnerState`/`restoreRunnerState`.
- **AC-5 (combat sink).** A basic-combat NPC lethal blow on the player emits
  `if.event.player.died{cause:'combat'}` and routes to game-over — not legacy
  `if.event.death`.

## Session

Session 23678a (2026-07-16). Follows the Dungeo ADR-224 Phase-4 migration (this
session), which revealed the bespoke-wiring problem, and a design dialogue that
verified the prescribed logic surfaces and corrected the event-handler
classification. Parent: ADR-224. Coordinates with ADR-090 (capability dispatch),
ADR-052 (event handlers), ADR-118/208 (interceptors), ADR-119/120 (plugins),
ADR-217 (Chord timers), ADR-215/072 (combat), ADR-226 (HealthTrait), ADR-214
(parity). Memory: `raise-sharpee-api-gaps-for-chord`, `sharpee-chord-parity-goal`,
`chord-as-elegance-oracle`, `two-edicts`.
