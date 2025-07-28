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
    'carrying': "You are carrying:",
    'wearing': "You are wearing:",
    'item_list': "  {item}"
  },
  
  help: {
    description: 'Check what you are carrying and wearing.',
    examples: 'inventory, i, inv',
    summary: 'INVENTORY/I - Check what you are carrying and wearing. Example: I'
  }
};