const audio = new AudioRegistry();

audio.atmosphere(aviaryId)
  .ambient('audio/aviary-birdsong.mp3', 'environment', 0.4)
  .build();
audio.atmosphere(nocturnalId)
  .ambient('audio/night-crickets.mp3', 'environment', 0.3)
  .build();
