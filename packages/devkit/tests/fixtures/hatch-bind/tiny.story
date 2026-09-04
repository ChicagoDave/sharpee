story
  title: Hatch Bind Fixture
  authors:
    Sharpee Platform
  id: hatch-bind
  story-version: 0.0.1

define text flavor from "./extras.ts"

create the Yard
  a room

  A yard. {flavor}

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
