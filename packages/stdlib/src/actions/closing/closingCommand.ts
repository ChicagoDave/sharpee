/**
 * Closing command definition
 * 
 * Maps "close" to the CLOSING action
 */

import { CommandDefinition } from '../types/command-types';
import { IFActions } from '../../constants';

/**
 * Command definition for closing objects
 * 
 * Handles patterns like:
 * - close door
 * - close the chest
 * - shut box
 */
export const closingCommand: CommandDefinition = {
  verbId: 'close', // Primary verb ID used in language files
  mapsToAction: IFActions.CLOSING,
  requiresNoun: true, // Closing always requires a target
  allowsIndirectObject: false, // Simple close
  
  // No custom validation needed - standard noun resolution is sufficient
};