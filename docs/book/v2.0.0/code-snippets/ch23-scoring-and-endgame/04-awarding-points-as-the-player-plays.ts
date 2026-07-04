execute(_entity, world, _actorId, _shared): void {
  world.awardScore(ScoreIds.PET_ANIMAL,
    ScorePoints[ScoreIds.PET_ANIMAL], 'Petted an animal');
},
