/**
 * Examining command definition
 * 
 * Maps "examine", "look at", "x" etc. to the EXAMINING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for examining objects
 * 
 * Handles patterns like:
 * - examine lamp
 * - look at the sword
 * - x key
 * - inspect door
 */
export const examiningCommand: CommandDefinition = {
  verbId: IFVerbs.EXAMINE,
  mapsToAction: IFActions.EXAMINING,
  requiresNoun: true, // Examining always requires a target
  allowsIndirectObject: false, // Simple examination
  
  // No custom validation needed - standard noun resolution is sufficient
};