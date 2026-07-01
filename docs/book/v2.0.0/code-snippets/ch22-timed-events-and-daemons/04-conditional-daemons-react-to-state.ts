function createGoatBleatingDaemon(): Daemon {
  return {
    id: 'zoo.daemon.goat_bleating',
    name: 'Goat Bleating',
    priority: 3,

    condition: (ctx: SchedulerContext): boolean => {
      const active = ctx.world.getStateValue('zoo.feeding_time_active') as boolean;
      const left = ctx.world.getStateValue('zoo.bleat_turns_remaining') as number;
      return active === true && (left ?? 0) > 0;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const left = (ctx.world.getStateValue('zoo.bleat_turns_remaining') as number) ?? 0;
      if (left <= 1) {
        ctx.world.setStateValue('zoo.feeding_time_active', false);
        ctx.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else {
        ctx.world.setStateValue('zoo.bleat_turns_remaining', left - 1);
      }

      // Ambient sound, only heard if the player is in the petting zoo
      const room = ctx.world.getEntity(ctx.playerLocation);
      if ((room?.get(IdentityTrait)?.name || '').includes('Petting Zoo')) {
        return [{
          id: `zoo-bleat-${ctx.turn}`, type: 'game.message',
          timestamp: Date.now(), entities: {},
          data: { messageId: TimedMessages.GOATS_BLEATING }, narrate: true,
        }];
      }
      return [];
    },
  };
}
