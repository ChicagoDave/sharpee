# Open water and open ground

<!-- PENDING (Phase 4, 2026-11-16): not run and not taught here: `set … sails
     to`, `is in irons`, a wind given in degrees, `send … to <x>, <y>`, `sight:`
     on a thing as an instrument, the `is heading` condition on open water, and
     the naval commands other than `steer` and `make sail`. -->

A map of rooms suits a building. It suits a lake badly. Open water has no
doors and no corridors, and a story that cuts it into "Lake, North End" and
"Lake, Middle" has made rooms where the player expected distance.

Chord has a second kind of place for this, the **expanse**: a stretch of
open water or open ground measured in units, with rooms at fixed points on
it and vehicles that cross it by heading. It is an opt-in system, so it
needs a line in the story header. A second opt-in system, sailing, adds
wind.

The Relighting uses both for its last scene. Lighting the Great Lantern
has been the end of the game since chapter 18. From this chapter it is not
quite the end.

## Turning the system on

```chord
story
  title: The Relighting
  id: relighting
  use scoring
  use chapters
  use expanses
  use sailing
```

`use` lines were introduced with scoring in chapter 18, and the next
chapter looks at them as a group. For now: `use expanses` admits the words
of this chapter, and `use sailing` admits the ones about wind. Without the
line, the compiler refuses the words and names the line that is missing.

## An expanse

```chord
create the Mere
  aka water, lake
  an expanse
  size: 8 by 6
  wind: from west

  Grey water, wider than it looked from the roof, with a short chop on
  it.

  landmarks
    the Water Stair: 0, 2
    the Beacon Isle: 6, 2
  end landmarks
```

`an expanse` is a kind. `size:` gives its width and height in units, which
are whatever you decide a unit is. Positions are counted from zero, east
along the first number and north along the second.

The `landmarks` block places rooms on the expanse. A landmark is an
ordinary room, with a description and things in it, that also has a
position. The Mere has two: the Water Stair, at its western edge, and the
Beacon Isle, six units to the east.

An expanse has no exits. Its four sides can be given blocked lines, as a
room's exits can, and a vehicle that reaches a side with one is told so.

```chord
west is blocked: lake-edge
```

A side with no line simply ends: "You can go no farther that way."

### Rooms seen from the water

A landmark needs one line that no other room has.

```chord
create the Water Stair, a room
  seen from afar: a dark arch at the foot of the Hall, with steps in it
  sight: 4

  Six steps going down into the Mere under an arch, and an iron ring in
  the wall for a boat. The white bar of the Lantern passes overhead and
  out across the water. The Undercroft is back to the south.

create the Beacon Isle, a room
  seen from afar: a hump of rock with a stone basket on a pole

  A rock the size of the refectory, with one thorn tree and the beacon.
  The Hall is a lit window on the far shore.
```

`seen from afar:` is how the room looks from a distance, and the compiler
requires it of every landmark. `sight:` on a landmark is how far one can
see out over the expanse from it.

The Water Stair is reached from the Undercroft by an ordinary exit, which
is blocked until the Hall is awake.

```chord
create the Undercroft, a room, dark
  in the Hall
  north to the Water Stair
  north is blocked while the story is not awake: water-gate-shut
```

## A vehicle on open water

```chord
create the skiff
  aka boat, heron
  a vehicle
  in the Mere at 0, 2
  movement: open
  carries: in
  drive: player
  commands: naval, compass
  stride: 1 unit
  sight: 5
  seen from afar: a small boat with a patched brown sail
  sails: furled, full
  sails start: furled

  A clinker skiff with one mast and one sail, both older than you are.
  Somebody has kept her tarred, and painted HERON on her transom.

  sailing
    0 to 44 degrees: furled stopped, full stopped
    45 to 119 degrees: furled stopped, full 2 turns
    120 to 180 degrees: furled stopped, full 1 turn
    calm: stopped
  end sailing
```

This is a vehicle of chapter 33 with a movement type that chapter did not
show, `open`.

Its placement says where on the expanse it starts: `in the Mere at 0, 2`.
That is the Water Stair's position, and a vehicle at a landmark's position
is at that room. The player finds the skiff at the foot of the steps.

`stride:` is how many units one step covers. `sight:` is how far a person
aboard can see, and `seen from afar:` is how the vehicle looks to someone
else. An open vehicle must have all three.

Leave the sailing lines aside for a moment. An open vehicle without them
takes a `pace:` line, as other vehicles do, and moves a stride for each
pace in whatever direction it was last steered.

```chord
create the raft
  a vehicle
  in the Lake at 0, 1
  movement: open
  carries: on
  drive: player
  commands: compass
  stride: 2 units
  pace: 1 turn
  sight: 3
  seen from afar: a raft of four logs

  A raft.
```

## Looking across water

On an expanse, `look` gives the expanse's own description and then
everything in sight, each with a distance and a bearing. While the skiff
lies at the foot of the steps it is in the Water Stair, and `look` there
describes that room. This is the view one unit out, once the commands of
the next section have put the skiff under sail.

```text
> look
Mere
Grey water, wider than it looked from the roof, with a short chop on it.

You can see a skiff here.

In the skiff you see Ansel.

The Water Stair, close by, to the west.

The Beacon Isle, on the horizon, to the east.
```

The platform sorts what can be seen into three bands by distance: `close
by`, `in the distance`, and `on the horizon`. Anything beyond the looker's `sight:` is not listed. An
expanse may carry a `visibility:` line, a number of units that caps
everyone's sight, for fog or dusk.

The bands are conditions too.

```chord
phrase isle-near when the Beacon Isle is close by
phrase isle-far when the Beacon Isle is on the horizon
```

`is in sight` is true in any of the three bands. Each is judged from where
the player is looking. For a test that does not depend on eyesight, an
open vehicle's distance can be measured.

```chord
on every turn while the skiff is within 2 of the Beacon Isle, once
  phrase beacon-near
end on
```

`within <n> of` takes a landmark or a pair of coordinates.

## Wind

`use sailing` adds a wind to an expanse and a table to a vehicle.

The Mere's `wind: from west` gives the direction the wind blows from, by
compass point. `wind: calm` is no wind.

The skiff's `sailing` block replaces `pace:`. Each row is a range of
angles between the vehicle's heading and the wind, where 0 is sailing
straight into the wind and 180 is running straight before it. The row says
how many turns a step takes at that angle, or `stopped`. The rows must
cover 0 to 180 exactly once, and there is one more row for a calm.

`sails:` names the settings of the sails, from least canvas to most, and
`sails start:` picks the first. With settings declared, each row of the
table gives a pace for every setting. Read the skiff's table across: with
the sail furled she goes nowhere at any angle; under full sail she will
not go within 44 degrees of the wind, makes a step every two turns across
it, and a step a turn with it behind her.

The wind is from the west and the beacon is due east. The crossing is the
easy one.

```text
> enter skiff
You get into the skiff.

> steer east
You steer the skiff east.

> wait
You wait.

> make sail
You make sail.
```

`commands: naval, compass` gives the player two sets of commands aboard.
The compass set is chapter 33's: a bare direction steers. The naval set
adds `steer <direction>` and the sail commands: `make sail`, `shorten
sail` and `furl the sails`.

Steering alone moved nothing, because the sail was furled. Under sail the
skiff runs east a unit a turn, and the isle is six units off. Every command
is a turn, `look` among them. Type `look` now, straight after `make sail`,
and it gives the view of the last section, with the stair close by. Two
turns after it the view has changed, and the turn after that brings the
skiff in. Without that first `look` the skiff is a unit behind what follows.

```text
> look
Mere
Grey water, wider than it looked from the roof, with a short chop on it.

You can see a skiff here.

In the skiff you see Ansel.

The Water Stair, close by, to the west.

The Beacon Isle, on the horizon, to the east.

> wait
You wait. The Hall has had thirty years of practice and is better at it than you are.

> wait
You wait. Somewhere a shutter knocks, twice, and thinks better of it.

> look
Mere
Grey water, wider than it looked from the roof, with a short chop on it.

You can see a skiff here.

In the skiff you see Ansel.

The Beacon Isle, in the distance, to the east.

The Water Stair, on the horizon, to the west.

The rock comes up out of the dusk ahead, and on it a pole with a basket at the top, black against the last of the sky.

> wait
You wait.

The skiff arrives at the Beacon Isle.
```

Arriving at a landmark's position is arriving at the room.

## Things adrift

A thing may be put on an expanse without a vehicle under it, if it
`floats`.

```chord
create the bottle
  a thing, floats
  in the Lake at 3, 1

  A bottle.
```

An expanse with anything floating in it needs a `drift:` line, `drift: 1
unit every 2 turns`, and the platform then moves each floating thing at
that rate and says so when the player can see it: "The bottle drifts." A
vehicle that reaches a floating thing "comes alongside" it and stops.

## The new ending

The Lantern no longer wins the game. Its clause wakes the Hall and says
what is still to do.

```chord
after the player sparking
  lose lens-shatters when not lantern-ready
  change the story to awake when lantern-ready
  award relit when lantern-ready
  phrase lantern-lit when lantern-ready
end after
```

Making the story `awake` does three things that were already written. It
stops night from falling, since the day's sequence loses only `when the
story is not awake`. It opens the water gate. And it begins a fourth
chapter, added to the `define chapters` block.

```chord
crossing - The Crossing
  begins when the story becomes awake
```

The win is on the far side of the water.

```chord
create the beacon
  aka basket, cresset
  a thing, scenery, light-source, starts unlit, wick
  in the Beacon Isle
  score answered worth 5

  An iron basket on a pole, packed with pitch-pine that has had thirty
  years to dry.

  after the player sparking
    award answered
    win beacon-lit
  end after
```

The beacon is a `wick`, the trait from chapter 24, so it answers the same
word the lamp, the candles and the Lantern answer. The Lantern's score
drops from 15 to 10 to pay for it, and the total is still 50.

```text
> spark beacon
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

You say the word across six feet of air, and the pitch-pine takes it. Behind you, over the water, the white bar of the Lantern swings round and stops, pointing here. The two lights hold one another. Somewhere between them the Mere is full of small blue sparks, coming home.

You have risen to the rank of a Lamplighter.

[The story has ended. RESTART, RESTORE or UNDO]
```

The line about rank appears when this award takes the score to fifty. A
player who left an award behind on the way, the refectory candles for
instance, wins without it.

## Build and try it

Copy `relighting.story` from the companion folder `chapter-34` over your own
file. It is the story with this chapter's changes made, and it holds the
phrases, which the chapter did not print in full. To make the changes by hand
instead, work from this list and take the rest from that file. Add the two
`use` lines and the fourth chapter. Create the Mere, its two landmark rooms,
the skiff and the beacon. Give the Undercroft its north exit and blocked
line, change the Lantern's `win` to a `phrase`, and adjust the two scores.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Win the game as far as the roof. Then go down to the Undercroft, through
the water gate, and across.

::: under-the-hood
**Under the Hood: a place with coordinates** · Story IR `uses`

The two header lines appear in the compiled IR's `uses` list, and the
compiler admits a system's words only when its name is there. On the
platform an expanse is a single place, and everything on it has a position
in units as well as a container. The rule from chapter 33 that decides
whether a mover may take a way is the same rule here: an edge of an expanse
is a way that is closed, and a landmark is a way that leads into a room.
Sailing adds only a function from the angle off the wind to a pace.
:::

::: from-another-system
**From another system: places that are not rooms**

Neither manual describes a place measured in units. Both model the world
as rooms joined by connections. For seeing one place from another, Inform
10 has regions and backdrops, and TADS 3 has a `Distant` class for an
object too far away to interact with. Neither moves anything by heading
and distance.
:::

## What you have so far

That is Part VI, and the game is complete. The Relighting begins in a
porter's lodge and ends on a rock in a lake. Between them are four
workings, three people and a wisp, a bargain, a machine with an interlock,
a hoist that knows where it is wanted, and a boat. It can be won in one
way and lost in three.

One chapter of this Part remains, and it adds nothing to the game. It is
about the systems this story chose not to use.
