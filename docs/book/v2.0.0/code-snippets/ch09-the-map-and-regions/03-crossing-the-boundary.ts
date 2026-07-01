world.registerEventHandler('if.event.region_entered', (event, world) => {
  if (event.data.regionId === 'reg-staff') {
    // The visitor just slipped into the staff area: flavor, a warning,
    // a scoring hook, whatever the moment calls for.
  }
});
