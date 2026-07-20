story "The Scullery" by "ref"
  id: plugins-sequence
  version: 0.0.1
  states: quiet, boiling

create the Scullery
  a room

  A stone-flagged scullery, a kettle already over the flame.

create the kettle
  scenery
  in the Scullery

  A copper kettle, beginning to warm.

create the player
  starts in the Scullery

define sequence kettle coming to the boil
  at turn 2
    phrase kettle-murmur
      The kettle begins to murmur on the range.
  2 turns later
    phrase kettle-boils
      The kettle reaches a rolling boil.
    change the story to boiling
end sequence

define sequence steam
  when the story becomes boiling
    phrase steam-note
      Steam fogs the little window over the sink.
end sequence
