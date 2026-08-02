story "Conditions" by "Sharpee Docs"
  id: chord-ref-conditions
  version: 0.0.1

create the Orchard Gate
  a room

  A stile between the orchard and the lane.

create the orchard cat
  aka cat
  scenery
  in the Orchard Gate
  states, reversible: dozing, alert

  A marmalade cat of great dignity.

  on petting it
    phrase cat-tolerates when it is dozing
    phrase cat-glare when it is alert and not one chance in 4
    phrase cat-purr when (it is alert and one chance in 4) or it wears the ribbon
    change it to alert when it is dozing
  end on

  on every turn while the wheelbarrow is here
    phrase cat-inspects
  end on

create the ribbon
  aka blue ribbon
  wearable
  in the Orchard Gate

  A prize ribbon, faded to a polite blue.

create the wheelbarrow
  aka barrow
  in the Orchard Gate

  A tin wheelbarrow with one soft tyre.

  on examining it
    phrase barrow-contents when it holds the apple
    phrase barrow-visible when the player can see it
    phrase barrow-in-gate when it is in the Orchard Gate
    phrase barrow-is-thing when it is a container
  end on

create the apple
  in the wheelbarrow

  A windfall apple, barely bruised.

  on taking it
    phrase apple-reachable when the player can reach it
    phrase apple-yours when the player has it
  end on

create the player
  starts in the Orchard Gate

define phrases en-US
  cat-tolerates:
    The cat permits one pat, possibly two.
  cat-glare:
    The cat fixes you with a look that has ended friendships.
  cat-purr:
    Against every expectation, the cat purrs.
  cat-inspects:
    The cat inspects the wheelbarrow with an auditor's eye.
  barrow-contents:
    The apple rolls against the tin side.
  barrow-visible:
    It is hard to miss.
  barrow-in-gate:
    It is parked by the stile.
  barrow-is-thing:
    It counts, technically, as storage.
  apple-reachable:
    Well within reach.
  apple-yours:
    You have the apple now.
