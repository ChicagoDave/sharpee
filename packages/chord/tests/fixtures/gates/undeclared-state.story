story "Gate 3" by "Nobody"
  id: gate-3
  version: 0.0.1

create the Foyer
  a room

  A room.

  after entering it
    change the message to smashed
  end after

create the message
  scenery
  in the Foyer
  states: intact, trampled

create the player
  starts in the Foyer

  You.

