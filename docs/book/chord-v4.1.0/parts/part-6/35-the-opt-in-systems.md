# The opt-in systems

<!-- PENDING (Phase 4, 2026-11-16): GH #781. This chapter does not say how a
     player is fed under `use hunger`, or show a hostile combatant attacking,
     because neither could be shown working. The `all`, `collapsed` and
     `combined` announce modes were not run. -->

The Relighting's header has four lines that begin with `use`.

```chord
story
  title: The Relighting
  id: relighting
  use scoring
    rank "Latecomer" at 0
    rank "Second-Year" at 10
    rank "Journeyman" at 30
    rank "Lamplighter" at 50
  use chapters
  use expanses
  use sailing
```

Each arrived in the chapter that needed it. This chapter is about the line
itself, and about two systems the game does not use. Nothing here is added
to The Relighting. A story about relighting a lantern does not need a
fight in it, and it should not grow one to fill a chapter.

## What `use` means

Most of Chord is always available. Rooms, things, people, clauses, timers,
conversations and machines need no permission.

A few systems are larger than a word. They bring vocabulary of their own,
they run something on every turn, and they print lines the author did not
write. A story that does not want them should not pay for them or be
surprised by them. Those systems are opt-in, and `use <name>` in the story
header is how a story opts in.

A `use` line does two things. It admits the system's words, so that the
compiler will accept `an expanse` or `combatant`. And it tells the
platform to start the system when the story loads.

The rules are few. A `use` line goes in the story header and nowhere else.
Each system is named once. All but two are a single line: `use scoring`
carries its rank ladder beneath it, as chapter 18 showed, and `use hunger`
carries its own lines, below. A system may need another, as sailing needs
expanses, and the compiler says so.

Using a word without its line is an error that names the line. So is a
`use` line for something that needs none. People and machines are core,
and `use npc` is refused.

| Line | What it brings | Chapter |
| --- | --- | --- |
| `use scoring` | `score`, `award`, the rank ladder | 18 |
| `use chapters` | `define chapters`, `during`, `before`, `after` | 19 |
| `use expanses` | `an expanse`, landmarks, `movement: open` | 34 |
| `use sailing` | `wind:`, the `sailing` block, `sails:` | 34 |
| `use combat` | `combatant`, `weapon`, fighting | this one |
| `use hunger` | a hunger meter with rungs | this one |

## Combat

`use combat` brings two trait words. A person who can fight is a
`combatant`, and a thing to fight with is a `weapon`.

```chord
story
  title: The Cellar
  id: cellar
  use combat
  authors:
    Nobody

create the rat
  a person, combatant with health 3 and skill 20 and base-damage 1
  in the Cellar

  A rat the size of a boot.

create the poker
  a thing, weapon with damage 3
  in the Cellar

  An iron poker.
```

Both words take settings, written with `with` and `and` as the behaviour
words of chapter 26 do. `health` is how much damage a combatant can take.
`skill` is how likely its blows are to land, and `base-damage` is what a
blow does bare-handed. A weapon's `damage` is what it adds.

The standard `attack` action has been in the grammar all along. Against
something that is not a combatant it does nothing of consequence. Against
a combatant it is a fight.

```text
> attack rat
You land a solid blow on the rat, dealing 1 damage!

> take poker
Taken.

> attack rat with poker
You have slain the rat!
```

An attack may also miss: "You swing at the rat but miss!" Whether it does
is a roll against skill, and the roll comes from the story's seeded random
numbers, so a test tree that pins a fight sees the same fight every time.

All of these lines are standard messages. A story with combat in it will
want its own, and chapter 22's `override message` is how.

The appendix of trait words lists every setting the two words take. Reach
for combat when fighting is part of what your game is. A single guard who
must be got past is better written as a blocked exit and a clause, with
prose you control, than as a system of numbers that the player meets once.

## Hunger

`use hunger` gives the player a meter that rises with time.

```chord
story
  title: The Yard
  id: yard
  use hunger
    grows 1 each turn
    peckish at 2 says hunger-peckish
    hungry at 4 says hunger-hungry
    fatal at 9
  authors:
    Nobody

define phrases en-US
  hunger-peckish:
    You could eat.
  hunger-hungry:
    You are hungry now, and thinking about the loaf.
```

The lines beneath `use hunger` are its settings. `grows <n> each turn` is
the rate. Each line of the form `<name> at <n>` is a **rung**: a level of
the meter with a name of your choosing. A rung may end with `says` and a
phrase, and the phrase is printed once, when the meter first reaches the
rung. `fatal at <n>` is the level at which the player dies.

```text
> wait
Time passes...

> wait
Time passes...

You could eat.

> wait
Time passes...

> wait
Time passes...

You are hungry now, and thinking about the loaf.
```

Left alone, the meter reaches nine.

```text
> wait
Time passes...

You have starved to death.
```

This is the form of chapter 18's rank ladder, turned upside down. A rank
is a threshold on a number that rises as the player does well, and a rung
is a threshold on a number that rises as time passes. Both speak once on
the way up.

### Announcing

A system that crosses thresholds has to decide how much to say about it.
A `use` line may end with `, announce` and a mode.

```chord
use hunger, announce silent
```

`silent` prints nothing at a rung. The meter still rises, and the fatal
level still ends the game with its line. The other modes are `all`, which
is the default and reports every rung as it is reached, and `collapsed`
and `combined`, which say less when several rungs are crossed at once.

The suffix is allowed on any `use` line, and it matters for the ones that
count something, which are hunger and scoring.

## Choosing

An opt-in system saves work when its model is the model your game has.
Scoring is that for most games, and The Relighting used it without a
second thought. Expanses were that for one scene of this game and would
have been absurd for the rest.

When a system's model is nearly what you want, be careful. You will spend
the saved work bending it. A meter is a counter, a rung is a comparison,
and a starving player is `kill the player` with a `when` on it. Chapter 18
gave you all three, and a story that wants a thirst that only matters in
one desert can write it in ten lines and own every word.

## Build and try it

There is no companion snapshot for this chapter. The two examples above
are complete stories once each has a room and a player, and you can build
them as you built the first story in Part I.

```shell
sharpee compose cellar.story --check
sharpee play .
```

::: under-the-hood
**Under the Hood: a manifest for each system** · Story IR `uses`, `announceModes`

Each opt-in system is described to the compiler by a small manifest: its
name, the trait words it adds, and the settings each word takes with their
types. That is how `weapon with damage three` can be an error at build
time though the compiler knows nothing about fighting. The compiled IR
lists the systems a story opted into under `uses`, and any `announce`
suffix under `announceModes`. When the story loads, the platform starts
one plugin for each name in `uses`, and each plugin takes its turn in the
cycle after the player's command.
:::

::: from-another-system
**From another system: extensions**

Both Inform 10 and TADS 3 handle this with libraries that a story
includes. An Inform story writes "Include", the name of an extension and
its author, as in "Include Rideable Vehicles by Graham Nelson." A TADS 3
project names its libraries in the project file, with a `-lib` line for
each. A Chord `use` line is narrower than either. It turns on a system
that ships with the platform, and it cannot name code that the story's
author wrote.
:::

## What you have so far

That is Part VI. You have every part of the language that builds a world
and makes it move: rooms and things, clauses and conditions, phrases and
verbs, people who act and talk and feel, machines, vehicles, open water,
and the systems a story may opt into.

Two things remain. The player meets a story through a page, with sound and
pictures and a layout, and Part VII is about that page. And a story that
you mean other people to play has to be proved and shipped, which is Part
VIII.
