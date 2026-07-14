# The Sharpee Standard Library — Author Reference

A writer-facing catalog of what Sharpee gives you for free: every standard
action a player can type, every trait you compose onto an entity, and the
runtime services (plugins and daemons) behind timed and NPC behavior. This is
the companion to the Chord language reference (`chord-language.md`): that
document teaches the language and its `define trait` / `define action` / hatch
escape hatches; this one catalogs everything already built in, so you know what
*not* to define before reaching for those hatches.

> **Status: SKELETON** — sections are being filled in by the
> `docs/work/stdlib-reference/` plan. Examples are hand-written Chord syntax.

## 1. How to read this reference

### 1.1 What the standard library is
*[Placeholder: stdlib = the standard actions + traits + behaviors + plugins
that ship with Sharpee; the vocabulary a Chord `.story` builds on without any
`define`.]*

### 1.2 How an action entry is laid out
*[Placeholder: each action lists its verb(s), what it does, the trait(s) an
entity needs to be eligible, the preconditions it checks, and the message keys
you can override with `phrase` / `define phrases`.]*

### 1.3 Standard behavior vs. per-entity verbs
*[Placeholder: most verbs have one canonical behavior (TAKE, OPEN); a few
(LOWER, RAISE) have no single meaning and are defined per entity by the story —
ADR-090. Cross-link to chord-language.md's on/after chapter.]*

### 1.4 Messages are IDs you override, not fixed text
*[Placeholder: stdlib emits message IDs; lang-en-us supplies the English; you
override per entity with a `phrase <key>` override (chord-language.md §2.10).]*

## 2. Manipulation

*[Placeholder: moving things by hand.]*

### 2.1 taking and dropping
*[Placeholder: take/get/grab/pick up; drop/discard/put down; portable by
default, scenery blocks.]*

### 2.2 putting and inserting
*[Placeholder: put on a supporter vs. put in a container.]*

### 2.3 removing (taking from)
*[Placeholder: remove/take X from a container or supporter.]*

### 2.4 giving and showing
*[Placeholder: give/offer and show/display to a recipient (NPC).]*

### 2.5 throwing
*[Placeholder: throw at a target / throw to a recipient.]*

### 2.6 pushing, pulling, touching
*[Placeholder: standard report behavior + how a story extends them per entity.]*

### 2.7 lowering and raising (per-entity verbs)
*[Placeholder: no stdlib default — the entity decides; capability dispatch.]*

### 2.8 Manipulation traits
*[Placeholder: container, supporter, pushable, pullable, moveable-scenery,
attached.]*

## 3. Movement

*[Placeholder: getting an actor from place to place.]*

### 3.1 going
*[Placeholder: go + the ten directions; blocked exits (cross-link chord §2.5).]*

### 3.2 entering and exiting
*[Placeholder: enter/board, exit/leave/disembark; enterable and vehicle.]*

### 3.3 climbing
*[Placeholder: climb/scale/ascend.]*

### 3.4 Movement traits
*[Placeholder: room, exit, enterable, climbable, vehicle, region, scene.]*

## 4. Containers & openables

*[Placeholder: getting things open and locked.]*

### 4.1 opening and closing
*[Placeholder: open/close; the openable trait.]*

### 4.2 locking and unlocking
*[Placeholder: lock/unlock with a key; the lockable trait.]*

### 4.3 Openable, lockable, and door
*[Placeholder: how door composes openable + lockable.]*

## 5. Wearing

*[Placeholder: putting on and taking off.]*

### 5.1 wearing and taking_off
*[Placeholder: wear/don/equip; remove/doff; wearable and clothing.]*

### 5.2 Wearing traits
*[Placeholder: wearable, clothing, equipped, open-inventory.]*

## 6. Senses & examination

*[Placeholder: describing how things look, sound, and feel.]*

### 6.1 looking and examining
*[Placeholder: look (the room) vs. examine (a thing); the see/feel/hear/smell
cascade.]*

### 6.2 searching and reading
*[Placeholder: search/look in; read; readable.]*

### 6.3 listening and smelling
*[Placeholder: listen/hear, smell/sniff; acoustic and listener.]*

### 6.4 Senses traits
*[Placeholder: readable, scenery, concealment, acoustic, listener.]*

## 7. Devices

*[Placeholder: switches and lights.]*

### 7.1 switching_on and switching_off
*[Placeholder: turn on/off, activate/deactivate; switchable.]*

### 7.2 Device traits
*[Placeholder: switchable, light-source, button.]*

## 8. NPCs & conversation

*[Placeholder: the actors a story writes and how the player interacts.]*

### 8.1 talking
*[Placeholder: talk/speak/converse; actor and npc.]*

### 8.2 attacking and combat
*[Placeholder: attack/hit … with a weapon; combatant, weapon; observable RNG
outcomes (no seeding).]*

### 8.3 eating and drinking
*[Placeholder: eat/drink; edible.]*

### 8.4 hiding
*[Placeholder: confirm binding; likely story-provided.]*

### 8.5 NPC & combat traits
*[Placeholder: actor, npc, character-model, combatant, weapon, edible,
breakable, destructible.]*

## 9. Meta & system actions

*[Placeholder: the actions every story gets for free, with no trait
requirements.]*

### 9.1 Information: about, help, inventory, scoring, version
*[Placeholder: what text each reads; score owners cross-link to chord §4.5.]*

### 9.2 Saving state: saving, restoring, restarting, quitting
*[Placeholder.]*

### 9.3 Turns and undo: waiting, sleeping, again, undoing
*[Placeholder.]*

## 10. Traits catalog

*[Placeholder: a direct, self-contained lookup for every trait, grouped as the
action chapters are, plus the structural traits below. Cross-links back to the
action chapter that uses each.]*

### 10.1 Structural & authoring traits
*[Placeholder: identity, region, scene, story-info — traits with no 1:1 verb.]*

## 11. Plugins & daemons

*[Placeholder: the runtime services behind timed and NPC behavior — what a
`define sequence` (chord §4.7) actually runs on top of.]*

### 11.1 Turn plugins and priority
*[Placeholder: the turn-plugin concept; priority order NPC 100 / state machine
75 / scheduler 50.]*

### 11.2 The scheduler: daemons and fuses
*[Placeholder: plugin-scheduler; what a sequence step-anchor compiles to.]*

### 11.3 The NPC and state-machine plugins
*[Placeholder: plugin-npc, plugin-state-machine.]*

### 11.4 Extensions: basic combat as a worked example
*[Placeholder: extensions/basic-combat — a plugin built on the standard
trait/behavior/action layers.]*

## Appendix: related references

*[Placeholder: pointers to chord-language.md (the language), chord-grammar.md
(the formal grammar), and genai-api (the TypeScript API dump); when to reach for
each.]*
