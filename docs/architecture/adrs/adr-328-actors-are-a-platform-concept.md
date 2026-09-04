# ADR-328: Actors are a platform concept

**Status**: **ACCEPTED** (David, 2026-08-25, session 8ae644 — "flip ADR-328 to
ACCEPTED"). Accepted as an umbrella: all three open questions were resolved via the
rule-11a interview 2026-08-25 (dissolve NpcService, no compatibility layers; the Chord
acting surface is designed in this program; the voice sweep lands in full, up front),
and `adr-review` passed 12/12 the same day. Direction is David's, ruled
2026-08-25 out of ADR-327's Q-1: *"I think this is a bigger deal than you realize… NPCs
need to be pulled into the platform."* Umbrella-scale: this ADR decides the target model
and the disposition questions; child ADRs/plans carry the phases (the ADR-266 pattern).

**Platform change, umbrella.** Eventual surfaces: `packages/engine` (programmatic
execution entry, actor threading in `CommandExecutor`), `packages/stdlib` (the
`context.player` sweep across the standard actions; `NpcService` disposition; the
PerceptionService's promotion to witness gate), `packages/lang-en-us` + the engine prose
pipeline (person-generic actor voice), `packages/plugin-npc` (dissolves),
`packages/story-loader` (hand-rolled witnessing retires; clause firing gains real
actors), `packages/character` (arbiter output becomes pipeline invocations),
`stories/dungeo` (five NPC behaviors migrate; walkthrough goldens re-pin). Nothing lands
under this ADR itself — it is direction; children implement.

**Date**: 2026-08-25 (session 915e68)
**Analysis**: `docs/work/actor-platform/impact-analysis-20260825.md` — the full
three-layer impact analysis (Sharpee / Chord / Dungeo) this ADR compresses; every code
fact below was verified there, 2026-08-25.
**Related**: [ADR-327](adr-327-explicit-references.md) (actor-explicit clause heads —
ACCEPTED 2026-08-25; its D7 fires named actors on this ADR's D1/D2 path, its D9
`change the player to <entity>` gives ADR-132's `switchPlayer` its first caller), [ADR-325](adr-325-chord-presence-and-duration.md)
(`move` stays authorial teleportation; witness channels unify here),
[ADR-310](adr-310-character-model-in-chord.md)/[ADR-318](adr-318-normative-character-layer.md)
(the normative character layer whose arbiter gains an output pipeline), ADR-069 (PerceptionService — the witness gate),
ADR-158 (entity-valued template params — the mechanism actor voice repeats), ADR-090/228
(capability dispatch and lifecycle slots — already actor-generic in signature),
ADR-070/120 (the NPC-plugin decisions this supersedes in part — amended at acceptance,
per house practice), [ADR-319](adr-319-flashbacks.md) (rotating PC —
the live requirement behind person-generic voice), ADR-293 (per-point streams — what
bounds the determinism churn), ADR-266 (the umbrella pattern this follows)

## Context

The platform already believes in actors — and never let anyone but the player through
the door:

- **Signatures thread an actor everywhere.** Capability behaviors and interceptors take
  `actorId` (ADR-090/228); world-model reachability is `canReach(observerId, targetId)`
  (ADR-273 D4); events carry `entities.actor` (`event-contract.ts:84-93`).
- **The executor accepts an actor and ignores it.** `CommandExecutor` has
  `actorId?: string` (`command-executor.ts:50`) while the flow reads `world.getPlayer()`
  (`:188`) and stamps `context.player?.id` (`:268`).
- **A shadow action system grew beside the door.** `stdlib/src/npc/npc-service.ts` (832
  lines) executes `NpcAction` variants `{move, moveTo, take, drop, attack, speak, emote,
  wait, custom}` (`npc/types.ts:50-59`) through hand-rolled
  `executeMove/Take/Drop/Attack` (`npc-service.ts:558-570`) — no validate, no
  interceptors, no capability dispatch. An NPC take cannot be refused by anything the
  real taking action honors. `plugin-npc` is a 104-line shell over it.
- **The Chord loader does perception's job by hand.** `moveWithLifecycle`
  (`runtime.ts:3915`) mutates and hand-enqueues what the player witnessed; scene-leave
  legality pre-guesses what going would say (`dialogue-selector.ts:305`).
- **Prose is player-voice by convention.** Templates are authored as second-person text
  ("You take {the item}.", `parse-phrase-template.ts:395`).

Chord's side of the seam forced the question: ADR-327 makes clause heads name their
actor (`on the mercenaries taking`), and the runtime has nothing to fire those heads —
only the player ever acts. The core-concepts test runs both directions; this time the
language is right and the platform owes the concept.

## Decision

### D1. One execution path: `(action, actorId)`

Anyone who acts — the player, an NPC, a future rotating PC — runs the same four-phase
action with their own actor id: same validate, same interceptors, same capability
dispatch, same events. The shadow execution surface (`NpcAction` executors) is retired
as an *execution* path; nothing performs a world-mutating verb outside the pipeline.
Authorial mutation (`move`, Chord effects, behaviors called by handlers) remains what it
is — this ADR governs *acting*, not teleportation.

### D2. A programmatic execution entry

NPCs don't parse. The engine gains an entry taking an action id, resolved entities, and
an actor id, running the four phases without the parser. The parse/validate split
already puts actor-relative checks in validate (ADR-231 D2a); the entry threads the
actor and nothing else changes shape. `CommandExecutor`'s dormant `actorId` becomes
live; the 126 `context.player` reads across 49 standard-action files become reads of the
command's actor.

> **Amendment (2026-08-28, session f6b1e5 — Phase 3 shipped).** Two corrections and the
> shape as built. (1) There was no dormant executor `actorId` option: the field the
> 2026-08-25 citation pointed at is `BeforeActionHookData.actorId`, the pre-action hook's
> payload, filled from the player. The actor had to be introduced, and the seam is
> `ActionContext`, not the executor — both context factories baked the player into
> `currentLocation`, every scope helper, `event()`'s `entities.actor`, and `emitSound`.
> (2) The reads do not *become* actor reads by rename: `ActionContext` now carries both
> `actor` (who is acting; every actor-relative helper derives from it) and `player` (the
> player, read only when the logic is genuinely about the player — scoring, second-person
> phrasing). Phase 4's sweep decides per read which of the 126 is which. As built:
> `CommandExecutor.executeAsActor({ actionId, actorId, directObject?, indirectObject?,
> instrument? })` skips parse/transformers/CommandValidator and runs the same private
> `runPhases` as `execute()`, so the pre-action hook, capability dispatch, the four phases,
> and entity-handler reactions are one path; `TurnResult.actorId` names who acted; the
> parser's world-context set stays player-bound because parsing is player-only by
> construction. Pilot action: `taking`, including the ADR-228 lifecycle engine it consults —
> the actor-consultation slot (ADR-327 D1) and every interceptor hook's `actorId` are the
> command's actor, so an interceptor keyed on an NPC fires for that NPC and is told so.
> Real path: `packages/engine/tests/execute-as-actor.test.ts`.

### D3. Perception tags what the player witnesses — the client decides what to show

**Amended 2026-08-26 (David, session 1f4b9f).** As accepted, this decision read "an
NPC-actored event renders only if the player perceives it … unwitnessed NPC action
mutates the world silently." The mutation half stands; the rendering half is replaced:
**perception tags, it never drops.** (David: *"the narration events fire, but with a flag
'elsewhere' or by location and the client decides to show it or not — I could see a
client displaying all actor emissions."*)

- **Every actor-sourced narration event fires, wherever the actor is.** The producer —
  the loader's every-turn daemon, the action pipeline for a D1/D2 actor action, ADR-144
  propagation — stamps two facts on the event beside the existing `narrate` hint
  (`packages/core/src/events/types.ts:73`): `location` (the room it happened in) and
  `presence: 'present' | 'absent' | 'concealed'`, ADR-144's own vocabulary
  (`packages/character/src/propagation/visibility.ts:20`), computed at emit time from the
  PerceptionService — whether the PC perceived it is an engine fact, not a client guess.
- **The prose pipeline renders everything** and copies `location` and `presence` onto
  the `ITextBlock`; the channel packet carries them (ADR-163 — channels carry every
  story→UI signal). One attribute on the existing `narrative` blocks, not a new channel.
- **Presentation is the client's.** The default renderer shows `present` and
  `concealed` and hides `absent`; the IDE's Play panel (and any author-customised
  client) may show all actor emissions, labelled by location. transcript-tester renders
  through the default, so hand-authored transcripts keep their meaning; an omniscient
  mode is available for testing NPC behaviour off-stage.
- **ADR-069 darkness stays a transform** (`if.event.perception.blocked`,
  `stdlib/src/services/PerceptionService.ts:252`): the player is present and cannot
  see — a different fact from absent.
- **The Phase C "decision 10" firing gate is retired.** The chord-zoo ownership package
  (`docs/work/chord/phase-c-ownership-proposal.md:240`, grammar-changes D11,
  2026-07-11) made entity-owned `on every turn` clauses *performances* — no audience,
  no firing (`story-loader/src/runtime.ts:3270`, `:3327`, `:3486`). That contradicts
  ADR-144 (absent → offscreen, state mutation only) and the actor model here: a former
  PC's dormant daemons must run while the current PC is elsewhere, or the character
  freezes. Under this amendment those clauses fire every turn; `, once` and RNG
  conditions therefore consume off-stage (the zookeeper leaves at closing whether or not
  the player is in the Main Path; the farewell is simply tagged `absent`). Affected
  goldens re-pin — deterministic at seed, a different sequence.
- **Lands whole, no interim.** (David, 2026-08-26: *"no interim work — we complete the
  change in full."*) The daemon gate is not removed until the tag rides core → engine →
  text-blocks → channel-service → clients in the same landing; an untagged off-stage
  line shown to the player is the regression this ordering exists to prevent.

The loader's hand-rolled witness channels and legality pre-checks retire onto this path
as before.

**Amended 2026-08-27 (David, session d6dc2b — plan review).** Three drop sites retire onto
the tag, not one: the loader's every-turn daemon presence gate (`runtime.ts:3318-3438`),
`witnessMove` (`runtime.ts:4090`, the `exited`/`entered`/`disappeared` rows), and the
engine's `processPluginEvents` (`game-engine.ts:2238`), whose `filterEvents` call stops
dropping and keeps ADR-069's per-sense selection. ADR-213 §Witnessed, ADR-325 D2, ADR-069
and ADR-070 §Visibility are stamped at the landing.

**Amended 2026-08-28 (session 5c0980 — Phase 2b landing).** Two corrections and the
as-built shape.

- **`filterEvents` never dropped.** The 2026-08-27 sentence above is wrong on that point:
  `PerceptionService.filterEvents` (`stdlib/src/services/PerceptionService.ts`) transforms
  visual events into `perception.blocked` and selects per-sense renderings; it returns one
  event per input. The plugin-side drops live in `NpcService`'s decision logic
  (`stdlib/src/npc/behaviors.ts`, `npc-service.ts`) and retire with it in Phase 5. The one
  engine-side change this phase makes is the ADR-069 amendment: an event tagged `absent`
  passes through `filterEvents` untouched, so darkness in the player's room never rewrites
  an off-stage line into "you can't see".
- **The drop sites retired onto the tag are more than three.** As landed: the loader's
  entity-, trait-, and region-owned every-turn daemon gate (`playerPresentAt` deleted), the
  loader's timer named-turn prose gate (`timerOwnerPresent` deleted), `witnessMove` (both
  rows always fire, `exited`/`disappeared` located at the source room, `entered` at the
  destination); and in the character layer the propagation `witnessed` room gate, the
  goal-step gate (`playerPresent` removed from `PropagationContext` and `GoalStepContext`;
  a step's `witnessed` is always its message), and the influence `expired`/`resisted`/
  `applied` room gates — every one now emits with the room it happened in as
  `entities.location`. An owner with no place at all (offstage) is tagged `absent` by the
  loader itself, since the funnel has no location to resolve.
- **The wire and the surfaces.** `ITextBlock` and `ProseEntry` carry `presence` and
  `location` (additive; no protocol bump). `joinProseEntries`/`packetProseText` take a
  `ProsePresentationOptions` — default hides `absent`; `omniscient` shows every entry with a
  `[<location name>]` prefix (`[<presence>]` when the entry has no location). The browser
  renderer takes the same option (`presentation`), classing entries
  `main-entry--<presence>`. transcript-tester gains a `presence: default | omniscient`
  header field; the CLI bundle gains `--omniscient` for `--play`/`--exec`/`--test`.
- **Real path.** `stories/presence-test` — an owl whose every-turn clauses fire while the
  player is in the next room; `default-rendering.transcript` sees nothing until it walks in
  and never sees the `, once` line (spent off-stage); `omniscient-rendering.transcript` sees
  both, labelled `[Barn]`. Re-pinned as the amendment predicted: friendly-zoo's
  `timeline.transcript`, `wt-04`, `wt-05` (the keeper's farewell and the snake's and
  parrot's confessions are spent on the first after-hours turn, unseen from the Petting
  Zoo); Dungeo's chain unchanged at 952.

### D4. Voice is a rendering property — any actor, any person

Grammatical person is resolved per actor at render time, never authored into template
text. The player defaults to second person; witnessed NPCs render third person; first
person is an authorial choice (narrator-PC styles), and tense is the same axis one step
further. The live requirement is ADR-319's rotating PC: "who is You" is per-storyline
state the language layer may not bake in. Mechanism is ADR-158 repeated: the actor param
carries person/number; the formatter chain picks the subject form and conjugates ("You
take" / "The thief takes" / "I take"). **The template sweep lands in full, up front**
(Q resolved 2026-08-25, David: full sweep) — every player-voice template rewritten to
agreeing forms before NPC action ships, so one prose model exists from day one and no
interim witness-message dialect is built to be thrown away. The sweep is the program's
long pole by choice: it leads.

**Amended 2026-08-27 (David, session d6dc2b — plan review).** ADR-089 already built the
placeholder and conjugation mechanism (49 of 51 action files use it); the residual work is
per-actor resolution at render time and name substitution for non-player third person, not
a template sweep. The interim NPC dialect this decision says must not be built already
exists — `lang-en-us/src/npc/`, 39 `npc.*` messages — and retires with its producers in
the NpcService dissolution.

*(Landed 2026-08-28, session 1d6ae5 — Phase 5. `lang-en-us/src/npc/npc.ts` keeps three
messages, the ones the standard behaviors NARRATE rather than act — `npc.guard.blocks`,
`npc.notices_player`, `npc.follows` — and loses the 36 that narrated actions. An NPC's move
now renders through `going`'s own `departs`/`arrives` templates in the actor's voice.)*

### D5. The character layer's output is the pipeline

The arbiter's chosen act (ADR-310/318) becomes an `(action, actorId)` invocation —
decision and execution split along the platform's own seam. The NpcService *decision*
surface (behaviors, `onTurn`, tick phases, the ADR-310 Phase 5 integration) survives in
the decision layer; its execution half is **deleted, not adapted** (Q-1 resolved
2026-08-25, David: "dissolve — we don't keep compatibility layers"). No `NpcAction`
shim survives; behaviors emit `(action, actorId)` invocations directly. One execution
path with no named exceptions.

**Amended 2026-08-27 (David, session d6dc2b — plan review).** The engine owns the per-turn
actor tick (`CLAUDE.md:77`). `plugin-npc` dissolves outright; what `NpcPlugin.onAfterAction`
drove — `npcService.tick`, `onPlayerEnters`/`onPlayerLeaves`, the ADR-310 `actionEvents`
and ADR-320 `emitSound` feeds, behavior-state save/restore — becomes an engine-owned actor
turn phase calling the surviving decision surface, and ADR-120's plugin priority ordering
becomes engine sequencing.

*(Landed 2026-08-28, session 1d6ae5 — Phase 5 of the program plan. The seam is
`NpcContext.act(actionId, slots)` → the engine's execution entry, plus `narrate` for a
line that is not an action; hooks return nothing. `ActorTurnPlugin` (`packages/engine/src/actor-turn-plugin.ts`)
is registered by the engine's constructor at priority 100 and reached through
`GameEngine.getNpcService()`; `plugin-npc` is deleted. Also retired as runtime-dead:
`onSpokenTo`/`onAttacked`/`onObserve` and the service's `onPlayerSpeaks`/`onNpcAttacked`,
which nothing called. Dungeo's five behaviors do not compile until Phase 6, as planned.
Corrected at Phase 6 (David, 2026-08-28: "we're adding non-corpus text to dungeo?"): a
witnessed mover's `going` narrates only when the mover opts in — `NpcTrait.announcesMovement`,
Chord's `announces-movement` — exactly the opt-in the retired `announceMovement` honored; the
default stays silent, so a story with no such NPC reads as it did.)*

### D6. Dungeo rewrites its five NPCs, and the chain re-pins by design

Five NPCs (troll, thief, cyclops, robot, dungeon-master) sit on the shadow system; per
Q-1's resolution they **rewrite onto the pipeline directly** in the NpcService-
dissolution phase — the platform deletion and the story rewrite land as one cutover
(the house one-shot posture). The 952-test walkthrough chain re-records at its pinned
seeds in that phase: an explained diff is a re-pin, an unexplained diff is a defect
(the ADR-295 golden-re-record precedent). The thief — patrol, theft, combat, RNG — is
the seed-sensitive resident; its rewrite is the phase's sizing driver. Dungeo
constrains the migration cost, never the design.

*(Landed 2026-08-28, session 1d6ae5 — Phases 6a+6b together. The chain did NOT re-pin:
952/17 byte-identical at seed 42. Three things the shadow system had let through, each
answered where it belonged: a theft out of the player's possession is not a `taking`
(scope rightly refuses it) — Dungeo's own `stealing` action (`DUNGEO_STEAL`) is what the
thief acts; the underground residents act in the dark — `NightVisionTrait` (world-model,
David: "wouldn't seeing in the dark be its own trait?"), on the thief, troll, cyclops, robot
and Dungeon Master; and the carousel spins for the player alone (MDL's CAROUSEL-EXIT is the
player's exit function; ROBBER never traverses exits), so the Round Room resolver defers a
non-player mover to static topology and draws nothing. Villain blows run the real
`attacking` through `MeleeInterceptor`'s villain branch; the troll takes his own axe through
the real `taking`; the never-called `onSpokenTo`/`onAttacked` hooks were dead code and are
gone — Dungeo's say/set-dial/push-dial-button/answer actions own those mechanics. One more
platform correction surfaced by an unpinned Dungeo transcript: ADR-129 take-points are the
protagonist's — `taking` awards them only when the actor holds the role, so the thief robbing
a room scores nothing for the player.)*

### D7. The Chord acting surface is designed in this program (Q resolved 2026-08-25, David: option b)

Chord grows the surface for an NPC performing an action from story text ("the
mercenaries take the sword") as part of this program — a child ADR designs the syntax
alongside the platform phases, so language and runtime land together rather than the
substrate shipping doorless. The lessons-learned method applies: write the story block
first, then list what it needs; the mercenaries and the port's later chapters are the
worked example. ADR-327 (ACCEPTED 2026-08-25) carries no per-head actor restriction —
its Q-1 resolved to full implementation (its D7): named actors fire on this ADR's D1/D2
path, so ADR-327's non-player acceptance items close when D2's execution entry lands.
(Amended 2026-08-25, session 8ae644, per ADR-327's Supersedes section.)

*(Child written and ACCEPTED 2026-08-29, session aeade8:
[ADR-329](adr-329-chord-acting-statement.md) — the acting statement `<actor> <verb>
<object>`, one action now as that character through the execution entry; goal steps lower
onto the same entry; `move` unchanged — "move puts; acting does". Stamped per ADR-329 D9.)*

## Non-goals

- No change to `move`/Chord effect semantics (ADR-325/326 stand as written).
- No NPC parsing, no NPC scope resolution at parse time.
- No AI/planning layer — deciding what an NPC does remains the character layer's and the
  story's job; this ADR is about *doing* it.
- No new Chord syntax under this ADR itself — the acting-surface child ADR designs it
  (D7).
- No commitment to tense support — person first; tense noted as the same axis.

## Consequences

- ADR-327's explicit heads become real; GH #313's NPC-inventory ruling gains its proper
  context (an NPC that can take things makes carried-item scope matter more).
- One movement/action physics: NPC takes honor guards and interceptors for the first
  time — a behavior change wherever a shadow-system take previously ignored one.
- The loader sheds its witnessing and legality workarounds; the character layer gains an
  output pipeline; `plugin-npc` dissolves.
- The prose layer takes on voice first — the largest single cost, deliberately the
  leading phase; the rotating-PC requirement (ADR-319) is served as soon as it lands.
- Dungeo's goldens re-record in the NPC-execution phase; every stdlib-action touch rides
  the chain as its regression gate until then.
- ADR-070/120 are amended at acceptance to record their supersession-in-part.

## Acceptance (umbrella-level)

1. A child ADR/plan exists per phase — execution entry + actor threading; perception-
   gated witnessing; NpcService disposition + Dungeo migration; actor voice — each with
   its own real-path acceptance (rule 13a), before any phase implements.
   *(Satisfied 2026-08-29, session d04ae1 — the program plan
   `docs/work/adr-328-actors-platform-concept/plan.md` carried one phase per surface, each
   with a child artifact and a rule-13a real-path gate, and the last child ADR — ADR-329,
   the Chord acting surface D7 named — is ACCEPTED and fully landed (its Acceptance items
   1–5 all stamped). Item 3's AC-5 half remains the one open thread, tracked there.)*
2. The program's end state is demonstrable in one scene: an NPC performs a standard
   action through the pipeline; a trait refusal blocks it; the player witnesses it in
   third person from the same room and sees nothing from another room; Dungeo's chain is
   green at re-pinned seeds.
   *(Satisfied 2026-08-28, session 1d6ae5 — Phases 6a/6b of the program plan, stamped
   2026-08-29 by session aeade8 from the plan's recorded evidence. The scene is Dungeo's:
   the thief takes through the real `taking` and `stealing` actions, the troll recovers his
   axe through `taking` with the white-hot refusal exempting the guardian and blocking
   everyone else, `going` narrates a witnessed mover through `actor_exited`/`actor_entered`
   with no arrival perception for a non-protagonist, and the 952-test/17-transcript chain
   ran byte-identical at its pinned seeds with no re-pin — "green at re-pinned seeds"
   was satisfied without a re-pin being needed. Evidence: plan.md Phase 6a/6b status
   lines, 2026-08-28 23:55 CDT.)*
3. ADR-327's non-player acceptance items (its AC-2 and AC-5) are green through this
   program's D2 execution entry — a non-player actor fires `on <actor> <gerund>` and not
   the player's head. (Reworded 2026-08-25, session 8ae644: ADR-327 D7 removed the
   analyzer restriction this item originally named.)
   *(Partly satisfied 2026-08-28, session a19b44 — Phase 4 of the program plan. AC-2's
   non-player half is green: `packages/story-loader/tests/adr-327-ac2-execution-entry.test.ts`
   drives the guards through `CommandExecutor.executeAsActor` and asserts their heads fire
   and the player's do not, with the sweep of 133 `context.player` reads to `context.actor`
   behind it and the Dungeo chain byte-identical. AC-5 is NOT green: no test in the
   repository references `game.pc_switched` (grep, 2026-08-28), so `change the player to`
   has no real-path test on either half; this phase put its dependency in place — the old
   PC acting through the entry — and the test itself is still owed, tracked in the plan's
   Phase 5 entry state.)*
4. ADR-070/120 carry their amendment stamps. *(Satisfied 2026-08-27, session d6dc2b —
   Phase 0 of the program plan; both stamps cover the execution half and, for ADR-070, the
   perception half D3 retires.)*

## Session

2026-08-25, session 915e68 — grew out of ADR-327 Q-1 (actor-explicit heads with no
runtime to fire them). The three-layer impact analysis, the gerund assessment, and the
shadow-system findings are in `docs/work/actor-platform/impact-analysis-20260825.md` and
the session record.
