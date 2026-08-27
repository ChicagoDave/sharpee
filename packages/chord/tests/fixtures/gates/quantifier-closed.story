story
  title: Quantifier Closed-Condition Gate
  authors:
    Sharpee Platform
  id: quantifier-closed
  story-version: 0.0.1

define condition sweep-time: the player is in the Barn

create the Barn
  a room

create Alex
  a person
  playable
  starts in the Barn

create the goat
  in the Barn

  on the player prodding while any sweep-time
    phrase nope
  end on

  after the player feeding while no sweep-time
    each sweep-time
      phrase nope
    end each
  end after

define phrases en-US
  nope:
    Nope.

before the game starts
  change the player to Alex
end before
