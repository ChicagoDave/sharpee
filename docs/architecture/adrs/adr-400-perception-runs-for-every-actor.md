# ADR-400: Perception runs for every actor

**Planning**: OPEN

**Summary**: Perception becomes a system with one question, "what does this actor perceive of this event?", asked of the one perception service for every actor when a batch of events passes the turn's funnel; sight of an act is sight of its actor, for the player and NPCs alike; the player's answer tags and renders the event, and every other actor's answer waits in that actor's perception queue until its turn, where its behavior and its character observer read it. Sound and hearing are ADR-401.

**Status**: **ACCEPTED** (David, 2026-11-15, session 3b1492: "yes", after the open-questions interview and an `adr-review` of 14/14). Redrafted that day, replacing the first draft from session 50bec0. The direction is David's: "the observer should be run by NPCs too so they overhear sound and it goes into their perception queue"; "we just (recently) made the PC and NPCs run all actions the same so the perception service should also run the same for PC and NPC alike"; and, for this redraft, "the perception constructs must align with the platform and attempt to be as elegant as possible", with "a syntax exercise both in Sharpee and in Chord to test 'on paper' what the full perception service offers". The decisions are Claude's drafting of that direction, with David's rulings from the open-questions interview of 2026-11-15 quoted where they decide a point. The interview split the record: everything about sound moved to ADR-401 (David: "if it makes sense to split this into multiple ADRs, do it"). No question is open here; nothing is built.

## Date: 2026-11-15

**Kind**: technical

**Scope**: `packages/if-services` (the perception interface), `packages/stdlib` (`PerceptionService`, the NPC decision layer's context), `packages/engine` (the enrichment funnel, the actor phase and its saved state, the engine's default service), `packages/character` (the observe sub-step, the tick context, the scenes sub-step's witnessed-act checks), `packages/core`, `packages/text-blocks`, `packages/channel-service` and `packages/platform-browser` (the mark for an event the player did not perceive), `packages/chord` and `packages/story-loader` (a hearing head that names a spoken line, a statement that grants knowledge), `docs/core-concepts/README.md` (the Perception section).

## Parent

- **ADR-379** (systems are domain services). The frame: a rule asked by more than one consumer has one home, and a second copy is a defect. This record adds Perception to its inventory.
- **ADR-328** (actors are a platform concept). D2 and D5 run every actor's act through one execution entry. D3 tags what *the player* witnesses. This record carries D3 to every actor.
- **ADR-069** (perception-based event filtering) and its per-sense rendering amendment. The service, and the one construct by which an event declares its senses.
- **ADR-374 D5** (a night-vision observer sees its own dark room). Sight is already asked per observer.
- **ADR-141** and **ADR-310 Phase 5** (the character observer, wired into the tick). One of the two readers.
- **ADR-401** (hearing is authored). The sibling record: what crosses between rooms, the sound side of an act, and `can hear`.

## Context — read in the source, 2026-11-15

**Seven places answer "who perceives this", and they do not agree.**

| Route | The rule it applies | Its reader |
|---|---|---|
| `PerceptionService.presenceOf`, `canPerceive` (`packages/stdlib/src/services/PerceptionService.ts:139`, `:109`) | containing room, regions, concealment; sight is darkness as that observer meets it, night vision included; hearing, smell and touch return true | the engine, about the player |
| the enrichment funnel (`packages/engine/src/turn/turn-event-processor.ts:149-153`, `:228-231`) | stamps one `presence` on each located event for the player, then filters the batch for the player | prose, clients |
| the observe sub-step (`packages/character/src/act-detection/observe-sub-step.ts:50-52`) | `getLocation(npc) === playerLocation`, modeled NPCs, the player action's events only | the character observer |
| the NPC decision layer (`packages/stdlib/src/npc/npc-service.ts:386`) | `playerVisible: npcLocation === playerLocation` | Dungeo's thief, cyclops and troll behaviors, `guardBehavior` (`behaviors.ts:52`, `:151`) |
| the sound dispatcher (`packages/engine/src/sound/dispatcher.ts:91-105`) | ADR-172 propagation, to carriers of `ListenerTrait` | player prose; a Chord `after hearing` |
| `ScopeResolver.canHear`, `canSmell` (`packages/stdlib/src/scope/scope-resolver.ts:119`) | same room or a connected room; a closed container | `listening`, the command validator |
| the character tick's own checks (`packages/character/src/conversation/scene-sub-step.ts:258`, `:276`, `:338`, `:423`; `propagation/propagation-sub-step.ts:47`; `propagation/visibility.ts:142`) | `getLocation` equality, and a second copy of `presenceOf` | scenes, propagation |

**The service has the right signature and a player-shaped body.** Every method takes the perceiver (`packages/if-services/src/perception-service.ts:93-128`). But `filterEvents` reads `event.presence` (`PerceptionService.ts:67`), which is the player's tag, and it returns prose-ready events: the chosen sense's `messageId` written over the fact's, or the fact replaced by `if.event.perception.blocked` (`:77-102`). An observer keys on the original event type, so that output is of no use to it.

**Acting is gated by sight per actor; perceiving is not.** An actor takes only what it can see, and `VisibilityBehavior.isDarkFor` answers for each observer, night vision included (ADR-374 D5). Dungeo's thief, robot, cyclops and dungeon master carry `NightVisionTrait` for that reason (`stories/dungeo/src/npcs/thief/thief-entity.ts:96`). But an event is perceived by presence alone unless it is a room description or contents list (`PerceptionService.ts:252-272`) or carries `data.renderings`, whose only producer under `packages/*/src` is the vehicle machine (`packages/plugin-state-machine/src/vehicle-machine.ts:119`). So in a dark room the player is told of another actor's `taking` at full detail today.

**The observer's input is the player's filtered view.** `ctx.actionEvents` is the action's events after the funnel filtered them for the player (`packages/engine/src/turn/plugin-tick.ts:106`). An NPC observes nothing another NPC does: the tick's own events reach no observer.

**A hearing reaches an NPC's handlers and no observer.** Each delivery of a sound is a `sound.audibility.heard` event naming its listener as `entities.target` (`dispatcher.ts:126-139`). For a `listener` NPC it runs through the world's handlers, where a Chord `after hearing` reacts, and stops there.

**The perception service is optional in the engine** (`packages/engine/src/game-engine.ts:360`, `:420`); `packages/bootstrap/src/index.ts:361` always supplies one. Every reader carries a "without a service" branch (`packages/engine/src/turn/enrich-events.ts:28-31`).

**`StandardWitnessSystem` is not a route.** It asks every actor, per sense, which is this record's question, but nothing ever constructed it outside its test, and ADR-223 resolved its removal on 2026-07-15. It is noted here so that nobody wires it in.

**What made this visible: GH #711** (`e53e07259`). A line said to the player became a located event, `character.line.spoken`, in place of a `speech` sound. A bystander NPC then has no route to it (GH #747). David refused a listener exclusion on `ISound`: the asymmetry is the defect.

## Decision

**D1 — Perception is a system, and `PerceptionService` is its one home.** Its question is "what does this actor perceive of this event?", and the answer is the same whoever asks (ADR-379 D1). It is consulted by the funnel, the actor phase, the character tick and the decision layer, so ADR-379 D2 applies: every consumer reads the service, and a co-location or sense rule written anywhere else is a defect. It stays in stdlib behind the `if-services` interface, where ADR-379 D3 places a system the turn cycle runs. ADR-379 D6's inventory gains the row: *Perception — what does this actor perceive of this event? — `PerceptionService` — leaking, given one home by this record*.

**D2 — The answer is a percept, and it changes nothing about the event.**

```typescript
/** What one actor perceived of one event. The event is the fact, untouched. */
export interface Percept {
  readonly event: ISemanticEvent;
  /** The actor's presence where it happened: ADR-328 D3's vocabulary. */
  readonly presence: Presence;
  /** Whether it reached the actor at all. */
  readonly perceived: boolean;
  /** The sense it came through. */
  readonly sense?: Sense;
  /** Why it did not reach an actor who was there. */
  readonly blocked?: PerceptionBlockReason;
}

export interface IPerceptionService {
  perceive(event: ISemanticEvent, actor: IFEntity, world: IWorldModel): Percept;
  // presenceOf and canPerceive stay: they are the parts perceive is made of.
  // filterEvents stays: it is the player's reader of perceive (D3).
}
```

The rules:

1. An actor is `present` at its own event, and perceives it.
2. Otherwise presence is `presenceOf(actor, event.entities.location)`. An event with no producer-stamped location is not a located event and is perceived by nobody but the player, as now (`packages/core/src/events/types.ts:85-90`).
3. `absent` is not perceived.
4. Present or concealed, an event that declares its senses (`data.renderings`) is perceived through the first sense in `SENSE_PRECEDENCE` it declares and the actor has; with none, it is not perceived and `blocked` says why.
5. Present or concealed, a room description or contents list needs sight.
6. Present or concealed, any other located event is perceived through `sight`, and sight of an act is sight of its actor: `VisibilityBehavior.canSee(perceiver, actor)`. That one answer covers darkness as the perceiver meets it, night vision and any later way of seeing, concealment and enclosure, so a hidden player's theft goes unseen by a guard. An event with no actor, a thing falling, is seen when the room is not dark for the perceiver (`isDarkFor`). A perceiver who cannot see it does not perceive it, and `blocked` says why; `PerceptionBlockReason` gains `'out-of-sight'` for an actor the perceiver cannot see in a room that is not dark for it.
7. A `sound.audibility.heard` event is perceived by its `target` and nobody else, through `hearing`.

Rule 6 is David's, in two rulings of 2026-11-15. On darkness: "we already solved darkness and take including if the PC has a mechanism to 'see in the dark' so that has to carry to NPC's too, especially since an NPC (or a PC) could be non-human with a different vision spectrum." On a hidden actor: option A, sight of an act is `canSee(perceiver, actor)`. Sight is asked of the visibility system and never re-derived here, so a new way of seeing is a change to that system alone.

**D3 — The funnel asks once per actor: one loop, two sinks.** When a batch passes the one funnel (ADR-334 D4), each located event is put to every actor the actor phase runs this turn and to the player. The player's percept does what it does today: its `presence` is the tag on the event, and `filterEvents`, rewritten over `perceive`, picks the rendering or the blocked transform. `ISemanticEvent.presence` keeps its single field, now documented as the role holder's percept on the wire. Every other actor's percept, when `perceived`, goes to that actor's perception queue (D4). An actor's own act is not queued for it. Perception is asked when the batch passes the funnel, for every actor alike, which is the moment the player's presence is already fixed.

**D4 — Each actor has a perception queue, drained on its turn.** The queue holds that actor's percepts in the order the funnel produced them. The actor phase drains every queue once, at its start. So an actor acts on everything it perceived since its last turn: the player's action of this turn, and whatever the actors, the later phases and the sound stage did after its last turn. There is no second observe pass and no ordering between NPCs to get right. The queues live in the actor phase's saved state, beside the behavior states `ActorTurnPlugin` already saves (`packages/engine/src/plugins/actor-turn-plugin.ts:100-111`), because a queue is non-empty at every turn boundary and belongs to actors with and without a character model. The engine hands the actor phase its queue accessor the way it hands it the execution entry (`packages/engine/src/game-engine.ts:530`), so `@sharpee/plugins` does not change. The drained lists travel as one field, `perceivedBy: (actorId: EntityId) => readonly Percept[]`, on `NpcTickContext` (stdlib) and on `TickContext` (character), beside `act`. A drain empties every queue, including the queue of an actor the phase does not run this turn: an actor that died or went inactive after being asked loses what it had perceived, and no queue outlives the turn it was drained in.

**D5 — A drained queue has two readers, and they read the same list.**

- *The decision layer.* `NpcContext` gains `perceived: readonly Percept[]`. Any behavior, modeled or not, can act on what its actor perceived.
- *The character observer.* The observe sub-step stops reading `ctx.actionEvents` and stops choosing observers by `getLocation`. Its unit of work becomes an event and the modeled actors who perceived it, built from the drained queues. `observeEvent`, act detection, `witnessActs` and `witnessStatement` are unchanged; they receive who perceived instead of who stood in the player's room. An act put on the scene surface carries the event's room, not the player's (`observe-sub-step.ts:84`), and the scenes sub-step's two witnessed-act checks (`scene-sub-step.ts:258`, `:276`) read who perceived the act.

`TickContext.actionEvents` is removed. `TurnPluginContext.actionEvents` stays: other plugins and the actor phase's own room-entry hooks read it.

**D6 — Who hears is who the author marked, and what they hear joins their queue.** (David, 2026-11-15: option A.) The player hears, and a person or thing hears when the story says `listener`, exactly as today (ADR-374 D6); no actor gains hearing by default. An unmarked NPC perceives what it sees and nothing else. The dispatcher still walks carriers of `ListenerTrait`. What this record adds is the reader: a heard event is the hearing percept (D2 rule 7) and joins its listener's queue, so a marked NPC's behavior and observer receive an overheard sound by the same road as a seen act. `listener` keeps its one meaning on people and on things, and `analysis.hearing-not-listener` is unchanged. Which sounds reach a listener is ADR-401's.

**D7 — The engine always has a perception service.** `GameEngine` constructs `PerceptionService` when none is passed; the option stays as the override ADR-069 intended. The "without a service" branches go. An engine built without one, which today tags nothing and filters nothing, then behaves as every shipped host already does.

**D8 — NPCs act by the sight they observe by; the remaining copies are pinned and filed.** `NpcContext.playerVisible` becomes `world.canSee(npc, player)` in place of `npcLocation === playerLocation` (`packages/stdlib/src/npc/npc-service.ts:386`) (David, 2026-11-15: option A). A Dungeo line this moves stops for David's ruling. A structural test in the pattern of `traversal-readers.test.ts` enumerates every place that decides co-location or a sense for an actor and fails on one it does not list. This landing moves the observe sub-step, the two witnessed-act checks and `playerVisible`. The rest are listed as `copy` and filed, as ADR-379 D8 did for traversal: `scene-sub-step.ts:338` and `:423`, `propagation-sub-step.ts:47`, `resolvePlayerPresence`, and `ScopeResolver.canSmell`. `ScopeResolver.canHear` is listed as `copy` here and is ADR-401's to move.

**D9 — An act the player cannot see is unperceived, and the client hides it.** D2 rule 6 holds for the player. The event stays in the turn (ADR-328 D3: tags, never drops) and carries a mark beside `presence`: `ISemanticEvent.perceived?: boolean`, `false` when the role holder was there and did not perceive it, absent otherwise. It rides the road `presence` rides: the prose pipeline copies it onto `ITextBlock`, the channel packet carries it on the prose entry, and the one presentation rule, `showsEntry` (`packages/channel-service/src/utils/prose.ts:188`), takes it beside `presence`. Its callers pass it, `packages/platform-browser/src/channels/prose.ts:163` among them. The default presentation hides an entry whose `perceived` is `false`, as it hides `absent`; the omniscient presentation shows it. The IDE's run-event protocol carries no presence field today (`packages/ide-protocol/src/run-events.ts`), so it gains nothing here. The player's own acts are never marked (D2 rule 1). This is the whole of the player-facing change in this record, and it is the permanent behavior for a story that does not turn on action sounds; what a player hears of an unseen act in a story that does is ADR-401's.

**D10 — Chord keeps its perception words and gains the two constructs D12 needs.** An author already says the consequences of perception: `knows`, `define topic … as`, `after hearing`, `listener`, `can see`, `dark`, `night-vision`, `concealed`. None changes meaning here. The words on the sound side are ADR-401's.

**D11 — One landing.** The observe sub-step's `getLocation` rule is not removed until the queues feed it, and `playerVisible` does not move until `perceived` exists, all in one landing, as ADR-328 D3 landed. ADR-401 lands after it and separately (David, 2026-11-15, on the split).

**D12 — A perceived line teaches what the story says it teaches.** (David, 2026-11-15: "this would require a lookup of some kind or an event 'when xyz hears abc, xyz now knows about fubar'", then option B, the authored event.) Perceiving a line gives an actor the percept and nothing more: no topic, no belief. What it learns is a clause the author writes. The alternative, a lookup from the line's phrase to its `claims` tag (`packages/story-loader/src/runtime/topic-tables.ts:24`) applied to every perceiver, was declined: it would teach every bystander the same thing with no author in the loop.

The clause needs two constructs Chord does not have, and this record adds both, in the words David approved (2026-11-15: option A):

```
after hearing vey-names-price
  make Orrin know the price, told
end after
```

- *A head that names a spoken line: `after hearing <phrase-key>`.* `after hearing` accepts only a declared sound today, `"hearing" ARTICLE WORD` (`packages/chord/chord.ebnf:716`). It gains `"hearing" phrase-key`, told apart from the sound form by the missing article, `after` only as the sound form is. A key that names no phrase is a diagnostic, and the sound form's `analysis.hearing-not-listener` does not apply: the owner need not be a `listener`, because it fires on perceiving the line by any sense, and a bystander who sees the speaker perceives it by sight. It fires when the clause's owner perceives that line being spoken, in the same turn, as the sound form fires in the sound stage. The loader's handler for the line event (`character.line.spoken`, whose `messageId` is the phrase key) asks the service `perceive(event, owner, world)` and runs the body only when the answer is `perceived`; the loader does not decide presence or sight itself (D1). How the loader's runtime reaches the engine's service is for the plan to trace. The owner must have perceived it by D2's rules, so a bystander who cannot see the speaker does not learn from a line in this record.
- *A statement that grants knowledge: `make <character> know <topic>`.* Chord has `knows` as a declaration and as a condition (`chord.ebnf:1028`, `:2530`) and no statement that makes a character learn at runtime. The new statement sits in the family of `make <name> wear <name>` (`chord.ebnf:2174`) and takes the declaration's optional one-word slots, a source and a confidence (`, told`, `, certain`). It gives the named character the topic by `CharacterModelTrait.addFact`; a character that already knows the topic is unchanged. Naming something that is not a modeled character is a diagnostic.

A TypeScript story says the same thing in a behavior: it finds the line in `ctx.perceived` and calls `addFact`. The clause fires for lines that are located events. Today that is a line said in a scene the player is in (`character.line.spoken`); a line between two NPCs is a sound only, and ADR-401 D6 makes every line a located event at its own landing.

## On paper

One scene, said twice, to test what the service offers. Vey and Orrin are in the Refectory with the player; Brannoc is in the Cloister next door; something lives in the dark Undercroft below. Neither listing has been compiled. Lines marked *new* exist only under this record or ADR-401.

### In Sharpee

```typescript
// 1. The one question (new). Orrin watched the player take the bell.
const percept = perception.perceive(takenEvent, orrin, world);
// → { event: takenEvent, presence: 'present', perceived: true, sense: 'sight' }
//   if Orrin could not see the player (dark for him, or the player hidden):
//   perceived: false, with `blocked` saying why (D2 rule 6)

// 2. Its parts (exist today).
perception.presenceOf(orrin, refectory.id, world);         // 'present'
perception.canPerceive(mole, undercroft, world, 'sight');  // true: night vision
world.canSee(orrin.id, player.id);                         // the visibility system

// 3. An event that declares its senses (exists; one producer today).
fact('if.event.bell.fell', bell, {
  messageId: 'refectory.bell.falls',
  params: {},
  renderings: {
    sight:   { messageId: 'refectory.bell.falls',       params: {} },
    hearing: { messageId: 'refectory.bell.falls.heard', params: {} },
  },
}, { location: undercroft.id });
// perceive(…, mole, …)   → perceived: true,  sense: 'sight'
// perceive(…, player, …) → perceived: true,  sense: 'hearing'   (dark for the player)
// perceive(…, orrin, …)  → perceived: false, presence: 'absent'

// 4. A sound (exists). Brannoc carries ListenerTrait. Whether the bell
//    reaches him in the Cloister is ADR-401's rule.
context.emitSound({
  sourceLocation: refectory.id, sourceEntity: bell.id,
  kind: 'tolling', volumeTier: 'normal',
});
// when it does: sound.audibility.heard, entities.target = brannoc.id
// perceive(heardEvent, brannoc, …) → perceived: true, sense: 'hearing'

// 5. A behavior acting on what its actor perceived (new: `ctx.perceived`).
const sentry: NpcBehavior = {
  id: 'refectory.sentry',
  onTurn(ctx) {
    const theft = ctx.perceived.find((p) => p.event.type === 'if.event.taken');
    if (theft) ctx.narrate('refectory.sentry.saw_theft');

    const noise = ctx.perceived.find((p) => p.sense === 'hearing');
    if (noise) ctx.act('if.action.going', { direction: Direction.EAST });
  },
};

// 6. The observer (exists; its input is new). Orrin's queue held the taking,
//    so the default rule for `if.event.taken` moved his disposition toward
//    the player, and act detection gave him the theft as a witnessed topic.
```

### In Chord

```
story
  title: Refectory
  authors:
    T
  id: refectory
  story-version: 0.0.1

define sound tolling

create the Refectory
  a room
  west to the Cloister
  down to the Undercroft

  A long room of benches.

create the Cloister
  a room
  east to the Refectory

  A covered walk.

create the Undercroft
  a room, dark
  up to the Refectory

  Black as a well.

create the bell
  in the Refectory

  A brass handbell.

  ## Sight, as a condition: the visibility system's answer, for Orrin.
  after the player taking it while Orrin can see the player
    phrase orrin-frowns
  end after

  after the player taking it
    play sound tolling
  end after

create Vey
  a person, proper
  in the Refectory
  mood calm

  The keeper.

create Orrin
  a person, proper
  in the Refectory
  mood calm

  A lay brother on the far bench.

  ## New under D12: Orrin perceives Vey's line, and the story says what
  ## he learns from it.
  after hearing vey-names-price
    make Orrin know the price, told
  end after

  ## Knowledge, as a condition: what Orrin perceived and kept.
  goal fetch-the-prior, medium
    active when Orrin knows the price
    move to the Cloister
    say orrin-tells-brannoc
  end goal

create Brannoc
  a person, proper, listener
  in the Cloister

  The prior.

  ## Hearing. Brannoc is marked `listener`. Under ADR-401 he hears the
  ## bell from the Cloister only if the way to the Refectory is marked
  ## for hearing; that mark's word is not yet chosen and is not written here.
  after hearing the tolling, once
    phrase brannoc-looks-up
  end after

create the mole
  a person, night-vision
  in the Undercroft

  It sees you perfectly well.

create Alex
  a person
  playable
  starts in the Refectory

  You.

before the game starts
  change the player to Alex
end before

define conversation the-bargain for Vey
  about "the page"
  beat:
    phrase vey-has-it
  beat:
    phrase vey-names-price
end conversation

define phrase vey-has-it
  "I have it," says Vey.
end phrase

define phrase vey-names-price
  "Here is my price," says Vey.
end phrase

define phrase orrin-frowns
  Orrin frowns at you from the bench.
end phrase

define phrase orrin-tells-brannoc
  "She has named a price," says Orrin.
end phrase

define phrase brannoc-looks-up
  In the cloister, Brannoc looks up.
end phrase
```

### What the exercise shows

| What the service offers | Sharpee | Chord | Finding |
|---|---|---|---|
| Is this actor present where it happened? | `presenceOf` | none, and none needed: an author says where things are | aligned |
| Can this actor see that? | `world.canSee` | `<subject> can see <thing>` | aligned |
| Is it dark for this actor? | `VisibilityBehavior.isDarkFor` | `dark`, `night-vision` | aligned |
| What did this actor perceive of this event? | `perceive` (new) | none: an author never holds an event | aligned by design |
| React to a heard sound | `ctx.perceived`, `sense: 'hearing'` (new) | `after hearing the <sound>` | aligned: `listener` marks who hears on both sides (D6) |
| Can this actor hear that? | `canPerceive(…, 'hearing')`, a stub | no `can hear` (`packages/chord/chord.ebnf:2114` has `see` and `reach`) | ADR-401 |
| React to a seen act | `ctx.perceived` (new); the observer's rules | a clause fires whether or not anyone saw; the author adds `while <actor> can see …` | works, but sight is the author's to remember |
| Keep what was perceived | witnessed facts on the character model | `knows`, `define topic … as` | aligned |
| An overheard line becomes knowledge | `witnessStatement` exists for the player's TELL (`observe-sub-step.ts:92-107`) | `active when Orrin knows the price` | aligned by D12: nothing is learned unless a clause says so. `after hearing vey-names-price` with `make Orrin know the price, told` is that clause; the TypeScript form is `addFact` from a behavior reading `ctx.perceived` |
| An event declares its senses | `data.renderings` | none: an author cannot say "heard but not seen" for an event of their own | gap for story events, filed with this record |
| A sound is heard in another room | propagation over every exit, today | nothing to author | ADR-401 |

## Consequences

- NPCs start reacting to each other. The default transition rules (`packages/character/src/act-detection/character-observer.ts:55-72`) fire on any perceived `if.event.attacked`, `if.event.taken` and `if.event.given`. Stories with more than one modeled NPC will see moods, threat and disposition move. Goldens that pin them re-record; each move is an NPC perceiving something it could not before, or it is a defect.
- A bystander who can see the speaker perceives a line said to the player, and learns from it what the story's clause says and nothing otherwise (D12). This closes GH #747.
- An NPC on a bench in the room now witnesses what happens there. An NPC that cannot see the actor, because the room is dark for it or the actor is hidden or enclosed, witnesses nothing of the act. Both differ from `getLocation ===`.
- An NPC's reaction to what another NPC did, or to a sound, comes on its next turn. The player's action is still observed the turn it happens.
- The player stops reading another actor's act that it cannot see (D9). Today that line prints at full detail.
- A `listener` NPC's behavior and observer now receive what it hears. Who hears is unchanged.
- Dungeo has no modeled characters and no behavior reads `perceived`, but its thief, cyclops and troll behaviors read `playerVisible`, which now asks real sight (D8), and D9 can hide a line where one of them acts beside a player without light. Its NPCs carry night vision, so darkness is predicted not to move what they do. These are predictions to measure, and a moved line stops for a ruling.
- Engine tests that build an engine with no perception service get presence tags and darkness transforms they did not have (D7). The plan's census counts them.
- Saves carry the perception queues. Save-format versioning is dormant, so no version moves.
- ADR-069's "what the player can perceive" and ADR-328 D3's "the player witnesses" are each amended by this record at its landing.

## Acceptance

Each criterion names where it is discharged.

1. `perceive` returns the percept D2's seven rules give, one unit test per rule, including an actor on a supporter in the room (`present`), a night-vision actor in a dark room, an act by a concealed actor, and an event with no actor in a dark room (stdlib).
2. `filterEvents` is implemented over `perceive` and no longer reads `event.presence`; the player's prose for the existing perception suites is byte-identical except where D9 hides an unseen act (stdlib, engine).
3. A real-engine test: Orrin, a bystander with D12's clause, perceives a line Vey says to the player; `Orrin knows the price` is false before the line and true after it, and a goal `active when Orrin knows the price` starts on his next turn. The same story with the clause removed leaves it false, and with Orrin unable to see Vey leaves it false. Closes #747 (chord tests for the two constructs and their two diagnostics; story-loader test over engine and character).
4. A real-engine test: one modeled NPC perceives another NPC's `taking`, and the default rule moves its disposition; the same NPC, unable to see the taker, does not (story-loader test over engine and character).
5. A real-engine test: an NPC in another room perceives nothing of a located event; a `listener` NPC in the room of a played sound finds the hearing in `ctx.perceived` (story-loader test over engine and stdlib).
6. A real-engine test: a behavior reads `ctx.perceived` and acts on it, and `playerVisible` is false for a concealed player in a lit room (engine test over stdlib).
7. A save taken with a non-empty queue restores it: the percept is observed on the turn after restore; and an actor made inactive after being asked has no queue after the next drain (engine).
8. The structural test fails when a co-location or sense rule is added outside the service, and its `copy` list is exactly D8's (stdlib or character, wherever `traversal-readers.test.ts`'s pattern places it).
9. An engine constructed with no perception service tags presence (engine).
10. A real-engine test: another actor's act the player cannot see is absent from the default client's prose and present under the omniscient presentation, and `perceived: false` rides the channel packet to the browser client's prose renderer (core, engine, text-blocks, channel-service, platform-browser).
11. The Dungeo chain is run once and its census reviewed (repository).

## Session

Redrafted in session 3b1492, 2026-11-15, branch `main`, after an `adr-review` of the first draft (5 of 14), an assessment of the perception service against the source, and an open-questions interview that resolved seven questions and moved sound to ADR-401. First drafted in session 50bec0 the same day, after GH #711 (`e53e07259`). Related issues: #747 (the bystander gap this closes), #746 (manner beats on lines spoken on a character's own turn; separate).
