const backpack = world.createEntity(
  'backpack',
  EntityType.CONTAINER,
);
backpack.add(new IdentityTrait({
  name: 'backpack',
  description: 'A small red canvas backpack.',
  aliases: ['backpack', 'bag', 'pack'],
}));
backpack.add(new ContainerTrait({
  capacity: { maxItems: 5 },   // holds up to 5 things
}));
world.moveEntity(backpack.id, entrance.id);
