story "Zoo Watch" by "Test"
  id: npc-behaviors
  version: 0.0.1
  use combat

create the Gate
  a room
  north to the Yard

  A tall iron gate.

create the Yard
  a room
  south to the Gate
  north to the Shed

  A dusty exercise yard.

create the Shed
  a room
  south to the Yard

  A leaning tool shed.

create the ogre
  a person, combatant with health 20 and skill 45 and hostile true, guard
  in the Gate

  A slab-shouldered ogre watching the gate.

create the keeper
  a person, patrol with route [the Gate, the Yard, the Shed]
  in the Gate

  A watchful keeper on her rounds.

create the moth
  a person, wanderer with move-chance 100
  in the Yard

  A giant moth, never still.

create the slug
  a person, wanderer with move-chance 0
  in the Yard

  A monumental slug, entirely still.

create the rat
  a person, passive with can-move true and forbidden-rooms [the Shed]
  in the Yard

  A watchful rat.

create the player
  starts in the Gate

  You.
