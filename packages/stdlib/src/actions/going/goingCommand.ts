/**
 * Going command definition
 * 
 * Maps "go", directional commands etc. to the GOING action
 */

import { CommandDefinition, ParseContext } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Valid directions for movement
 */
const DIRECTIONS = [
  'north', 'south', 'east', 'west', 
  'northeast', 'northwest', 'southeast', 'southwest', 
  'up', 'down', 'in', 'out',
  // Short forms
  'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'
];

/**
 * Check if a word is a direction
 */
function isDirection(word: string): boolean {
  return DIRECTIONS.includes(word.toLowerCase());
}

/**
 * Command definition for movement
 * 
 * Handles patterns like:
 * - go north
 * - north (standalone direction)
 * - enter door
 * - go through door
 * - exit
 */
export const goingCommand: CommandDefinition = {
  verbId: IFVerbs.GO,
  mapsToAction: IFActions.GOING,
  requiresNoun: false, // Can be just "north" or "go north"
  allowsIndirectObject: false,
  
  // Custom validation to handle direction-only commands
  validate: (context: ParseContext): boolean => {
    // Accept if we have a verb and noun (go north)
    if (context.verb && context.noun) {
      return true;
    }
    
    // Accept if the entire input is just a direction
    if (!context.verb && context.noun && isDirection(context.noun)) {
      return true;
    }
    
    // Accept special cases like "exit" or "out"
    if (context.rawInput === 'exit' || context.rawInput === 'out') {
      return true;
    }
    
    return false;
  }
};