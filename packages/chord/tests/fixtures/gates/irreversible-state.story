story "Gate: irreversible state" by "Nobody"
  id: gate-irreversible-state
  version: 0.0.1

create the vase
  scenery
  states: whole, broken

create the Parlor
  a room

  A quiet parlor.

  after entering it
    change the vase to whole
  end after

create the player
  starts in the Parlor

  You.
