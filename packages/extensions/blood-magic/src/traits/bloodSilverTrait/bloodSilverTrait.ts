/**
 * BloodSilverTrait - Grants ability to use mirror portals
 */

import { Trait } from '@sharpee/world-model';

export interface BloodSilverTrait extends Trait {
  type: 'blood_silver';
  
  // Active connections this carrier maintains
  activeConnections: Set<string>; // Mirror IDs they've connected
  
  // Mirrors they've sensed/touched
  knownMirrors: Set<string>;
  
  // Can sense ripples when others use their connected mirrors
  sensingRipples: boolean;
  
  // Range limit for sensing (if line-of-sight limitation is enabled)
  senseRange: 'touch' | 'room' | 'connected' | 'unlimited';
  
  // Story tracking
  mirrorsEntered: number; // How many times they've traveled
  lastMirrorUsed?: string; // ID of last mirror used
  lastTravelTime?: number; // Story timestamp
}

/**
 * Create a new BloodSilverTrait
 */
export function createBloodSilverTrait(options: Partial<BloodSilverTrait> = {}): BloodSilverTrait {
  return {
    type: 'blood_silver',
    activeConnections: options.activeConnections || new Set(),
    knownMirrors: options.knownMirrors || new Set(),
    sensingRipples: options.sensingRipples !== false, // Default true
    senseRange: options.senseRange || 'room',
    mirrorsEntered: options.mirrorsEntered || 0,
    lastMirrorUsed: options.lastMirrorUsed,
    lastTravelTime: options.lastTravelTime
  };
}

/**
 * Check if carrier can sense activity on a mirror
 */
export function canSenseMirror(
  carrier: BloodSilverTrait,
  mirrorId: string,
  isInSameRoom: boolean,
  isConnected: boolean
): boolean {
  if (!carrier.sensingRipples) return false;
  
  // Check if this is one of their connections
  if (!carrier.activeConnections.has(mirrorId)) return false;
  
  // Check range
  switch (carrier.senseRange) {
    case 'touch':
      return false; // Would need to be touching the mirror
    case 'room':
      return isInSameRoom;
    case 'connected':
      return isConnected;
    case 'unlimited':
      return true;
    default:
      return false;
  }
}

/**
 * Record a mirror travel
 */
export function recordTravel(
  carrier: BloodSilverTrait,
  mirrorId: string,
  storyTime: number
): void {
  carrier.mirrorsEntered++;
  carrier.lastMirrorUsed = mirrorId;
  carrier.lastTravelTime = storyTime;
  carrier.knownMirrors.add(mirrorId);
}

/**
 * Add a connection to carrier's active set
 */
export function addActiveConnection(
  carrier: BloodSilverTrait,
  mirrorId: string
): void {
  carrier.activeConnections.add(mirrorId);
  carrier.knownMirrors.add(mirrorId);
}