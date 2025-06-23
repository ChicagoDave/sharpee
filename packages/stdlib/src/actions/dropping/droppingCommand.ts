/**
 * Dropping command definition
 * 
 * Maps "drop", "put down" etc. to the DROPPING action
 */

import { CommandDefinition } from '../types/command-types';
import { IFActions } from '../../constants';

/**
 * Command definition for dropping objects
 * 
 * Handles patterns like:
 * - drop lamp
 * - put down the sword
 * - discard key
 */
export const droppingCommand: CommandDefinition = {
  verbId: 'drop', // Primary verb ID used in language files
  mapsToAction: IFActions.DROPPING,
  requiresNoun: true, // Dropping always requires a target
  allowsIndirectObject: false, // Simple drop, not "drop X on Y"
  
  // No custom validation needed - standard noun resolution is sufficient
};