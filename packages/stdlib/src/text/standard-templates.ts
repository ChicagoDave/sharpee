// packages/stdlib/src/text/standard-templates.ts

import { TextTemplate } from './text-service';
import { StandardEventTypes } from '@sharpee/core';

/**
 * Template for room descriptions
 */
export const roomDescriptionTemplate: TextTemplate = {
  id: 'room-description',
  matches: (event) => 
    event.type === StandardEventTypes.ITEM_EXAMINED &&
    event.payload?.location === event.payload?.target,
  render: (event, context) => {
    const room = context.world.getEntity(event.payload?.target as string);
    return room?.attributes.description as string || 'You see nothing special.';
  },
  section: 'main',
  priority: 10
};

/**
 * Template for examining objects
 */
export const examineTemplate: TextTemplate = {
  id: 'examine',
  matches: (event) => 
    event.type === StandardEventTypes.ITEM_EXAMINED &&
    event.payload?.location !== event.payload?.target,
  render: (event, context) => {
    return event.payload?.description as string || 'You see nothing special.';
  },
  section: 'main',
  priority: 10
};

/**
 * Template for movement
 */
export const movementTemplate: TextTemplate = {
  id: 'movement',
  matches: (event) => event.type === StandardEventTypes.PLAYER_MOVED,
  render: (event, context) => {
    const room = context.world.getEntity(event.payload?.to as string);
    if (!room) return null;
    
    // Get custom arrival message or default
    const arrivalMsg = event.payload?.arrivalDescription as string ||
      `You arrive at ${room.attributes.name}.`;
    
    // Add room description if available
    const description = room.attributes.description as string;
    if (description) {
      return `${arrivalMsg}\n\n${description}`;
    }
    
    return arrivalMsg;
  },
  section: 'main',
  priority: 10
};

/**
 * Template for taking items
 */
export const takeTemplate: TextTemplate = {
  id: 'take',
  matches: (event) => event.type === StandardEventTypes.ITEM_TAKEN,
  render: (event) => `You take the ${event.payload?.itemName}.`,
  section: 'main',
  priority: 5
};

/**
 * Template for dropping items
 */
export const dropTemplate: TextTemplate = {
  id: 'drop',
  matches: (event) => event.type === StandardEventTypes.ITEM_DROPPED,
  render: (event) => `You drop the ${event.payload?.itemName}.`,
  section: 'main',
  priority: 5
};

/**
 * Template for command errors
 */
export const errorTemplate: TextTemplate = {
  id: 'error',
  matches: (event) => 
    event.type === StandardEventTypes.COMMAND_FAILED ||
    event.type === StandardEventTypes.COMMAND_VALIDATION_FAILED,
  render: (event) => event.payload?.error as string || 'That didn\'t work.',
  section: 'system',
  priority: 100
};

/**
 * Template for system messages
 */
export const systemTemplate: TextTemplate = {
  id: 'system',
  matches: (event) => event.type === StandardEventTypes.SYSTEM_INFO,
  render: (event) => event.payload?.message as string,
  section: 'system',
  priority: 50
};

/**
 * Get all standard templates
 */
export function getStandardTemplates(): TextTemplate[] {
  return [
    roomDescriptionTemplate,
    examineTemplate,
    movementTemplate,
    takeTemplate,
    dropTemplate,
    errorTemplate,
    systemTemplate
  ];
}
