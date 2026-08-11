# ADR-310: The Character Model in Chord — Words the Author Writes, Numbers the Runtime Owns

**Status**: ACCEPTED (2026-08-11, session c28ea0 — all eight open questions
resolved, five of them in that session's interview; `/devarch:adr-review` run
twice, second pass READY WITH CLARIFICATIONS at 12/16 with all three blockers
closed. See Session for the map and for the four SMALL findings deliberately
carried into planning rather than answered here.
Written at David's request after an audit found `@sharpee/character` shipping
with zero consumers, then expanded on his ruling that goals, influence and
propagation are the point rather than the deferrable part.)
**Date**: 2026-08-11 (session c86356)
**Builds on**: ADR-141 (character model), ADR-142 (conversation), ADR-144
(information propagation), ADR-145 (goal pursuit), ADR-146 (influence),
ADR-210 (Chord), ADR-222 (Chord as elegance oracle), ADR-239 (topic tables),
ADR-250 (phrasebooks)
**Requires first**: ADR-102 (dialogue extension) — still `Proposed`, never
implemented in stdlib; D19a makes building its registration point a prerequisite
of the conversation mapping rather than a parallel task.

---

## Context

`@sharpee/character` was designed and built across four days in April 2026 —
ADRs 141 through 146 — and it works. As of 2026-08-11 it has **301 tests across
19 files, all passing**, a clean `tsc`, and it was version-stamped 5.0.0 and
published to npm with the rest of the platform on 2026-08-10.

**Nothing imports it.** A repository-wide search for `@sharpee/character` finds
the package's own source, and one line in the `@sharpee/sharpee` umbrella's
dependency list. Not the Chord compiler, not the story loader, not one story.

Chord *does* have an NPC surface, and it is a different subsystem. Its `npc`
manifest vocabulary is `guard`, `follower`, `wanderer`, `patrol`, `route`,
`loop`, `can-move`, `move-chance`, `allowed-rooms`, `forbidden-rooms`,
`announces-movement`, `wait-turns` — that is `@sharpee/plugin-npc`, the movement
and behavior layer. Not one psychological term appears in it. Conversation is
the near-miss: Chord's `define topics for …` (ADR-239) wired to the simpler
stdlib topic table, while `character/src/conversation/dialogue-extension.ts`
drives dialogue from belief and disposition. The two never met.

This is not a decision anyone made. Chord arrived in July 2026, three months
after the character model, and grew its NPC surface from the plugin that was
already wired. The character model simply stopped being on the path.

**Why it is worth mapping rather than deleting.** ADR-141's vocabulary was
designed in natural language from the start:

```typescript
.personality('very honest', 'very loyal', 'cowardly')
.mood('nervous')
.on('player threatens').becomes('panicked').feelsAbout('player', 'wary of')
```

with intensity words mapping to values (`slightly` 0.2 … `extremely` 0.95) and
disposition words to ranges (`wary of` −20…−40, `devoted to` +80…+100). That is
already the compile-down ADR-222 describes: the author writes words, the runtime
owns the numbers. `vocabulary-extension.ts` even lets a story define custom moods
by valence and arousal — an authoring hook built for a language that did not yet
exist.

Set that beside a real Chord NPC, from Fernhill:

```chord
create Mrs. Ashby
  a person, proper, guard
  pronouns she
  in the Entrance Hall
  states: guarded, softened
  score softened worth 5

  on giving it
    change it to softened when it has the sherry bottle
    award softened, once when it is softened
```

Every structural shape ADR-141 needs already exists here.

## Decision

### D1. Map all of it. The hard three are the reason to do this at all.

An earlier draft of this ADR split the model in two and deferred goals,
influence and propagation as "strategies, not attributes." That was wrong, and
worth recording as wrong: it deferred the only part of the subsystem that is
not available anywhere else, on the strength of a distinction that does not
survive contact with the code. `patrol with route [the Gravel Drive, the
Fountain Court] and wait-turns 5` is already a strategy expressed declaratively,
in shipping Chord, today. The question was never whether a strategy can be
declared. It was whether these particular strategies had been given words yet —
and ADRs 144–146 had already given them words.

So: **all six subsystems map.** Personality, mood and disposition (D2–D3),
cognitive profile (D4–D5), goals (D8), influence and resistance (D9), and
information propagation (D10).

**What is actually unusual here.** Prior art exists and should be named rather
than waved at: Inform 7 has rulebooks and every-turn rules; TADS 3 has actors
with agendas and conversation nodes; Versu (Evans and Short) modelled social
practice systemically; Prom Week made social state the entire mechanic. What
none of those did — including Versu, which was a research system rather than a
general authoring tool — is ship **belief propagation, influence with
resistance, and goal pursuit as one coherent model, addressable from a
declarative authoring language, in a general-purpose parser IF platform**. That
combination is the claim, and it is narrower and more defensible than "nobody
has tried this."

The three deferred subsystems *are* that combination. Deferring them would have
left Chord with a nicer way to say an NPC is nervous.

### D2. Personality is an adjective list, because Chord already has one.

Chord writes `a person, proper, guard` — a comma-separated adjective list after
the kind. Personality extends it without new grammar:

```chord
create Tobias
  a person, very honest, very loyal, cowardly
```

The intensity words are part of the adjective, exactly as ADR-141 defines them.
An unknown trait is a compile error naming the vocabulary, in the same shape as
every other unknown-adjective diagnostic — not a silent drop.

### D3. Mood and disposition are declarations; transitions reuse `change`.

```chord
create Tobias
  a person, very honest, cowardly
  mood nervous
  feels wary of the player
  knows the murder, witnessed

  on threatening it
    change mood to panicked
    change feeling toward the player to wary of
```

`change mood to X` and `change feeling toward Y to Z` are deliberately the same
verb Chord already uses for states (`change it to softened`). One mental model
for "this NPC is now different," not three.

### D4. Cognitive profiles are five dimensions the author can compose, name and ship.

An earlier draft made this a preset name and put custom profiles out of scope.
That contradicted the code it was mapping: `cognitive-presets.ts` says in its own
header that the presets are *"starting points for authors, not platform-level
constants"* and that authors *"override any dimension."* The mapping should
expose what the model already offers.

**The profile is five dimensions, three words each** — every value already a
plain English word, which is why this maps at all:

| Dimension | Values |
| --- | --- |
| `perception` | `accurate` · `filtered` · `augmented` |
| `belief-formation` | `flexible` · `rigid` · `resistant` |
| `coherence` | `focused` · `drifting` · `fragmented` |
| `lucidity` | `stable` · `fluctuating` · `episodic` |
| `self-model` | `intact` · `uncertain` · `fractured` |

**Authors define and name their own**, in the shape Chord uses for every other
named definition (`define phrasebook`, `define channel`, `define phrase`):

```chord
define profile hollowed
  perception filtered
  belief-formation resistant
  coherence drifting
  lucidity episodic
  self-model uncertain
end profile

create Iris
  a person, very curious, slightly paranoid
  cognitive-profile hollowed
```

**Partial overrides reuse the manifest form** Chord already parses for
`patrol with route [...] and wait-turns 5`:

```chord
create the Sergeant
  a person, stubborn
  cognitive-profile clear-headed with coherence drifting and perception filtered
```

Any unstated dimension inherits from the named base; with no base named, from
`clear-headed` (D5). A profile is therefore always complete at compile time, and an author
never has to write five lines to change one.

### D5. The presets are renamed to describe behavior, not diagnosis.

David's ruling, 2026-08-11. The eight shipped presets keep their dimension
values exactly and lose their clinical names. Each new name says what the
character *does*, which is the only thing the model actually encodes:

| Was | Becomes | perception / belief / coherence / lucidity / self |
| --- | --- | --- |
| `stable` | **`clear-headed`** | accurate · flexible · focused · stable · intact |
| `obsessive` | **`fixated`** | accurate · resistant · focused · stable · intact |
| `dissociative` | **`elsewhere`** | accurate · flexible · focused · episodic · fractured |
| `intoxicated` | **`loosened`** | filtered · flexible · drifting · fluctuating · intact |
| `tbi` | **`fogged`** | filtered · flexible · drifting · fluctuating · uncertain |
| `ptsd` | **`braced`** | filtered · rigid · drifting · episodic · uncertain |
| `dementia` | **`unmoored`** | filtered · rigid · fragmented · fluctuating · fractured |
| `schizophrenic` | **`unquiet`** | augmented · resistant · fragmented · episodic · uncertain |

Three things this buys, beyond the obvious.

**It stops the platform making a claim it cannot support.** `dementia` names a
condition and implies the five dimensions are a model of it. `unmoored` describes
a character who misses things, will not update, mixes timeframes, and loses
continuity of self — which is exactly and only what those five values do.

**It removes a name collision.** `stable` was both a preset name and a value of
the `lucidity` dimension. `cognitive-profile stable with lucidity stable` was
legal and unreadable; `clear-headed` ends it.

**It reads better in the source**, which is the whole premise of Chord.
`cognitive-profile braced` is a sentence about a character. `cognitive-profile
ptsd` is a chart label.

The presets remain what their own header always claimed — starting points. An
author is free to ignore all eight and compose from dimensions, and the new
names carry no more authority than the old ones did.

**This renames exported API** — `CognitivePresetName` and the `COGNITIVE_PRESETS`
keys in `@sharpee/character`, published at 5.0.0. That is affordable because the
subsystem is greenfield, and D11a makes the general case: normalize now, while
nothing depends on the shape. The rename lands with the normalization pass, not
after it.

**The same door should open for moods and personality traits.**
`vocabulary-extension.ts` already supports `defineCustomMood` (by valence and
arousal) and `defineCustomPersonality`. Chord should expose both, in the same
`define …` shape, rather than freezing authors to the platform's word lists.
The exact syntax is left to implementation; the decision here is that the
vocabulary is open, not closed.

**The editorial obligation survives, and shifts.** The dimensions are
descriptive and carry no clinical claim — `coherence drifting` says what it
does. The preset *names* are different: they are names of real conditions,
applied to characters a player will interpret. Now that authors can compose their
own, the presets are a convenience rather than the interface, and the
documentation should present them that way — say plainly what the five dimensions
model, and never imply that a preset is a portrait of a condition. Whether the
platform should ship clinically-named presets at all is a live question, now that
nothing depends on them (Open Question 8).

### D6. Decay stays in the runtime and is never declared.

Mood decays toward a baseline; disposition drifts; confidence erodes. None of it
appears in Chord. The author declares a starting state and the transitions they
care about; the runtime owns the curve. A syntax for decay rates would be numbers
in a language whose entire premise is words.

### D7. Nothing changes for stories that do not use it.

Every construct above is opt-in. A `create X / a person` with no personality line
compiles exactly as it does today, with no character model attached — matching
ADR-141's own "opt-in per NPC." Fernhill and Dungeo are unaffected.

### D8. A goal is a named, ordered block with an activation condition.

ADR-145's builder is already a sentence: activates when conditions hold, has a
priority, pursues an ordered sequence of steps whose types are verbs — `seek`,
`acquire`, `waitFor`, `moveTo`, `act`, `say`, `give`, `drop`.

Chord has every piece: named blocks with bodies (`on … end on`), ordered
statement sequences, `when` conditions, and bracketed lists (`route [a, b, c]`).

```chord
create Colonel Mustard
  a person, proper, ruthless, calculating

  goal eliminate-player, critical
    active when it knows player-suspects-me and it is hostile
    seek the kitchen knife in the Kitchen
    wait for the player alone in the room
    act mustard-attacks-player
  end goal
```

The step list is the block body, in order, one verb per line — the same reading
order as the sequence it compiles to. Priority rides on the header line beside
the name, the way `score softened worth 5` already puts a modifier inline.

**Why a block and not a manifest.** `patrol with route [...] and wait-turns 5`
works because a patrol is one strategy with parameters. A goal is *n* steps of
*different kinds*, and flattening that into `with … and …` would produce a line
nobody can read. The block is the honest shape.

Deactivation stays implicit: `active when` is re-evaluated each NPC turn, as
ADR-145 specifies. A goal that stops being active stops running; the author
declares the condition, not the lifecycle.

### D9. Influence is a named block; resistance is one line on the target.

The asymmetry in ADR-146 is the good part and Chord should keep it — influence
is defined on the exerter, resistance on the target, and the two are joined by a
name the author invents.

```chord
create Ginger
  a person, proper

  influence seduction, passive, proximity
    clouds focus
    makes mood distracted
    phrase ginger-brushes-against on witnessed
    phrase ginger-brushes-against-no-effect on resisted
  end influence

create Margaret
  a person, proper
  resists seduction, except from a woman

create the Detective
  a person, proper
  resists intimidation
```

Mode and range sit on the header beside the name, as with a goal's priority.
The effect lines read as effects rather than as assignment — `makes mood
distracted` over `mood: distracted` — because the subject is another character.
Message hooks reuse `phrase`, which already exists and already interpolates.

Resistance is deliberately a **single line**, because ADR-146 makes evaluation
binary: the target resists or does not. One line for a yes/no, with `except`
for the conditional vulnerability that makes Margaret interesting.

**Influence names stay author-invented.** The platform constrains mode, range
and effect keys; it does not ship a list of feelings people can exert on each
other. That is the story's business.

### D10. Propagation is a manifest, and it is the easiest of the three.

ADR-144's profile is already `tendency` / `to` / `spreads` / `excludes` over
closed vocabularies — `chatty`, `selective`, `mute`; `trusted`, `anyone`,
`allied`. That is a manifest in the shape Chord already parses.

```chord
create the Maid
  a person, gossipy, nervous
  spreads gossip chatty to trusted, except the Colonel

create the Butler
  a person, discreet, loyal
  spreads nothing

create the Cook
  a person, honest, anxious
  spreads the murder and the weapon to anyone
```

`spreads nothing` is `mute` said in English, and `selective` disappears as a
keyword because listing what an NPC spreads *is* selectivity — a vocabulary word
the author never has to learn. That substitution is the elegance oracle earning
its keep: three tendency words become two constructs and one inference.

**What propagation needs that Chord does not have.** Knowledge itself. `knows
the murder, witnessed` (D3) declares one NPC's belief; propagation is about that
belief *moving*, with confidence, source and access travelling with it. The
declaration is easy; the fact that a story now has an information graph is not,
and Open Question 2 is about the missing half of it.

### D11. The oracle runs in both directions.

ADR-222 says a Chord form cleaner than the hand-written TypeScript proves the
platform has a seam. This mapping is a test of that claim on the largest
untouched subsystem in the repository. If the Chord form of ADR-141 reads better
than `character-builder.ts` — and D2–D4 suggest it will — then the builder API is
the seam, and the finding belongs back in `@sharpee/character`, not just in Chord.

### D11a. The subsystem is greenfield, so normalize it rather than wrap it.

David's ruling, 2026-08-11: *"this is one area of Sharpee that remains greenfield
so I think we're safe to normalize it and align it to Chord properly."*

This changes what the work is. Not "map Chord onto the existing builder" —
**reshape both surfaces to one design**, while that is still free.

**The window is real and it is measurable.** Zero imports outside the package
(Context), no story uses it, no published artifact depends on its API shape. A
breaking change today costs one package's tests. The same change after the first
story ships costs every story that named a preset, a mood, or a goal step.

**Chord is the reference where they disagree.** D11 says a cleaner Chord form
proves the TypeScript has a seam; D11a says what to do about it — fix the seam.
The concepts must be named the same thing on both surfaces, with only the
language's own conventions differing (`belief-formation` in Chord,
`beliefFormation` in TypeScript, same concept, same word). Where the builder's
name is worse than the Chord form, the builder changes. Two examples visible
already: `resistsInfluence('seduction')` against Chord's `resists seduction`, and
`.propagation({ tendency: 'selective', spreads: [...] })` against `spreads the
murder to anyone` — where D10 showed the `selective` keyword disappearing
entirely, which is a simplification the TypeScript should also take.

**What normalization covers**, concretely:

1. The preset rename (D5), which is the same window.
2. Concept naming parity across builder, trait data, and Chord.
3. Dropping vocabulary the Chord form proves redundant — `selective` being the
   first, and the rest to be found by writing the mapping.
4. One predicate language (D8's `active when`, D9's `except`, D13's `while`,
   D3's transitions), defined once and reused, rather than four condition
   syntaxes that happen to look alike.

**The cost, stated plainly.** The package has 301 passing tests written against
the current shape. Normalizing means moving them, and a test suite rewritten
alongside the thing it tests briefly proves less than it did. That is affordable
here precisely because nothing else depends on the result — but it should be
done as a deliberate pass with the tests re-derived from the ADRs, not
mechanically renamed to keep green.

### D12. The player never sees or senses the mechanics — only the behavior.

David's ruling, 2026-08-11, and it governs every other decision here.

Nothing the model computes reaches the player as a fact about the model. No mood
word appears in the prose. No disposition value, no goal name, no influence name,
no "the Colonel is now hostile," no status line, no notification that a rumour
arrived. The player's only evidence is what characters visibly **do and say**.

This is not a rendering preference. It decides what the model is *for*: a
generator of behavior, not a simulation the player is invited to read.

**What this permits.** ADR-146's `witnessed` and `resisted` messages are already
the right shape — they are author-written prose about an event
(`ginger-brushes-against-{target}`), not a readout of state. Everything the model
does must reach the player in that form or not at all.

**What this forbids.** Any generated sentence that names a model concept. If a
goal activating or a rumour arriving needs to be perceptible, it is perceptible
because the author wrote what that character now does differently — not because
the platform announced a transition.

**The cost, stated plainly.** This raises the bar on authored prose rather than
lowering it. A model whose only channel is visible behavior demands that the
author write the behavior for each meaningful state; otherwise the NPC's interior
life is real and invisible, which is the same as absent. The demonstration story
in Open Question 1 is partly a test of how much prose that actually takes.

**The author is the exception, and the separation is architectural.** Authors
must be able to see everything the player cannot — why an NPC chose a goal, which
influence resolved, where a belief came from. That belongs to the IDE and the
testing surface, carried on its own channel (ADR-163), and it must be impossible
for it to reach a published story's output. Player-facing prose and author-facing
introspection are two channels, not one channel with a flag.

### D13. Phrases gate on psychological state — and phrasebooks are how it scales.

D12 says the model reaches the player only as behavior. This is the mechanism,
and Chord already has both halves of it.

**Per-line gating exists today.** Fernhill line 667:

```chord
phrase kettle-softened when it is softened
```

Extending the condition vocabulary to interior state is the same construct with
new predicates:

```chord
phrase colonel-terse when it is panicked
phrase colonel-warm when it feels trusts toward the player
```

**Per-voice gating also exists today, and is the better default.** ADR-250's
phrasebooks are already swapped by state — Fernhill lines 1133 and 1143:

```chord
define phrasebook midnight-voice while midnight
  vane-mood, first-time:
    The vane swings hard north, as if the night had opinions.
  or
    The vane holds north. Of course it does.
end phrasebook
```

A phrasebook *is* a voice. Which means a character's psychological state selects
a voice, not a hundred conditionals:

```chord
define phrasebook mustard-cornered while the Colonel is panicked
  greeting:
    "What." Not a question. He does not look up from the door.
  refusal:
    "I have told you." The knife-hand flexes, once.
end phrasebook
```

**This is the answer to D12's cost.** The burden of "write the behavior for each
meaningful state" becomes *write the voice once per state* rather than *write a
conditional per line*. An NPC with forty lines of dialogue and three moods needs
three phrasebooks, not forty `when` clauses — and the author is writing
characterisation, which is the work they wanted to do anyway, rather than
bookkeeping.

**What is genuinely new, stated honestly.** `while midnight` names a *story*
state today. Gating on `while the Colonel is panicked` requires `while` to accept
an entity-scoped predicate, and per-line `when` to accept the same. That is a
real extension to two constructs — not free, but a widening of existing grammar
rather than an invention, and the same predicate vocabulary D9's `active when`
and D9's `except` already need. One predicate language, four places it is used.

**Resolution order needs deciding, not assuming.** A character in a psychological
phrasebook, inside a story-state phrasebook (`while midnight`), emitting a phrase
that also carries `when` — three gates on one line. ADR-250's existing
phrasebook resolution seam is where that belongs, and this ADR does not settle
it. Added to Open Questions.

### D14. A skeleton demonstration story is written first, and it is the acceptance fixture.

David's ruling, 2026-08-11 (session c28ea0), resolving Open Question 1.

The first artifact of this work is a **new Chord story that does not compile yet** —
source written as the specification for the grammar D2–D13 describes, rather than
against whatever the compiler happens to accept. "The mapping works" then means
*this file compiles and plays*, not *the round-trip unit tests are green*.

**Skeleton, not a finished story.** Enough people to make the hard three
observable — several characters who know things about each other and disagree
about them, which Fernhill's four people and no secrets cannot supply — with:

- every construct in D2–D13 appearing at least once, so the file is a complete
  grammar exercise;
- goals, influence/resistance, and propagation wired across the cast rather than
  demonstrated on one NPC;
- **one phrasebook per psychological state for at least one character** (D13),
  which is the minimum that tests D12's cost — whether "write the voice once per
  state" is actually the burden D13 claims, or whether it is worse.

What it deliberately is *not*: a thousand lines of finished prose. The skeleton
pins the constructs and shows whether the behavior reads; a full second Chord
story is not a prerequisite to the compiler.

**Why Fernhill was rejected, on the record**: four people, no secrets, and
bolting a household's worth of belief traffic onto a finished story distorts it.
**Why compiler-first was rejected**: this ADR's own Consequences say the hard
three are emergent and "the author's only window on them is play," so a green
round-trip suite proves the parse and not the design.

**Content is the author's, not the platform's.** The setting, the cast, what each
character knows and hides — David supplies these. This ADR fixes the story's
*structural* requirements only, and the work cannot start on the story's prose
until that content exists.

### D15. Disposition is entity-to-entity, and always was.

Resolving the first half of Open Question 2. The question assumed NPC-to-NPC
disposition needed somewhere to live; it already lives where disposition lives.
`character-builder.ts:245` is `dispositionToward(entityId, word)`, backed by a
plain `Map<string, number>` keyed by entity id. The player is not a special case
in it — the player was simply the only entity anyone had pointed it at.

So D3's `feels wary of the player` generalizes to `the Maid trusts the Cook`
as a **Chord grammar widening with no runtime work behind it**. The disposition
word list (ADR-141's `wary of`, `devoted to`, `trusts`, `dislikes`, …) is
unchanged and applies to any target.

The one thing this does add is scale: dispositions among *n* characters are
*n²*-ish rather than *n*, and an author writing a household will not declare
them all. Unstated disposition means neutral, as it does today — the author
declares the relationships that matter and the rest are indifferent.

### D16. A fact is declared once, at story level, and referenced by name.

Resolving the second half of Open Question 2, which is the real gap.

**What the runtime does today.** Facts are addressed by bare strings —
`knows('the murder')`, `PropagationProfile.spreads?: string[]`,
`overrides?: Record<string, FactOverride>`, `PropagationTransfer.topic: string`.
Nothing declares that a fact exists. Two characters know the same thing only
because two `knows` lines happen to carry the same string.

**Why that cannot survive contact with Chord.** In a compiled language with an
Index, a typo in one NPC's `knows` line would silently mint a second, private
fact — one nobody else can ever learn, propagate, or contradict, and no
diagnostic would fire. Chord catches unknown names everywhere else; an
information graph addressed by unchecked strings is the one place it would not,
and it is the place where the failure is invisible in play rather than loud.

**The decision**: facts are first-class declarations, in the shape D4 gives
profiles and Chord already gives phrasebooks and channels — `define fact … end
fact`, at story level. A name that no declaration introduces is a compile error.
That gives three things beyond typo-safety: a place to hang what a fact's false
version *is* (D17 needs one), a place for its internal structure (D17's
`omission` needs one), and a subject for the Index tab's answer to *who knows
what*, which is the tooling gap this ADR's Consequences already name.

Illustrative only — the exact syntax is left to implementation, as D5 leaves
custom moods:

```chord
define fact the murder
  ...
end fact

create the Cook
  a person, honest, anxious
  knows the murder, witnessed
```

**This is kept in ADR-310, not split into its own ADR.** The open question
guessed it wanted one. It does not: it is one construct in the same mapping, and
the fact registry it needs on the TypeScript side is precisely the D11a
normalization pass — separating them means doing that pass twice, and the second
time is after the window has closed.

### D17. One conversation vocabulary. What varies is where the belief lands.

David's ruling, 2026-08-11 (session c28ea0), in two parts — and the second part
retracts most of the first.

**Part one: the binary is not enough.** The runtime ships `SpreadsVersion =
'truth' | 'lie'`, which cannot express a character who tells you true things in
order to make you believe a false one — the commonest move in the genre this
model is for.

**Part two: but the answer is not a second vocabulary.** An earlier form of this
decision proposed a five-stage scale (`the truth` / `omission` / `obfuscation` /
`misdirection` / `the lie`). Review found that `@sharpee/character` already ships
an eight-value conversational vocabulary:

```typescript
ResponseAction = 'tell' | 'omit' | 'lie' | 'deflect'
               | 'refuse' | 'ask back' | 'confess' | 'confabulate'
```

Three of the proposed five were near-duplicates of `tell` / `omit` / `lie`,
`obfuscation` was `deflect` renamed, and `confabulate` — documented in its own
source as *"fills gaps with invented details (NPC believes them)"* — already
covered sincere invention. **David's ruling: one vocabulary. `ResponseAction` is
it, and the five stages become a view over the eight rather than a rival to
them.**

**What the five-stage proposal actually found**, and it survives: *nothing today
varies where a transferred belief lands.* `propagation/fact-transfer.ts` calls
`listenerTrait.addFact(transfer.topic, 'told', 'believes', …)` — source and
confidence are **hardcoded**, identically, for every transfer regardless of
version. The `version` field is carried and then ignored at the landing site.

So the decision is the **belief-outcome table**: each conversational action
determines the `(version, source, confidence)` triple the listener records.
`FactSource` is already `'witnessed' | 'told' | 'inferred' | 'assumed' |
'hallucinated'`, so this needs no new runtime state.

| `ResponseAction` | version transferred | listener's `FactSource` | confidence |
| --- | --- | --- | --- |
| `tell` | true | `told` | speaker's |
| `confess` | true | `told` | speaker's — plus the state change of having withheld it |
| `omit` | true, minus the load-bearing part | `told` | speaker's |
| `lie` | false | `told` | speaker's |
| `confabulate` | the speaker's own invented version | `told` | speaker's — the speaker sincerely holds it |
| `deflect` | none | — | unchanged |
| `refuse` | none | — | unchanged |
| `ask back` | none | — | unchanged |

**One genuine gap remains, and it is the only word worth adding.** None of the
eight expresses *deliberately implying a falsehood using true statements*.
`lie` asserts a falsehood; `confabulate` is sincere; `deflect` changes the
subject. The missing action lands the false version in the listener with source
**`inferred`** — the listener holds it as their own conclusion, so confronting
them with the speaker's deception does not dislodge it, because the speaker never
said it. That is a ninth `ResponseAction` — `misdirect` — not a parallel scale,
and D11a's normalization window is when to add it.

**`omit` still needs facts to have parts.** Withholding the load-bearing piece of
a fact requires a fact to *have* pieces, so this row of the table depends on the
structure D16's declaration gives a fact. D16 and D17 still need each other.

**`vague` still leaves `PropagationColoring`.** Coloring is documented as tone —
"a hint to the language layer for variant selection" — and its other values
(`dramatic`, `fearful`, `conspiratorial`, `neutral`) are affect. `vague` is
content: it is `deflect` on the wrong axis. This is D11a item 3 — vocabulary the
mapping proves redundant — found by writing the mapping, as predicted.

**What the Chord surface says** is left to implementation alongside D16's syntax,
with one constraint fixed here: it spells the eight (nine) `ResponseAction`
words, not a second set. An author learns one vocabulary for what a character
does with what they know, whether they are answering the player or telling
another character.

**`vague` leaves `PropagationColoring`.** Coloring is documented as tone, "a hint
to the language layer for variant selection," and its other values —
`dramatic`, `fearful`, `conspiratorial`, `neutral` — are affect. `vague` is
content: it is `obfuscation` under another name, on the wrong axis. Coloring
stays purely about how the telling sounds. This is D11a item 3 — vocabulary the
mapping proves redundant — found by writing the mapping, as predicted.

### D18. Mood and states stay two mechanisms with one spelling.

Resolving Open Question 3, which asked whether mood should simply *be* a Chord
state, since both are named interior conditions with transitions.

**They do not merge, and the reason is coordinates.** Every mood word carries
valence and arousal (`MOOD_AXES`, `character-vocabulary.ts:126`), so the platform
can compute with `panicked` — that is how influence effects, propagation coloring
and dialogue selection act on it without the author wiring anything. The platform
can never compute with `softened`, because `softened` means whatever Fernhill
says it means. Merging strands one half: either author states acquire decay that
nothing can reason about, or every author state has to supply coordinates —
numbers, in a language whose premise is words.

**The line is not "platform vocabulary versus yours."**
`vocabulary-extension.ts` already exposes `defineCustomMood(valence, arousal)`,
and D5 says Chord should surface it. So the rule is exact: **coordinates make it
a mood; no coordinates make it a state.** An author who wants a new mood supplies
what makes it a mood.

**One spelling, two subsystems.** D3 already wrote `change mood to panicked`
beside `change it to softened` as a deliberate echo; this promotes that from a
syntax preference to the answer. The author learns one idea — *this character is
now different* — and the compiler routes it. The seam sits where the semantics
differ rather than where the history does.

**The cost, stated plainly.** An author using both will ask why `mood nervous`
is not in the `states:` line, and the honest answer — because the platform can
reason about that one — is a platform fact surfacing in an authoring decision.
That is the price of not merging, and it is smaller than the price of merging.

### D19. One conversation syntax, routed by whether the NPC has an interior.

Resolving Open Question 4, which asked whether the character model's conversation
system should replace ADR-239's topic tables or coexist with them.

**Neither — because this was never two authoring systems competing.**
`CharacterModelDialogue implements DialogueExtension` (ADR-102) and is the only
implementation in the repository; Chord's `define topics for` compiles straight
to the stdlib topic table. One interface, a second implementation nobody routed
to.

**Correction (review, session c28ea0)**: an earlier wording of this decision said
"the seam already exists and Chord is not using it." That is not accurate and the
difference matters. The *interface* exists and the *implementation* exists — but
the **stdlib registration point does not**. ADR-102 is still `Proposed`, and
`stdlib/src/actions/standard/asking/asking.ts:8` refers to "a future conversation
extension." There is nothing to route *to* yet. D19a covers what that costs.

**And the syntax is already close.** Fernhill line 698 writes an authored
response with a state mutation:

```chord
about "the folly", "the fire":
  change it to shaken
  award truth, once
  phrase tobias-folly-reply
```

which is structurally `AuthoredResponse` plus `ResponseStateMutation` from
`conversation/builder.ts`. The author-facing surface barely moves.

**The decision**: one syntax, `define topics for`, routed by the compiler.
An NPC with no character model compiles to the stdlib topic table exactly as
today. An NPC with one compiles to `CharacterModelDialogue`. Adding a personality
line is what upgrades the engine — the author never chooses between two systems
and never learns there were two. Psychological gating (`about the murder when it
trusts the player`) is available on characters that have interiors and is a
compile error on those that do not, in the same diagnostic shape as every other
unknown name. This is D7's opt-in principle applied to conversation.

**The hazard, named, with its acceptance test.** One syntax over two engines
means an author could change conversation behavior by adding a personality line,
silently. That is only tolerable if the character path is a **strict superset**
for everything Chord compiles today: any `define topics` block using no
psychological predicate must produce identical play on both engines. That is a
testable property, and Fernhill's two blocks (lines 693 and 705) are the fixture.
**If the property cannot be made to hold, this decision collapses back to
coexistence** and the author does have to choose — so it is the first thing the
implementation should establish, not the last.

### D19a. Routing is a load-time decision, and ADR-102's socket has to be built first.

Closing the first blocker the review raised against D19: *where does the routing
live, and does `@sharpee/chord` stay browser-safe?*

**What is actually missing.** Three things were assumed present; only two are:

| Piece | State |
| --- | --- |
| `DialogueExtension` interface (ADR-102) | exists — but **inside `@sharpee/character`** (`conversation/dialogue-types.ts`) |
| An implementation | exists — `CharacterModelDialogue`, the only one |
| A stdlib registration point | **does not exist** — ADR-102 is `Proposed`; `asking.ts:8` says "a future conversation extension" |

**Three decisions follow, in order.**

1. **`DialogueExtension` moves to `@sharpee/if-domain`, with `DialogueResult`
   made generic.** It cannot stay in `@sharpee/character`: stdlib would have to
   depend on the character model to know the shape of its own extension point,
   which is the dependency direction CLAUDE.md rule 8 forbids.

   **Why `if-domain` and not `world-model`** (David's ruling, 2026-08-11, after a
   full options comparison). The platform has already answered this question once
   in exactly this shape: `LanguageProvider` is declared in
   `if-domain/src/language-provider.ts`, implemented by `@sharpee/lang-en-us`
   (`EnglishLanguageProvider implements ParserLanguageProvider`), and consumed by
   stdlib (`actions/registry.ts` holds a `LanguageProvider | null` behind a
   `setLanguageProvider()` setter). `DialogueExtension : character` is the same
   relation as `LanguageProvider : lang-en-us`, and putting it anywhere else
   means the platform has two conventions for pluggable providers.

   **The obstacle, and its resolution.** `DialogueResult.responseIntent` is typed
   `ResponseIntent`, which needs `Mood` and `Coherence` from `@sharpee/world-model`
   — and since `world-model` already depends on `if-domain`, moving the type
   naively would close a dependency cycle. The field survives as a **type
   parameter**: `DialogueResult<TIntent = unknown>` in `if-domain`, with
   `@sharpee/character` using `DialogueResult<ResponseIntent>`. Full type safety
   on both sides, no cycle, no casting.

   This is affordable because `responseIntent` has **no production consumers** —
   a repository-wide search finds the declaration and eleven assertions in the
   character package's own test file, nothing else (checked 2026-08-11).
2. **Stdlib grows the registration point ADR-102 specified** — literally the one
   it specifies: `world.registerDialogueExtension(ext)` /
   `world.getDialogueExtension()`, with ASK/TELL/SAY/TALK TO delegating to it and
   the existing behavior as the fallback. Not the `@sharpee/plugins` seam, which
   D21 names for a different job. This is ADR-102 being implemented, not
   extended — and it means **ADR-102 flips from `Proposed` to `Accepted` as part
   of this work**. The flip is owned by whoever lands the registration point, in
   the same commit, and is not deferred to a later sweep.
3. **One extension is registered at load time, and it routes internally.** The
   Chord frontend emits IR that records which NPCs carry a character model;
   `story-loader` registers a single dialogue extension when it wires the story,
   and that extension reads the per-NPC fact and dispatches — character-model
   NPCs to `CharacterModelDialogue`'s path, the rest to the stdlib topic table.
   Not at compile time (the compiler would have to know about runtime
   conversation objects) and not per turn (the answer cannot change mid-story).

   **Corrected by plan review, 2026-08-11**: an earlier wording said the loader
   "selects the implementation ... per NPC," which would have registered two
   extensions. ADR-102's *One Extension Per Story* already rules this — "a story
   registers exactly one dialogue extension; if different NPCs need different
   conversation styles, the extension handles that internally" — and since this
   decision implements ADR-102 rather than amending it, ADR-102's answer governs.
   It is also the smaller design.

**This preserves the browser-safe invariant, and the invariant is stronger than
the header claims.** `@sharpee/chord` is documented as the browser-safe language
frontend (`phrasebooks.ts` header) — and `packages/chord/package.json` carries
**no `@sharpee/*` dependency at all** (checked 2026-08-11). Routing at compile
time would therefore not merely add a dependency; it would give the frontend its
first one, and that one would drag the character runtime into the browser bundle.
Under this split chord never imports `@sharpee/character` — it emits a fact about
the story and the loader acts on it.

Step 1 is likewise cheap where it lands: `packages/stdlib/package.json:26`
already depends on `@sharpee/if-domain`, so stdlib gains no new dependency;
`@sharpee/character` gains one, pointing inward at a contracts package, which is
the direction rule 8 wants.

**Sequencing consequence, stated plainly**: D19 cannot be implemented before
ADR-102 is. That is new work this ADR did not previously acknowledge, and it
lands ahead of the conversation mapping rather than beside it.

### D20. Phrasebook resolution stays flat and source-ordered; a failed entry gate falls through.

Resolving Open Question 7, which asked what happens when three gates stack — a
character-voice phrasebook inside a story-state phrasebook, emitting a phrase
that itself carries `when`.

**The premise was wrong: nothing nests.** `story-loader/src/runtime.ts:359`
states the shipping rule — *"the first book in declaration order whose predicate
holds"* — and both `define phrasebook … while` and `use phrasebook … while`
(ADR-250 D2) feed that one flat list. So a character-state book is simply a book,
`while the Colonel is panicked` is simply a longer predicate, and **no specificity
ladder is introduced.** Adding one would make resolution depend on how clever the
compiler judged a condition to be, which is a worse rule than source order and
harder to explain.

**What actually needed deciding**: a book wins arbitration, but the entry it
holds for that key carries a `when` that fails. **It falls through** — the book
does not cover that key for this emission and arbitration continues to the next
book.

**This is load-bearing for D13, not a detail.** D13's economy is *write the voice
once per state*: a `mustard-cornered` book supplies the four lines that change
when he is panicked, and his other forty fall through to his default book. Under
the alternative — a failed gate stops resolution — every psychological book would
have to restate the whole key set to avoid holes, which is exactly the per-line
bookkeeping D13 exists to abolish.

**The footgun, and its guard.** Declaration order being priority means an
unconditional book declared early silently shadows every conditional book after
it — the failure this question was right to fear, prose arriving from the wrong
voice with nothing to notice it. It is statically detectable: **the analyzer
warns when a book with no `while` is declared ahead of a conditional book
covering any of the same keys.** Compile-time diagnostic, no runtime cost, caught
in the editor rather than in play.

### D20a. A gated-out entry emits nothing and counts as nothing.

Closing the second blocker: D20's fall-through against ADR-250 D5's per-entry
counters.

`story-loader/src/runtime.ts:363` keeps `cycling` / `first-time` / `sticky`
counters **per (book, key)**. D20 says a book whose entry gate fails falls
through to the next book. The unstated case is whether that entry's counter
advanced on the way past.

**It does not. Counters advance only when an entry actually emits.**

**Why this is the only workable answer.** A counter records *how many times this
book has said this line*. An entry that was gated out said nothing, so there is
nothing to count. The alternative fails concretely: a `first-time` line in
`mustard-cornered` would burn on every turn the Colonel is calm, and by the time
he panics — the one moment it exists for — its first time is long spent. The line
would be unreachable in exactly the situation it was written for, and nothing in
play would indicate why.

This is D20's own failure mode one level down: not the wrong voice, but the right
voice with its best line already used up. It is invisible in testing for the same
reason.

**Corollary**: `sticky` binds to the emission, not to the arbitration. A sticky
entry in a state book stays stuck for as long as that book keeps winning *and*
its gate keeps holding; when the state lapses, the next book supplies the key and
the sticky selection is not carried across the boundary.

### D21. Versioning is a non-issue. Half the character state is never saved at all.

Closing the third blocker — and the blocker as the review first stated it was the
wrong problem. David's ruling, 2026-08-11: no versioning work is needed, because
no game holds character state to be compatible with. That is correct, and checking
why it is correct surfaced the real defect.

**Why versioning does not apply.** The change is purely additive: no field that
has ever been written to a save file changes shape. D17's belief-outcome table
retires `SpreadsVersion`, and D5 renames the presets — but both live only in
`@sharpee/character`, which no story has ever used, so neither has been
persisted by anything. A v3 save loads unchanged, with the character sections
simply absent, and absent already means "no character model attached" under D7's
opt-in semantics. There is no migration, no version-reader branch, and nothing to
be backward-compatible with. (For the record, since an earlier draft of this
decision got it backwards: `save-restore-service.ts:77` is `SAVE_FORMAT_VERSION
= '3.0.0'`; the hard break was v1→v2 and the version reader already shipped at
v2→v3 under ADR-293 D7. Neither mechanism is needed here.)

**The real defect: the character subsystem's runtime state has a working
serializer that nothing calls.**

Character state lives in two places, and only one of them is saved:

| State | Home | Saved today? |
| --- | --- | --- |
| personality, mood, dispositions, knowledge, beliefs | `CharacterModelTrait` on the entity | **yes** — rides `world.toJSON()` (`save-restore-service.ts:175`) |
| goal progress, influence effects, already-told records | `CharacterPhaseRegistry` | **no** |

`CharacterPhaseRegistry` implements `toJSON`/`fromJSON` and has five passing
round-trip tests written against it (`tests/tick-phases/save-restore.test.ts`,
whose own header says it "verifies that all mutable state — goal progress,
influence effects, already-told records — survives serialization"). Nothing
invokes it. `@sharpee/engine`'s dependencies do not include `@sharpee/character`
(`packages/engine/package.json`), and a repository-wide search for
`CharacterPhaseRegistry` outside the package returns only generated API docs
(checked 2026-08-11).

**What that means in play.** Save and restore mid-story, and every NPC forgets
which goal step they had reached, which influences were active on them, and who
they had already told. Their traits survive, so they still *look* right —
personality, mood and beliefs are all intact — while the three subsystems D1
calls "the reason to do this at all" silently reset. This is the worst shape a
save bug can take: the visible state is correct and the emergent state is gone.

**The same seam as D19a, one layer over.** The engine cannot reach a registry
owned by a package it does not depend on, and it should not gain that dependency.
The registration goes through the extension seam the engine already has
(`@sharpee/plugins`): the character subsystem registers its phases and its
save/restore participation, and the engine's save path serializes registered
participants without knowing what they are. The tick phases have the identical
problem — `createGoalPhase`, `createInfluencePhase` and `createPropagationPhase`
are equally unwired — so one registration fixes both.

**This is a prerequisite, not a polish item.** It lands before D14's story runs,
because a demonstration story built to show goals, influence and propagation is
precisely the story where this defect is unmissable.

**What this does not decide**: the on-disk shape of a fact's identity (D16) or of
the belief-outcome triple (D17) — both wait on syntax left to implementation.

## Consequences

- **`@sharpee/character` acquires its first consumer.** Fourteen months of
  working, tested, published code becomes reachable by authors.
- **Chord's NPC surface splits in two**, and the split must be taught: movement
  and behavior from `plugin-npc`, interior state from `character`. An author
  writing `a person, wanderer, cowardly` is using both, and should not have to
  know that.
- **The vocabulary becomes a compatibility surface.** Once `very honest` is a
  Chord adjective, ADR-141's trait list is a language feature, and removing a
  word is a breaking change to stories. The list should be reviewed before it is
  frozen, not after. D17 adds at most one word to that surface (`misdirect`),
  having been reduced from five by David's one-vocabulary ruling, and D16 makes
  every author-declared fact name one.
- **Test surface**: the mapping needs round-trip coverage per construct — Chord
  source in, `CharacterModelTrait` out, matching the builder's own output. The
  package's 301 tests cover the model; none cover a compiler that does not exist.
- **Chord acquires runtime behavior it cannot show statically.** Everything in
  Chord today is inspectable before you run it: rooms connect, an object is
  portable, a topic table has rows. A goal queue, an influence resolving against
  a resistance, and a rumour crossing a household are none of them visible in the
  source — they are emergent, and the author's only window on them is play. That
  is a genuine change in what the language is, and the Index and Testing surfaces
  (ADR-294's coverage work, the IDE's Index tab) will feel it first: an author
  will ask *why did the Colonel do that*, and nothing in the current tooling
  answers.
- **Author-side debuggability becomes a feature, not a nicety** — and D12 makes
  it the *only* place the mechanics may appear. Systemic NPC behaviour that
  cannot be traced is indistinguishable from a bug, so "explain this NPC's turn"
  belongs in the same body of work rather than a later ADR. It ships on an
  author channel that a published story cannot carry.
- **The three hard subsystems raise the stakes on the vocabulary freeze.** A
  personality word is a compatibility surface; a goal step verb is an API. `seek`,
  `acquire`, `waitFor`, `moveTo`, `act`, `say`, `give`, `drop` become reserved
  words in a language where `act` and `say` are dangerously close to things
  authors already write.
- **Performance is now a real question.** Passive influences evaluate per NPC per
  turn (ADR-146 Layer 3), propagation walks an audience each tick, goals evaluate
  activation conditions every NPC turn. Fernhill has four people; a household
  drama might have twenty, and the browser client runs single-threaded on a
  player's laptop. Nobody has measured this — the package has never run inside a
  story.

## Session

Session c86356 (2026-08-11). Written after an audit, requested during the wait
on Apple's notarization of Chord Writer 1.0.0, established that
`@sharpee/character` is fully working, fully tested, published, and entirely
unreferenced — and that ADR-141's vocabulary was already shaped like Chord.

Session c28ea0 (2026-08-11) resolved the remaining open questions through
`/devarch:adr-interview`, on the branch `feat/adr-310-character-in-chord`. All
eight questions the ADR carried are now answered and the Open Questions section
is removed (ADR-0009): Q6 by D12 and Q8 by D5 in the original session; Q5, Q1
(D14), Q2 (D15–D17), Q3 (D18), Q4 (D19) and Q7 (D20) in the interview.

Three of the interview's answers came from reading the code rather than from
design argument, and each shrank the work: disposition was already
entity-to-entity (D15), `FactSource` already carried `inferred` so misdirection
needed no new runtime state (D17), and phrasebooks were already a flat
source-ordered list rather than the nesting Q7 assumed (D20).

`/devarch:adr-review` then ran against the completed ADR and returned NEEDS WORK
(8/16). Its three blockers are closed by **D19a** (routing has no socket — ADR-102
was never implemented in stdlib, and the interface sits in the wrong package),
**D20a** (a gated-out entry must not advance its per-book counters), and **D21**
(versioning is a non-issue, but `CharacterPhaseRegistry`'s save/restore is
implemented, tested, and wired to nothing). The review also corrected a
load-bearing overclaim in D19, noted inline there. D21 was itself rewritten after
David rejected its first framing — he was right that no versioning work applies,
and the check that confirmed it is what found the unwired serializer. Re-verified rather than inherited: `pnpm --filter
'@sharpee/character' test` → 19 files, 301 tests, 301 passing (2026-08-11 15:53
CDT).

Review findings still open, all graded SMALL: no acceptance-criteria section, no
Implementation section naming affected modules, unowned amendments to ADR-141 and
ADR-144, and the Context's "one line in the umbrella's dependency list" — which
understates `packages/sharpee/src/index.ts:74–82`, a public re-export of six
symbols including both names D5 renames.
