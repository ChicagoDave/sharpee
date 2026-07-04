extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  grammar.define('feed :thing')
    .mapsTo(FEED_ACTION_ID).withPriority(150).build();

  grammar.define('photograph :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
  grammar.define('photo :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
  grammar.define('snap :thing')
    .mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
}
