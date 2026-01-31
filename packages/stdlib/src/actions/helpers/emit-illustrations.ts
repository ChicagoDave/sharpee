/**
 * Shared helper for emitting illustration events from action report() phases.
 * See ADR-124 for the annotation architecture.
 */

import { ISemanticEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types';

/**
 * Emit illustration events for an entity's active annotations.
 *
 * Called from action report() phases to pair illustration events with
 * the text event they accompany (via groupId).
 *
 * @param entity - The entity to check for illustration annotations
 * @param trigger - Which trigger to filter by ('on-enter', 'on-examine', 'manual')
 * @param groupId - The ID of the associated text event (for client-side pairing)
 * @param context - The action context (provides world and event factory)
 * @returns Array of illustration semantic events (empty if none match)
 */
export function emitIllustrations(
  entity: IFEntity,
  trigger: 'on-enter' | 'on-examine' | 'manual',
  groupId: string,
  context: ActionContext
): ISemanticEvent[] {
  if (!entity.hasAnnotations('illustration')) {
    return [];
  }

  const active = entity.getActiveAnnotations('illustration', context.world);
  return active
    .filter(a => a.data.trigger === trigger)
    .map(a => context.event('if.event.illustrated', {
      groupId,
      entityId: entity.id,
      src: a.data.src,
      alt: a.data.alt,
      position: a.data.position ?? 'right',
      width: a.data.width ?? '40%',
      ...(a.data.targetPanel ? { targetPanel: a.data.targetPanel } : {}),
    }));
}
