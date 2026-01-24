/**
 * Events for the touching moon action
 */

import { EntityId } from '@sharpee/core';

export interface TouchedMoonEventData extends Record<string, unknown> {
  actorId: EntityId;
  message: string;
}