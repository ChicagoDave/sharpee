/**
 * held-command.test.ts — a disambiguation prompt is answered by splicing
 * the answer into the tied phrase (ADR-385 D11), and the missing-object
 * hold keeps splicing at the end (GH #318).
 *
 * `spliceAnswer` is pinned as the pure rule it is; the executor's hold and
 * the stage's use of it are pinned on a real engine over a two-clock
 * story: `x clock` holds `{ input, tokens, insertAt: 1 }`, `brass` runs
 * `x brass clock`, a command of its own drops the hold, the hold is spent
 * on exactly one input, and `drop` then `lamp` still drops the lamp.
 * The ADR's full transcript runs on the real Chord path in story-loader's
 * `answered-prompt.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { PartOfSpeech, type Token } from '@sharpee/if-domain';
import { IdentityTrait, type WorldModel } from '@sharpee/world-model';
import type { GameEngine } from '../../src/game-engine';
import { spliceAnswer } from '../../src/turn/held-command';
import type { HeldCommand } from '../../src/types';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

/** A tokenizer that marks `the`, `a` and `an` as articles and nothing else. */
function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word, position) => ({
      word,
      normalized: word.toLowerCase(),
      position,
      candidates: ['the', 'a', 'an'].includes(word.toLowerCase())
        ? [{ partOfSpeech: PartOfSpeech.ARTICLE, mapsTo: 'article', priority: 0 }]
        : [],
    }));
}

describe('spliceAnswer (ADR-385 D11)', () => {
  const tied: HeldCommand = { input: 'x clock', tokens: ['x', 'clock'], insertAt: 1 };

  it('inserts the answer at the tied phrase', () => {
    expect(spliceAnswer(tied, 'brass', tokenize)).toBe('x brass clock');
  });

  it('drops the answer\'s articles and the words the command already holds', () => {
    expect(spliceAnswer(tied, 'the wall clock', tokenize)).toBe('x wall clock');
    expect(spliceAnswer(tied, 'the brass', tokenize)).toBe('x brass clock');
  });

  it('inserts into a list item\'s own span', () => {
    const list: HeldCommand = { input: 'take sword and key', tokens: ['take', 'sword', 'and', 'key'], insertAt: 3 };
    expect(spliceAnswer(list, 'silver', tokenize)).toBe('take sword and silver key');
    expect(spliceAnswer(list, 'the silver key', tokenize)).toBe('take sword and silver key');
  });

  it('an answer that adds nothing leaves the held command as it was', () => {
    expect(spliceAnswer(tied, 'the clock', tokenize)).toBe('x clock');
  });

  it('a missing-object hold appends the answer as typed', () => {
    expect(spliceAnswer({ input: 'drop', tokens: ['drop'] }, 'the pear', tokenize)).toBe('drop the pear');
    expect(spliceAnswer({ input: 'put pear', tokens: ['put', 'pear'] }, 'in the box', tokenize)).toBe('put pear in the box');
  });
});

/** The minimal story with a brass clock and a wall clock in the room. */
class TwoClockStory extends MinimalTestStory {
  initializeWorld(world: WorldModel): void {
    super.initializeWorld(world);
    // The story's own room is where its lamp is (the test setup makes a
    // room of the same name before the story runs)
    const lamp = world.getAllEntities().find((e) => e.name === 'lamp')!;
    const room = world.getLocation(lamp.id)!;
    for (const [name, description] of [['brass clock', 'A brass clock.'], ['wall clock', 'A wall clock.']]) {
      const clock = world.createEntity(name, 'object');
      clock.add(new IdentityTrait({ name, description, article: 'a' }));
      world.moveEntity(clock.id, room);
    }
  }
}

function started(): { engine: GameEngine; world: WorldModel } {
  const { engine } = setupTestEngine();
  engine.installStory(new TwoClockStory());
  engine.start();
  return { engine, world: engine.getWorld() };
}

describe('the engine holds a tied command and spends it on the next input (ADR-385 D11)', () => {
  it('`x clock` holds the command with the tied span; `brass` runs `x brass clock`', async () => {
    const { engine } = started();
    const prompt = await engine.executeTurn('x clock');
    expect(prompt.error).toBe('DISAMBIGUATION_NEEDED');
    expect(prompt.hold).toEqual({ input: 'x clock', tokens: ['x', 'clock'], insertAt: 1 });

    const answer = await engine.executeTurn('brass');
    expect(answer.input).toBe('x brass clock');
    expect(answer.success).toBe(true);
    expect(answer.validatedCommand?.directObject?.entity.name).toBe('brass clock');
  });

  it('the insertion point follows the phrase\'s article; `the wall clock` answers in place', async () => {
    const { engine } = started();
    const prompt = await engine.executeTurn('x the clock');
    expect(prompt.hold).toEqual({ input: 'x the clock', tokens: ['x', 'the', 'clock'], insertAt: 2 });

    const answer = await engine.executeTurn('the wall clock');
    expect(answer.input).toBe('x the wall clock');
    expect(answer.validatedCommand?.directObject?.entity.name).toBe('wall clock');
  });

  it('a command of its own drops the hold; the hold is spent on exactly one input', async () => {
    const { engine } = started();
    await engine.executeTurn('x clock');
    const own = await engine.executeTurn('inventory');
    expect(own.input).toBe('inventory');
    expect(own.success).toBe(true);

    // The hold is gone: a bare `brass` is an unknown command now
    const stale = await engine.executeTurn('brass');
    expect(stale.success).toBe(false);
    expect(stale.input).toBe('brass');
  });

  it('a new hold replaces an open one', async () => {
    const { engine, world } = started();
    const brass = world.getAllEntities().find((e) => e.name === 'brass clock')!;
    const wall = world.getAllEntities().find((e) => e.name === 'wall clock')!;
    const room = world.getLocation(brass.id);
    await engine.executeTurn('x clock');
    const second = await engine.executeTurn('take clock');
    expect(second.error).toBe('DISAMBIGUATION_NEEDED');
    const answer = await engine.executeTurn('brass');
    expect(answer.input).toBe('take brass clock');
    expect(world.getLocation(brass.id)).toBe(world.getPlayer()!.id);
    expect(world.getLocation(wall.id)).toBe(room);
  });

  it('the missing-object hold keeps splicing at the end: `drop` then `lamp`', async () => {
    const { engine, world } = started();
    const lamp = world.getAllEntities().find((e) => e.name === 'lamp')!;
    const room = world.getLocation(lamp.id);
    await engine.executeTurn('take lamp');
    expect(world.getLocation(lamp.id)).toBe(world.getPlayer()!.id);

    const prompt = await engine.executeTurn('drop');
    expect(prompt.error).toBe('CLARIFICATION_NEEDED');
    expect(prompt.hold).toEqual({ input: 'drop', tokens: ['drop'] });

    const answer = await engine.executeTurn('lamp');
    expect(answer.input).toBe('drop lamp');
    expect(world.getLocation(lamp.id)).toBe(room);
  });

  it('the missing-indirect hold is completed by its tail: `put lamp` then `in box`', async () => {
    const { engine, world } = started();
    const lamp = world.getAllEntities().find((e) => e.name === 'lamp')!;
    const box = world.getAllEntities().find((e) => e.name === 'box')!;
    await engine.executeTurn('take lamp');
    await engine.executeTurn('open box');

    const prompt = await engine.executeTurn('put lamp');
    expect(prompt.error).toBe('CLARIFICATION_NEEDED');
    expect(prompt.hold).toEqual({ input: 'put lamp', tokens: ['put', 'lamp'] });

    const answer = await engine.executeTurn('in box');
    expect(answer.input).toBe('put lamp in box');
    expect(world.getLocation(lamp.id)).toBe(box.id);
  });
});
