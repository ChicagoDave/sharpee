/**
 * Checkpoint Serializer
 *
 * Handles serialization and deserialization of game state for checkpoints.
 * Captures world model state and scheduler state (daemons, fuses).
 */

import type { WorldModel } from '@sharpee/world-model';
import type { CheckpointData, SerializedDaemon, SerializedFuse } from '../types.js';

/**
 * Serialize current game state to checkpoint data
 */
export function serializeCheckpoint(
  world: WorldModel,
  name?: string
): CheckpointData {
  const player = world.getPlayer();
  const playerLocation = player ? world.getLocation(player.id) : undefined;

  // Get world state via WorldModel.toJSON()
  const worldState = world.toJSON();

  // TODO: Get scheduler state when scheduler API is available
  // For now, scheduler state is omitted
  const schedulerState = undefined;

  const checkpoint: CheckpointData = {
    version: '1.0.0',
    timestamp: Date.now(),
    metadata: {
      name,
      turn: getTurnNumber(world),
      location: playerLocation,
    },
    worldState,
    schedulerState,
  };

  return checkpoint;
}

/**
 * Deserialize checkpoint data and restore game state
 */
export function deserializeCheckpoint(
  checkpoint: CheckpointData,
  world: WorldModel
): void {
  // Validate version
  if (checkpoint.version !== '1.0.0') {
    throw new Error(`Unsupported checkpoint version: ${checkpoint.version}`);
  }

  // Restore world state via WorldModel.loadJSON()
  world.loadJSON(checkpoint.worldState);

  // TODO: Restore scheduler state when scheduler API is available
  if (checkpoint.schedulerState) {
    restoreSchedulerState(world, checkpoint.schedulerState);
  }
}

/**
 * Get current turn number from world
 */
function getTurnNumber(world: WorldModel): number {
  // Try to get turn from world metadata or state
  // This may need adjustment based on actual WorldModel API
  try {
    const state = JSON.parse(world.toJSON());
    return state.turn ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Restore scheduler state (daemons and fuses)
 */
function restoreSchedulerState(
  world: WorldModel,
  state: {
    turn: number;
    daemons: SerializedDaemon[];
    fuses: SerializedFuse[];
  }
): void {
  // TODO: Implement when scheduler serialization API is available
  // This will need access to the engine's scheduler service
  console.warn('Scheduler state restoration not yet implemented');
}

/**
 * Validate checkpoint data structure
 */
export function validateCheckpoint(data: unknown): data is CheckpointData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const checkpoint = data as Partial<CheckpointData>;

  if (checkpoint.version !== '1.0.0') {
    return false;
  }

  if (typeof checkpoint.timestamp !== 'number') {
    return false;
  }

  if (!checkpoint.metadata || typeof checkpoint.metadata !== 'object') {
    return false;
  }

  if (typeof checkpoint.worldState !== 'string') {
    return false;
  }

  return true;
}
