story "Endings" by "Sharpee Docs"
  id: chord-ref-endings
  version: 0.0.1

create the Walled Garden
  a room

  Every bed weeded, every rose deadheaded. Nearly.

create the last dandelion
  aka dandelion, weed
  in the Walled Garden

  A single dandelion, taunting you from the best bed.

  on pulling it
    remove it
    win garden-perfect
  end on

create the wasp nest
  aka nest
  scenery
  in the Walled Garden

  A papery bulge under the shed eaves. Best left alone.

  on poking it
    lose stung when one chance in 2
    phrase near-miss
  end on

create the player
  starts in the Walled Garden

define phrases en-US
  garden-perfect:
    You straighten up, dust off your knees, and survey a garden with
    nothing left to forgive. Perfect.
  stung:
    The nest erupts. The rest is running, and regret.
  near-miss:
    The nest hums like a struck wire. You back away very, very slowly.
