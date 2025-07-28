/**
 * Event type definitions for the putting action
 * @module
 */

export interface PutInEventData {
  /** ID of the item being put */
  itemId: string;
  /** ID of the container */
  targetId: string;
  /** Preposition used (always 'in' for containers) */
  preposition: 'in';
}

export interface PutOnEventData {
  /** ID of the item being put */
  itemId: string;
  /** ID of the supporter */
  targetId: string;
  /** Preposition used (always 'on' for supporters) */
  preposition: 'on';
}

export interface PuttingEventMap {
  'if.event.put_in': PutInEventData;
  'if.event.put_on': PutOnEventData;
}
