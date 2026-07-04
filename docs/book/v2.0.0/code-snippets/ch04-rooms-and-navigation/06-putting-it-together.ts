initializeWorld(world: WorldModel): void {
  // Step 1: create every room first, with empty exits.
  const entrance = world.createEntity(
    'Zoo Entrance',
    EntityType.ROOM,
  );
  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({
    name: 'Zoo Entrance',
    description:
      'You stand before the gates of the Willowbrook Family ' +
      'Zoo. A cheerful welcome sign arches over the entrance, ' +
      'and a small ticket booth sits to one side. The main ' +
      'path leads south into the zoo grounds.',
    aliases: ['entrance', 'gates', 'gate'],
    article: 'the',
  }));

  const mainPath = world.createEntity(
    'Main Path',
    EntityType.ROOM,
  );
  mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
  mainPath.add(new IdentityTrait({
    name: 'Main Path',
    description:
      'A wide gravel path winds through the heart of the zoo. ' +
      'Colorful direction signs point every which way. To the ' +
      'east, a white picket fence surrounds the petting zoo. ' +
      'To the west, a tall mesh enclosure rises above the ' +
      'treetops, the aviary. The entrance gates are back to ' +
      'the north.',
    aliases: ['path', 'main path', 'gravel path'],
    article: 'the',
  }));

  const pettingZoo = world.createEntity(
    'Petting Zoo',
    EntityType.ROOM,
  );
  pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
  pettingZoo.add(new IdentityTrait({
    name: 'Petting Zoo',
    description:
      'A cheerful open-air enclosure filled with friendly ' +
      'animals. Pygmy goats trot around nibbling at visitors\' ' +
      'shoelaces, while a pair of fluffy rabbits hop near a ' +
      'hay bale. The main path is back to the west.',
    aliases: ['petting zoo', 'petting area', 'pen'],
    article: 'the',
  }));

  const aviary = world.createEntity('Aviary', EntityType.ROOM);
  aviary.add(new RoomTrait({ exits: {}, isDark: false }));
  aviary.add(new IdentityTrait({
    name: 'Aviary',
    description:
      'You step inside a soaring mesh dome. Brilliantly ' +
      'colored parrots chatter from rope perches, and a toucan ' +
      'eyes you curiously from a branch overhead. The exit ' +
      'back to the main path is to the east.',
    aliases: ['aviary', 'bird house', 'dome'],
    article: 'the',
  }));

  // Step 2: wire exits now that every room exists.
  entrance.get(RoomTrait)!.exits = {
    [Direction.SOUTH]: { destination: mainPath.id },
  };
  mainPath.get(RoomTrait)!.exits = {
    [Direction.NORTH]: { destination: entrance.id },
    [Direction.EAST]:  { destination: pettingZoo.id },
    [Direction.WEST]:  { destination: aviary.id },
  };
  pettingZoo.get(RoomTrait)!.exits = {
    [Direction.WEST]: { destination: mainPath.id },
  };
  aviary.get(RoomTrait)!.exits = {
    [Direction.EAST]: { destination: mainPath.id },
  };

  // Step 3: scenery. The welcome sign and ticket booth from
  // Chapter 2 stay in the entrance. The three new rooms get
  // scenery of their own. Each is the same pattern you already
  // know: an entity, an IdentityTrait, and a moveEntity to place
  // it. The EntityType.SCENERY type makes each one fixed.
  const sign = world.createEntity(
    'welcome sign',
    EntityType.SCENERY,
  );
  sign.add(new IdentityTrait({
    name: 'welcome sign',
    description:
      'A brightly painted wooden sign welcomes you to the zoo.',
    aliases: ['sign', 'welcome sign', 'wooden sign'],
    article: 'a',
  }));
  world.moveEntity(sign.id, entrance.id);

  const booth = world.createEntity(
    'ticket booth',
    EntityType.SCENERY,
  );
  booth.add(new IdentityTrait({
    name: 'ticket booth',
    description:
      'A small wooden booth with a sliding glass window ' +
      'reading "Self-Guided Tours / No Ticket Needed Today!"',
    aliases: ['booth', 'ticket booth', 'window'],
    article: 'a',
  }));
  world.moveEntity(booth.id, entrance.id);

  const directionSigns = world.createEntity(
    'direction signs',
    EntityType.SCENERY,
  );
  directionSigns.add(new IdentityTrait({
    name: 'direction signs',
    description:
      'A cluster of brightly colored arrow signs nailed to a ' +
      'wooden post. They point to: PETTING ZOO (east), AVIARY ' +
      '(west), REPTILE HOUSE (south -> coming soon!), and EXIT ' +
      '(north).',
    aliases: ['signs', 'direction signs', 'arrow signs', 'post'],
    article: 'some',
    grammaticalNumber: 'plural',
  }));
  world.moveEntity(directionSigns.id, mainPath.id);

  const goats = world.createEntity(
    'pygmy goats',
    EntityType.SCENERY,
  );
  goats.add(new IdentityTrait({
    name: 'pygmy goats',
    description:
      'Three pygmy goats with stubby legs and rectangular ' +
      'pupils, clearly hoping you have food.',
    aliases: ['goats', 'pygmy goats', 'goat'],
    article: 'some',
    grammaticalNumber: 'plural',
  }));
  world.moveEntity(goats.id, pettingZoo.id);

  const toucan = world.createEntity('toucan', EntityType.SCENERY);
  toucan.add(new IdentityTrait({
    name: 'toucan',
    description:
      'A Toco toucan with an enormous orange-and-black bill. ' +
      'It regards you with one intelligent eye.',
    aliases: ['toucan', 'bird', 'toco toucan'],
    article: 'a',
  }));
  world.moveEntity(toucan.id, aviary.id);

  // Step 4: place the player at the entrance, as in Chapter 2.
  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
}
