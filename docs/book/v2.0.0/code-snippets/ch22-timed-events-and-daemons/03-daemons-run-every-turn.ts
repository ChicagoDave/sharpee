function createPAAnnouncementDaemon(): Daemon {
  let announcementCount = 0;        // internal state, kept across turns

  return {
    id: 'zoo.daemon.pa_announcements',
    name: 'Zoo PA Announcements',
    priority: 5,                    // low; runs after more important daemons

    // Only run every 5th turn, and only four times total
    condition: (ctx: SchedulerContext): boolean =>
      ctx.turn > 0 && ctx.turn % 5 === 0 && announcementCount < 4,

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      announcementCount++;
      let messageId: string;
      switch (announcementCount) {
        case 1: messageId = TimedMessages.PA_CLOSING_3; break;
        case 2: messageId = TimedMessages.PA_CLOSING_2; break;
        case 3: messageId = TimedMessages.PA_CLOSING_1; break;
        default: messageId = TimedMessages.PA_CLOSED; break;
      }
      return [{
        id: `zoo-pa-${ctx.turn}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId },
        narrate: true,
      }];
    },

    // Save/restore the internal counter so it survives a save/load
    getRunnerState() { return { announcementCount }; },
    restoreRunnerState(state) { announcementCount = (state.announcementCount as number) ?? 0; },
  };
}
