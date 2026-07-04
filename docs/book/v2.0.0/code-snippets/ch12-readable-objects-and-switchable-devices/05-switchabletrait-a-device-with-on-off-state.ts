const radio = world.createEntity('radio', EntityType.ITEM);
radio.add(new IdentityTrait({
  name: 'radio',
  description:
    'A battered portable radio held together with duct ' +
    'tape. A faded sticker on the side reads "ZOO FM | All ' +
    'Animals, All The Time."',
  aliases: ['radio', 'portable radio'],
  properName: false,
  article: 'a',
}));
radio.add(new SwitchableTrait({ isOn: false }));   // starts off
// bolted to the shelf
radio.add(new SceneryTrait());
world.moveEntity(radio.id, supplyRoom.id);
