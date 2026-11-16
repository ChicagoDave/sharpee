# Chord primer for Claude Code

**Pinned to:** Sharpee 5.6.1 · Chord 4.0.2 (the published `@sharpee/devkit@5.6.1`).
**Audience:** a Claude Code session writing or editing a `.story` file. Not a tutorial for people.
**Status of every claim:** every code block below compiled gate-clean on the published CLI on
2026-11-16, every diagnostic code was produced by that compiler, and every described behavior was
played there, unless the line says "observed". Word lists and forms shown only as one-line
spellings come from the 4.0.2 grammar file and were not each run.

Read this whole file before writing Chord. Chord is not a general-purpose language and it does not
resemble Inform 7 closely enough to guess at. Its syntax is closed: a form that is not in this file
or in a compiler fix-it does not exist.

## 0. How to work

1. Run `npx sharpee --version` first. It must print `Sharpee 5.6.1 · Chord 4.0.2`. If it prints
   anything else, tell the user that this primer is pinned to another version, and trust the
   compiler over this file.
2. After every edit run `npx sharpee compose <file>.story --check`. Success is the line
   `compose: Chord 4.0.2 — <file> is gate-clean`. Errors print as
   `file:line:col error [code] message`, and the message usually states the fix. Apply that fix
   as written. Do not invent a different spelling.
3. A clean compile does not mean the story works. Three known forms compile and do nothing
   (section 9), and one error appears only when the story loads. So play every path you wrote:
   put one command per line in a text file and run `npx sharpee play <dir> < commands.txt`.
   `<dir>` is the directory holding the `.story` file.
4. Pin what you played in the test tree (section 12) and run `npx sharpee test <dir>`.
5. Never report a construct as working from a compile alone. Quote the played output.
6. When Chord cannot say what the story needs, stop and tell the user. Do not work around a
   language gap with a pile of states or a clause on the wrong owner. A gap is a finding.
7. Story content (plot, puzzles, prose) belongs to the author. Write only what you were asked for.

Other commands: `sharpee messages` (every overridable platform message as JSON: `alias`,
`template`), `sharpee build <file>.story` (browser build), `sharpee compose <file> -o out.json`
(the compiled Story IR), `sharpee ifid` (generate an IFID).

## 1. The one rule that shapes everything: ownership

A response belongs to the thing it is about. Chord enforces this and has no way around it.

| You want | Write it here |
| --- | --- |
| A thing reacts to a **standard** verb (take, open, examine...) | `on the player <gerund>` or `after the player <gerund>` inside that thing's `create` block |
| A **new verb** exists | `define action <gerund>`: grammar, what must be true of the player, and the miss message. Nothing about any particular thing |
| A thing answers a **new verb** | `define trait <name>` with `on the player <gerund>`, and the thing lists the trait on its kind line. A trait with one carrier is normal |
| A thing reacts after a new verb succeeds | `after the player <gerund>` in the thing's own block |
| A fact about one thing | `states:` on that thing. There are no global flags or variables |
| A fact about the whole story | `states:` in the story header, changed with `change the story to <state>` |
| A derived fact | `define condition <name>: <condition>` |
| Something every turn | `on every turn` on the thing, the region, or in the story header |

What this forbids, with the compiler's own codes:

- An action asking which thing was named (`refuse when the target is the vase: ...`, or
  `select on` a slot): `analysis.slot-identity-test`. Ask what **sort** of thing it is instead
  (`the target is a <kind or trait>`), or move the response onto the thing.
- A thing's own `on the player <story-gerund>`: `analysis.story-action-on-clause`. A story
  action runs a thing's `after` clauses and the `on` clauses of its **traits**, never the thing's
  own `on` clause. For a standard action the thing's own `on` clause is correct.
- `define action` whose grammar repeats a standard command (`take the target`):
  `analysis.repeats-standard-grammar`. Use `on the player taking` on the thing, or
  `extend action taking` to add wording.
- `it` or `its` outside a `define trait` body (where it means the carrier) or a
  `define condition` (where it is the thing being tested): `analysis.it-removed`. Name the thing.

## 2. File shape

- Line-oriented. Indent with **spaces only**, two per level. A tab is a lex error.
- A block opens with its header line and closes at dedent or at its `end <word>` line.
- Comments are `##` lines at column 1, between top-level constructs only, with a blank line on
  both sides. There is no end-of-line comment and no comment inside a block.
- Names are plain words: `the brass bell`, `the Cellar`, `Morgan`. A name must not share a word
  the player will type for a different thing, or the parser asks "Which do you mean". Use `aka`
  for synonyms.
- Keys (phrases, states, scores, conditions, traits, actions) are one kebab-case word. A dot in
  a key is an error.
- Strings are `"double quoted"` with no escapes.

Top-level order is free. The usual order: `story` header, `define` blocks, `create` blocks,
`define phrases en-US`, `before the game starts`.

## 3. A complete story

This compiles gate-clean and plays to its ending in 13 commands. Copy its shapes.

```chord
story
  title: The Cellar Bell
  id: cellar-bell
  story-version: 0.1.0
  ifid: 5B0C1F6E-2A4D-4E7B-9C31-7D2A8E4F6B10
  states: quiet, rung
  use scoring
    rank "Visitor" at 0
    rank "Ringer" at 10
  authors:
    Example Author
  description: A locked cellar and a bell that wants polishing.
  prologue:
    The house is yours for the afternoon, and so is whatever is under it.

define condition bell-ready: the brass bell is polished and the brass bell is in the hook

## A trait answers a story action. `it` is the thing that composes it.

define trait tarnished
  states: dull, polished
  score shined worth 5

  on the player polishing
    refuse when it is polished: already-bright
    change it to polished
    award shined
    phrase now-bright
  end on
end trait

## An action carries grammar and what must be true of the player.
## It never asks which thing was named.

define action polishing
  grammar
    polish or shine the target
  the target must be reachable
  the player must have the rag: need-a-rag
  otherwise refuse nothing-to-polish

define action ringing
  grammar
    ring the target
  the target must be reachable
  otherwise refuse cannot-ring

define trait ringable
  score rang-it worth 5

  on the player ringing
    it must be polished: too-dull-to-ring
    it must be in the hook: bell-not-hung
    change the story to rung
    award rang-it
    win bell-rung
  end on
end trait

create the Kitchen, a room
  down to the Cellar through the cellar door

  A stone-flagged kitchen with a cold range. A door in the corner leads
  down.

  first time
    Nobody has cooked here in a long while.

create the Cellar, a room, dark

  Whitewashed brick, a rack of empty bottles, and an iron hook in the
  ceiling beam.

create the cellar door
  a door, openable, lockable with the iron key, starts locked

  Planks and a black iron lock.

create the dresser
  a container, scenery, openable, starts closed
  in the Kitchen
  holds 4

  A tall dresser with one deep drawer.

create the iron key
  a thing
  in the dresser

  A heavy key, cold to hold.

create the rag
  aka cloth
  a thing
  in the dresser

  A soft grey rag.

create the candle
  a thing, light-source, starts unlit
  in the Kitchen

  A stub of candle in a tin holder.

create the hook
  aka iron hook
  a supporter, scenery
  in the Cellar
  holds 1

  A hook the size of your hand.

create the brass bell
  aka bell
  a thing, tarnished, ringable
  in the Cellar
  counter knocks

  A hand bell, green with neglect.

  on the player examining
    select on the brass bell's state
      when dull
        phrase bell-dull
      when polished
        phrase bell-bright
    end select
  end on

  after the player taking
    first time
      phrase bell-heavy
    second time
      phrase bell-again
  end after

  after the player putting the hook
    phrase bell-hangs
  end after

create Morgan
  a person, proper
  playable
  starts in the Kitchen

  You, in your second-best coat.

define phrases en-US
  already-bright:
    It is as bright as it will get.
  now-bright:
    The green comes off on the rag, and the brass comes up underneath.
  need-a-rag:
    You have nothing to polish with.
  nothing-to-polish:
    Polishing that would change nothing.
  cannot-ring:
    That does not ring.
  too-dull-to-ring:
    It gives a flat clank, all tarnish.
  bell-not-hung:
    A bell wants hanging before it will ring true.
  bell-rung:
    The bell rings, clear as a struck glass, and the whole house hears it.
  bell-dull:
    Under the green there may be brass.
  bell-bright:
    It shines.
  bell-heavy:
    It is heavier than it looks.
  bell-again:
    You know its weight by now.
  bell-hangs:
    The bell settles on the hook and swings once.

before the game starts
  change the player to Morgan
end before
```

Things this example shows that are easy to get wrong:

- `authors:` and `title:` are required (`parse.story-authors`). `ifid:` is needed to publish;
  `npx sharpee ifid` generates one.
- Every `create` block names exactly one kind, first: `a room`, `a thing`, `a door`,
  `a person`, `a container`, `a supporter`, `a region`, `a vehicle`. The kind may fold onto the
  head (`create the Cellar, a room, dark`). Trait words follow, comma-separated.
- A description is a bare paragraph **after a blank line**. With no blank line the paragraph is
  read as a composition line and fails.
- A room's `first time` text **replaces** its description on the first visit. Put the exits and
  anything the player needs in both.
- There is no `create the player`. Make a person `playable`, give it `starts in <room>`, and
  assign the role in the single `before the game starts` block. That block takes no `phrase`;
  opening text is the header's `prologue:`.
- A person needs `proper`, or the game prints "a Morgan".
- Something on a supporter is tested with `is in`, not `is on`: `the brass bell is in the hook`.
- A door has no placement. Its place is the exit line that names it (`through the cellar door`).
  Reverse exits are inferred; write `, one-way` to prevent that.
- `after the player putting the hook` narrows a two-noun action to its other noun. The
  counterpart is the last `the ...` on the head, optionally with `at`, `for`, `from`, `about` or
  `in` before it. `on` is not one of those words: `putting on the hook` is an error.
- The published `sharpee play` prints no title and no prologue. That is the CLI, not your story.

## 4. The world

**Trait words** (bare, after the kind): `scenery`, `plural`, `proper`, `unlisted`, `concealed`,
`hiding-spot`, `openable`, `lockable with the <key>`, `transparent`, `enterable`, `climbable`,
`open-inventory`, `wearable` (or `wearable on the <part>`), `readable`, `edible`, `drinkable`,
`switchable`, `pushable`, `pullable`, `breakable`, `fragile`, `attached to the <thing>`,
`detachable`, `cuttable with the <tool>`, `diggable with the <tool>`, `flammable with the <tool>`,
`settable`, `light-source`, `dark` (rooms), `night-vision` (people), `listener`, `smelly`, `loud`,
`costs <n> <currency>`, `powered by the <thing>`. Any other bare word must be a `define trait`
name.

**Initial state** rides the kind line: `starts open|closed|locked|unlocked|on|off|lit|unlit|broken`,
each beside the trait it belongs to.

**Lines in a `create` block:** `aka a, b`; placement `in the <place>` or `on the <supporter>`;
`starts in <room>` (people); `carries the <thing>`; `wears the <thing>`; `holds <n>` (capacity of
a container or supporter); `servings <n>`; `states:`; `score <key> worth <n>`;
`counter <name> [starts <n>] [between <a> and <b>]`; `pronouns he|she|it|they`; `playable`.

**Exits** (room blocks): one per line, `north to the Hall`, or one line
`exits: south to the Lodge, north to the Cloister`. Directions: the eight compass points, `up`,
`down`, `in`, `out`. Variants:

```chord
  west is blocked while calm: west-shut
  east is deadly: over-the-parapet
  up to the Attic while the hatch is open
  passage to the Parlour
    grammar
      climb through [the] window
  end passage
  room name while alarmed:
    Parlour (bell ringing)
```

A blocked exit refuses with its phrase. An exit with `while` does not exist when the condition is
false. A `passage` is taken by typing its command and is one-way. A blocked or deadly direction
needs no exit line of its own.

**Regions:** `create the Yard, a region`, then each member room says `in the Yard`. A region block
may hold `rooms Stack 1 to 3` (numbered rooms, with a shared description after a blank line), an
`exits` table, `on every turn`, and `after the player entering` / `after the player leaving`.
Scenery placed `in the <region>` or `in the A and the B` is a backdrop present in each room.

## 5. Clauses: `on` and `after`

```chord
  on the player taking
    refuse kettle-is-hobbs
  end on

  after the player lighting, once
    award supper-lit
    phrase candles-catch
  end after

  on every turn while the cistern is frozen and the hand lamp is lit
    change the cistern to thawing
  end on
```

- `on` runs before the standard action and may refuse. If the clause prints a phrase, that
  phrase **replaces** the action's own message; if it prints nothing, the standard message still
  appears. `after` runs once the action has succeeded, adds to its output, and may not refuse
  (`refuse`, `refuse when` and `must` are errors in `after`).
- A clause is reached only if the standard action gets as far as the thing. `on the player
  pushing` on a thing that is not `pushable` never runs: the game prints "is fixed in place" and
  the clause is skipped. The same holds for `pulling` without `pullable`. Give the thing the
  trait word the verb needs.
- The gerund is the action's name: `taking`, `dropping`, `opening`, `closing`, `locking`,
  `unlocking`, `examining`, `reading`, `searching`, `entering`, `exiting`, `wearing`,
  `eating`, `drinking`, `pushing`, `pulling`, `turning`, `touching`, `lighting`,
  `extinguishing`, `attacking`, `giving`, `showing`, `throwing`, `putting` (on a supporter),
  `inserting` (in a container), and the rest of the standard set. Use the fix-it if you guess
  wrong.
- A head may list gerunds: `on the player pushing, touching`. It means one clause per gerund,
  so a `phrase` with an inline prose body under a listed head is `analysis.duplicate-phrase`.
  Declare that phrase in `define phrases` instead.
- The actor is `the player` (whoever holds the role when the clause fires) or a named person.
  A bare head (`on taking`) is legal only inside a person's own block.
- **One clause per gerund per thing.** Two `on the player examining` clauses with different
  `while` gates are `analysis.duplicate-clause`. Write one clause and branch inside it.
- Modifiers after a comma: `, once` (fires one time ever).
- On a **room**, `entering` is the player's arrival. On any other thing it is the enter action.

## 6. Statements

There is **no `if`**, no `else`, no variables, and no loops other than `each`. Control is:

| Form | Meaning |
| --- | --- |
| `refuse <key>` | stop the action and print the phrase |
| `refuse when <condition>: <key>` | prohibition, for a hazard that is present |
| `<subject> must <be ...\|have\|hold\|wear\|see\|reach> ...: <key>` | requirement, stated positively |
| `<statement> when <condition>` | a suffix on any effect statement |
| `select on <thing>'s state` + `when <state>` arms + `end select` | branch on a state |
| `select randomly\|cycling\|stopping\|sticky\|first-time` + `or` arms + `end select` | vary |
| `first time` / `second time` ... `tenth time` | ordinal blocks, in order |
| `each <condition-name>` ... `end each`, with `the match` | every thing a named condition holds for |

Two rules the compiler enforces about refusals:

- `refuse when not ...` is `analysis.negated-requirement`, and `must not ...` is
  `parse.must-negative`. A requirement is a positive `must` line. A prohibition is `refuse when`
  over something that is present.
- In a `define action`, every refusal and `must` line stands above the first effect statement.

A `when` suffix does not stop the clause. Statements after `lose ... when` still run, so a clause
with two outcomes puts a `when` on every line, and a named condition keeps that readable:

```chord
  after the player lighting
    lose lens-shatters when not lantern-ready
    award relit when lantern-ready
    win lantern-lit when lantern-ready
  end after
```

Effect statements: `phrase <key>` (or `phrase <key>` with an indented prose body, which declares
the phrase in place); `change <thing> to <state>`; `change the story to <state>`;
`move <thing> to <place>`, `move <thing> here`, `move <thing> offstage`; `remove <thing>`;
`make <person> wear|take off <garment>`; `award <score-key>`; `raise|lower <counter> by <n>`;
`set <counter> to <n>`; `win [<key>]`; `lose [<key>]`; `kill the player [<key>]`;
`start|stop|restart|reset|interrupt <timer>`; `change the player to <person>`;
`emit <event-name> with <field> <value> and ...`; and the acting statement
`<Person> <verb words>` (`Hobb gives the hush page to Ansel`), which is legal in `after`,
`when`, `on every turn` and conversation rows but not in an `on` clause.

## 7. States and conditions

```chord
  states: frozen, thawing, running
  states, reversible: silent, tolling
```

- The first state listed is the starting one. Without `, reversible` a thing moves forward
  through its list only; a `change` back is `analysis.irreversible-state`.
- `, reversible` goes **before the colon**. `states: still, tolling, reversible` compiles as
  three states.
- A state names what the thing is. A state that only negates another (`sealed`, `unsealed`) is
  `analysis.negated-state`.
- Do not declare the pairs the platform owns: open/closed, locked/unlocked, on/off, lit/unlit,
  worn/unworn, whole/broken (`analysis.shadow-state`). Compose the trait (`openable`,
  `light-source`...) and read the word live: `the lamp is lit`.
- A trait may declare `states:`. Each carrier then has its own copy, written `it is polished`
  inside the trait and `the brass bell is polished` outside.

Conditions join with `and`, `or`, `not` and parentheses. Predicates:
`<thing> is [not] <state>`, `is a <kind or story trait>`, `is in <place>`, `is here`,
`has|holds|wears <thing>`, `can see|reach <thing>`, `<counter> is at least|more than|at most|less
than <n>` (or `>= > <= <`), `one chance in <n>`, `any <condition-name>`, `no <condition-name>`,
`<timer> has started|expired`, and a bare story state or named condition (`alarmed`,
`bell-ready`).

- At 4.0.2 the story's state is read as the **bare word** (`while calm`, `when not alarmed`).
  `the story is alarmed` is an error here (`analysis.unknown-entity`), though `change the story
  to alarmed` is the correct write.
- An open condition for `each`, `any` and `no` uses `it`:
  `define condition unlit-lamp: it is a lamp and it is not glowing`.
- There is no condition that asks who the player is. Gate on a state of the person instead.

## 8. Words

Every string the player reads is a phrase with a kebab key. Declare them in one block:

```chord
define phrases en-US
  west-shut:
    The west door will not move.
```

A phrase with variants or a gate is its own block. Strategies are `randomly`, `cycling`,
`stopping`, `sticky`, `first-time`:

```chord
define phrase knock-reply, cycling
  Knock.
or
  Knock, knock.
end phrase
```

An undeclared key is `analysis.missing-phrase`. A thing can add a sentence to its own
description while a condition holds:

```chord
  phrase detail while the hand lamp is lit:
    It is burning with a small flame.
```

To change a platform message, find its alias with `npx sharpee messages`, then:

```chord
override message taking-taken
  Yours now.
end override
```

## 9. Verbs

```chord
define action knocking
  grammar
    knock on the target
    knock
  raise knocks by 1
  phrase knock-reply

extend action taking
  grammar
    pocket the item
```

- The action's name is its gerund. In `grammar`, `the <word>` is a slot, `a or b` is
  alternation, `[word]` is optional, `[the]` is an optional article beside a fixed noun.
- A slot nothing uses is a warning (`analysis.slot-unused`).
- Slot lines: `the target must be reachable|visible|held`, `the text takes the rest of the line`,
  `the subject is a topic`, `the tool is an instrument`.
- `otherwise refuse <key>` is what prints when no trait on the named thing answered.
- An action body may hold effect statements of its own, as `knocking` does. Use that for verbs
  that are about the player or the story, not about the thing named.
- `extend action <name>` adds grammar only, to a standard or story action. Use the standard
  action's own slot name: `the item` for taking, `the target` for lighting, `the portal` for
  entering.
- `remove from action taking` followed by an indented `get the item` takes that wording away;
  the player's `get lamp` is then "I don't understand that."

**A story action cannot change a platform state at 4.0.2.** See the first trap below. To make a
new word light, open, lock or switch something, extend the standard action
(`extend action lighting` with `kindle the target`) and restyle its messages with
`override message`.

### Forms that compile and do nothing (4.0.2)

Checked on the published CLI. The compiler is silent about all three.

1. `change <thing> to lit` (or `open`, `closed`, `locked`, `on`, `off`, `broken`...). It compiles,
   the clause runs and prints, and the lamp stays unlit and the chest stays closed. `change`
   writes declared `states:` only.
2. `pullable` answers **one** pull. A thing's `on the player pulling` runs the first time; after
   that the game prints "The <thing> has already been pulled." Do not hang a repeatable
   response on pulling. (And without `pullable` or `pushable` the clause never runs at all;
   see section 5.)
3. A person with `define greetings` (or another conversation block beyond a plain topic table)
   and no character-model line compiles gate-clean and then fails at load: "declares
   conversation blocks but no character model". Add a model line to the person, for example
   `mood calm`.

Observed at 4.0.2 while building a larger story (not re-run for this primer):

- A trait's `on the player <standard-gerund>` clause silently disables the own `on` and `after`
  clauses for that gerund on every thing composing the trait. Do not put a standard-action
  clause on both a trait and its carrier; repeat the line on each thing instead.
- `when <thing> moves` fires for a person arriving in a room, not for a thing being taken,
  dropped or carried.
- A timer declared `for <thing>` speaks its named turns only where that thing is. A timer with
  no `for` belongs to the story and is heard everywhere; its `when <timer> expires` clause goes in
  the story header.
- `play sound <name>` on every turn also prints "You hear <name>." to a player in earshot.
- `emit` takes one hyphenated event name (`emit media-sound-play with src "audio/toll.mp3"`). A
  dotted name is an error, and several words send an event nobody listens for.

## 10. Counting, scoring, time, endings

```chord
story
  ...
  use scoring
    rank "Visitor" at 0
    rank "Ringer" at 10
  on every turn while alarmed
    phrase alarm-rings
  end on
  when fuse expires
    change the story to alarmed
  end when

define counter knocks

define timer fuse
  hiss
    The fuse hisses.
  spit
    The fuse spits.
end timer

define sequence the day
  at turn 50
    phrase light-turning
  30 turns later
    lose night-falls when not awake
end sequence
```

- `score <key> worth <n>` lives on the thing, trait or action that earns it; `award <key>` pays
  it once. The maximum is the sum of all `score` lines. Rank thresholds are absolute points.
  The rank prints after "a" ("the rank of a Ringer"), so name ranks to suit.
- A timer names its turns and never sees a number. `start <timer>` begins it; each named turn
  prints its body; after the last it expires and `when <timer> expires` runs.
- `define counter` is story-wide; a `counter` line in a `create` block belongs to that thing and
  is read as `the bell's knocks`.
- `win <key>` and `lose <key>` end the story and print the phrase. `use chapters` with
  `define chapters`, `use combat`, `use hunger`, `use expanses` and `use sailing` are opt-in
  header lines; do not use their vocabulary without the line.

## 11. People

```chord
create Edda
  a person, proper
  pronouns she
  in the Parlour
  mood calm

  A woman knitting.

define topics for Edda
  about the red lamp: phrase edda-lamp
  about "weather", "rain":
    phrase edda-weather
end topics

define greetings for Edda
  first time: phrase edda-hello
end greetings
```

- `ask edda about rain` reaches the quoted row; `talk to edda` prints the greeting. A person
  with no greetings answers "doesn't respond".
- Topic matching drops the article, so `"the bell", "bell"` in one row is
  `analysis.duplicate-topic`. Write one spelling.
- `a person, follower` follows the player from room to room. `wanderer` and `patrol` are the
  other stock behaviors.
- Shaped conversation (`define exchange`, `define conversation`, `define manner`,
  `define initiative`), the character model (`feels`, `knows`, `thinks`, personality words) and
  principles (`never`, `protects`, `temperament`) exist and are large. Do not write them from
  memory. Ask the user for a working example, or build one line at a time against the compiler.

## 12. Tests

One tree per story, in a directory named `<story-id>.tests/` beside the `.story` file.

`manifest.json`:

```json
{
  "seed": 42,
  "story": "cellar-bell",
  "version": 3
}
```

One segment file per run of cards, named for its 8-character id, for example `k3m9x2aa.json`:

```json
{
  "cards": [
    {
      "assertions": {
        "contains": [
          "Kitchen"
        ]
      },
      "id": "c0000001",
      "type": "boot"
    },
    {
      "command": "take all from dresser",
      "id": "c0000003",
      "skip": true,
      "type": "turn"
    },
    {
      "assertions": {
        "contains": [
          "clear as a struck glass"
        ],
        "states": [
          "the story is rung"
        ]
      },
      "command": "ring bell",
      "ending": "bell-rung",
      "id": "c0000013",
      "type": "turn"
    }
  ],
  "id": "k3m9x2aa"
}
```

- The file must be in **canonical form** or the run refuses it: two-space indent, object keys
  sorted alphabetically at every level, a trailing newline. Write it with a script that sorts
  keys; do not hand-format.
- The segment's own `id` must equal its file name.
- Card types: `boot` (the opening look), `turn` (a `command`). A card has `assertions` or
  `"skip": true`; a card with neither fails.
- Assertions: `contains` and `notContains` (lists of text), `states` (Chord conditions: `the
  brass bell is polished`, `the cellar door is open`, `the story is rung`). A `states` line on
  `lit` fails with "declares no states"; assert on the printed text for light.
- To learn what a turn prints, write it as a skip card and run
  `npx sharpee test <dir> --json --capture-output`; each `command-result` record carries
  `actualOutput`.
- A branch is another segment file with `"parent": "<segment id>"` and `"ordinal": <n>`. It
  continues from the end of its parent.
- `sharpee test` also derives a test from each clause and lists the ones it could not arrange as
  SKIPPED. Skipped derived tests do not fail the run. A failing card does (exit 1).

## 13. Removed forms

Older Chord, and guesses from other IF languages, produce these. Each is an error with a fix-it.

| Do not write | Write |
| --- | --- |
| `story "Title" by "Author"` | bare `story`, then `title:` and an `authors:` list |
| `version:`, `blurb:`, `by:` in the header | `story-version:`, `description:`, `authors:` |
| `create the player` | a `playable` person and `change the player to <name>` in the start block |
| `if` / `else` / `end if` | `must`, `refuse when`, a `when` suffix, or `select` |
| `define flag`, `define score` | `states:` on the owner; `score <key> worth <n>` on the owner |
| `define verb` | `extend action <name>` with a `grammar` line |
| top-level `when ...` or `every N turns` rules | a clause on the owner; `define sequence` |
| `on touching it` | `on the player touching` |
| `a thing with weight 3` | a kind takes no `with`; capacity is `holds <n>` |
| `define text ... from`, `define action ... from` | `define phrase`; a `define action` block |

## 14. Before you say you are done

- `compose --check` prints gate-clean.
- Every clause you wrote was reached in `sharpee play`, and you read its output.
- Nothing you wrote appears in the "compile and do nothing" list.
- The test tree pins the path, and `sharpee test` exits 0.
- You changed no story content beyond what was asked.
