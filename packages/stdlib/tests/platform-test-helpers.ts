/**
 * Helper functions for platform action tests
 */

import { WorldModel, StandardCapabilities } from '@sharpee/world-model';

interface SharedGameData {
  score?: number;
  moves?: number;
  turnCount?: number;
  lastSaveMove?: number;
  saves?: Record<string, {
    score: number;
    moves: number;
    timestamp: number;
  }>;
  saveRestrictions?: {
    disabled?: boolean;
  };
}

let sharedData: SharedGameData = {};

/**
 * Set up shared game data for testing platform actions
 */
export function setupSharedData(world: WorldModel, data: SharedGameData): void {
  sharedData = { ...data };
  
  // First register the capability
  world.registerCapability('sharedData' as any, {
    id: 'sharedData',
    name: 'Shared Game Data',
    version: '1.0.0',
    data: sharedData
  });
  
  // Then update it with the data
  world.updateCapability('sharedData' as any, sharedData);
}

/**
 * Get the current shared game data
 */
export function getSharedData(): SharedGameData {
  return sharedData;
}

/**
 * Clear shared data
 */
export function clearSharedData(): void {
  sharedData = {};
}