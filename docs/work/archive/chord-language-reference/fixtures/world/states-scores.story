story "States and Scores" by "Sharpee Docs"
  id: chord-ref-states-scores
  version: 0.0.1
  use scoring

create the Orangery
  a room
  score visit worth 5

  Orange trees in copper tubs line the glass walls.

  after entering it
    award visit
  end after

create the fountain
  scenery
  in the Orangery
  states, reversible: flowing, still

  A marble fountain in the middle of the floor.

  on touching it
    change it to still when it is flowing
    phrase fountain-stopped when it is still
  end on

create the prize marrow
  aka marrow
  in the Orangery
  states: entire, sliced
  score sliced-the-marrow worth 10

  A rosette-winning marrow of absurd size.

  on cutting it
    change it to sliced
    award sliced-the-marrow
    phrase marrow-sliced
  end on

create the player
  starts in the Orangery

define phrases en-US
  fountain-stopped:
    The water shivers and stills.
  marrow-sliced:
    The knife sinks in. The fair committee would weep.
