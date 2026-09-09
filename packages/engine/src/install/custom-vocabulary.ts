/**
 * The custom-vocabulary step: register the story's own verbs on the
 * parser, when the engine has a parser that takes them.
 *
 * Only verbs register today; the vocabulary type has room for nouns and
 * the rest once a parser accepts them.
 *
 * Public interface: `customVocabularyStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import type { InstallStep } from './context.js';

export const customVocabularyStep: InstallStep = {
  name: 'custom-vocabulary',
  requires: [],
  run(context) {
    const { story, parser } = context;
    if (!story.getCustomVocabulary || !parser?.registerVerbs) return;
    const vocabulary = story.getCustomVocabulary();
    if (vocabulary.verbs && vocabulary.verbs.length > 0) {
      parser.registerVerbs(vocabulary.verbs);
    }
  }
};
