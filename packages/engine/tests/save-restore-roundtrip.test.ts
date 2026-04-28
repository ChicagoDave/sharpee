/**
 * Save/restore round-trip tests for `SaveRestoreService`.
 *
 * Behavior Statement — `createSaveData` + `loadSaveData` round-trip
 *   DOES: captures the world's full runtime state in a save blob and
 *         restores it exactly so post-restore queries return the same
 *         answers as pre-save queries. Specifically:
 *           1. Persists ScoreLedger totals (`getScore` / `getMaxScore`).
 *           2. Persists ScoreLedger entries (`hasScore`, `getScoreEntries`,
 *              and the dedup invariant — re-awarding the same id after
 *              restore is rejected).
 *           3. Persists every registered capability and its data.
 *           4. Persists every world state value (`getStateValue`).
 *           5. Persists every relationship (`areRelated`, `getRelated`).
 *           6. Persists entity traits + spatial containment graph
 *              (regression coverage — already worked under id-stable
 *              fresh-engine fixtures).
 *           7. Persists ID generation counters so post-restore
 *              `createEntity` calls don't collide with restored IDs.
 *           8. Persists engine-side context (`currentTurn`, `history`,
 *              parser state, plugin states) — regression coverage.
 *   WHEN: a host calls `createSaveData(provider)` on a populated world,
 *         then later constructs a fresh provider with a fresh
 *         `WorldModel` and calls `loadSaveData(saveData, freshProvider)`.
 *   BECAUSE: every Sharpee host (CLI, platform-browser, multi-user
 *            sandbox) routes saves through this service. Anything the
 *            service drops is silently lost across save/restore for
 *            every player on every story.
 *   REJECTS WHEN:
 *     - `saveData.version` doesn't match the engine's current version →
 *       throws `Unsupported save version: X`. World, score, and engine
 *       context unchanged.
 *     - `saveData.storyConfig.id` doesn't match the loaded story →
 *       throws `Save is for different story: X`. No partial application.
 *
 * Status on commit: clauses 1, 2, 3, 4, 5, 7 are RED today (the engine
 * save format doesn't capture them). Clauses 6 and 8 are GREEN keepers
 * (regression coverage that should stay green through the format
 * change). The two REJECTS WHEN paths exist on `loadSaveData` and stay
 * GREEN (with the version literal updated when the format bumps).
 */

import { describe, expect, it } from 'vitest';
import { ISaveData } from '@sharpee/core';
import { EngineConfig } from '../src/types';
import { setupTestEngine } from './test-helpers/setup-test-engine';
import { MinimalTestStory } from './stories/minimal-test-story';

/** Type alias for accessing private GameEngine save/restore methods. */
type EnginePrivate = {
  createSaveData(): ISaveData;
  loadSaveData(data: ISaveData): void;
  config: EngineConfig;
};

/**
 * Boot a fresh engine + MinimalTestStory. The engine is NOT started —
 * tests that mutate world state directly do not need it; tests that
 * need `executeTurn` call `engine.start()` themselves.
 */
function bootFresh() {
  const setup = setupTestEngine();
  const story = new MinimalTestStory();
  setup.engine.setStory(story);
  return { ...setup, story };
}

/**
 * Round-trip helper: mutate the source world via `mutate`, save, boot a
 * fresh engine, restore, and return the post-restore engine + world for
 * assertion. The source engine is stopped before return.
 */
function roundTrip(mutate: (ctx: ReturnType<typeof bootFresh>) => void) {
  const source = bootFresh();
  mutate(source);
  const saved = (source.engine as unknown as EnginePrivate).createSaveData();
  source.engine.stop();

  const target = bootFresh();
  (target.engine as unknown as EnginePrivate).loadSaveData(saved);
  return { saved, target };
}

describe('SaveRestoreService round-trip', () => {
  describe('DOES — preserves world state', () => {
    it('preserves ScoreLedger totals across a save/restore cycle', () => {
      const { target } = roundTrip(({ world }) => {
        world.setMaxScore(100);
        world.awardScore('test-award', 25, 'test fixture');
      });
      const restored = target.engine.getWorld();
      expect(restored.getScore()).toBe(25);
      expect(restored.getMaxScore()).toBe(100);
      target.engine.stop();
    });

    it('preserves ScoreLedger entries (revocability + dedup invariant)', () => {
      const { target } = roundTrip(({ world }) => {
        world.awardScore('treasure-1', 10, 'gold coin');
        world.awardScore('treasure-2', 15, 'silver chalice');
      });
      const restored = target.engine.getWorld();

      expect(restored.hasScore('treasure-1')).toBe(true);
      expect(restored.hasScore('treasure-2')).toBe(true);
      expect(restored.getScoreEntries()).toHaveLength(2);

      // Dedup invariant: re-awarding the same id after restore returns
      // false (no double-credit) and leaves the ledger unchanged.
      expect(restored.awardScore('treasure-1', 10, 'gold coin')).toBe(false);
      expect(restored.getScoreEntries()).toHaveLength(2);

      target.engine.stop();
    });

    it('preserves capability data across a save/restore cycle', () => {
      const { target } = roundTrip(({ world }) => {
        world.registerCapability('test-cap', {
          schema: {
            counter: { type: 'number', default: 0 },
            label: { type: 'string', default: '' },
          },
          initialData: { counter: 0, label: '' },
        });
        world.updateCapability('test-cap', { counter: 7, label: 'lit' });
      });
      const restored = target.engine.getWorld();
      const cap = restored.getCapability('test-cap');
      expect(cap).toBeDefined();
      expect(cap!.counter).toBe(7);
      expect(cap!.label).toBe('lit');
      target.engine.stop();
    });

    it('preserves world state values across a save/restore cycle', () => {
      const { target } = roundTrip(({ world }) => {
        world.setStateValue('game.over', true);
        world.setStateValue('game.over.reason', 'died in cellar');
        world.setStateValue('cure.ticks', 5);
      });
      const restored = target.engine.getWorld();
      expect(restored.getStateValue('game.over')).toBe(true);
      expect(restored.getStateValue('game.over.reason')).toBe('died in cellar');
      expect(restored.getStateValue('cure.ticks')).toBe(5);
      target.engine.stop();
    });

    it('preserves relationships across a save/restore cycle', () => {
      const { target } = roundTrip(({ world }) => {
        // MinimalTestStory creates a player, two rooms, a lamp, a box.
        // We need two stable entity ids to relate.
        const lamp = world.findByType('object').find((e) => e.name === 'lamp');
        const box = world.findByType('object').find((e) => e.name === 'box');
        if (!lamp || !box) throw new Error('test fixture: lamp + box must exist');
        world.addRelationship(lamp.id, box.id, 'next-to');
      });
      const restored = target.engine.getWorld();
      const lamp = restored.findByType('object').find((e) => e.name === 'lamp');
      const box = restored.findByType('object').find((e) => e.name === 'box');
      expect(lamp).toBeDefined();
      expect(box).toBeDefined();
      expect(restored.areRelated(lamp!.id, box!.id, 'next-to')).toBe(true);
      target.engine.stop();
    });

    it('preserves entity traits and the spatial containment graph (regression keeper)', () => {
      const { target } = roundTrip(({ world }) => {
        // Open the box, drop the lamp inside, move the player north.
        const lamp = world.findByType('object').find((e) => e.name === 'lamp');
        const box = world.findByType('object').find((e) => e.name === 'box');
        const northRoom = world.findByType('room').find((r) => r.name === 'North Room');
        const player = world.getPlayer();
        if (!lamp || !box || !northRoom || !player) {
          throw new Error('test fixture incomplete');
        }
        // Open the box (mutates OpenableTrait.isOpen).
        const openable = box.get('openable') as { isOpen?: boolean } | undefined;
        if (openable) openable.isOpen = true;
        // Move lamp into the (now open) box.
        world.moveEntity(lamp.id, box.id);
        // Move player to the north room.
        world.moveEntity(player.id, northRoom.id);
      });
      const restored = target.engine.getWorld();

      const lamp = restored.findByType('object').find((e) => e.name === 'lamp');
      const box = restored.findByType('object').find((e) => e.name === 'box');
      const northRoom = restored
        .findByType('room')
        .find((r) => r.name === 'North Room');
      const player = restored.getPlayer();
      expect(lamp && box && northRoom && player).toBeTruthy();

      // Trait state preserved.
      const restoredOpenable = box!.get('openable') as { isOpen?: boolean } | undefined;
      expect(restoredOpenable?.isOpen).toBe(true);

      // Containment preserved.
      expect(restored.getLocation(lamp!.id)).toBe(box!.id);
      expect(restored.getLocation(player!.id)).toBe(northRoom!.id);

      target.engine.stop();
    });

    it('preserves ID generation counters so post-restore creates do not collide', () => {
      const { target } = roundTrip(({ world }) => {
        // Force the actor counter forward by creating NPCs the fresh
        // engine doesn't know about (MinimalTestStory only seeds the
        // player + lamp/box/rooms). Each gets a fresh actor id.
        world.createEntity('Bob', 'actor');
        world.createEntity('Alice', 'actor');
        world.createEntity('Eve', 'actor');
        world.createEntity('Sword', 'object');
        world.createEntity('Shield', 'object');
      });
      const restored = target.engine.getWorld();

      // Step 1 — entities must round-trip. If they don't, the test below
      // would pass vacuously (nothing to collide with). This guard
      // ensures the ID-counter assertion is meaningful.
      const restoredNames = new Set(
        restored.getAllEntities().map((e) => e.name),
      );
      expect(restoredNames.has('Bob')).toBe(true);
      expect(restoredNames.has('Alice')).toBe(true);
      expect(restoredNames.has('Eve')).toBe(true);
      expect(restoredNames.has('Sword')).toBe(true);
      expect(restoredNames.has('Shield')).toBe(true);

      // Step 2 — post-restore `createEntity` must produce an id distinct
      // from every existing entity id. If counters were lost on
      // restore, the new id would collide with one of the restored
      // entities (e.g., a03 = Bob).
      const existingIds = new Set(restored.getAllEntities().map((e) => e.id));
      const freshActor = restored.createEntity('Newcomer', 'actor');
      expect(existingIds.has(freshActor.id)).toBe(false);

      const freshObject = restored.createEntity('Pickaxe', 'object');
      expect(existingIds.has(freshObject.id)).toBe(false);

      target.engine.stop();
    });

    it('preserves engine context — currentTurn and history (regression keeper)', async () => {
      const source = bootFresh();
      source.engine.start();
      await source.engine.executeTurn('look');
      await source.engine.executeTurn('inventory');
      const saved = (source.engine as unknown as EnginePrivate).createSaveData();
      const sourceTurn = source.engine.getContext().currentTurn;
      source.engine.stop();

      const target = bootFresh();
      (target.engine as unknown as EnginePrivate).loadSaveData(saved);
      target.engine.start();

      const ctx = target.engine.getContext();
      expect(ctx.currentTurn).toBe(saved.metadata.turnCount + 1);
      expect(ctx.currentTurn).toBe(sourceTurn);
      expect(ctx.history).toHaveLength(2);
      target.engine.stop();
    });
  });

  describe('REJECTS WHEN — invalid save inputs', () => {
    it('rejects a save blob with an unsupported version string', () => {
      const fresh = bootFresh();
      const incompatible: ISaveData = {
        version: '99.0.0', // not the engine's current version
        timestamp: Date.now(),
        metadata: {
          storyId: 'minimal-test',
          storyVersion: '1.0.0',
          turnCount: 0,
          playTime: 0,
          description: 'test',
        },
        engineState: {
          eventSource: [],
          spatialIndex: { entities: {}, locations: {}, relationships: {} },
          turnHistory: [],
          pluginStates: {},
        },
        storyConfig: {
          id: 'minimal-test',
          version: '1.0.0',
          title: 'Minimal Test Story',
          author: 'Test Suite',
        },
      };
      expect(() =>
        (fresh.engine as unknown as EnginePrivate).loadSaveData(incompatible),
      ).toThrow(/Unsupported save version/);
      fresh.engine.stop();
    });

    it('rejects a save blob whose storyConfig.id does not match the loaded story', () => {
      // Build a save under the real story, then mutate the storyConfig
      // id and assert the loader rejects it.
      const source = bootFresh();
      const saved = (source.engine as unknown as EnginePrivate).createSaveData();
      source.engine.stop();
      const tampered: ISaveData = {
        ...saved,
        storyConfig: { ...saved.storyConfig!, id: 'a-different-story' },
      };
      const target = bootFresh();
      expect(() =>
        (target.engine as unknown as EnginePrivate).loadSaveData(tampered),
      ).toThrow(/Save is for different story/);
      target.engine.stop();
    });
  });
});
