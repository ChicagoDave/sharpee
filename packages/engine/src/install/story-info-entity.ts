/**
 * The story-info entity step: ensure a `StoryInfoTrait` entity exists,
 * because the standard ABOUT action resolves its title, author, version,
 * and description from one.
 *
 * A story may create its own during its world build (Dungeo does, to
 * carry build-pipeline metadata), and that one wins; when none exists
 * the engine makes one from the config, so ABOUT renders real story data
 * with no story-side setup.
 *
 * Public interface: `storyInfoEntityStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import { EntityType, StoryInfoTrait, TraitType } from '@sharpee/world-model';
import type { InstallStep } from './context.js';

export const storyInfoEntityStep: InstallStep = {
  name: 'story-info-entity',
  requires: ['initialize-world', 'metadata'],
  run(context) {
    if (context.world.findByTrait(TraitType.STORY_INFO).length > 0) return;
    const { config } = context.story;
    const entity = context.world.createEntity('story-info', EntityType.OBJECT);
    entity.add(new StoryInfoTrait({
      title: config.title,
      author: context.draft.metadata!.author,
      version: config.version,
      description: config.description,
    }));
  }
};
