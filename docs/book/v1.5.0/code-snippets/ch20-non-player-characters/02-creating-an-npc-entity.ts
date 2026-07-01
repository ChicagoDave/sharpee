const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);

zookeeper.add(new IdentityTrait({
  name: 'zookeeper',
  description:
    'A friendly zookeeper in khaki overalls and a wide-brimmed hat, ' +
    'carrying a bucket of mixed animal feed. A name tag reads "Sam."',
  aliases: ['keeper', 'zookeeper', 'sam'],
  properName: false,
  article: 'a',
}));

zookeeper.add(new ActorTrait({ isPlayer: false }));

zookeeper.add(new NpcTrait({
  behaviorId: 'zoo-keeper-patrol',  // must match the behavior's id
  canMove: true,                    // allowed to change rooms
  isAlive: true,
  isConscious: true,
}));

world.moveEntity(zookeeper.id, mainPath.id);
