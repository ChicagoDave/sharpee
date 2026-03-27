/**
 * Extended language provider interface for engine integration
 *
 * The base LanguageProvider interface (from if-domain) defines text and pattern
 * retrieval. This interface extends it with optional methods the engine can use
 * when available, following the same type-guard pattern as parser-interface.ts.
 */

import type { LanguageProvider } from '@sharpee/if-domain';
import type { NarrativeSettings } from './narrative';

/**
 * Extended language provider interface for engine integration.
 *
 * Language providers can optionally implement these methods to enable
 * perspective-aware narrative (setNarrativeSettings).
 */
export interface IEngineAwareLanguageProvider extends LanguageProvider {
  /**
   * Configure narrative perspective settings.
   * Called when the player entity changes or on game start.
   *
   * @param settings Narrative context including perspective and pronouns
   */
  setNarrativeSettings?(settings: NarrativeSettings): void;
}

/**
 * Type guard for language provider with narrative settings support.
 */
export function hasNarrativeSettings(
  provider: LanguageProvider
): provider is IEngineAwareLanguageProvider & {
  setNarrativeSettings: NonNullable<IEngineAwareLanguageProvider['setNarrativeSettings']>;
} {
  return (
    'setNarrativeSettings' in provider &&
    typeof (provider as IEngineAwareLanguageProvider).setNarrativeSettings === 'function'
  );
}
