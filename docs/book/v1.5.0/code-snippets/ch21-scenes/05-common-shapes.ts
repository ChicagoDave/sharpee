world.createScene('scene-storm', {
  name: 'Thunderstorm',
  begin: (w) => w.getStateValue('stormTriggered') === true,
  end:   (w) => (w.getEntity('scene-storm')?.get(SceneTrait)?.activeTurns ?? 0) >= 15,
});
