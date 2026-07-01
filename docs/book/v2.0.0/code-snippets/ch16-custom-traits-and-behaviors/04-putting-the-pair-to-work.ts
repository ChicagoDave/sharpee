// inside a custom "operate dispenser" action's execute phase, or an event handler:
if (DispenserBehavior.dispense(dispenser)) {
  // success: hand out a serving of feed
} else {
  // empty: report that it's out
}
