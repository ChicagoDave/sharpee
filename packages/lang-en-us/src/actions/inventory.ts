/**
 * English language content for the inventory action
 */

export const inventoryLanguage = {
  actionId: 'if.action.inventory',
  
  patterns: [
    'inventory',
    'i',
    'inv',
    'take inventory',
    'check inventory'
  ],
  
  messages: {
    'empty': "You aren't carrying anything.",
    'inventory_empty': "You aren't carrying anything.",
    'nothing_at_all': "You aren't carrying anything at all.",
    'hands_empty': "Your hands are empty.",
    'pockets_empty': "Your pockets are empty.",
    'carrying': "You are carrying:",
    'wearing': "You are wearing:",
    'carrying_and_wearing': "You are carrying and wearing:",
    'item_list': "  {item}",
    'holding_list': "  {items}",
    'worn_list': "  {items} (worn)",
    'inventory_header': "You are carrying:",
    'carrying_count': "You are carrying {holdingCount} item(s).",
    'wearing_count': "You are wearing {wearingCount} item(s).",
    'burden_light': "You're traveling light.",
    'burden_heavy': "You're carrying quite a load.",
    'burden_overloaded': "You're weighed down with everything you're carrying."
  },
  
  help: {
    description: 'Check what you are carrying and wearing.',
    examples: 'inventory, i, inv',
    summary: 'INVENTORY/I - Check what you are carrying and wearing. Example: I'
  }
};