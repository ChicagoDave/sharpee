const pettingPlaque = world
  .createEntity('info plaque', EntityType.SCENERY);
pettingPlaque.add(new IdentityTrait({
  name: 'info plaque',
  description:
    'A brass plaque mounted on a wooden post near the petting ' +
    'zoo gate. It has text etched into the metal.',
  aliases: ['plaque', 'info plaque', 'brass plaque'],
  properName: false,
  article: 'an',
}));
pettingPlaque.add(new ReadableTrait({
  text:
    'PYGMY GOATS: These Nigerian Dwarf goats are gentle, ' +
    'curious, and always hungry. They can eat up to 3% of ' +
    'their body weight daily. Please use only zoo-approved ' +
    'feed from the dispensers.\n\nHOLLAND LOP RABBITS: Known ' +
    'for their floppy ears and calm temperament. Our pair, ' +
    'Biscuit and Marmalade, were born right here at ' +
    'Willowbrook in 2023.',
}));
world.moveEntity(pettingPlaque.id, pettingZoo.id);
