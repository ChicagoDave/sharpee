story
  title: Sixteen Rooms
  authors:
    Test
  id: maze-sixteen
  story-version: 0.0.1

## The UNDERGROUND maze, rooms 61 to 76: two kinds of room, each declared
## once, with the 1979 exits in a one-way table. The `out` exits wait for
## `in`/`out` exits (GH #568); the rooms beyond the maze are stubs.

create the Maze
  a region

  rooms Maze 61 to 71
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

  rooms Dead End 72 to 76
    room name:
      Dead end.

    Dead end.

  exits, one-way
    the Maze 61: east to the Maze 62, west to the Maze 63, south to the Sphere Room 34
    the Maze 62: north to the Maze 63, east to the Dead End 73, west to the Maze 61, south to the Dead End 72
    the Maze 63: north to the Maze 64, east to the Maze 62, west to the Maze 67, south to the Maze 61
    the Maze 64: east to the Maze 65, west to the Maze 64, south to the Maze 63
    the Maze 65: east to the Maze 66, west to the Maze 64
    the Maze 66: north to the Maze 66, east to the Maze 66, west to the Maze 66, south to the Maze 66, up to the Maze 65, down to the Dead End 74
    the Maze 67: north to the Maze 68, east to the Maze 70, west to the Maze 63
    the Maze 68: north to the Maze 69, east to the Maze 67, west to the Maze 68, south to the Maze 68
    the Maze 69: north to the Room 77, west to the Maze 68
    the Maze 70: north to the Dead End 75, south to the Maze 67
    the Maze 71: north to the Maze 71, east to the Dead End 76, west to the Maze 70, south to the Dead End 75
    the Dead End 72: north to the Maze 62
    the Dead End 73: west to the Maze 62
    the Dead End 74: down to the Dead End 74
    the Dead End 75: north to the Maze 71
    the Dead End 76: west to the Maze 71

create the Sphere Room 34
  a room
  room name:
    Sphere room
  north to the Maze 61, one-way
  east to the Room 35, one-way
  west to the Room 41, one-way
  south to the Room 33, one-way

  This room has the shape of a giant sphere, with holes in all of the
  major directions.

create the Room 33
  a room

  A stub beyond the maze.

create the Room 35
  a room

  A stub beyond the maze.

create the Room 41
  a room

  A stub beyond the maze.

create the Room 77
  a room

  A stub beyond the maze.

create Alex
  a person
  playable
  starts in the Sphere Room 34

  You.

before the game starts
  change the player to Alex
end before
