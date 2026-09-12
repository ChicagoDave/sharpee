// packages/world-model/src/traits/story-info/storyInfoTrait.ts

import { ITrait } from '../trait.js';

/**
 * StoryInfoTrait stores metadata about the game on a system entity.
 * Replaces scattered world['storyConfig'] / world['versionInfo'] casts.
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
  /**
   * The host's own version, stamped after install by the client running the
   * story (a browser client, say). There is deliberately no `engineVersion`
   * beside it: the running engine is the only authority on which engine is
   * running, so that value is a stamped platform constant the engine and the
   * `version`/`about` actions read directly.
   */
  clientVersion?: string;
  portedBy?: string;
  /**
   * Distinct credit lines for the banner's `author-list` section.
   * One block per entry. When unset, the banner falls back to a
   * single `By {author}` line.
   */
  credits?: string[];

  constructor(data?: Partial<StoryInfoTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
