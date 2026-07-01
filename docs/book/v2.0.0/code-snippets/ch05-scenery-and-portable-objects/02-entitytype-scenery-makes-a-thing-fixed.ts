const fence = world.createEntity('iron fence', EntityType.SCENERY);
fence.add(new IdentityTrait({
  name: 'iron fence',
  description: 'A tall wrought-iron fence with animal silhouettes.',
  aliases: ['fence', 'iron fence', 'railing'],
}));
world.moveEntity(fence.id, entrance.id);
