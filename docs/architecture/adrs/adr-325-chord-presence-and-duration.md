# ADR-325: Chord places and timers — possessive location, `offstage`, region landings, and named-turn timers

**Status**: **ACCEPTED** (David, 2026-08-23, session 48e73d — "accept the ADR and file
the issues"). Proposed earlier the same day; revised twice after `adr-review` (final pass
19/19) and a long syntax conversation. No Open Questions. Implementation is authorized
and ordered in Acceptance; Claude is the implementer.

**Language + platform change.** Expected surfaces: `packages/chord/src/parser.ts` (a
possessive `location` as a place; `offstage` as a place; the `landing` region line; the
`define timer` block — states with optional text, `meanwhile`, `interrupted`; the timer
verbs; `when <timer> expires` and `when <entity> moves` clause heads; bare `on going` /
`after going` in the player's block; an inline body on `kill the player`),
`packages/chord/src/analyzer.ts` (place resolution, landing validation, tally/timer verb
gates, timer-state words, owner resolution for bare timer names),
`packages/chord/src/ir.ts` (timer declarations, landing, the new place kinds, the two
event clause heads), `packages/story-loader/src/evaluator.ts` (place evaluation, timer
state conditions), `packages/story-loader/src/runtime.ts` (the `move` sinks, the timer
daemon, expiry and movement event dispatch, `set` on tallies). No engine, stdlib, or
world-model change: timers are loader-owned state on the entity's Chord trait (the same
home as ADR-264 counters); placement goes through existing `WorldModel` calls; the
`moves` event rides the actor-moved event `going` already emits.

**Amends**: [ADR-264 D2](adr-264-chord-numeric-counters.md) — `set <counter> to <n>` is
legal on a tally (D4 below). The implementer of D4 stamps the amendment on ADR-264 D2 in
the same commit that lands it.

**Date**: 2026-08-23 (session 48e73d)
**Related**: [ADR-213](adr-213-removed-from-play-signal.md) (the `disappeared` channel,
which `move … offstage` rides), the chord-zoo-surfaces ratchet (`packages/chord/src/parser.ts:7246`
Z4 `is here`; `:6503` Z6 `remove` — the deictic this ADR generalises and the terminal
removal it leaves alone), [ADR-236](adr-236-chord-regions.md) (D2 `containing`, which
`landing` sits beside; D4 entity/region-owned clauses; D7 the story-owned clause),
[ADR-264](adr-264-chord-numeric-counters.md) (counters — tallies, in this ADR's
vocabulary; timers are their turn-counting sibling), [ADR-293](adr-293-choice-points-per-point-streams.md)
(the seeded streams every `one chance in n` in this ADR runs on), ADR-227 (`kill the
player`, which gains an inline body)
**Issues**: GH #305 (plural possessive), #306 (D1–D2), #307 (D3a–g), #308 (D3h–i), #309 (D5), #310 (D4) — in landing order

## Context

*The Secret Letter*'s market sweep (`docs/references/textfyre/secretletter/source/story.ni:2037-2182`)
is a pressure model: a pair of mercenaries arrives wherever Jack is once she has stood
still, notices her after loitering beside her for three turns, grabs her, and two turns
later the captain arrives. The I7 source is numbers all the way down (`story.ni:2084-2128`):
a `timeout` on the mercenaries re-rolled 1–3 whenever the player moves; I7's `waiting
count` compared against it; `have been in the location for two/three turns`; a `grabbing
countdown`; `the leader arrives in two turns from now`.

Chord can build the model today (`branch-stories/secret-letter/mercenaries.chord`, first
cut 2026-08-23: `./sharpee test branch-stories/secret-letter` — 91 cards passing, 103
assertions passing, 00:15 CDT), but it cannot *say* it. The first cut reads as
bookkeeping:

| The fiction | What the file has to say |
|---|---|
| They arrive where Jack is | a `swept` trait composed on fourteen rooms, so `it` can be the destination of `move` |
| Jack has stood still for a turn | a story counter raised by the rooms and read as `waiting is at least 2`, ordered to survive daemon sequencing |
| They lose her | `lower waiting by 5` (ADR-264 D2's documented reset idiom) — and they stay in the room, because `remove` deletes the entity |
| They have loitered beside her three turns | `raise its patience by 1` and three `when its patience is at least 3` guards |
| Two turns after the grab, the captain | `raise its countdown by 2 when its countdown is 0`, then `lower … by 1 when it is approaching` |

None of that is about mercenaries, and David's reading of it — *"'aggressive' was a
signal"*, *"I'm looking at the code and wanting it to align with the story in an elegant
way"* — is the brief for this ADR. Every row is a pattern the source leans on throughout
(four chases, every NPC with a fuse), so the cost recurs with every chapter the port
reaches and with every author who writes a pursuer. The core-concepts test for a
`packages/` change is whether it makes the platform and the language fit together more
elegantly than before; this is the case that test was written for: capabilities the engine
already has (turn counting, entity placement, movement events) with no natural way to say
them in a `.story` file.

The decisions were reached in conversation. The rulings that shaped them:

- **"Everything is a turn."** What the first cut called counters were clocks in disguise.
  A counter that counts turns is a **timer**: it is started, stopped, restarted, reset, or
  interrupted, and a story never says a number about it — the author names the turns, and
  the last one is always `expired`. Counters that count *things* (thealderman's
  `accusations`) are a **tally**, ADR-264's kind, told apart by their verbs.
- **"A timer is not bound to `while it is here`."** Presence is a condition; a timer
  knows nothing but turns. The conditions under which it runs are the clauses that start
  and reset it.
- **"A fixed timer and an interrupt."** The source's random 1–3 threshold is a fixed
  timer that may be cut short — the randomness is an interrupt, visible on the page, not
  a random length drawn in secret.
- **Every `on every turn … while … and … and …` was a symptom.** Each one in the first
  cut turned out to be an event wearing a condition's clothes: a timer expiring, the
  player moving, texture that belongs to a timer's turns. The final block has no
  `on every turn` at all.
- **"We could build an entire subsystem on math and money alone."** Tallies, arithmetic,
  money, prices are their own ADR, reached when the port gets to Commerce Street. This
  ADR touches tallies in exactly one line (D4).

## Decision

### D1. A possessive `location` is a place; `here` abbreviates the player's

`<entity>'s location`, `its location`, and `the player's location` are legal wherever a
place is: as the destination of `move … to` and as the object of `is in`. ADR-264 D2
already reads a possessive on any entity, and the evaluator already has a `location`
field; this exposes it as a place.

**`location` means the containing room, always.** The sword carried by the mercenaries
standing in the Rope Stall has the Rope Stall as its location; the apple on the display in
the Fruit Stall has the Fruit Stall. This keeps every `move … to X's location` a room
move, matches what `is here` already resolves, and matches the word — where a thing *is*,
not what holds it. The immediate holder is a different question and gets a different word
if it is ever needed (`holder`, a non-goal).

`here`, which Chord already has as a condition (`is here`, Z4), is **sugar for `the
player's location`** in the two positions it can occupy: `is here` and `move … here`. It
is not a third deictic with its own rules.

```
move the wandering mercenaries to the player's location     ## the arrival
move it here                                                ## the same, abbreviated
move the monkey to Teisha's location
move the mercenaries to the apple's location                ## wherever the stolen fruit went
on every turn while the captain is in the mercenaries' location
```

Edge rules:
- An **offstage** entity has no location: `move … to X's location` refuses at run time
  with a diagnostic naming X ("cannot move the monkey to Teisha's location — Teisha is
  offstage"), never a silent no-op; `is in X's location` is false.
- A **room's** location is itself.
- A **region's** location is its landing (D5); a region without one is a compile-time
  error at the use site, naming the missing `landing` line.
- `the player's location` when the player is inside an enterable (on the crates) is the
  containing room, consistent with the rule above.

### D2. `move <entity> offstage`

`offstage` is a legal place in the `move` statement and means "no location": the entity
stays in the world, keeps its states and timers, and is reattached by a later `move`. An
entity created without a location is offstage from the start; this statement is the
reverse of arriving, nothing more. `is here` is already false for a no-location entity, so
no new condition is introduced; `is offstage` is **not** added (`is not here` and `is not
in <place>` cover the uses found).

`remove` is unchanged and stays terminal (Z6).

Witness narration: a `disappeared` row (ADR-213) fires for `move … offstage` exactly as
for `remove` when the player shares the room — the observer is about what the player saw,
not about the entity's fate.

### D3. Timers — named turns, no numbers

**Two kinds of counter, told apart by their verbs.** ADR-264's counters are **tallies**:
they count *things*, and move only when the author moves them (`raise`, `lower`, and —
D4 — `set`). A **timer** counts *turns*, and a story never says a number about one: the
author names the turns, the timer steps through the names one per turn once started, and
it ends in the one state every timer shares, **`expired`**. The compiler rejects
`raise`/`lower`/`set` on a timer and the timer verbs on a tally.

**D3a. Declaration.** A block, owned by an entity or by the player (`for <owner>`) or by
the story (no `for`). Each line before `end timer` is one of:

- a **state name** — one turn. It may carry an indented text body, spoken the turn that
  state is reached, exactly as a `phrase` line carries its body.
- **`meanwhile[, one chance in <n>]`** followed by statements — run on every turn the
  timer is running, alongside the turn's state; with `one chance in n` (ADR-293 stream),
  occasionally. This is where a timer's *texture* lives.
- **`interrupted one chance in <n>`** — on each turn the timer is running there is this
  chance (same stream) that it expires right then instead of stepping. A timer without
  this line is cut short only by the `interrupt` verb.

`expired` is never written; it is always the state after the last named one. A timer with
no state lines is legal: one turn, then expired.

```
define timer waiting for the player
  pausing
  loitering
  interrupted one chance in 2
end timer

define timer search for the wandering mercenaries
  arriving
  lingering
    Those mercenaries are getting uncomfortably close. You'd better get going
    before they notice you!
  meanwhile, one chance in 5
    phrase merc-idle
end timer

define timer lunge for the wandering mercenaries
end timer
```

**D3b. A timer knows nothing but turns.** It is not bound to a room, a state, or a
condition. The conditions under which it runs are the ordinary conditions of the clauses
that start and reset it — which puts each condition at the event that changes the
situation, not on the reaction. (An earlier draft bound a timer to a `while`; that
conflated presence, which is a condition, with what a timer is.)

**D3c. Verbs**, usable wherever an effect runs. Inside the owner's block a timer is named
bare (`start lunge`); elsewhere by possessive (`restart the player's waiting`,
`reset the mercenaries' search`). Bare-name resolution is owner-first, then story-level,
as `award` resolves (owner-first, owner-qualified — the `award` resolution ADR-261 D6 keeps unchanged; `packages/chord/src/analyzer.ts` `case 'award'`).

```
start search        ## begins; first named state next turn
stop search         ## holds where it is
restart search      ## back to the first state and running
reset search        ## back to not-started
interrupt search    ## expires now — `when … expires` fires as if it had run out
```

`start` on a running timer is a no-op (`restart` is the explicit form). `restart` and
`reset` on a not-started timer: `restart` starts it; `reset` is a no-op. A **stopped**
timer never expires on its own; `interrupt` expires it (it is the one verb that acts from
any started state); `interrupt` on a not-started timer is a no-op, like `reset`.

**Plural possessives.** The parser today reads only `'s` (`parser.ts:7014`, regex
`'s$`): `the innkeeper's suspicion` compiles and resolves (verified 2026-08-23 —
`raise the innkeeper's suspicion by 1` and `when the innkeeper's suspicion is at least 3`
both compile clean against `packages/chord/dist-esm`), but `the guards' suspicion` fails
with `analysis.unknown-counter: guards' suspicion is not a declared counter` (same run).
A plural owner's timer (`the mercenaries' search`) therefore needs the bare-apostrophe
possessive added to the same parse — one regex and an analyzer strip — which is part of
D3's implementation, not a separate decision. Until it lands, the example below would
have to say `the wandering mercenaries's search`, which no one should write.

**D3d. Reading a timer.** `is` reads the beats, `has` reads the lifecycle, and the two do
not overlap:

```
while search is lingering        ## the named turn
while search has started         ## running or expired; `has not started` before start and after reset
while search has expired         ## over — the only spelling; `is expired` is rejected
```

A timer state and an entity state may share a word (`held` on `capture`, and a person who
also has a `held` state): the subject disambiguates — `it is held` reads the entity's
`states:` line, `capture is held` the timer's — and the analyzer checks each against its
own subject's list. No extra gate.

**D3e. Expiry is an event**, and gets a clause head on the owner, parallel to
`define sequence`'s `when <owner> becomes <state>`:

```
when search expires
  change it to approaching
  start lunge
  phrase merc-spotted
end when
```

A `, while <condition>` modifier is legal on the head as on every clause head. From
outside the owner: `when the player's waiting expires`, `when the mercenaries' search
expires`. `it` inside the body is the clause's owner (the entity whose block it is in),
not the timer's owner.

**D3f. Stepping.** One loader-owned daemon advances every running timer by one state at
the start of the turn, before any other daemon kind, fires `when … expires` for any that
reached `expired` (or were interrupted), and runs `meanwhile` lines for those still
running. A timer started during turn T is in its first named state on T+1 and expires on
the turn after its last named state. A timer with no named states expires on T+1.
`expires` fires exactly once per run, whether the timer ran out, was interrupted by
chance, or by the verb — an interrupt on the turn it would have expired anyway is just
expiry. `meanwhile` never runs on an expiring turn: the timer is no longer running when
the turn's lines are chosen.

**D3g. Persistence.** A timer's position is loader-owned state on the owner's Chord
trait, the same home as ADR-264 counters, and persists through the same path; the story's
timers live on the story trait.

**What this replaces.** Two earlier drafts are withdrawn: `has been here for N turns`
with built-in per-entity counts (a number and a hidden condition wearing a timer's
clothes), and `ends, randomly: …` / `expires at random` (a random length drawn in secret
— opaque about which named turns a story ever sees). `interrupted one chance in n` is the
replacement for the latter: every named turn is reachable, and the chance is on the page.

### D3h. Two movement clauses

The sweep's remaining `on going it … while …` clauses were about Jack and the mercenaries,
hung on rooms only because `going`'s `it` is the source room. They get homes:

- **The player's own going.** Inside the player's block, `on going` / `after going` with
  no `it` is the player's own movement — intercept and reaction respectively:

  ```
  create the player
    on going while the wandering mercenaries is aggressive
      refuse merc-held
    end on

    after going while hunted
      restart waiting
    end after
  ```

- **Reacting to someone else moving.** `when <entity> moves` is an event clause head, like
  `when <timer> expires`, riding the actor-moved event `going` already emits:

  ```
  when the player moves, while it is approaching
    phrase merc-dash-away
    move it offstage
    change it to oblivious
    reset search
    reset lunge
  end when
  ```

  `it` is the clause's owner. The event is the *completed* move (the `after` phase); a
  refusal belongs on the mover's own `on going`.

### D3i. `kill the player` takes an inline body

`kill the player [<phrase-key>] [when <cond>]` (ADR-227) keeps its key form, and also
accepts an indented text body in place of the key, as a `phrase` line does. One-shot death
text no longer needs a name; a key is for text that is reused or overridden from a
phrasebook. (`win`/`lose` would take the same treatment; not widened here.)

### D4. `set <tally> to <n>` — the one tally change

No new syntax: `set its suspicion to 0`, `set accusations to 2`, `set the grocer's patience
to 2` — the same forms `raise`/`lower` take. It clamps to the tally's bounds. This is the
"later ADR" ADR-264 D2 deferred absolute assignment to. Everything else about tallies —
arithmetic between them, money, prices, `afford` — is the math-and-money subsystem David
named, deferred to its own ADR when the port reaches Commerce Street.

### D5. Region landings

A region may declare where something *put in it* lands, on the region block beside
`containing` (ADR-236 D2):

```
create Grubber's Market
  a region
  containing the Northwest Junction, the Grocery Stall, …
  landing the Eastern Junction
```

or a list with a strategy word from the phrase vocabulary (`randomly`, `cycling`,
`stopping`), drawn on a per-region seeded stream (ADR-293):

```
  landing, randomly: the Eastern Junction, the Northwest Junction, the Hat Stall
```

Rules:
- One `landing` line per region; a second is a compile error. A list with no strategy word
  is a compile error ("say how to choose"); a single room takes none.
- Every named room must be contained by the region (directly or through a nested region)
  — analyzer-checked.
- A region with a landing is a **place**: `move <entity> to Grubber's Market` puts the
  entity in the landing, and `Grubber's Market's location` is the landing. A region
  without one remains non-placeable (D1's compile error); the author opts in by naming the
  door.
- The landing is **mutable with `set`**, the trait-field verb: `set Grubber's Market's
  landing to the Alley`, or `set its landing to …` inside the region's own clause.
  Setting it replaces the whole list with that one room. `change` is not used — that verb
  is for states.
- No conditional landing line (`landing the Alley when hunted`): `set` on a state change
  already says it, and `when` guards on declarations exist nowhere in Chord.
- `is in <region>` is unchanged (membership, transitive).

The word is *landing*, not *entrance*: the source uses "entrance" for the market gates, and
a landing is where a thing is put, not where it walks in.

### What the mercenaries become

The whole of `mercenaries.chord` under this ADR. Five timers, no counters, no numbers, no
`on every turn`, no trait on the rooms. Every prose line is Gentry's.

```
define timer waiting for the player
  pausing
  loitering
  interrupted one chance in 2
end timer

define timer search for the wandering mercenaries
  arriving
  lingering
    Those mercenaries are getting uncomfortably close. You'd better get going
    before they notice you!
  meanwhile, one chance in 5
    phrase merc-idle
end timer

define timer lunge for the wandering mercenaries
end timer

define timer capture for the wandering mercenaries
  held
  straining
end timer

define timer recovery for the wandering mercenaries
  reeling
end timer

create the wandering mercenaries
  a person, plural
  aka mercenaries, mercenary, thugs, thug, soldiers, soldier, bravos, men, pair
  pronouns they
  states, reversible: oblivious, approaching, staggered, aggressive
  carries the sword

  Rough and ugly, with dirty clothes and mean, scarred faces. They carry
  serious-looking swords on their hips.

  when the player's waiting expires
    move it here
    change it to oblivious
    restart search
    phrase merc-arrival
  end when

  when search expires
    change it to approaching
    start lunge
    phrase merc-spotted
  end when

  when lunge expires
    change it to aggressive
    start capture
    phrase merc-grab
  end when

  when capture expires
    kill the player
      The captain soon arrives, followed by two more of his men. One of them
      grabs your other arm as their leader smiles. 'Good work, dims. Got
      ourselves a nice little commission with this one.' And before you can
      react, he takes a sack of black cloth from his belt and jerks it down
      over your head.

      Everything goes dark. You can't breathe. You struggle, but you can no
      more break the iron grip on your arms than you could uproot a tree. The
      men holding you curse. Dimly, you hear shouts from the crowd — someone
      protesting this rough treatment of a child.

      'Don't worry, m'lady,' laughs the mercenary leader. 'We'll treat the
      little rat nice an' gentle. Like this, see?'

      Something huge and heavy crashes into your head, and the rest of your
      senses are yanked away. Why they wanted you, you never awake to find out.
  end when

  when recovery expires
    change it to approaching
    start lunge
  end when

  when the player moves, while it is approaching
    phrase merc-dash-away
    move it offstage
    change it to oblivious
    reset search
    reset lunge
  end when

  on attacking it while it is oblivious
    refuse merc-dont-provoke
  end on

  after attacking it
    phrase merc-break-free when it is aggressive
    phrase merc-shove-off when it is approaching
    change it to staggered
    reset lunge
    reset capture
    start recovery
  end after

  on talking it while it is not oblivious
    refuse merc-ignore-pleas
  end on

create the sword
  aka swords, blade, blades, steel

  Not some decorated dandy's blades, these. Their steel is dull and
  tarnished, honed to a wicked edge. Nothing less than three-foot-long,
  practical tools for stabbing people dead.

  on taking it
    refuse sword-not-for-you
  end on
```

On the player, in `secret-letter.story`:

```
create the player
  starts in the Northwest Junction

  on going while the wandering mercenaries is aggressive
    refuse merc-held
  end on

  after going while hunted
    restart waiting
  end after
```

and `start waiting` in the apple's `on eating`, after `change the story to hunted`. The
phrases are unchanged from the first cut.

How the source's beats map: its re-rolled 1–3 `timeout` is `waiting` (two named turns,
interrupted one chance in two); "in the location for two turns" is `lingering` carrying
its own line, "three turns" is `search` expiring; the countdown of 1 between "There he
is!" and "Gotcha!" is `lunge`; "the leader arrives in two turns from now" is `capture`;
the countdown of 2 after a break-free is `recovery`, which is what the `staggered` posture
runs during. Whether `staggered` earns its place as a posture (or `after attacking` goes
straight to `approaching` and `restart lunge`) is a story decision still open with David.

## Non-goals

- No entity-owned timeline clause (`2 turns after it becomes aggressive …`): `define
  sequence` keeps story-wide timelines; a timer covers the entity-owned cases.
- No numbers on timers: no `for N turns`, no `is 3 turns`, no built-in `turns here` /
  `turns as <state>` counts, no random length — all withdrawn from earlier drafts.
- No `is offstage` condition; no `offstage` as a starting-location keyword (no `in` line
  already means offstage).
- No `holder` possessive (the immediate container).
- No change to `remove`, to the `disappeared`/`entered` observers' semantics, or to
  `define sequence`.
- No `when <entity> moves` refusal form (refusals belong on the mover's `on going`); no
  `when <non-player entity> goes` sugar beyond `moves`.
- No tally arithmetic, money, or prices (the math-and-money subsystem).
- No engine or stdlib surface: the timer daemon is a loader daemon over loader-owned trait
  data; the `moves` event is the existing actor-moved event.

## Consequences

- **`mercenaries.chord` loses every counter, its `swept` trait, and every `on every
  turn`**, and its comment claiming `its` is the only counter path (ADR-264 D2 also reads
  `the X's …`). The rewrite is Phase 6 work in `docs/work/secret-letter-port/plan.md`,
  gated on this ADR's implementation; until then the first cut stands as a scaffold and
  is not polished.
- **Daemon ordering stops being authoring-visible.** The first cut's `waiting is at least
  2` existed only because the raising daemon ran before the reading one on the same turn.
  The timer daemon stepping first, and expiry being an event rather than a condition read
  by another daemon, remove that class of reasoning from stories.
- **A tally and a timer can never be confused on the page**: one is raised and compared
  to a number; the other is started and read as a named state. The reference documents
  both under one heading, "Counting things and counting turns".
- **Persistence.** Timers live on the same loader-owned Chord trait as ADR-264 counters
  and persist through the same path; a save written before this ADR restores every timer
  as not-started. The save-format version is bumped per the standing rule
  (`feedback_save_format_versioning`), with a test that a pre-bump save restores without
  error.
- **A trait's `after entering it` still binds to the stdlib container-entering
  interceptor**, not room arrival (`packages/story-loader/src/runtime.ts:298-332` routes
  trait clauses to `registerActionInterceptor` under `if.action.<gerund>`; only a room's
  own block gets the arrival event via `bindEventClause`). Found the same day; not
  addressed here, and no longer load-bearing for the sweep now that nothing is on the
  rooms — its own ticket.
- **GH #304** (a refusal keyed to a `randomly` phrase renders "variants") is unchanged by
  this ADR and still blocks `merc-held`'s three variants.
- **`docs/book` and sharpee.net's Chord reference** gain: places (possessive location,
  `here`, `offstage`, landings), timers (the block, the verbs, `is`/`has`, `when …
  expires`), the two movement clauses, and the inline `kill` body.

## Acceptance

Authorized 2026-08-23. The issues are filed; this is the landing order:

1. Six issues, in this order — each depends on the ones above it, and they land
   in this order:

   | # | Issue | Why here |
   |---|---|---|
   | 1 | GH #305 — `chord: plural possessive (the guards' suspicion)` | Prerequisite. The parser's possessive is `'s` only (`parser.ts:7014`); D1's `the mercenaries' location` and D3's `the mercenaries' search` both need the bare-apostrophe form. Small, self-contained, ships with its own tests. |
   | 2 | GH #306 — `chord: possessive location, here, offstage (ADR-325 D1–D2)` | Places first: the timer rewrite's arrival (`move it here`) and escape (`move it offstage`) are unwritable without them, and they are the smallest new evaluator surface. |
   | 3 | GH #307 — `chord: named-turn timers (ADR-325 D3a–D3g)` | The centre of the ADR: block grammar, five verbs, `is`/`has` reads, `when … expires`, the stepping daemon and its order pin (AC-3). Depends on #1 for the possessive verb forms. |
   | 4 | GH #308 — `chord: player going and when-moves clauses, inline kill body (ADR-325 D3h–D3i)` | The remaining clause heads the block uses. Independent of #3 in code but pointless to land before it — the block can't be rewritten until both exist. |
   | 5 | GH #309 — `chord: region landing (ADR-325 D5)` | Depends on #2 (a region becomes a place through the same resolution). Not needed by the mercenaries block; lands last of the language work. |
   | 6 | GH #310 — `story-loader: set on tallies (ADR-325 D4)` | Independent, one loader change plus the ADR-264 D2 stamp. Last because nothing in the motivating example needs it. |

   The `mercenaries.chord` rewrite (AC-4) is
   the acceptance gate for #2–#4 together, not for any one of them.

2. Each lands with compiler tests (parse; analyzer gates: `raise`/`set` on a timer,
   `start` on a tally, `is expired`, an unknown timer state, a bare timer name with no
   owner, a `when … expires` on a timer the owner does not have, `on going it` inside the
   player's block, a landing outside its region, two `landing` lines, a list without a
   strategy, `X's location` on a landing-less region; and the plural possessive
   `the guards' suspicion` compiling, which fails today) and REAL-PATH loader tests (rule
   13a) that drive a real engine turn by turn and assert on: the entity's location after
   `move … to X's location` / `… here` / `… offstage` / `… to <region>`; a declared timer's
   state through `start`/`stop`/`restart`/`reset`/`interrupt`, turn by turn, including
   `expires` firing once (including an interrupt on the final turn), `has expired`
   holding, `reset` returning to not-started, `interrupt` on a stopped timer firing and on
   a not-started one doing nothing, a state's text speaking on its turn, `meanwhile`
   running only while running and never on the expiring turn, and `interrupted one chance
   in n` at a pinned seed; `when the player moves` firing after
   the move and not on a refused one.
3. The timer daemon is registered ahead of every other daemon kind, and a test pins the
   order.
4. `mercenaries.chord` and the player's block are rewritten to the shape in Decision and
   the four tree-document lines pass with their beats re-pinned (arrival when `waiting`
   expires at the pinned seed; `lingering`'s line the turn after arrival; "There he is!"
   the turn after; "Gotcha!" the turn after that; the captain two turns later). The tree
   document is the acceptance oracle, not the first cut's timing.
5. A pre-bump save restores (Consequences, persistence).

## Session

- 2026-08-23, session 48e73d (`docs/context/session-20260823-0020-feat-adr-321-world-index.md`):
  first cut of the pressure model, the seams it surfaced, the syntax conversation
  (possessive location → all entities → landings → timers vs tallies → named-turn timers
  → `has expired` → presence separated from timers → `when … expires` → the interrupt →
  `meanwhile` → the movement clauses), and this ADR.
