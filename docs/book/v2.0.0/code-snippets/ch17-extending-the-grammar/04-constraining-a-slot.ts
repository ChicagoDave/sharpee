grammar
  .define('feed :animal')
  .where('animal', scope => scope.touchable())
  .mapsTo('zoo.action.feeding')
  .withPriority(150)
  .build();
