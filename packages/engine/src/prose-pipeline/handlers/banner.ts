/**
 * Shared banner-block builder.
 *
 * Emits the opening banner as a sequence of semantically-classed
 * blocks. Used by `handleGameStarted` for the game-start banner.
 * (ABOUT renders via the lang-en-us `if.action.about.success` template
 * since 2026-07-02; its dedicated handler was removed.)
 *
 * Pieces (in order):
 *
 *  1. `game-title`         — title
 *  2. `story-version`      — `Story v{version}` + optional build date
 *  3. `platform-version`   — `Sharpee v{engineVersion}` (if provided)
 *  4. `sub-title`          — description (if provided)
 *  5. `author-list[]`      — `credits` if provided, else single
 *                            `By {author}` line if `author` is set
 *  6. `banner-spacer`      — empty `<p>` for visual separation
 *  7. story-tail           — appended via `createBlocks` from
 *                            `game.banner.story-tail` if the language
 *                            provider has that template
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { createBlock, createBlocks } from '../assemble.js';
import type { HandlerContext } from './types.js';

const STORY_TAIL_MESSAGE_ID = 'game.banner.story-tail';

/**
 * Subset of story metadata used by the banner builder.
 * `handleGameStarted` projects `event.data.story` into this shape.
 */
export interface BannerStoryInfo {
  title?: string;
  version?: string;
  buildDate?: string;
  description?: string;
  author?: string;
  credits?: string[];
}

/**
 * Build the structured banner blocks for a `key` (typically
 * `'game.banner'` from `game.started`).
 */
export function buildBannerBlocks(
  key: string,
  story: BannerStoryInfo | undefined,
  engineVersion: string | undefined,
  context: HandlerContext,
): ITextBlock[] {
  if (!story) return [];

  const blocks: ITextBlock[] = [];

  if (story.title) {
    blocks.push(createBlock(key, story.title, { className: 'game-title' }));
  }

  if (story.version) {
    const buildDate = formatBuildDate(story.buildDate);
    const versionText = buildDate
      ? `Story v${story.version} (built ${buildDate})`
      : `Story v${story.version}`;
    blocks.push(createBlock(key, versionText, { className: 'story-version' }));
  }

  if (engineVersion) {
    blocks.push(
      createBlock(key, `Sharpee v${engineVersion}`, {
        className: 'platform-version',
      }),
    );
  }

  if (story.description) {
    blocks.push(
      createBlock(key, story.description, { className: 'sub-title' }),
    );
  }

  const creditLines: string[] =
    story.credits && story.credits.length > 0
      ? story.credits
      : story.author
        ? [`By ${story.author}`]
        : [];
  for (const line of creditLines) {
    blocks.push(createBlock(key, line, { className: 'author-list' }));
  }

  if (blocks.length > 0) {
    blocks.push(createBlock(key, '', { className: 'banner-spacer' }));
  }

  const tail = context.languageProvider?.getMessage(STORY_TAIL_MESSAGE_ID, {});
  if (tail && tail !== STORY_TAIL_MESSAGE_ID) {
    blocks.push(...createBlocks(key, tail));
  }

  return blocks;
}

/**
 * Format an ISO build date as `YYYY-MM-DD` for the version line.
 * Returns the original string if it doesn't parse cleanly, or empty
 * when missing.
 */
function formatBuildDate(buildDate: string | undefined): string {
  if (!buildDate) return '';
  try {
    const iso = new Date(buildDate).toISOString();
    return iso.split('T')[0];
  } catch {
    return buildDate;
  }
}
