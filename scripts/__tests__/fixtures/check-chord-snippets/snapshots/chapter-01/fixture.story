## The companion snapshot for the checker's own fixture.

story
  title: Fixture
  authors:
    The Chord Manual
  id: fixture
  story-version: 0.0.1

create the Pantry, a room
  north to the Scullery

  A pantry with one shelf.

create the Scullery, a room

  A scullery.

create the jar, a thing
  in the Pantry

  A jar.

create Mab, a person
  playable
  starts in the Pantry

  You.

before the game starts
  change the player to Mab
end before
