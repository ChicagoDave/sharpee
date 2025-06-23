/**
 * Taking command definition
 * 
 * Maps "take", "get", "pick up" etc. to the TAKING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for taking objects
 * 
 * Handles patterns like:
 * - take lamp
 * - get the sword
 * - pick up the key
 * - grab book
 */
export const takingCommand: CommandDefinition = {
  verbId: IFVerbs.TAKE,
  mapsToAction: IFActions.TAKING,
  requiresNoun: true, // Taking always requires a target
  allowsIndirectObject: false, // Can't take X from Y (use "get X from Y" instead)
  
  // No custom validation needed - standard noun resolution is sufficient
};