/**
 * Message constants for the inventory action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const InventoryMessages = {
  // Success messages
  INVENTORY_EMPTY: 'inventory_empty',
  CARRYING: 'carrying',
  WEARING: 'wearing',
  CARRYING_AND_WEARING: 'carrying_and_wearing',
  HOLDING_LIST: 'holding_list',
  WORN_LIST: 'worn_list',
  CHECKING_POCKETS: 'checking_pockets',
  RIFLING_THROUGH_BAG: 'rifling_through_bag',
  INVENTORY_HEADER: 'inventory_header',
  NOTHING_AT_ALL: 'nothing_at_all',
  HANDS_EMPTY: 'hands_empty',
  POCKETS_EMPTY: 'pockets_empty',
  CARRYING_COUNT: 'carrying_count',
  WEARING_COUNT: 'wearing_count',
  BURDEN_LIGHT: 'burden_light',
  BURDEN_HEAVY: 'burden_heavy',
  BURDEN_OVERLOADED: 'burden_overloaded',
} as const;

export type InventoryMessageId = typeof InventoryMessages[keyof typeof InventoryMessages];
