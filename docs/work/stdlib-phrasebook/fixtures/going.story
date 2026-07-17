story "Phrasebook: Going" by "Sharpee Docs"
  id: phrasebook-going
  version: 0.0.1

create the Meadow
  a room
  north to the Orchard
  east is blocked: hedge-thick

  Knee-high grass, and a dark hedge along the eastern edge.

create the Orchard
  a room
  south to the Meadow

  Apple trees in crooked rows.

create the player
  starts in the Meadow

define phrases en-US
  hedge-thick:
    The hedge is a wall of blackthorn. Not that way.
