# Chord lessons learned — the mercenaries' sweep (2026-08-23)

A design-session record, written at David's request after the conversation that produced
ADR-325. It is about how Chord syntax gets designed, not about timers in particular; the
timers are the worked example. The standing rule it records, in David's words:

> Chord has to remain simple. You often use "math" to reach for `where` and `while`
> clauses and that's okay as long as the clause is simple and clear — but if it gets
> complex, the syntax has to find a simpler solution.

## What happened

A working pressure model for *The Secret Letter*'s market sweep was built in one sitting
and passed its tests (91 tree-document cards). David read it and said the code did not
align with the story. Over about twenty exchanges the block was rewritten without touching
a single line of the platform, until every clause in it was either a reaction to a named
event or a refusal. The final version has no counters, no numbers, no trait on the rooms,
and no `on every turn` at all. The syntax it needed is ADR-325.

## The lessons

### 1. A long `while` is a symptom, not a solution

Every one of these was in the first cut or an intermediate draft:

```
on every turn while hunted and it is here and the wandering mercenaries is not here and waiting is at least 2 and one chance in 2
on every turn while it is approaching and it is here and its search is arriving
on every turn while hunted and it is not here and the player is settled and one chance in 2
after going it while the wandering mercenaries is approaching
```

Each one was an **event** wearing a condition's clothes. "They arrive" is a timer
expiring; "the lunge lands" is a timer expiring; "she loses them" is the player moving.
Once the event had a name, the `while` chain collapsed to nothing or to a single
qualifier. The rule: when a clause head needs three conditions, stop writing conditions
and ask what *happened*.

### 2. Guards belong at the event that changes the situation, not on the reaction

`while hunted and it is not here` on the arrival was bookkeeping for two facts the timer
already knew if it was started and stopped at the right moments: start `waiting` when
the story becomes hunted; stop it when they arrive. Every guard that was on the reaction
moved to a `start`/`reset`/`restart` at the moment the world actually changed, which is
where the story says it.

### 3. Counters were timers in disguise

`raise its patience by 1` with three `when its patience is at least 3` guards was a clock
being hand-cranked. "Everything is a turn" (David): a counter that counts turns is a
**timer** and has a timer's verbs — start, stop, restart, reset, interrupt — not a
variable's. A counter that counts *things* is a **tally**. Telling them apart by verb
keeps both simple; merging them made both opaque.

### 4. No numbers on the page

`for 3 turns`, `is at least 2`, `lower by 5` — every number was a place the author had to
compute instead of name. Naming the turns (`arriving`, `lingering`, then the built-in
`expired`) made each turn a beat that can carry its own line, and removed the
1-based-or-0-based question entirely. A number that survives in a story is a smell.

### 5. Don't bind a concept to a condition it isn't about

`timer dwell while it is here: …` put presence inside the definition of a timer. David:
"you're conflating `while it is here` with other aspects of what a timer is." A timer
knows nothing but turns; presence is a condition; the clauses that start and reset the
timer are where the two meet. Keeping concepts single-purpose is what keeps each one
explainable in a sentence.

### 6. Hidden mechanism is worse than a visible one

`ends, randomly: …` drew a random length in secret — an author could not tell which named
turns a story would ever reach. `interrupted one chance in 2` puts the chance on the page
and keeps every named turn reachable. When two designs have the same behaviour, prefer
the one whose rules a reader can tabulate from the text.

### 7. Names are part of the syntax

`aggressive` over `grabbing`, `search` over `dwell`, `capture` over `captured`, `landing`
over `entrance`. A mechanism named from the implementation reads as bookkeeping even
when the grammar is right. David's first signal was a name, and it was the right signal.

### 8. Reach for an existing word before inventing one

`here` already meant the player's room (`is here`); `its` already reached counters;
`one chance in n` already existed; `randomly`/`cycling`/`stopping` already existed;
`when <owner> becomes <state>` already existed in sequences. Every new form in ADR-325
is one of those extended to one more position. The one genuinely new word is `timer`.

### 9. Ask before building; build small before asking about the big thing

The first cut was built end to end before David saw a line of it, and six decisions were
made alone that should have been his. The rewrite went one clause at a time — show the
block, he names the worst line, fix that, show it again. That loop is slower per exchange
and far faster to the right answer.

### 10. The platform-language test, applied

The core-concepts rule says a `packages/` change must make platform and language fit
together more elegantly than before. The test that proved to work here: write the story
block you *want*, with no platform in mind, then list what it needs. If the list is
short and each item is a word already in the language moved to one more position, it's a
good change. If the list is long or needs a concept the story never names, the block is
wrong, not the platform.

## Where this applies next

- The Teisha TE20 rewrite, the landing grace window, and the boots beat — each is a
  timer and an event before it is anything else.
- Every chase in the remaining chapters.
- Any future ADR that proposes a condition form: check it against lesson 1 first.

## Pointers

- ADR-325 — `docs/architecture/adrs/adr-325-chord-presence-and-duration.md`
- The first cut (scaffold, kept until ADR-325 lands) — `branch-stories/secret-letter/mercenaries.chord`
- Session — `docs/context/session-20260823-0020-feat-adr-321-world-index.md`
