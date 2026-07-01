const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);
nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));
nocturnalExhibit.add(new IdentityTrait({
  name: 'Nocturnal Animals Exhibit',
  description:
    'A hushed, cavern-like hall lit by faint blue moonlight panels. Sugar ' +
    'gliders leap between branches, wide-eyed bush babies cling to a rope, ' +
    'and an enormous barn owl perches motionless on a stump.',
  aliases: ['nocturnal exhibit', 'nocturnal animals', 'dark exhibit', 'exhibit'],
  article: 'the',
}));

// Connect it south of the Supply Room, with the way back north. This adds the
// south passage to the Supply Room exits from Chapter 7.
supplyRoom.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id },
  [Direction.SOUTH]: { destination: nocturnalExhibit.id },
};
nocturnalExhibit.get(RoomTrait)!.exits = {
  [Direction.NORTH]: { destination: supplyRoom.id },
};

// The animals: scenery, examinable only once the room is lit.
const sugarGliders = world.createEntity('sugar gliders', EntityType.SCENERY);
sugarGliders.add(new IdentityTrait({
  name: 'sugar gliders',
  description: 'A family of tiny sugar gliders with enormous dark eyes, gliding between branches.',
  aliases: ['sugar gliders', 'gliders', 'sugar glider'],
  article: 'some',
}));
world.moveEntity(sugarGliders.id, nocturnalExhibit.id);

const bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
bushBabies.add(new IdentityTrait({
  name: 'bush babies',
  description: 'Two bush babies with impossibly large round eyes, clinging to a rope.',
  aliases: ['bush babies', 'bush baby', 'galagos'],
  article: 'some',
}));
world.moveEntity(bushBabies.id, nocturnalExhibit.id);

const barnOwl = world.createEntity('barn owl', EntityType.SCENERY);
barnOwl.add(new IdentityTrait({
  name: 'barn owl',
  description: 'An enormous barn owl with a heart-shaped white face, watching you without blinking.',
  aliases: ['barn owl', 'owl'],
  article: 'a',
}));
world.moveEntity(barnOwl.id, nocturnalExhibit.id);
