story "Closed Condition Misuse" by "Sharpee Docs"
  id: chord-ref-closed-condition
  version: 0.0.1
  states: daylight, dusk

define condition night-fallen: the story is dusk

create the Lawn
  a room

  A lawn in need of mowing.

  on every turn while any night-fallen
    phrase too-dark-to-mow
  end on

create the player
  starts in the Lawn

define phrases en-US
  too-dark-to-mow:
    Too dark for mowing now.
