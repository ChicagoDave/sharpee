const aviary = world.createEntity('Aviary', EntityType.ROOM);
aviary.add(new RoomTrait({
  exits: {},
  isDark: false,
  initialDescription:
    'You step inside a soaring mesh dome. Brilliantly ' +
    'colored parrots chatter from rope perches, and a toucan ' +
    'eyes you curiously from a branch overhead. The exit ' +
    'back to the main path is to the east.',
}));
aviary.add(new IdentityTrait({
  name: 'Aviary',
  description:
    'Inside the soaring mesh dome, brilliantly colored ' +
    'parrots chatter from rope perches, and a toucan eyes ' +
    'you curiously from a branch overhead. The exit back to ' +
    'the main path is to the east.',
  aliases: ['aviary', 'bird house', 'dome'],
  article: 'the',
}));
