story "The Long Cold" by "DevArch"
  id: hunger-demo
  version: 1.0.0
  use hunger
    grows 3 each turn
    peckish at 3 says feeling-peckish
    hungry at 6 says stomach-tightens
    starving at 9
    fatal at 12

define phrases en-US
  feeling-peckish:
    A hollow ache settles behind your ribs.
  stomach-tightens:
    Your stomach knots and will not let go.

create the Waste
  a room

  A grey salt waste under a sunless sky. Nothing grows here, and the wind
  never stops.

create the ration
  aka biscuit
  edible
  in the Waste

  One dry emergency ration, hard as a roof tile.

create the player
  starts in the Waste

  You.
