story "Select On" by "Sharpee Docs"
  id: chord-ref-select-on
  version: 0.0.1

create the Glasshouse
  a room

  Warm air and the smell of damp compost.

create the amaryllis bulb
  aka bulb, amaryllis
  in the Glasshouse
  states: dormant, sprouting, blooming

  A fat bulb in a chipped terracotta pot.

  on examining it
    select on its state
      when dormant
        phrase bulb-dormant
      when sprouting
        phrase bulb-sprouting
      when blooming
        phrase bulb-blooming
    end select
  end on

  on watering it
    change it to blooming when it is sprouting
    change it to sprouting when it is dormant
    phrase watered
  end on

create the player
  starts in the Glasshouse

define phrases en-US
  bulb-dormant:
    A dry brown bulb, biding its time under an inch of compost.
  bulb-sprouting:
    A green spear has broken the surface overnight.
  bulb-blooming:
    Two scarlet trumpets blaze at the top of the stalk.
  watered:
    You give the pot a careful soak.
