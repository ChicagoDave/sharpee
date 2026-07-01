initializeWorld(world: WorldModel): void {
  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);

  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({
    name: 'Zoo Entrance',
    description:
      'You stand before the gates of the Willowbrook Family Zoo. ' +
      'A cheerful welcome sign arches over the entrance, and a small ' +
      'ticket booth sits to one side.',
    aliases: ['entrance', 'gates', 'gate'],
    article: 'the',
  }));

  const sign = world.createEntity('welcome sign', EntityType.SCENERY);
  sign.add(new IdentityTrait({
    name: 'welcome sign',
    description: 'A brightly painted wooden sign welcomes you to the zoo.',
    aliases: ['sign', 'wooden sign'],
    article: 'a',
  }));

  const booth = world.createEntity('ticket booth', EntityType.SCENERY);
  booth.add(new IdentityTrait({
    name: 'ticket booth',
    description:
      'A small wooden booth with a sliding glass window. A sign in the ' +
      'window reads "Self-Guided Tours / No Ticket Needed Today!"',
    aliases: ['booth', 'ticket booth', 'window'],
    article: 'a',
  }));

  world.moveEntity(sign.id, entrance.id);
  world.moveEntity(booth.id, entrance.id);

  const player = world.getPlayer();
  if (player) world.moveEntity(player.id, entrance.id);
}
