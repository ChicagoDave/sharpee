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

create the player
  starts in the Parlor

  You.
