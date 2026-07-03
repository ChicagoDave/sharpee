function createVictoryDaemon(): Daemon {
  let victoryTriggered = false;

  return {
    id: 'zoo.daemon.victory',
    name: 'Victory Check',
    priority: 100,   // runs first among daemons; the turn's scoring is already settled

    condition: (ctx: SchedulerContext): boolean => {
      if (victoryTriggered) return false;
      return ctx.world.getScore() >= MAX_SCORE;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      victoryTriggered = true;
      ctx.world.setStateValue('game.victory', true);
      ctx.world.setStateValue('game.ended', true);
      return [{
        id: `zoo-victory-${ctx.turn}`, type: 'game.message',
        timestamp: Date.now(), entities: {},
        data: { messageId: ScoreMessages.VICTORY }, narrate: true,
      }];
    },

    getRunnerState() { return { victoryTriggered }; },
    restoreRunnerState(state) { victoryTriggered = (state.victoryTriggered as boolean) ?? false; },
  };
}
