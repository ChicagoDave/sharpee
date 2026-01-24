/**
 * Annotation Context Capture
 *
 * Utility to capture current game state for annotations.
 */

import type { WorldModel } from '@sharpee/world-model';
import type { AnnotationContext } from '../types.js';

/**
 * Capture the current game state for annotation context
 */
export function captureContext(
  world: WorldModel,
  lastCommand: string,
  lastResponse: string
): AnnotationContext {
  const player = world.getPlayer();
  const locationId = player ? world.getLocation(player.id) : undefined;
  const location = locationId ? world.getEntity(locationId) : undefined;
  const inventory = player ? world.getContents(player.id) : [];

  return {
    roomId: locationId ?? 'unknown',
    roomName: location?.name ?? locationId ?? 'unknown',
    turn: (world.getStateValue('turnCount') as number) ?? (world.getStateValue('moves') as number) ?? 0,
    score: (world.getStateValue('score') as number) ?? 0,
    lastCommand,
    lastResponse,
    inventory: inventory.map((e) => e.name ?? e.id),
  };
}

/**
 * Create an empty/default context (for when no command has been executed yet)
 */
export function createEmptyContext(): AnnotationContext {
  return {
    roomId: 'unknown',
    roomName: 'unknown',
    turn: 0,
    score: 0,
    lastCommand: '',
    lastResponse: '',
    inventory: [],
  };
}
