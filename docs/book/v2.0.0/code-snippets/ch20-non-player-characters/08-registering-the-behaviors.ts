onEngineReady(engine: GameEngine): void {
  // 1. The engine owns the NPC turn phase; ask it for the
  //    service that holds the behaviors
  const npcService = engine.getNpcService();

  // 2. Build the zookeeper's patrol from a route of room IDs
  const keeperPatrol = createPatrolBehavior({
    route: [
      this.roomIds.mainPath,
      this.roomIds.pettingZoo,
      this.roomIds.aviary,
    ],
    // Main Path → Petting Zoo → Aviary → Main Path → …
    loop: true,
    waitTurns: 1,    // pause one turn at each stop
  });

  // The factory's default id is 'patrol'; override it to
  // match NpcTrait.behaviorId
  keeperPatrol.id = 'zoo-keeper-patrol';
  npcService.registerBehavior(keeperPatrol);

  // 3. Register the parrot's custom behavior
  // (its id already matches)
  npcService.registerBehavior(parrotBehavior);
}
