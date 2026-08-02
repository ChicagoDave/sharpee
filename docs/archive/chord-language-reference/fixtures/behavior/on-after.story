story "On and After" by "Sharpee Docs"
  id: chord-ref-on-after
  version: 0.0.1

create the Apiary
  a room

  White hive boxes stand in a quiet row.

  after entering it
    phrase apiary-hum
      The hum reaches you before the gate has even closed.
  end after

create the hive box
  aka hive, box
  scenery, openable
  in the Apiary
  states: humming, quiet

  A white wooden hive box, lid held down by a brick.

  on opening it
    refuse when it is humming: bees-disturbed
    change it to quiet
  end on

  after opening it
    phrase honey-smell
  end after

create the player
  starts in the Apiary

define phrases en-US
  bees-disturbed:
    The hive rises half a tone in pitch. You reconsider.
  honey-smell:
    The smell of warm honey drifts up from the frames.
