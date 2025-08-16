/**
 * Events for the touching mirror action
 */

import { EntityId } from '@sharpee/core';

export interface TouchedMirrorEventData {
  actorId: EntityId;
  mirrorId: EntityId;
  message: string;
  connectedTo?: EntityId;
  signatures?: Array<{
    entityId: EntityId;
    timestamp: number;
    action: string;
  }>;
}