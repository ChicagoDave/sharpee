## Fixture for a claims walk whose start lies outside its set: three rooms in
## a row, the player at one end and a crate at the other. A set that names
## only the Shed leaves the walk nowhere to go from the Lane; a set that
## names the Yard and the Shed lets it in.

story
  title: Outside Set Fixture
  authors:
    Fixture
  id: outside-set-fixture
  ifid: 6E0B6B56-0C8E-4D7B-9E55-3A51B0D6C0A1
  description: A three-room fixture for a walk that starts outside its set.

create the Lane
  a room
  north to the Yard

  A lane between hedges.

create the Yard
  a room
  south to the Lane
  north to the Shed

  A cobbled yard.

create the Shed
  a room
  south to the Yard

  A tool shed. A crate sits by the door.

create the crate
  a thing
  in the Shed

  A small slatted crate.

create Nobody
  a person
  playable
  starts in the Lane

  You, in a lane.

before the game starts
  change the player to Nobody
end before
