/**
 * REAL-PATH — the shared breadth-first walk (`walk/story-walk.ts`, ADR-408 D3)
 * through the real engine on the test story `test-stories/lodge`.
 *
 * Pins the walk's own invariants, apart from any client: each room's hook
 * fires once; a hook that changes the world changes nothing the walk counts;
 * a client's stop ends the walk with the client's reason; a budget that is
 * not positive is refused before anything runs.
 *
 * Owner context: @sharpee/branch-tester — the shared walk.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { walkStory } from '../src/walk/story-walk.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const testStories = process.env.SHARPEE_TEST_STORIES;
const LODGE = testStories ? resolve(testStories, 'lodge/lodge.story') : undefined;
const BUDGETS = { maxStates: 200, maxSeconds: 60, maxDepth: 12 };

function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

async function boot(ir: StoryIR): Promise<ClaimsGame> {
  const story = createStory(ir, { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(ir, { seed: SEED }) });
}

const describeWithLodge = LODGE && existsSync(LODGE) ? describe : describe.skip;

describeWithLodge('REAL-PATH — the shared walk on the lodge, with no necessary set', () => {
  it('fires each room\'s hook exactly once, the start included, and reaches the rooms it sighted', async () => {
    const ir = compileStory(LODGE!);
    const sightings: string[] = [];
    const report = await walkStory(await boot(ir), ir, null, {
      label: 'test walk',
      onRoomFirstSeen: async ({ room }) => { sightings.push(room.name); },
    }, BUDGETS);
    expect(sightings.length).toBe(new Set(sightings).size);
    expect(sightings.length).toBe(report.roomsReached.length);
    expect(sightings.length).toBeGreaterThan(1);
  }, 60_000);

  it('a hook that moves the player and takes things changes nothing the walk counts', async () => {
    const ir = compileStory(LODGE!);
    const quiet = await walkStory(await boot(ir), ir, null, { label: 'test walk' }, BUDGETS);
    const game = await boot(ir);
    let hookTurns = 0;
    // The client's stop check runs right after each sighting's restore, so it
    // reads the world the walk continues from: the player must be back in the
    // room just sighted, carrying what they carried there.
    let sighted: { roomId: string; carried: string } | undefined;
    const misplaced: string[] = [];
    let checked = 0;
    const carriedNow = () => game.world.getContents(game.world.playerCharacter.id).map((entity) => entity.id).sort().join(',');
    const noisy = await walkStory(game, ir, null, {
      label: 'test walk',
      onRoomFirstSeen: async ({ room }) => {
        sighted = { roomId: room.id, carried: carriedNow() };
        for (const command of ['take all', 'north', 'south', 'east', 'west']) {
          await game.engine.executeTurn(command);
          hookTurns++;
        }
      },
      stopWhen: {
        reason: 'all-rooms-reached',
        done: () => {
          if (sighted) {
            checked++;
            const here = game.world.getContainingRoom(game.world.playerCharacter.id)?.id;
            if (here !== sighted.roomId || carriedNow() !== sighted.carried) misplaced.push(`${sighted.roomId} -> ${here}`);
            sighted = undefined;
          }
          return false;
        },
      },
    }, BUDGETS);
    expect(hookTurns).toBeGreaterThan(0);
    expect(misplaced).toEqual([]);
    expect(checked).toBeGreaterThan(1);
    expect(noisy.statesDiscovered).toBe(quiet.statesDiscovered);
    expect(noisy.commandsExecuted).toBe(quiet.commandsExecuted);
    expect(noisy.roomsReached).toEqual(quiet.roomsReached);
    expect(noisy.stopReason).toBe(quiet.stopReason);
  }, 60_000);

  it('a room hook\'s own error propagates unchanged, the same instance', async () => {
    const ir = compileStory(LODGE!);
    const sentinel = new Error('the hook refused');
    await expect(walkStory(await boot(ir), ir, null, {
      label: 'test walk',
      onRoomFirstSeen: async () => { throw sentinel; },
    }, BUDGETS)).rejects.toBe(sentinel);
  }, 60_000);

  it('a client\'s stop ends the walk with the client\'s reason as soon as it holds', async () => {
    const ir = compileStory(LODGE!);
    const report = await walkStory(await boot(ir), ir, null, {
      label: 'test walk',
      stopWhen: { reason: 'all-rooms-reached', done: (reached) => reached.size >= 2 },
    }, BUDGETS);
    expect(report.stopReason).toBe('all-rooms-reached');
    expect(report.roomsReached.length).toBe(2);
  }, 60_000);

  it('no states, no seconds, or a negative depth is refused before the walk runs a command', async () => {
    const ir = compileStory(LODGE!);
    for (const [budget, shown] of [
      [{ maxStates: 0 }, 'maxStates 0, maxSeconds 120, maxDepth 40'],
      [{ maxSeconds: 0 }, 'maxStates 5000, maxSeconds 0, maxDepth 40'],
      [{ maxDepth: -1 }, 'maxStates 5000, maxSeconds 120, maxDepth -1'],
    ] as const) {
      const refused = await boot(ir);
      await expect(walkStory(refused, ir, null, { label: 'test walk' }, budget)).rejects.toThrow(`story walk: maxStates and maxSeconds must be positive and maxDepth not negative (${shown})`);
      expect(refused.openingPending).toBe(true);
    }
  }, 60_000);

  it('a depth of 0 reads the start state and tries nothing from it', async () => {
    const ir = compileStory(LODGE!);
    const report = await walkStory(await boot(ir), ir, null, { label: 'test walk' }, { maxDepth: 0 });
    expect(report.commandsExecuted).toBe(0);
    expect(report.statesDiscovered).toBe(1);
    expect(report.stopReason).toBe('max-depth-reached');
  }, 60_000);

  it('a refused budget leaves the game unopened', async () => {
    const ir = compileStory(LODGE!);
    const game = await boot(ir);
    expect(game.openingPending).toBe(true);
    await expect(walkStory(game, ir, null, { label: 'test walk' }, { maxStates: 0 })).rejects.toThrow('story walk: maxStates and maxSeconds must be positive');
    // The opening is the walk's first act on the game; refused first, it never ran.
    expect(game.openingPending).toBe(true);
  }, 60_000);
});
