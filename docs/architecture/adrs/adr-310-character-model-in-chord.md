# ADR-310: The Character Model in Chord — Words the Author Writes, Numbers the Runtime Owns

**Status**: ACCEPTED (2026-08-15, session 00aaa0 — marked accepted by David
after all eight open questions resolved across three sessions: 6 by D12 and
8 by D5 in the original session; 2 by D14, 4 by D15 and 7 by D16 in the
2026-08-14 amendment; 1 by D18, 3 per ADR-318 D3, and 5 affirmatively on
2026-08-15. The post-interview `adr-review` returned two findings: the AC8
channel-isolation parenthetical was fixed in place, and the TypeScript-level
contracts finding (D5 custom-mood syntax, D14 spelling, D15 socket name)
carries the same disposition as ADR-318's — first deliverables of the
implementation plan, not ADR text. Originally written 2026-08-11 (session
c86356) after an audit found `@sharpee/character` shipping with zero
consumers, then expanded on David's ruling that goals, influence and
propagation are the point rather than the deferrable part. Acceptance
authorizes no implementation by itself — the work is planned separately.)
**Date**: 2026-08-11 (session c86356); amended 2026-08-14 (session 4e8fc1);
amended 2026-08-15 (session 00aaa0 — review-driven: Context corrections, D17
persistence, Implementation and Acceptance sections, dated notes on D2, D11a,
D12, D14 and D15)
**Builds on**: ADR-141 (character model), ADR-142 (conversation), ADR-144
(information propagation), ADR-145 (goal pursuit), ADR-146 (influence),
ADR-210 (Chord), ADR-222 (Chord as elegance oracle), ADR-239 (topic tables)
**Prior art review**: `docs/work/adr-310/prior-art.md` — Short's IF Theory Reader
chapter, Ryan & Mateas on *Talk of the Town*, McCoy et al. on Comme il Faut,
Eve on TADS 3 conversation, and Versu via Short's own account. D14–D16 below are
its findings folded in.

---

## Context

`@sharpee/character` was designed and built across four days in April 2026 —
ADRs 141 through 146 — and it works. As of 2026-08-11 it has **301 tests across
19 files, all passing**, a clean `tsc`, and it was version-stamped 5.0.0 and
published to npm with the rest of the platform on 2026-08-10.

**Almost nothing imports it.** A repository-wide search for `@sharpee/character`
finds the package's own source, one line in the `@sharpee/sharpee` umbrella's
dependency list, and one story — `stories/thealderman`, which imports
`ConversationBuilder` (`src/npcs/index.ts:30`) and builds six suspects with it
across 862 lines. It landed 2026-04-09 (`812a753e`, "scaffold TheAlderman story as
character-package reference implementation"), four months before this ADR was
written, and the original draft of this Context missed it.

That story is not a workspace member (`pnpm-workspace.yaml`) and not a build target
(`ts-forge.config.json`), so it is neither compiled nor type-checked — but repo-wide
refactor sweeps still touch it. So: the Chord compiler does not reach the package,
the story loader does not, and no built story does. One unbuilt reference story
does, and the cost of a breaking change is measured against it (D11a).

> **Correction (2026-08-15, adr-review).** Two understatements in the paragraph
> above, both load-bearing for D11a's cost model. First, the *builder* is
> unreached but the *trait* is not: stdlib ships three live consumers of
> `CharacterModelTrait` — `packages/stdlib/src/npc/npc-service.ts` imports it
> and runs lucidity decay inside the NPC turn phase, `lucidity-decay.ts`
> implements that decay, and `character-observer.ts` (ADR-141) processes
> witnessed events through cognitive-profile filters with default state
> transitions. "The character model stopped being on the path" is true of
> `@sharpee/character`; the trait half has been on the path all along. Second,
> the umbrella does more than list the dependency: `packages/sharpee/src/index.ts:78–82`
> re-exports `CharacterBuilder`, `applyCharacter`, `COGNITIVE_PRESETS` and
> `CognitivePresetName`, so the API is published import surface in two packages
> even though nothing consumes it.

Chord *does* have an NPC surface, and it is a different subsystem. Its `npc`
manifest vocabulary is `guard`, `follower`, `wanderer`, `patrol`, `route`,
`loop`, `can-move`, `move-chance`, `allowed-rooms`, `forbidden-rooms`,
`announces-movement`, `wait-turns` — declared in the Chord compiler's own manifest
(`packages/chord/src/stdlib-manifest.ts:119–123`, `src/manifests/npc.ts`) and
executed by `story-loader`; the movement and behavior layer. Not one psychological
term appears in it. Conversation is
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

**Personality words never become parser vocabulary** (added 2026-08-15). A
descriptive adjective on an object (`a brass lantern`) enters the entity's
noun-phrase vocabulary so the player can type it. Personality adjectives must
not: they are consumed by the compiler into trait data and go no further. If
`cowardly` were matchable, `X COWARDLY TOBIAS` succeeding or failing would leak
the model to the player — D12's own violation, one adjective at a time.

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

**The window is real and it is measurable.** No built story uses it, no published
artifact depends on its API shape, and the Chord compiler does not reach it. A
breaking change today costs one package's tests plus `stories/thealderman`, which
is unbuilt and untype-checked (Context) — real work, but bounded and known. The
same change after the first *built* story ships costs every story that named a
preset, a mood, or a goal step.

> **Cost-model correction (2026-08-15).** Per the Context correction, the window
> is measurably wider than "one package's tests plus thealderman": normalization
> that touches trait data shapes or vocabulary values also touches shipping
> stdlib code (`npc-service.ts`, `lucidity-decay.ts`, `character-observer.ts`)
> and the umbrella's re-export line. Still bounded, still all in-repo, still
> affordable — but the pass must sweep stdlib's npc directory and
> `packages/sharpee/src/index.ts` alongside `@sharpee/character` and the
> world-model trait, or the normalization ships half-done.

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

**Shipped code this ruling retires** (added 2026-08-15). stdlib's
`CharacterMessages` (`packages/stdlib/src/npc/character-messages.ts` —
`MOOD_CHANGED`, `LUCIDITY_SHIFT`, `THREAT_CHANGED`, `DISPOSITION_CHANGED`,
`FACT_LEARNED`, …) exists expressly so authors can "opt in per NPC to surface
them to the player." That is exactly what this decision forbids — each is a
platform-generated announcement of a model transition. No `lang-en-us` text was
ever written for them, so nothing renders today and the retirement is free: the
D11a pass reroutes these events to the author channel (where they are the raw
material for "explain this NPC's turn") and removes the player-facing opt-in.
No message ID may keep a player-facing rendering path.

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

### D14. A belief is addressed by holder, subject and facet, and carries a value. One level of belief, no theory of mind.

Resolves Open Question 2, which this ADR called its largest single gap. It turns
out to be a missing field rather than a missing subsystem.

**The gap, stated against the implementation rather than against ADR-144.**
The builder keeps two parallel maps, both keyed by a topic string
(`packages/character/src/character-builder.ts:184–185`):

- `_knowledge` — `{ source: FactSource; confidence: ConfidenceWord; turn: number }`,
  written by `knows()`, where `FactSource` is witnessed / told / inferred / assumed /
  hallucinated and `ConfidenceWord` is uncertain / suspects / believes / certain
  (`packages/world-model/src/traits/character-model/character-vocabulary.ts:255–264`).
- `_beliefs` — `{ strength: ConfidenceWord; resistance: 'none' | 'reinterprets' |
  'ignores' }`, written by `believes()` (line 359), which models how firmly a
  character holds a topic and how they react to contradiction.

**Neither has a value slot**, and that is the gap. A fact is a bare topic string a
character either holds or does not. Two characters can differ in *confidence* or in
*resistance* about a topic. They cannot differ about what is *true*, because there
is nowhere to put the differing value. "The Maid thinks the Colonel did it, the Cook
thinks the Butler did" is not representable, and neither is a belief that changes
its mind, because there is nothing to change. D10's propagation moves a token, not
a claim.

`_beliefs` is the nearer miss of the two — `resistance: 'reinterprets'` presupposes
something to reinterpret *into* — and the value slot is what would make it mean
something.

**The decision.** A belief is `(holder, subject, facet) → value`, carrying the
source and confidence already modelled. *Talk of the Town* (Ryan & Mateas 2017) is
the precedent: a character's mental model of an entity is a list of belief facets
keyed by attribute, each with its own value, so **disagreement between characters
is the ordinary case rather than an unrepresentable one**.

`knows` keeps its current meaning — the character holds a topic, valueless, as in
D3's `knows the murder, witnessed`. Valued belief is a new construct beside it, and
it is spelled **`thinks`**, not `believes`:

```chord
define fact the killer
  the Colonel, the Butler, the Maid, nobody
end fact

create the Cook
  a person, honest, anxious
  thinks the killer is the Butler, suspects, told

create the Maid
  a person, gossipy, nervous
  thinks the killer is the Colonel, certain, witnessed
```

**Why not `believes`.** `believes()` is already taken, with a different meaning —
firmness plus resistance to contradiction, above — and `holds` is already a Chord
predicate for physical possession (`packages/chord/src/parser.ts:134`, alongside
`has` and `wears`). `thinks` is unclaimed on both surfaces. Whether `_beliefs`
should survive D14 at all, or fold into the valued construct as its firmness
fields, is an implementation call for the D11a pass; the two must not both exist
under names an author would confuse.

**And `believes` collides a third time** (added 2026-08-15): it is also a
`ConfidenceWord` *value* — the list is `uncertain | suspects | believes |
certain` (`character-vocabulary.ts:258`). D14's own syntax puts a confidence
word in the sentence, so `thinks the killer is the Butler, believes, told` is
legal under the current vocabulary and unreadable in exactly the way
`cognitive-profile stable with lucidity stable` was (D5). The D11a pass owns the
confidence word list too: rename the value so the word appears in exactly one
role — `convinced` is the working candidate, David to confirm — in the same
normalization that settles `_beliefs`.

Declaring the fact's possible values makes the value set closed and therefore
checkable — a misspelled suspect is a compile error, in the same shape as D2's
unknown-adjective diagnostic. As with D5's custom moods, the exact spelling is left
to implementation; the decision here is the addressing, not the syntax.

**What is deliberately not taken from the precedent.** *Talk of the Town* also
carries per-belief evidence lists, predecessor chains, parent pointers to the
beliefs that spawned each belief, hand-authored belief mutation graphs, and
salience-weighted observation. Those serve a simulation of three to five hundred
people holding a thousand beliefs each. Ours is a household. The addressing is the
minimum that makes propagation meaningful; the apparatus around it is not.

**The scope line: one level of belief.** A character may believe something about
the world. A character does **not** hold a model of what another character
believes. Versu made the same cut deliberately — its characters track no map of
others' knowledge, and information moves only by explicit conversation. `the Maid
believes the Cook believes the Colonel did it` is out of scope, and should be a
diagnostic rather than an unimplemented feature that fails quietly.

**NPC-to-NPC disposition** — Open Question 2's other half — needs no new mechanism.
D3's `feels wary of the player` generalises by allowing any entity where the player
stands, giving `the Maid feels trusts toward the Cook`. Comme il Faut reached the
same shape from the other direction: its social state is subject / relation / object
triples.

**The cost, stated plainly.** This changes `@sharpee/character`, not only Chord: the
knowledge map grows a value, and facts acquire a declaration so their values form a
closed set. That is exactly the kind of change D11a rules affordable *now* and
expensive after the first story ships.

### D15. Topic tables are the interface. The character model is the model. They compose.

Resolves Open Question 4, which asked whether the conversation system should
replace or coexist with ADR-239's topic tables. The question presumed they compete,
and they do not.

Short's *IF Theory Reader* chapter separates two axes that are easy to conflate:
the **interface** (how the player says something — menus, TALK TO, ASK/TELL, topic
words) and the **model** (what is represented internally — topics, facts, quips,
effects, conversational goals). Chord's `define topics for …` is an interface:
topic-word ASK/TELL. `character/src/conversation/dialogue-extension.ts` is a model:
it selects a line from belief and disposition. An author never had to choose.

**The decision: keep the interface, replace the selector.** The author writes
`define topics for …` exactly as today. When the NPC carries a character model,
which response comes back is decided by belief, disposition and mood rather than by
the table's own ordering. An NPC with no character model behaves exactly as today,
per D7.

Short's warning is why this is worth writing down rather than leaving to
implementation: she argues the model should be chosen explicitly instead of
inherited by default from whichever interface was picked first, and most of her
chapter is a record of what the default cost her.

**What does not exist yet, stated as code rather than as paperwork.**
`character/src/conversation/dialogue-extension.ts` already implements a
`DialogueExtension` and its header says it wires into stdlib's ASK/TELL/SAY/TALK TO
actions. It does not: `packages/stdlib/src` contains no reference to
`DialogueExtension`. So the selector D15 describes has a shape but no socket, and
building that socket is the first implementation task this decision implies —
whatever it ends up being called.

**One socket does exist, for the other half** (added 2026-08-15). stdlib's
`NpcService` already exposes `registerTickPhase` (`npc-service.ts:100`), and its
doc comment names `@sharpee/character` as the intended registrant. Nothing
registers today, but this — not a new mechanism — is the intended home for the
per-NPC-turn evaluation loop D8, D9 and D10 need: goal activation, passive
influence, propagation ticks. The missing-socket finding is real for dialogue
selection only; the evaluation loop's socket has been waiting since ADR-070.

**Terminology.** The field calls the unit a **quip** — Short's vocabulary, and
Versu's. Chord calls it a `phrase`. Keep `phrase`; record the synonym during
D11a's normalization pass so the documentation is legible to anyone arriving from
the literature.

### D16. When gates stack, the innermost active context wins outright.

Resolves Open Question 7. TADS 3 shipped this answer and has lived with it for
twenty years: an actor has at most one active `ConvNode`, and while it is active it
overrides every other topic response *regardless of match score* — and suppresses
the actor's agenda entirely.

Mapped onto D13's three stacked gates:

1. **Voice selection is by specificity, and character-scoped beats story-scoped.**
   `while the Colonel is panicked` wins over `while midnight`.
2. **It is total override, not score blending.** The losing phrasebook contributes
   nothing to the selection — no fallback line, no merge.
3. **Within the selected voice, per-line `when` filters** as it does today.

Two phrasebooks active at the same specificity for the same speaker is genuinely
ambiguous and should be a compile-time diagnostic rather than a silent pick. The
failure Q7 named — prose that quietly comes from the wrong voice, invisible in
testing — is worth spending an error on.

**And the lifecycle rule that comes with it**, which D8 left implicit: a
conversation in progress suppresses goal pursuit. TADS suppresses agendas outright
while a conversation node is active, and the reason generalises — an NPC who walks
out mid-sentence to pursue a goal reads as a bug every time, whatever the goal was.
D8's `active when` is still re-evaluated each NPC turn; the goal simply does not act
while the NPC is in conversation with the player.

### D17. Everything the model remembers rides the trait, and the save format knows it.

Added 2026-08-15; the review found this ADR silent on persistence while
describing a feature that is mostly persistent state.

**The inventory of what must survive save/restore**: valued beliefs with source
and confidence (D14), mood and its decay clock (D6), dispositions including
NPC-to-NPC (D3, D14), goal state — *including which step of an active goal's
sequence the NPC is on*, not just which goals are active (D8) — influence
effects in force on a target (D9), and propagation in flight: who has been told
what, with what confidence, and what has not yet reached its audience (D10). A
restore that loses any of these mid-story produces an NPC who visibly forgets,
which under D12 is indistinguishable from a bug in the story.

**The decision**: all of it serializes as `CharacterModelTrait` data, because
traits already ride the world-model save and that path is proven. The rule this
imposes on implementation: **no character-model runtime state may live in
module-level service state or closures** — anything a tick computes that must
survive the session is written back to the trait before the turn ends. The
runtime services (tick phases, the dialogue selector) are stateless between
turns by construction. Propagation's information graph is the one piece that is
not naturally per-entity; it is stored decomposed onto the holders (each NPC's
trait carries what *they* know), which D14's addressing makes sufficient — there
is no separate graph object to persist.

**Format discipline**: the trait's serialized shape carries a version field from
its first release, and later shape changes add a versioned reader rather than a
hard break — the v3→v4 save-format lesson, applied in advance this time.

### D18. The demonstration story is thealderman, ported to Chord.

Resolves Open Question 1. David's ruling, 2026-08-15.

`stories/thealderman` already has the shape the question asked for: six suspects
with beliefs, dispositions, and secrets, built with `ConversationBuilder` as the
character package's reference implementation — story content that exists, not
content to invent. Porting it to Chord is the demonstration: it exercises the
three hard subsystems against characters designed for them, and it answers the
legibility question D12 left standing (Open Question 6's residue) with a real
story a player can sit in front of.

**What the port also settles.** thealderman is the last consumer of the
TypeScript builder as an authoring surface. Once ported, the D11a cost line
"plus `stories/thealderman`" goes to zero — the builder becomes what D15 made
it, the model behind Chord, with no story writing to it directly. The port is
therefore sequenced *with* the implementation, not after it: it is the working
proof each construct lands against as it is built, in the same way Fernhill
grew alongside Chord itself.

**Scope note.** AC2's purpose-built mechanical test story is still separate —
transcript tests need a fixture that stays frozen, and a demonstration story
that is also a regression fixture can never be revised as a story again.
thealderman proves legibility; the fixture proves mechanics.

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
  frozen, not after.
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

## Implementation

Added 2026-08-15. This is the platform-change line the acceptance criteria
discharge against; a criterion whose only home is a package not on this list
means the list is wrong, not the criterion.

**Packages that change**:

- **`packages/chord`** — all new grammar: personality adjectives on `create`
  (D2), `mood` / `feels` / `knows` / `thinks` declarations (D3, D14),
  `define profile` and profile manifests (D4), `define fact` (D14), `goal` and
  `influence` blocks (D8, D9), `resists` (D9), `spreads` (D10), the shared
  predicate language and the entity-scoped extension of `while`/`when` (D13),
  and every diagnostic named in this document. Emits character data in the
  compiled story in whatever form the loader contract below fixes.
- **`packages/world-model`** — `CharacterModelTrait` and
  `character-vocabulary.ts`: the belief value slot and fact declarations (D14),
  the confidence-word rename (D14), vocabulary normalization (D11a), trait
  serialization shape with version field (D17).
- **`packages/character`** — the D11a normalization pass: preset rename (D5),
  builder/Chord naming parity, `selective` and other proven-redundant vocabulary
  dropped, `_beliefs` folded or renamed (D14), tests re-derived from the ADRs
  rather than mechanically renamed. Registers its evaluation loop into stdlib's
  tick-phase socket; provides the dialogue selector D15 names.
- **`packages/stdlib`** — the dialogue-selector socket in ASK/TELL/SAY/TALK TO
  (D15); `character-observer.ts` and `lucidity-decay.ts` swept by the D11a
  normalization; `CharacterMessages` player-facing opt-in retired and rerouted
  to the author channel (D12).
- **`packages/story-loader`** — instantiates compiled character data onto
  entities at load, the same boundary it already owns for the `npc` manifest.
- **`packages/engine`** — carries the trait through save/restore (D17);
  no new turn-cycle mechanism (the NPC phase and tick-phase socket are stdlib's).
- **IDE / testing surface** (`tools/ide`, ADR-294 surfaces) — author-channel
  introspection ("explain this NPC's turn"), consuming the events D12 reroutes.
  Sequenced with the platform work, not after it (Consequences).

**Packages that deliberately do not change**: `packages/parser-en-us` (Chord is
its own language; no player-facing verb is added), `packages/lang-en-us` (D12 —
the model generates no player prose; the seven orphaned `CharacterMessages` IDs
never got text and never will).

**Boundary contracts** (who calls whom): chord compiles declarations →
compiled-story character data → story-loader applies it as
`CharacterModelTrait` on load → stdlib's NPC phase drives
`@sharpee/character`'s registered tick phases each NPC turn → trait mutations
are written back before the turn ends (D17) → the author channel (ADR-163)
carries the introspection events; the player channel carries only
author-written phrases. The exact wire shape of "compiled-story character data"
is the first thing implementation fixes, in the loader's existing manifest
idiom.

## Acceptance

Added 2026-08-15. Each criterion names the packages it discharges against.

1. **Round-trip per construct** — for every construct in D2–D10 and D14: Chord
   source in, `CharacterModelTrait` out, equal to the trait the normalized
   builder produces for the same declaration. (chord, world-model, character)
2. **Behavior end-to-end** — in a purpose-built test story (never Dungeo or a
   shipped story), a transcript test against the bundle: threaten an NPC whose
   panicked phrasebook exists, and the next conversational response comes from
   the panicked voice; no model word appears in any player-visible line. (chord,
   stdlib, story-loader; transcript-tester harness)
3. **Goals live** — a goal's `active when` flips true mid-story, the NPC
   executes its steps across subsequent turns in order, and a conversation with
   the player suspends pursuit until it ends (D16). (character, stdlib)
4. **Influence resolves both ways** — an influence with a `resisted` phrase
   fires it against a resisting target and its `witnessed` phrase otherwise,
   Margaret's `except` included. (character, stdlib)
5. **Propagation moves a claim, not a token** — NPC A `thinks the killer is the
   Butler`; after propagation reaches NPC B per A's `spreads` line, B's
   dialogue selection reflects the belief *value*, with B's own confidence and
   source. (character, world-model, stdlib)
6. **Diagnostics** — each named diagnostic is a compile error, asserted by
   test: unknown personality word (D2), misspelled fact value (D14),
   theory-of-mind attempt (D14), same-specificity phrasebook tie (D16). (chord)
7. **Save/restore** — save mid-story after a belief change, a mood change, and
   with a goal two steps into its sequence; restore; the NPC continues from the
   same belief, mood, and goal step. Asserted on trait state, not on absence of
   errors. (engine, world-model)
8. **D12 isolation** — a published story's output stream provably cannot carry
   the author channel: asserted at the channel layer in a built story, not by
   inspecting prose. (stdlib, engine — the isolation is the channel layer's
   job; a published bundle carries no author channel, so clients receive
   nothing to leak and no client package changes)
9. **Nothing changes uninvited** — the Dungeo walkthrough chain and Fernhill's
   transcript tests are byte-identical before and after the platform work
   lands. (whole-platform regression, existing harness)

## Open Questions

1. ~~**What is the smallest story that proves this?**~~ **Resolved 2026-08-15 by
   D18**: thealderman, ported to Chord. The story the question was asking for
   already existed — six suspects with secrets, built as the character package's
   own reference implementation — and porting it both demonstrates the model and
   retires the last direct consumer of the TypeScript builder. AC2's mechanical
   test fixture stays separate; the demonstration proves legibility, the fixture
   proves mechanics.

2. ~~**Where does disposition toward *other NPCs* live, and how is knowledge
   addressed?**~~ **Resolved 2026-08-14 by D14**: a belief is
   `(holder, subject, facet) → value`, and NPC-to-NPC disposition is D3's `feels`
   with any entity in the player's place. It did not want its own ADR — the
   question was phrased as a missing vocabulary, and the prior-art review found it
   was a missing *field*: the shipped knowledge map has no value slot, so
   characters cannot disagree about what is true, only about how sure they are.
   D14 also draws the scope line the question implied but did not state: one level
   of belief, no theory of mind.

3. ~~**Does `mood` want to be a state?**~~ **Resolved 2026-08-15, David's
   ruling per ADR-318 D3**: no. The two mechanisms differ on every
   load-bearing axis — states are authored, forward-ratcheted, score-able
   plot facts; mood is simulation-driven, freely reversible, decaying, and
   tone-selecting (the conversation ACL already renders it as a message-ID
   tone suffix). The seam ADR-222 smelled is real but lives at the surface,
   not the mechanism: one `change` verb, one predicate grammar, shared by
   both. Where character change *is* a state is the arc — ADR-318 D3's
   state-bound temperaments. Mood is weather; the arc is a state.

4. ~~**Should the conversation system replace or coexist with topic tables?**~~
   **Resolved 2026-08-14 by D15**: neither — they are different layers. `define
   topics for …` is the interface; the character model is the model that selects
   the response. The author never chooses between them, so the question an author
   was going to ask does not arise.

5. ~~**Is any of this wanted?**~~ **Resolved 2026-08-15, David's ruling:
   yes — wanted.** The counter-argument the question recorded ("nobody
   missed it because nobody could reach it; an authoring language is how a
   capability becomes wantable") got its test the day the surface was
   offered: the frontier-experiment series ran, and ADR-318 — the normative
   layer, which depends on this ADR's machinery at nearly every joint
   (D14's values make lying detectable, D8 carries obligations and
   confessions, D9/D10 carry honor's grammar and reputation, D13/D15/D16
   carry every outlet) — was accepted the same day. Demand is no longer
   inferred; it is recorded in an accepted dependent ADR.

6. ~~**Does the player ever see the model, or only its shadow?**~~ **Resolved
   2026-08-11 by D12**: only the shadow. The player never sees or senses the
   mechanics, only the behavior. What the question was really asking survives as
   a design burden rather than an open decision — a model that reaches the player
   only through visible action has to be *legible as action*, and that is the
   author's prose problem before it is the platform's. Carried into Open Question
   1: the demonstration story is the test of whether it can be done.

7. ~~**What is the resolution order when three gates stack?**~~ **Resolved
   2026-08-14 by D16**: innermost active context wins by total override —
   character-scoped voice over story-scoped voice, then per-line `when` inside the
   winner. Taken from TADS 3, which chose total override over score-blending after
   shipping both. The failure mode the question named is answered by making a
   same-specificity tie a compile-time diagnostic rather than a silent pick.
   ADR-250's phrasebook resolution seam still owns the implementation.

8. ~~**Should the platform ship clinically-named presets at all?**~~ **Resolved
   2026-08-11 by D5**: renamed to describe behavior, not diagnosis. The dimension
   values are unchanged; only the eight names move. The *when* question closed
   with it — D11a rules the subsystem greenfield, so the rename lands inside the
   normalization pass.

## Session

Session c86356 (2026-08-11). Written after an audit, requested during the wait
on Apple's notarization of Chord Writer 1.0.0, established that
`@sharpee/character` is fully working, fully tested, published, and entirely
unreferenced — and that ADR-141's vocabulary was already shaped like Chord.

Amended session 4e8fc1 (2026-08-14), adding D14–D16 and resolving Open Questions
2, 4 and 7. The amendment came out of a prior-art review
(`docs/work/adr-310/prior-art.md`) of the systems this ADR had named but not
cited. Three of the six live open questions turned out to have answers already in
the literature: one was a missing field rather than a missing subsystem, one was a
category error, and one had a twenty-year-old shipped answer in TADS 3. D12 was
left open to the interview despite the review finding a direct counter-argument to
it in Short's *IF Theory Reader* chapter, because D12 is a ruling rather than a
lookup. Open Questions 1, 3 and 5 remain.

Amended session 00aaa0 (2026-08-15), after an `adr-review` pass that verified
every code citation and found five gaps between the design and an implementable
contract. Added: the Context correction (stdlib's trait consumers and the
umbrella re-export — the "greenfield" claim was half right), the D2
no-parser-vocabulary rule, the D11a cost-model correction, the D12 ruling
retiring `CharacterMessages`' player-facing opt-in, the D14 `believes`
confidence-word collision, the D15 tick-phase-socket note, D17 (persistence),
and the Implementation and Acceptance sections the review found absent. Open
Questions 1, 3 and 5 are untouched and remain.
