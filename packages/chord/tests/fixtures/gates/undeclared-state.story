story "Gate 3" by "Nobody"
  id: gate-3
  version: 0.0.1

create the Foyer
  a room

  A room.

create the message
  scenery
  in the Foyer
  states: intact, trampled

create the player
  starts in the Foyer

  You.

when the player enters the Foyer
  change the message to smashed
end when
