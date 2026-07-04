world.chainEvent('if.event.actor_moved', (event, w) => {
  const data = event.data as Record<string, any>;
  const toRoom = data.toRoom || data.destination;
  if (!toRoom) return null;

  const roomName =
    w.getEntity(toRoom)?.get(IdentityTrait)?.name || '';
  const scoreId = ROOM_SCORE_MAP[roomName];
  if (!scoreId) return null;

  w.awardScore(scoreId, ScorePoints[scoreId],
    `Visited ${roomName}`);
  return null;   // scoring is silent; no custom event
}, { key: 'zoo.chain.room-visit-scoring' });
