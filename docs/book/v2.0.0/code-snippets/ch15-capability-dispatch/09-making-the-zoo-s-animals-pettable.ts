// The petting-zoo animals, already in the world, now pettable.
goats.add(new PettableTrait('goats'));
rabbits.add(new PettableTrait('rabbits'));

// A new resident of the Aviary: a scarlet macaw with a temper.
const parrot = world.createEntity('parrot', EntityType.ACTOR);
parrot.add(new IdentityTrait({
  name: 'parrot',
  description:
    'A magnificent scarlet macaw perched on a rope, watching ' +
    'you with one bright, calculating eye.',
  aliases: ['parrot', 'macaw', 'scarlet macaw'],
  article: 'a',
}));
parrot.add(new ActorTrait({ isPlayer: false }));
parrot.add(new PettableTrait('parrot'));
world.moveEntity(parrot.id, aviary.id);
