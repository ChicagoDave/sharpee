/**
 * Checkpoint format versioning (P-2, #142).
 *
 * `CheckpointData.version` is typed `string`, so the type system no longer rejects an
 * unreadable checkpoint — the reader must. These tests pin that contract: what
 * `serializeCheckpoint` stamps, what `deserializeCheckpoint` refuses (and that it refuses
 * *before* touching the world), and the split between structural validation and version
 * support that lets a store tell "not there" apart from "unreadable format".
 *
 * The store/extension tests drive the real `createFileStore` against a real temp
 * directory and the real `TestingExtension.restoreCheckpoint` — no stubs (rule 13a).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WorldModel } from '@sharpee/world-model';
import {
  serializeCheckpoint,
  deserializeCheckpoint,
  validateCheckpoint,
  isSupportedCheckpointVersion,
  CHECKPOINT_FORMAT_VERSION,
  SUPPORTED_CHECKPOINT_VERSIONS,
  createFileStore,
  TestingExtension,
  type CheckpointData,
} from '../src';

/** A world holding one identifiable entity, so restores are observable. */
function makeWorld(entityName: string): { world: WorldModel; entityId: string } {
  const world = new WorldModel();
  const entity = world.createEntity(entityName, 'object');
  return { world, entityId: entity.id };
}

/** A structurally valid checkpoint carrying an arbitrary version string. */
function checkpointAtVersion(version: string, worldState = '{}'): CheckpointData {
  return {
    version,
    timestamp: 1_700_000_000_000,
    metadata: { name: 'fixture', turn: 3 },
    worldState,
  };
}

describe('checkpoint format version constants', () => {
  it('stamps the current format version on serialize', () => {
    const { world } = makeWorld('lantern');

    const checkpoint = serializeCheckpoint(world, 'before-troll');

    expect(checkpoint.version).toBe(CHECKPOINT_FORMAT_VERSION);
  });

  it('can read back what it writes', () => {
    expect(SUPPORTED_CHECKPOINT_VERSIONS).toContain(CHECKPOINT_FORMAT_VERSION);
  });

  it('reports support only for listed version strings', () => {
    expect(isSupportedCheckpointVersion(CHECKPOINT_FORMAT_VERSION)).toBe(true);
    expect(isSupportedCheckpointVersion('99.0.0')).toBe(false);
    expect(isSupportedCheckpointVersion(undefined)).toBe(false);
    expect(isSupportedCheckpointVersion(1)).toBe(false);
  });
});

describe('deserializeCheckpoint — supported version', () => {
  it('overwrites world state with the checkpoint contents', () => {
    const { world, entityId } = makeWorld('brass lantern');
    const checkpoint = serializeCheckpoint(world, 'before-troll');

    // Diverge from the checkpoint, then restore.
    const laterEntity = world.createEntity('sword', 'object');
    expect(world.getEntity(laterEntity.id)).toBeDefined();

    deserializeCheckpoint(checkpoint, world);

    // State mutation, not a return value: the checkpointed entity is back and the
    // post-checkpoint one is gone.
    expect(world.getEntity(entityId)).toBeDefined();
    expect(world.getEntity(laterEntity.id)).toBeUndefined();
  });
});

describe('deserializeCheckpoint — unreadable version', () => {
  it('throws naming the offending version and the supported list', () => {
    const { world } = makeWorld('lantern');

    expect(() => deserializeCheckpoint(checkpointAtVersion('2.0.0'), world)).toThrow(
      /Unsupported checkpoint version: "2\.0\.0".*This build reads: 1\.0\.0/
    );
  });

  it('leaves the world untouched — rejection happens before loadJSON', () => {
    const { world, entityId } = makeWorld('brass lantern');
    const before = world.toJSON();

    expect(() =>
      // A future format whose worldState this build would mangle if it tried.
      deserializeCheckpoint(checkpointAtVersion('2.0.0', '{"entities":[]}'), world)
    ).toThrow();

    expect(world.getEntity(entityId)).toBeDefined();
    expect(world.toJSON()).toBe(before);
  });

  it('throws when version is absent or not a string', () => {
    const { world } = makeWorld('lantern');
    const missing = { ...checkpointAtVersion('1.0.0') } as Partial<CheckpointData>;
    delete missing.version;

    expect(() => deserializeCheckpoint(missing as CheckpointData, world)).toThrow(
      /Unsupported checkpoint version/
    );
    expect(() =>
      deserializeCheckpoint({ ...checkpointAtVersion('1.0.0'), version: 1 as unknown as string }, world)
    ).toThrow(/Unsupported checkpoint version/);
  });
});

describe('validateCheckpoint — structural only', () => {
  it('accepts a well-formed checkpoint at an unknown version', () => {
    // The point of the split: an unreadable version must still parse as a checkpoint, so
    // a store reports it as present rather than as a miss.
    expect(validateCheckpoint(checkpointAtVersion('2.0.0'))).toBe(true);
  });

  it('accepts the current format version', () => {
    expect(validateCheckpoint(checkpointAtVersion(CHECKPOINT_FORMAT_VERSION))).toBe(true);
  });

  it('rejects a missing, empty, or non-string version', () => {
    const noVersion = { ...checkpointAtVersion('1.0.0') } as Partial<CheckpointData>;
    delete noVersion.version;

    expect(validateCheckpoint(noVersion)).toBe(false);
    expect(validateCheckpoint(checkpointAtVersion(''))).toBe(false);
    expect(validateCheckpoint({ ...checkpointAtVersion('1.0.0'), version: 1 })).toBe(false);
  });

  it('rejects missing required fields and non-objects', () => {
    const noWorldState = { ...checkpointAtVersion('1.0.0') } as Partial<CheckpointData>;
    delete noWorldState.worldState;

    expect(validateCheckpoint(noWorldState)).toBe(false);
    expect(validateCheckpoint({ ...checkpointAtVersion('1.0.0'), timestamp: 'soon' })).toBe(false);
    expect(validateCheckpoint(undefined)).toBe(false);
    expect(validateCheckpoint('1.0.0')).toBe(false);
  });
});

describe('file store — an unreadable version is present, not missing', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-checkpoint-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('loads a future-version checkpoint off disk instead of returning undefined', async () => {
    const store = createFileStore(directory);
    fs.writeFileSync(
      path.join(directory, 'future.json'),
      JSON.stringify(checkpointAtVersion('2.0.0')),
      'utf-8'
    );

    const loaded = await store.load('future');

    expect(loaded).toBeDefined();
    expect(loaded?.version).toBe('2.0.0');
  });

  it('still returns undefined for a checkpoint that is not there', async () => {
    const store = createFileStore(directory);

    expect(await store.load('never-written')).toBeUndefined();
  });

  it('round-trips a real checkpoint through disk and restores world state', async () => {
    const store = createFileStore(directory);
    const { world, entityId } = makeWorld('jeweled egg');

    await store.save('before-thief', serializeCheckpoint(world, 'before-thief'));
    const laterEntity = world.createEntity('canary', 'object');

    const loaded = await store.load('before-thief');
    deserializeCheckpoint(loaded!, world);

    expect(fs.existsSync(path.join(directory, 'before-thief.json'))).toBe(true);
    expect(world.getEntity(entityId)).toBeDefined();
    expect(world.getEntity(laterEntity.id)).toBeUndefined();
  });
});

describe('TestingExtension.restoreCheckpoint', () => {
  let directory: string;

  /** Memory-store extension: an explicit undefined directory opts out of the file store. */
  const makeExtension = () => new TestingExtension({ checkpoints: { directory: undefined } });

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sharpee-checkpoint-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('restores world state and reports true', async () => {
    const extension = makeExtension();
    const { world, entityId } = makeWorld('brass lantern');
    await extension.saveCheckpoint('before-troll', world);
    const laterEntity = world.createEntity('sword', 'object');

    const restored = await extension.restoreCheckpoint('before-troll', world);

    expect(restored).toBe(true);
    expect(world.getEntity(entityId)).toBeDefined();
    expect(world.getEntity(laterEntity.id)).toBeUndefined();
  });

  it('reports false — not an error — when no checkpoint is stored', async () => {
    const extension = makeExtension();
    const { world, entityId } = makeWorld('lantern');

    await expect(extension.restoreCheckpoint('never-saved', world)).resolves.toBe(false);
    expect(world.getEntity(entityId)).toBeDefined();
  });

  it('rejects an unreadable version rather than reporting a miss', async () => {
    // Real path end to end: a future-format checkpoint file on disk, read through the
    // extension's own file store.
    fs.writeFileSync(
      path.join(directory, 'future.json'),
      JSON.stringify(checkpointAtVersion('2.0.0')),
      'utf-8'
    );
    const extension = new TestingExtension({ checkpoints: { directory } });
    const { world, entityId } = makeWorld('lantern');

    await expect(extension.restoreCheckpoint('future', world)).rejects.toThrow(
      /Unsupported checkpoint version: "2\.0\.0"/
    );
    expect(world.getEntity(entityId)).toBeDefined();
  });
});
