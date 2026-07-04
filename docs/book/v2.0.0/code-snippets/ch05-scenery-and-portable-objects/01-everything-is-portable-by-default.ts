const penny = world.createEntity(
  'souvenir penny',
  EntityType.ITEM,
);
penny.add(new IdentityTrait({
  name: 'souvenir penny',
  description:
    'A flattened copper penny stamped with a smiling elephant.',
  aliases: ['penny', 'coin', 'souvenir'],
}));
world.moveEntity(penny.id, mainPath.id);
