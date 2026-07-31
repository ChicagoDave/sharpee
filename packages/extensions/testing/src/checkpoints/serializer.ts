/**
 * Checkpoint Serializer
 *
 * Handles serialization and deserialization of game state for checkpoints.
 * Captures world model state and scheduler state (daemons, fuses).
 *
 * Owns the checkpoint format's version contract: what version this build writes
 * (`CHECKPOINT_FORMAT_VERSION`), what versions it can read
 * (`SUPPORTED_CHECKPOINT_VERSIONS`), and where an unreadable version is rejected
 * (`deserializeCheckpoint`). `CheckpointData.version` is typed `string`, so this module
 * — not the type system — is the sole authority on version support.
 *
 * Public interface: serializeCheckpoint, deserializeCheckpoint, validateCheckpoint,
 * isSupportedCheckpointVersion, CHECKPOINT_FORMAT_VERSION, SUPPORTED_CHECKPOINT_VERSIONS.
 * Owner context: @sharpee/ext-testing (debug/testing tooling).
 */

import type { WorldModel } from '@sharpee/world-model';
import type { CheckpointData, SerializedDaemon, SerializedFuse } from '../types.js';

/**
 * The checkpoint format version this build writes.
 */
export const CHECKPOINT_FORMAT_VERSION = '1.0.0';

/**
 * Checkpoint format versions this build can read.
 *
 * Adding a version here is the deliberate act of promising to deserialize it. Bumping
 * `CHECKPOINT_FORMAT_VERSION` without adding the old version here drops read support for
 * every checkpoint already on disk.
 */
export const SUPPORTED_CHECKPOINT_VERSIONS: readonly string[] = [CHECKPOINT_FORMAT_VERSION];

/**
 * Whether this build can read a checkpoint of the given format version.
 *
 * @param version - The `version` field read off a checkpoint
 * @returns true when the version is a supported format version
 */
export function isSupportedCheckpointVersion(version: unknown): version is string {
  return typeof version === 'string' && SUPPORTED_CHECKPOINT_VERSIONS.includes(version);
}

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
    version: CHECKPOINT_FORMAT_VERSION,
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
 * Deserialize checkpoint data and restore game state.
 *
 * This is the versioned reader: it decides at runtime whether the checkpoint's format is
 * one this build understands, and refuses the world overwrite if it is not.
 *
 * @param checkpoint - Checkpoint to restore from
 * @param world - World model to overwrite with the checkpoint's state
 * @throws Error when `checkpoint.version` is missing, not a string, or not in
 *   `SUPPORTED_CHECKPOINT_VERSIONS` — thrown before `world` is touched
 */
export function deserializeCheckpoint(
  checkpoint: CheckpointData,
  world: WorldModel
): void {
  // Version gate, not a type assertion: `version` is a plain string, so an unreadable
  // format can only be caught here. Reject before mutating the world — a partially
  // applied checkpoint is worse than a refused one.
  if (!isSupportedCheckpointVersion(checkpoint.version)) {
    throw new Error(
      `Unsupported checkpoint version: ${JSON.stringify(checkpoint.version)}. ` +
        `This build reads: ${SUPPORTED_CHECKPOINT_VERSIONS.join(', ')}.`
    );
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
 * Validate checkpoint data structure.
 *
 * Structural only — it answers "is this shaped like a checkpoint?", never "can this build
 * read it?". Version support is `deserializeCheckpoint`'s job. Keeping the two apart is
 * what lets a store distinguish a corrupt/absent checkpoint (returns undefined) from a
 * well-formed checkpoint at an unreadable version (throws a named error at read time);
 * folding the version test in here made the latter look like the former.
 *
 * @param data - Parsed JSON of unknown shape
 * @returns true when `data` has every required checkpoint field at the right type
 */
export function validateCheckpoint(data: unknown): data is CheckpointData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const checkpoint = data as Partial<CheckpointData>;

  if (typeof checkpoint.version !== 'string' || checkpoint.version.length === 0) {
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
