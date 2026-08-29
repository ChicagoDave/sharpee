// inside the patrol's onTurn, once it knows the target room
const exits = context.getAvailableExits();
const exitToTarget = exits.find(
  (e) => e.destination === targetRoom,
);

if (exitToTarget) {
  context.act(IFActions.GOING, {
    direction: exitToTarget.direction,
  });
  return;
}
