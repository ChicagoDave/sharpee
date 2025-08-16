/**
 * Events for the touching moon action
 */

import { EntityId } from '@sharpee/core';

export interface TouchedMoonEventData {
  actorId: EntityId;
  message: string;
}