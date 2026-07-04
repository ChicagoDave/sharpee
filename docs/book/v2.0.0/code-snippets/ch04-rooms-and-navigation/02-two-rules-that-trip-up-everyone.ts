entranceRoom.exits = {
  // entrance → path
  [Direction.SOUTH]: { destination: mainPath.id },
};
mainPathRoom.exits = {
  // path → entrance (the way back)
  [Direction.NORTH]: { destination: entrance.id },
};
