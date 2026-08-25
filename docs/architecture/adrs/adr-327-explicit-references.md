# ADR-327: Explicit references — clause heads name their actor, and syntactic `it` leaves the language

**Status**: DRAFT (2026-08-25, session 915e68) — Open Questions below; DRAFT until they
resolve (rule 11a). Direction is David's, ruled across the 2026-08-24/25 design
conversation that began as ADR-326's enterer question: *"an IF language should be explicit
about that kind of thing"*; *"I hate 'it' with a passion… it reads wrong."*

**Language + platform change (MAJOR).** Expected surfaces: `packages/chord/src/parser.ts`
(clause-head grammar: actor before gerund; `it`/`its` removed from statement, condition,
and possessive positions), `packages/chord/src/analyzer.ts` (head actor resolution;
name/gerund boundary gates; migration diagnostics), `packages/chord/src/ir.ts` (clause
actor field), `packages/story-loader/src/runtime.ts` (clause firing filtered by the head's
actor; the player's `move`-arrival firing D5), EBNF + `chord-grammar-changes.md` rows +
ADR-257 MAJOR bump, corpus migration sweep (every story and fixture). Engine/stdlib
untouched except as Q-1's resolution requires.

**Date**: 2026-08-25 (session 915e68)
**Related**: [ADR-325](adr-325-chord-presence-and-duration.md) (the clause family this
reforms; `when the player moves` is the subject-position precedent D1 generalizes; D3h's
own-block bare `on going` is Q-3), [ADR-326](adr-326-adjacent-room-place-expression.md)
(depends on exactly one ruling here: D5), ADR-264 D2 (`the X's …` possessives — the
already-shipped replacement for `its`), ADR-228 (the lifecycle slots that decide which
entity's clause is consulted — unchanged), ADR-270/ADR-254 (the MAJOR-cutover precedent:
`define verb` deletion, Chord 3.0.0), `docs/architecture/chord-lessons-learned-timers.md`
(lessons 7–8: names are syntax; reach for an existing word — here, the existing *pattern*),
GH #300 (the "whose leaving?" confusion class this dissolves)
**Issues**: to be filed per landing order at acceptance

## Context

### The two defects, named

**Clause heads assume their actor.** `on taking it`, `after entering it` — the reader
supplies the subject, and the language silently means the player. The assumption is real
machinery, not just style: a room's `after entering it` binds `if.event.actor_moved`
(`story-loader/src/event-contract.ts:22-24`) and filters only on destination
(`runtime.ts:708-713`), so an NPC walking in fires the clause — and the body has no word
for who entered, so `move the player …` fires against the wrong actor from wherever the
player stands. Surfaced by ADR-326's blocked-stall bounce example (David, 2026-08-24).

**`it` reads wrong.** The deictic forces the reader to hold the enclosing block to resolve
any line; in two-actor clauses (`when the player moves` with a body about the owner) it is
actively ambiguous to a human even when the machine is certain. It is also unnecessary:
the language already resolves names and aliases everywhere `it` is legal, ADR-264 D2
already reads `the X's …` where `its X` is written, timer verbs already resolve bare names
owner-first (ADR-325 D3c), and the player's own block already writes
`while the wandering mercenaries is aggressive` — the it-less spelling in live use.

### The gerund assessment (2026-08-25, full sweep)

Every clause-head verb was assessed against actor-explicit heads: ~40 wired stdlib gerunds
(the ADR-228 lifecycle-descriptor set), custom `define action` gerunds, and the event
heads. Findings:

- **Single-object verbs (~28)**: `on the player taking` reads as English
  (gerund-with-subject); the dropped `it` loses nothing — the owner is the object by
  construction. The bulk of the vocabulary and the corpus.
- **Two-object verbs** (giving, showing, telling, asking, throwing, putting, inserting,
  removing, instrument forms): actively better — `on giving it` on a recipient *falsely
  reads* as the owner being given; actor-first removes the false reading, and the owner's
  slot was never in the head anyway (ownership decides it, ADR-228).
- **Motion family**: the flagship. Region `on leaving` — the corpus's most-used head at
  16 occurrences — is already actor-less and it-less; a subject dissolves GH #300's
  "whose leaving?" class. `after the player entering` is the case that started this.
- **Scene/conversation heads** (resuming, refusing, parting): scene-owned, already bare,
  not object-directed — excluded from this reform by name, not swept silently.
- **Mechanical hazards, both solvable**: multi-word gerunds (`switching on`, `taking
  off`) mean the head's tail is matched against the known gerund set — which the loader
  already holds for validation (`runtime.ts:468`) — not parsed as "last word"; an entity
  name ending in an -ing word (a room named "the Landing") is a name/gerund boundary the
  analyzer gates loudly.

### The runtime gap that gates Q-1

Only the player can fire any of these paths today: `plugin-npc` never runs the four-phase
action pipeline (no `if.action.*`, no interceptor anywhere in `packages/plugin-npc/src`),
and Chord NPCs travel by `move` effects, which emit no `actor_moved`
(`moveWithLifecycle`, `runtime.ts:3915` — witness channels only). A head naming a
non-player actor would parse and never fire — the ADR-235 "compiles but cannot work"
class, which the language forbids shipping. Q-1 rules how forced-actor syntax meets that
fact.

### The one load-bearing `it`

`define trait` blocks carry clauses whose `it` means *whichever entity carries the
trait* (`mercenaries.chord:250-256` — `kick-escape`'s `change it to approaching` on any
carrier). A trait composed on N entities cannot name its carrier; every other `it` in the
corpus can be replaced by its enclosing owner's name or alias, but this one cannot. Q-2
rules its replacement.

### Corpus scale

~100 clause heads and on the order of a hundred syntactic `it`/`its` uses across
`branch-stories/` and `stories/` (of ~470 raw tokens, most are English prose inside
descriptions — prose is untouched by this ADR). The migration is mechanical: every
syntactic `it`/`its` resolves statically to its enclosing block's owner.

## Decision

### D1. Clause heads name their actor, in subject position

`on <actor> <gerund>` / `after <actor> <gerund>` — the actor before the verb, the
pattern `when the player moves` already established (ADR-325 D3h). `it` leaves the head;
the owner is the clause's home block and needs no pronoun.

```chord
create the sword
  on the player taking
    refuse sword-not-for-you
  end on

create the Grocery Stall
  a room
  states: open, blocked

  after the player entering, while the stall is blocked
    phrase keeper-yells
    move the player to an adjacent room, randomly
  end after
```

The family becomes fully symmetric — every head is *actor, verb*: `when the player
moves` (event), `on the player taking` (intercept), `after the player entering`
(reaction).

### D2. Syntactic `it` and `its` leave the language

Removed from statements (`change it`, `move it`), conditions (`while it is <state>`,
`when it is <state>`), and possessives (`raise its patience`, `reset its lunge`). The
replacements already exist: names and `aka` aliases everywhere, `the X's …` possessives
(ADR-264 D2), owner-first bare timer names (ADR-325 D3c). Prose `it` — English inside
description and phrase bodies — is untouched. The `define trait` carrier reference is
Q-2's ruling, not a survival of general `it`.

### D3. Head parsing: the gerund is matched, not guessed

After `on`/`after`, the head's tail is matched against the known gerund set (stdlib ids,
story `define action` names, and hatches — the set the loader already validates against);
the words before it are the actor's name. Multi-word gerunds match longest-first. An
actor name whose final word collides with a gerund is a named analyzer error with the
quote-the-line fix-it, never a silent misparse.

### D4. Scene heads are excluded by name

`resuming`, `refusing`, `parting`, and the conversation-scene `leaving` (GH #300's
subject) keep their current heads — they are scene-owned, not actor-object clauses. Their
reform, if any, belongs to the conversation layer's own ADR.

### D5. The player's `move`-arrival fires `after the player entering`

An arrival is an arrival, walked or moved: the player arriving via a `move` effect fires
the room's entering clause exactly as a walked arrival does. (Non-player `move` arrivals
stay silent pending Q-1 — the mercenaries' `move it here` must not start firing entering
clauses as a side effect of this ADR.) A re-entrant chain (an eject that lands in a room
whose entering clause ejects again) is bounded: a depth cap with a named runtime
diagnostic, never an infinite loop. **This is the ruling ADR-326 depends on** — it is
what makes the blocked-stall bounce compose for ejected arrivals.

### D6. Migration is a one-shot MAJOR cutover

ADR-257 MAJOR bump (the ADR-270 `define verb` deletion precedent). The old spellings are
removed, not deprecated: `on <gerund> it` and syntactic `it`/`its` become named parse
errors with fix-its quoting the explicit spelling. Every in-repo story and fixture is
migrated in the landing change; the sweep is mechanical (each `it` resolves statically to
its enclosing owner).

## Non-goals

- No change to which entity's clause is consulted per action — slot semantics stay
  ADR-228's; the head names the *actor*, ownership still binds the object.
- No NPC action pipeline (unless Q-1 resolves to build it — then that work is scoped
  there, not assumed here).
- No new deictic to replace `it` outside Q-2's trait ruling.
- No prose changes; no change to `here` (it stays sugar for the player's location,
  ADR-325 D1), no change to bare timer-name resolution.

## Consequences

- Every clause line survives being read alone — the property the ADR-325 rewrite was
  chasing ("the code aligns with the story"), finished at the language level.
- The two-actor ambiguity class (a `when the player moves` body about the owner) is
  gone; so is the false-object reading on two-object verbs; so is GH #300's "whose
  leaving?" class.
- The ADR-326 example becomes correct as written for NPC traffic: an NPC entering a
  blocked stall no longer fires a player-ejecting clause.
- Dense blocks repeat names where they said `it` — the `aka` alias system is what keeps
  that bearable, and the plural-`is` spelling (`the mercenaries is aggressive`) becomes
  ubiquitous rather than occasional.
- The book, sharpee.net's Chord reference, and `docs/reference` carry a breaking-spelling
  update; the tree-document corpus re-pins nothing (spelling changes don't move seeds).

## Acceptance

1. Compile tests: actor-explicit heads parse for single-object, two-object, multi-word
   gerund, and custom-action cases; `on <gerund> it` and each removed `it`/`its` position
   produce their named errors with fix-its; the name/gerund boundary gate fires by name.
2. REAL-PATH loader tests (rule 13a): a head's named actor filters firing — the player's
   action fires `on the player <gerund>` and (per Q-1's resolution) a non-player actor
   does not fire it wrongly; D5's move-arrival fires the entering clause with the
   re-entrant cap's diagnostic pinned.
3. The migrated corpus is green: every story's suite passes with zero behavioral diffs
   attributable to the reform (fernhill, friendly-zoo, cloak, ides, secret-letter,
   fixtures; Dungeo is TS and untouched).
4. Paper trail: EBNF rows, `chord-grammar-changes.md`, ADR-257 MAJOR bump; the reference
   and book updates are tracked (ADR-272's surfaces).

## Open Questions

1. **How forced-actor syntax meets the player-only runtime.** (a) *Forced, player-only
   v1* — every head names its actor, and the analyzer rejects any actor the runtime
   cannot fire (today: everything but the player), lifting per-head as NPC actors become
   real; one migration, no dead syntax, explicitness is briefly ceremonial.
   **Recommended** — it pairs with D6's single MAJOR cutover. (b) *Force it and wire NPC
   actors in the same reform* — principled, but turns a syntax ADR into an engine ADR.
   (c) *Optional actor now, forced later* — no ceremony, but two migrations and the
   implicit-player reading survives another version.
2. **The trait-carrier reference.** A `define trait` clause needs a word for "the entity
   carrying me." Options: (a) a carrier word — `the carrier` or `the bearer` — one new
   word, used only inside `define trait` (lesson 8's cost, paid once, in the one place a
   name is impossible); (b) `it` survives *only* inside `define trait` (smallest change,
   but the hated word keeps a foothold); (c) traits declare a role name in their header
   that their clauses use (`define trait kick-escape as the victim` … `change the victim
   to approaching`) — most explicit, one more header form. No recommendation recorded —
   the spelling is a naming call (lesson 7) and the owner's.
3. **The own-block bare head.** In the actor's own block the owner *is* the actor
   (`on going` in the player's block, ADR-325 D3h). Keep the bare head there
   (**recommended** — "the subject of a block is its owner" is already how create blocks
   read, and `on the player going` inside `create the player` says it twice), or force
   the actor uniformly everywhere.

## Session

2026-08-24/25, session 915e68 (`docs/context/session-20260824-1035-feat-adr-321-world-index.md`)
— grew out of ADR-326's interview: the enterer question → actor-explicit heads → losing
`it` from heads → the full gerund assessment → losing syntactic `it` from the language.
The it-less mercenaries block specimen and the assessment tables are in the session
record.
