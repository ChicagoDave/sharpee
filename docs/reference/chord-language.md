# The Chord Language — Author Reference

A writer-facing reference for Chord, Sharpee's story language (`.story`
files), covering every construct in plain language with a working,
compile-checked example. Companion to the formal grammar
(`chord-grammar.md`, `chord.ebnf`); where they disagree, the grammar and the
parser win. Chord v1 (locked 2026-07-14) ships with Sharpee 3.0.

> **Status: DRAFT** — §1–§6 are written; every example is backed by a
> fixture verified with `verify-examples.mjs` against `@sharpee/chord`. A
> full verification sweep and site render remain (`docs/work/chord-language-reference/`
> plan, Phases 6–7).

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

Two trait adjectives carry a contract along with their data: `cuttable`
and `diggable`. Each takes an optional tool setting (`cuttable with tool
the rusty knife`) naming the implement the player must be holding; with
no tool named, any attempt reaches the entity. What the cut or dig
actually *does* is never platform policy: a cuttable entity must carry
exactly one implementation — an `on cutting it` clause (§3), its own or
from a composed trait — and the story fails to load with none, or with
two. The same rule binds `diggable` to `on digging it`.

<!-- fixture: world/cuttable.story -->
```story
create the straw bale
  aka bale, twine
  cuttable with tool the rusty knife
  in the Potting Shed
  states: bound, loose

  A bale of straw, bound tight with orange twine.

  on cutting it
    change it to loose
    phrase twine-cut
  end on
```

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
room. Two more lines dress and equip an actor: `wears` puts a wearable
onto an actor already dressed in it, and `carries` puts an item into an
actor's hands — starting inventory, carried but not worn.

<!-- fixture: world/placement.story -->
```story
create the seed packet
  on the potting table

  A paper packet of runner-bean seeds.

create the player
  starts in the Greenhouse
  wears the straw hat
  carries the trowel

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

### 2.11 Starting state

A stateful trait opens for business in its default state: a lockable
thing starts unlocked, a switchable thing starts off, and — today — an
openable container starts open. When the story needs otherwise, a safe
that stays locked until the player finds the key, a space heater
already running, `starts <state>` on the composition line sets the
trait's initial value.

<!-- fixture: world/starts-state.story -->
```story
create the safe
  a container, openable, lockable with key the brass key, starts locked
  in the Back Office

  A squat floor safe with a brass keyhole.
```

Six state words are accepted, each paired with the trait it
initializes: `locked` and `unlocked` set `lockable`, `closed` and
`open` set `openable`, `off` and `on` set `switchable`. The pairing is
enforced: `starts locked` on an entity that does not compose
`lockable` is a load error (`analysis.starts-state-pairing`), never a
silent no-op. Any other word after `starts` is a parse error
(`parse.starts-state`) — except `in`, which is the placement line from
§2.4. `starts in` names where something begins; `starts <state>` names
how.

<!-- fixture: world/starts-state.story -->
```story
create the space heater
  switchable, starts on
  in the Back Office
  aka heater

  An old space heater, ticking as it warms.
```

Note what `starts` does not do: the state word is an initializer, not
stored story state. `locked`, `open`, and `on` remain derivable facts
read live from the trait (the state adjectives of §3.4), and a `states:`
line reproducing one of those pairs is still the shadow-state error
(§6.2's boolean-state gate). `starts` merely chooses the trait's first
value; from there the
world moves it the usual ways — keys, hands, and switches.

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

Ten statements do the story's work. The pumpkin below uses most of
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
- **`kill the player [<phrase-key>]`** runs the platform's death
  machinery — not the same thing as `lose`; §4.7 owns the difference.

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
`lose`, and `kill the player` can carry a trailing `when <condition>`,
making that one
statement conditional without any block structure; several examples
above use it. `set` and bare `refuse` do not take the suffix. Do not
confuse it with the `when <value>` arm header inside `select on`
(§4.1): same word, different position, different job.

## 4. Branching, iteration, and progression

The statements in §3 each do one thing. This chapter is about shaping
what happens over time: choosing between several bodies, doing something
once per matching entity, keeping score, ending the story — in victory,
defeat, or death — and running a scripted timeline. All of it is still
made of the statements you already have; these are the blocks that route
between them.

### 4.1 select on a value

`select on <value>` dispatches to the arm whose `when` matches the
value, and runs nothing if none do. The classic use is a state machine:
one arm per declared state, each speaking for that state.

<!-- fixture: flow/select-on.story -->
```story
  on examining it
    select on its state
      when dormant
        phrase bulb-dormant
      when sprouting
        phrase bulb-sprouting
      when blooming
        phrase bulb-blooming
    end select
  end on
```

The value after `on` is any value expression (§3.4): here `its state`,
the amaryllis bulb's current state out of `dormant, sprouting,
blooming`. Each `when <word>` heads an arm whose body is ordinary
statements. The block closes with `end select`, and each `or`-free arm
simply dedents. Coverage is not enforced — an unmatched value falls
through silently, which is what you want for "react only to these
states."

Do not confuse this arm-header `when <word>` with the statement-final
`when <condition>` suffix (§3.8). Same word, different job: the suffix
gates one statement on a condition, while the arm header names a value
to match. `select on` compares values; it does not evaluate conditions.

### 4.2 select with a strategy

`select <strategy>` ignores the world and picks an arm by a rule about
*how often the block has fired*. The arms are separated by `or`, exactly
like the variants of a `define phrase` (§5.2), because it is the same
machinery: the five strategies are the phrase-algebra Choice selectors
under author-facing names.

<!-- fixture: flow/select-strategy.story -->
```story
  on ringing it
    select cycling
      phrase chime-bright
        The chime rings a bright, clean note.
    or
      phrase chime-lower
        It answers itself a third lower.
    or
      phrase chime-clatter
        The tubes clatter together, all music gone.
    end select
  end on
```

The five strategies:

| Strategy | Behavior |
|---|---|
| `cycling` | arms in order, wrapping back to the first forever |
| `stopping` | arms in order, then stays on the last |
| `randomly` | a fresh seeded random arm every firing |
| `sticky` | one seeded random arm, then that same arm forever |
| `first-time` | the first arm once, the second arm ever after |

`randomly` and `sticky` draw from the same seeded, save-persistent
stream as every other random effect in Chord, so a replay or a restored
save reproduces the same choices (never `Math.random`). `first-time` is
the "novelty then routine" shape — a drawer that is a discovery the
first time and a shrug thereafter:

<!-- fixture: flow/select-strategy.story -->
```story
  on opening it
    select first-time
      phrase drawer-discovery
        The drawer shrieks open on a jumble of twine, labels, and one
        surprised spider.
    or
      phrase drawer-routine
        The drawer shrieks open. The spider has moved out.
    end select
  end on
```

The retired adverbs `ordered` and `once` are gone (§6.3): `ordered` is
now `stopping`, and there is no phrase-strategy `once` — its old job is
covered by `first-time` and `stopping`. The clause modifier `, once`
(§3.3) is a different construct at a different position and is
untouched.

### 4.3 Ordinal blocks

An ordinal block runs its body only on the Nth time the enclosing clause
fires. The ordinals `first time` through `tenth time` appear in
statement position, interleaved with ordinary statements:

<!-- fixture: flow/ordinals.story -->
```story
  on knocking it
    phrase knock-echo
    first time
      phrase knock-first
    second time
      change it to smudged
      phrase knock-second
    fifth time
      phrase knock-fifth
  end on
```

Every knock speaks `knock-echo`; the ordinal blocks add to it on the
first, second, and fifth knock only. The ordinals need not be
contiguous — jumping `first`, `second`, `fifth` is fine, and the gaps
simply do nothing. Each block dedents to close; there is no `end`
keyword.

This is the same keyword pair as the create-block `first time`
description (§2.9), and the collision is worth naming. Inside a `create`
block, at the top level of the block, `first time` opens the room's
first-visit description and only `first time` is legal there. Inside a
behavior body, `first time` opens an ordinal block and the whole family
through `tenth time` is available. Position decides which one you get:
a `first time` directly under `create` is a description, a `first time`
inside `on`/`after` is an ordinal.

### 4.4 each blocks

`each <condition>` runs its body once for every entity that satisfies a
named *open* condition (§3.4) — a condition whose `it` is left free, so
it describes a set rather than testing one thing. Inside the body, `the
match` is the current entity; `it` keeps meaning the clause's owner.

<!-- fixture: flow/each.story -->
```story
define condition frame-seedling: it is a seedling and it is in the cold frame
define condition labeled-pot: it is a pot and it is in the potting shed
```

<!-- fixture: flow/each.story -->
```story
  on planting it
    each frame-seedling
      move the match to the Nursery Bed
      phrase planted-out with plant = the match
    end each
    phrase planting-done
  end on
```

Each matching seedling is moved and announced; then, after the loop,
`planting-done` speaks once. The body is ordinary statements, so `move`,
`change`, `phrase`, and the rest all work, and `the match` is a value
you can pass as a parameter (`with plant = the match`) or use as a
`move`/`change` target. The iteration order is the order entities were
created, and an empty match set simply runs the body zero times.

`each` blocks nest. The binder `the match` always refers to the
*innermost* loop:

<!-- fixture: flow/each.story -->
```story
  on auditing it
    each frame-seedling
      each labeled-pot
        phrase audit-pair with pot = the match
      end each
    end each
  end on
```

`each` is legal wherever statements are — `on` bodies, action bodies,
trait clauses, sequence steps — and never at the top level
(`parse.each-top-level`). Its condition must be a declared open
condition; a closed condition or a story state is
`analysis.closed-condition-selection`, and `the match` outside any
`each` body is `analysis.match-outside-each`. `match` is a reserved
name: you cannot call an entity, alias, trait field, or grammar slot
`match`.

### 4.5 Scoring

A `score <name> worth N` line declares a scoring identity, and `award
<name>` grants it (first seen in §2.8). The line is legal under four
owners — the story header, a `create` block, a `define trait`, and a
`define action` — and this section shows all four in one story, because
where a score lives is a real design choice.

The story header owns scores that belong to the whole game:

<!-- fixture: flow/scoring.story -->
```story
story "Scoring" by "Sharpee Docs"
  id: chord-ref-scoring
  version: 0.0.1
  score green-thumb worth 5
```

A trait owns a score every entity composed with it can grant, without
the trait knowing which entities those are:

<!-- fixture: flow/scoring.story -->
```story
define trait prunable
  score tidy-secateurs worth 5

  phrases en-US
    pruned:
      You snip away the dead wood.

  on pruning it
    award tidy-secateurs
    phrase pruned
  end on
end trait
```

A `create` block owns a score specific to that one entity — and here is
the payoff of owner-scoping. The damask rose and the moss rose both
declare `score deadheaded worth 5`, and those are *two different
scores*, one per rose, because each is owned by its own entity:

<!-- fixture: flow/scoring.story -->
```story
create the damask rose
  aka damask
  prunable
  in the Rose Border
  score deadheaded worth 5

  A crimson damask, badly overgrown.

  after pruning it
    award deadheaded
    award green-thumb
  end after
```

The damask's `after` clause awards its own `deadheaded`, and also the
story-wide `green-thumb`. `award <name>` resolves owner-first: it looks
for a score of that name on the enclosing owner, then falls back to the
story header. So the same word `deadheaded` under the damask means the
damask's score, and under the moss rose means the moss rose's — no
collision, no prefixing.

An action owns a score granted whenever the action succeeds:

<!-- fixture: flow/scoring.story -->
```story
define action composting
  grammar
    compost :stuff
  score turned-the-heap worth 10
  award turned-the-heap
  phrase composted
  phrases en-US
    composted:
      Straight onto the heap with it.
```

Two properties fall out of this model. First, the maximum score is the
sum of every declared `worth`, computed at load time. Second, awards
dedupe by identity (ADR-129): awarding the same score twice grants it
once, so `award` is idempotent and the explicit `, once` modifier
(§3.7) is never *needed* for correctness — it only documents intent.
This is why the pattern is "declare the score on the owner, award it in
an `after` clause" rather than guarding awards behind first-time checks.

### 4.6 Endings: win and lose

`win` and `lose` end the story. Each optionally names a phrase to speak
on the way out, and each takes the statement-final `when` suffix (§3.8),
so an ending can be conditional without a wrapping block.

<!-- fixture: flow/endings.story -->
```story
  on pulling it
    remove it
    win garden-perfect
  end on
```

<!-- fixture: flow/endings.story -->
```story
  on poking it
    lose stung when one chance in 2
    phrase near-miss
  end on
```

The first ends in victory, speaking `garden-perfect`. The second loses
only on a coin-flip (`when one chance in 2`); when the flip spares you,
the `lose` is skipped and `near-miss` speaks instead. The phrase name is
optional — bare `win` and bare `lose` end the story with only the
platform's default ending text.

### 4.7 Death: kill the player and deadly places

Death is not `lose`. `lose` ends the game directly; the three constructs
here run the platform's death machinery instead — the death text speaks,
a died event fires, and at the end of the turn the engine re-checks
whether the player is actually dead. That re-check is a real window: a
story policy that revives the player during the turn (a reincarnation
rule, a guardian angel) vetoes the ending and play continues. With no
such policy, the story ends in defeat.

**`kill the player [<phrase-key>] [when <condition>]`** is a statement,
peer to `win` and `lose` (§3.7), legal anywhere statements go — `on` and
`after` clauses, `every turn` daemons, action bodies, inside `select` and
`each`. The phrase key is the death text (define it like any phrase) and
doubles as the recorded cause; bare `kill the player` records the cause
`killed` and shows only the platform's ending text. The `when` suffix
gates it like any statement (§3.8):

<!-- fixture: flow/death.story -->
```story
  on crossing it
    kill the player bridge-death when it is frayed
    phrase bridge-holds
  end on
```

While the bridge is whole, the `kill` is skipped and `bridge-holds`
speaks instead — the same shape as the conditional `lose` in §4.6.

**`<direction> is deadly: <phrase-key>`** marks a fatal exit, mirroring
`is blocked:` (§2.5). The fatal direction is deliberately not an exit at
all: typing it never runs the going action — the command is rewritten
into the platform's internal death action, so the player sees the death
text and nothing else, no movement prose, no refusal. The player
retreats another way.

<!-- fixture: flow/death.story -->
```story
create Aragain Falls
  a room
  west to the Rocky Ledge
  south is deadly: falls-death

  The roar of the water is everything.
```

The conditional form `is deadly while <condition>:` parses but is not
wired yet — a load error tells you so; the live equivalent is an
`on going it` clause carrying `kill the player when <condition>`.

**`deadly: <phrase-key>`** marks the whole room as a no-escape position:
every verb except a safe allowlist — look and examine, by default — is
fatal, including objectless ones like WAIT and INVENTORY that no
per-entity clause could catch. Reserve it for the genuinely inescapable
spot, not as a generic hazard flag:

<!-- fixture: flow/death.story -->
```story
create Over the Falls
  a room
  deadly: over-falls-death

  You are over the falls. This was a mistake.
```

In TypeScript the underlying trait adds two more dials: `safeVerbs`
widens the allowlist, and `chance` makes the room probabilistically
deadly — a survived roll simply lets the verb run normally, with no
message. Neither dial is expressible from Chord today. The standard
library reference (stdlib-reference.md §9) documents the machinery
underneath all three constructs: the died event's shape, the veto
window's mechanics, the health trait, and the internal redirect action.

### 4.8 Sequences

A `define sequence` is a scripted timeline: a named list of steps, each
anchored to *when* it fires and carrying a body of ordinary statements.
It replaces the hand-rolled turn-counting daemons of the old platform
with one declarative block. There are three anchor forms, and this
story uses all three across three sequences.

The first two anchors are clock-based. `at turn N` fires at an absolute
turn counted from the story's start; `N turns later` fires relative to
the previous step, so you can chain a timeline without arithmetic:

<!-- fixture: flow/sequence.story -->
```story
define sequence gathering storm
  at turn 2
    phrase storm-distant
      Thunder mutters somewhere beyond the wall.
  3 turns later
    phrase storm-near
      The light goes pewter, and the first fat drops crater the dust.
  2 turns later
    phrase storm-breaks
      The storm breaks all at once, rain hammering the gravel.
    change the story to raining
end sequence
```

The steps here land on turns 2, 5, and 7. A step body is ordinary
statements: the last step both speaks and moves the story into its
`raining` state.

The third anchor is state-based. `when <name> becomes <state>` fires the
step when that owner transitions into the named state — the story
itself, or any entity. This lets one sequence react to another's effect.
The storm above moved the story to `raining`; a second sequence waits on
exactly that:

<!-- fixture: flow/sequence.story -->
```story
define sequence take shelter
  when the story becomes raining
    phrase shelter-note
      Anywhere with a roof suddenly seems like a very good idea.
end sequence
```

The same anchor works on an entity's own states. When the bonfire is lit
and changes to `burning`, a third sequence notices:

<!-- fixture: flow/sequence.story -->
```story
define sequence smoke drifts
  when the bonfire becomes burning
    phrase smoke-note
      A ribbon of blue smoke begins to drift across the garden.
end sequence
```

A sequence name may be several words (`gathering storm`, `take
shelter`), and the block always closes with an explicit `end sequence`.
Within a step, prose indented under a `phrase` line is declare-and-emit
text (§3.7), which is why these steps need no separate `define phrases`
block.

## 5. Defining vocabulary and text

Everything so far attaches behavior to things that already exist. The
`define` family is how you add to the language itself: name a condition,
name a bundle of text, teach the parser a verb, mint a trait or an
action other entities can be composed with. These are the only other
top-level declarations besides `create`, and unlike `create` they
declare *kinds and vocabulary*, not instances in the world.

### 5.1 define condition

`define condition <name>: <condition>` names a condition so you can
reuse it by name. The name is a single hyphenated token (not a
multi-word prose name), and the body is the ordinary condition grammar
(§3.4).

<!-- fixture: define/condition.story -->
```story
define condition trug-in-hand: the player holds the trug
define condition ripe-tomato: it is a tomato and it is not in the trug
```

The distinction that matters is *open* versus *closed*, and it is
decided entirely by whether the body mentions `it`:

- A **closed** condition never mentions `it`. It is a plain truth test
  about the world — `trug-in-hand` asks whether the player holds the
  trug, yes or no. Closed conditions go in truth positions: `while`,
  `when`, `refuse when`, `must be` comparisons.
- An **open** condition mentions `it`, leaving the subject free. It
  describes a *set*: `ripe-tomato` is the criterion "any tomato not yet
  in the trug." Open conditions go where a set is expected —
  `any`/`no`/`each` (§3.4, §4.4) and `must be any` (§3.5).

<!-- fixture: define/condition.story -->
```story
  on examining it
    phrase go-ahead when trug-in-hand
    phrase still-out when any ripe-tomato
  end on
```

Using one where the other belongs is a load error, never a silent
guess: `any` over a closed condition is
`analysis.closed-condition-selection`, and a bare open condition in a
truth position is `analysis.open-condition-truth`. The rule of thumb is
"mention `it` when you mean a set, leave it out when you mean a fact."

### 5.2 define phrase

`define phrase` gives a phrase key one or more `or`-separated variants
and a strategy for choosing between them, closing with `end phrase`. The
strategy is the same five-name set as `select <strategy>` (§4.2),
because it is the same machinery: `select` chooses between statement
bodies, `define phrase` chooses between texts.

<!-- fixture: define/phrase.story -->
```story
define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
end phrase
```

Each variant is a prose block (§2.6) — the *only* form phrase text
takes; the old same-line quoted and bare forms were removed (§6.3).
Blank lines inside a variant are paragraph breaks, and `{br}` still
forces a hard line break.

A phrase header may carry a trailing `while <condition>` gate. This is
mainly for description-marker phrases (§2.6): the gate decides whether
the fragment appears at all, live at render time. Here a keeper line
only splices into the aviary description while the zookeeper is actually
present:

<!-- fixture: define/phrase.story -->
```story
define phrase keeper-note, cycling while the zookeeper is here
  where a keeper is refilling the feeders
or
  where a keeper is chalking today's talks on a board
end phrase
```

Fragments spliced into prose are written *bare* — no leading separator
and no trailing full stop. The platform owns the join: a marker mid-
sentence joins with a comma, a marker after a sentence joins with a
space. Writing the separator yourself earns a diagnostic.

The `verbatim` modifier (mutually exclusive with the strategies) exempts
a phrase's text from whitespace collapse, preserving its exact line
structure and relative indentation — for signs, verse, and ASCII where
the layout is the point:

<!-- fixture: define/phrase.story -->
```story
define phrase plaque-text, verbatim
  MACAWS OF THE AMERICAS
    donated by the Willowbrook Trust
  Please do not tap the glass
end phrase
```

A `verbatim` phrase can be spoken by a `phrase` statement but cannot
splice at a description marker (`analysis.verbatim-marker`): its
whole point is preserved line structure, which a mid-sentence splice
would break.

A phrase key may be dotted — `if.action.taking.fixed_in_place` is one
key, registered whole — and dotting is how a story overrides the
platform's own text. Every standard-action message lives under a dotted
id (the stdlib reference catalogs them entry by entry); a `define
phrase` under that exact key replaces the platform default story-wide,
for every entity, every time that moment renders:

<!-- fixture: define/dotted-override.story -->
```story
define phrase if.action.taking.fixed_in_place
  It will not budge, and neither will anything else bolted to this place.
end phrase
```

Now every fixed-in-place refusal in the story speaks this line instead
of the standard one. The per-entity routes still sit on top: an `on`
clause's own refusal (§3.6) or a per-entity override (§2.10) speaks for
its one entity, and the story-wide dotted override sets the default
underneath them.

### 5.3 define phrases (locale blocks)

Where `define phrase` declares one key with variants, `define phrases
<locale>` declares many plain keys at once, under a named locale. This
is the localizable form — the same block stdlib uses — and the one to
reach for when your text is a flat catalog of keyed strings rather than
a single choice:

<!-- fixture: define/phrases.story -->
```story
define phrases en-US
  rack-front:
    The front of every card is the same beaming flamingo.
  rack-back:
    Each back is pre-stamped, as if the zoo expects you to write home
    before you have even seen it.
```

Each entry is `key:` on its own line followed by an indented prose
block. The block is dedent-terminated — there is no `end phrases`. A key
here is a plain phrase with no strategy; for variants or a strategy, use
`define phrase` (§5.2) instead. Throughout this reference the small
supporting texts live in exactly this kind of block at the foot of each
fixture.

### 5.4 define verb

`define verb <word> {or <word>} means <pattern>` teaches the parser a
new surface verb by mapping it onto an existing action's pattern. A
`(something)` in the pattern is a slot the parser fills from the
player's input:

<!-- fixture: define/verb.story -->
```story
define verb hang or hook means put (something) on (something)
define verb sniff means smell (something)
```

`hang the jacket on the hook` and `hook the jacket on the hook` now both
route through the standard `put … on …` action; `sniff the jacket`
routes through `smell`. This is verb *vocabulary* only — aliases onto
patterns the platform already understands. To define a genuinely new
action with its own grammar and behavior, use `define action` (§5.8).

### 5.5 define text (text hatches)

Some text cannot be authored as static variants — it depends on
computation the language deliberately does not do (§2.5's "no
counting"). A **text hatch** bridges to a small piece of TypeScript that
produces the text. `define text <name> from "<module>"` binds a marker
name to a named export of an author-supplied module:

<!-- fixture: define/hatches.story -->
```story
define text weather from "./extras.ts"
```

`{weather}` in prose now renders whatever the module's `weather` export
produces. The TypeScript side implements the platform's `PhraseProducer`
contract and touches the world only through the narrow, typed context
the loader hands it:

```typescript
import type { PhraseProducer } from '@sharpee/if-domain';

export const weather: PhraseProducer = () => ({
  kind: 'literal',
  text: 'something ominous with the clouds',
});
```

The name `br` is reserved and cannot be a hatch name. One limitation to
state plainly: this reference's compile-check harness runs the Chord
compiler, which validates the `define text` line and the marker binding
but does *not* load the TypeScript module — hatch *binding* happens at
story-load time, under the author's own build. So the `.story` side of
every hatch example here is verified; the TypeScript stub is
illustrative, checked by the author's toolchain, not by this document's
harness.

### 5.6 define action/behavior hatches

Text is one hatch kind; the other two bridge to whole actions and
capability behaviors, for logic genuinely outside the language. The
syntax mirrors the text hatch exactly:

<!-- fixture: define/hatches.story -->
```story
define action dowsing from "./extras.ts"
define behavior tide-clock from "./extras.ts"
```

`define action … from` binds an action implementing the platform's
`Action` interface; `define behavior … from` binds a `CapabilityBehavior`
(ADR-090). Both are governed by the hatch legitimacy rule (design.md
§5.6): a hatch is legitimate only when it implements a public platform
interface, or does pure non-IF computation, with data crossing the
boundary through that interface. If the language can already express what
the hatch does, the hatch is misuse and the fix is the Chord form; if it
can't, that is a language gap worth filing. In particular, the `chord.*`
state namespace is off-limits — those keys are the loader's private
encoding and change without warning. As with text hatches, the binding
is out of this harness's scope; the `.story` lines above compile, and the
TypeScript is the author's to build and verify.

### 5.7 define trait

A trait is a reusable bundle of data, states, scores, phrases, and
behavior that entities compose with (§2.3). `define trait <name> …
end trait` declares one. The block below carries one of everything:

<!-- fixture: define/trait.story -->
```story
define trait feedable
  data
    food: entity
    ration: optional number
    diet: one of hay, seed, fish
  states, reversible: hungry, content
  score fed worth 10

  phrases en-US
    no-food:
      You have nothing {the item} would want.
    already-fed:
      {capitalize the item} has had quite enough already.
    fed:
      The feed vanishes in seconds.

  on feeding it
    the player must have its food: no-food
    it must be hungry: already-fed
    change it to content
    award fed
    phrase fed
  end on
end trait
```

The parts, top to bottom:

- **`data`** declares fields. Each is `<name>: <type>`, where the type
  is `entity`, `number`, `name`, or `one of <word>, <word>, …` for a
  fixed set. `optional` before the type makes the field omittable; `,
  starts <value>` (not shown here) gives a default. Fields are read and
  written with `its <field>` / `set its <field> to …`.
- **`states`** and **`score`** are the same owner lines as everywhere
  else (§2.7, §2.8), here owned by the trait: every entity composed with
  `feedable` gets the `hungry`/`content` states and can award `fed`.
- **`phrases`** is a locale block (§5.3) scoped to the trait.
- **`on`/`after` clauses** are the trait's behavior (§3), with `it`
  meaning the composed entity.

An entity picks the trait up on a composition line, passing its data
with `with`:

<!-- fixture: define/trait.story -->
```story
create the pygmy goats
  aka goats
  feedable with food the handful of feed and diet hay
  in the Petting Zoo
```

A state name declared by two different composed traits on one entity is
a collision (`analysis.state-collision`), caught at load time.

### 5.8 define action

`define action <name> … end` (dedent-terminated) declares a brand-new
action: its grammar, its requirements, its refusals, and its body. This
one action shows the whole surface:

<!-- fixture: define/action.story -->
```story
define action petting
  grammar
    pet :animal
    pat :animal
    stroke :animal → each nearby creature
  the animal must be reachable
  score gentle-hands worth 5
  refuse without animal: pet-what
  refuse when the animal is a snake: glass-way
  otherwise refuse cant-pet
  award gentle-hands
  phrase petted

  phrases en-US
    pet-what:
      Pet what?
    glass-way:
      You settle for pressing a hand to the cool glass.
    cant-pet:
      {capitalize the animal} really is not the sort of thing you can pet.
    petted:
      You give a good long scritch.
```

Reading it line by line:

- **`grammar`** lists the surface patterns. A `:word` is a slot, and the
  slot name *is* the value name used everywhere else in the action —
  because the pattern says `:animal`, the requirements and phrases all
  refer to `the animal`. The `→` gives a pattern's cardinality: `stroke
  :animal → each nearby creature` marks that form as applying to each
  match rather than a single object.
- **`the animal must be reachable`** is a scope constraint (no colon):
  a precondition on a slot the parser enforces during resolution.
- **`score`** attaches an action-owned score (§4.5).
- **`refuse without <slot>: <key>`** refuses when the slot was not
  filled at all (nothing to pet); **`refuse when <condition>: <key>`**
  refuses on a condition (§3.6); **`otherwise refuse <key>`** is the
  last-resort refusal when no trait claimed the action on this target.
- The remaining lines are the ordinary body: statements (`award`,
  `phrase`, §3.7) that run when the action proceeds.
- **`phrases`** is the action's locale block.

The relationship to traits: `define action` declares the verb, its
grammar, and its default outcomes; a `define trait` with an `on <verb>`
clause is how a *particular kind of thing* responds to that verb.
Together they are the story-author's version of stdlib's action-plus-
behavior pattern — the goats above are pettable because `petting` exists
as an action and something makes the goats respond to it.

## 6. Tooling

### 6.1 sharpee compose

`sharpee compose` is the command that turns a `.story` file into Story
IR and, in the process, runs every load-time gate. It is the author's
version of the compile check this whole reference is built on.

```
sharpee compose <file.story> [--check] [-o <ir.json>]
```

There are two modes. Plain `sharpee compose file.story` runs the gates
and then goes further: it binds any hatches, builds the world, and
creates the player, so that "it composed" means "it actually loads."
On success it writes the IR as JSON to standard output (or to a file
with `-o`). `sharpee compose --check file.story` stops after the gates —
no IR is emitted and no load is attempted. `--check` is the CI form: the
fast yes/no you run to know a story is well-formed.

The output streams are split on purpose. Standard output carries *only*
the IR JSON, so `-o` and a shell redirect produce clean machine-readable
output; every human-facing line — diagnostics, the pass/fail summary,
the load report — goes to standard error. That split is what lets
`sharpee compose file.story > story.ir.json` do the right thing.

The exit code is the contract for scripts:

| Code | Meaning |
|---|---|
| `0` | gate-clean (and, in full mode, the IR loaded) |
| `1` | the story failed the load-time gates, or a hatch source broke a rule |
| `2` | a usage error — no file, missing argument, unknown flag |

### 6.2 Reading diagnostics

Every gate speaks the same line format:

```
<file>:<line>:<column> <severity> [<code>] <message>
```

For example:

```
zoo.story:42:3 error [analysis.irreversible-state] `intact` is
declared before `trampled`; a `change` back is a load error unless the
set is `states, reversible: …`.
```

The `<code>` is the stable identifier — the same code this reference
cites throughout (`analysis.irreversible-state`, `parse.react-refusal`,
and so on) — and the `<message>` usually carries the fix. `error`
severity means the story will not load; `warning` means it loads but
something reads oddly (the fragment-terminator warnings on description
markers are the common one).

The governing idea is that loading is **atomic**: a story either passes
every gate and produces usable IR, or it fails and produces none. There
is no partial load. This is why the reference can promise that a
compiling example really works — "compiles" is not a syntax check, it is
the full parse-and-analyze pass that the runtime itself depends on.

The parser is built to give you one diagnostic per mistake rather than a
cascade. After it reports a parse error, it resynchronizes at the next
`end` line or top-level keyword and carries on, so a single missing
`end on` produces a single message pointing at the clause, not a wall of
confused errors from everything after it. When you do see several
diagnostics at once, they are genuinely several problems — fix the first
and recompile.

The gates come in two families, distinguished by their code prefix.
`parse.*` gates are structural: a tab in the indentation, a missing
`end`, a removed construct (§6.3). `analysis.*` gates are semantic —
they fire after a clean parse, when the shapes are right but the meaning
is not. The analyzer gates you are most likely to meet, each named where
it is first explained:

- `analysis.irreversible-state` — a `change` backward through a
  non-`reversible` state set (§2.7).
- `analysis.state-collision` — two composed traits declaring the same
  state name (§5.7).
- `analysis.closed-condition-selection` — `any`/`no`/`each` over a
  closed condition (§3.4, §5.1).
- `analysis.open-condition-truth` — a bare open condition used as a
  truth test (§5.1).
- `analysis.negated-requirement` — `refuse when not …`, which is a
  requirement in disguise; use `must` (§3.6).
- `analysis.unbound-marker` — a `{marker}` naming no declared phrase or
  hatch (§2.6).
- `analysis.remove-player` — `remove the player`, which has no defined
  meaning (§3.7).
- `analysis.match-outside-each` — `the match` used outside an `each`
  body (§4.4).

The three-ring boolean-state gate deserves its own mention, because it
catches the single most common instinct carried over from other
systems: reaching for a boolean. If you declare a state set that looks
like a flag — `true`/`false`, a platform pair like `open`/`closed`, or a
negation pair like `fed`/`unfed` — the analyzer refuses it
(`analysis.boolean-state`, `analysis.shadow-state`,
`analysis.negated-state`) and tells you to name what the thing *is* in
each state, or to compose the trait that already owns that state. A
state names a condition of the thing, never the absence of another
state.

### 6.3 Migrating from removed constructs

Chord's grammar is a one-way ratchet: constructs that were removed on
the way to v1 are not merely undocumented, they are *actively refused*.
Each removed form produces a specific `parse.*` error whose message
names its replacement, so a story written against an older sketch fails
loudly and points the way, rather than misbehaving quietly. Every row
below is backed by an expected-to-fail fixture in this reference's
harness, which asserts the exact code still fires.

| Removed form | Diagnostic code | Replacement |
|---|---|---|
| top-level `when <actor> <verb>s …` rule | `parse.removed-when` | an `on`/`after` clause on the owner (§3.1) |
| top-level `once <condition>` rule | `parse.removed-once` | the `, once` clause modifier (§3.3) |
| top-level `every N turns` rule | `parse.removed-every` | a `define sequence` (§4.8) or `every turn` clause (§3.2) |
| `define flag <name>` | `parse.removed-flag` | owner `states:` (§2.7) or a derived condition (§5.1) |
| `flag` trait-field type | `parse.removed-flag-field` | trait `states` (§5.7) |
| `if` / `else` / `end if` | `parse.removed-if` | `must` (§3.5), the `when` suffix (§3.8), or `select` (§4.1) |
| top-level `define score … worth N` | `parse.removed-score` | an owner-attached `score` line (§4.5) |
| `ordered` / `once` phrase strategy | `parse.phrase-strategy-retired` | `stopping` / `first-time` (§4.2) |

The through-line is *stickiness* (design.md, given 9): every one of these
removals took a floating, top-level behavior and re-homed it on the thing
it is actually about. A `when` rule floated beside the world; an `on`
clause lives on the room it reacts in. A global `flag` floated in no
one's namespace; a `states:` line lives on its owner. The migration is
almost always "find the thing this was really about, and move it there."

The richest case is `if`, because a single removed construct fans out to
three replacements. This no longer parses:

<!-- fixture: migration/removed-if.story -->
```story
  on opening it
    if it is locked-fast
      phrase clunk
    end if
  end on
```

It reports `parse.removed-if`, and which replacement you want depends on
what the `if` was doing. If it was *guarding* the whole action — this may
not proceed unless a condition holds — it becomes a `must` requirement
(§3.5). If it was making *one statement* conditional, it becomes that
statement plus a `when` suffix (`phrase clunk when it is locked-fast`,
§3.8). If it was choosing between *several bodies* by a value, it becomes
a `select` (§4.1). The removed `if` had all three jobs; Chord gives each
its own, clearer form.

## Appendix: the formal grammar

This reference is the narrative companion to Chord's formal grammar, not
a second source of truth. Where this document and the grammar disagree,
the grammar and the parser win.

- **`docs/reference/chord-grammar.md`** — the implementation notation:
  an EBNF-style description of the grammar exactly as the parser accepts
  it, tracked against the code phase by phase, including the layout rules
  EBNF cannot express and the analyzer's gate policy.
- **`docs/reference/chord.ebnf`** — a pure-EBNF extraction of the
  productions, with no ratchet history or analyzer notes.
- **`docs/architecture/chord-grammar-changes.md`** — the owner-approved
  governance log: every construct added, renamed, or removed, with its
  rationale and date. The migration table in §6.3 is drawn from it.

The one structural fact worth restating here is the block-closing table
from §1.2: some blocks close on dedent (`create`, `define action`,
`define phrases`, story header), and some close with an explicit `end`
line that must match its opener (`define trait` … `end trait`, `define
sequence` … `end sequence`, `define phrase` … `end phrase`, `on` …
`end on`, `after` … `end after`, `select` … `end select`, `each` …
`end each`). When in doubt about whether a block needs an `end`, that
table in §1.2 is the authority.
