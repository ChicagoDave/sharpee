// packages/world-model/src/traits/story-info/storyInfoTrait.ts

import { ITrait } from '../trait';

/**
 * StoryInfoTrait stores metadata about the game on a system entity.
 * Replaces scattered (world as any).storyConfig / .versionInfo casts.
 *
 * The entity carrying this trait has no location and is never visible
 * in the game world. Actions read it via world.findByTrait().
 */
export class StoryInfoTrait implements ITrait {
  static readonly type = 'storyInfo' as const;
  readonly type = 'storyInfo' as const;

  title = '';
  author = '';
  version = '';
  description?: string;
  buildDate?: string;
  engineVersion?: string;
  clientVersion?: string;
  portedBy?: string;

  constructor(data?: Partial<StoryInfoTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
