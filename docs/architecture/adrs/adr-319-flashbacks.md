# ADR-319: Flashbacks — An Atomic Story State, Inflated and Destroyed

**Status**: DRAFT — open questions below are unresolved; this ADR must not be flipped to
ACCEPTED while they remain.
**Date**: 2026-08-16 (session 1a2bf1)
**Related**: NARR-007 "Flashback" and NARR-013 "Parallel Storylines"
(`docs/work/design-patterns/patterns.json` — the catalog names both intents this one
primitive serves: playable past sequences, and interwoven narrative threads), ADR-141
(character model — used `flashback` as a state-machine *target* example, a transition, not
a playable state)
**Touches**: ADR-310/318 (character layer — the memory ledger is the natural impact
surface), ADR-303 (convergent paths and unwinnable states — transcripts that cross a
flashback boundary), ADR-315/316/317 (turn/time semantics while the main story is
suspended), ADR-132 (PC switching — existing machinery for the segment's player binding),
ADR-133 (structured text output — per-actor keys, Reflections' rendering layer), save
format v4 (a save taken mid-flashback must carry two states or be forbidden)
**Motivated by**: *Reflections* (David's story; `docs/work/interpreter/reflections-ux.md`)
is constructed on the persistent-storyline end of this ADR's spectrum

---

## Context

Authors want playable cutaways: the story steps out of the main frame, the player plays
through a self-contained segment, and the story returns changed only in the ways the
author meant it to change. The canonical case is a **flashback** (a past sequence), but
the same primitive serves a **"meanwhile" segment** — something happening in another place
and/or time, with the PC the same or a different character (David, 2026-08-16). The
construct is unanchored: past, elsewhere-now, or elsewhen is authorial framing, not
mechanism. Interactive fiction has done this forever by hand — teleport the player to a
walled-off region, juggle flags, teleport back, hope nothing leaked. Sharpee has no
primitive for it.

This is *not* GEO-011 "Parallel Worlds" (persistent alternate versions of the same
geography with puzzles spanning them). That pattern needs two live, durable states; this
primitive is deliberately ephemeral — inflated, played, destroyed.

### What a segment is *for* — three beneficiaries

A segment pays off in one or more of three places (David, 2026-08-16), and they sit at
different layers of the system:

1. **The PC recalls memories** — in-world knowledge state changes: the PC now knows
   something, which under ADR-310/318 is a ledger deposit or equivalent authored fact the
   main story can condition on.
2. **The game player gains understanding** — the *human*, not necessarily the PC. This is
   dramatic irony, and its mechanical footprint is **zero**: no flag, no deposit, nothing.
   The segment's entire payoff lives in the player's head.
3. **An NPC's motivation is clarified** — the main story reframes an NPC: their goals,
   pressure, or history become legible, whether as authored character-model effects
   (ADR-310/318 goals/ledger), unlocked topics (ADR-239), or presentation changes.

Beneficiary 2 is load-bearing for the design: it proves "no impact at all" is a
legitimate authored outcome, which is exactly what D2/D3 permit — a segment with no
impact block leaves the main story byte-identical.

### The far end of the spectrum: persistent parallel storylines

David's fullest form (2026-08-16): "a parallel storyline that later merges, or the
consequences of all main stories affect each other." That is a different lifecycle from
the ephemeral segment, and the two bracket a spectrum:

| | Ephemeral segment | Persistent parallel storyline |
|---|---|---|
| Lifecycle | inflate → play → **destroy** | inflate once → **suspend/resume** across visits |
| State between visits | none — each run starts fresh (D1) | survives — the storyline remembers itself |
| Impact direction | one-way, applied at the boundary | consequences flow **between** storylines, both/all ways |
| Ending | destruction | possible authored **merge** — two states reconciled into one main story |

The segment is the degenerate case of the storyline (one visit, destroy at the end,
one-way impact). The storyline is where GEO-011/NARR-013 stop being "not this ADR" and
become the roadmap. Whether ADR-319 ships the whole spectrum or pins the ephemeral end
and leaves storylines to a successor is Open Question 10 — but the primitive should be
designed so the storyline case is an extension, not a rewrite.

**Motivating story: Reflections.** The storyline end is not speculative — David's story
*Reflections* is constructed on it (David, 2026-08-16: "this latter feature is how
Reflections gets constructed"). Reflections is already sketched in
`docs/work/interpreter/reflections-ux.md`: three actors in an iMessage-style chat
interface, with the PC rotating among the three over the course of the story. Two pieces
of its machinery already shipped — ADR-132 PC switching (`engine.switchPlayer`,
`game.pc_switched`) and ADR-133 structured text output with per-actor keys — which bears
directly on Open Question 2: the "who is the player in this segment" binding can build on
PC switching rather than inventing a parallel mechanism.

What exists today, and why none of it is this:

- **One world, one lifetime.** The engine runs a single `WorldModel` from `setStory()` to
  quit. Restart is `world.clear()` + repopulation of the *same instance*
  (`WorldModel.ts:1506`) — there is no second world, and no notion of a world set aside to
  come back to.
- **Full-state snapshot exists, but only as player-facing save.** `createSaveData()` /
  `loadSaveData()` (`game-engine.ts:1546`, `:1569`) serialize and restore the whole
  engine state. The shape a flashback needs — capture, hold, restore programmatically —
  exists; the lifecycle (a stack the story controls, not a slot the player controls) does
  not.
- **Chord's `define` family has no state-bubble construct.** `define sequence`,
  `define machine`, `define counter` all operate *inside* the one running world.
  Nothing defines a state that can be instantiated and discarded.
- **The character layer gives impact a vocabulary.** ADR-310/318's ledger, witnessed
  events, and deposits are exactly the kind of durable fact a flashback should be able to
  leave behind: the player now *knows* what Viola saw, and the story can act on that.

The hand-rolled alternative (walled-off rooms in the main world plus flag juggling) fails
the atomicity test in both directions: state leaks *in* (the player's inventory, daemons,
clocks all follow them into the "past") and leaks *out* (anything the player disturbs in
the flashback region stays disturbed, whether or not the author meant it).

## Decision

A **flashback** is an atomic story state with an authored boundary in both directions:

- **D1 — Atomic inflate.** A flashback is instantiated fresh from its authored definition
  every time it starts. It is never diffed from, seeded by, or entangled with the live
  main-story state. Two inflations of the same flashback start identically.
- **D2 — Total destruction.** When a flashback ends, its state is destroyed wholesale.
  Nothing inside it survives by default — not object positions, not inventory acquired, not
  counters. "The flashback happened" is not itself a persisted fact unless authored.
- **D3 — Impact is authored, never inferred.** The only channel from a flashback back into
  the main story is an explicit, author-declared set of effects (flags, counters, ledger
  deposits, and whatever else the impact surface admits — Open Question 4). The platform
  never computes impact by diffing or merging states.
- **D4 — The main story is suspended, not shared.** While a flashback is active, the main
  story's state is set aside intact and cannot be mutated by anything running inside the
  flashback. The suspension mechanism should build on the existing full-state snapshot
  surface rather than a second live world (direction, not yet a pinned mechanism —
  Open Question 7 constrains it via save semantics).
- **D5 — The primitive is unanchored in time, place, and protagonist.** Nothing in the
  mechanism knows whether the segment is past, simultaneous, or elsewhere, or whether the
  PC is the same character. "Flashback" and "meanwhile" are authored framings of one
  construct; the platform ships the state bubble, the author supplies the tense.

Everything else — the Chord surface, trigger and exit semantics, who the player *is*
inside a flashback, time accounting, nesting — is deliberately left to the open
questions rather than guessed at here.

## Consequences

- A new lifecycle enters the engine: story-controlled capture/hold/restore of full state,
  distinct from player-facing save/restore even if it shares serialization machinery.
- Chord grows its first construct that defines a *world state* rather than content inside
  the one world; the analyzer, story-loader, and testing surface (transcripts crossing an
  inflate/destroy boundary) all inherit that concept.
- D1–D3 make flashbacks deterministic and replay-safe by construction, which is what keeps
  them testable under the pinned-seed transcript discipline.
- Hand-rolled flashbacks (walled regions + flags) remain possible but become the
  discouraged path once this exists.

## Session

Concept stated by David, 2026-08-16, session 1a2bf1: "An atomic story state that can be
inflated and destroyed and its impact on the larger story can be authored." Drafted same
session; no implementation authorized.

## Open Questions

1. **Chord surface.** Is it `define flashback <name>` with a full nested story body
   (rooms, entities, player binding) inline, or a reference to a separate `.story`-like
   unit? What subset of Chord is legal inside one?
2. **Player identity.** Who is the player inside a segment — their past self, another
   character entirely (the "meanwhile" case), an unnamed witness? Does the binding change
   parser vocabulary, pronouns, and the status line?
3. **Trigger and exit.** What starts a flashback (an authored action, a sequence step, a
   machine transition, an `influence`?) and what ends it (authored condition, completion,
   an escape verb)? Can the player abandon one, and is abandonment distinguishable from
   completion for impact purposes?
4. **Impact surface.** What is the declared-outcome shape — an `outcomes`/`impact` block
   mapping in-segment facts to main-story effects? The three-beneficiary taxonomy in
   Context implies at least: PC-knowledge effects (ledger deposits, ADR-310/318),
   NPC-model effects (goals/ledger/topics), general story effects (flags, counters), and
   the explicit empty case (player-understanding only — no block at all). Are impacts
   applied only at destruction, or can any fire mid-segment?
5. **Re-entry and nesting.** Can the same flashback run twice (D1 says each run starts
   fresh — but is a second run *allowed*)? Can a flashback inflate another flashback?
6. **Time and turn accounting.** Does the main story clock advance while a segment runs?
   Are main-story daemons, sequences, and NPC turns suspended (D4 suggests yes)? Does the
   segment have its own turn counter, and does ADR-317's stage sequence apply inside it?
   A "meanwhile" sharpens this: if the segment is narratively simultaneous, does its
   duration advance the main clock in lockstep on return, or is simultaneity purely
   framing (D5 suggests the latter)?
7. **Save/restore mid-flashback.** Is saving allowed inside a flashback? If yes, the save
   format must carry suspended-main + active-flashback as one document; if no, the save
   action needs an authored refusal. Same question for autosave.
8. **Testing and transcripts.** How does a transcript express "enter the flashback, play
   it, come out" — one file crossing the boundary, or per-state files? What does the
   testing surface show for in-flashback turns (channel isolation per ADR-310 D12/AC8)?
9. **The construct's name.** With D5 making flashback just one framing, is the Chord
   keyword still `flashback`, or a neutral term (`segment`, `interlude`, `cutaway`,
   `scene`) with the tense left to prose? The keyword is author-facing vocabulary and hard
   to change later.
10. **Scope: ephemeral only, or the full storyline spectrum?** Persistent parallel
    storylines (suspend/resume instead of destroy, cross-storyline consequences, authored
    merge) collide with D1/D2 as written — atomicity and total destruction would become
    properties of the *ephemeral mode*, not of the primitive. With *Reflections*
    constructed on the storyline mode, the question is no longer whether that mode is
    real but sequencing: does this ADR ship both modes, or pin the ephemeral end and
    design the state-bubble machinery so a successor ADR (Reflections' ADR) adds
    persistence? Sub-questions if storylines are in scope: what does an authored merge
    declare (which facts from each state survive — D3's no-platform-merging principle
    says the author writes the reconciliation)? Can more than two storylines run
    (Reflections has three actors — are those three storylines, or one storyline with a
    rotating PC via ADR-132)? Is there a primary storyline, or are all "main stories"
    peers?
