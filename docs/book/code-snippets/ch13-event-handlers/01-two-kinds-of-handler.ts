world.registerEventHandler('if.event.dropped', (event, world) => {
  // Set a flag, move an item, change state — but no visible text
  world.setStateValue('item-was-dropped', true);
});
