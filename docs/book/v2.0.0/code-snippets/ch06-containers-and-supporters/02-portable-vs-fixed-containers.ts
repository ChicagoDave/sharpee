const dispenser = world.createEntity(
  'feed dispenser',
  EntityType.CONTAINER,
);
dispenser.add(new IdentityTrait({
  name: 'feed dispenser',
  description:
    'A coin-operated feed dispenser mounted on a wooden post, ' +
    'its glass globe half full of pellets.',
  aliases: ['dispenser', 'feed dispenser', 'machine', 'globe'],
}));
dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
// can't take the dispenser itself
dispenser.add(new SceneryTrait());
world.moveEntity(dispenser.id, pettingZoo.id);
