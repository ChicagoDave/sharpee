/**
 * The config-validation step: refuse a story whose config lacks a
 * required field, by name, before anything reads it.
 *
 * First in the list on purpose: every required field is read somewhere
 * later without a guard, so a story missing one used to surface as a
 * TypeError from whichever step touched it first — an engine stack trace
 * where the author needed the field's name.
 *
 * Public interface: `validateConfigStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import { validateStoryConfig } from './story.js';
import type { InstallStep } from './context.js';

export const validateConfigStep: InstallStep = {
  name: 'validate-config',
  requires: [],
  run(context) {
    validateStoryConfig(context.story.config);
  }
};
