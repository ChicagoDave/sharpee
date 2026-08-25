# ADR-327: Explicit references — clause heads name their actor, and syntactic `it` leaves the language

**Status**: **ACCEPTED** (David, 2026-08-25, session 8ae644 — "flip ADR-327 to
ACCEPTED"). All three open questions resolved via the rule-11a interview the same day
(D7 full implementation on ADR-328's path; D8 `it` is the carrier inside `define trait`
only; D1's own-block bare head stays); the role rule (D1) and `change the player to`
(D9) added from David's questions during review; `adr-review` 19/19 on the second pass.
Direction is David's, ruled across the 2026-08-24/25 design
conversation that began as ADR-326's enterer question: *"an IF language should be explicit
about that kind of thing"*; *"I hate 'it' with a passion… it reads wrong."*

**Language + platform change (MAJOR).** Expected surfaces: `packages/chord/src/parser.ts`
(clause-head grammar: actor before gerund; `it`/`its` removed from statement, condition,
and possessive positions), `packages/chord/src/analyzer.ts` (head actor resolution;
name/gerund boundary gates; migration diagnostics), `packages/chord/src/ir.ts` (clause
actor field), `packages/story-loader/src/runtime.ts` (clause firing filtered by the head's
actor; any actor's `move`-arrival firing, D5; the `change the player to` effect emitting
its switch event, D9), the `playable` create-block line (parser → IR → loader sets
`ActorTrait.isPlayable`, D9), `packages/engine/src/game-engine.ts` (one consumer: the
D9 switch event calls the existing `switchPlayer` at turn end), EBNF +
`chord-grammar-changes.md` rows + ADR-257 MAJOR bump, corpus migration sweep (every
story and fixture). All other engine/stdlib changes belong to ADR-328 (D7); this ADR
consumes its `(action, actorId)` path.

**Date**: 2026-08-25 (session 915e68)
**Related**: [ADR-325](adr-325-chord-presence-and-duration.md) (the clause family this
reforms; `when the player moves` is the subject-position precedent D1 generalizes; D3h's
own-block bare `on going` is kept by D1's own-block exception), [ADR-326](adr-326-adjacent-room-place-expression.md)
(depends on exactly one ruling here: D5 — recorded on this side only so far; ADR-326's
own D5 still says arrival is "unchanged" and is amended when its interview resumes),
[ADR-328](adr-328-actors-are-a-platform-concept.md) (the execution path D7 fires on;
its D7 in turn hands the Chord acting surface to a child ADR), [ADR-132](adr-132-pc-switching.md) (`engine.switchPlayer` — D9's mechanism, unchanged;
this ADR gives it its first caller), [ADR-319](adr-319-flashbacks.md) (rotating PC —
the live requirement behind D1's role rule and D9; its Q2 keeps the segment-scoped
parts), ADR-264 D2 (`the X's …` possessives — the already-shipped replacement for `its`), ADR-228 (the lifecycle slots that decide which
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
  already holds for validation (`isConsultedGerund`, `runtime.ts:620-625`) — not parsed
  as "last word"; an entity
  name ending in an -ing word (a room named "the Landing") is a name/gerund boundary the
  analyzer gates loudly.

### The runtime gap (resolved by D7 via ADR-328)

Only the player can fire any of these paths today: `plugin-npc` never runs the four-phase
action pipeline (no `if.action.*`, no interceptor anywhere in `packages/plugin-npc/src`),
and Chord NPCs travel by `move` effects, which emit no `actor_moved`
(`moveWithLifecycle`, `runtime.ts:3915` — witness channels only). A head naming a
non-player actor would parse and never fire — the ADR-235 "compiles but cannot work"
class, which the language forbids shipping. D7 rules that the gap closes for real —
ADR-328's execution path — rather than being fenced by the analyzer.

### The one load-bearing `it`

`define trait` blocks carry clauses whose `it` means *whichever entity carries the
trait* (`mercenaries.chord:250-256` — `kick-escape`'s `change it to approaching` on any
carrier). A trait composed on N entities cannot name its carrier; every other `it` in the
corpus can be replaced by its enclosing owner's name or alias, but this one cannot. D8
keeps it there, and only there.

### Corpus scale

159 clause heads — 73 `on/after <gerund> it` and 86 bare (`on leaving`, own-block
`on going`, scene heads, customs) — counted 2026-08-25 with
`grep -rn -E '^\s+(on|after) [a-z-]+( [a-z]+)?( it)?$' branch-stories/ stories/`, and on
the order of a hundred syntactic `it`/`its` uses across the same trees (of ~470 raw tokens, most are English prose inside
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

**Own-block exception** (Q-3 resolved 2026-08-25, David: *"the actor's block remains
unchanged"*): inside an actor's own `create` block the bare head stays — `on going`,
`after going` — because the subject of a block is its owner, exactly as `wears the
boots` needs no subject. ADR-325 D3h stands as written for the player block, and the
same rule reads onto NPC blocks under ADR-328: `on going` inside `create the wandering
mercenaries` is the mercenaries going. A bare head anywhere *other* than an actor's own
block is the D6 parse error with the explicit-actor fix-it. There is no collision with
D8: a trait's carrier is the clause's object, never its actor, so `define trait` bodies
never take a bare head.

**`the player` is the role, not an entity** (adr-review finding 2026-08-25, David's
question: *"have we covered the case where 'the player' changes object definitions?"*).
In a clause head, `the player` means whoever is the PC when the action fires —
`world.getPlayer()` at fire time, the way `when the player moves` already resolves its
mover (`runtime.ts:755-756`) — never a compile-time binding to the entity `create the
player` built. Own-block bare heads bind the other way: to the *entity* whose block they
sit in. So under PC rotation (ADR-319 on ADR-132's `switchPlayer`), a room's `after the
player entering` follows the switch to Viola, while Jack's own `on going` keeps firing
when Jack goes — now as an NPC, on ADR-328's symmetric path. An author who wants
"whoever is the PC" writes `the player`; one who wants "this character" writes in that
character's block.

### D2. Syntactic `it` and `its` leave the language

Removed from statements (`change it`, `move it`), conditions (`while it is <state>`,
`when it is <state>`), and possessives (`raise its patience`, `reset its lunge`). The
replacements already exist: names and `aka` aliases everywhere, `the X's …` possessives
(ADR-264 D2), owner-first bare timer names (ADR-325 D3c). Prose `it` — English inside
description and phrase bodies — is untouched. The one exception is D8: inside
`define trait`, `it`/`its` mean the carrier — a scoped role word, not a survival of
general `it`.

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

### D5. A `move`-arrival fires `after <actor> entering`, for any actor

An arrival is an arrival, walked or moved: an actor arriving via a `move` effect fires
the room's entering clause for that actor exactly as a walked arrival does. With heads
naming their actor (D1), the old side-effect hazard dissolves — the mercenaries moved
into a room fire `after the mercenaries entering` and never `after the player entering`.
A re-entrant chain (an eject that lands in a room whose entering clause ejects again) is
bounded: a depth cap of 8 nested move-arrivals per turn, after which the loader stops
firing entering clauses and raises the runtime diagnostic `runtime.move-arrival-reentry`
(naming the room chain) — never an infinite loop. The cap and the id are pinned by AC-2's
re-entrant test; 8 is a ceiling no story composition should approach, not a tuning knob. **This is the ruling ADR-326 depends on** — it is
what makes the blocked-stall bounce compose for ejected arrivals.

### D6. Migration is a one-shot MAJOR cutover

ADR-257 MAJOR bump (the ADR-270 `define verb` deletion precedent). The old spellings are
removed, not deprecated: `on <gerund> it` and syntactic `it`/`its` become named parse
errors with fix-its quoting the explicit spelling. Every in-repo story and fixture is
migrated in the landing change; the sweep is mechanical (each `it` resolves statically to
its enclosing owner).

### D7. Full implementation: named actors fire, on ADR-328's execution path

(Q-1 resolved 2026-08-25, David: *"full implementation"*.) A head may name any actor,
and the runtime fires it — there is no player-only v1, no interim analyzer restriction
that lifts per actor path, and no optional-actor transition. The firing path is
[ADR-328](adr-328-actors-are-a-platform-concept.md) D1/D2's `(action, actorId)`
pipeline: a clause head's actor is matched against the acting actor of the four-phase
action (or, for D5, the moved actor), so `on the mercenaries taking` fires when the
mercenaries take and `on the player taking` does not. ADR-327's runtime half therefore
lands on ADR-328's execution entry rather than ahead of it; the syntax, analyzer, and
corpus migration can land first, but the ADR is not *complete* — Acceptance item 2 is not
green — until non-player actors fire for real. This supersedes ADR-328 D7's assumption
that this ADR's analyzer would lift a per-head restriction incrementally.

### D8. Inside `define trait`, `it`/`its` mean the carrier — and nowhere else

(Q-2 resolved 2026-08-25, David: *"this is the one instance where 'it' works… in a
trait definition."*) A trait composed on N entities has no name for the entity carrying
it, so `define trait` is the one block where a deictic is not a shortcut but the only
possible reference. There, `it` is the carrier and `its` is the carrier's possessive, in
every position D2 removes elsewhere — conditions, statements, possessives. Outside
`define trait`, `it`/`its` remain the D2/D6 parse errors; the analyzer scopes the
allowance to the trait block, so a stray `it` in a `create` block gets the same fix-it
regardless of what traits the entity carries.

The specimen (`mercenaries.chord:250-259`, D1 head reform applied):

```chord
define trait kick-escape
  on the player kicking
    refuse when it is oblivious: merc-dont-provoke
    phrase merc-break-free-kick when it is aggressive
    phrase merc-shove-off-kick when it is approaching
    change it to approaching
    reset its lunge
    reset its capture
    start its recovery
  end on
end trait
```

The three timer lines that today name `the wandering mercenaries'` outright become
carrier-relative, which is what makes the trait actually composable on more than one
entity. No carrier word (`the bearer`), no header role name (`as the victim`) — neither
new form is added.

### D9. Reassigning the role: `change the player to <entity>`

(David, 2026-08-25: *"I would prefer 'change the player to Viola'."*) The statement that
moves the PC role to another entity is the existing `change` effect with `the player` as
its object — the role is a thing whose current value is an entity, and `change X to Y`
is already how Chord says "X is now Y." No new word.

```chord
create Viola
  starts in the Chapel
  playable

create the Chapel
  a room

  after Jack examining the seal
    phrase cut-to-viola
    change the player to Viola
  end after
```

It rides ADR-132's `engine.switchPlayer` (`packages/engine/src/game-engine.ts:1681`)
and carries its three constraints into the language: the target carries `playable`
(the `ActorTrait.isPlayable` flag as a create-block line — an analyzer error otherwise,
so the engine's throw never reaches a player); the new PC is positioned first (`move
Viola to …` on the line above if she is not already somewhere); and the switch takes
effect at the end of the turn the clause fires in, so the next prompt is the new PC's.
The old PC is an ordinary actor thereafter (ADR-328 D1) — its own-block clauses keep
firing when it acts. Every `the player` head re-resolves at the next fire (D1's role
rule); nothing recompiles.

**Boundary contract.** The loader holds no engine handle — it reaches the engine only
through events, the way endings do (`triggerEnding`, `loader.ts:1647-1651`, emitting a
`StoryEndingEvents` event the engine consumes). D9 follows that seam: the effect emits
`if.event.player.switch_requested` `{ entityId }` (the `playable` check having already
passed at compile time), and the engine consumes it at turn end and calls
`switchPlayer` — its first caller; today it has none. A second `switch_requested` in the
same turn is a named runtime diagnostic, not a race. ADR-132's `game.pc_switched` event
follows as it always would, so plugins and the status line learn of the switch from the
engine, never from the loader. ADR-319 Q2's remaining parts — vocabulary, pronouns, status
line inside a segment — stay ADR-319's.

### Supersedes — and who flips what

- **ADR-328 D7 (last sentence) and its acceptance item 3** assumed this ADR's analyzer
  would lift a per-head actor restriction incrementally; D7 here removes the restriction.
  Flip owner: a hand-edit to ADR-328 in the session that accepts this ADR (2026-08-25),
  since it is a direct consequence of the Q-1 ruling.
- **ADR-325 D3h's examples** (`when the player moves, while it is approaching` … `move it
  offstage`) use spellings D2 removes; D3h's own-block bare head stands. Flip owner: the
  D6 landing change amends ADR-325's examples to the explicit spelling (amend-after-code).
- **ADR-264 D2's `raise its suspicion by 5` form** is removed by D2; the possessive-by-name
  form is the survivor. Flip owner: the D6 landing change strikes the `its` clause from
  ADR-264 D2.

## Non-goals

- No change to which entity's clause is consulted per action — slot semantics stay
  ADR-228's; the head names the *actor*, ownership still binds the object.
- No NPC action pipeline built *here* — D7 rides ADR-328 D1/D2's; this ADR adds the
  clause-head actor match on top of it, nothing below it.
- No new deictic anywhere: `it` outside `define trait` is not replaced by another
  pronoun; it is replaced by the name (D2, D8).
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
   produce their named errors with fix-its; the name/gerund boundary gate fires by name;
   `it`/`its` inside `define trait` compile as the carrier in condition, statement, and
   possessive positions, and the same spellings one block out are the D2 errors (D8);
   a bare head compiles inside an actor's own block and is the named error outside one
   (D1's own-block exception).
2. REAL-PATH loader tests (rule 13a): a head's named actor filters firing — the player's
   action fires `on the player <gerund>` and not `on the mercenaries <gerund>`; a
   non-player actor acting through ADR-328's execution entry fires its own head and not
   the player's; D5's move-arrival fires the entering clause for the moved actor, with
   the re-entrant cap's diagnostic pinned.
3. The migrated corpus is green: every story's suite passes with zero behavioral diffs
   attributable to the reform (fernhill, friendly-zoo, cloak, ides, secret-letter,
   fixtures; Dungeo is TS and untouched).
4. Paper trail: EBNF rows, `chord-grammar-changes.md`, ADR-257 MAJOR bump; the reference
   and book updates are tracked (ADR-272's surfaces).
5. D9, compile and REAL-PATH: `change the player to <entity>` parses and `playable` gates
   it (a non-`playable` target is the named analyzer error); through a real engine, the
   clause's turn ends with `game.pc_switched`, the next turn's `after the player
   entering` fires for the new PC and not the old one, the old PC's own-block clause
   still fires when the old PC acts, and two switches in one turn raise the diagnostic.

## Session

2026-08-24/25, session 915e68 (`docs/context/session-20260824-1035-feat-adr-321-world-index.md`)
— grew out of ADR-326's interview: the enterer question → actor-explicit heads → losing
`it` from heads → the full gerund assessment → losing syntactic `it` from the language.
The it-less mercenaries block specimen and the assessment tables are in the session
record. 2026-08-25, session 8ae644 — the three open questions resolved by interview
(D7, D8, D1's own-block exception), the role rule and D9 added from David's questions
during review, two `adr-review` passes folded.
