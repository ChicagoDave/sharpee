story
  title: Door Redundant
  authors:
    Test
  id: door-redundant
  story-version: 0.0.1

create the Kitchen
  a room
  north to the Hall through the oak door

  A tidy kitchen.

create the Hall
  a room
  south to the Kitchen through the oak door

  A long hall.

create the oak door
  a door

  A heavy oak door, iron-banded.

create Alex
  a person
  playable
  starts in the Kitchen

  You.

before the game starts
  change the player to Alex
end before
