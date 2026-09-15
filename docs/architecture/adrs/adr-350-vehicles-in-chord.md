# ADR-350: Vehicles in Chord — native composition or gated extension

**Status**: **RESEARCH — NOT SCHEDULED** (David's ruling, 2026-09-14, session 4ca16b: "I have no plans to tackle chord vehicles now — file the ADR as research and as a gh feature". Tracked as a feature request; see the Session note for the issue number.

This document is a **measured record of the vehicle model as it stands and of the design space around it**, not a decision awaiting acceptance. Its D1–D8 are the shape a future session would start from, not obligations on anyone now. **No `adr-review` has run, nothing is accepted, and no implementation is authorized.** The Open Questions section is non-empty and stays that way deliberately — under rule 11a this document is not ACCEPTED and no open-questions interview is owed, because the premise question (should this be built, and when) is answered "not now" rather than left open.

Written the same session at David's "two ADRs — one for the room name and a second for chord vehicle", extended by "the vehicle ADR probably should offer native vs extension implementation options" and by his five author-facing questions about movement. Raised as a gap while writing ADR-349, whose motivating case — the Dungeo well-room bucket — cannot be written in Chord at all.)

**Scope**: `packages/chord/src/catalog.ts` and `src/manifests/` (whichever of the two admits the vocabulary), `packages/story-loader` (the trait mapping), `packages/world-model/src/traits/vehicle/vehicleTrait.ts` (the model this would expose), and `packages/stdlib` (the actions that would have to enforce it). If Q-1 resolves to the extension route, add `packages/extensions/vehicle`.

## Date: 2026-09-14

## Parent

**Supersedes nothing.** **Depends on** ADR-349 D5, which makes a vehicle's `transparent` flag load-bearing for the first time. **Related**: ADR-215 (the `use <extension>` gate and the manifest shape), ADR-218 §1a (`enterable` as an always-explicit composition), ADR-090 (capability dispatch, which the Dungeo basket uses instead of vehicle machinery).

## Context — verified, not assumed

### Chord cannot describe a vehicle

The composable catalog has `container` (`packages/chord/src/catalog.ts:23`) and `enterable` (`:42`, ADR-218 §1a). It has no `vehicle`. Nor does any extension manifest contribute one — the six shipped manifests are combat, hunger, chapters, npc, scoring and state-machines (`packages/chord/src/manifests/`).

So the well-room bucket — the case ADR-349 is shaped around — is not expressible in Chord, and cannot be that ADR's acceptance test in Chord without this one.

### `VehicleTrait` is an eight-field model with one live field

```ts
// packages/world-model/src/traits/vehicle/vehicleTrait.ts:84-94
transparent: boolean;
...
this.transparent = options.transparent ?? true;
```

Measured across `packages/*/src/` and `stories/`, 2026-09-14:

The model is served by `packages/world-model/src/traits/vehicle/vehicleBehavior.ts`, which exports eight helpers. What matters is which of them anything *calls* — measured 2026-09-14 across `packages/*/src` and `stories/`, excluding build output:

| Field | Reader | Reached by |
| --- | --- | --- |
| `transparent` | `getDescribableLocation` (`VisibilityBehavior.ts:569-579`) | **every look** |
| `blocksWalkingMovement` | `canActorWalkInVehicle` (`vehicleBehavior.ts:148`) | **`going.ts:102, 268`** |
| `positionRooms`, `currentPosition` | `moveVehicle` (`vehicleBehavior.ts:82-87`) | story code — `fill-action.ts:159-164`, `balloon-daemon.ts:232-235` |
| `requiresExitBeforeLeaving` | `canActorLeaveLocation` (`:118`) | **nothing** |
| `isOperational`, `notOperationalReason` | `canVehicleMove` (`:98`) | **nothing** |
| `vehicleType` | — | — |
| `movesWithContents` | — | — |

So the model is **half-wired, not unwired**. `going` genuinely refuses to walk out of a bucket. But `canActorLeaveLocation` and `canVehicleMove` have no callers anywhere, which means `requiresExitBeforeLeaving`, `isOperational` and `notOperationalReason` are written by two Dungeo regions and an action (`well-room.ts:291-298`, `volcano.ts:455-458`, `inflate-action.ts:147-149`) and consulted by nobody. The balloon's `isOperational: false` before inflation enforces nothing.

`vehicleType` is a five-member union (`counterweight | watercraft | aircraft | cable | generic`) that selects no behavior, because the behavior lives in each story's own actions and daemons.

**An earlier revision of this ADR stated that `blocksWalkingMovement` was unenforced.** That was wrong: the grep behind it excluded the vehicle trait directory and so missed the behavior module that `going` imports by helper name rather than by trait. The corrected table is above, and it changes the argument — vehicles are already a core stdlib concern in the one place a player most notices.

### The platform already treats "vehicle" as three unrelated things

- `VisibilityBehavior` uses it for **transparency**, and only that.
- `if-entity.ts:647` folds it into enterability: `this.has(ENTERABLE) || this.has(VEHICLE)`.
- Dungeo's own bucket, balloon and boat carry the trait for its `positionRooms` bookkeeping and implement every actual behavior in story code (`fill-action.ts`, `inflate-action.ts`, `balloon-daemon.ts`).

The coal-mine basket, which the trait's own doc comment names as a vehicle ("bucket, boat, basket, balloon"), **does not carry `VehicleTrait` at all** — it is a `SceneryTrait` container driven by capability dispatch (`stories/dungeo/src/traits/basket-elevator-behaviors.ts`, ADR-090). Two objects of the same kind, two unrelated mechanisms, and the platform has no opinion about which is right.

### This is not a cost question

New Chord syntax is platform work whether it lands in the core catalog or behind a `use` gate: the grammar, the analyzer, the loader mapping and the tests are the same work either way. An extension manifest is pure data (`packages/chord/src/manifests/types.ts:33-46`) and the platform-side trait mappings still live in `@sharpee/story-loader`. The axis between the two options is **reuse and opt-in**, not effort.

### The author's five questions, against what already exists

David's framing of what an author must be able to define, each measured against the language as it stands:

| Question | Where it lives today | Gap |
| --- | --- | --- |
| **What opens and closes its entry point?** | `openable`, `lockable` compositions (`packages/chord/src/catalog.ts:33-34`), with `starts open` / `starts locked` (`:91-92`) | none — ordinary composition |
| **Can the player put other things in it?** | `container` composition | **partial** — the loader builds a bare `new ContainerTrait()` (`loader.ts:1635`), so *whether* is authorable and *how much* is not |
| **What makes it go?** | story code — an action (`fill-action.ts:159`) or a daemon (`balloon-daemon.ts:232`) calling `moveVehicle` | **no declarative surface** |
| **Can it go multiple ways, and how?** | `positionRooms` as a name→room map; which position comes next is story logic | **no declarative surface** |
| **Can the player control it, and how?** | `blocksWalkingMovement` decides whether GO works; everything else is story verbs | **partial** — the refusal is authorable in principle, the affordance is not |

Two of the five are already ordinary trait composition and need nothing from this ADR. One needs a capacity field. The remaining two — what makes it go, and in how many directions — are the whole design space, and both Dungeo vehicles implement them in TypeScript.

### Chord already has a shape for "what makes it go"

`define machine` (ADR-215, `use`-gated) is states, triggers, guards and effects:

```
define-machine = "define" "machine" WORD { WORD } NL
                 >>> { "role" WORD "is" name NL | "starts" WORD NL | machine-state }
machine-state  = "state" WORD [ "," "terminal" ] NL >>> { machine-when | machine-on } ;
machine-when   = "when" machine-trigger [ "while" condition ] ":" WORD NL ;
machine-trigger= "event" phrase-key | WORD name | WORD | condition ;
```
*(`packages/chord/chord.ebnf:1022-1038`.)*

A vehicle's positions are states, `when <action on a role> [while <condition>]` is what makes it go and under what circumstances, several `when` lines out of one state is multiple directions, and `on enter` / `on exit` bodies carry the `move <name> to <place>` statement (`:1379`) that relocates it. That covers three of the five questions with shipped grammar and no new concept.

## Decision

**D1 — A vehicle becomes expressible in Chord.** An author can declare that an enterable thing carries actors between locations, without dropping to TypeScript.

**D2 — Chord exposes only fields the platform enforces.** A word an author can write must change what the game does. Exposing `blocksWalkingMovement` while no action reads it would ship inert configuration into the language, and inert configuration in a language surface is worse than in a trait constructor, because a `.story` file is the thing an author is entitled to trust. So `transparent` is exposable today, and each remaining field becomes exposable only when something reads it.

**D3 — Enforcement is part of this decision, not a follow-up.** D2 with no enforcement work reduces the whole feature to one boolean. At minimum, `blocksWalkingMovement` and `requiresExitBeforeLeaving` need a consulting action — `going`, and probably `entering`/`exiting` — before they are worth a Chord word.

**D4 — `vehicleType` is not exposed.** It selects no behavior in the platform and none in Dungeo. A five-member union that changes nothing is vocabulary an author would reasonably expect to mean something.

**D5 — The two Dungeo mechanisms are not unified by this decision.** The bucket's `VehicleTrait` and the basket's capability-dispatch behaviors stay as they are. Whether a lidless fixed container that transports is "a vehicle" is a modelling question this ADR does not answer, and Dungeo is not a design input for Chord.

**D6 — The author defines a vehicle's movement, and the split is enclosure versus motion.** The five questions an author must be able to answer divide cleanly, and the division is what this ADR decides:

- **Enclosure semantics** — the entry point (`openable`/`lockable`), what may be put inside (`container`), whether the player can see out, and whether GO works from inside. These are properties of *a thing you are in*, they are read on ordinary turns by ordinary actions, and they belong wherever enclosures belong.
- **Motion** — what makes it go, to which of several destinations, triggered by what, guarded by what. This is a story's own mechanism, it is opt-in, and it is the part a `use` gate is for.

**D7 — Motion is expressed as a state machine, not as new vehicle syntax.** Positions are states, `when <trigger> [while <condition>]: <state>` is the transition, and an `on exit` body carries the `move` that relocates it. `define machine` already means this (ADR-215); a parallel vehicle-movement grammar would be a second way to say the same thing. What the vehicle surface adds is the *binding* — that moving this entity carries its occupants — not the control flow.

**D8 — A vehicle's capacity becomes authorable.** "Can the player put other things in it" is one of the five questions, and today Chord answers only the yes/no half: `container` lowers to a bare `new ContainerTrait()` (`packages/story-loader/src/loader.ts:1635`) with no capacity. This is a gap in the `container` composition rather than a vehicle-specific one, and it is named here because the bucket is where it bites.

## The two implementation options

### Option N — native composition

`vehicle` joins the composable catalog beside `container` and `enterable`, with typed `with`-fields for whatever D2 admits.

```chord
create the bucket
  a container
  enterable
  vehicle, transparent
  in the Top of the Well
```

- **For**: vehicles are an ordinary IF primitive, as much as containers and doors are; `enterable` is already core and a vehicle is an enterable that moves. No header ceremony, no `use` line, discoverable in the catalog with everything else. ADR-349 D5 makes transparency part of how *every* location heading works, which is core behavior, not opt-in behavior.
- **Against**: it enlarges the always-admitted vocabulary for a feature most stories never use, and it commits the platform to enforcing the whole model rather than the part that is ready.

### Option E — a gated extension

`packages/extensions/vehicle` plus a Chord manifest, admitted by a header line.

```chord
story
  title: The Well
  use vehicles

create the bucket
  a container
  enterable
  vehicle, transparent
  in the Top of the Well
```

- **For**: the vocabulary appears only for stories that ask for it, and the runtime registration that would enforce D3 — the `going` interception, the exit rules — installs only where it is wanted. It matches how combat, hunger, chapters and state-machines are already scoped, so it needs no new concept. It also lets the feature ship incrementally: an extension that starts with transparency and grows enforcement is a smaller promise than a core word that does.
- **Against**: `transparent` is read by `VisibilityBehavior` unconditionally, which means the *platform* already behaves differently for vehicles whether or not a story said `use vehicles`. An extension that gates a word for behavior the core already performs is a seam in the wrong place. ADR-349 D5 sharpens this: the location heading would consult vehicle transparency in every story, gated or not.

### The opaque case decides it

David's third case — "a vehicle could be an enclosed tube underground" — is opaque and moving, and it makes the seam obvious. `getDescribableLocation` branches on `VEHICLE` **before** `CONTAINER` (`VisibilityBehavior.ts:569, 581`), and the two branches do the same two things for the same reason:

| | transparent | opaque |
| --- | --- | --- |
| vehicle branch (`:569-579`) | room + `immediateContainer` | the vehicle is the place |
| container branch (`:581-595`) | room + `immediateContainer` (open) | the container is the place (closed) |

The vehicle branch differs only in **which flag it reads** — `transparent` versus `isOpen`. Location resolution is not asking whether the thing moves; it is asking whether the player can see out of it. `VehicleTrait` contributes nothing to that question that an enclosure-general property would not contribute better, and the two branches collapse into one.

### Recommendation

**Option E, with location resolution taken out of the vehicle model entirely.**

Once "can you see out of it" is a property of any enterable enclosure, `VehicleTrait` is left with exactly one job — moving the player between locations — and that is genuinely opt-in mechanics: GO interception, exit rules, positional movement. Those are what a `use` gate is for, and they are what combat, hunger and state-machines are already scoped by.

This also disposes of Option E's one real objection. The concern was that an extension would gate a word for behavior the core performs unconditionally; after the collapse, the core performs no vehicle-specific behavior at all. And it disposes of ADR-349's Q-3 as a side effect: a lidless container is transparent because it says so, not because a branch failed to find an `OpenableTrait`.

That reshapes ADR-349's D5 and D4a and should be settled with them rather than after.

## Acceptance Criteria

None are discharged — nothing is implemented. Two are stated now; the rest depend on Q-1.

1. **AC-1 (D1/D2).** The Dungeo well-room bucket is expressible in Chord, and a compiled Chord story reproduces its transparency behavior — the player inside it sees the surrounding room. **REAL-PATH** (rule 13a): driven through an assembled engine from a `.story` file, not asserted against IR.

2. **AC-2 (D2, the inert-field gate).** For every field the Chord surface admits, a test exists that fails when the platform stops honoring it. A field with no such test is not admitted. **MECHANICAL, and self-policing** — it is the criterion that keeps D2 true as the surface grows.

## Consequences

- **ADR-349's bucket acceptance test depends on this ADR.** AC-4 there is written against a Chord story; without a vehicle surface it can only be written in TypeScript, which tests the platform and not the language.
- **Three documented-but-unenforced fields become visible.** Whatever Q-1 decides, D2 and D3 mean someone has to either implement or retire `blocksWalkingMovement`, `requiresExitBeforeLeaving` and `isOperational`. They have been inert since they were written, and Dungeo sets them in the belief they do something.
- **`transparent` changes from a near-dead flag to a load-bearing one** under ADR-349 D5, in every story, before this ADR ships anything. That is a consequence of ADR-349 that lands here because this is where vehicles are discussed.
- **If Option E is taken, the extension count goes from six to seven**, and the new-package registration checklist applies, including the one-time npm bootstrap that lives outside the repository.

## Open Questions

1. **Native or extension?** The decision above recommends Option E with the transparency seam moved out of the vehicle model, but this is David's call and the rest of the ADR reads differently depending on it.

2. **Where does transparency live if it is not a vehicle property?** The recommendation implies any enterable enclosure declares whether the player sees out. Candidates: a field on `EnterableTrait`, a new marker trait, or a derived default. Whatever it is, it has to carry both values well — the tube and the sealed barrel are as ordinary as the bucket and the open crate — and it decides whether the coal-mine basket gets correct behavior for free. It also supersedes ADR-349's Q-3 rather than answering it.

2a. **Does collapsing the two branches change any shipped story's output?** The collapse is behavior-preserving only if every current `VEHICLE`/`CONTAINER` combination maps to the same answer under one rule. Dungeo's bucket (transparent vehicle, open container) and balloon are the live cases, and this must be measured against the walkthrough chain before the collapse ships, not argued.

3. **Which of the inert fields get implemented, and which get retired?** `blocksWalkingMovement` and `requiresExitBeforeLeaving` describe real Zork behavior and probably deserve implementing. `isOperational` and `vehicleType` may be better deleted than exposed — but deleting fields from a shipped trait touches Dungeo, which sets them.

4. **How does a machine bind to a vehicle?** D7 says motion is a state machine, but not how a machine's `move the bucket to the Well Bottom` comes to carry the bucket's occupants. Candidates: `move` learns that moving a vehicle moves its contents (making the binding implicit and universal), or the machine names the vehicle in a role and the vehicle surface supplies a movement statement of its own. The first is smaller and risks surprising a story that moves a vehicle deliberately without its passengers.

5. **Does `positionRooms` survive?** Under D7 a machine's states already name the positions and its bodies already name the rooms, which makes `positionRooms`/`currentPosition` a second, redundant record — and a redundant record of a fact is the shape ADR-347 and ADR-348 exist to reject. But they are the two fields Dungeo actually reads, so retiring them is a Dungeo change.

6. **Where does capacity go (D8)?** A `with`-field on the `container` composition is the obvious shape, but `container` is core vocabulary and this would be the first typed configuration on it. Whether that is a `with maximum 5` field, a separate `holds` line, or something else is undecided.

7. **Is GO-from-inside a refusal or an affordance?** `blocksWalkingMovement` decides whether GO is refused. A tube with doors that open onto a platform arguably wants GO to *work* — walking out is the correct way to leave. That is the `requiresExitBeforeLeaving` half, whose reader has no callers, so the affordance has never been exercised. The author-facing question "can the player control it, and how" needs both halves to mean something.

## What would falsify this

Evidence that authors do not want vehicles declaratively — that every real vehicle needs story-specific movement logic anyway, so a Chord word buys only the enclosure semantics that `enterable` plus a transparency flag would give on their own. Dungeo is weak evidence in that direction: both its vehicles implement movement in story code, and its third transporting object does not use the trait at all. One story is not a sample, and Dungeo is explicitly not a Chord design input, so this is named as the thing to watch rather than as a finding.

## Session

Session 4ca16b, 2026-09-14, on `main`. Written immediately after ADR-349, whose motivating case exposed the gap. The native-versus-extension framing is David's request, made while ADR-349 was being written, as are the five author-facing movement questions in the Context.

Filed as **GH #466** ("Vehicles in Chord: author-defined enclosure and movement") at his instruction, the same session, when he ruled the work not scheduled.
