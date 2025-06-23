/**
 * Unlocking command definition
 * 
 * Maps "unlock" to the UNLOCKING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for unlocking objects
 * 
 * Handles patterns like:
 * - unlock door
 * - unlock chest with key
 * - unlock box with brass key
 */
export const unlockingCommand: CommandDefinition = {
  verbId: IFVerbs.UNLOCK,
  mapsToAction: IFActions.UNLOCKING,
  requiresNoun: true, // Unlocking always requires a target
  allowsIndirectObject: true, // Can specify key with "with"
  requiresIndirectObject: false, // Key is optional (might auto-detect)
  
  // No custom validation needed - standard noun resolution is sufficient
};