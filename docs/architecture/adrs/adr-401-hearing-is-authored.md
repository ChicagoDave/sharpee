# ADR-401: Hearing is authored

**Planning**: OPEN

**Summary**: A sound is heard in its own room and reaches another room only over a connection the author marked for hearing or to an actor with acute hearing, replacing ADR-172's every-exit default; an action may have a sound side at an ADR-172 volume tier, off unless the story turns it on, so an actor that cannot see an act hears it instead; and Chord gains `<subject> can hear <thing>`, reading the same rule sounds are delivered by.

**Status**: **ACCEPTED** (David, 2026-11-15, session 3b1492: "yes", after the open-questions interview and an `adr-review` of 14/14). Split out of ADR-400 during its open-questions interview (David: "if it makes sense to split this into multiple ADRs, do it"). Every decision below is a ruling David gave in that interview, quoted where it decides a point; the shapes are Claude's drafting, with reasons. No question is open (Q-1 to Q-5 resolved 2026-11-15); nothing is built.

## Date: 2026-11-15

**Kind**: technical

**Scope**: `packages/engine` (sound propagation and the dispatcher), `packages/if-domain` (a sound named as the sound of an act), `packages/stdlib` (action lifecycle descriptors, `PerceptionService`'s hearing check, the scope resolver's hearing rule), `packages/world-model` (the acute-hearing marker, the hearing mark on a connection), `packages/chord` and `packages/story-loader` (the header line, the two marks, `can hear`), `packages/lang-en-us` (heard lines for acts), `packages/character` (the scenes sub-step's speak path).

## Parent

- **ADR-400** (perception runs for every actor). The sibling record this one was split from: the percept, the perception queue, sight of an act as sight of its actor, and who hears (its D6: the player and whatever the story marks `listener`).
- **ADR-172** (spatial sound propagation). Its cost and tier model is kept. Its default, that every exit carries sound, is superseded by D1.
- **ADR-374 D6** (a sound is one thing with two sides; a listener hears its world side). The construct D3 follows.
- **ADR-392 D5** (each sense has one ruler). The volume tier an action's sound is measured on.
- **ADR-215** (`use` extensions). How a story turns action sounds on.
- **ADR-379** (systems are domain services). One rule behind the `can hear` condition and the delivery.

## Context — read in the source, 2026-11-15

**Every exit carries sound today, with nothing authored.** Propagation builds its edges from a room's exits and walls. An open passage costs 1, an open door 1, a closed door 4; a wall costs by its `AcousticTrait` tier (`packages/engine/src/sound/propagation.ts:151-199`). A `normal` sound has a budget of 5 (`packages/if-domain/src/sound/types.ts:55-61`). So `play sound` is heard rooms away, and so is a line between two NPCs. Chord has no word for acoustics.

**No standard action makes a sound.** `emitSound` is on the action context (`packages/stdlib/src/actions/enhanced-types.ts:415`) and no action under `packages/stdlib/src/actions/standard` calls it. Each action already has a lifecycle descriptor that declares things about it once (`packages/stdlib/src/actions/lifecycle/descriptor.ts:175`).

**Loudness has one ruler.** `VolumeTier` is whisper, subdued, normal, raised, shouting (`packages/if-domain/src/sound/types.ts:44`), and `SoundingTrait` puts a thing on it (ADR-392 D5).

**Speech has two carriers, and no line has both.** A line said in a scene the player is in is a located event, `character.line.spoken`, and makes no sound (`packages/character/src/conversation/scene-sub-step.ts:162-177`); nobody in another room can hear it. A line between two NPCs is a `speech` sound and no event, so a player standing in the room reads it as heard speech.

**Two rules answer "can this actor hear that", and neither is the delivery.** `PerceptionService.canHear` returns true for everything (`packages/stdlib/src/services/PerceptionService.ts:193-200`). `ScopeResolver.canHear` says same room, or any connected room, with a closed-container rule (`packages/stdlib/src/scope/scope-resolver.ts:119`); `listening` and the command validator read it. Chord's conditions have `can see` and `can reach` and no `can hear` (`packages/chord/chord.ebnf:2114`).

## Decision

**D1 — Beyond its room, a sound is heard only where the author modeled it.** (David, 2026-11-15: "has to be an authored and modeled capability...has to be adjacent rooms with hearing-capability between them or an actor with acute hearing"; and, asked whether a played sound still carries through exits with nothing authored: "no, it has to be authored".) This governs every sound: one a story plays on purpose (`play sound`, `emitSound`), the sound side of an act (D3), and speech. A sound is perceived in its own room. It reaches a hearer in another room in two cases only, and each is something the story states:

- *The rooms are connected for hearing.* The two rooms are adjacent and the author has given the way between them a hearing capability. An exit or wall is an acoustic edge only when it carries that mark. For the edges that exist, ADR-172's costs, budgets and audibility tiers apply unchanged.
- *The hearer has acute hearing.* A marker on the actor, the hearing-side twin of `night-vision`: it is asked of the hearer, as `isDarkFor` is asked of the observer, so a non-human actor hears as its kind does.

Nothing carries by default. ADR-172's "every exit carries" is superseded, and ADR-172 is stamped at the landing.

The two marks, in the words David approved (2026-11-15: option A):

- *`, audible` on the exit line.* `west to the Cloister, audible` joins the exit's trailing modifiers, beside `, one-way` (`packages/chord/chord.ebnf:905`). Like the exit it applies both ways unless the exit is `one-way`. It lowers to `IExitInfo.audible?: boolean` on the exit's data in `RoomTrait.exits`, and propagation makes an edge of an exit only when the flag is set. A way through a door keeps ADR-172's door costs, so a closed door muffles. Chord cannot write a wall, so in Chord the way is the only carrier; in a TypeScript story a wall carries sound when it has an `AcousticTrait`, which is that author's mark, and a wall without one carries nothing.
- *`acute-hearing` on an actor.* An adjective like `night-vision`, lowering to a marker trait with no data, `AcuteHearingTrait` (`TraitType.ACUTE_HEARING`), beside `NightVisionTrait`. It makes the actor a hearer without also writing `listener`. For an acute hearer every exit is an edge at ADR-172's costs, marked or not, so loudness and closed doors set how far it hears: the rule every listener has today becomes the acute hearer's rule.

**D2 — A sound exists as its hearings.** (David, 2026-11-15: "a tree that falls in the forest makes no sound if no one is there to hear it!") Delivery starts from who could hear: a hearer in the room, across a marked connection, or with acute hearing in reach. With none, nothing is propagated, nothing is rendered and no reaction runs. A sound nobody hears leaves the turn's record of it being made and nothing else.

**D3 — An act has a sound side, and a story turns it on.** (David, 2026-11-15: "should we add a property actions for 'sound level'?", then "we might have sound perception as default 'off' and the author has to explicitly turn it on.")

- *The property.* An action's lifecycle descriptor declares a sound tier on `VolumeTier`; an action that declares none is silent. The platform ships the tiers for the standard actions, in the table below.
- *Off by default.* A story that does not ask for it gets no action sounds: no action emits one, and nothing a player reads changes on that account. A story turns it on with one header line, `use action-sounds`, as `use scoring` and `use hunger` turn on their systems (`packages/chord/chord.ebnf:226`) (David, 2026-11-15: option A). It is a manifest named `action-sounds` that contributes no trait adjectives, like `hunger`'s. A TypeScript story turns it on through the registration that line lowers to.
- *On.* A successful act emits a sound whose `kind` is the action and whose tier is the descriptor's, named as the sound of that act's event: `ISound` gains `ofEvent?: string`, the id of the event it is the sound side of. The phase runner emits it after the report phase of an act that was not refused (`packages/stdlib/src/actions/lifecycle/phase-runner.ts`), from the descriptor, so no action emits its own (ADR-337 D1). A thing whose behavior decides its own sound emits it the way any non-action emitter does, as a `sound.emitted` effect (ADR-374 D6).

*The shipped tiers* (David, 2026-11-15: option A, the draft accepted). What a hearer gets is the tier's budget less the path's cost, by the clarity table ADR-172 shipped (`packages/engine/src/sound/propagation.ts:121-127`; budgets at `packages/if-domain/src/sound/types.ts:55-61`):

| Tier | In the same room | Next room, open audible way | Next room, closed door |
|---|---|---|---|
| whisper | `presence-only` | not heard | not heard |
| subdued | `fragments` | `presence-only` | not heard |
| normal | `full` | `full` | `presence-only` |
| raised | `full` | `full` | `muffled` |
| shouting | `full` | `full` | `full` |

No tier is `full` in its own room without being `full` next door, so a quiet act in the dark is heard as something, not as what it was. David accepted the table with that stated.

| Tier | Actions |
|---|---|
| none | looking, examining, looking under, searching, reading, consulting, inventory, smelling, listening, touching, waiting, sleeping, waking, hiding, waving, showing, kissing, steering, setting course, and every meta action |
| none: carried by the line (D6) | asking, asking for, telling, answering, talking, saying yes, saying no, saying sorry, saying goodbye |
| none: the thing decides | lowering, raising, turning, setting, cutting, digging, burning |
| whisper | taking, dropping, putting, inserting, removing, giving, wearing, taking off, eating, drinking, tying, untying, lighting, extinguishing, switching on, switching off, locking, unlocking, buying, emptying |
| subdued | going, entering, exiting, climbing, opening, closing, pushing, pulling, throwing |
| normal | attacking, breaking, jumping |

The verbs in "the thing decides" have no standard meaning (ADR-371), so their sound belongs to the target's behavior, which emits one if it wants one. Each sounding action gets its own heard lines in `lang-en-us`, because the default line prints the sound's kind verbatim (`packages/lang-en-us/src/sound-messages.ts:39`); those lines are drafted at implementation for David's review.

**D4 — A perceiver gets one side of an act: the act if it can see the actor, its sound if it cannot.** (David, 2026-11-15: "the reaction to hearing something would be if an actor was out of sight.") Hearing is what a perceiver gets of an actor it cannot see. An actor who sees the act perceives the act (ADR-400 D2 rule 6). A hearer in the room who cannot see the actor perceives the sound. A hearer in another room perceives it where D1 lets it carry. A reaction to hearing an act therefore never fires beside the seen act. The service decides which side by the sense order it already has, `SENSE_PRECEDENCE`, and it can because the sound names its event. The decision is taken at delivery: the sound stage asks the service, and a hearer whose percept of the named event was `perceived` is not delivered the sound at all, so no heard event exists for a seen act, for the player or for an NPC's queue. The player in the dark, in a story with action sounds on, reads the heard line through the `sound.heard.<kind>.<tier>` templates the prose pipeline already resolves; in a story with them off, ADR-400 D9 holds and the player reads nothing.

**D5 — Chord gains `<subject> can hear <thing>`, and it reads the rule sounds are delivered by.** (David, 2026-11-15: option B.) The condition sits beside `can see` and `can reach`. It is true when the subject is a hearer (ADR-400 D6) and the thing is in its room, or across a connection marked for hearing, or within the subject's acute hearing. That rule becomes the body of `canPerceive(…, 'hearing')`, so a condition can never say yes where a sound would not arrive. `ScopeResolver.canHear` moves onto the same rule in this landing (David, 2026-11-15: option A). It says same room or any connected room today, which D1 contradicts, and `listening` and the command validator read it, so the LISTEN command and what a player may refer to by sound now follow `audible` ways and acute hearing. Its one case of its own joins the rule for every reader: a thing in a closed container is heard only when it is `raised` or louder (ADR-392 D5; `packages/stdlib/src/scope/scope-resolver.ts:136-146`). With that, the condition, the command and the delivery cannot give three answers about one sound.

**D6 — A spoken line is an event with a sound side, like an act.** (David, 2026-11-15: option A.) Every line said in a scene is a located event, `character.line.spoken`, with a `speech` sound named as its sound side, whoever it is addressed to. The two carriers of Context become one rule:

- An actor who sees the speaker perceives the line. A hearer who cannot see the speaker gets its sound, in the room or across an `audible` way, at the tier propagation gives (D1, D4).
- A line said to the player is therefore audible beyond its room where the story marked the way, which it is not today.
- A player in the room with two NPCs talking reads their lines as written, where today they read as heard speech. This is a content change, and goldens that pin those lines re-record.
- ADR-400 D12's clause, `after hearing <phrase-key>`, fires for every line: for an owner who perceives the line event, and for an owner who hears its sound side at a tier that still carries the words, `full` or `muffled`. At `fragments` or `presence-only` the words did not arrive and the clause does not fire. ADR-400 D12 limited the clause to an owner who can see the speaker; this record lifts that limit for hearers at its landing.

The scenes sub-step's speak path (`packages/character/src/conversation/scene-sub-step.ts:150-190`) loses both its branches: it emits the event and the sound for every line.

### On paper

The scene of ADR-400's exercise, with the sound decisions applied. The three marks whose words are open are written as comments, not as syntax. Not compiled.

```
story
  title: Refectory
  authors:
    T
  id: refectory
  story-version: 0.0.1
  use action-sounds

define sound tolling

create the Refectory
  a room
  west to the Cloister, audible

  A long room of benches.

create the Cloister
  a room
  east to the Refectory

  A covered walk.

create the bell
  in the Refectory

  A brass handbell.

  after the player taking it
    play sound tolling
  end after

create Brannoc
  a person, proper, listener
  in the Cloister

  The prior.

  ## Fires only because the way is marked (D1) and Brannoc is a listener.
  after hearing the tolling, once
    phrase brannoc-looks-up
  end after

  ## The condition, new under D5: the same answer as the delivery.
  on every turn while Brannoc can hear the bell and one chance in 2
    phrase brannoc-listens
  end on

create the hound
  a person, acute-hearing
  in the Cloister

  ## Hears the Refectory whether or not the way is marked, and needs no
  ## `listener`.
  It has one ear up.

define phrase brannoc-looks-up
  In the cloister, Brannoc looks up.
end phrase

define phrase brannoc-listens
  Brannoc tilts his head toward the refectory.
end phrase
```

```typescript
// The descriptor's new field (D3). Absent: the action is silent.
export const takingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TAKING,
  reportEventType: 'if.event.taken',
  blockedEventType: 'if.event.take_blocked',
  slots: [/* as today */],
  sound: 'subdued',
};

// The one hearing rule (D5), behind both the condition and the delivery.
perception.canPerceive(brannoc, refectory, world, 'hearing');
// true: a listener, and the way from the Cloister is marked
// false for an unmarked way; false for a subject that is not a hearer
```

## Consequences

- No sound crosses between rooms unless the story marked the connection or the hearer. This changes shipped behavior for every story with a sound heard from another room; the plan's census counts them before anything lands, and each is fixed by marking its connections or accepted as changed.
- A story that turns action sounds on gains heard lines for acts by actors out of sight. A story that does not is unchanged on that account.
- The standard actions each gain a sound tier, and `lang-en-us` gains heard lines for them.
- `ISound` gains the event it is the sound of. This is not the listener exclusion David refused in session 50bec0: it says what a sound is, and the service decides who gets which side.
- `canPerceive(…, 'hearing')` stops returning true for everything, so an event that declares a `hearing` rendering reaches only a hearer in reach.
- With nothing audible, propagation does no work (D2).
- LISTEN and by-sound references follow the authored connections. `stories/trait-field-test/trait-field-test.story:142`, where a loud thing is heard through the cellar door, needs `, audible` on that way or a changed expectation; the census names it.
- Nothing new is saved. The `audible` flag is exit data on `RoomTrait`, which the world snapshot carries; the acute-hearing marker is registered with the trait implementations so it restores; `use action-sounds` is registration, redone at every load.
- Every scene line is an event with a sound side (D6). A player present at an NPC-to-NPC line reads it as written, and a line said to the player can be overheard across an `audible` way.

## Acceptance

Each criterion names where it is discharged. Criteria that wait on a question say so.

1. A real-engine test with three rooms in a row: a sound played in the first runs `after hearing` on a hearer in the second only when the way between them is marked for hearing, runs it on an acute hearer with no mark, and runs it on nobody in the third; a `one-way` audible exit carries one way only, and a closed door on an audible way lowers the tier (story-loader test over engine, world-model, chord).
2. With no hearer in reach, the sound stage produces no heard event and propagation is not called (engine).
3. A story without `use action-sounds`: no standard action emits a sound, and the Dungeo chain is byte-identical on that account (repository; stdlib). `use action-sounds` compiles, and an unknown `use` word still fails as it does today (chord).
4. A story with the header line: an act by an actor the player cannot see prints its heard line, an act the player can see prints once and with no heard line, and a `listener` NPC who cannot see the actor finds the hearing, not the act, in `ctx.perceived` (story-loader test over engine, stdlib, lang-en-us). A structural test fails when a standard action's descriptor disagrees with D3's table or a sounding action has no heard line (stdlib, lang-en-us).
5. `<subject> can hear <thing>` compiles and answers by D1's rule: true for a `listener` in the thing's room, true across a marked connection, false across an unmarked one, false for a subject that is not a hearer; and in each case it agrees with whether a sound from that thing is delivered (chord tests; story-loader real-engine test over stdlib).
6. The census of stories with a cross-room sound is reviewed before the default changes (repository).
7. A real-engine test of speech: a player in the room with two NPCs talking reads the line as written and no heard-speech line; a `listener` across an `audible` way hears a line said to the player; that listener's `after hearing <phrase-key>` runs at `full` and at `muffled` behind a closed door, and does not run across an unmarked way (story-loader test over engine, character, chord).
8. LISTEN names a sounding thing across an `audible` way and refuses one across an unmarked way; a quiet thing in a closed container is not heard by the command, the condition or the delivery, and a `raised` one is heard by all three; a save taken in a story with an `audible` way and an acute hearer restores both (stdlib; story-loader real-engine test).

## Session

Session 3b1492, 2026-11-15, branch `main`. Split from ADR-400 during its open-questions interview, at David's direction.
