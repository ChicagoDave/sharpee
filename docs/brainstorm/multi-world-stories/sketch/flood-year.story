## SKETCH, not Chord. "The Sluice": the Flood Year, a world. Mara is the
## player here, as a girl. Apart from the lines marked NEW this is ordinary
## Chord, and it names no other world. See sluice.story.

world the Flood Year                                   ## NEW (in place of `story`)
  resets on entry                                      ## NEW

create the Yard
  a room
  in to the Old Wheel House

  Rain, and your father's coat on the fence.

create the Old Wheel House
  a room
  out to the Yard

  The wheel is new and green with paint.

create the notch
  a thing, scenery
  in the Old Wheel House

  A notch cut in the rim, and three chalk strokes after it.

  after the player examining
    emit mark-seen
  end after

create Mara
  a person, proper
  playable
  starts in the Yard

  You are nine.

  ## The river is a fact this world asks about and never writes.
  on every turn while the river is on the stairs
    phrase memory-thins
  end on

## A world that resets starts again on every entry.
before the world starts                                ## NEW
  change the player to Mara
end before

define phrases en-US
  memory-thins:
    The rain sounds wrong for a moment, like water in a stairwell.
