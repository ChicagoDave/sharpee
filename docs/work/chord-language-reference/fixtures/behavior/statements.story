story "The Statements" by "Sharpee Docs"
  id: chord-ref-statements
  version: 0.0.1
  use scoring

define trait counting
  data
    tally: number, starts 0
end trait

create the Pumpkin Patch
  a room

  Fat pumpkins sprawl on their vines.

create the Compost Corner
  a room

  Steam rises gently from the heap.

create the champion pumpkin
  aka pumpkin
  counting
  in the Pumpkin Patch
  states: growing, picked
  score picked-the-champion worth 10

  A pumpkin that has outgrown its wheelbarrow.

  on measuring it
    set its tally to 3
    phrase tape-reading with girth = its tally
    emit pumpkin-measured
  end on

  on picking it
    change it to picked
    award picked-the-champion, once
    move it to the Compost Corner when it is picked
    phrase picked-note
    win harvest-glory when its tally is 3
  end on

create the slug trap
  aka trap
  scenery
  in the Pumpkin Patch

  A saucer of something the slugs find irresistible.

  on emptying it
    remove the champion slug
    phrase trap-emptied
    lose when the champion pumpkin is picked
  end on

create the champion slug
  aka slug
  scenery
  in the Pumpkin Patch

  A slug of prizewinning length.

create the player
  starts in the Pumpkin Patch

define phrases en-US
  harvest-glory:
    The village fete will speak of this gourd for a generation.
  tape-reading:
    The tape measure gives up partway around.
  pumpkin-measured:
    Word of the measurement spreads along the allotments.
  picked-note:
    It takes both arms and questionable posture.
  trap-emptied:
    You tip the saucer out behind the hedge.
