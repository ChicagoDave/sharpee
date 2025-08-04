/**
 * [ACTION NAME] action - [DESCRIPTION]
 */

// Import from local action types
import { ActionDefinition } from './types';

// Import from parser types  
import { IFCommand } from '../parser/if-parser-types';

// Import from world model types
import { GameContext } from '../world-model/types';

// Import from Core through controlled boundary
import { SemanticEvent, createEvent } from '../core-imports';

// Import IF-specific constants from local constants
import { IFActions } from '../constants/if-actions';
import { IFEvents } from '../constants/if-events';
import { IFEntityType } from '../constants/if-entity-types';
import { IFAttributes } from '../constants/if-attributes';

/**
 * [Action name] action definition
 * 
 * Handles "[verb] [noun]" commands
 */
export const [actionName]Action: ActionDefinition = {
  id: IFActions.[ACTION_CONSTANT],
  name: IFActions.[ACTION_CONSTANT],
  verbs: [], // Will be populated from language provider
  metadata: {
    changesWorld: true, // Does this action change game state?
    undoable: true,     // Can this action be undone?
    category: '[category]' // manipulation, movement, observation, etc.
  },
  phases: {
    // VALIDATE phase - Check if action is possible
    validate: (command: IFCommand, context: GameContext): boolean | string => {
      // Validation checks
      
      // Example: Check if we have a target
      if (!command.noun || command.noun.length === 0) {
        return context.languageProvider.formatMessage('action.[actionName].no_target');
      }
      
      // All checks passed
      return true;
    },

    // EXECUTE phase - Perform the action and return events
    execute: (command: IFCommand, context: GameContext): SemanticEvent[] => {
      const events: SemanticEvent[] = [];
      
      // Get the target
      if (!command.noun || command.noun.length === 0) return [];
      const target = command.noun[0].entity;
      
      // Perform the action
      // TODO: Add action logic here
      
      // Create event describing what happened
      events.push(createEvent(
        IFEvents.[EVENT_TYPE],
        { 
          action: IFActions.[ACTION_CONSTANT],
          actor: command.actor,
          target: target.id,
          targetName: target.attributes[IFAttributes.NAME]
          // Add other relevant data
        },
        { 
          narrate: true,
          location: context.currentLocation.id
        }
      ));
      
      // Return all events
      return events;
    }
  }
};
