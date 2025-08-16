/**
 * Events for the forgetting moon action
 */

import { EntityId } from '@sharpee/core';

export interface ForgotMoonEventData {
  actorId: EntityId;
  message: string;
}