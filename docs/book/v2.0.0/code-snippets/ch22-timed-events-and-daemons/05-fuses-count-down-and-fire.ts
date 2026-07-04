function createFeedingTimeFuse(): Fuse {
  return {
    id: 'zoo.fuse.feeding_time',
    name: 'Feeding Time',
    turns: 10,            // first feeding time at turn 10
    repeat: true,         // keep re-arming
    originalTurns: 8,     // subsequent feedings every 8 turns
    priority: 10,

    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      ctx.world.setStateValue('zoo.feeding_time_active', true);
      ctx.world.setStateValue('zoo.bleat_turns_remaining', 3);
      return [{
        id: `zoo-feeding-${ctx.turn}`, type: 'game.message',
        timestamp: Date.now(), entities: {},
        data: { messageId: TimedMessages.FEEDING_TIME },
        narrate: true,
      }];
    },
  };
}
