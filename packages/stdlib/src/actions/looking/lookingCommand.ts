/**
 * Looking command definition
 * 
 * Maps "look", "l" to the LOOKING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for looking around
 * 
 * Handles patterns like:
 * - look
 * - l
 * - look around
 */
export const lookingCommand: CommandDefinition = {
  verbId: IFVerbs.LOOK,
  mapsToAction: IFActions.LOOKING,
  requiresNoun: false, // Looking around doesn't need a target
  allowsIndirectObject: false,
  
  // No custom validation needed - this is a simple action
};