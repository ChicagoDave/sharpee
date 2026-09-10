/**
 * GameEngine.resume() — the post-mortem revival seam.
 *
 * After stop('defeat') (player death), a harness that restored a live-player
 * world snapshot (transcript-tester RETRY via world.loadJSON) needs turn
 * execution back without any world teardown. resume() flips
 * `running` back on and nothing else.
 */

import { describe, it, expect } from 'vitest';
import { setupTestEngine, setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

describe('GameEngine.resume', () => {
  it('restores turn execution after a defeat stop, without touching the world', async () => {
    const { engine, world } = setupTestEngineWithStory();
    engine.start();

    await engine.executeTurn('look'); // sanity: runs while started

    const roomId = world.getLocation(world.getPlayer()!.id);
    engine.stop('defeat', { reason: 'You have died.' });

    await expect(engine.executeTurn('look')).rejects.toThrow('Engine is not running');

    engine.resume();

    const result = await engine.executeTurn('look');
    expect(result).toBeDefined();
    // World untouched by stop/resume: player still where they were.
    expect(world.getLocation(world.getPlayer()!.id)).toBe(roomId);
  });

  it('is a no-op while running', async () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();

    engine.resume(); // must not throw or disturb the session

    const result = await engine.executeTurn('look');
    expect(result).toBeDefined();
  });

  it('throws if the engine was never started', () => {
    // No installStory/start: the command executor is never wired.
    const { engine } = setupTestEngine();

    expect(() => engine.resume()).toThrow('Engine must have been started before it can resume');
  });
});
