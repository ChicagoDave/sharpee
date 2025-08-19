/**
 * Events for the forgetting moon action
 */

import { EntityId } from '@sharpee/core';

export interface ForgotMoonEventData extends Record<string, unknown> {
  actorId: EntityId;
  message: string;
}