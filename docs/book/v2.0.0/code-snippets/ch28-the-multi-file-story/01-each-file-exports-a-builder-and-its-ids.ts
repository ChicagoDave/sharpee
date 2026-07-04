// zoo-map.ts
export interface RoomIds {
  entrance: string;
  pettingZoo: string;
  aviary: string;
  // …
}

export function createZooMap(
  world: WorldModel,
): { rooms: RoomIds; /* … */ } {
  // create rooms, wire exits, add scenery
  // return the IDs the rest of the story needs
}
