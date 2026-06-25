world.createScene('scene-petting-zoo', {
  name: 'Among the Animals',
  begin: (w) => w.getLocation(w.getPlayer()!.id) === pettingZoo.id,
  end:   (w) => w.getLocation(w.getPlayer()!.id) !== pettingZoo.id,
  recurring: true,
  onBegin: () => ({ text: 'A waft of hay and warm fur greets you.' }),
  onEnd:   () => ({ text: 'The animal sounds fade behind you.' }),
});
