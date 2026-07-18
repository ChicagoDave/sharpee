story "Forest Weather" by "Test"
  id: region-forest
  version: 0.0.1

create the Forest
  a region
  containing the Clearing, the Forest Path, and the Canyon View

  on every turn while one chance in 3
    phrase forest-birdsong
  end on

  after entering it
    phrase forest-gloom
  end after

  after leaving it
    phrase open-sky
  end after

create the Clearing
  a room
  east to the Forest Path

  A sunlit clearing in the forest.

create the Forest Path
  a room
  west to the Clearing
  east to the Canyon View

  A winding path between old growth trees.

create the Canyon View
  a room
  west to the Forest Path
  east to the White House

  A rocky ledge overlooking the canyon.

create the White House
  a room
  west to the Canyon View

  A boarded colonial house in an open field.

create the player
  starts in the White House

  You.

define phrase forest-birdsong, randomly
  You hear in the distance the chirping of a song bird.
or
  A large songbird flies past overhead.
end phrase

define phrase forest-gloom
  The forest closes in around you.
end phrase

define phrase open-sky
  The trees thin and the sky opens up.
end phrase
