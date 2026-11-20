# Multi-World Stories — Overview

**Date opened**: 2026-11-19
**Status**: BRAINSTORM (will land as one or more ADRs)
**Target**: Sharpee 6 / Chord 5
**Absorbs**: [`multi-pc/overview.md`](../multi-pc/overview.md) — its open question "one shared `WorldModel` with per-PC scope filters, or separate `WorldModel` instances synchronized at boundaries?" is answered here: separate worlds, synchronized only through the controller.
**Research**: [Multi-World Stories — Research for Sharpee 6 / Chord 5](https://claude.ai/artifact/TtTUJB17MrJ4GMJVaDaeAH) (prior art, design decisions, Chord sketches)

## The idea in one paragraph

An author builds several separate world models inside one story, and a **controller** maps how they are played. Each world is a full `WorldModel` with its own entities, rules, vocabulary, and possibly its own player character. Worlds never touch each other. The controller is the only thing that knows more than one world exists: it holds the facts that cross worlds, the actors that persist across them, story time, and the rules for moving between worlds. Data flows into a world from the controller and back out, so state that should persist stays continuous. The technical reference is the PDP-11 RSTS/RSX Task Builder: a resident root segment (the controller), overlay segments that take turns (the worlds), and COMMON blocks (the shared state), all described declaratively in ODL.

## Decisions locked in this brainstorm

### D1. Star topology

All worlds map to the controller, never to each other. This is the one deliberate change from the Task Builder model, which let a segment reach anything on its path to the root. The tree is one level deep. A "dream inside a flashback" is two worlds the controller sequences; the controller holds the return point. Any world-to-world reference is a compile error.

### D2. Allowed vs authored

The platform decides what is **allowed**; the story decides what is **authored**.

- **Allowed** is a small closed set that keeps play deterministic: the star topology, one owner per shared fact, read-only queries, an actor embodied in one active world at a time, a fixed write order per turn. Breaking it is a compile error.
- **Authored** is everything else: which facts cross, redactions, who plays whom where, which worlds freeze or catch up, deadlines, rifts. The tooling informs ("this fact is read by four worlds and adds cross-world test cases"); it never forbids.

This departs from DDD on purpose. Software boundaries protect change over time across teams; a story has one author and a finished shape, and coupling across worlds is the point. Boundaries that remain are the ones the story needs: rules and vocabulary per world, knowledge per actor, testability, save compatibility.

### D3. The star rule is absolute

No escape hatch. None is needed: worlds "see" each other through authored constructs (shared facts and queries, requests, rifts, travelling actors and things). Matches Chord's stance on hatches.

### D4. Shared facts with owners replace ports and contracts

A fact that crosses worlds is declared once at controller level with a closed value set. The world that writes it owns it; any world may ask about it. The contract is derived from facts and ownership, so per-world takes/gives declarations are not needed.

- Two worlds writing one fact without a handoff is a compile error. A fact nobody asks about is an IDE note.
- A world test sets the facts it asks about and asserts the facts it owns.
- Declare a fact at controller level only if it truly crosses worlds; the rest stay local.

### D5. Worlds ask in two forms only

- **Fact queries** — read-only, answered as of now by the owning world. A dormant owner is loaded as a scratch copy, caught up to current story time, read, and discarded.
- **Requests** — events carrying values ("asks for a replay", "travel to Kelewan"). The controller grants or refuses them by its rules and performs the transition.

No general request/response ports.

### D6. Actors carry everything; the author redacts

An actor is a controller continuant. It carries all its memory by default. The author can:

- **redact** a memory in one world (a mask on the projection — the actor acts as if it doesn't know; the controller keeps the fact),
- **unredact** it when it becomes pertinent (an event-to-transition rule; if the actor is active, the memory arrives mid-play — the recall moment, whose text the controller owns),
- **remove** it permanently (`forgets`).

Fact-keyed memory (`knowledge`, valued beliefs) crosses as is. Entity-keyed memory (`told`, `conversationMemory`, `ledger`) is translated to continuants by the controller. A per-world translation such as `remembers vaguely` lowers confidence on entry; it is separate from redaction.

### D7. Roles are per-world bindings

An actor can be the PC in one world and an NPC in another. "Mara is the player" is a binding in the controller's wiring, not a rule that fires, so role swaps need no control flow. Builds on ADR-390 (the player is a role the session holds). Memory is symmetric because perception is: ADR-400 runs one perception service for every actor, so a PC's witnessed facts have the same shape as an NPC's.

### D8. Dormant worlds keep time

Dormant worlds are not frozen by default. On suspend, a world reports its next significant event in story time ("the dam fails at story turn 340"). On re-entry it catches up by the elapsed time. `frozen` opts out.

The forecast is exact, not estimated: in a star topology nothing can touch a suspended world except the controller, at re-entry, so its future is a pure function of elapsed story time plus controller inputs. This lets the active world know a disaster is coming in another — the deadline is projected in as a fact the PC holds (and memory rules apply to it) — and lets the player's speed decide whether they arrive on the brink or after the tipping point. Active-world actions can buy time by writing a controller fact the dormant world reads on re-entry.

### D9. Interleaved mode is in V6

Exclusive (one active world) is the default. Interleaved (several live worlds, input to one at a time — hot-seat multi-PC) ships in V6. Lockstep (all worlds step every turn) is not planned; the story clock plus catch-up covers the cases that seem to need it.

### D10. World-traversing actors are authored

A being who moves between worlds at will (Pug, Feist's Riftwar) needs no platform rule:

- player-initiated travel = a request whose destination is a controller fact; reachable worlds are memory ("Pug knows Kelewan"),
- **rifts** = a controller construct with one end in each world; each world sees only its end,
- things that travel = controller-level continuants, translated on entry,
- abilities per world and time rates per world = per-world bindings,
- projection into a second world = a second actor plus a rule merging its memory back.

## Leaning (spike to confirm)

**One `GameEngine` per world under a controller host.** Sharpee already sets this up: one engine runs one world, and a whole world saves and restores as one blob. The host holds shared facts, ownership, story clock, input routing, and transitions. The spike should show:

1. World-switch cost compared with a single save/restore turn.
2. Scratch-query cost with catch-up of 50 and 500 turns — and whether catch-up is N empty turns or a world-declared jump ahead.
3. Tagged output from several engines merging cleanly into one stream.
4. A byte-identical composite save on replay.
5. The host's write order with two live worlds (interleaved).

Spike story: two tiny worlds (~3 rooms each), one shared fact, Mara as NPC in one and player in the other with one redacted memory, one deadline. Driven by the transcript tester.

## Proposed, not yet confirmed

From the research doc; Claude's proposals, not David's decisions yet:

- **Identity**: worlds never share entities; persistent things are controller continuants projected in as fresh local entities.
- **Lifecycle**: explicit enter / suspend / resume / reset / finish (SCXML-style); reset-on-entry vs persistent per world.
- **Save**: composite — controller state + each world's blob + shared fact values + ownership table + redaction state, versioned separately.
- **Narration**: the controller owns transition text; worlds narrate only inside themselves; output tagged by source world.
- **Grammar**: per-world grammar on a shared base.
- **World vs region + scene**: use a world when rules, vocabulary, PC, or physics differ, or when isolation buys testability; otherwise ADR-149 regions and scenes.
- **Compiler rule**: a world that declares a deadline must define its state for arrival after the deadline.

## Open questions (do not answer here, just record)

- Interleaved write order: when a live but inactive world ticks in the same turn as the active one, both may write controller facts. Fixed per-turn order (Gauss-Seidel) plus the one-owner rule — confirm the shape.
- Catch-up mechanism: run N turns with no input, or a declared fast-forward per world?
- Fact versioning: shared facts touch every world's saves; what is the versioning rule when a patched story changes a shared fact?
- `remembers vaguely` and other per-world translations: a fixed vocabulary, or authored mappings?
- Rift details: how a rift end is represented in a world (entity, exit, or both), and how one-way and collapsing rifts are declared.

## Chord shape (illustrative only — not proposed grammar)

```
the world Infiltration
  resets on entry
  owns the vault
  owns the flood, a deadline
    when the dam fails

the world Interrogation
  asks about the vault

the story controller
  worlds Interrogation, Infiltration
  begins in Interrogation

  defines the vault, opened or sealed
  keeps Mara, an actor

  in Interrogation, Mara is an NPC
  in Infiltration, Mara is the player
    with the vault code redacted

  when Interrogation asks for a replay
    enter Infiltration
  when Mara sees the photograph
    unredact the vault code for Mara
```

## Prior art (summary — detail in the research doc)

- **RSTS/RSX Task Builder** — root segment, overlays, ODL, co-trees, COMMON. The model, minus nesting.
- **FMI co-simulation** — units with declared inputs/outputs, a master algorithm, a multi-model manifest; asking a unit when its next event is due.
- **HLA** — ownership management: one owner per shared attribute.
- **SCXML** — invoke / finalize / done data as world lifecycle vocabulary.
- **DDD context mapping** — worlds as bounded contexts; the controller as process manager; shared facts as Published Language.
- **IF** — Spider and Web (frame + resetting flashback world), Photopia (vignettes around a never-playable continuant), Emily Short's multiplayer work (per-character prologue/epilogue), ink users hitting the wall moving variables between stories.

## When to revisit

Before any ADR: run the engine-per-world spike, then promote D1–D10 into ADRs in dependency order (topology and allowed/authored first, then facts, actors, time).
