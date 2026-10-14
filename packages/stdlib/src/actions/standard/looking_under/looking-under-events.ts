/**
 * Event type definitions for the looking-under action (ADR-370 D5).
 *
 * Public interface: LookedUnderEventData.
 * Owner context: stdlib / standard actions / sensory
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when an actor looks under something.
 */
export interface LookedUnderEventData {
  /** The thing looked under */
  target: EntityId;

  /** Name of the thing looked under */
  targetName: string;

  /** Concealed things the target held that this look revealed */
  revealedIds: EntityId[];
}
