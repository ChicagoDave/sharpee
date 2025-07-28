/**
 * Event type definitions for the giving action
 * @module
 */

export interface GivenEventData {
  /** ID of the item being given */
  item: string;
  /** Name of the item for display */
  itemName: string;
  /** ID of the recipient */
  recipient: string;
  /** Name of the recipient for display */
  recipientName: string;
  /** Whether the gift was accepted */
  accepted: boolean;
  /** Reason for refusal if not accepted */
  refusalReason?: string;
}

export interface GivingEventMap {
  'if.event.given': GivenEventData;
}
