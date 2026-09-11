/**
 * GameEngine.resume() — the post-mortem revival seam.
 *
 * After stop('defeat') (player death), a harness that restored a live-player
 * world snapshot (transcript-tester RETRY via world.loadJSON) needs turn
 * execution back without any world teardown. resume() flips
 * `running` back on and nothing else.
 */

import { describe, it, expect } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { setupTestEngine, setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

describe('GameEngine.resume', () => {
  it('restores turn execution after a defeat stop, without touching the world', async () => {
    const { engine, world } = setupTestEngineWithStory();
    engine.start();

    await engine.executeTurn('look'); // sanity: runs while started

    const roomId = world.getLocation(world.getPlayer()!.id);
    engine.stop('defeat', { reason: 'You have died.' });

    await expect(engine.executeTurn('look')).rejects.toThrow(/'stopped' phase/);

    engine.resume();

    const result = await engine.executeTurn('look');
    expect(result).toBeDefined();
    // World untouched by stop/resume: player still where they were.
    expect(world.getLocation(world.getPlayer()!.id)).toBe(roomId);
  });

  // ── ADR-345 AC-9: resume() stayed tolerant of 'playing' ────────────────
  //
  // The mirror of AC-4, and it exists for the same reason: D2 ("each method
  // names the phases it accepts") reads as a licence to make every lifecycle
  // method strict, and two of them must not be. D8 carved out stop(); D8a
  // carved out resume() after the same survey was run properly.
  //
  // The dependency is real, not hypothetical: branch-tester's tree walker
  // (`tree-walker.ts:360`) calls reviveEngine() — this method, via bootstrap
  // — on EVERY test line, under the comment "Harmless when the engine is
  // running", because a line's prefix may or may not have ended the game. A
  // strict resume() throws on every non-death line of every tree.
  //
  // If you are here because you made resume() strict and this failed: that
  // is a challenge to ADR-345 D7 (no consumer outside the engine reads the
  // phase), not an implementation detail. Raise it as an amendment.
  it('is a no-op while playing, and leaves the session undisturbed', async () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();

    const emitted: string[] = [];
    engine.on('event', (event) => emitted.push(event.type));

    engine.resume(); // must not throw or disturb the session

    expect(emitted).toEqual([]); // no-op means no event, not just no throw
    expect(engine['phase'].name).toBe('playing');

    const result = await engine.executeTurn('look');
    expect(result).toBeDefined();
  });

  // ── ADR-345 AC-5: resume() emits exactly one game.resumed ──────────────
  //
  // D12: every sibling transition emits and this one did not, so a session
  // reconstructed from the event stream showed a game that ended and then
  // kept taking turns. The full arc is driven here (start → stop → resume)
  // rather than resume() alone, because "exactly one" is a claim about the
  // whole stream, not about one call.
  it('emits exactly one game.resumed when a stopped engine returns to play', async () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();

    const emitted: string[] = [];
    engine.on('event', (event) => emitted.push(event.type));

    engine.stop('defeat', { reason: 'You have died.' });
    const beforeResume = emitted.filter((type) => type === 'game.resumed');
    expect(beforeResume).toHaveLength(0); // stopping is not resuming

    engine.resume();

    expect(emitted.filter((type) => type === 'game.resumed')).toHaveLength(1);
    // Past tense, and no `-ing` partner: resume is atomic, so unlike
    // start/stop there is nothing that could fail between guard and flip
    // (rule 10; ADR-345 D12 follows the PC_SWITCHED precedent).
    expect(emitted).not.toContain('game.resuming');
  });

  it('emits a game.resumed that renders nothing — no message, text or messageId', () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();

    const events: ISemanticEvent[] = [];
    engine.on('event', (event) => events.push(event));

    engine.stop('defeat', { reason: 'You have died.' });
    engine.resume();

    const resumed = events.filter((event) => event.type === 'game.resumed');
    expect(resumed).toHaveLength(1);
    const data = resumed[0].data as Record<string, unknown>;
    expect(data.gameState).toBe('running');
    // D14: these three fields are the prose pipeline's three render paths for
    // an unrecognized `game.*` event. Any of them present and the event starts
    // producing blocks, which shifts pinned transcript goldens.
    expect(data.message).toBeUndefined();
    expect(data.text).toBeUndefined();
    expect(data.messageId).toBeUndefined();
  });

  it('refuses on an empty engine, naming the phase it found', () => {
    // No installStory/start. This is the case the old guard could not ask
    // about honestly: it read `this.channelService`, a collaborator that
    // happens to be created during start(), because `running === false` was
    // equally true of a stopped engine. That proxy is what ADR-345 D1 rests on.
    const { engine } = setupTestEngine();

    expect(() => engine.resume()).toThrow(/'empty' phase/);
    expect(() => engine.resume()).toThrow(/must have been started/);
  });

  it('refuses on a ready engine, naming the phase it found', () => {
    // The half of the old ambiguity that had no way to be expressed: a story
    // is installed but start() never ran, which `running === false` reported
    // identically to "started, then stopped".
    const { engine } = setupTestEngineWithStory();

    expect(() => engine.resume()).toThrow(/'ready' phase/);
    expect(engine['phase'].name).toBe('ready'); // refusal did not transition
  });
});
