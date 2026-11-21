# Vehicles

<!-- PENDING (Phase 4, 2026-11-16): `movement: streets`, `drive: control` on a
     compass vehicle with `start … heading`, `direction: one-way`, `commands:
     destinations` and the `is heading` condition were not run and are not
     taught here. -->

A chair you can sit in is `enterable`, and has been since chapter 7. A
vehicle is an enterable thing that goes somewhere, and takes what is in it
along.

Chord's vehicles are declared, not scripted. You say what kind of movement
a vehicle has, what drives it, and where it may go, and the platform moves
it, reports its arrivals, and carries its passengers. This chapter builds
the simplest useful kind for The Relighting, a hoist that goes where its
load sends it, and then shows the other kinds in short examples.

## A problem for a vehicle

The lens of the Great Lantern is a disc of glass as wide as a cartwheel.
Since chapter 7 Ansel has carried it up a winding tower stair without
comment. One line ends that.

```chord
create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed
  up is blocked while Ansel has the lens: lens-too-wide
```

A room may have two blocked lines for one direction, each with its own
condition and its own phrase. While the grille stands, the player still
reads the grille's phrase. With the grille lifted and the lens in hand, the
second phrase answers.

```text
> up
The lens is as wide as a cartwheel and the stair is as wide as a student. One of you is not going up this way.
```

The lens needs another way to the roof. A college with a library on the
ground floor and readers at the top of a tower has one already.

## The book hoist

```chord
create the book hoist
  aka hoist, cage, lift
  a vehicle
  in the Undercroft
  movement: line
  carries: in
  drive: state
  stops: the Undercroft, the Library, the Lantern Gallery
  direction: both

  A wicker cage on a rope, in a shaft that goes up through the Library
  floor and on into the tower. It was made to take books to whoever
  wanted them, and it has never needed telling where that was.

  position
    when the book hoist holds the lens and the iron grille is lifted: the Lantern Gallery
    when the book hoist holds the lens: the Library
    otherwise: the Undercroft
  end position
```

`a vehicle` is a kind, like `a container`. The lines beneath it are its
settings, each a word, a colon and a value.

`movement:` is required on every vehicle and says what sort of path it
follows. A `line` is a fixed list of stops.

`carries:` is `in` or `on`, and decides whether the player gets into the
vehicle or onto it. Things can be put there too, as into a container or
onto a supporter.

`drive:` says what makes it move. There are three answers. `state` means
the story's own conditions decide where the vehicle is. `control` means
statements start, stop and send it. `player` means the player steers.

`stops:` lists the rooms on the line, in order, and `direction:` is `both`
or `one-way`.

### Where a state-driven vehicle is

A `drive: state` vehicle has a `position` block. After every turn the
platform reads its rows from the top, and the vehicle is at the stop named
by the first row whose condition holds. The last row is always
`otherwise`.

The hoist was made to take books to whoever wanted them. In this story it
takes the lens to where the lens is wanted. Loaded, it rises to the
Library. Loaded, with the ward on the stair lifted, it goes all the way to
the roof. Empty, it comes home.

```text
> put lens in hoist
You put the lens in the book hoist.

The book hoist pulls away.

> look
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a crate and a wisp here.
```

Ansel walks up, and the hoist is waiting.

```text
> look
Lantern Gallery
The roof of the tower, open on every side. The Great Lantern stands in the middle of it on a stone drum, taller than you are, its glass thirty years dirty. To the east a low parapet is all there is between you and the court. The stair goes back down.

You can see a book hoist and a wisp here.

In the book hoist you see a lens.

> put lens in lantern
(first taking the lens)

You take the lens from the book hoist.

You put the lens in the Great Lantern.

The lens drops into its seat with a sound like a coin on a counter.

The book hoist pulls away.
```

The hoist is no way round the ward. Its second row sends it only as far as
the Library while the grille stands, so the player who has not unbound the
stair finds the lens one floor up and no nearer the roof.

A position block is the least work a vehicle can be. There is no control
to write and nothing to steer. If the place a vehicle should be follows
from the state of the story, say so, and let the platform move it.

### Riding

The player can get into the hoist as well. These replies were recorded
with the bell hushed. Ride while it is still tolling and each ends with the
bell.

```text
> enter hoist
You get into the book hoist.

> look
Undercroft
Low vaults on squat pillars, running off under the whole of the hall. The air is cold and smells of stone. The steps go back up.

You can see a book hoist, a crate, and a wisp here.

In the book hoist you see Ansel.
```

Aboard a vehicle that is `carries: in` or `carries: on`, the player is
still in the room the vehicle is in, and `look` describes that room. When
the vehicle moves, the player moves with it.

## A vehicle that is driven

`drive: control` puts the vehicle in the hands of statements. Here is a
tram on a line of three stops.

```chord
create the tram
  a vehicle
  in the Yard
  movement: line
  carries: in
  drive: control
  stops: the Yard, the Shed, the Mill
  direction: both
  pace: 2 turns

  A tram.

create the lever
  a thing, scenery, pullable
  in the tram

  A lever.

  after the player pulling
    start the tram
  end after

create the brake
  a thing, scenery, pushable
  in the tram

  A brake.

  after the player pushing
    stop the tram
  end after
```

`start` and `stop` are the timer verbs of chapter 19, given a vehicle's
name. Started, the tram runs along its line, taking the number of turns in
`pace:` for each step, and stops by itself at the end.

```text
> pull lever
You pull the lever.

> wait
Time passes...

The tram arrives at the Shed.
```

Two conditions read a vehicle. `the tram is under way` is true while it is
moving, and `the tram is at the Shed` is true while it stands at that
stop. Use them to gate a door, a description or a goal.

### Flight

`movement: flight` is for a vehicle that goes from any of its places to
any other without passing through the rooms between.

```chord
create the balloon
  a vehicle
  in the Yard
  movement: flight
  carries: in
  drive: control
  destinations: the Yard, the Mill
  pace: 2 turns

  A balloon.

create the cord
  a thing, scenery, pullable
  in the balloon

  A cord.

  after the player pulling
    send the balloon to the Mill when the balloon is at the Yard
    send the balloon to the Yard when the balloon is at the Mill
  end after
```

`destinations:` takes the place of `stops:`, and `send … to` names the one
to make for. `pace:` here is the length of the whole trip. While the
balloon is in the air it is nowhere, and a passenger who looks about sees
the vehicle and its description.

```text
> pull cord
You pull the cord.

> look
balloon
A balloon.

> wait
Time passes...

The balloon arrives at the Mill.
```

## A vehicle the player steers

```chord
create the cart
  a vehicle
  in the Yard
  movement: compass
  carries: on
  drive: player
  commands: compass
  pace: 1 turn

  A cart.
```

A `compass` vehicle moves through the map by the rooms' own exits. With
`drive: player` and `commands: compass`, a direction typed by a player who
is aboard steers the vehicle and does not walk the player off it.

```text
> enter cart
You get onto the cart.

> north
You steer the cart north.

The cart arrives at the Shed.
```

A steered vehicle keeps its heading. The cart goes on north, a step for
each `pace:`, until the way ends or the player steers again, and then it
"comes to a stop".

It will not enter a room that has not agreed to it. A room, a `rooms`
group or a region says which steered vehicles it lets in.

```chord
create the Shed, a room
  admits: the cart
```

Without that line the cart stops at the Shed's door. This is deliberate. A
story with a cart in it should not have to refuse the cart at the top of
every staircase.

## A vehicle with rooms inside

A large vehicle is a place. It has rooms, and the player walks about in
them while it travels.

```chord
create the Cabin, a room
  up to the Deck

  A cabin.

create the Deck, a room
  west to outside

  A deck.

create the barge
  a vehicle
  in the Yard
  movement: line
  drive: control
  stops: the Yard, the Shed
  direction: both
  pace: 1 turn
  aboard: the Deck, the Cabin
  boarded through: the Deck

  A barge.
```

`aboard:` lists the rooms inside, and `boarded through:` names the one a
player arrives in. A vehicle with rooms aboard has no `carries:` line. An
exit written `to outside` leads from a room aboard to wherever the vehicle
is at that moment.

```text
> enter barge
You board the barge.

Deck
A deck.
```

After the barge has run to the Shed, `west` from the Deck leaves it there.

A vehicle that does not move at all is `movement: none`, with a `carries:`
line and nothing else. It is a way of saying that something is a vehicle,
for the sake of how it is entered and described, before deciding where it
goes.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-33` over your own
file. It is the story with this chapter's changes made, and it holds the one
new phrase, which the chapter did not print. To make the changes by hand
instead, work from this list and take the rest from that file: add the second
blocked line to the Bell Stair, the book hoist to the Undercroft, and one
phrase. The day's sequence is longer again, `at turn 100` and `60 turns
later`, to leave room for the extra trip.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Take the lens from the crate and try the stair with it: the grille answers
until it is lifted, and the lens after. Then give the lens to the
hoist, before and after the grille is lifted, and see where it goes.

::: under-the-hood
**Under the Hood: one answer for every mover** · Story IR `vehicle`

A vehicle's settings compile into a `vehicle` record on its entity,
holding the movement type, the drive, and the stops, destinations or rooms
aboard. The platform has a single rule for whether a mover may take a way
from one room to another, and the walking player, a steered cart and a
person on a goal all ask it the same question. That is why a blocked exit
stops a cart as it stops Ansel, and why `admits:` is a line on the room
and not on the vehicle. The line "The book hoist pulls away." and the
arrival lines are standard messages, and can be overridden like any other.
:::

::: from-another-system
**From another system: vehicles**

Inform 10 has a `vehicle` kind: an enterable container that the player,
once inside, moves about the map by typing directions exactly as if on
foot. That corresponds to Chord's steered `compass` vehicle. TADS 3 has a
`Vehicle` class, a nested room that can move around with actors inside,
and its documentation suggests building larger vehicles such as ships from
one or more rooms. Chord's `line`, `flight` and `position` forms, in which
a vehicle moves by itself, are not described in either manual.
:::

## What you have so far

The lens goes up the tower in a book hoist, which takes it as far as the
wards allow. The stair will not pass it. A player who wants the Lantern lit
must now lift the grille for two reasons.

Everything in the story is still a room, and the next chapter leaves
rooms behind.
