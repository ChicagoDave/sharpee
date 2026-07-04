// inside the feeding action's execute(), keyed on which
// animal was fed:
world.awardScore(ScoreIds.FEED_GOATS,
  ScorePoints[ScoreIds.FEED_GOATS], 'Fed the goats');
//   …and ScoreIds.FEED_RABBITS the same way when the
//   rabbits are fed.

// inside the photograph action's execute():
world.awardScore(ScoreIds.PHOTOGRAPH_ANIMAL,
  ScorePoints[ScoreIds.PHOTOGRAPH_ANIMAL],
  'Photographed an animal');

// in the penny-press chain (Chapter 13), the same shape as
// the map award:
w.awardScore(ScoreIds.COLLECT_PRESSED_PENNY,
  ScorePoints[ScoreIds.COLLECT_PRESSED_PENNY],
  'Pressed a souvenir penny');
