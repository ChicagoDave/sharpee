## The Relighting, as it stands at the end of chapter 13: the story and
## five of its things now have states. Nothing changes a state yet, and
## the stair is sealed for as long as the grille is standing.

story
  title: The Relighting
  id: relighting
  story-version: 0.3.0
  states: asleep, waking, awake
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

## The two regions. The Grounds are what a visitor may see; the Hall is
## everything behind the cloister arch.

create the Grounds, a region

create the Hall, a region
  rooms Stack 1 to 3

    Shelves rise on both sides to a ceiling you cannot make out. Every
    spine is blank.

  exits
    the Stack 1: south to the Library, north to the Stack 2
    the Stack 2: north to the Stack 3

## The Grounds.

create the Lodge, a room
  in the Grounds
  north to the Gate Court

  room name:
    The Porter's Lodge

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame, and
  an oak press hangs on the wall beside it. The door to the court is
  north.

create the Gate Court, a room
  in the Grounds
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
  in the Hall
  east to the Refectory
  west to the Library through the library door
  north to the Bell Stair
  down to the Undercroft

  A covered walk around a garth gone to nettles. The refectory is east,
  the library door west, and the foot of the bell stair north. Worn steps go
  down into the dark under the hall.

create the Refectory, a room
  in the Hall

  Three long tables, each with its row of candles, and a hearth you
  could stable a horse in. The benches are stacked against the wall, where someone left them for the
  holidays. The cloister is back to the west.

  passage to the Undercroft
    grammar
      squeeze or crawl behind [the] hearth
  end passage

create the Library, a room
  in the Hall

  The reading room of Lanternhall, with its desks in rows and its
  galleries of shelves. The stacks run back to the north, out of the
  light. The cloister is east.

create the Undercroft, a room, dark
  in the Hall

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone. The steps go back up.

create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs, and an iron grille stands across its third step. The
  cloister is south.

create the Lantern Gallery, a room
  in the Hall
  east is deadly: over-the-parapet

  The roof of the tower, open on every side. The Great Lantern stands in
  the middle of it on a stone drum, taller than you are, its glass
  thirty years dirty. To the east a low parapet is all there is between
  you and the court. The stair goes back down.

## The door.

create the library door
  a door, openable, lockable with the library key, starts locked

  Oak, banded with iron, and carved with an open book whose pages have
  been left smooth.

## Things in the Lodge.

create the blue flame
  aka pilot flame, sill
  a thing, scenery
  in the Lodge

  Hobb's own lamp, which has burned yellow on that sill for as long as
  anyone has kept count. The flame is blue this morning, and does not
  flicker.

create the chair
  a supporter, scenery, enterable
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
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

create the seed cake
  aka cake
  a thing, edible
  on the chair
  servings 2

  Half a seed cake on a plate, cut with some care into two pieces.

create the cup
  aka teacup
  a thing, breakable, fragile
  on the chair

  A china cup without a saucer, with a brown ring where the tea stood.

create the oak press
  aka press, cupboard
  a container, scenery, openable, starts closed
  in the Lodge
  holds 6

  A shallow cupboard on the wall with a row of hooks inside, each hook
  under a painted label. Most of the labels have faded past reading.

create the library key
  a thing
  in the oak press

  A long key with a book cut into its bow.

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

create the bell tower
  aka tower
  a thing, scenery
  in the Grounds

  The tower of Lanternhall stands over everything, square and grey, with
  the dark glass of the Great Lantern at the top of it.

create the hearth
  aka fireplace
  a thing, scenery
  in the Refectory

  The back of the hearth is a single iron plate, and it does not sit
  quite square. There is a hand's breadth of darkness down one side.

create the Great Lantern
  aka lantern
  a container, scenery
  in the Lantern Gallery
  holds 1

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

create the candles
  a thing, scenery, plural
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table. Nobody
  has put a flame to them since the last supper of the last term.

create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair

  A rope as thick as your wrist, coming down out of the dark.

create the shelves
  aka shelf, spines, books
  a thing, scenery, plural
  in the Library, the Stack 1, the Stack 2 and the Stack 3

  Thousands of books, shelved by a system nobody alive remembers. Take
  one down and its pages are as blank as its spine.

create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair
  states: standing, lifted

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.

create the reading desk
  aka desk
  a supporter, scenery
  in the Library

  The first desk of the first row, with a slope for a book and a rail to
  keep it there.

create the grimoire
  aka book, margin, note
  a thing, readable with text "In the margin, in a small brown hand: gnusto. Came over the water as a working, they say. Meaning lost."
  on the reading desk

  A book as long as your forearm, chained to nothing any more. Its pages
  are blank, or were. Here and there a line of ink has come back, as
  frost comes onto a window. Someone has written in one margin.

create the spark page
  aka first page, leaf
  a thing, readable with text "One line, in ink that is still wet. It is a single word, and it will not stay in your head."
  on the reading desk
  states: legible, learned

  A leaf that has worked loose from the grimoire. The ink on it is
  complete.

create the cistern
  aka ice
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running

  A stone cistern sunk in the floor, fed by a lead pipe from somewhere
  above. It is a block of grey ice to its brim, and something flat and
  pale is held in the ice a hand's depth down.

create the tower bell
  aka bell
  a thing, scenery
  in the Bell Stair
  states: unrung, tolling, silent

  You cannot see the bell from here, only the dark it hangs in.

create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing
  in the crate
  states: cracked, sound

  A disc of glass as wide as a cartwheel, ground in rings. A crack runs
  across it from edge to edge.

## People.

create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

create the travelling coat
  aka coat
  a thing, wearable

  A long coat the colour of the road.

create the wax taper
  aka taper
  a thing

  Half a wax taper. Last week you lit it to read by, and its flame
  leaned toward your hand like a cat. You have carried it since.

create Ansel
  a person, proper
  playable
  starts in the Lodge
  carries the wax taper
  wears the travelling coat

  You were a student here once, for a term. You have the same hands and
  not much else.

define phrases en-US
  stair-sealed:
    The grille stands across the stair, and there is no way round it.
  over-the-parapet:
    You step up onto the parapet to see the court. The court comes up to
    meet you.

before the game starts
  change the player to Ansel
end before
