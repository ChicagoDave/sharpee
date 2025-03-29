// packages/stdlib/src/channels/standard-channels.ts

import { ChannelDefinition } from '@core/channels/types';
import { createTextFormatter } from '@core/channels/channel-system';
import { StandardEventTypes, StandardEventTags } from '@core/events/standard-events';
import { SemanticEvent } from '@core/events/types';

/**
 * The main narrative channel for room descriptions and major events
 */
export const MAIN_CHANNEL: ChannelDefinition = {
  id: 'main',
  name: 'Main',
  description: 'The main narrative channel for room descriptions and events',
  eventTypes: [
    StandardEventTypes.ITEM_EXAMINED,
    StandardEventTypes.PLAYER_MOVED,
    StandardEventTypes.NARRATIVE_EVENT,
    StandardEventTypes.LOCATION_DISCOVERED
  ],
  formatter: createTextFormatter('narrative', (event: SemanticEvent) => {
    if (event.type === StandardEventTypes.ITEM_EXAMINED) {
      if (event.payload?.location === event.payload?.target) {
        // This is a room description
        return event.payload?.description as string || 'You see nothing special.';
      } else {
        // This is an object description
        return event.payload?.description as string || 'You see nothing special.';
      }
    }
    
    if (event.type === StandardEventTypes.PLAYER_MOVED) {
      return event.payload?.arrivalDescription as string || 
             `You arrive at ${event.payload?.locationName || 'a new location'}.`;
    }
    
    if (event.type === StandardEventTypes.NARRATIVE_EVENT) {
      return event.payload?.text as string || '';
    }
    
    if (event.type === StandardEventTypes.LOCATION_DISCOVERED) {
      return `You discover ${event.payload?.locationName || 'a new location'}.`;
    }
    
    return null;
  }),
  persistent: true
};

/**
 * Channel for inventory-related actions
 */
export const INVENTORY_CHANNEL: ChannelDefinition = {
  id: 'inventory',
  name: 'Inventory',
  description: 'Channel for inventory-related actions',
  eventTypes: [
    StandardEventTypes.ITEM_TAKEN,
    StandardEventTypes.ITEM_DROPPED
  ],
  formatter: createTextFormatter('inventory', (event: SemanticEvent) => {
    const itemName = event.payload?.itemName as string || 'item';
    
    if (event.type === StandardEventTypes.ITEM_TAKEN) {
      return `You take the ${itemName}.`;
    }
    
    if (event.type === StandardEventTypes.ITEM_DROPPED) {
      return `You drop the ${itemName}.`;
    }
    
    return null;
  }),
  persistent: false
};

/**
 * Channel for conversation and dialogue
 */
export const CONVERSATION_CHANNEL: ChannelDefinition = {
  id: 'conversation',
  name: 'Conversation',
  description: 'Channel for conversations and dialogue',
  eventTypes: [
    StandardEventTypes.DIALOGUE_STARTED,
    StandardEventTypes.DIALOGUE_ENDED
  ],
  formatter: createTextFormatter('dialogue', (event: SemanticEvent) => {
    if (event.type === StandardEventTypes.DIALOGUE_STARTED) {
      const speakerName = event.payload?.speakerName as string || 'Someone';
      const text = event.payload?.text as string || '';
      return `${speakerName}: "${text}"`;
    }
    
    return null;
  }),
  persistent: true
};

/**
 * Channel for system messages
 */
export const SYSTEM_CHANNEL: ChannelDefinition = {
  id: 'system',
  name: 'System',
  description: 'Channel for system messages and errors',
  eventTypes: [
    StandardEventTypes.SYSTEM_ERROR,
    StandardEventTypes.SYSTEM_WARNING,
    StandardEventTypes.SYSTEM_INFO,
    StandardEventTypes.COMMAND_EXECUTION_ERROR,
    StandardEventTypes.COMMAND_VALIDATION_FAILED,
    StandardEventTypes.COMMAND_NOT_UNDERSTOOD,
    StandardEventTypes.COMMAND_FAILED
  ],
  formatter: createTextFormatter('system', (event: SemanticEvent) => {
    if (event.type === StandardEventTypes.SYSTEM_ERROR) {
      return `Error: ${event.payload?.message || 'An error occurred'}`;
    }
    
    if (event.type === StandardEventTypes.SYSTEM_WARNING) {
      return `Warning: ${event.payload?.message || 'A warning occurred'}`;
    }
    
    if (event.type === StandardEventTypes.SYSTEM_INFO) {
      return event.payload?.message as string || '';
    }
    
    if (event.type === StandardEventTypes.COMMAND_EXECUTION_ERROR) {
      return `Error executing command: ${event.payload?.error || 'An error occurred'}`;
    }
    
    if (event.type === StandardEventTypes.COMMAND_VALIDATION_FAILED) {
      return event.payload?.reason as string || 'Invalid command';
    }
    
    if (event.type === StandardEventTypes.COMMAND_NOT_UNDERSTOOD) {
      return `I don't understand that command.`;
    }
    
    if (event.type === StandardEventTypes.COMMAND_FAILED) {
      return event.payload?.error as string || 'Command failed';
    }
    
    return null;
  }),
  persistent: false
};

/**
 * Channel for hints and help
 */
export const HINT_CHANNEL: ChannelDefinition = {
  id: 'hint',
  name: 'Hints',
  description: 'Channel for hints and help',
  eventTypes: ['hint:provided', 'hint:requested'],
  formatter: createTextFormatter('hint', (event: SemanticEvent) => {
    return event.payload?.text as string || null;
  }),
  persistent: true
};

/**
 * Channel for command echo (showing what the player typed)
 */
export const COMMAND_ECHO_CHANNEL: ChannelDefinition = {
  id: 'command_echo',
  name: 'Command Echo',
  description: 'Echos the commands entered by the player',
  eventTypes: [StandardEventTypes.COMMAND_EXECUTED],
  formatter: (event: SemanticEvent) => {
    if (event.type === StandardEventTypes.COMMAND_EXECUTED) {
      return {
        id: `echo_${event.id}`,
        sourceEventIds: [event.id],
        timestamp: event.timestamp,
        content: event.payload?.command as string || '',
        type: 'command_echo'
      };
    }
    return null;
  },
  persistent: false
};

/**
 * Register standard channels with a channel manager
 */
export function registerStandardChannels(manager: any): void {
  manager.registerChannel(MAIN_CHANNEL);
  manager.registerChannel(INVENTORY_CHANNEL);
  manager.registerChannel(CONVERSATION_CHANNEL);
  manager.registerChannel(SYSTEM_CHANNEL);
  manager.registerChannel(HINT_CHANNEL);
  manager.registerChannel(COMMAND_ECHO_CHANNEL);
}