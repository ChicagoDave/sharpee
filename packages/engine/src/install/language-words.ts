/**
 * The language-words step: the world learns its language's words from the
 * engine's language provider (ADR-387 D2), before anything derives a name.
 *
 * World-model declares the roles (`LanguageWords`: the self words and the
 * name stopwords) and holds no English; the language fills them, and this
 * step assigns them to the world when the engine loads the language. The
 * player's self aliases are stamped from the same words once the player is
 * settled (`stamp-player-self-words`), so the matcher and the role agree by
 * construction.
 *
 * Public interface: `languageWordsStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-387 D2; ADR-327 D9/D10 (the self words name the role);
 * ADR-344 D6 (the install seam settles the player).
 */

import type { InstallStep } from './context.js';

export const languageWordsStep: InstallStep = {
  name: 'language-words',
  requires: ['initialize-world'],
  run(context) {
    if (!context.languageProvider) return;
    context.world.setLanguageWords(context.languageProvider.getLanguageWords());
  }
};
