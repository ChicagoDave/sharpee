story "The Walled Garden" by "Sharpee Docs"
  id: walled-garden
  version: 1.0.0
  blurb: A pocket world for the Chord language reference.
  states: daylight, dusk
  score explorer worth 5
  use scoring

create the Garden Gate
  a room

  A wrought-iron gate stands open between brick pillars.

  after entering it
    change the story to dusk
  end after

create the player
  starts in the Garden Gate
