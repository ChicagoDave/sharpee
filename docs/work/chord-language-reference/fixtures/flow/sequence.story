story "The Garden Afternoon" by "Sharpee Docs"
  id: chord-ref-sequence
  version: 0.0.1
  states: fine, raining

create the Long Lawn
  a room

  A stripe-mown lawn between deep borders.

create the bonfire
  aka fire
  in the Long Lawn
  states: laid, burning

  A pyramid of prunings ready for a match.

  on lighting it
    change it to burning
    phrase fire-lit
      The prunings catch with a satisfying whoosh.
  end on

create the player
  starts in the Long Lawn

define sequence gathering storm
  at turn 2
    phrase storm-distant
      Thunder mutters somewhere beyond the wall.
  3 turns later
    phrase storm-near
      The light goes pewter, and the first fat drops crater the dust.
  2 turns later
    phrase storm-breaks
      The storm breaks all at once, rain hammering the gravel.
    change the story to raining
end sequence

define sequence take shelter
  when the story becomes raining
    phrase shelter-note
      Anywhere with a roof suddenly seems like a very good idea.
end sequence

define sequence smoke drifts
  when the bonfire becomes burning
    phrase smoke-note
      A ribbon of blue smoke begins to drift across the garden.
end sequence
