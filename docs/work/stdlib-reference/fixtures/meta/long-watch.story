story "The Long Watch" by "Sharpee Docs"
  id: stdlib-ref-meta
  version: 1.2.0
  blurb: One night in a lighthouse, told a turn at a time.
  score found-the-flare worth 10

create the Lamp Gallery
  a room

  The top of the lighthouse, glass on every side.

create the signal flare
  aka flare
  in the Lamp Gallery

  A stubby red signal flare, sealed in wax paper.

  after taking it
    award found-the-flare
  end after

create the player
  starts in the Lamp Gallery
