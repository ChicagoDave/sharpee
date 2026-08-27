story
  title: Gate 1
  authors:
    Nobody
  id: gate-1
  story-version: 0.0.1

create the Foyer
  a room

  A room.

  after the player entering
    phrase nonexistent-key
  end after

create Alex
  a person
  playable
  starts in the Foyer

  You.

before the game starts
  change the player to Alex
end before
