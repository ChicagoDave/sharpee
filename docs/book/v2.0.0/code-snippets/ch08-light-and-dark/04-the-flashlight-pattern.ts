const flashlight = world.createEntity('flashlight', EntityType.ITEM);
flashlight.add(new IdentityTrait({
  name: 'flashlight',
  description: 'A heavy rubberized flashlight with a bright halogen bulb.',
  aliases: ['flashlight', 'torch', 'light'],
}));
flashlight.add(new SwitchableTrait({ isOn: false }));
flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
world.moveEntity(flashlight.id, supplyRoom.id);
