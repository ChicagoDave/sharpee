// A new room, behind the gate.
const supplyRoom = world.createEntity(
  'Supply Room',
  EntityType.ROOM,
);
supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
supplyRoom.add(new IdentityTrait({
  name: 'Supply Room',
  description:
    'A cluttered storage room behind the staff gate. Metal ' +
    'shelves line the walls, stacked with feed sacks, coiled ' +
    'hoses, and cleaning supplies.',
  aliases: ['supply room', 'storage room', 'store room'],
  article: 'the',
}));

// The metal shelves: scenery, so "examine shelves" has something
// to find.
const shelves = world.createEntity(
  'metal shelves',
  EntityType.SCENERY,
);
shelves.add(new IdentityTrait({
  name: 'metal shelves',
  description:
    'Industrial steel shelving stacked with feed sacks and ' +
    'supplies.',
  aliases: ['shelves', 'metal shelves', 'shelf', 'shelving'],
}));
world.moveEntity(shelves.id, supplyRoom.id);

// The key: an ordinary item, placed at the entrance for the
// player to find.
const keycard = world.createEntity(
  'staff keycard',
  EntityType.ITEM,
);
keycard.add(new IdentityTrait({
  name: 'staff keycard',
  description:
    'A white plastic keycard reading "WILLOWBROOK ZOO / STAFF ' +
    'ONLY," with a faded photo of a smiling zookeeper on the ' +
    'back.',
  aliases: [
    'keycard', 'key card', 'card', 'key', 'staff keycard',
  ],
  article: 'a',
}));
world.moveEntity(keycard.id, entrance.id);

// The gate: type DOOR, wearing all five traits, placed on the
// Main Path.
const staffGate = world.createEntity(
  'staff gate',
  EntityType.DOOR,
);
staffGate.add(new IdentityTrait({
  name: 'staff gate',
  description:
    'A sturdy metal gate marked STAFF ONLY, with a card reader ' +
    'beside it.',
  aliases: ['gate', 'staff gate', 'metal gate', 'staff door'],
  article: 'a',
}));
staffGate.add(new DoorTrait({
  room1: mainPath.id,
  room2: supplyRoom.id,
  bidirectional: true,
}));
staffGate.add(new OpenableTrait({ isOpen: false }));
staffGate.add(new LockableTrait({
  isLocked: true,
  keyId: keycard.id,
}));
staffGate.add(new SceneryTrait());
world.moveEntity(staffGate.id, mainPath.id);

// Wire the passage on BOTH sides, each routing through the gate
// with `via`. This replaces the Main Path exits from Chapter 4,
// adding the south passage.
mainPath.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: entrance.id },
  [Direction.EAST]:  { destination: pettingZoo.id },
  [Direction.WEST]:  { destination: aviary.id },
  [Direction.SOUTH]: {
    destination: supplyRoom.id,
    via: staffGate.id,
  },
};
supplyRoom.get(RoomTrait)!.exits = {
  [Direction.NORTH]: {
    destination: mainPath.id,
    via: staffGate.id,
  },
};
