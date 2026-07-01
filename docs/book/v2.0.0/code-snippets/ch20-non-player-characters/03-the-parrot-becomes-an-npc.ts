// `parrot` is the entity from Chapter 15 (Aviary, already an ACTOR).
parrot.add(new NpcTrait({
  behaviorId: 'zoo-parrot',   // matches parrotBehavior.id, below
  canMove: false,             // it stays on its perch
  isAlive: true,
  isConscious: true,
}));
