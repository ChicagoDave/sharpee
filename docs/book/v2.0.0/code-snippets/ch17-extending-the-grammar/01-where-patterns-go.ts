extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar
    .define('feed :thing')
    .mapsTo('zoo.action.feeding')
    .withPriority(150)
    .build();
}
