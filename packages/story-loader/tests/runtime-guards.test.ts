/**
 * runtime-guards.test.ts — the runtime's mutable-field invariant, asserted.
 *
 * The runtime holds re-entrancy guards that must be clear between turns
 * and two cross-turn counters a restore resets. Pins: a guard left set is
 * refused at each between-turns entry point with an error naming the
 * field; a clear runtime passes; and after a restore the next
 * runtime-raised event id and the headless fallback turn are what the
 * restored turn calls for.
 */
import { describe, expect, it } from 'vitest';
import type { ISaveData, ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EntityType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import type { ChordRuntime } from '../src/runtime';
import { compileSource } from './helpers/boot-engine';

const SOURCE = `story
  title: Guards
  authors:
    T
  id: guards
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the clock
  in the Hall

  A clock.

  on every turn
    emit estate-clock with hour "evening"
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

type Guards = {
  actDepth: number;
  actChain: string[];
  moveArrivalDepth: number;
  moveArrivalChain: string[];
  inStartBlock: boolean;
  eventSeq: number;
  lastTickTurn: number;
  timers: { stepTimers(tick: { turn: number; world: WorldModel }): ISemanticEvent[] };
};

function headless() {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const runtime = (story as unknown as { runtime: ChordRuntime }).runtime;
  return { runtime, guards: runtime as unknown as Guards, world };
}

describe('assertBetweenTurns — a leaked guard is refused, naming the field', () => {
  const leaks: Array<[keyof Guards, (g: Guards) => void]> = [
    ['actDepth', (g) => { g.actDepth = 1; }],
    ['actChain', (g) => { g.actChain.push('Bea taking'); }],
    ['moveArrivalDepth', (g) => { g.moveArrivalDepth = 1; }],
    ['moveArrivalChain', (g) => { g.moveArrivalChain.push('hall'); }],
    ['inStartBlock', (g) => { g.inStartBlock = true; }],
  ];

  for (const [field, leak] of leaks) {
    it(`the act flush refuses a set \`${field}\``, () => {
      const { runtime, guards } = headless();
      leak(guards);
      expect(() => runtime.drainActEvents()).toThrow(`runtime.guard-leaked: \`${field}\` was left set between turns (at drainActEvents)`);
    });
  }

  it('the start block refuses a set `inStartBlock`', () => {
    const { runtime, guards, world } = headless();
    guards.inStartBlock = true;
    expect(() => runtime.runStartBlock(world)).toThrow('`inStartBlock` was left set between turns (at runStartBlock)');
  });

  it('the scheduler tick refuses a set `actDepth`', () => {
    const { guards, world } = headless();
    guards.actDepth = 1;
    expect(() => guards.timers.stepTimers({ turn: 1, world })).toThrow('`actDepth` was left set between turns (at stepTimers)');
  });

  it('a clear runtime passes every entry point', () => {
    const { runtime, guards, world } = headless();
    expect(runtime.drainActEvents()).toEqual([]);
    expect(runtime.runStartBlock(world)).toEqual([]);
    expect(guards.timers.stepTimers({ turn: 1, world })).toEqual([]);
  });
});

type EnginePrivate = {
  createSaveData(): ISaveData;
  loadSaveData(data: ISaveData): void;
};

describe('resetAfterRestore — the cross-turn counters after a restore', () => {
  it('event numbering starts over and the fallback turn is the restored turn', async () => {
    const story = createStory(compileSource(SOURCE), { seed: 7 });
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });
    const stream: ISemanticEvent[] = [];
    const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
    world.setPlayer(placeholder.id);
    const engine = new GameEngine({ world, player: placeholder, parser, language, config: { seed: 7, onEvent: (e) => stream.push(e) } });
    engine.installStory(story);
    story.extendParser(parser);
    world.removeEntity(placeholder.id);
    const guards = (story as unknown as { runtime: Guards }).runtime;
    const clockIds = () => stream.filter((e) => e.type === 'estate-clock').map((e) => e.id);

    await engine.start();
    await engine.executeTurn('look');
    await engine.executeTurn('look');
    const before = clockIds();
    expect(before.length).toBeGreaterThanOrEqual(2);
    expect(before).toEqual(before.map((_, i) => `chord-estate-clock-${i}`));
    expect(guards.eventSeq).toBe(before.length);

    const saved = (engine as unknown as EnginePrivate).createSaveData();
    await engine.executeTurn('look');
    expect(guards.eventSeq).toBe(before.length + 1);

    (engine as unknown as EnginePrivate).loadSaveData(saved);
    expect(guards.eventSeq).toBe(0);
    expect(guards.lastTickTurn).toBe(saved.metadata.turnCount);

    await engine.executeTurn('look');
    expect(clockIds().at(-1)).toBe('chord-estate-clock-0');
  });
});
