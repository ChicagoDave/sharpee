story "Cuttable" by "Sharpee Docs"
  id: chord-ref-cuttable
  version: 0.0.1

create the Potting Shed
  a room

  Tools on every wall, twine on every shelf.

create the rusty knife
  aka knife
  in the Potting Shed

  A rusty but serviceable knife.

create the straw bale
  aka bale, twine
  cuttable with tool the rusty knife
  in the Potting Shed
  states: bound, loose

  A bale of straw, bound tight with orange twine.

  on cutting it
    change it to loose
    phrase twine-cut
  end on

create the player
  starts in the Potting Shed

define phrases en-US
  twine-cut:
    The knife saws through the twine and the bale slumps open.
