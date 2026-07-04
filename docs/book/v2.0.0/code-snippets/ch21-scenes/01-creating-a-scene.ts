world.createScene('scene-petting-zoo', {
  name: 'Among the Animals',
  begin: (w) =>
    w.getLocation(w.getPlayer()!.id) === pettingZoo.id,
  end:   (w) =>
    w.getLocation(w.getPlayer()!.id) !== pettingZoo.id,
  recurring: true,
});
