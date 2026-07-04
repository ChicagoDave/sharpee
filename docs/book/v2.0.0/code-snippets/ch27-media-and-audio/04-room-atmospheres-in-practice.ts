// in onEngineReady, alongside the plugin registrations:
engine.getEventProcessor().registerHandler(
  'if.event.actor_moved',
  (event: ISemanticEvent): Effect[] => {
    const data = event.data as
      { toRoom?: string; destination?: string } | undefined;
    const toRoom = data?.toRoom ?? data?.destination;
    if (!toRoom) return [];

    const effects: Effect[] = [];
    const atmosphere = audio.getAtmosphere(toRoom);
    if (atmosphere) {
      for (const a of atmosphere.ambient) {
        effects.push(emit('media.ambient.play', {
          src: a.src,
          channel: a.channel,
          volume: a.volume,
          loop: true,
        }));
      }
    } else {
      effects.push(emit('media.ambient.stop', {
        channel: 'environment',
      }));
    }
    return effects;
  },
);
