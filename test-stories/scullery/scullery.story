## A test story: things a player reads about but cannot always name. Two
## rooms, a plural thing with a plural alias, a thing with no description,
## and a list the player carries everywhere. Written to be tested and
## nothing else; `scullery.test-set.md` lists what it must let the tests
## prove.

story
  title: The Scullery
  authors:
    Test Story
  id: scullery
  story-version: 0.0.1

create the Scullery
  a room
  north to the Larder

  Jars and crocks crowd the shelf above the sink. Under the window a
  whetstone lies on the drainboard.

create the Larder
  a room
  south to the Scullery

  A cold larder. A wheel of cheese sits on a slate, and hams hang
  from hooks in the beams.

create the jars
  aka crocks
  a thing, scenery, plural
  in the Scullery

  Glazed jars stopped with corks, each one full to the neck.

create the whetstone
  a thing
  in the Scullery

create the cheese
  a thing
  in the Larder

  Its rind is waxed against the damp.

create the chore list
  aka list
  a thing

  Scour the kettles. Mend the bellows.

create Wren
  a person
  playable
  starts in the Scullery
  carries the chore list

  You.

before the game starts
  change the player to Wren
end before
