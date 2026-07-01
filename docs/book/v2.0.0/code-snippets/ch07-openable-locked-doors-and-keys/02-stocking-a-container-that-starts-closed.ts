lunchbox.get(OpenableTrait)!.isOpen = true;   // temporarily open
world.moveEntity(juice.id, lunchbox.id);       // place the item inside
lunchbox.get(OpenableTrait)!.isOpen = false;   // close it again
