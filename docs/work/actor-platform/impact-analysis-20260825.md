# Actors as a platform concept — impact analysis

**Date**: 2026-08-25, session 915e68. Requested by David ahead of drafting the direction
ADR ("impact analysis for sharpee first, then chord, and of course blast radius into
dungeo"). Every claim below carries the file/line it was read from, this session.

**The thesis under analysis**: the actor becomes a platform concept — one execution path,
`(action, actorId)`, for anyone who acts. An NPC taking the sword runs the taking action,
fires the same interceptors, emits the same events with its own actor; perception decides
what the player witnesses. Surfaced by ADR-327 Q-1 (actor-explicit clause heads have no
runtime to fire against) and David's reading of it: "NPCs need to be pulled into the
platform."

---

## A. Sharpee platform

### A1. The execution core is player-bound at exactly two seams

`CommandExecutor` carries `actorId?: string` in its options (`command-executor.ts:50`) and
then ignores it: the flow reads `world.getPlayer()` (`:188`) and stamps
`actorId: context.player?.id` (`:268`). The four-phase machinery below it is closer to
actor-generic than it looks — capability behaviors and interceptors already take
`actorId` positionally (ADR-090/228 signatures), and world-model's reachability is
actor-generic by construction (`canReach(observerId, targetId)`, ADR-273 D4).

**What's needed**: a programmatic execution entry — NPCs don't parse; they need
"(action id, resolved entities, actorId) → four phases" without the parser. The
parse/validate split (ADR-231 D2a: stdlib refuses on scope in `validate()`) already means
validate does the actor-relative checks; the entry just has to exist and thread the actor.

### A2. The shadow action system is the real dissolution target

`stdlib/src/npc/npc-service.ts` — **832 lines** — is a second, parallel action universe:
`NpcAction` variants `{move, moveTo, take, drop, attack, speak, emote, wait, custom}`
(`npc/types.ts:50-59`) executed by hand-rolled `executeMove/executeTake/executeDrop/
executeAttack` (`npc-service.ts:558-570`). These duplicate going/taking/dropping/attacking
semantics with **no validate phase, no interceptors, no capability dispatch** — an NPC
"take" cannot be refused by a trait, witnessed by a hook, or blocked by anything the real
taking action honors. This is where the actor concept already tried to exist and got
built beside the platform instead of in it.

`plugin-npc` is a 104-line `TurnPlugin` shell over this (`plugin-npc/src`, no `if.action`
reference anywhere in it). The character layer already feeds it: ADR-310 Phase 5 pipes
the player action's events in as `actionEvents` (`npc-service.ts:80-85`) and the
'character-model' tick phase registers into it (`:243-249`) — so the arbiter's output
path today terminates in the shadow system.

**Impact**: NpcService's *decision* surface (behaviors, onTurn, tick phases, the ADR-310
integration) survives; its *execution* surface dissolves into `(action, actorId)` calls.
The migration question — dissolve outright vs. keep the `NpcAction` shape as a thin
adapter emitting pipeline calls — is a decision for the ADR, and it is the main
compatibility lever for Dungeo (§C).

### A3. Stdlib actions read the player directly — a mechanical but wide sweep

**126 `context.player` / `getPlayer()` references across 49 standard-action files.** Most
are "the actor" spelled as "the player" (whose inventory, whose location, whose scope);
each needs to read the command's actor instead. Mechanical, but it is the widest single
sweep in the platform half, and every touched action is regression-gated by Dungeo.

### A4. Prose is second-person by authoring convention — the deepest platform cost

Templates are written as player-voice text: `"You take {the item}."`
(`parse-phrase-template.ts:395` documents exactly this shape), `"{You} {can't} see
{the item}."` (`language-provider.ts:80`). An NPC-actored `if.event.taken` rendered
through today's templates would say "You take" about the thief. Two-part answer, both
real work:

1. **Perception first**: most NPC action events should never render — the
   PerceptionService (ADR-069; interface already `canPerceive(actor, location, world,
   sense)`) becomes the witness gate deciding *whether* the player saw it. This replaces
   the hand-rolled witnessing the Chord loader does today (§B1) and is the smaller half.
2. **Actor voice second — person-generic, for all actors** (David's clarification,
   2026-08-25): grammatical person is a rendering property resolved per actor at render
   time, never text authored into templates. The player's default is second person; a
   witnessed NPC renders third person; first person is a legitimate authorial voice
   (narrator-PC styles), and tense is the same axis one step further. The live
   requirement is Reflections' rotating PC (ADR-319 track) — "who is You" is
   per-storyline state, so the language layer may not bake it in. Mechanism is the
   ADR-158 move repeated: the actor param carries person/number, the formatter chain
   picks the subject form and conjugates the verb (`"You take" / "The thief takes" /
   "I take"`); lang-en-us already owns lemmatization, and English agreement is shallow.
   The cost is the sweep — every player-voice template rewritten from literal prose to
   agreeing forms — which is why this is the honest long pole of the whole program. It
   can be phased: witnessed NPC actions can initially render through dedicated witness
   messages (the `entered`/`exited` channel pattern generalized) before the full
   template system learns voice.

### A5. What already holds

Events carry the actor (`event.entities.actor` — `movedActorId` reads it,
`event-contract.ts:84-93`). Reachability/visibility are actor-generic (ADR-273).
Randomness is per-point streams (ADR-293), which bounds — but does not eliminate — the
determinism churn of reordering who draws when. Save/restore is shape-stable (actors are
entities; nothing new serializes).

---

## B. Chord

### B1. The loader stops doing perception's job by hand

`moveWithLifecycle` (`runtime.ts:3915`) mutates and then hand-enqueues what the player
witnessed (`exited`/`entered`/`disappeared` channels, player-room checks inlined). Under
the actor model this is the platform's perception/witness path; the loader's version
retires. Same for the conversation layer's exit-legality pre-checks
(`dialogue-selector.ts:305`, `runtime.ts:1279`, `:2315` — `hasTraversableExit` guessing
what going would say): an NPC leaving a scene becomes the going action *actually run* for
that NPC, and its validate is the one truth.

### B2. `move` stays a mutation; acting becomes possible, not obligatory

The `move` effect is authorial teleportation — ADR-325 built it deliberately and nothing
here changes it (ADR-326 rides it unchanged). What the actor model adds is the *other*
verb Chord currently cannot say at all: an NPC **performing** an action through the
pipeline (the mercenaries taking the sword back, Teisha giving the necklace). That is a
future Chord surface (effect statements naming an actor and an action) — enabled, not
designed, by the platform move.

### B3. ADR-327 stops being ceremonial

Actor-explicit heads (`on the mercenaries taking`) become fireable exactly as fast as the
runtime learns NPC actors — the per-head analyzer lifting its Q-1 recommendation
describes. `when <entity> moves` (ADR-325 D3h) starts firing for NPC movement performed
as going. Timers, tallies, phrases, gates: untouched.

### B4. The character layer gets its output pipeline

The normative layer (goals → arbiter → acts, ADR-310/318) currently terminates in the
shadow system (§A2) or in bespoke scene mutations. Under the actor model the arbiter's
chosen act is an `(action, actorId)` invocation — decision and execution finally split
along the platform's own seam. This is the piece that makes the whole move trace back to
the active product: Chord characters who *act* under the same physics the player does.

### B5. Near-term Chord work is unaffected

ADR-326 (adjacent-room place) has no dependency on any of this beyond ADR-327 D5, which
is player-only. Tier 2's scope/grammar seam (#313, #312) is read-side and lands the same
either way — though #313's "NPC-carried items" ruling should be made knowing actors are
coming (an NPC that can *take* things makes its inventory's visibility semantics matter
more, not less).

---

## C. Dungeo blast radius

### C1. Five NPCs sit on the shadow system

`stories/dungeo/src/npcs/`: **troll, thief, cyclops, robot, dungeon-master** — each an
`NpcBehavior` returning `NpcAction`s, plus `combat/melee-npc-attack.ts` (the resolver
consuming bare `npc.attacked` events, `npc-service.ts:31,55`) and
`orchestration/npc-setup.ts`. The thief is the deep case: patrol movement over static
topology (`npc-service.ts:448` pathfinding), treasure theft, combat, the canvas objects.

**The compatibility lever**: if `NpcAction` becomes an adapter emitting pipeline calls
(§A2), Dungeo's behaviors keep their shape and migrate semantics only (their takes start
honoring validate/interceptors — which is a *behavior change* where a theft previously
ignored a guard the platform would now enforce). If NpcService dissolves outright, all
five behaviors rewrite. Either way Dungeo is the largest story-side consumer.

### C2. The walkthrough chain re-pins — plan for it, don't fight it

952 tests across 17 transcripts, byte-exact at pinned seeds. Any change to event order,
RNG draw order, message wording, or turn-phase sequencing shifts goldens. The thief's RNG
is already the chain's known sensitivity ("thief-RNG cascade" class). Precedent says this
is acceptance cost, not a blocker: ADR-295 re-recorded goldens by design when the
carousel daemons died. Budget a full re-record + review pass of the chain in whatever
phase touches NPC execution; treat any *unexplained* diff as a defect, any explained one
as a re-pin.

### C3. Dungeo constrains the migration path, not the design

Per the standing direction, Dungeo is an outlier kept working, never a design input. Its
practical demand is one: whatever lands must either keep the TS `NpcBehavior` surface
runnable (adapter route) or come with the rewrite of five NPCs costed into the plan.
GDT and the combat resolver ride whichever route the ADR picks.

---

## Sizing and shape

This is an umbrella-scale program, not one ADR's implementation: (1) the execution entry
+ actor threading (A1, A3), (2) perception-gated witnessing (A4.1, B1), (3) NpcService
dissolution/adapter + Dungeo migration (A2, C1–C2), (4) actor voice in prose (A4.2), (5)
the Chord acting surface (B2) — with ADR-327's analyzer lifting per-head as each piece
lands. Phases 1–3 are self-contained enough to land separately; 4 is the long pole; 5 is
elective until a story wants it. The direction ADR should decide the target model and the
adapter-vs-dissolve question, then children carry the phases (the ADR-266 umbrella
pattern).

**The one-line verdict**: the platform already *believes* in actors (signatures, events,
reachability all thread an actor) — it just never let anyone but the player through the
door, and built an 832-line workaround beside it. Pulling NPCs into the platform is
mostly demolition of duplicates, plus two genuinely new pieces: the programmatic
execution entry and witnessed third-person prose.
