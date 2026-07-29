/**
 * on-world-restored.test.ts — ADR-289 D2: the post-restore story hook.
 *
 * Behavior Statement — `SaveRestoreService.loadSaveData` → `Story.onWorldRestored`
 *   DOES: calls the loaded story's optional `onWorldRestored(world)` exactly
 *         once, as the LAST act of a successful restore — after the world
 *         snapshot, plugin states, the action-RNG reseed, and undo-snapshot
 *         clearing — handing it the fully restored world.
 *   WHEN: a host restores a save through the real service and the story
 *         implements the hook.
 *   BECAUSE: the engine is the only layer that knows a restore happened; a
 *            story is the only layer that knows what its own persisted keys
 *            mean. Firing mid-sequence would hand the story a half-restored
 *            engine — the same defect class ADR-289 closes.
 *   REJECTS WHEN:
 *     - the story does not implement the hook → restore completes normally
 *       (optional hook, no throw).
 *     - the restore throws before completing (bad version / wrong story) →
 *       the hook is NOT called, because there is no restored world to hand over.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/engine`.
 */
import { describe, expect, it } from 'vitest';
import { ISaveData } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { EngineConfig } from '../src/types';
import { setupTestEngine } from './test-helpers/setup-test-engine';
import { MinimalTestStory } from './stories/minimal-test-story';

type EnginePrivate = {
  createSaveData(): ISaveData;
  loadSaveData(data: ISaveData): void;
  config: EngineConfig;
};

/** A story that records what it observed when the hook fired. */
class RestoreObservingStory extends MinimalTestStory {
  calls = 0;
  /** Undo depth at hook time — proves ordering against clearUndoSnapshots. */
  undoLevelsAtHook: number | null = null;
  /** A world state value at hook time — proves the snapshot already landed. */
  markerAtHook: unknown = undefined;
  engineRef: { getUndoLevels?(): number } | null = null;

  onWorldRestored(world: WorldModel): void {
    this.calls += 1;
    this.markerAtHook = world.getStateValue('test.marker');
    this.undoLevelsAtHook = this.engineRef?.getUndoLevels?.() ?? null;
  }
}

function boot(story: MinimalTestStory) {
  const setup = setupTestEngine();
  setup.engine.setStory(story);
  return { ...setup, story };
}

describe('ADR-289 D2 — Story.onWorldRestored', () => {
  it('fires once on restore, with the world snapshot already applied', () => {
    const source = boot(new MinimalTestStory());
    source.world.setStateValue('test.marker', 'saved-value');
    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    source.engine.stop();

    const story = new RestoreObservingStory();
    const target = boot(story);
    (target.engine as unknown as EnginePrivate).loadSaveData(saved);

    expect(story.calls).toBe(1);
    // The hook ran after loadJSON, not before: it can see restored state.
    expect(story.markerAtHook).toBe('saved-value');
    target.engine.stop();
  });

  it('fires AFTER undo snapshots are cleared — the ordering contract', () => {
    const source = boot(new MinimalTestStory());
    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    source.engine.stop();

    const story = new RestoreObservingStory();
    const target = boot(story);
    story.engineRef = target.engine as unknown as { getUndoLevels?(): number };

    // Seed undo depth so "cleared" is distinguishable from "never had any".
    const svc = (target.engine as unknown as { saveRestoreService?: { createUndoSnapshot(w: WorldModel, t: number): void } })
      .saveRestoreService;
    svc?.createUndoSnapshot(target.world, 1);
    svc?.createUndoSnapshot(target.world, 2);

    (target.engine as unknown as EnginePrivate).loadSaveData(saved);

    // If the hook fired before clearUndoSnapshots(), this would be 2.
    expect(story.undoLevelsAtHook).toBe(0);
    target.engine.stop();
  });

  it('a story without the hook restores normally', () => {
    const source = boot(new MinimalTestStory());
    source.world.setStateValue('test.marker', 'saved-value');
    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    source.engine.stop();

    const target = boot(new MinimalTestStory());
    expect(() => (target.engine as unknown as EnginePrivate).loadSaveData(saved)).not.toThrow();
    expect(target.engine.getWorld().getStateValue('test.marker')).toBe('saved-value');
    target.engine.stop();
  });

  it('is NOT called when the restore is refused', () => {
    const source = boot(new MinimalTestStory());
    const saved = (source.engine as unknown as EnginePrivate).createSaveData();
    source.engine.stop();

    const story = new RestoreObservingStory();
    const target = boot(story);
    const bad = { ...saved, version: '0.0.1-not-a-real-version' } as ISaveData;

    expect(() => (target.engine as unknown as EnginePrivate).loadSaveData(bad)).toThrow();
    // No restored world exists, so there is nothing to hand over.
    expect(story.calls).toBe(0);
    target.engine.stop();
  });
});
