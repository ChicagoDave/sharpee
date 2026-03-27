/**
 * Openable Description Handler
 *
 * Registers story-level event handlers that update entity descriptions
 * when openable entities are opened or closed.
 *
 * Entities opt in by setting attributes:
 * - openDescription: string — description when open
 * - closedDescription: string — description when closed
 *
 * Replaces entity `on` handlers for window and trapdoor (ISSUE-068 Phase 1/5).
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';

/**
 * Register handlers that auto-switch descriptions on open/close events.
 *
 * Called once from initializeWorld. Handles any entity with
 * openDescription/closedDescription attributes.
 */
export function registerOpenableDescriptionHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.opened', (event: ISemanticEvent) => {
    const data = event.data as { targetId?: string } | undefined;
    if (!data?.targetId) return;

    const entity = world.getEntity(data.targetId);
    if (!entity) return;

    const openDesc = entity.attributes.openDescription as string | undefined;
    if (!openDesc) return;

    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.description = openDesc;
    }
  });

  world.registerEventHandler('if.event.closed', (event: ISemanticEvent) => {
    const data = event.data as { targetId?: string } | undefined;
    if (!data?.targetId) return;

    const entity = world.getEntity(data.targetId);
    if (!entity) return;

    const closedDesc = entity.attributes.closedDescription as string | undefined;
    if (!closedDesc) return;

    const identity = entity.get(IdentityTrait);
    if (identity) {
      identity.description = closedDesc;
    }
  });
}
