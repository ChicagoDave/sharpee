/**
 * Event type definitions for the showing action
 * @module
 */

export interface ShownEventData {
  /** ID of the item being shown */
  item: string;
  /** Name of the item for display */
  itemName: string;
  /** ID of the viewer */
  viewer: string;
  /** Name of the viewer for display */
  viewerName: string;
  /** Whether the item is being worn */
  isWorn: boolean;
  /** Item's proper name if available */
  itemProperName?: string;
  /** Whether the viewer recognized the item */
  recognized?: boolean;
  /** Whether the viewer was impressed */
  impressed?: boolean;
}

export interface ShowingEventMap {
  'if.event.shown': ShownEventData;
}
