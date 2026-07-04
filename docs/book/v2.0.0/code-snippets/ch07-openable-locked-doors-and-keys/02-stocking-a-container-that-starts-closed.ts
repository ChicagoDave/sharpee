lunchbox.get(OpenableTrait)!.isOpen = true;   // temporarily open
// place the item inside
world.moveEntity(juice.id, lunchbox.id);
lunchbox.get(OpenableTrait)!.isOpen = false;   // close it again
