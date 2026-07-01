const brochure = world.createEntity('zoo brochure', EntityType.ITEM);
brochure.add(new IdentityTrait({
  name: 'zoo brochure',
  description:
    'A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on ' +
    'the cover in cheerful yellow letters.',
  aliases: ['brochure', 'zoo brochure', 'pamphlet', 'leaflet'],
  properName: false,
  article: 'a',
}));
brochure.add(new ReadableTrait({
  text:
    'WILLOWBROOK FAMILY ZOO: Your Guide\n\n' +
    'EXHIBITS:\n' +
    '  Petting Zoo ............ East from Main Path\n' +
    '  Aviary ................. West from Main Path\n' +
    '  Nocturnal Animals ...... Staff Area (ask a keeper!)\n\n' +
    '"Where every visit is a wild adventure!"',
}));
world.moveEntity(brochure.id, entrance.id);
