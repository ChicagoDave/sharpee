const giftShop = world.createEntity('Gift Shop', EntityType.ROOM);
giftShop.add(new RoomTrait({ exits: {}, isDark: false }));
giftShop.add(new IdentityTrait({
  name: 'Gift Shop',
  description:
    'A small zoo gift shop crammed with stuffed animals and ' +
    'postcards. A large souvenir penny press stands near the ' +
    'door. The aviary is back to the east.',
  aliases: ['gift shop', 'shop', 'store'],
  article: 'the',
}));
// Connect it west of the Aviary (and back east). This replaces
// the Aviary exits from Chapter 4, adding the west passage.
aviary.get(RoomTrait)!.exits = {
  [Direction.EAST]: { destination: mainPath.id },
  [Direction.WEST]: { destination: giftShop.id },
};
giftShop.get(RoomTrait)!.exits = {
  [Direction.EAST]: { destination: aviary.id },
};

const souvenirPress = world.createEntity(
  'souvenir press',
  EntityType.CONTAINER,
);
souvenirPress.add(new IdentityTrait({
  name: 'souvenir press',
  description:
    'A heavy cast-iron machine with a crank handle and a slot ' +
    'that accepts pennies. A sign reads: "INSERT PENNY, TURN ' +
    'HANDLE, KEEP FOREVER!"',
  aliases: ['press', 'souvenir press', 'penny press', 'machine'],
  article: 'a',
}));
souvenirPress.add(new ContainerTrait({
  capacity: { maxItems: 1 },
}));
souvenirPress.add(new SceneryTrait());
world.moveEntity(souvenirPress.id, giftShop.id);

// Remember the IDs the event handlers will match against.
this.roomIds.giftShop = giftShop.id;
this.roomIds.pettingZoo = pettingZoo.id;
this.entityIds.animalFeed = animalFeed.id;
this.entityIds.penny = penny.id;
this.entityIds.souvenirPress = souvenirPress.id;
