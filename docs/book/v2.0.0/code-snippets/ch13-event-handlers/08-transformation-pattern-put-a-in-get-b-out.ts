const pennyId = this.entityIds.penny;
const pressId = this.entityIds.souvenirPress;

world.chainEvent(
  'if.event.put_in',
  (
    event: ISemanticEvent,
    w: IWorldModel,
  ): ISemanticEvent | null => {
    const data = event.data as Record<string, any>;
    if (data.itemId !== pennyId ||
        data.targetId !== pressId) return null;

    // 1. Destroy the input
    w.removeEntity(pennyId);

    // 2. Create the output
    const pressedPenny = w.createEntity(
      'pressed penny',
      EntityType.ITEM,
    );
    pressedPenny.add(new IdentityTrait({
      name: 'pressed penny',
      description:
        'A flattened oval of copper with an embossed toucan.',
      aliases: ['pressed penny', 'pressed coin', 'souvenir'],
      properName: false,
      article: 'a',
    }));

    // 3. Hand it to the player
    const player = w.getPlayer();
    if (player) w.moveEntity(pressedPenny.id, player.id);

    // 4. Tell them what happened
    return {
      id: `zoo-press-penny-${Date.now()}`,
      type: 'zoo.event.penny_pressed',
      timestamp: Date.now(),
      entities: {},
      data: {
        text:
          'CLUNK! CRUNCH! WHIRRR! The souvenir press swallows ' +
          'the penny and spits out a beautiful pressed penny ' +
          'with an embossed toucan design. You pocket it ' +
          'proudly.',
      },
    };
  },
  { key: 'zoo.chain.penny-press' },
);
