story
  title: Gate 3
  authors:
    Nobody
  id: gate-3
  story-version: 0.0.1

create the Foyer
  a room

  A room.

  after the player entering
    change the message to smashed
  end after

create the message
  scenery
  in the Foyer
  states: intact, trampled

create Alex
  a person
  playable
  starts in the Foyer

  You.

before the game starts
  change the player to Alex
end before
