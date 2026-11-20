# Multi-World Stories — Overview

**Date opened**: 2026-11-19
**Status**: BRAINSTORM, parked (David, 2026-11-19: "I don't plan to tackle this until next year"). Will land as one or more ADRs. Where it stopped: the sketch in `sketch/` and rulings S1 to S5 are recorded; the first thing waiting is a ruling on whether play follows a travelling actor (see "Claude's proposals inside the sketch").
**Target**: Sharpee 6 / Chord 5
**Absorbs**: [`multi-pc/overview.md`](../multi-pc/overview.md) — its open question "one shared `WorldModel` with per-PC scope filters, or separate `WorldModel` instances synchronized at boundaries?" is answered here: separate worlds, synchronized only through the controller.
**This file is the record.** Decisions are cited by this file's numbers only: D1 to D10 for what is locked, S1 to S5 for the syntax rulings made on the sketch, P1 to P7 for what is proposed. Nothing outside this file is needed to read it.
**Origin**: drafted in a Claude Desktop conversation on 2026-11-19; its [research document](https://claude.ai/artifact/TtTUJB17MrJ4GMJVaDaeAH) is where this began and is not maintained. It numbers its decisions differently (its D1 is identity, its D4 shared facts, its D10 allowed vs authored), so its numbers are never cited here or in any ADR that follows.

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

**One `GameEngine` per world under a controller host.** Sharpee already sets this up: one engine runs one world (`GameEngine` holds a single `private world`, `packages/engine/src/game-engine.ts`), and an engine saves and restores as one unit. The host holds shared facts, ownership, story clock, input routing, and transitions.

**The unit that suspends is the engine's save data, not the world blob.** A dormant world is an `ISaveData` (`packages/core/src/types/save-data.ts`): the world snapshot plus the plugin states (daemons, fuses, state machines), the action random stream's seed, parser state and turn history. A world's deadline lives in a fuse or a state machine, so a world blob alone would lose it. This is also why the leaning is an engine per world and not one engine over a set of worlds.

The spike should show:

1. World-switch cost: one engine's full save data written and another's restored, compared with a single save/restore turn.
2. Scratch-query cost with catch-up of 50 and 500 turns — and whether catch-up is N empty turns or a world-declared jump ahead.
3. Tagged output from several engines merging cleanly into one stream.
4. A byte-identical composite save on replay.
5. The host's write order with two live worlds (interleaved).

Spike story: two tiny worlds (~3 rooms each), one shared fact, Mara as NPC in one and player in the other with one redacted memory, one deadline. Driven by the transcript tester.

## Proposed, not yet confirmed

Claude's proposals, not David's decisions yet:

- **P1. Identity**: worlds never share entities; persistent things are controller continuants projected in as fresh local entities.
- **P2. Lifecycle**: explicit enter / suspend / resume / reset / finish (SCXML-style); reset-on-entry vs persistent per world.
- **P3. Save**: composite — controller state + each world's blob + shared fact values + ownership table + redaction state, versioned separately.
- **P4. Narration**: the controller owns transition text; worlds narrate only inside themselves; output tagged by source world.
- **P5. Grammar**: per-world grammar on a shared base.
- **P6. World vs region + scene**: use a world when rules, vocabulary, PC, or physics differ, or when isolation buys testability; otherwise ADR-149 regions and scenes.
- **P7. Compiler rule**: a world that declares a deadline must define its state for arrival after the deadline.

## Open questions (do not answer here, just record)

- Interleaved write order: when a live but inactive world ticks in the same turn as the active one, both may write controller facts. Fixed per-turn order (Gauss-Seidel) plus the one-owner rule — confirm the shape.
- Catch-up mechanism: run N turns with no input, or a declared fast-forward per world? This is a determinism question as well as a cost one: NPCs take real turns through the standard actions, so N empty turns are N turns of NPC activity with no player, and a declared jump would reach a different state than running them.
- A query answer that later proves false: D5 answers a dormant owner's fact by catching up a scratch copy, and D8 lets the active world write a controller fact that the dormant world reads on re-entry. A query can therefore report a future the real catch-up does not produce. Is the answer defined as "as things stand", or do queries see only controller inputs already committed?
- An actor's other body: when Mara is the player in one world and her NPC entity sits in a dormant world that is not frozen, that entity keeps acting during catch-up. D2's "an actor embodied in one active world at a time" does not say what a catching-up world does with an actor who is elsewhere.
- Per-world seeds: each engine owns the master seed its random streams derive from. What is the rule deriving each world's seed from the story's, so that a composite save replays byte-identically (spike item 4)?
- Fact versioning: shared facts touch every world's saves; what is the versioning rule when a patched story changes a shared fact?
- `remembers vaguely` and other per-world translations: a fixed vocabulary, or authored mappings?
- Rift details: how a rift end is represented in a world (entity, exit, or both), and how one-way and collapsing rifts are declared.

## Chord shape (sketch syntax — not proposed grammar)

The spike story is written out whole in [`sketch/`](./sketch/): `sluice.story` (the controller), `works.story` and `flood-year.story` (the two worlds). None of it compiles. Each invented line is marked `## NEW`, and three spellings not checked against today's Chord are marked `## UNCHECKED`. It replaces the fragment that stood here, whose `enter`, `owns` and per-world `asks about` lines the rulings below removed.

### Syntax rulings (David, 2026-11-19, session eee4bd)

Made by reading the sketch. They shape the Chord surface; D1 to D10 are unchanged.

- **S1. Things own their things.** David: "things should own its things". An actor's roles and redactions sit under the actor (`keep Mara`). What belongs to a world (`resets on entry`, `keeps time while away`, its start, pause and resume blocks, the player when that player exists only there) sits in the world's own file. The controller's `define world` line carries the name and the file.
- **S2. `before the world starts`.** David: "probably would add 'before the world starts' and the original syntax is elevated to setup for all worlds". It runs when a world is first entered, and on every entry for a world that resets. `before the game starts` stays in the controller as setup for all worlds.
- **S3. Travel, not enter and return.** David: "return is bad, we should use a travel concept like 'mira transports to The Works in the Valley'". An actor transports to a place in a world: `Mara transports to the Yard in the Flood Year`. Going back is the same statement pointed the other way.
- **S4. Transport has pause and resume logic.** David: "we'll definitely need world transport logic for pausing a left world and restarting an arrival world or allowing the author to emit a summary of 'what's changed'". Sketched as `before the world pauses` and `after the world resumes` in the world's file, with `keeps time while away` (the default, D8) or `pauses while away` on the world.
- **S5. The summary of what changed is author driven or platform driven.** David: "the summary could be author driven or platform driven". Sketched as: catch-up prints nothing as it runs and keeps what it would have said; with no resume block the platform recounts those lines; with one the author decides, and `recount the time away` asks for the platform's account inside it.

### What the sketch showed

- A world file is ordinary Chord plus a `world` header and its start, pause and resume blocks.
- A request (D5) needs no new statement inside a world: it is an `emit`, which prints nothing, and the controller answers `when <world> emits <event>`.
- A deadline (D8) is a timer. The world declares nothing more: the running timer is what it is heading for, and `when <timer> expires` is the state for arrival after the deadline (P7).
- Ownership (D4) is never written. The world that changes a fact owns it. The cost: a world file uses a name it does not create, so it cannot compile without the controller file.

### Claude's proposals inside the sketch, not ruled on

- Play goes with an actor who is the player at either end of a trip; an actor who is an NPC at both ends travels without moving play.
- The platform's recount covers the story's own happenings (timer stages, sequence steps, `when` rules), not ordinary NPC actions or `on every turn` text.
- "Resumes" as the word for re-entry, since "restarts" reads like a reset.
- A transport into a world that resets could leave out the room and use the actor's `starts in`.
- `begins in the Works` is the one line that names a world with no actor travelling to it.

## Prior art

- **RSTS/RSX Task Builder** — root segment, overlays, ODL, co-trees, COMMON. The model, minus nesting.
- **FMI co-simulation** — units with declared inputs/outputs, a master algorithm, a multi-model manifest; asking a unit when its next event is due.
- **HLA** — ownership management: one owner per shared attribute.
- **SCXML** — invoke / finalize / done data as world lifecycle vocabulary.
- **DDD context mapping** — worlds as bounded contexts; the controller as process manager; shared facts as Published Language.
- **IF** — Spider and Web (frame + resetting flashback world), Photopia (vignettes around a never-playable continuant), Emily Short's multiplayer work (per-character prologue/epilogue), ink users hitting the wall moving variables between stories.

## When to revisit

Before any ADR: run the engine-per-world spike, then promote D1–D10 into ADRs in dependency order (topology and allowed/authored first, then facts, actors, time).
