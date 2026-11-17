::: {.part-page}

# Part II. The world {.part .unnumbered}

:::

# Rooms and exits

One room is a place to stand. A world is rooms with ways between them. In this
chapter The Relighting grows from the Lodge to all eight rooms of Lanternhall,
and by the end of it you can walk from the gate to the roof.

## What `create` does

Everything in a story's world is made with a `create` block. The header line
gives the thing its name, and the first fact beneath it says what kind of thing
it is.

```chord
create the Lodge
  a room
```

The first fact is so nearly universal that Chord lets you fold it onto the
header line, after a comma. This book writes rooms that way from here on.

```chord
create the Lodge, a room
```

Every `create` block names exactly one kind, and the kind comes first. If you
leave it out, as in a block that begins `create the Refectory` and never says
what the Refectory is, the compiler lists the kinds there are:

```text
relighting.story:54:1 error [analysis.missing-kind-noun] `Refectory` names no kind. Begin its block with one: `a room`, `a door`, `a person`, `a container`, `a supporter`, `a region`, or `a thing` for anything that is not a room, door, person, container, supporter or region.
```

That list is most of Part II. You have met `a room` and `a person`. Chapter 6
covers `a thing`, chapter 7 `a container` and `a supporter`, chapter 8 `a door`
and chapter 11 `a region`.

The name is yours to choose. Write it as you want the player to read it, with
`the` in front if it is the kind of name that takes one. The player sees the
name of a room as the heading over its description.

## Exits

An **exit** is a way out of a room. It is one line in the room's block: a
direction, the word `to`, and the room it leads to.

```chord
create the Lodge, a room
  north to the Gate Court

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame. The
  door to the court is north.
```

The exit line goes with the short facts, above the blank line. The room it
names does not have to be created yet. It only has to be created somewhere in
the file.

There are twelve directions: `north`, `south`, `east` and `west`, the four
between them (`northeast`, `northwest`, `southeast`, `southwest`), and `up`,
`down`, `in` and `out`.

Notice the sentence added to the end of the Lodge's description: "The door to
the court is north." The story does not list a room's exits for the player.
Telling the player which ways lead out is the description's job, and a room
whose description forgets to do it is a room the player cannot leave except by
trying every direction.

## The way back is free

An exit works in both directions. Because the Lodge has `north to the Gate
Court`, the player can also go south from the Gate Court to the Lodge. You do
not write the second line.

You may write it if it makes the file easier to read, as long as it agrees.
The Gate Court does so, and uses the second way of writing exits while it is
about it:

```chord
create the Gate Court, a room
  exits: south to the Lodge, north to the Cloister
```

The `exits:` line holds several exits on one line, separated by commas. It
means exactly what the same exits would mean on separate lines. Use whichever
reads better for the room in hand.

What you may not do is contradict yourself. A room has one exit in each
direction, and the free way back counts. Suppose the Den goes `up to the
Attic`, and the Attic then says `down to the Cellar`. The compiler objects,
and its message is one of the most helpful in the language:

```text
relighting.story:12:3 error [analysis.duplicate-exit] `Attic`'s `down` exit leads to `Cellar`, but `Den`'s `up to the Attic` (line 7) also makes `down` from `Attic` lead back to `Den`. If that line should not lead back, write it `up to the Attic, one-way`.
```

## One-way exits

That message names the remedy. An exit followed by `, one-way` has no way
back.

```chord
create the Den, a room
  up to the Attic, one-way
```

The player can climb from the Den to the Attic and cannot climb down again by
that route. If the Attic has no other exit, going down from it prints the
platform's line for a room with no ways out at all:

```text
> down
There are no obvious exits.
```

On an `exits:` line the words go before the colon and apply to every exit on
the line, as in `exits, one-way: up to the Attic`.

The Relighting has no one-way exits yet. Use them sparingly. A player who
cannot go back the way they came should be able to tell why from the prose.

## The rest of Lanternhall

Here are the six rooms that complete the map. Read the exit lines against the
descriptions, and notice that only one room of each connected pair declares
the way between them.

```chord
create the Cloister, a room
  east to the Refectory
  west to the Library
  north to the Bell Stair
  down to the Undercroft

  A covered walk around a garth gone to nettles. The refectory is east,
  the library west, and the foot of the bell stair north. Worn steps go
  down under the hall.

create the Refectory, a room

  Three long tables and a hearth you could stable a horse in. The
  benches are stacked against the wall, where someone left them for the
  holidays. The cloister is back to the west.

create the Library, a room

  The reading room of Lanternhall, with its desks in rows and its
  galleries of shelves. The stacks run back to the north, out of the
  light. The cloister is east.

create the Undercroft, a room

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone. The steps go back up.

create the Bell Stair, a room
  up to the Lantern Gallery

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs. The cloister is south.

create the Lantern Gallery, a room

  The roof of the tower, open on every side. The Great Lantern stands in
  the middle of it on a stone drum, taller than you are, its glass
  thirty years dirty. The stair goes back down.
```

The Cloister is the hub, so it carries four exit lines and the rooms around it
carry none. That is a matter of taste. Putting the exits on the hub keeps the
whole map of the Hall in one place in the file.

## The first visit

A room may say something different the first time the player walks into it.
The Gate Court does.

```chord
create the Gate Court, a room
  exits: south to the Lodge, north to the Cloister

  A square of worn flagstones between the gate and the cloister arch.
  Grass has come up through the joints and been left to get on with it.
  Over the gate, a line of cut letters says that the craft needs a light
  to come home to.

  first time
    You crossed this court every morning for a term, late, with your
    books under your arm. It was larger then. The cloister arch is
    still north of you.
```

The `first time` block comes after the description, and its text is indented
one level further beneath it. On the first visit the player reads that text in
place of the description. On every later visit, and whenever they type `look`,
they read the description.

```text
> north
Gate Court
You crossed this court every morning for a term, late, with your books under your arm. It was larger then. The cloister arch is still north of you.

> look
Gate Court
A square of worn flagstones between the gate and the cloister arch. Grass has come up through the joints and been left to get on with it. Over the gate, a line of cut letters says that the craft needs a light to come home to.
```

Because the first-visit text replaces the description, anything the player
needs from the description has to be in both. That is why the first-visit text
ends by saying where the cloister arch is. Without that sentence, a player
walking into the Gate Court for the first time would be told nothing about the
way north until they typed `look`.

## A heading of its own

The name you give a room in its `create` line is the name you use for it
everywhere in the file, so a short one is convenient. It is also, by default,
the heading the player reads, and there you may want something fuller. A
`room name` block gives the room a heading that is separate from its name.

```chord
create the Lodge, a room
  north to the Gate Court

  room name:
    The Porter's Lodge
```

You go on writing `the Lodge` in your own lines, and the player reads:

```text
> south
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame. The door to the court is north.
```

Without the block, the heading is the room's name with its `the` removed,
which is why the other rooms read "Gate Court" and "Cloister".

## Build and try it

Add the seven new rooms and the changes to the Lodge to your
`relighting.story`, and raise `story-version:` to `0.2.0`, since this is the
first chapter of Part II. The complete file for this chapter is in the book's
companion files, in the folder `chapter-05`. Check the story, then play it.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk the whole map. From the Lodge, the commands `north`, `north`, `north` and
`up` take you to the roof.

```text
> north
Bell Stair
The foot of the tower. A stair winds up around the well where the bell rope hangs. The cloister is south.

> up
Lantern Gallery
The roof of the tower, open on every side. The Great Lantern stands in the middle of it on a stone drum, taller than you are, its glass thirty years dirty. The stair goes back down.
```

Then try a direction that has no exit, in a room that has others.

```text
> east
You can't go that way.
```

If a room you expected is unreachable, the usual cause is a misspelled name on
an exit line. The compiler catches that, and guesses what you meant:

```text
relighting.story:30:39 error [analysis.unknown-entity] No entity named `Cloyster` — did you mean `cloister`?.
```

::: under-the-hood
**Under the Hood: the going action** · `if.action.going`

Typing a direction runs one of the platform's standard actions, called
`going`. An exit line gives that action somewhere to go. Each of the twelve
directions is a word the action already understands, along with its short
form, such as `n` for `north`. You did not define any of that. The directions
are a closed list in the language. Chapter 12 shows the ways an exit can be closed, hidden or made
dangerous, and all of them work by giving `going` a reason to refuse.
:::

::: from-another-system
**From another system: the map**

Inform 10 builds its map from sentences such as "The Gate Court is north of
the Lodge", and it also makes the way back for you unless you say otherwise.
TADS 3 gives each room a property for each direction, and there you write both
directions yourself. Chord sits with Inform 10 on this point: one line makes a
two-way connection, and you ask for one-way when you want it. Where Chord
differs from both is that a room's exits are lines inside that room's own
block. There is no separate place where the map is described.
:::

## What you have so far

Lanternhall has its eight rooms, and every one of them can be reached. They
are empty. The descriptions promise a lamp, a kettle, a gate, a hearth and a
Great Lantern, and not one of them exists. The next chapter starts keeping
those promises.
