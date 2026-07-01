createPlayer(world: WorldModel): IFEntity {
  const player = world.createEntity('yourself', EntityType.ACTOR);

  player.add(new IdentityTrait({
    name: 'yourself',
    description: 'Just an ordinary visitor to the zoo.',
    aliases: ['self', 'myself', 'me'],
    properName: true,
    article: '',
  }));

  player.add(new ActorTrait({ isPlayer: true }));

  player.add(new ContainerTrait({
    capacity: { maxItems: 10 },
  }));

  return player;
}
