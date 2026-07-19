
# 1 · The world: rooms, doors, darkness, regions

*(Grammar reference: "Top level", "Doors", "Ownership lines". Previous:
[overview](./index.md) · Next:
[things](./things.md))*

## The story header

Every `.story` file opens with a header — title, id, and any story-wide
facts. Fernhill declares two story states (the timeline flips them later)
and turns on the state-machine extension for the boiler:

```chord
story "The Folly at Fernhill" by "The Sharpee Project"
  id: fernhill
  version: 0.1.0
  blurb: One winter night to find the deed that keeps Fernhill in the family.
  states: evening, midnight
  use state-machines
```

## Rooms and the compass

A room is a `create` block with exits as plain facts. Prose after the
facts is the room's description:

```chord
create the Gravel Drive
  a room
  aka drive
  south to the Iron Gates
  north to the Fountain Court

  The drive curves between bare lime trees, gravel crunching underfoot.
```

`aka` adds player-facing synonyms. Exits are one-directional facts;
declare each side where it belongs.

## Doors: the `through` form

A door is its own entity, referenced from an exit line with `through`.
The exit declares the geometry once; the reverse direction is inferred:

```chord
create the Cellar Stairs
  a room
  down to the Cellar through the cellar door

create the cellar door
  a door, lockable with the tarnished key
  aka grey door

  A heavy grey door, locked as long as anyone can remember.
```

`lockable with the tarnished key` is the declarative capability family
you'll see throughout the next chapter — the key is named right on the
adjective, and LOCK/UNLOCK just work. The pantry door shows the two-sided
variant (`lockable, starts unlocked`) — the player can bolt themselves in
and the door refuses from the other side.

## Darkness and light

```chord
create the Cellar
  a room
  dark

create the oil lamp
  aka lamp
  light-source, switchable
  in the Cellar Stairs
```

A `dark` room refuses sight-dependent actions until a lit light source is
present. Nothing else to wire — darkness is a fact about the room, light a
fact about the lamp.

## Blocked exits are live conditions

The greenhouse's north door is frost-sealed until the estate's boiler
runs. That is one line, and it reads the boiler's LIVE state — the moment
the boiler comes on, the way opens, no events or recomputes involved:

```chord
create the Greenhouse
  a room
  north to Folly Hill
  north is blocked while the boiler is off: frost-sealed
```

The word after the colon names the refusal phrase. An unconditional block
works the same way (`south is blocked: long-road` on the Iron Gates — the
cab is gone; you're not leaving).

## Regions and crossing reactions

Regions group rooms and give them shared behavior. Fernhill has two, and
the Grounds narrate every crossing in both directions:

```chord
create the Grounds
  a region
  containing the Iron Gates, the Gravel Drive, the Fountain Court
  containing the Greenhouse, the Boiler Shed, Folly Hill

  on every turn while one chance in 6
    phrase night-wind
  end on

  after entering it
    phrase cold-returns
    play ambient night-wind when client has sound
  end after

  after leaving it
    stop ambient when client has sound
    phrase out-of-the-wind
  end after
```

Three patterns in one block: a **region daemon** (the chance-gated wind,
which only fires while the player is somewhere in the Grounds), and the
two **crossing reactions**. The `play ambient` lines are the browser layer
— they cost text players nothing, and the last chapter returns to them.
Story-level daemons live in the header the same way (Fernhill's distant
church bell).

## First-visit prose

```chord
create the Iron Gates
  a room

  first time
    The cab is already grinding away down the lane, its lamps swallowed
    by the dark. An auction notice is nailed to the left-hand gate…

  Wrought-iron gates stand open on one hinge apiece…
```

The `first time` paragraph narrates once, on first arrival; the ordinary
description takes over after. Fernhill uses it to open the game.

Next: [things — objects, tools, and hiding places](./things.md).
