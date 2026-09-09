/**
 * The narrative-settings step: resolve the story's narrative config
 * (perspective, player pronouns) into the settings the engine adopts.
 *
 * Reads only the config; `narrative-language` applies the settings to
 * the language provider once the player exists.
 *
 * Public interface: `narrativeSettingsStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-089 (narrative perspective).
 */

import { buildNarrativeSettings } from '../narrative/index.js';
import type { InstallStep } from './context.js';

export const narrativeSettingsStep: InstallStep = {
  name: 'narrative-settings',
  requires: [],
  run(context) {
    context.draft.narrativeSettings = buildNarrativeSettings(context.story.config.narrative);
  }
};
