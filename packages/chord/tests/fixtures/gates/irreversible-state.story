story
  title: Gate: irreversible state
  authors:
    Nobody
  id: gate-irreversible-state
  story-version: 0.0.1

create the vase
  scenery
  states: whole, broken

create the Parlor
  a room

  A quiet parlor.

  after the player entering
    change the vase to whole
  end after

create Alex
  a person
  playable
  starts in the Parlor

  You.

before the game starts
  change the player to Alex
end before
