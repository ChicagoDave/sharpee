story "Phrase Overrides" by "Sharpee Docs"
  id: chord-ref-phrase-override
  version: 0.0.1

create the Aviary Corner
  a room

  A small wire dome tucked behind the greenhouse.

create the garden robin
  aka robin
  scenery
  in the Aviary Corner
  states, reversible: perched, hopping

  A round little robin with one white tail feather.

  on watching it
    change it to hopping when it is perched
    phrase robin-watched
  end on

  phrase robin-watched, cycling:
    The robin cocks its head at you, entirely unimpressed.
  or
    The robin hops once, then pretends you are not there.

  phrase detail while it is hopping:
    It hops from perch to perch as you watch.

create the player
  starts in the Aviary Corner

define phrases en-US
  robin-watched:
    The robin does something robins do.
