// inside the feeding action's execute(), after its existing
// `const target = ...` line, keyed on which animal was fed:
const name = target?.name?.toLowerCase() ?? '';
if (name.includes('goat')) {
  context.world.awardScore(ScoreIds.FEED_GOATS,
    ScorePoints[ScoreIds.FEED_GOATS], 'Fed the goats');
} else if (name.includes('rabbit')) {
  context.world.awardScore(ScoreIds.FEED_RABBITS,
    ScorePoints[ScoreIds.FEED_RABBITS], 'Fed the rabbits');
}

// inside the photograph action's execute() (rename its unused
// `_context` parameter to `context`, now that the body uses it):
context.world.awardScore(ScoreIds.PHOTOGRAPH_ANIMAL,
  ScorePoints[ScoreIds.PHOTOGRAPH_ANIMAL],
  'Photographed an animal');

// in the penny-press chain (Chapter 13), after the pressed penny
// is handed to the player and before the handler returns:
w.awardScore(ScoreIds.COLLECT_PRESSED_PENNY,
  ScorePoints[ScoreIds.COLLECT_PRESSED_PENNY],
  'Pressed a souvenir penny');
