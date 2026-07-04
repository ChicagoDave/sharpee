// in initializeWorld, after the rooms are created:
audio.atmosphere(aviary.id)
  .ambient('audio/aviary-birdsong.mp3', 'environment', 0.4)
  .build();
audio.atmosphere(nocturnalExhibit.id)
  .ambient('audio/night-crickets.mp3', 'environment', 0.3)
  .build();
