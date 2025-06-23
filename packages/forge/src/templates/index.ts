// packages/forge/src/templates/index.ts

import { StandardEventTypes } from '@sharpee/core';

/**
 * Default templates for standard events
 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  // Movement templates
  [StandardEventTypes.PLAYER_MOVED]: 'You go {direction}.',
  
  // Look templates
  [StandardEventTypes.ITEM_EXAMINED]: '{description}',
  
  // Item manipulation templates
  [StandardEventTypes.ITEM_TAKEN]: 'You take {itemName}.',
  [StandardEventTypes.ITEM_DROPPED]: 'You drop {itemName}.',
  [StandardEventTypes.ITEM_OPENED]: 'You open {itemName}.',
  [StandardEventTypes.ITEM_CLOSED]: 'You close {itemName}.',
  [StandardEventTypes.ITEM_USED]: 'You use {itemName}.',
  
  // Inventory templates
  [StandardEventTypes.INVENTORY_CHECKED]: 'You are carrying: {itemList}',
  [StandardEventTypes.INVENTORY_CHECKED + ':empty']: 'You are not carrying anything.',
  
  // Wait templates
  [StandardEventTypes.PLAYER_WAITED]: 'Time passes...',
  
  // Error templates
  [StandardEventTypes.COMMAND_FAILED]: '{error}',
  [StandardEventTypes.COMMAND_NOT_UNDERSTOOD]: "I don't understand that command.",
  
  // Location templates
  [StandardEventTypes.LOCATION_ENTERED]: '{locationName}\n{locationDescription}',
  
  // Door/container templates
  [StandardEventTypes.CONTAINER_OPENED]: 'You open the {itemName}.',
  [StandardEventTypes.CONTAINER_CLOSED]: 'You close the {itemName}.',
  [StandardEventTypes.DOOR_OPENED]: 'You open the {itemName}.',
  [StandardEventTypes.DOOR_CLOSED]: 'You close the {itemName}.',
};

/**
 * Apply a template to a data object
 * 
 * @param template The template string with {placeholders}
 * @param data The data object with values for the placeholders
 * @returns The formatted string
 */
export function applyTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/{([^{}]*)}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get a template for an event type
 * 
 * @param eventType The event type
 * @param templates The templates dictionary
 * @param variant Optional variant suffix (e.g., ':empty')
 * @returns The template string or undefined if not found
 */
export function getTemplate(
  eventType: string, 
  templates: Record<string, string>,
  variant?: string
): string | undefined {
  // Try to get the variant template first
  if (variant) {
    const variantTemplate = templates[`${eventType}:${variant}`];
    if (variantTemplate) {
      return variantTemplate;
    }
  }
  
  // Fall back to the base template
  return templates[eventType];
}

/**
 * Format an event using templates
 * 
 * @param eventType The event type
 * @param data The data for the template
 * @param templates The templates dictionary
 * @param variant Optional variant suffix
 * @returns The formatted string or undefined if no template found
 */
export function formatEvent(
  eventType: string,
  data: Record<string, any>,
  templates: Record<string, string> = DEFAULT_TEMPLATES,
  variant?: string
): string | undefined {
  const template = getTemplate(eventType, templates, variant);
  if (!template) {
    return undefined;
  }
  
  return applyTemplate(template, data);
}
