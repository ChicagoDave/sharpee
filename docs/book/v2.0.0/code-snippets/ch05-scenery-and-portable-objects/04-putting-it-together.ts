// Scenery: the SCENERY type fixes it in place, examinable,
// mentioned in room prose.
const fence = world.createEntity(
  'iron fence',
  EntityType.SCENERY,
);
fence.add(new IdentityTrait({
  name: 'iron fence',
  description:
    'A tall wrought-iron fence with animal silhouettes.',
  aliases: ['fence', 'iron fence', 'railing'],
}));
world.moveEntity(fence.id, entrance.id);

// More scenery: a pair of rabbits in the Petting Zoo, beside the
// goats.
const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
rabbits.add(new IdentityTrait({
  name: 'rabbits',
  description:
    'A pair of Holland Lop rabbits with floppy ears and ' +
    'twitching noses, one pure white and the other brown and ' +
    'cream.',
  aliases: ['rabbits', 'rabbit', 'bunnies', 'bunny'],
  article: 'some',
  grammaticalNumber: 'plural',
}));
world.moveEntity(rabbits.id, pettingZoo.id);

// A takeable item: no SceneryTrait, so it's portable by default.
const zooMap = world.createEntity('zoo map', EntityType.ITEM);
zooMap.add(new IdentityTrait({
  name: 'zoo map',
  description:
    'A colorful folding map of the zoo, a heart drawn around ' +
    'the petting zoo in crayon.',
  aliases: ['map', 'zoo map', 'folding map'],
}));
world.moveEntity(zooMap.id, entrance.id);

// A second takeable item, in the Petting Zoo this time.
const animalFeed = world.createEntity(
  'bag of animal feed',
  EntityType.ITEM,
);
animalFeed.add(new IdentityTrait({
  name: 'bag of animal feed',
  description:
    'A small brown paper bag of dried corn and pellets. The ' +
    'label reads "ZOO SNACKS: Safe for goats, rabbits, and ' +
    'birds." It rustles invitingly.',
  aliases: [
    'feed', 'animal feed', 'bag of feed',
    'bag', 'corn', 'pellets',
  ],
}));
world.moveEntity(animalFeed.id, pettingZoo.id);
