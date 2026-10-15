/**
 * The attached-thing refusal shared by taking and removing (ADR-373 D1): an
 * entity held fast to an anchor cannot be carried off until it is pulled or
 * untied free.
 *
 * Public interface: ATTACHED_MESSAGE, attachedRefusal.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { AttachedBehavior, type IFEntity } from '@sharpee/world-model';
import type { ActionContext, ValidationResult } from '../enhanced-types.js';
import { nounPhraseFor } from '../../utils/index.js';

/** The short message key each carrying action registers for the refusal. */
export const ATTACHED_MESSAGE = 'attached';

/**
 * Refuse carrying off an attached entity.
 * @param context The action context (for the world)
 * @param item The entity being taken or removed
 * @returns `attached` naming the item and its anchor, or undefined when the
 *          item is free
 */
export function attachedRefusal(context: ActionContext, item: IFEntity): ValidationResult | undefined {
  const anchorId = AttachedBehavior.anchorOf(item);
  if (!anchorId) return undefined;
  const anchor = context.world.getEntity(anchorId);
  return {
    valid: false,
    error: ATTACHED_MESSAGE,
    params: { item: nounPhraseFor(item), anchor: anchor ? nounPhraseFor(anchor) : undefined }
  };
}
