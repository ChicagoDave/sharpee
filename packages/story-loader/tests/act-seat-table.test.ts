/**
 * act-seat-table.test.ts — an acting statement seats each slot it names by
 * the action's seat table, never by the order it names them, through the
 * REAL compiler, loader and engine. A story action whose two lines name its
 * nouns in opposite orders builds the same command from either statement,
 * and dispatch binds both nouns under their names; a standard action naming
 * an instrument slot runs. A slot name the table lacks — IR the compiler
 * never emits — is a named load error. Assertions are on world state.
 */
import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { LockableTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { bootTurns, compileSource } from './helpers/boot-turns';

const STORY = (act: string) => `story
  title: Bestowing
  authors:
    T
  id: bestowing
  story-version: 0.0.1

define action bestowing
  grammar
    bestow the gift on the friend
    endow the friend with the gift
  move the gift to the friend

create the Hall
  a room

  A hall.

create the coin
  a thing
  in the Hall

  A coin.

create the brass key
  a thing

  A key.

create the chest
  a container, openable, lockable with the brass key, starts locked
  in the Hall

  A chest.

create Bob
  a person, proper
  in the Hall

  Bob.

create Teisha
  a person, proper
  in the Hall
  carries the brass key

  Teisha.

  on every turn
    ${act}
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

describe('an acting statement seats each slot by the action seat table', () => {
  it.each(['Teisha bestows the coin on Bob', 'Teisha endows Bob with the coin'])(
    '`%s` gives the coin to Bob',
    async (act) => {
      const b = await bootTurns(STORY(act));
      expect(b.world.getLocation(b.id('coin'))).toBe(b.id('hall'));
      await b.turn('wait');
      expect(b.world.getLocation(b.id('coin'))).toBe(b.id('bob'));
    },
  );

  // The instrument seat itself is pinned in chord's act-seats.test.ts:
  // stdlib's unlocking also reads a key from the indirect object.
  it('a standard action naming an instrument slot runs: Teisha unlocks the chest with the key', async () => {
    const b = await bootTurns(STORY('Teisha unlocks the chest with the brass key'));
    const lock = () => (b.world.getEntity(b.id('chest'))!.get(TraitType.LOCKABLE) as LockableTrait).isLocked;
    expect(lock()).toBe(true);
    await b.turn('wait');
    expect(lock()).toBe(false);
  });

  it('a slot name the table lacks is refused by name and moves nothing', async () => {
    const ir = compileSource(STORY('Teisha bestows the coin on Bob'));
    const patched = JSON.parse(JSON.stringify(ir).replace('"slot":"friend"', '"slot":"stranger"')) as typeof ir;
    expect(JSON.stringify(patched)).toContain('"slot":"stranger"');
    const story = createStory(patched, { seed: 7 });
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const engine = new GameEngine({ world, parser: new EnglishParser(language, { world }), language, perceptionService: new PerceptionService(), config: { seed: 7 } });
    engine.installStory(story);
    await engine.start();
    // The act runs in an every-turn daemon, whose errors the scheduler logs.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await engine.executeTurn('wait');
      const errors = logged.mock.calls.flat().filter((arg): arg is Error => arg instanceof Error);
      expect(errors.some((e) => e.message.includes('runtime.act-unseated-slot: `stranger` has no seat in `bestowing`'))).toBe(true);
    } finally {
      logged.mockRestore();
    }
    expect(world.getLocation(story.entityId('coin')!)).toBe(story.entityId('hall'));
  });
});
