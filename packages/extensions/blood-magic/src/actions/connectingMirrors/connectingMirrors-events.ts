/**
 * Events for the connecting mirrors action
 */

import { EntityId } from '@sharpee/core';

export interface ConnectedMirrorsEventData {
  actorId: EntityId;
  mirror1Id: EntityId;
  mirror2Id: EntityId;
  message: string;
  replacedConnections?: {
    mirror1Previous: EntityId | null;
    mirror2Previous: EntityId | null;
  };
}