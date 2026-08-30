/**
 * adr-330-chapters.test.ts — ADR-330 Acceptance 2, 3, 5 on the REAL path: a
 * Chord fixture with `use chapters` and a four-row `define chapters` block,
 * loaded through the loader, driven by `GameEngine.executeTurn`, observed on
 * the engine's own event stream and the `story.chapter` channel's projection
 * of it. No doubles: the loader lowers the rows, the engine's plugin registry
 * runs the extension's plugin after the scheduler, world state carries the
 * chapter across a real `SaveRestoreService` round trip.
 *
 * Owner context: story-loader tests (rule 13a real-path gate for the
 * chapters extension).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { createSemanticEventSource } from '@sharpee/core';
import { GameEngine, SaveRestoreService, type ISaveRestoreStateProvider, type Story } from '@sharpee/engine';
import { CHAPTER_BEGAN_EVENT, CHAPTER_CURRENT_KEY, CHAPTER_STALE_EVENT, chapterChannel } from '@sharpee/ext-chapters';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService, StdlibChannelRegistry, createNpcService } from '@sharpee/stdlib';
import { EntityType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, LoadError, createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

const SOURCE = `story
  title: Chapters
  authors:
    T
  id: chapters
  story-version: 0.0.1
  states: calm, chase
  use chapters

define chapters
  market - Chapter I: The Market
    A stolen apple, and a girl the whole city is about to start looking for.
    begins when the game starts
  street - Chapter II: The Street
    begins when the player visits the Street for the first time
  chase - Chapter III: The Chase
    begins when the story becomes chase
  ball - Chapter IV: The Ball
    begins when the player's bell expires
end chapters

define timer bell for the player
end timer

define action fleeing
  grammar
    run away
  change the story to chase

define action ringing
  grammar
    ring out
  start the player's bell

define action blinking
  grammar
    blink out
  move the player to the Street

create the Market
  a room
  east to the Street

  A market.

  phrase detail during market:
    The market is still yours.

  phrase detail while after market:
    The market is behind you.

create the apples
  scenery
  in the Market

  Apples.

  on the player smelling
    refuse when during market: smell-market
    refuse when after market: smell-later
  end on

create the Street
  a room
  west to the Market
  west is blocked during chase: no-way-back

  A street.

  phrase detail while before street:
    Not yet.

  after the player entering
    phrase not-yet when before street
    phrase here-now when during street
  end after

define phrase not-yet
  Not yet.
end phrase

define phrase here-now
  Here now.
end phrase

define phrase smell-market
  Apples, this chapter.
end phrase

define phrase smell-later
  Dust, now.
end phrase

define phrase no-way-back
  The market is closed to you now.
end phrase

create Alex
  a person
  playable
  starts in the Market

  You.

before the game starts
  change the player to Alex
end before

`;

interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  stream: ISemanticEvent[];
  /** Run one command and return only the events of that turn, in stream order. */
  turn: (input: string) => Promise<ISemanticEvent[]>;
}

async function boot(seed = 7): Promise<Booted> {
  const story = createStory(compileSource(SOURCE), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  const engine = new GameEngine({ world, player: placeholder, parser, language, perceptionService: new PerceptionService(), config: { seed, onEvent: (e) => stream.push(e) } });
  engine.setStory(story);
  // The story's own grammar (`run away`, `ring out`, `blink out`) — bootstrap's
  // step, which the engine's setStory does not take.
  story.extendParser(parser);
  world.removeEntity(placeholder.id);
  await engine.start();
  const turn = async (input: string) => {
    const from = stream.length;
    await engine.executeTurn(input);
    return stream.slice(from);
  };
  return { engine, story, world, player: world.getPlayer()!, stream, turn };
}

const began = (events: ISemanticEvent[]) => events.filter((e) => e.type === CHAPTER_BEGAN_EVENT).map((e) => (e.data as { name: string }).name);
const stale = (events: ISemanticEvent[]) => events.filter((e) => e.type === CHAPTER_STALE_EVENT);
const current = (b: Booted) => b.world.getStateValue(CHAPTER_CURRENT_KEY);

describe('ADR-330 chapters on the real path', () => {
  it('Acceptance 2: the opening row begins on the first command, with title and description verbatim, after the role is assigned', async () => {
    const b = await boot();
    expect(b.player.id).toBe(b.story.entityId('alex'));
    const events = await b.turn('look');
    expect(began(events)).toEqual(['market']);
    const expected = {
      name: 'market',
      title: 'Chapter I: The Market',
      description: 'A stolen apple, and a girl the whole city is about to start looking for.',
      ordinal: 0,
    };
    expect(events.find((e) => e.type === CHAPTER_BEGAN_EVENT)!.data).toMatchObject(expected);
    expect(current(b)).toBe(0);
    // The channel projects the same turn's stream into the packet — and the
    // packet comes after the turn's own events, never before them.
    const packet = chapterChannel.produce({ world: b.world, events, blocks: [], turn: 1, prevValue: undefined });
    expect(packet).toEqual(expected);
    expect(events.findIndex((e) => e.type === CHAPTER_BEGAN_EVENT)).toBeGreaterThan(events.findIndex((e) => e.type.startsWith('if.event')));
  });

  it('Acceptance 3: a first arrival begins its chapter once — walking away and back emits nothing', async () => {
    const b = await boot();
    await b.turn('look');
    const east = await b.turn('east');
    expect(began(east)).toEqual(['street']);
    expect(current(b)).toBe(1);
    expect(began(await b.turn('west'))).toEqual([]);
    expect(began(await b.turn('east'))).toEqual([]);
    expect(current(b)).toBe(1);
    expect(chapterChannel.produce({ world: b.world, events: east, blocks: [], turn: 2, prevValue: undefined })).toMatchObject({ name: 'street', ordinal: 1 });
  });

  it('Acceptance 3: an authorial `move the player to <room>` counts as the visit', async () => {
    const b = await boot();
    await b.turn('look');
    const blink = await b.turn('blink out');
    expect(b.world.getLocation(b.player.id)).toBe(b.story.entityId('street'));
    expect(began(blink)).toEqual(['street']);
  });

  it('Acceptance 3: a story state anchor and a timer expiry each begin their chapter on their moment, once', async () => {
    const b = await boot();
    await b.turn('look');
    await b.turn('east');
    expect(began(await b.turn('run away'))).toEqual(['chase']);
    expect(current(b)).toBe(2);
    expect(began(await b.turn('ring out'))).toEqual([]); // started this turn; a timer with no named turns expires next turn
    expect(began(await b.turn('wait'))).toEqual(['ball']);
    expect(current(b)).toBe(3);
    expect(began(await b.turn('wait'))).toEqual([]);
  });

  it('D3: an earlier chapter\'s moment arriving after a later chapter began changes nothing and raises runtime.chapter-stale once', async () => {
    const b = await boot();
    await b.turn('look');
    expect(began(await b.turn('run away'))).toEqual(['chase']); // skips `street`
    const east = await b.turn('east');
    expect(began(east)).toEqual([]);
    expect(stale(east).map((e) => (e.data as { chapter: string }).chapter)).toEqual(['street']);
    expect(current(b)).toBe(2);
    expect(stale(await b.turn('west'))).toEqual([]);
    expect(stale(await b.turn('east'))).toEqual([]);
  });

  it('Acceptance 5: a save taken in a chapter restores into it and re-fires nothing', async () => {
    const b1 = await boot();
    await b1.turn('look');
    await b1.turn('east');
    expect(current(b1)).toBe(1);

    const provider = (b: Booted): ISaveRestoreStateProvider => ({
      getWorld: () => b.world,
      getContext: () => b.engine.getContext(),
      getStory: () => b.story as unknown as Story,
      getEventSource: () => createSemanticEventSource(),
      getPluginRegistry: () => b.engine.getPluginRegistry(),
      getParser: () => undefined,
    });
    const service = new SaveRestoreService();
    const saveData = service.createSaveData(provider(b1));

    const b2 = await boot();
    service.loadSaveData(saveData, provider(b2));
    expect(current(b2)).toBe(1);
    const after = await b2.turn('look');
    expect(began(after)).toEqual([]);
    expect(began(await b2.turn('west'))).toEqual([]);
    expect(began(await b2.turn('run away'))).toEqual(['chase']);
  });

  it('D4: the story\'s registerChannels hook installs `story.chapter` in the real channel registry, through the registry entry\'s registerChannels slot', async () => {
    const b = await boot();
    const registry = new StdlibChannelRegistry();
    b.story.registerChannels(registry);
    const channel = registry.get('story.chapter');
    expect(channel).toBeDefined();
    expect(channel!.contentType).toBe('json');
    expect(channel!.mode).toBe('replace');
    expect(channel!.emit).toBe('sparse');
    const events = await b.turn('look');
    expect(channel!.produce({ world: b.world, events, blocks: [], turn: 1, prevValue: undefined })).toMatchObject({ name: 'market', ordinal: 0 });
  });

  it('rogue IR with chapters but no `use chapters` → LoadError at engine-ready (the loader backstop behind the compiler\'s gate)', () => {
    const ir = compileSource(SOURCE);
    ir.uses = [];
    const rogue = createStory(ir, { seed: 7 });
    const w = new WorldModel();
    rogue.initializeWorld(w);
    const p = rogue.createPlayer(w);
    w.setPlayer(p.id);
    expect(() =>
      rogue.onEngineReady({ getNpcService: () => createNpcService(), getPluginRegistry: () => ({ register: () => {} }) } as unknown as Parameters<ChordStory['onEngineReady']>[0]),
    ).toThrow(LoadError);
  });

  it('Acceptance 7: `during`/`before`/`after` read the current chapter — an intercept, an arrival phrase at the boundary, and a blocked exit', async () => {
    const b = await boot();
    const keys = (events: ISemanticEvent[]) => JSON.stringify(events.map((e) => e.data));
    // Turn 1: the opener is current BEFORE the first action (seeded at the start moment).
    expect(keys(await b.turn('smell apples'))).toContain('smell-market');
    // The arrival turn: `street` begins at the END of the turn, so the arrival prose still reads `before street`.
    const east = await b.turn('east');
    expect(keys(east)).toContain('not-yet');
    expect(keys(east)).not.toContain('here-now');
    expect(began(east)).toEqual(['street']);
    // A second arrival is inside `street`.
    await b.turn('west');
    expect(keys(await b.turn('smell apples'))).toContain('smell-later'); // `after market`
    const again = await b.turn('east');
    expect(keys(again)).toContain('here-now');
    expect(keys(again)).not.toContain('not-yet');
    // `during chase` closes the way back.
    await b.turn('run away');
    const back = await b.turn('west');
    expect(keys(back)).toContain('"blocked":true');
    expect(b.world.getLocation(b.player.id)).toBe(b.story.entityId('street'));
  });

  it('Acceptance 6 (this fixture\'s half): without `use chapters` and the block, no chapter event ever appears', async () => {
    const plain = `story
  title: Plain
  authors:
    T
  id: plain
  story-version: 0.0.1

create the Market
  a room
  east to the Street

  A market.

create the Street
  a room
  west to the Market

  A street.

create Alex
  a person
  playable
  starts in the Market

  You.

before the game starts
  change the player to Alex
end before

`;
    const story = createStory(compileSource(plain), { seed: 7 });
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });
    const stream: ISemanticEvent[] = [];
    const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
    world.setPlayer(placeholder.id);
    const engine = new GameEngine({ world, player: placeholder, parser, language, config: { seed: 7, onEvent: (e) => stream.push(e) } });
    engine.setStory(story);
    story.extendParser(parser);
    world.removeEntity(placeholder.id);
    await engine.start();
    await engine.executeTurn('look');
    await engine.executeTurn('east');
    expect(stream.some((e) => e.type === CHAPTER_BEGAN_EVENT || e.type === CHAPTER_STALE_EVENT)).toBe(false);
    expect(world.getStateValue(CHAPTER_CURRENT_KEY)).toBeUndefined();
  });
});
