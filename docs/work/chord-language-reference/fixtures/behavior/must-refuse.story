story "Must and Refuse" by "Sharpee Docs"
  id: chord-ref-must-refuse
  version: 0.0.1

define condition loose-tool: it is a tool and it is not in the tool rack

create the Potting Bench
  a room

  A bench scarred by a hundred seasons.

create the tool rack
  aka rack
  a container
  scenery
  in the Potting Bench

  A wall rack with a painted outline for every tool.

  on stocking it
    it must be a tool: not-a-tool
    it must be any loose-tool: already-racked
    the player must be in the Potting Bench: too-far-away
    the player must hold the secateurs: hands-empty
    the player must see the tool rack: too-dark
    the player must reach the tool rack: out-of-reach
    phrase racked
  end on

create the secateurs
  a tool
  in the Potting Bench

  Sharp secateurs with red handles.

  on sharpening it
    it must be dull: already-sharp
    refuse when the player wears the gardening mittens: mittens-on
    change it to sharp
    phrase sharpened
  end on

  states, reversible: dull, sharp

create the gardening mittens
  aka mittens
  wearable
  in the Potting Bench

  Thick canvas mittens.

create the thorn cutting
  aka cutting
  in the Potting Bench

  A blackthorn cutting, all spikes.

  on taking it
    refuse all-thorns
  end on

create the player
  starts in the Potting Bench

define phrases en-US
  all-thorns:
    There is no part of it you can safely hold.
  not-a-tool:
    That has no place on the rack.
  already-racked:
    Everything with an outline is already home.
  too-far-away:
    You would need to be at the bench for that.
  hands-empty:
    You need the secateurs in hand first.
  too-dark:
    You can barely make out the rack.
  out-of-reach:
    The rack is mounted too high.
  racked:
    Every tool clicks into its painted outline.
  already-sharp:
    They could cut a shadow already.
  mittens-on:
    Not with mittens on.
  sharpened:
    A few strokes of the stone and the blades gleam.
