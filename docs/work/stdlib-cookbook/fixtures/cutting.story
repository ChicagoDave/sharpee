story "Phrasebook: Cutting" by "Sharpee Docs"
  id: phrasebook-cutting
  version: 0.0.1

create the Bell Tower
  a room

  Dust, bird droppings, and one taut bell rope.

create the bell rope
  aka rope
  cuttable with the shears
  scenery
  in the Bell Tower
  states: taut, severed

  A rope as thick as your wrist, humming with tension.

  on cutting it
    change it to severed
    phrase rope-severed
  end on

create the shears
  in the Bell Tower

  Heavy tin shears.

create the butter knife
  aka knife

  A knife for butter, and butter only.

create the player
  starts in the Bell Tower
  carries the butter knife

define phrases en-US
  rope-severed:
    The shears bite through strand after strand until the rope parts with
    a crack. Somewhere above, the bell swings free.
