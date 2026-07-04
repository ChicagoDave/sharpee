const parkBench = world.createEntity(
  'park bench',
  EntityType.SUPPORTER,
);
parkBench.add(new IdentityTrait({
  name: 'park bench',
  description:
    'A weathered wooden bench worn smooth by decades of ' +
    'visitors.',
  aliases: ['bench', 'park bench', 'seat'],
}));
parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
// can't take the bench itself
parkBench.add(new SceneryTrait());
world.moveEntity(parkBench.id, mainPath.id);
