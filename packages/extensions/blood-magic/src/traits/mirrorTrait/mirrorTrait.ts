/**
 * MirrorTrait - Defines a reflective surface that can act as a portal
 */

import { Trait } from '@sharpee/world-model';

export interface MirrorConnection {
  targetMirrorId: string;
  establishedBy: string; // Entity ID who created the connection
  establishedAt: number; // Story timestamp
  lastUsed?: number; // Last travel timestamp
}

export interface MirrorSignature {
  entityId: string; // Who left the signature
  timestamp: number; // When (story time in hours)
  action: 'touched' | 'connected' | 'entered' | 'exited';
}

export type MirrorOrientation = 'wall' | 'floor' | 'ceiling' | 'handheld' | 'facedown';

export interface MirrorTrait extends Trait {
  type: 'mirror';
  
  // Physical properties
  orientation: MirrorOrientation;
  size: 'small' | 'medium' | 'large';
  quality: 'poor' | 'fair' | 'good' | 'excellent'; // Affects clarity of LOOK/LISTEN
  
  // State
  isBroken: boolean;
  isCovered: boolean; // Covered by tarp/cloth
  isFaceDown: boolean; // Face down on surface
  
  // Connections
  connections: Map<string, MirrorConnection>; // Key is target mirror ID
  
  // Signatures - who has interacted with this mirror
  signatures: MirrorSignature[];
  
  // Can this mirror be used for travel right now?
  canEnter: boolean; // Computed based on state
  canExit: boolean; // Computed based on state
}

/**
 * Create a new MirrorTrait
 */
export function createMirrorTrait(options: Partial<MirrorTrait> = {}): MirrorTrait {
  const trait: MirrorTrait = {
    type: 'mirror',
    orientation: options.orientation || 'wall',
    size: options.size || 'medium',
    quality: options.quality || 'good',
    isBroken: options.isBroken || false,
    isCovered: options.isCovered || false,
    isFaceDown: options.isFaceDown || false,
    connections: options.connections || new Map(),
    signatures: options.signatures || [],
    canEnter: true,
    canExit: true
  };
  
  // Update travel ability based on state
  updateTravelAbility(trait);
  
  return trait;
}

/**
 * Update whether a mirror can be entered/exited based on its state
 */
export function updateTravelAbility(mirror: MirrorTrait): void {
  // Broken mirrors can't be used at all
  if (mirror.isBroken) {
    mirror.canEnter = false;
    mirror.canExit = false;
    return;
  }
  
  // Face down or backwards against wall - can connect but not travel
  if (mirror.isFaceDown || mirror.orientation === 'facedown') {
    mirror.canEnter = false;
    mirror.canExit = false;
    return;
  }
  
  // Covered mirrors can be exited but not entered
  if (mirror.isCovered) {
    mirror.canEnter = false;
    mirror.canExit = true;
    return;
  }
  
  // Otherwise both are possible
  mirror.canEnter = true;
  mirror.canExit = true;
}

/**
 * Add a connection between two mirrors
 */
export function connectMirrors(
  fromMirror: MirrorTrait,
  toMirrorId: string,
  establishedBy: string,
  storyTime: number
): void {
  if (fromMirror.isBroken) {
    throw new Error('Cannot connect broken mirror');
  }
  
  fromMirror.connections.set(toMirrorId, {
    targetMirrorId: toMirrorId,
    establishedBy,
    establishedAt: storyTime
  });
  
  // Add signature
  addSignature(fromMirror, establishedBy, storyTime, 'connected');
}

/**
 * Remove a connection
 */
export function disconnectMirror(mirror: MirrorTrait, targetId: string): void {
  mirror.connections.delete(targetId);
}

/**
 * Break a mirror, severing all connections
 */
export function breakMirror(mirror: MirrorTrait): void {
  mirror.isBroken = true;
  mirror.connections.clear();
  updateTravelAbility(mirror);
}

/**
 * Add a signature to a mirror
 */
export function addSignature(
  mirror: MirrorTrait,
  entityId: string,
  timestamp: number,
  action: MirrorSignature['action']
): void {
  mirror.signatures.push({
    entityId,
    timestamp,
    action
  });
  
  // Keep only last 10 signatures to prevent memory issues
  if (mirror.signatures.length > 10) {
    mirror.signatures = mirror.signatures.slice(-10);
  }
}

/**
 * Get recent signatures (within X hours of story time)
 */
export function getRecentSignatures(
  mirror: MirrorTrait,
  currentTime: number,
  hoursBack: number = 24
): MirrorSignature[] {
  const cutoffTime = currentTime - hoursBack;
  return mirror.signatures.filter(sig => sig.timestamp >= cutoffTime);
}

/**
 * Check if a specific entity has used this mirror recently
 */
export function hasRecentSignature(
  mirror: MirrorTrait,
  entityId: string,
  currentTime: number,
  hoursBack: number = 24
): boolean {
  const recent = getRecentSignatures(mirror, currentTime, hoursBack);
  return recent.some(sig => sig.entityId === entityId);
}

/**
 * Get the appropriate entry command based on mirror orientation
 */
export function getEntryCommand(mirror: MirrorTrait): string {
  switch (mirror.orientation) {
    case 'floor':
      return 'step on';
    case 'ceiling':
      return 'reach up to';
    case 'handheld':
      return 'touch';
    case 'wall':
    default:
      return 'enter';
  }
}