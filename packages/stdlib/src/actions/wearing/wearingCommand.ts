/**
 * Wearing command definition
 * 
 * Maps "wear", "put on" to the WEARING action
 */

import { CommandDefinition } from '../../actions/types/command-types';
import { IFActions, IFVerbs } from '../../constants';

/**
 * Command definition for wearing objects
 * 
 * Handles patterns like:
 * - wear hat
 * - put on the cloak
 * - don jacket
 */
export const wearingCommand: CommandDefinition = {
  verbId: IFVerbs.WEAR,
  mapsToAction: IFActions.WEARING,
  requiresNoun: true, // Wearing always requires a target
  allowsIndirectObject: false, // Simple wear action
  
  // No custom validation needed - standard noun resolution is sufficient
};