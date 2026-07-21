# Person / NPC-automation / Character-model — disentangling notes

Working notes for a **major platform workstream** surfaced 2026-07-15 while walking
the friendly-zoo Creatures & NPCs cluster (ADR-222, extends seam FZ-G1). **Large
blast radius — its own ADR(s) + migration plan; do not rush, do not start code.**

## The finding

`person` currently fuses **three orthogonal concepts** (the same category error as
animal/scenery, one level up):

1. **`ActorTrait`** — an *agent*: acts, takes turns, has inventory. The Chord
   `person` kind maps here (`loader.ts:587`); the **player** is an actor too.
2. **`NpcTrait` (ADR-070)** — pure **automation**: "act autonomously… participate in
   the turn cycle… behaviors." All mechanism (`behaviorId`, `canMove`,
   `allowed/forbiddenRooms`, movement announcements). **No personhood.** Misnamed —
   it's an *autonomous-behavior* attachment, not a "this is a character" marker.
3. **`CharacterModelTrait` (ADR-141)** — **personhood**: disposition, knowledge,
   relationships, conversation. The "something bigger" `person` implies.

## The elegant separation (David confirmed 2026-07-15)

Three composable layers, not one overloaded kind:

- **Base kind** — `person` (a character-agent) or `animal` (a creature, FZ-X1).
- **Automation layer** — autonomous turn-cycle behavior (patrol, chatter, flee).
  Rename off "NPC" to something mechanism-honest; **composes onto a `person` OR an
  `animal`** (or other actors). This subsumes **FZ-G1** (movement/patrol is one
  automation behavior).
- **Personhood layer** — `CharacterModel` (disposition/knowledge/conversation);
  composes onto characters.

Zoo falls out cleanly: **parrot** = `animal` (a bird) + automation (chatter) —
*mis-kinded as `person` today*; **zookeeper** = `person` + automation (patrol) +
optional character-model; a **stationary shopkeeper you converse with** = `person`
+ character-model, no automation.

**Naming is the tell:** "NPC" fuses a role claim ("non-player *character*") with a
mechanism ("automated behavior"). Give the mechanism a mechanism name.

## Blast radius (grounded 2026-07-15)

`NpcTrait`/`NpcBehavior`/`isHostile`/`isConscious`/`plugin-npc` touch **~13 modules,
85+ non-test files**:

| Module | files | note |
|---|---|---|
| stories/dungeo | 40 | thief, combat, roaming NPCs — the heavy consumer |
| packages/world-model | 18 | the trait + behaviors + barrel |
| packages/stdlib | 6 | NPC turn phase, actions reading NPC state |
| packages/sharpee | 6 | exports / genai-api |
| stories/friendly-zoo | 3 | parrot, zookeeper |
| packages/plugin-npc | 3 | the automation plugin itself |
| packages/devkit | 3 | |
| stories/thealderman | 2 | |
| engine / story-runtime-baseline / lang-en-us / extensions / transcript-tester / repokit | 1 each | |

Combat (ADR-072, `ext-basic-combat`, armoured, dungeo) leans on `NpcTrait`'s
`isHostile`/`isAlive` — so the automation/combat coupling is part of the untangle.

## Approach (David, 2026-07-15)

Treat this as a **Sharpee platform change** — the primary framing. The four-layer
separation (AGENT / AUTOMATION / CREATURE-STATE / PERSONHOOD) lands in the platform
(world-model, stdlib, plugin-npc, character). Two gates ride alongside:

- **Explicit Chord validation** — a *first-class acceptance gate*, not an afterthought.
  Each layer gets a Chord authoring surface **and** a Chord fixture/validation proving
  an author can express it from a `.story` file. Per the elegance-oracle principle
  ([[chord-as-elegance-oracle]]): if Chord expresses a layer cleanly, the platform
  shape is right; if it can't, the platform shape is wrong.
- **Dungeo regression — secondary.** The existing canon TS story (thief, combat,
  roaming NPCs) is the safety net, regression-tested after each change. It is **not**
  the design driver: we design the clean four-layer platform + Chord surface, then make
  Dungeo still pass (migrating its `NpcTrait`/`customProperties` usage as needed). We do
  NOT let Dungeo's current fused/hacked usage dictate the design.

Per child (A/B/C/D): **platform trait/behavior change → Chord surface + Chord validation
fixture → Dungeo regression check.** The Alderman is the personhood layer's realization
target (validates child C); friendly-zoo is a light automation regression.

## Status / next

- Its own **major ADR** (or a small set: kind/actor vs automation vs character-model)
  under ADR-214's parity umbrella — likely needs its own open-questions interview
  given the design surface.
- **Migration plan** across the ~13 modules, dungeo first (biggest + the thief is the
  canonical automated NPC for the eventual Chord Mainframe Zork).
- Related: FZ-X1 (`AnimalTrait`, `animaltrait-design-notes.md`), FZ-G1 (movement —
  now a sub-part of the automation layer), ADR-070 (NPC), ADR-141 (character model),
  ADR-072 (combat).
