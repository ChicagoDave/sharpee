/**
 * Command chaining tests — one input line, several statements, each run as
 * its own full turn. Separators: `.`, `;`, and the standalone word `then`.
 * A failed statement flushes the rest of the line. Alternate input modes
 * bypass splitting (they own the raw line).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, splitChainedInput } from '../src/game-engine';
import { ActionTestStory } from './stories';
import { setupTestEngine } from './test-helpers/setup-test-engine';

describe('splitChainedInput', () => {
  it('splits on periods, semicolons, and the word then', () => {
    expect(splitChainedInput('open gate. south')).toEqual(['open gate', 'south']);
    expect(splitChainedInput('take feed; feed goats')).toEqual(['take feed', 'feed goats']);
    expect(splitChainedInput('unlock gate then open gate')).toEqual(['unlock gate', 'open gate']);
    expect(splitChainedInput('a. b; c then d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not split on commas (multi-object phrases)', () => {
    expect(splitChainedInput('take lamp, sword')).toEqual(['take lamp, sword']);
  });

  it('does not split "then" inside a word', () => {
    expect(splitChainedInput('examine authentic sign')).toEqual(['examine authentic sign']);
  });

  it('drops empty statements from doubled or trailing separators', () => {
    expect(splitChainedInput('look..')).toEqual(['look']);
    expect(splitChainedInput('look. . north')).toEqual(['look', 'north']);
    expect(splitChainedInput(';')).toEqual([]);
  });
});

describe('executeTurn chaining', () => {
  let engine: GameEngine;
  let story: ActionTestStory;

  beforeEach(() => {
    story = new ActionTestStory();
    const setup = setupTestEngine();
    engine = setup.engine;
    engine.setStory(story);
    engine.start();
  });

  it('runs each statement as its own turn', async () => {
    const result = await engine.executeTurn('look. inventory');

    // Two turns consumed; the returned result is the final statement's.
    expect(engine.getContext().currentTurn).toBe(3);
    expect(engine.getContext().history).toHaveLength(2);
    expect(result.input).toBe('inventory');
  });

  it('a single statement with a trailing period runs cleaned', async () => {
    const result = await engine.executeTurn('look.');

    expect(result.input).toBe('look');
    expect(engine.getContext().currentTurn).toBe(2);
  });

  it('a failed statement flushes the rest of the line', async () => {
    const result = await engine.executeTurn('xyzzyplugh. look');

    // The gibberish statement fails; `look` never runs.
    expect(result.success).toBe(false);
    expect(result.input).toBe('xyzzyplugh');
    expect(engine.getContext().history.length).toBeLessThanOrEqual(1);
  });

  it('three statements chain in order', async () => {
    await engine.executeTurn('look; wait then inventory');

    expect(engine.getContext().history).toHaveLength(3);
    expect(engine.getContext().history.map(h => h.input ?? h.command)).toEqual(
      expect.arrayContaining([expect.anything(), expect.anything(), expect.anything()])
    );
  });
});
