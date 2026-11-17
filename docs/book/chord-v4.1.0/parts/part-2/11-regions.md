# Regions

Rooms belong together. The Lodge and the Gate Court are the part of
Lanternhall a visitor is allowed to see, and everything past the cloister arch
is the college proper. A **region** is how a story says that. It is a named
group of rooms, and once the group has a name, other parts of the story can
speak about all its rooms at once.

A region changes nothing the player can do. It is a tool for you. This chapter
uses it for three things: placing scenery across many rooms, making a run of
similar rooms without writing each one, and laying out a set of exits as a
table. Part III adds a fourth, which is making something happen when the
player crosses from one region to another.

## Making a region

A region is created like anything else, and it is the last of the kinds.

```chord
create the Grounds, a region

create the Hall, a region
```

A region has no description, because the player is never in a region. They
are in one of its rooms. It has no placement either, and a region cannot be
put inside another one.

## Putting rooms in it

A room joins a region with a line in its own block, `in the` followed by the
region's name.

```chord
create the Lodge, a room
  in the Grounds
  north to the Gate Court

create the Gate Court, a room
  in the Grounds
  exits: south to the Lodge, north to the Cloister
```

The six rooms behind the arch each take `in the Hall` in the same way. A room
may be in one region or in none. Two `in` lines on one room is an error:

```text
relighting.story:35:3 error [analysis.room-two-regions] `Lodge` already names a region on line 34 — a room is in at most one region. Remove one of the `in` lines.
```

This is the same word `in` that places a thing in a room, and the compiler
tells the two apart by what is being placed and where. A room goes in a
region. A thing goes in a room, and a thing may not be placed in a region
directly, since it would then have no particular room to be in. There is one
exception, and it is the useful one.

## Scenery for a whole region

Chapter 6 made the gate a backdrop by listing its rooms. Scenery placed in a
region is a backdrop in every room of that region, with no list to keep up to
date.

```chord
create the bell tower
  aka tower
  a thing, scenery
  in the Grounds

  The tower of Lanternhall stands over everything, square and grey, with
  the dark glass of the Great Lantern at the top of it.
```

The tower can be examined from the Lodge and from the Gate Court. Past the
arch the player is underneath it and cannot see it.

```text
> examine tower
The tower of Lanternhall stands over everything, square and grey, with the dark glass of the Great Lantern at the top of it.

> north
Cloister
A covered walk around a garth gone to nettles. The refectory is east, the library door west, and the foot of the bell stair north. Worn steps go down into the dark under the hall.

> examine tower
You can't see any such thing.
```

If a room is later added to the Grounds, the tower is visible from it without
another word from you. That is the argument for regions in one example: say a
thing once, at the level where it is true.

## A run of rooms

The Library's description says that its stacks run back to the north. They
are three rooms, alike in everything but their number. Writing three `create`
blocks with the same description would be tedious and would invite the three
to drift apart, so a region can make them as a group.

```chord
create the Hall, a region
  rooms Stack 1 to 3

    Shelves rise on both sides to a ceiling you cannot make out. Every
    spine is blank.
```

The line `rooms Stack 1 to 3` makes three rooms, named `the Stack 1`, `the
Stack 2` and `the Stack 3`, all of them in the Hall. The paragraph beneath it,
after a blank line and indented one level further, is the description they
share. A group may also carry trait words such as `dark`, a `first time`
block and a `room name` block, and each room in the group gets its own copy.

The rooms are real rooms. You can name any of them elsewhere in the file,
place things in them, and give one of them an exit the others do not have.

## A table of exits

The three stacks need joining to each other and to the Library. You could
write those exits in the Library's block, but the stacks have no blocks of
their own to hold the rest. A region can instead carry a table of exits, with
one row for each room that has any.

```chord
  exits
    the Stack 1: south to the Library, north to the Stack 2
    the Stack 2: north to the Stack 3
```

The table begins with the word `exits` on a line by itself, with no colon.
Each row is a room of the region, a colon, and that room's exits separated by
commas. The exits are the same as exits written anywhere else. They work both
ways, so these two rows make the whole run from the Library to the last stack
and back.

```text
> north
Stack 1
Shelves rise on both sides to a ceiling you cannot make out. Every spine is blank.

> north
Stack 2
Shelves rise on both sides to a ceiling you cannot make out. Every spine is blank.

> north
Stack 3
Shelves rise on both sides to a ceiling you cannot make out. Every spine is blank.

> north
You can't go that way.
```

Every row of the table must be a room of that region. The Library is in the
Hall, so `south to the Library` is allowed as a destination, and a row for a
room of the Grounds would be refused.

Be careful not to confuse the table with the `exits:` line from chapter 5.
The line has a colon after `exits` and lives in a room's block. The table has
no colon after `exits`, lives in a region's block, and has its colons after
the room names.

## A backdrop for the stacks

The stacks, like every room, have made a promise: shelves and spines. A
backdrop over the Library and its three stacks keeps it.

```chord
create the shelves
  aka shelf, spines, books
  a thing, scenery, plural
  in the Library, the Stack 1, the Stack 2 and the Stack 3

  Thousands of books, shelved by a system nobody alive remembers. Take
  one down and its pages are as blank as its spine.
```

These four rooms are not a region of their own, and the Hall is too large,
since the shelves should not follow the player into the Refectory. So this
backdrop names its rooms. Use a region when the scenery belongs to all of it,
and a list when it does not.

## Build and try it

Add the two regions, put each room in one, and add the stacks, the tower and
the shelves. This book places the regions at the top of the file, after the
header, so that the plan of the place is the first thing you read. The
complete file is in the companion folder `chapter-11`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk the stacks to the end and back, and examine the tower from each side of
the arch. Then try placing the kettle in the Grounds instead of the Lodge, and
read what the compiler says.

```text
relighting.story:142:3 error [analysis.thing-in-region] `kettle` is placed in the region `Grounds` — a region holds rooms, not objects. Which of its rooms is `kettle` in? Name that room instead.
```

::: under-the-hood
**Under the Hood: a region is an entity too** · `sharpee compose`

In the Story IR a region is an entry in `entities` like a room or a thing,
with the kind `region`. A room's `in the Hall` is recorded as the room being
contained in that entity, and a group such as `rooms Stack 1 to 3` is expanded
by the compiler into three ordinary rooms before the platform ever sees it.
The table of exits is expanded in the same way, into exits on the rooms
themselves. By the time the story runs, nothing distinguishes a stack from a
room you wrote out by hand.
:::

::: from-another-system
**From another system: regions**

Inform 10 has regions, and they are used as they are here: rooms are declared
to be in one, a backdrop can be placed in one, and rules can be written that
affect one region at a time. The differences are that Inform 10's regions can
be put inside each other and Chord's cannot, and that Chord adds the room
group and the exit table. TADS 3 has no region class in its standard library.
If that is your background, the region is the thing you used to build by
hand.
:::

## What you have so far

Lanternhall is two regions and eleven rooms, with a tower over the Grounds and
blank books by the thousand in the Library. Every way in it but one stands
open. The last chapter of Part II shows the other things a way can be:
blocked, deadly, and hidden behind a hearth.
