## The Relighting, as it stands at the end of chapter 5: the eight rooms of
## Lanternhall and the ways between them. There is nothing in them yet.

story
  title: The Relighting
  id: relighting
  story-version: 0.2.0
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

## The gate and the court.

create the Lodge, a room
  north to the Gate Court

  room name:
    The Porter's Lodge

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame. The
  door to the court is north.

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

## The Hall.

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

## The player.

create Ansel
  a person
  playable
  starts in the Lodge

  You were a student here once, for a term. You have the same hands and
  not much else.

before the game starts
  change the player to Ansel
end before
