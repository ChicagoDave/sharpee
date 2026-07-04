const camera = world.createEntity(
  'disposable camera',
  EntityType.ITEM,
);
camera.add(new IdentityTrait({
  name: 'disposable camera',
  description:
    'A cheap yellow disposable camera with "ZOO MEMORIES" ' +
    'on the side.',
  aliases: ['camera', 'disposable camera'],
  article: 'a',
}));
world.moveEntity(camera.id, giftShop.id);
