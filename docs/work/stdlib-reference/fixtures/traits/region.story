create the Gatehouse
  a room
  east to the Orchard

  A stone gatehouse at the edge of the grounds.

create the Orchard
  a room
  west to the Gatehouse
  east to the Apiary

  Apple trees in ragged rows.

create the Apiary
  a room
  west to the Orchard

  White hives stand in the grass.

create the Grounds
  a region
  containing the Orchard, the Apiary

  after entering it
    phrase under-the-boughs
  end after

  after leaving it
    phrase back-on-the-road
  end after

  on every turn
    phrase bees-drone
  end on

  phrase under-the-boughs:
    You pass under the boughs; the air turns sweet with windfall.

  phrase back-on-the-road:
    The orchard smell fades behind you.

  phrase bees-drone:
    Bees drone somewhere among the trees.

create the player
  starts in the Gatehouse
