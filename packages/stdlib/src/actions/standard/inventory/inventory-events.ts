/**
 * Event type definitions for the inventory action
 * @module
 */

export interface InventoryItem {
  /** Item ID */
  id: string;
  /** Item name for display */
  name: string;
  /** Whether the item is worn */
  worn?: boolean;
}

export interface InventoryEventData {
  /** ID of the actor checking inventory */
  actorId: string;
  /** ID of the location where the check occurs */
  locationId: string;
  /** Total number of items carried */
  totalItems: number;
  /** Number of items held (not worn) */
  heldItems: number;
  /** Number of items worn */
  wornItems: number;
  /** Whether inventory is empty */
  isEmpty: boolean;
  /** List of carried items (not worn) */
  carried: InventoryItem[];
  /** List of worn items */
  worn: InventoryItem[];
  /** Complete list of all items with worn status */
  items: InventoryItem[];
  /** Total weight carried (if applicable) */
  totalWeight?: number;
  /** Maximum weight capacity (if applicable) */
  maxWeight?: number;
  /** Weight limit (same as maxWeight) */
  weightLimit?: number;
  /** Weight as percentage of limit */
  weightPercentage?: number;
  /** Burden status: 'light', 'heavy', or 'overloaded' */
  burden?: 'light' | 'heavy' | 'overloaded';
  /** Whether this is a brief inventory check */
  brief?: boolean;
}

export interface InventoryEventMap {
  'if.action.inventory': InventoryEventData;
}
