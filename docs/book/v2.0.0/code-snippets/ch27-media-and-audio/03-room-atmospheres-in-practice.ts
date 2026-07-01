const atmosphere = audio.getAtmosphere(toRoom);
if (atmosphere) {
  for (const a of atmosphere.ambient) {
    effects.push(emit('media.ambient.play', {
      src: a.src, channel: a.channel, volume: a.volume, loop: true,
    }));
  }
} else {
  effects.push(emit('media.ambient.stop', { channel: 'environment' }));
}
