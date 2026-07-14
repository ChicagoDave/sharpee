# The Chord Language — Author Reference

A writer-facing reference for Chord, Sharpee's story language (`.story`
files), covering every construct in plain language with a working,
compile-checked example. Companion to the formal grammar
(`chord-grammar.md`, `chord.ebnf`); where they disagree, the grammar and the
parser win. Chord v1 (locked 2026-07-14) ships with Sharpee 3.0.

> **Status: SKELETON** — sections are being filled in by the
> `docs/work/chord-language-reference/` plan; every example is backed by a
> fixture verified with `verify-examples.mjs` against `@sharpee/chord`.

## 1. Reading a .story file

### 1.1 What a story file is

A `.story` file is an optional story header followed by a flat list of
declarations. There are only two kinds of top-level things: `create`
blocks, which put entities into the world, and `define` blocks, which add
vocabulary the rest of the story can use (conditions, phrases, verbs,
text hatches, traits, actions, sequences). Everything else in the
language lives inside one of those blocks, attached to the thing it
belongs to. There is no top-level "rules" section: behavior is owned by
entities and traits, not floated beside them.

The smallest complete story is a room and a player:

<!-- fixture: smoke.story -->
```story
story "Harness Smoke Test" by "Sharpee Docs"
  id: chord-ref-smoke
  version: 0.0.1

create the Reference Desk
  a room

  A quiet corner of the documentation stacks.

create the player
  starts in the Reference Desk
```

### 1.2 Lines, blocks, and indentation

Chord is line-oriented: every rule is one source line, and structure
comes from indentation. Indentation is spaces only; a tab is a
`lex.tab-indent` error. A block opens with its header line and closes
either at dedent or with an explicit `end` line, depending on the block:

| Block | Opens with | Closes with |
|---|---|---|
| story header fields | `story` line | dedent |
| `create` block | `create` line | dedent |
| `define phrases <locale>` | header line | dedent |
| `define trait` | header line | `end trait` |
| `define action` | header line | dedent |
| `define sequence` | header line | `end sequence` |
| `define phrase` | header line | `end phrase` |
| `on` / `after` clause | header line | `end on` / `end after` |
| `select` | `select …` line | `end select` |
| `each` block | `each <name>` line | `end each` |
| prose block | first bare line | dedent or blank line |

The `end` line must match its opener: an `on` clause closes with
`end on`, never `end after`.

Four kinds of token make up a line. Words are letters followed by
letters, digits, apostrophes, hyphens, or underscores (`cant-leave` and
`you'd` are each one word). Numbers are plain digits with optional dotted
parts (`3`, `1.0.0`). Strings are double-quoted with no escape sequences.
Markers are `{name}` forms that appear only inside prose (see §2.6).

## 2. Building your world

### 2.1 The story header

The header names the story and carries its identity fields. `story` and
the quoted title are required if a header is present at all; `by` is
optional; the indented lines below are free `key: value` fields, of
which `id`, `version`, and `blurb` are the conventional set. The header
may also own story-wide states and scores, using the same two line forms
every other owner uses (§2.7, §2.8):

<!-- fixture: world/story-header.story -->
```story
story "The Walled Garden" by "Sharpee Docs"
  id: walled-garden
  version: 1.0.0
  blurb: A pocket world for the Chord language reference.
  states: daylight, dusk
  score explorer worth 5
```

The story starts in the first declared state (`daylight` here), and any
behavior body can move it forward with `change the story to dusk`.

### 2.2 Creating things

`create` puts one entity into the world. The name after `create` is the
entity's display name; its internal ID is derived mechanically (words
lowercased and joined with hyphens, the leading article stripped, so
`the Potting Shed` becomes `potting-shed`). You never write IDs; you
always refer to things by name.

<!-- fixture: world/create-basics.story -->
```story
create the watering can
  aka can, tin can, sprinkler
  in the Potting Shed

  A dented tin watering can with a long spout.
```

`aka` adds aliases. When a name is referenced anywhere else in the
story, resolution tries the exact name first, then an exact alias, then
a unique in-order word subset (`the can` finds `the watering can` if
nothing else matches). Ambiguity or a miss is a load error with a
suggestion; Chord never guesses.

### 2.3 Kinds, traits, and settings

The lines between the `create` header and the first blank line compose
the entity. Each comma-separated term is either a kind noun or a trait,
distinguished by the article: `a room` and `a supporter` are kind nouns
(bundles of traits), while bare words like `scenery`, `wearable`,
`switchable`, and `light-source` are individual traits.

<!-- fixture: world/composition.story -->
```story
create the workbench
  a supporter with capacity 3
  scenery
  in the Root Cellar

  A scarred oak workbench.
```

`with` attaches settings. The last token of each setting is its value
and the words before it are the key (`capacity 3`); several settings
join with `and`. When a value is an entity name, the article marks where
the name starts (`lockable with key the staff keycard`).

A trait can be conditional: `while` puts it under the control of a
condition, live at play time.

<!-- fixture: world/composition.story -->
```story
create the Root Cellar
  a room, dark while the oil lantern is not lit
  aka cellar

  Earthen walls swallow what little light there is.
```

The blank line matters: composition lines come before the first blank
line in the block, and prose comes after it (§2.6). That rule is what
keeps a description that happens to start with a trait-like word from
being read as composition.

### 2.4 Placing and wearing

Three placement forms position an entity when the story starts: `in`
puts it inside a room or container, `on` puts it on a supporter, and
`starts in` is how actors (usually the player) name their starting
room. `wears` puts a wearable onto an actor already dressed in it.

<!-- fixture: world/placement.story -->
```story
create the seed packet
  on the potting table

  A paper packet of runner-bean seeds.

create the player
  starts in the Greenhouse
  wears the straw hat

  Mud on your boots, dirt under your nails.
```

Note the disambiguation: `on` followed by an article is placement
(`on the potting table`); `on` followed by a bare word opens a behavior
clause (`on watching it`, §3).

### 2.5 Exits and blocked exits

Rooms connect with direction lines. Ten directions exist: the eight
compass points plus `up` and `down`. A connection is one-way as written;
write the return exit in the other room.

<!-- fixture: world/exits.story -->
```story
create the Rose Walk
  a room
  north to the Herb Garden
  east to the Orchard
  south is blocked: hedge-too-thick

  Gravel crunches underfoot between the rose beds.
```

A blocked exit refuses travel and speaks the named phrase (the key after
the colon must be a phrase the story defines, §5.3). The block can be
conditional:

<!-- fixture: world/exits.story -->
```story
create the Orchard
  a room
  west to the Rose Walk
  up is blocked while the ladder is not here: no-way-up

  Apple trees stand in crooked rows.
```

### 2.6 Prose, paragraphs, and markers

Prose is any bare paragraph: no keyword, just sentences. In a `create`
block the first bare paragraph after the blank line is the entity's
description, and consecutive bare paragraphs append to it as separate
paragraphs.

<!-- fixture: world/prose-markers.story -->
```story
create the Reading Nook
  a room

  A stone bench curves around a sundial{weather}. Ivy softens
  every wall.

  Someone has left a folded blanket at one end of the bench.
```

Within a paragraph, line breaks are yours to place: lines join with
single spaces when the text is rendered, so you can wrap prose at any
width. A blank line is a real paragraph break.

A marker like `{weather}` splices generated text into prose at that
spot. Every bare lowercase marker must name something the story
declares: a phrase (§5.2) or a text hatch (§5.5). Here `weather` is a
cycling phrase, so the sundial reads differently on different visits:

<!-- fixture: world/prose-markers.story -->
```story
define phrase weather, cycling
  whose shadow lies crisp in the afternoon sun
or
  whose face dims as a cloud slides past
end phrase
```

One marker is built in: `{br}` forces a hard line break with no
paragraph gap, for text whose line structure is the point. The name
`br` is reserved; you cannot declare a phrase or hatch with it.

<!-- fixture: world/prose-markers.story -->
```story
create the sundial plaque
  aka plaque
  scenery
  in the Reading Nook

  The engraving is worn but legible:{br}
  I COUNT ONLY SUNNY HOURS{br}
  EST. 1898
```

A lone `"` is ordinary prose punctuation, so dialogue can open in one
paragraph and close in another without upsetting the lexer.

### 2.7 States

An entity (or trait, or the story itself) can declare named states with
a `states:` line. The owner starts in the first state listed. States are
the language's replacement for flags and ad-hoc booleans: they are
declared, ordered, and visible to conditions (`when it is still`),
`select on` dispatch (§4.1), and `change` (§3.7).

<!-- fixture: world/states-scores.story -->
```story
create the fountain
  scenery
  in the Orangery
  states, reversible: flowing, still

  A marble fountain in the middle of the floor.

  on touching it
    change it to still when it is flowing
    phrase fountain-stopped when it is still
  end on
```

State order is a promise. Without `, reversible`, a `change` back to an
earlier state is a load error (`analysis.irreversible-state`): a marrow
declared `states: entire, sliced` can never be un-sliced, and the
compiler holds you to it. Add `, reversible` only when the story really
does move both ways, as the fountain does.

### 2.8 Scores live on owners

A `score <name> worth N` line declares a scoring identity on the owner
it appears under: the story header, a `create` block, a trait, or an
action. `award <name>` grants it from any behavior body.

<!-- fixture: world/states-scores.story -->
```story
create the prize marrow
  aka marrow
  in the Orangery
  states: entire, sliced
  score sliced-the-marrow worth 10

  A rosette-winning marrow of absurd size.

  on cutting it
    change it to sliced
    award sliced-the-marrow
    phrase marrow-sliced
  end on
```

Score identities are owner-scoped: two entities can each declare `score
fed worth 10` and they are different scores. Awards dedupe by identity,
so awarding the same score twice grants it once; there is no need to
guard `award` behind a first-time check. The full scoring model,
including trait- and action-owned scores, is in §4.5.

### 2.9 The first-visit description

A room can carry a `first time` block: prose shown in place of the
standing description the first time the player sees the room, after
which the ordinary description takes over.

<!-- fixture: world/first-time.story -->
```story
create the Maze Heart
  a room

  first time
    You did not expect the hedge maze to open out like this: a perfect
    circle of turf, silent, with a single stone chair at its center.

  A circle of turf enclosed by high hedge walls. A stone chair faces
  the way in.
```

This form is rooms-only and first-time-only: `second time` and the
other ordinals are load errors here. (Inside behavior bodies, the full
ordinal family is available; that different construct is §4.3.)

### 2.10 Per-entity phrase overrides

When a trait or the platform speaks for an entity, the entity can talk
back in its own voice. A `phrase <key>:` line in a `create` block
overrides the text registered under that key, for this entity only. The
override can carry a strategy and `or` variants, exactly like a
`define phrase` (§5.2):

<!-- fixture: world/phrase-override.story -->
```story
create the garden robin
  aka robin
  scenery
  in the Aviary Corner
  states, reversible: perched, hopping

  A round little robin with one white tail feather.

  on watching it
    change it to hopping when it is perched
    phrase robin-watched
  end on

  phrase robin-watched, cycling:
    The robin cocks its head at you, entirely unimpressed.
  or
    The robin hops once, then pretends you are not there.

  phrase detail while it is hopping:
    It hops from perch to perch as you watch.
```

The story-wide `robin-watched` text (defined in `define phrases`) is
the default; the robin's own cycling variants win whenever the robin is
the one being watched. Under the hood the override registers a derived
key scoped to the entity (`garden-robin.robin-watched`), which is also
how descriptions get their keys (`garden-robin.description`).

The `detail` key is special: it appends a live detail sentence to the
entity's description and requires a `while` condition. On ordinary
overrides, `while` is not allowed (`analysis.override-gate`); use a
strategy or variants instead.

## 3. Giving things behavior

### 3.1 on and after

Behavior attaches to its owner as an `on` or `after` clause inside the
owner's `create` block (or inside a trait, §5.7). The two words divide
one moment: `on` runs before the action commits and may stop it; `after`
runs once it has happened and reacts.

<!-- fixture: behavior/on-after.story -->
```story
create the hive box
  aka hive, box
  scenery, openable
  in the Apiary
  states: humming, quiet

  A white wooden hive box, lid held down by a brick.

  on opening it
    refuse when it is humming: bees-disturbed
    change it to quiet
  end on

  after opening it
    phrase honey-smell
  end after
```

The division is enforced: `refuse`, `refuse when`, and `must` are parse
errors inside an `after` body (`parse.react-refusal`). If a reaction
wants to stop something, it is not a reaction; move it to `on`. Every
clause closes with an `end` line matching its opener.

### 3.2 What a clause can bind

Three forms follow `on` or `after`. The common one binds a verb to the
owner: `on opening it`, where `it` means this entity for the rest of the
clause. The verb is a single word in its -ing form, and it must be a
verb the story's actions or the platform's standard actions understand.

The second form listens to a verb aimed at anything, and names the role
the clause cares about. Roles belong to the action: `taking` has a
`taker` and an `item`, so a scarecrow can watch every theft in the
garden. The third form, `every turn`, ticks with the clock rather than
reacting to an action; it is `on` only, since a turn is not something
you react to after the fact.

<!-- fixture: behavior/clause-forms.story -->
```story
create the scarecrow
  scenery
  in the Kitchen Garden

  A scarecrow in a donated raincoat.

  on taking anything as the taker
    phrase scarecrow-stare
  end on

  on every turn while dusk, once
    phrase scarecrow-shadow
  end on
```

An entity-owned `every turn` clause fires only while the player is
present with its owner; the scarecrow performs to an audience or not at
all. Note `while dusk`: a story-level state (§2.1) is referenced as a
bare word in conditions.

### 3.3 while, once, before, after

Every clause form takes an optional `while <condition>` gate, checked
each time the clause would fire. After the gate, comma modifiers may
follow. `, once` limits the clause to a single firing for the whole
story, as the scarecrow's shadow moment above shows.

`, before <trait>` and `, after <trait>` order clauses when several
traits answer the same verb on one entity:

<!-- fixture: behavior/ordering.story -->
```story
define trait creaky
  phrases en-US
    hinge-creak:
      The hinges creak horribly.

  on opening it, before alarmed
    phrase hinge-creak
  end on
end trait
```

A cabinet composed `openable, alarmed, creaky` creaks first, then rings
its alarm bell, regardless of the order the traits were listed in.

### 3.4 Conditions

Conditions appear after `while`, after `when`, in `refuse when`, and in
blocked exits. The combinators are `and`, `or`, and `not`, in the usual
precedence (`not` binds tightest, `or` loosest) with parentheses to
override; `one chance in N` rolls dice.

<!-- fixture: behavior/conditions.story -->
```story
  on petting it
    phrase cat-tolerates when it is dozing
    phrase cat-glare when it is alert and not one chance in 4
    phrase cat-purr when (it is alert and one chance in 4) or it wears the ribbon
    change it to alert when it is dozing
  end on
```

The predicates test what an author would point at:

<!-- fixture: behavior/conditions.story -->
```story
  on examining it
    phrase barrow-contents when it holds the apple
    phrase barrow-visible when the player can see it
    phrase barrow-in-gate when it is in the Orchard Gate
    phrase barrow-is-thing when it is a container
  end on
```

In full: `is a`/`is an` tests kind or trait, `is in` tests location,
`is here` tests whether an entity shares the player's location, plain
`is` compares against a state, a state adjective, or a value, `has`,
`holds`, and `wears` test possession, and `can see` / `can reach` test
scope. Every predicate takes `not` after `is`, or `not` in front.
Subjects and values are written the way you name anything: `it`, `the
player`, an entity name, `its <field>`, or a possessive like `the
player's location`. A multi-word name simply runs until the next
structural word (`is`, `has`, `holds`, `wears`, `can`, `and`, `or`,
`then`, `to`, `while`, `with`), so name your entities around those.

State words resolve against their subject: `when it is dozing` works
because the cat declares `dozing`. The closed catalog of platform state
adjectives (`open`, `closed`, `locked`, `unlocked`, `on`, `off`,
`worn`, `lit`) reads trait state the same way. An unknown word is a
load error with a nearest-valid suggestion, not a silent false.

A named condition (§5.1) whose `it` is left free is an *open*
condition: a test any entity might pass. `any` and `no` quantify over
one:

<!-- fixture: behavior/quantifiers.story -->
```story
define condition gathered-tomato: it is a tomato and it is in the harvest basket
define condition vine-tomato: it is a tomato and it is not in the harvest basket
```

<!-- fixture: behavior/quantifiers.story -->
```story
  on examining it
    phrase basket-empty when no gathered-tomato
    phrase basket-laden when any gathered-tomato
  end on
```

Quantifiers demand an open condition; `any` over a closed one (no free
`it`, like `the story is dusk`) is `analysis.closed-condition-selection`.
Inside an open condition, keep to predicates the analyzer can check for
an arbitrary subject: kind, placement, and possession tests. A state
test on `it` (`it is ripe`) is rejected as an unknown value, because no
one subject owns the state word there.

### 3.5 Requirements: must

A `must` line states what has to be true for the action to proceed, and
names the phrase spoken when it is not. The subject opens the line in
lowercase (`the`, `it`, or `its`), which is how a requirement stays
distinct from prose. One fixture exercises every form:

<!-- fixture: behavior/must-refuse.story -->
```story
  on stocking it
    it must be a tool: not-a-tool
    it must be any loose-tool: already-racked
    the player must be in the Potting Bench: too-far-away
    the player must hold the secateurs: hands-empty
    the player must see the tool rack: too-dark
    the player must reach the tool rack: out-of-reach
    phrase racked
  end on
```

`must be a/an` tests kind, `must be in` tests place, `must be any`
tests membership in an open condition (§3.4), plain `must be` compares
a state or value, `must have`/`hold`/`wear` test possession, and `must
see`/`reach` test scope. Requirements are legal in `on` bodies and as
`define action` lines (§5.8), never in `after` bodies.

There is deliberately no `must not`. Requirements are positive;
prohibitions are refusals, and the two forms sit naturally side by
side:

<!-- fixture: behavior/must-refuse.story -->
```story
  on sharpening it
    it must be dull: already-sharp
    refuse when the player wears the gardening mittens: mittens-on
    change it to sharp
    phrase sharpened
  end on
```

Writing `must not …` (or `must be no …`) is a parse error
(`parse.must-negative`) whose fix-it points at `refuse when`.

### 3.6 Refusals: refuse

`refuse` stops the action and speaks a phrase. The conditional form
`refuse when <condition>: <key>` refuses only when its condition holds,
as the mittens line above shows. The bare form refuses always, for
things that are simply never allowed:

<!-- fixture: behavior/must-refuse.story -->
```story
  on taking it
    refuse all-thorns
  end on
```

Refusing on a negated condition (`refuse when not …`) is flagged
(`analysis.negated-requirement`): that is a requirement in disguise, and
`must` says it better.

### 3.7 The statements

Nine statements do the story's work. The pumpkin below uses most of
them:

<!-- fixture: behavior/statements.story -->
```story
  on measuring it
    set its tally to 3
    phrase tape-reading with girth = its tally
    emit pumpkin-measured
  end on

  on picking it
    change it to picked
    award picked-the-champion, once
    move it to the Compost Corner when it is picked
    phrase picked-note
    win harvest-glory when its tally is 3
  end on
```

- **`phrase <key>`** speaks the named text (§5.2, §5.3). Dotted keys
  (`zoo.pa.closing-3`) are legal. `with <name> = <value>` passes a
  value the phrase can format.

  A phrase used in only one place does not need a separate definition:
  indent prose directly under the `phrase` line and the text is declared
  and spoken in one gesture. (A deeper line is read as a statement, not
  prose, only when it opens with a lowercase statement keyword; prose
  sentences start capitalized, so the two do not collide.)

  <!-- fixture: behavior/on-after.story -->
  ```story
  after entering it
    phrase apiary-hum
      The hum reaches you before the gate has even closed.
  end after
  ```
- **`emit <word>`** raises a story event other clauses and the platform
  can observe.
- **`set <thing> to <value>`** writes a trait data field (§5.7), like
  the pumpkin's `tally`.
- **`change <name> to <state>`** moves an owner along its declared
  states (§2.7); `change the story to <state>` moves the story.
- **`move <name> to <name>`** relocates an entity.
- **`remove <name>`** takes an entity out of play, permanently: there
  is no `to`, nothing to get back, and removing the player is a load
  error (`analysis.remove-player`).
- **`award <name>`** grants an owner-scoped score (§2.8, §4.5); the
  explicit `, once` is available but dedupe already makes awards
  idempotent.
- **`win [<phrase>]`** and **`lose [<phrase>]`** end the story (§4.6),
  optionally speaking a named phrase on the way out.

<!-- fixture: behavior/statements.story -->
```story
  on emptying it
    remove the champion slug
    phrase trap-emptied
    lose when the champion pumpkin is picked
  end on
```

### 3.8 The when suffix

Any of `phrase`, `emit`, `change`, `move`, `remove`, `award`, `win`,
and `lose` can carry a trailing `when <condition>`, making that one
statement conditional without any block structure; several examples
above use it. `set` and bare `refuse` do not take the suffix. Do not
confuse it with the `when <value>` arm header inside `select on`
(§4.1): same word, different position, different job.

## 4. Branching, iteration, and progression

### 4.1 select on a value
*[Placeholder: arm-per-state dispatch.]*

### 4.2 select with a strategy
*[Placeholder: randomly / cycling / stopping / sticky / first-time with
`or`-separated bodies.]*

### 4.3 Ordinal blocks
*[Placeholder: `first time` … `tenth time` in statement position.]*

### 4.4 each blocks
*[Placeholder: iterating an open condition; `the match`; nesting.]*

### 4.5 Scoring
*[Placeholder: owner-scoped identities across story/entity/trait/action;
award dedupe.]*

### 4.6 Endings: win and lose
*[Placeholder: ending statements and variants.]*

### 4.7 Sequences
*[Placeholder: `define sequence` and the three step anchors.]*

## 5. Defining vocabulary and text

### 5.1 define condition
*[Placeholder: naming a condition; open vs closed.]*

### 5.2 define phrase
*[Placeholder: strategies, `or` variants, the `while` gate, `verbatim`.]*

### 5.3 define phrases (locale blocks)
*[Placeholder: `define phrases en-US` and `key:` entries.]*

### 5.4 define verb
*[Placeholder: verb aliases and `means` patterns with `(something)` slots.]*

### 5.5 define text (text hatches)
*[Placeholder: `define text <name> from "./extras.ts"`.]*

### 5.6 define action/behavior hatches
*[Placeholder: the other hatch kinds; what the TS side looks like.]*

### 5.7 define trait
*[Placeholder: data fields, states, score, phrases, on-clauses.]*

### 5.8 define action
*[Placeholder: grammar patterns, scope constraints, requirements, refusals,
body.]*

## 6. Tooling

### 6.1 sharpee compose
*[Placeholder: compile, check, emit IR; exit codes.]*

### 6.2 Reading diagnostics
*[Placeholder: diagnostic anatomy; the load-time gates; common analyzer
gates.]*

### 6.3 Migrating from removed constructs
*[Placeholder: before/after for every removed form and its fix-it.]*

## Appendix: the formal grammar

*[Placeholder: pointer to `chord-grammar.md` / `chord.ebnf` and the layout
table.]*
