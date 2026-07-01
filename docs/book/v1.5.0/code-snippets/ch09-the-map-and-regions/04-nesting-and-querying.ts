world.createRegion('reg-underground', { name: 'The Underground', defaultDark: true });
world.createRegion('reg-mine', { name: 'Coal Mine', parentRegionId: 'reg-underground' });
// a room in reg-mine answers true for reg-underground as well
