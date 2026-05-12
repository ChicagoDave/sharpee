/**
 * About event handler — `if.event.about_displayed`.
 *
 * Produces the same structured banner as `handleGameStarted`, via the
 * shared `buildBannerBlocks` helper. The ABOUT action gives us a
 * flat `params: Record<string, string>` that mirrors `event.data.story`
 * — we project it into the `BannerStoryInfo` shape and reuse the
 * builder.
 *
 * Public interface: `handleAboutDisplayed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types';
import { buildBannerBlocks, type BannerStoryInfo } from './banner';

/**
 * Handle `if.event.about_displayed` by showing the structured banner.
 *
 * Reads the about action's `params` payload (title, author, version,
 * description, engineVersion, buildDate, portedBy). The ABOUT action
 * does not currently pass `credits` directly; when present, the
 * builder falls back to `By {author}` for a single author-list line.
 * Stories that want richer ABOUT credit blocks should propagate
 * `credits` through the about action's params.
 */
export function handleAboutDisplayed(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as { params?: Record<string, unknown> } | undefined;
  const params = (data?.params ?? {}) as Record<string, unknown>;

  const story: BannerStoryInfo = {
    title: stringOrUndef(params.title),
    version: stringOrUndef(params.version),
    buildDate: stringOrUndef(params.buildDate),
    description: stringOrUndef(params.description),
    author: stringOrUndef(params.author),
    credits: Array.isArray(params.credits)
      ? (params.credits as unknown[]).filter(
          (s): s is string => typeof s === 'string' && s.length > 0,
        )
      : undefined,
  };

  const engineVersion = stringOrUndef(params.engineVersion);

  return buildBannerBlocks('about.text', story, engineVersion, context);
}

function stringOrUndef(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
