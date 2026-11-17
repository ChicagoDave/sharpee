# Light, dark and the other senses

The Relighting is a story about a light that has gone out, and so far every
room in it is as bright as every other. This chapter makes one room dark,
makes the hand lamp a lamp, and then looks briefly at what the player can
smell and hear.

## A dark room

A room is lit unless you say otherwise. The word that says otherwise is
`dark`, and it goes on the room's header line after the kind.

```chord
create the Undercroft, a room, dark

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone. The steps go back up.
```

`dark` is a trait word for rooms only. In a dark room the player cannot see.
The room's description is not shown, the things in it are not listed, and
nothing there can be examined or taken, because as far as the player can tell
nothing is there.

```text
> down
It is pitch dark. You are likely to be eaten by a grue.

> look
It's pitch dark, and you can't see a thing.

> examine crate
You can't see any such thing.

> up
Cloister
A covered walk around a garth gone to nettles. The refectory is east, the library door west, and the foot of the bell stair north. Worn steps go down into the dark under the hall.
```

Notice three things. The player was allowed to walk into the dark, and was
allowed to walk out of it again. The exits of a dark room still work, so a
player who blunders in is never trapped. And the first line the player read
came from another story entirely.

The grue is the platform's stock line for entering a dark room, kept in
honour of the games that invented this kind of puzzle. It has no place in
Lanternhall, where the only thing in the dark is a crate. Chapter 22 shows how
to replace any of the platform's messages with your own, and this is the first
one The Relighting replaces. Until then, leave it. Knowing which lines in your
story are not yours is worth a little embarrassment.

## A light to carry

A thing gives light if it is a `light-source`, and you say how it begins.

```chord
create the hand lamp
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.
```

`starts lit` and `starts unlit` are the two starting states, and like every
starting state they need their trait word. A thing that is not a
`light-source` cannot start lit:

```text
relighting.story:259:12 error [analysis.starts-state-pairing] `starts lit` requires `light-source` composed on this entity.
```

A light source that is lit lights the room it is in. It does so whether the
player is holding it or has put it down, and it goes on doing so if the player
leaves and comes back.

```text
> light lamp
You light the hand lamp.
```

```text
> down
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate here.
```

The player lights and puts out a light source with the ordinary verbs, and
the platform notices when doing so changes what can be seen.

```text
> extinguish lamp
You put out the hand lamp, and darkness closes in.

> look
It's pitch dark, and you can't see a thing.

> light lamp
You light the hand lamp, and the darkness draws back.

Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate here.
```

Only a light source can be lit. Ansel's taper is a plain thing, and the story
says so:

```text
> light taper
The wax taper isn't something you can light.
```

## What this does to the story

With two words added, The Relighting has changed shape. The lens is in a crate
in the Undercroft, the Undercroft is dark, and the lamp is in the Lodge. A
player who goes straight down the steps learns that they need a light, and has
to go back for one. The world now has an order in which things must be done,
and you wrote no rule to enforce it. The darkness enforces it.

There is one thing wrong, and it is worth seeing clearly. The lamp lights when
the player types `light lamp`. In the finished story, lighting that lamp is
the first act of magic anyone has performed in thirty years, and it should not
be available for the asking. For now it is. The standard action that lights a
light source does not know that this one is special. Teaching it takes a
requirement from chapter 15 and a new verb from chapter 25, and until then the
lamp is merely a lamp.

## Seeing in the dark

A person may be given **`night-vision`**, which lets them see in a dark room
as though it were lit. It is a trait word for people only.

```chord
create Ansel
  a person, proper, night-vision
  playable
  starts in the Cellar
```

For a person who is the player, the dark simply stops mattering. Ansel has no
such gift. The word is more often useful on someone else, in a story where a
character must find their way about a dark house on their own turns, as Part V
describes.

## Smell and sound

The player has other senses, and two trait words speak to them.

A thing that is **`smelly`** can be smelled from anywhere in its room, and a
thing that is **`loud`** can be heard. What makes these two worth having is
that they pass through a closed container. Here is a tin with three things in
it, from another story.

```chord
create the tin
  a container, openable, starts closed
  in the Den

  A tin.

create the cheese
  a thing, smelly
  in the tin

  A ripe cheese.

create the clock
  a thing, loud
  in the tin

  A clock.

create the sock
  a thing
  in the tin

  A sock.
```

With the tin shut, the player can see none of the three, and can detect two.

```text
> smell
You smell a cheese.

> listen
You hear a clock.

> listen to tin
You hear faint sounds from inside the tin.
```

This is a way of telling the player that a closed thing is worth opening
without saying so. The sock, which is neither smelly nor loud, gives no sign
of itself until the tin is open.

Sound goes much further than this. A story can define sounds of its own, play
them, and have people in the story react to hearing them, and The Relighting
does all three with its tower bell. Those need clauses from Part III and are
taught in chapter 36.

## Build and try it

Add `dark` to the Undercroft, make the hand lamp a light source, and let the
Cloister's description warn of the dark at the bottom of the steps. The
complete file is in the companion folder `chapter-10`.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Walk down without the lamp, then fetch it, light it and walk down with it.
Then try leaving the lit lamp in the Undercroft and coming back.

```text
> drop lamp
Dropped.

> up
Cloister
A covered walk around a garth gone to nettles. The refectory is east, the library door west, and the foot of the bell stair north. Worn steps go down into the dark under the hall.

> down
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate and a hand lamp here.
```

::: under-the-hood
**Under the Hood: perception** · `if.event.perception.blocked`

Darkness is not handled by the actions. The `looking` action describes the
Undercroft in exactly the same way whether or not there is light. Between the
action and the player sits a perception step, which asks whether the player
can see where they are. If they cannot, it replaces what the action reported
with a single event saying that sight was blocked, and "It's pitch dark, and
you can't see a thing" is how that event is worded. This is why you did not
have to write a dark version of the room. There is only one version, and the
platform decides whether the player gets it.
:::

::: from-another-system
**From another system: light**

Both systems have this model, and it will feel like home. Inform 10 has dark
rooms and lit things, and TADS 3 has a brightness on rooms and on light
sources. Chord's version is the simple one: a room is dark or it is not, a
light source is lit or it is not, and one lit source in the room is enough.
There are no degrees of brightness. The surprise for both kinds of author is
further on, in that lighting a light source is an ordinary standard action
that you restrict, not a rule you write from nothing.
:::

## What you have so far

Lanternhall has a dark place under it and one lamp to see by, and the story
has its first forced order of events. The next chapter steps back from single
rooms and things to look at the map as a whole.
