/**
 * The story-installation order, as data. The order here IS the
 * installation's contract; each step's `requires` names what it must
 * follow, and the order test pins the list and drives it once.
 *
 * The list validates the config and announces the load; resolves the
 * narrative settings; registers concealment ahead of the world build so
 * a story can override it; builds the world and names the player; makes
 * the player a listener; runs the two cross-entity validations the world
 * build cannot enforce at the mutation; configures the language
 * provider; carries the metadata and ensures the story-info entity and
 * capability; carries the implicit-action settings; registers custom
 * actions; runs the story's own initialize; announces the load complete;
 * and registers custom vocabulary. The engine then adopts the result
 * and hands the story the live engine.
 *
 * Public interface: `STORY_INSTALL_STEPS`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-334 A1; ADR-335 D1 and ADR-336 (the list idiom).
 */

import type { InstallStep } from './context.js';
import { validateConfigStep } from './validate-config.js';
import { emitStoryLoadingStep } from './emit-story-loading.js';
import { narrativeSettingsStep } from './narrative-settings.js';
import { concealedVisibilityStep } from './concealed-visibility.js';
import { initializeWorldStep } from './initialize-world.js';
import { createPlayerStep } from './create-player.js';
import { listenerTraitStep } from './listener-trait.js';
import { validateRoomSnippetsStep } from './validate-room-snippets.js';
import { validateCombatantHealthStep } from './validate-combatant-health.js';
import { narrativeLanguageStep } from './narrative-language.js';
import { metadataStep } from './metadata.js';
import { storyInfoEntityStep } from './story-info-entity.js';
import { storyInfoCapabilityStep } from './story-info-capability.js';
import { implicitActionsStep } from './implicit-actions.js';
import { customActionsStep } from './custom-actions.js';
import { storyInitializeStep } from './story-initialize.js';
import { emitStoryLoadedStep } from './emit-story-loaded.js';
import { customVocabularyStep } from './custom-vocabulary.js';

/** A story's installation, in run order. */
export const STORY_INSTALL_STEPS: readonly InstallStep[] = Object.freeze([
  validateConfigStep,
  emitStoryLoadingStep,
  narrativeSettingsStep,
  concealedVisibilityStep,
  initializeWorldStep,
  createPlayerStep,
  listenerTraitStep,
  validateRoomSnippetsStep,
  validateCombatantHealthStep,
  narrativeLanguageStep,
  metadataStep,
  storyInfoEntityStep,
  storyInfoCapabilityStep,
  implicitActionsStep,
  customActionsStep,
  storyInitializeStep,
  emitStoryLoadedStep,
  customVocabularyStep
]);
