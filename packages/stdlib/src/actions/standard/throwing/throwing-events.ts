/**
 * Event type definitions for the throwing action
 * @module
 */

export interface ThrownEventData {
  /** ID of the item being thrown */
  item: string;
  /** Name of the item for display */
  itemName: string;
  /** Type of throw: at target, directional, or general */
  throwType: 'at_target' | 'directional' | 'general';
  /** Whether the item is fragile */
  isFragile: boolean;
  /** Weight of the item */
  weight: number;
  /** Target entity ID if throwing at something */
  target?: string;
  /** Target name for display */
  targetName?: string;
  /** Direction if throwing directionally */
  direction?: string;
  /** Whether the throw hit the target */
  hit?: boolean;
  /** Whether the item will break */
  willBreak: boolean;
  /** Final location of the item (null if destroyed) */
  finalLocation: string | null;
}

export interface ItemDestroyedEventData {
  /** ID of the destroyed item */
  item: string;
  /** Name of the item for display */
  itemName: string;
  /** Cause of destruction */
  cause: string;
}

export interface ThrowingEventMap {
  'if.event.thrown': ThrownEventData;
  'if.event.item_destroyed': ItemDestroyedEventData;
}
