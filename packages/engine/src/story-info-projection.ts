/**
 * The `storyInfo` capability's one precedence rule: how a story's
 * authored config and its `StoryInfoTrait` combine into the record the
 * info and ifid channels project.
 *
 * Two sources describe the same story. The config is what the author
 * wrote; the trait is where the build pipeline and the host patch
 * metadata onto the world, sometimes after `setStory()` and before
 * `start()` (a browser client stamping `clientVersion`, say). So the rule
 * is three-way, by field class, and the same rule runs at both moments:
 *
 * - **Authored** fields — `title`, `authors`, `testers`, `version`,
 *   `ifid`, `description` — the config wins; the trait fills a gap.
 * - **Build-pipeline** fields — `engineVersion`, `clientVersion`,
 *   `buildDate` — the trait wins; the config fills a gap.
 * - `prologue` is neither source's: `resolvePrologue` writes it at start.
 *
 * Only fields that have a value appear in the projection, so applying it
 * as a capability update never blanks a field the schema defaults.
 *
 * Public interface: `STORY_INFO_SCHEMA`, `projectStoryInfo`,
 * `findStoryInfoTrait`, `StoryInfoProjection`.
 * Owner context: `@sharpee/engine` — story installation and start.
 *
 * References: ADR-334 A1(ii) and F1 (the two-writer contradiction this
 * replaces), ADR-163 (the channels that read the capability), ADR-298
 * (arrays on the wire; the prologue).
 */

import { TraitType, type StoryInfoTrait, type WorldModel } from '@sharpee/world-model';
import type { StoryConfig } from './story.js';

/** The `storyInfo` capability's schema: every field a channel may project, with its empty default. */
export const STORY_INFO_SCHEMA = {
  title: { type: 'string', default: '' },
  authors: { type: 'array', default: [] },
  testers: { type: 'array', default: [] },
  version: { type: 'string', default: '' },
  ifid: { type: 'string', default: '' },
  description: { type: 'string', default: '' },
  prologue: { type: 'string', default: '' },
  buildDate: { type: 'string', default: '' },
  engineVersion: { type: 'string', default: '' },
  clientVersion: { type: 'string', default: '' },
} as const;

/** The projected record: only the fields that have a value. */
export interface StoryInfoProjection {
  title: string;
  authors: string[];
  testers?: string[];
  version: string;
  ifid?: string;
  description?: string;
  buildDate?: string;
  engineVersion?: string;
  clientVersion?: string;
}

/**
 * The world's `StoryInfoTrait`, when a story or the engine has created one.
 * @param world the world to search
 * @returns the first story-info trait, or none
 */
export function findStoryInfoTrait(world: WorldModel): StoryInfoTrait | undefined {
  return world.findByTrait(TraitType.STORY_INFO)[0]?.get<StoryInfoTrait>(TraitType.STORY_INFO);
}

/**
 * Combine the config and the trait under the three-way rule.
 * @param config the story's authored config
 * @param trait the world's story-info trait, if any
 * @returns the fields that have a value, ready to register or update the capability with
 */
export function projectStoryInfo(config: StoryConfig, trait: StoryInfoTrait | undefined): StoryInfoProjection {
  const projection: StoryInfoProjection = {
    title: config.title,
    authors: config.authors,
    version: config.version,
  };
  if (config.testers?.length) projection.testers = config.testers;
  if (config.ifid) projection.ifid = config.ifid;

  // Authored: the config wins, the trait fills the gap.
  const description = config.description || trait?.description;
  if (description) projection.description = description;

  // Build-pipeline: the trait wins, the config fills the gap.
  const buildDate = trait?.buildDate || config.buildDate;
  if (buildDate) projection.buildDate = buildDate;
  if (trait?.engineVersion) projection.engineVersion = trait.engineVersion;
  if (trait?.clientVersion) projection.clientVersion = trait.clientVersion;

  return projection;
}
