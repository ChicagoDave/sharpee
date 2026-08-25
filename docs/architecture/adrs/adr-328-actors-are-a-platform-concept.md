# ADR-328: Actors are a platform concept

**Status**: DRAFT (2026-08-25, session 915e68) — all three open questions resolved via
the rule-11a interview 2026-08-25 (dissolve NpcService, no compatibility layers; the
Chord acting surface is designed in this program; the voice sweep lands in full, up
front); awaiting review and David's ACCEPTED flip. Direction is David's, ruled
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
**Related**: [ADR-327](adr-327-explicit-references.md) (actor-explicit clause heads — its
Q-1 is gated on this ADR's landing order), [ADR-325](adr-325-chord-presence-and-duration.md)
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

### D3. Perception gates what the player witnesses

An NPC-actored event renders only if the player perceives it — the PerceptionService
(ADR-069, already `canPerceive(actor, location, world, sense)`) is promoted from
darkness-filter to the witness gate for all non-player action. The loader's hand-rolled
witness channels and legality pre-checks retire onto this path. Unwitnessed NPC action
mutates the world silently, exactly as the fiction expects.

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

### D5. The character layer's output is the pipeline

The arbiter's chosen act (ADR-310/318) becomes an `(action, actorId)` invocation —
decision and execution split along the platform's own seam. The NpcService *decision*
surface (behaviors, `onTurn`, tick phases, the ADR-310 Phase 5 integration) survives in
the decision layer; its execution half is **deleted, not adapted** (Q-1 resolved
2026-08-25, David: "dissolve — we don't keep compatibility layers"). No `NpcAction`
shim survives; behaviors emit `(action, actorId)` invocations directly. One execution
path with no named exceptions.

### D6. Dungeo rewrites its five NPCs, and the chain re-pins by design

Five NPCs (troll, thief, cyclops, robot, dungeon-master) sit on the shadow system; per
Q-1's resolution they **rewrite onto the pipeline directly** in the NpcService-
dissolution phase — the platform deletion and the story rewrite land as one cutover
(the house one-shot posture). The 952-test walkthrough chain re-records at its pinned
seeds in that phase: an explained diff is a re-pin, an unexplained diff is a defect
(the ADR-295 golden-re-record precedent). The thief — patrol, theft, combat, RNG — is
the seed-sensitive resident; its rewrite is the phase's sizing driver. Dungeo
constrains the migration cost, never the design.

### D7. The Chord acting surface is designed in this program (Q resolved 2026-08-25, David: option b)

Chord grows the surface for an NPC performing an action from story text ("the
mercenaries take the sword") as part of this program — a child ADR designs the syntax
alongside the platform phases, so language and runtime land together rather than the
substrate shipping doorless. The lessons-learned method applies: write the story block
first, then list what it needs; the mercenaries and the port's later chapters are the
worked example. ADR-327's analyzer lifts its per-head actor restriction as the runtime
learns each actor path, per its own Q-1 resolution.

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
2. The program's end state is demonstrable in one scene: an NPC performs a standard
   action through the pipeline; a trait refusal blocks it; the player witnesses it in
   third person from the same room and sees nothing from another room; Dungeo's chain is
   green at re-pinned seeds.
3. ADR-327's analyzer restriction lifts for at least one non-player actor path.
4. ADR-070/120 carry their amendment stamps.

## Session

2026-08-25, session 915e68 — grew out of ADR-327 Q-1 (actor-explicit heads with no
runtime to fire them). The three-layer impact analysis, the gerund assessment, and the
shadow-system findings are in `docs/work/actor-platform/impact-analysis-20260825.md` and
the session record.
