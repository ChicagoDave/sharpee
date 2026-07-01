onEngineReady(engine: GameEngine): void {
  // 1. Create and register the plugin: gives NPCs a turn phase
  const npcPlugin = new NpcPlugin();
  engine.getPluginRegistry().register(npcPlugin);

  // 2. Get the NPC service from the plugin
  const npcService = npcPlugin.getNpcService();

  // 3. Build the zookeeper's patrol from a route of room IDs
  const keeperPatrol = createPatrolBehavior({
    route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary],
    loop: true,      // Main Path → Petting Zoo → Aviary → Main Path → …
    waitTurns: 1,    // pause one turn at each stop
  });

  // The factory's default id is 'patrol'; override it to match NpcTrait.behaviorId
  keeperPatrol.id = 'zoo-keeper-patrol';
  npcService.registerBehavior(keeperPatrol);

  // 4. Register the parrot's custom behavior (its id already matches)
  npcService.registerBehavior(parrotBehavior);
}
