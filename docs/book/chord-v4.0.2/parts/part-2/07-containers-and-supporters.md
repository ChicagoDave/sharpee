# Containers and supporters

A thing can be picked up and put down. This chapter adds the two kinds that
other things can be put into and onto, and with them the first puzzle-shaped
object in The Relighting: a closed crate with something in it.

## Two kinds that hold

**`a container`** is a thing with an inside. Things go in it.

**`a supporter`** is a thing with a top. Things go on it.

Each is a kind, so it takes the place of `a thing` on the first line of the
block. A container is already a kind of thing, and you do not write both.

```chord
create the reading desk
  aka desk
  a supporter, scenery
  in the Library

  The first desk of the first row, with a slope for a book and a rail to
  keep it there.

create the grimoire
  aka book
  a thing
  on the reading desk

  A book as long as your forearm, chained to nothing any more. Its pages
  are blank, or were. Here and there a line of ink has come back, as
  frost comes onto a window.
```

The grimoire's placement is new. Chapter 6 placed things with `in the`
followed by a room. A thing may equally be `in the` a container or `on the` a
supporter. The grimoire is `on the reading desk` because the desk is a
supporter. Take care to use the word that fits the kind, because the compiler
does not check it for you.

The player needs no new commands. Putting, taking and looking all understand
containers and supporters already.

```text
> west
Library
The reading room of Lanternhall, with its desks in rows and its galleries of shelves. The stacks run back to the north, out of the light. The cloister is east.

On the reading desk you see a grimoire.

> take book
You take the grimoire from the reading desk.

> put book on desk
You put the grimoire on the reading desk.
```

The desk is scenery, so the room does not list it. What is on the desk is
listed all the same, in a sentence of its own. Scenery hides the holder and
not what it holds.

## Opening and closing

A container may be given a lid. The trait word is `openable`, and beside it
you say how the container begins.

```chord
create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing
  in the crate

  A disc of glass as wide as a cartwheel, ground in rings. A crack runs
  across it from edge to edge.
```

`starts closed` and `starts open` are the two choices. What is inside a closed
container cannot be seen or touched, and for the player it does not exist
until the lid comes off.

```text
> take lens
You can't see any such thing.

> open crate
You open the crate.

In the crate you see a lens.

> take lens
You take the lens from the crate.
```

This is the smallest puzzle there is, and half the puzzles in interactive
fiction are elaborations of it. Something is wanted, it is inside something
else, and the player has to think of opening it.

A container that is not `openable` has no lid. It is always open, and it
cannot be closed.

## How much it holds

The line `holds`, followed by a number, limits how many things a container or
a supporter can have in it or on it at once. The crate holds one, and that one
is the lens.

```text
> put taper in crate
There's no room in the crate.
```

`holds` goes with the short facts, on a line of its own. It counts things and
knows nothing of their size, so a crate that `holds 1` will take a lens the
width of a cartwheel or a wax taper, but not both. Without a `holds` line
there is no limit.

The Great Lantern on the roof is now a container as well. It has a seat for
exactly one lens, so it `holds 1`, and it has no lid.

```chord
create the Great Lantern
  aka lantern
  a container, scenery
  in the Lantern Gallery
  holds 1
```

Carry the lens up to the roof and the story lets you seat it, though nothing
comes of that until Part III.

```text
> put lens in lantern
You put the lens in the Great Lantern.
```

## A cupboard on the wall

The oak press in the Lodge is the same construction as the crate, with
`scenery` added so that it stays on its wall.

```chord
create the oak press
  aka press, cupboard
  a container, scenery, openable, starts closed
  in the Lodge
  holds 6

  A shallow cupboard on the wall with a row of hooks inside, each hook
  under a painted label. Most of the labels have faded past reading.
```

It is empty, and the story notices:

```text
> open press
You open the oak press, which is empty.
```

The next chapter hangs a key in it. Since the press is scenery, the room will
not mention it, so the Lodge's description gains a clause that does: "and an
oak press hangs on the wall beside it".

## Seeing through, and saying it yourself

Two trait words change what the player is told about a holder's contents.

**`transparent`** is for a container that can be seen into while it is shut.
Its contents are visible and cannot be reached. Here is a bell jar from
another story:

```chord
create the bell jar
  aka jar
  a container, openable, transparent, starts closed
  in the Den
  holds 1

  A glass bell jar.

create the moth
  a thing
  in the bell jar

  A grey moth.
```

```text
> examine jar
A glass bell jar.

In the bell jar you see a moth.

> take moth
You can't reach the moth.
```

**`unlisted`** is for a holder whose contents your own prose has already
described. Suppose a room's description says that a table stands under the
window with a cold supper laid on it. The supper is a thing on the table, and
without help the story would add "On the table you see a supper", which says
the same thing twice and less well. Mark the table `unlisted`, and that
sentence is never printed. The supper is still there to be taken.

```chord
create the table
  a supporter, scenery, unlisted
  in the Den

  A table laid for supper.
```

## Getting into things

The trait word **`enterable`** lets the player get into a container or onto a
supporter. Hobb's chair becomes a supporter so that things can be put on it,
and enterable so that Ansel can sit in it.

```chord
create the chair
  a supporter, scenery, enterable
  in the Lodge

  A wing chair that has taken the shape of one man.
```

```text
> enter chair
You get into the chair.

> north
You're not in a place where you can go anywhere.

> exit
You get out of the chair.
```

The command that works is `enter chair`. A player's first thought will be
`sit on chair`, which the story does not yet understand, and chapter 25 adds
it in two lines. While Ansel is in the chair the directions do not work, as
you would hope.

## Build and try it

Add the press, the desk, the grimoire, the crate and the lens. Change the
chair and the Great Lantern to their new kinds, and add the clause about the
press to the Lodge's description. The complete file is in the companion folder
`chapter-07`. Check it and play it.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Try putting a thing you are not holding onto a supporter. The story picks it
up for you first and says that it has.

```text
> put kettle on chair
(first taking the kettle)

Taken.

You put the kettle on the chair.

> look
The Porter's Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame, and an oak press hangs on the wall beside it. The door to the court is north.

You can see a hand lamp and Hobb here.

On the chair you see a kettle.
```

Then walk to the Undercroft, open the crate, and carry the lens to the roof.
That walk is a third of the finished game, and so far nothing stands in its
way.

::: under-the-hood
**Under the Hood: one trait, two actions** · `if.action.opening`

`a container` becomes the container trait and `a supporter` the supporter
trait. `openable` adds a third trait, which holds one fact: whether the thing
is open. The standard `opening` and `closing` actions change that fact, and
they are the only two that do. Every other action reads it. `taking` and
`examining` ask whether a container is open before they will look inside, and
that single question is the whole of the crate's puzzle. `holds` is the
container's capacity, and the `putting` and `inserting` actions read it before
they will add anything.
:::

::: from-another-system
**From another system: holders**

Inform 10 has container and supporter as kinds, with openable, transparent and
enterable as properties, and a carrying capacity that counts things. Chord's
arrangement is the same in every one of those respects, down to the capacity
being a count. TADS 3 authors will find it coarser than they are used to.
There are no bulk and weight here, and no distinction between a surface, an
underside and a rear. A container has one inside, a supporter has one top, and
a thing is one or the other.
:::

## What you have so far

Things can now be in and on other things. The lens is in a crate, the grimoire
is on a desk, there is a press on the Lodge wall with nothing in it, and the
Great Lantern will take a lens. What the story still lacks is anything that
stops the player. The next chapter adds the first thing that does: a locked
door.
