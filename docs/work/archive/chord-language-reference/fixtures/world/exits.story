story "Exits" by "Sharpee Docs"
  id: chord-ref-exits
  version: 0.0.1

create the Rose Walk
  a room
  north to the Herb Garden
  east to the Orchard
  south is blocked: hedge-too-thick

  Gravel crunches underfoot between the rose beds.

create the Herb Garden
  a room
  south to the Rose Walk

  Thyme and rosemary scent the air.

create the Orchard
  a room
  west to the Rose Walk
  up is blocked while the ladder is not here: no-way-up

  Apple trees stand in crooked rows.

create the ladder
  in the Herb Garden

  A weathered wooden ladder.

create the player
  starts in the Rose Walk

define phrases en-US
  hedge-too-thick:
    The hedge is far too thick to push through.
  no-way-up:
    The lowest branches are out of reach without a ladder.
