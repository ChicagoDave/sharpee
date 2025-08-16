/**
 * Events for the entering mirror action
 */

import { EntityId } from '@sharpee/core';

export interface EnteredMirrorEventData {
  actorId: EntityId;
  mirrorId: EntityId;
  destinationId: EntityId;
  message: string;
}