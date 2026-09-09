/**
 * The story-info capability step: seed the `storyInfo` capability the
 * info and IFID channels project.
 *
 * Channels read from the world through `world.getCapability('storyInfo')`.
 * The config and the trait combine under the one rule in
 * `story-info-projection.ts`; the same rule runs again at `start()`,
 * once the build pipeline and the host have had their chance to patch
 * the trait.
 *
 * Public interface: `storyInfoCapabilityStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-163 (`infoChannel`, `ifidChannel`); ADR-334 F1 (the one
 * precedence rule).
 */

import { STORY_INFO_SCHEMA, projectStoryInfo, findStoryInfoTrait } from '../story-info-projection.js';
import type { InstallStep } from './context.js';

export const storyInfoCapabilityStep: InstallStep = {
  name: 'story-info-capability',
  requires: ['story-info-entity'],
  run(context) {
    context.world.registerCapability('storyInfo', {
      schema: STORY_INFO_SCHEMA,
      initialData: projectStoryInfo(context.story.config, findStoryInfoTrait(context.world)),
    });
  }
};
