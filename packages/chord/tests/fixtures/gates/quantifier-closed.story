story "Quantifier Closed-Condition Gate" by "Sharpee Platform"
  id: quantifier-closed
  version: 0.0.1

define condition sweep-time: the player is in the Barn

create the Barn
  a room

create the player
  starts in the Barn

create the goat
  in the Barn

  on prodding it while any sweep-time
    phrase nope
  end on

  after feeding it while no sweep-time
    each sweep-time
      phrase nope
    end each
  end after

define phrases en-US
  nope:
    Nope.
