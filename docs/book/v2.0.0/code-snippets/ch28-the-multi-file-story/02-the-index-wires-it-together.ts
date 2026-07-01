initializeWorld(world: WorldModel): void {
  world.setMaxScore(MAX_SCORE);

  const { rooms } = createZooMap(world);
  this.roomIds = rooms;
  this.itemIds = createZooItems(world, rooms);
  this.characterIds = createCharacters(world, rooms);

  // register the petting capability, place the player…
}
