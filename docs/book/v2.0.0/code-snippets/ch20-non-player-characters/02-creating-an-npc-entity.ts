const zookeeper = world.createEntity(
  'zookeeper',
  EntityType.ACTOR,
);

zookeeper.add(new IdentityTrait({
  name: 'zookeeper',
  description:
    'A friendly zookeeper in khaki overalls and a ' +
    'wide-brimmed hat, carrying a bucket of mixed ' +
    'animal feed. A name tag reads "Sam."',
  aliases: ['keeper', 'zookeeper', 'sam'],
  properName: false,
  article: 'a',
}));

zookeeper.add(new ActorTrait({ isPlayer: false }));

zookeeper.add(new NpcTrait({
  // must match the behavior's id
  behaviorId: 'zoo-keeper-patrol',
  canMove: true,                    // allowed to change rooms
  // "The zookeeper leaves to the east."
  announcesMovement: true,
  isAlive: true,
  isConscious: true,
}));

world.moveEntity(zookeeper.id, mainPath.id);
