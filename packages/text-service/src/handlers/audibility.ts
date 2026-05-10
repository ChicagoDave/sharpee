/**
 * Audibility event handler — ADR-172 Phase 7a.
 *
 * Handles: sound.audibility.heard
 *
 * Converts each `IAudibilityEvent` (per-listener perception of a propagated
 * sound, produced by the engine's sound dispatcher in Phase 6) into a single
 * text block via the `sound.heard.<kind>.<tier>` template family registered
 * in the active language pack (lang-en-us ships defaults; stories override
 * per kind).
 *
 * Naming discipline: this handler is named for **audibility** (perception),
 * not "sound" or "audio". The codebase reserves:
 *   - "audio"      — Web Audio playback (ADR-169 `AudioManager`).
 *   - "sound"      — the media-cue channel id (`media.sound.play`, ADR-163).
 *   - "audibility" — ADR-172 perception of propagated sound, this handler.
 *
 * Owner context: `@sharpee/text-service` — prose-rendering pipeline.
 *
 * Listener filtering: in single-user scope today the player is the only
 * entity carrying `ListenerTrait` automatically, so every audibility event
 * delivered to the text-service is for the player. The dispatcher does
 * already write the listener id into `event.entities.target`; when L2's
 * NPC-listener work lands, this handler will need to filter
 * `event.entities.target === playerId` before rendering.
 *
 * @see ADR-172 — Spatial Sound Propagation §Channel routing
 * @see ADR-096 — Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { IAudibilityEvent } from '@sharpee/if-domain';
import type { HandlerContext } from './types.js';
import { createBlock } from '../stages/assemble.js';

/** Template-id prefix shared across kind-specific and default audibility prose. */
const AUDIBILITY_TEMPLATE_PREFIX = 'sound.heard';

/**
 * Handle a `sound.audibility.heard` event.
 *
 * Resolves `sound.heard.<kind>.<tier>` from the language provider, falling
 * back to `sound.heard.default.<tier>` when the kind-specific template is
 * not registered. Returns one `ITextBlock` per event, or `[]` when the
 * event is malformed, the tier is `silent`, or no template resolves.
 */
export function handleAudibilityHeard(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const provider = context.languageProvider;
  if (!provider) return [];

  const data = event.data as IAudibilityEvent | undefined;
  if (!data || typeof data !== 'object') return [];
  if (!data.kind || !data.audibilityTier) return [];

  // Defense-in-depth: the dispatcher already filters `silent`, but never
  // render it if one slips through.
  if ((data.audibilityTier as string) === 'silent') return [];

  const params: Record<string, unknown> = {
    kind: data.kind,
  };
  if (data.content?.messageId) {
    // Resolve the story-authored content line so the template's
    // `{content}` slot expands to the actual prose, not a message id.
    const innerParams = data.content.params as Record<string, unknown> | undefined;
    params.content = provider.getMessage(data.content.messageId, innerParams);
  }

  const kindId = `${AUDIBILITY_TEMPLATE_PREFIX}.${data.kind}.${data.audibilityTier}`;
  let message = provider.getMessage(kindId, params);
  if (!message || message === kindId) {
    const fallbackId = `${AUDIBILITY_TEMPLATE_PREFIX}.default.${data.audibilityTier}`;
    message = provider.getMessage(fallbackId, params);
    if (!message || message === fallbackId) {
      return [];
    }
  }

  return [createBlock(BLOCK_KEYS.ACTION_RESULT, message)];
}
