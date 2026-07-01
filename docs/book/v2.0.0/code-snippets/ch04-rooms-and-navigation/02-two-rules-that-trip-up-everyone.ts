entranceRoom.exits = {
  [Direction.SOUTH]: { destination: mainPath.id },   // entrance → path
};
mainPathRoom.exits = {
  [Direction.NORTH]: { destination: entrance.id },    // path → entrance (the way back)
};
