// Set the maximum in initializeWorld() so "score" can show
// "X out of Y"
world.setMaxScore(75);

// Award points (idempotent): the same ID never scores twice
const awarded = world.awardScore(
  'zoo.visit.petting_zoo',  // unique ID
  5,                        // points
  // description (for debugging / transcripts)
  'Visited the petting zoo'
);
// awarded === true the first time, false on every call after

// Read the score back
const current = world.getScore();
const max = world.getMaxScore();
