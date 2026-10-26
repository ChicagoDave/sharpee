/**
 * The stamp-player-self-words step: once the player is settled, the self
 * words the world was given (`language-words`) become the player's aliases
 * (ADR-387 D2, ADR-327 D9/D10), so the matcher's self words and the role's
 * vocabulary are one list from one owner. The loader knows no language and
 * stamps nothing.
 *
 * Public interface: `stampPlayerSelfWordsStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-387 D2; ADR-327 D9/D10; ADR-344 D6.
 */

import { addPlayerRoleVocabulary } from '@sharpee/world-model';
import type { InstallStep } from './context.js';

export const stampPlayerSelfWordsStep: InstallStep = {
  name: 'stamp-player-self-words',
  requires: ['language-words', 'create-player'],
  run(context) {
    const player = context.draft.player;
    if (!player || !context.languageProvider) return;
    addPlayerRoleVocabulary(player, context.world.getLanguageWords().selfWords);
  }
};
