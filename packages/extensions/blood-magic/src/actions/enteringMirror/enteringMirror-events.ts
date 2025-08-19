/**
 * Events for the entering mirror action
 */

import { EntityId } from '@sharpee/core';

export interface EnteredMirrorEventData extends Record<string, unknown> {
  actorId: EntityId;
  mirrorId: EntityId;
  destinationId: EntityId;
  message: string;
}