world.createRegion('reg-mine', {
  name: 'Coal Mine',
  defaultDark: true,
});
world.createRegion('reg-caves', {
  name: 'The Caves',
  defaultDark: true,
});
// "underground" means either region
const isUnderground = (roomId: string) =>
  world.isInRegion(roomId, 'reg-mine') || world.isInRegion(roomId, 'reg-caves');
