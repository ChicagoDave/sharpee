mainPath.get(RoomTrait)!.exits = {
  [Direction.SOUTH]: {
    destination: supplyRoom.id,
    via: staffGate.id,          // must pass through this entity
  },
};
