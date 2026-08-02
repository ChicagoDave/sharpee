story "Clause Forms" by "Sharpee Docs"
  id: chord-ref-clause-forms
  version: 0.0.1
  states: daylight, dusk

create the Kitchen Garden
  a room

  Neat beds of lettuce and beetroot.

create the scarecrow
  scenery
  in the Kitchen Garden

  A scarecrow in a donated raincoat.

  on taking anything as the taker
    phrase scarecrow-stare
  end on

  on every turn while dusk, once
    phrase scarecrow-shadow
  end on

create the slug
  scenery
  in the Kitchen Garden

  A frankly enormous slug.

  on every turn while one chance in 3
    phrase slug-progress
  end on

create the player
  starts in the Kitchen Garden

define phrases en-US
  scarecrow-stare:
    The scarecrow's button eyes seem to follow the theft.
  scarecrow-shadow:
    In the failing light, the scarecrow's shadow stretches all the way
    to your boots.
  slug-progress:
    The slug advances another inch on the lettuce.
