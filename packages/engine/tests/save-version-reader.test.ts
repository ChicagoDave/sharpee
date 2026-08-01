/**
 * Save-format version reader tests (ADR-293 D7, A1 ruling 4 — Phase A/2).
 *
 * Derived from the Behavior Statement for the changed
 * `createSaveData`/`loadSaveData`: a 3.0.0 save carries and restores the
 * unified `{ pointName → streamState }` map; a 2.0.0-shaped save (the pre-ADR
 * format: `actionRngSeed`, no map) is READ — its seed maps onto the legacy
 * action point and everything else reseeds from the master seed; other
 * versions are still rejected.
 *
 * The provider here is hand-built around a REAL WorldModel and REAL
 * SaveRestoreService — GameEngine deliberately does not wire the
 * RandomService yet in this phase.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel, EntityType } from '@sharpee/world-model';
import {
  ISaveData,
  createSemanticEventSource,
  createSeededRandom,
  definePoint,
  deriveStreamSeed
} from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import {
  SaveRestoreService,
  ISaveRestoreStateProvider
} from '../src/save-restore-service';
import {
  ACTION_STREAM_POINT_NAME,
  EngineRandomService
} from '../src/engine-random-service';
import { GameContext } from '../src/types';

const MASTER_SEED = 20260801;

/** Build a provider around a real world + real service instances. */
function buildProvider(randomService?: EngineRandomService): ISaveRestoreStateProvider {
  const world = new WorldModel();
  const player = world.createEntity('You', EntityType.ACTOR);
  const context: GameContext = {
    currentTurn: 2,
    player,
    history: [],
    metadata: { started: new Date(0), lastPlayed: new Date(0) }
  };
  const actionRandom = createSeededRandom(1111);
  return {
    getWorld: () => world,
    getContext: () => context,
    getStory: () => undefined,
    getEventSource: () => createSemanticEventSource(),
    getPluginRegistry: () => new PluginRegistry(),
    getParser: () => undefined,
    getActionRandom: () => actionRandom,
    ...(randomService ? { getRandomService: () => randomService } : {})
  };
}

describe('save format 3.0.0 (unified stream map)', () => {
  it('writes version 3.0.0 with the streamStates of every drawn point', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-save-reader.write');
    randomService.int(point, 0, 1000000);

    const saved = service.createSaveData(buildProvider(randomService));

    expect(saved.version).toBe('3.0.0');
    expect(saved.engineState.streamStates).toEqual(
      randomService.serializeStreamStates()
    );
    expect(
      Object.keys(saved.engineState.streamStates!)
    ).toContain('test-save-reader.write');
  });

  it('omits streamStates when the host wires no RandomService', () => {
    const service = new SaveRestoreService();

    const saved = service.createSaveData(buildProvider());

    expect(saved.version).toBe('3.0.0');
    expect(saved.engineState.streamStates).toBeUndefined();
  });

  it('round-trips: restored points continue exactly as an unbroken run', () => {
    const pointA = definePoint('test-save-reader.roundtrip-a');
    const pointB = definePoint('test-save-reader.roundtrip-b');
    const service = new SaveRestoreService();

    // Unbroken reference run.
    const unbroken = new EngineRandomService(MASTER_SEED);
    const expected = [
      unbroken.int(pointA, 0, 1000000),
      unbroken.int(pointB, 0, 1000000),
      unbroken.int(pointA, 0, 1000000),
      unbroken.int(pointB, 0, 1000000)
    ];

    // Draw, save through the real service, restore into a fresh service.
    const sourceRandom = new EngineRandomService(MASTER_SEED);
    const firstHalf = [
      sourceRandom.int(pointA, 0, 1000000),
      sourceRandom.int(pointB, 0, 1000000)
    ];
    const saved = service.createSaveData(buildProvider(sourceRandom));

    const targetRandom = new EngineRandomService(MASTER_SEED);
    service.loadSaveData(saved, buildProvider(targetRandom));
    const secondHalf = [
      targetRandom.int(pointA, 0, 1000000),
      targetRandom.int(pointB, 0, 1000000)
    ];

    expect([...firstHalf, ...secondHalf]).toEqual(expected);
  });
});

describe('version reader: 2.0.0 saves are read, not refused (AC-5 groundwork)', () => {
  /** A genuine 2.0.0-shaped save: what the pre-ADR writer produced. */
  function buildLegacySave(actionRngSeed: number): ISaveData {
    const service = new SaveRestoreService();
    const saved = service.createSaveData(buildProvider());
    delete saved.engineState.streamStates; // absent in 2.0.0 (already absent with no service — explicit for clarity)
    saved.engineState.actionRngSeed = actionRngSeed;
    return { ...saved, version: '2.0.0' };
  }

  it('restores without error and re-applies actionRngSeed to the action stream', () => {
    const service = new SaveRestoreService();
    const provider = buildProvider();
    const legacy = buildLegacySave(555777);

    const result = service.loadSaveData(legacy, provider);

    expect(result.currentTurn).toBe(legacy.metadata.turnCount + 1);
    expect(provider.getActionRandom().getSeed()).toBe(555777);
  });

  it('maps actionRngSeed onto the legacy action point in the RandomService', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const actionPoint = definePoint(ACTION_STREAM_POINT_NAME);

    service.loadSaveData(buildLegacySave(555777), buildProvider(randomService));

    // The mapped point continues exactly where the 2.0.0 action stream stopped.
    expect(randomService.int(actionPoint, 0, 1000000)).toBe(
      createSeededRandom(555777).int(0, 1000000)
    );
  });

  it('reseeds every other point from the master seed, never the clock', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const other = definePoint('test-save-reader.legacy-other');

    service.loadSaveData(buildLegacySave(555777), buildProvider(randomService));

    expect(randomService.int(other, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, 'test-save-reader.legacy-other')
      ).int(0, 1000000)
    );
  });

  it('reads a 2.0.0 save with no actionRngSeed at all: every point reseeds from the master seed', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const actionPoint = definePoint(ACTION_STREAM_POINT_NAME);
    const legacy = buildLegacySave(1);
    delete legacy.engineState.actionRngSeed;

    service.loadSaveData(legacy, buildProvider(randomService));

    // Nothing to map — even the legacy action point derives fresh.
    expect(randomService.serializeStreamStates()).toEqual({});
    expect(randomService.int(actionPoint, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, ACTION_STREAM_POINT_NAME)
      ).int(0, 1000000)
    );
  });

  it('reseeds the action stream by derivation, never the clock, when the seed is absent and a RandomService is wired (D7)', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const provider = buildProvider(randomService);
    const legacy = buildLegacySave(1);
    delete legacy.engineState.actionRngSeed;

    service.loadSaveData(legacy, provider);

    expect(provider.getActionRandom().getSeed()).toBe(
      deriveStreamSeed(MASTER_SEED, ACTION_STREAM_POINT_NAME)
    );
  });

  it('reads a 3.0.0 save that omits streamStates: the service resets to empty', () => {
    const service = new SaveRestoreService();
    const randomService = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-save-reader.map-omitted');
    randomService.int(point, 0, 1000000); // advance pre-restore state that must be discarded
    const saved = service.createSaveData(buildProvider()); // 3.0.0, no map (host had no service)

    service.loadSaveData(saved, buildProvider(randomService));

    expect(randomService.serializeStreamStates()).toEqual({});
    expect(randomService.int(point, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, 'test-save-reader.map-omitted')
      ).int(0, 1000000)
    );
  });

  it('still rejects versions older than 2.0.0', () => {
    const service = new SaveRestoreService();
    const legacy = { ...buildLegacySave(1), version: '1.0.0' };

    expect(() => service.loadSaveData(legacy, buildProvider())).toThrow(
      'Unsupported save version: 1.0.0'
    );
  });
});
