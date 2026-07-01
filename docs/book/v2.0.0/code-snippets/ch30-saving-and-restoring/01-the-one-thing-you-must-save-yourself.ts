let behaviorSwapped = false;
scheduler.registerDaemon({
  id: 'zoo.daemon.parrot_behavior_swap',
  condition: (ctx) => !behaviorSwapped && ctx.world.getStateValue('zoo.after_hours') === true,
  run: () => {
    behaviorSwapped = true;
    npcService.removeBehavior('zoo-parrot');
    npcService.registerBehavior(parrotAfterHoursBehavior);
    return [];
  },
  // …
});
