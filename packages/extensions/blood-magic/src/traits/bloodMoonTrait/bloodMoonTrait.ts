/**
 * BloodMoonTrait - Grants ability to become invisible
 */

import { ITrait } from '@sharpee/world-model';

export interface BloodMoonTrait extends ITrait {
  type: 'blood_moon';
  
  // Current state
  isInvisible: boolean;
  
  // Story tracking
  timesActivated: number;
  lastActivationTime?: number;
  totalInvisibleTime: number; // Total story hours spent invisible
  
  // Optional focus object (like a moon necklace)
  focusObject?: string; // Entity ID of moon-touched item
}

/**
 * Create a new BloodMoonTrait
 */
export function createBloodMoonTrait(options: Partial<BloodMoonTrait> = {}): BloodMoonTrait {
  return {
    type: 'blood_moon',
    isInvisible: options.isInvisible || false,
    timesActivated: options.timesActivated || 0,
    lastActivationTime: options.lastActivationTime,
    totalInvisibleTime: options.totalInvisibleTime || 0,
    focusObject: options.focusObject
  };
}

/**
 * Activate invisibility
 */
export function activateInvisibility(
  carrier: BloodMoonTrait,
  storyTime: number
): void {
  if (!carrier.isInvisible) {
    carrier.isInvisible = true;
    carrier.timesActivated++;
    carrier.lastActivationTime = storyTime;
  }
}

/**
 * Deactivate invisibility
 */
export function deactivateInvisibility(
  carrier: BloodMoonTrait,
  storyTime: number
): void {
  if (carrier.isInvisible) {
    if (carrier.lastActivationTime) {
      const duration = storyTime - carrier.lastActivationTime;
      carrier.totalInvisibleTime += duration;
    }
    carrier.isInvisible = false;
  }
}