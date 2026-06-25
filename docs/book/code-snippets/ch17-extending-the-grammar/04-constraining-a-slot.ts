grammar
  .define('feed :animal')
  .where('animal', (scope: any) => scope.touchable())
  .mapsTo('zoo.action.feeding')
  .withPriority(150)
  .build();
