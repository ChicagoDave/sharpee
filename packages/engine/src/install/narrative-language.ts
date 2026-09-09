/**
 * The narrative-language step: configure the language provider for
 * perspective-aware message resolution from the installed narrative
 * settings and the player.
 *
 * The configuring function is shared with the engine's player switch,
 * which reconfigures the provider for the new player with the engine's
 * own settings; here it runs with the draft's, before the engine has
 * adopted them. For a third-person narrative the player's pronouns come
 * from the story config first and the player's ActorTrait second.
 *
 * Public interface: `narrativeLanguageStep`,
 * `configureLanguageProviderNarrative`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-089 (narrative perspective), ADR-132 (player switch
 * reconfigures the provider).
 */

import type { LanguageProvider } from '@sharpee/if-domain';
import { ActorTrait, type IFEntity } from '@sharpee/world-model';
import type { NarrativeSettings } from './narrative/index.js';
import { hasNarrativeSettings } from '../ports/language-provider-interface.js';
import type { InstallStep } from './context.js';

/**
 * Configure a language provider with narrative settings, when it
 * supports them; a provider without the seam is left alone.
 *
 * @param languageProvider - The provider to configure, if the engine has one
 * @param settings - The narrative settings in force
 * @param player - The player whose ActorTrait pronouns back a third-person narrative
 */
export function configureLanguageProviderNarrative(
  languageProvider: LanguageProvider | undefined,
  settings: NarrativeSettings,
  player: IFEntity
): void {
  if (!languageProvider || !hasNarrativeSettings(languageProvider)) {
    return;
  }

  const narrativeContext: NarrativeSettings = {
    perspective: settings.perspective,
  };

  if (settings.perspective === '3rd') {
    if (settings.playerPronouns) {
      narrativeContext.playerPronouns = settings.playerPronouns;
    } else {
      const actorTrait = player.get(ActorTrait);
      if (actorTrait?.pronouns) {
        narrativeContext.playerPronouns = Array.isArray(actorTrait.pronouns)
          ? actorTrait.pronouns[0]
          : actorTrait.pronouns;
      }
    }
  }

  languageProvider.setNarrativeSettings(narrativeContext);
}

export const narrativeLanguageStep: InstallStep = {
  name: 'narrative-language',
  requires: ['narrative-settings', 'create-player'],
  run(context) {
    configureLanguageProviderNarrative(
      context.languageProvider,
      context.draft.narrativeSettings!,
      context.draft.player!
    );
  }
};
