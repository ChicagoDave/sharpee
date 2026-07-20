create the Walled Garden
  a room
  north to the Potting Shed through the green door
  east to the Grotto
  south is blocked: wall-too-high

  Espaliered pears line the old brick walls.

create the green door
  a door
  aka door

  A green door in the north wall, painted and peeling.

  on going it
    refuse when the player holds the wheelbarrow: barrow-too-wide
  end on

  phrase barrow-too-wide:
    The wheelbarrow jams in the doorway. You back out again.

create the Potting Shed
  a room

  Clay pots on every shelf, and the smell of compost.

  after entering it, once
    phrase shed-memory
      You spent a whole summer in here once, pricking out seedlings.
  end after

create the Grotto
  a room, dark
  west to the Walled Garden

  Dripping stone and ferns nobody planted.

create the wheelbarrow
  aka barrow
  in the Walled Garden

  A wooden wheelbarrow, wider than it needs to be.

create the player
  starts in the Walled Garden

define phrases en-US
  wall-too-high:
    The south wall is twelve feet of smooth brick. Not without a ladder.
