## The Relighting, as it stands at the end of chapter 6: the eight rooms of
## Lanternhall, and the first things in them.

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

## Things in the Lodge.

create the blue flame
  aka pilot flame, sill
  a thing, scenery
  in the Lodge

  Hobb's own lamp, which has burned yellow on that sill for as long as
  anyone has kept count. The flame is blue this morning, and does not
  flicker.

create the chair
  a thing, scenery
  in the Lodge

  A wing chair that has taken the shape of one man.

create the newspapers
  aka papers
  a thing, scenery, plural
  in the Lodge

  The top one is from last week. The bottom one reports the Dimming, in
  the small type newspapers use for things they do not yet believe.

create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.

create the hand lamp
  a thing
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

create the spectacles
  aka glasses
  a thing, plural, concealed
  in the Lodge

  Wire spectacles with one arm mended in thread. Hobb has been looking
  for them since the spring.

## Things about the Grounds and the Hall.

create the gate
  aka gates, arch, letters, motto
  a thing, scenery
  in the Lodge and the Gate Court

  The great gate of Lanternhall, shut for thirty years and opened this
  morning by one leaf. Over the arch a line of cut letters says that the
  craft needs a light to come home to.

create the hearth
  aka fireplace
  a thing, scenery
  in the Refectory

  The back of the hearth is a single iron plate, and it does not sit
  quite square. There is a hand's breadth of darkness down one side.

create the Great Lantern
  aka lantern
  a thing, scenery
  in the Lantern Gallery

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

## People.

create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

create the wax taper
  aka taper
  a thing

  Half a wax taper. Last week you lit it to read by, and its flame
  leaned toward your hand like a cat. You have carried it since.

create Ansel
  a person
  playable
  starts in the Lodge
  carries the wax taper

  You were a student here once, for a term. You have the same hands and
  not much else.

before the game starts
  change the player to Ansel
end before
