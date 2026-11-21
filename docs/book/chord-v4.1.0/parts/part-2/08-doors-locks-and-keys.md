# Doors, locks and keys

Until now every way in Lanternhall has stood open. This chapter closes one.
The Library goes behind a locked door, its key goes into the press in the
Lodge, and the player has, for the first time, somewhere they cannot go until
they have done something else.

## A door

A door is a kind of its own. It is created like anything else, with one
difference you will notice at once.

```chord
create the library door
  a door, openable, lockable with the library key, starts locked

  Oak, banded with iron, and carved with an open book whose pages have
  been left smooth.
```

There is no placement line. A door is not in a room. It is between two rooms,
and it gets its place from the exit that passes through it.

```chord
create the Cloister, a room
  east to the Refectory
  west to the Library through the library door
  north to the Bell Stair
  down to the Undercroft
```

The words `through the library door`, added to the end of an exit line, put
the door on that exit. Because an exit runs both ways, the door stands on both
sides. The player can examine it, open it and lock it from the Cloister and
from the Library, and you write it once.

If you give a door a placement, or create a door and never put it on an exit,
the compiler stops you. This is the second case:

```text
relighting.story:86:1 error [analysis.door-unconnected] Door `library door` is never referenced by a `through` exit line — an unconnected door is unanswerable (its room pair could never resolve). Add `<direction> to the <room> through the library door` on a room.
```

A door begins closed, and the player must open it before walking through.
That is true even of a door written with nothing but its kind, `a door`.

## A lock and its key

The library door has three trait words after its kind. `openable` you know
from the crate. The other two are new.

**`lockable with the library key`** gives the door a lock and names the thing
that works it. This is the first trait word you have met that takes more words
after it. Those words are called a **setting**, and here the setting is the
key.

**`starts locked`** says how the door begins. Like `starts closed`, it is a
starting state, and it needs its trait word beside it. Write `starts locked`
on something that is not `lockable` and the compiler objects:

```text
relighting.story:87:21 error [analysis.starts-state-pairing] `starts locked` requires `lockable` composed on this entity.
```

The key is an ordinary thing. Nothing in its own block says that it is a key.
It is a key because a lock names it.

```chord
create the library key
  a thing
  in the oak press

  A long key with a book cut into its bow.
```

It hangs in the oak press in the Lodge, which chapter 7 left empty. The press
is closed, so the key cannot be seen until the press is opened, and now the
story has a chain of three steps: open the press, take the key, unlock the
door.

## Playing it

Walk to the Cloister without the key and try the door.

```text
> west
The library door is locked.

> open door
The library door is locked.
```

Go back for the key, and try again.

```text
> open press
You open the oak press.

In the oak press you see a library key.

> take key
You take the library key from the oak press.
```

```text
> unlock door with key
You unlock the library door with the library key.

> west
The library door is closed.

> open door
You open the library door.

> west
Library
The reading room of Lanternhall, with its desks in rows and its galleries of shelves. The stacks run back to the north, out of the light. The cloister is east.

On the reading desk you see a grimoire.
```

Every one of those replies is the platform's. You declared a door, a lock and
a key, and the refusals, the unlocking and the opening all followed. The same
is true of the wrong key, tried while the door is still locked:

```text
> unlock door with taper
The wax taper doesn't fit the library door.
```

## Saving the player a step

Unlocking a door and then opening it are two commands for one intention. If
you would sooner the door opened as it unlocked, add one line to its block.

```chord
create the library door
  a door, openable, lockable with the library key, starts locked
  opens when unlocked
```

```text
> unlock door with key
You unlock the library door with the library key, and it swings open.
```

The Relighting leaves this line out, because it wants the player to stand at
the open door for a moment before going in. It is a matter of pace, and yours
to choose for each door.

## Locks on other things

A lock is not only for doors. Anything `openable` may be `lockable` as well,
with the same words. A strongbox is a container that is `openable, lockable
with the brass key, starts locked`, and it behaves as the door does: it cannot
be opened until it is unlocked, and it is unlocked with its key.

One key can work several locks. Name the same key in each of them.

## Naming keys

Chapter 6 warned about two things that answer to the same word. Keys are
where that warning matters most, because stories collect them. In a draft of
this chapter Ansel arrived carrying a ring of keys, and with the library key
in the same room, `take key` had two possible meanings. The story asked:

```text
> take key
Which do you mean: the key ring or the library key?
```

The ring was taken out of the story for this reason alone. Two keys are both
keys, so you cannot give them names that share no word. Plan instead for them
never to be carried at once, or accept that the player will sometimes be
asked.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-08` over your own
file. It is the story with this chapter's changes made. To make the changes
by hand instead, work from this list and take the rest from that file: add
the door and the key, put the door on the Cloister's west exit, and change
"the library west" to "the library door west" in the Cloister's description.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Play the chain from the Lodge to the Library. Then, standing in the Library,
close the door and lock it behind you, and try to leave.

```text
> close door
You close the library door.

> lock door with key
You lock the library door with the library key.

> east
The library door is locked.
```

The door is the same door from both sides.

::: under-the-hood
**Under the Hood: one fact, many readers** · `if.action.unlocking`

`lockable` becomes the lockable trait, which holds two facts: whether the
thing is locked, and which thing is its key. The standard `locking` and
`unlocking` actions change the first fact, and they check the second before
they do. The `opening` action reads the lock and refuses a locked thing, and
the `going` action reads the door on an exit and refuses a closed one. That is
why you got two different refusals at the same door, "locked" and then
"closed": two actions were each reading the fact that concerned them.
:::

::: from-another-system
**From another system: doors**

In Inform 10 a door is a kind: you connect two rooms by way of a named thing,
say that the thing is a door, and give a lock its matching key. In TADS 3 a
door is usually two objects, one for each side, linked to each other. Chord's
door is one thing with no location of its own, attached to an exit. You never
make a second side, and you never say where the door is. If your instinct is
to place it in a room, the compiler will remind you not to.
:::

## What you have so far

The Library is locked, and the way in runs through the Lodge. The Relighting
has its first puzzle with more than one step. Everything in it so far, though,
is a thing to be carried, opened or unlocked. The next chapter surveys the
other things a thing can be.
