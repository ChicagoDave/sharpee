/**
 * opening-block.test.ts — a story's `when the game starts` block on the REAL
 * path: the `quay` test story and each copy under `seeded/` is compiled from
 * its file, loaded through the loader, installed on a real `GameEngine`, and
 * opened with `runOpening()`. What is observed is the engine's own packets,
 * the manifest it sent at start, and world state.
 *
 * No doubles: the compiler, the loader, the parser, the language provider,
 * the perception service, the prose pipeline, the channel service, the
 * chapters, scheduler and hunger plugins are the real ones. This is also the
 * chapters plugin's `onOpening` on a real engine over a compiled story.
 *
 * Public interface: none (a test file).
 * Owner context: story-loader tests (rule 13a real-path gate for the opening
 * block; `test-stories/quay/quay.test-set.md` OB-46 to OB-50, on the engine).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import type { TurnPacket } from '@sharpee/channel-service';
import { GameEngine } from '@sharpee/engine';
import { CHAPTER_ANNOUNCED_KEY, CHAPTER_CHANNEL_ID } from '@sharpee/ext-chapters';
import { getHungerSeverity } from '@sharpee/ext-hunger';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, LoadError, createStory } from '../src';
import { timerKey } from '../src/state-keys';

const testStories = process.env.SHARPEE_TEST_STORIES;

const PROLOGUE = 'The last ferry left an hour ago, and someone has to light the lamp.';
const FIRST_VISIT = 'You have not stood here since you were a child';
const CARD_TITLE = 'Chapter I: Dusk';
const TIDE_SLACK = 'The water under the quay stops moving.';
const TIDE_TURNING = 'The water under the quay begins to draw out.';
const PECKISH = 'You have not eaten since the morning boat.';
const LAMP_OVERDUE = 'a ship\'s bell asks where the light is';

type Part = 'prologue' | 'banner' | 'look' | 'other';

interface Opened {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  /** Every packet the engine has sent since start, in order. */
  packets: TurnPacket[];
  /** The turn each packet was stamped with, beside `packets`. */
  stamps: number[];
  /** The channel ids of the manifest sent at start, in dispatch order. */
  manifestIds: string[];
  /** Run one command and return the packets it sent. */
  command: (input: string) => Promise<TurnPacket[]>;
}

/**
 * Compile one of the quay files and start a real engine over it. The
 * opening is not run: each test calls `runOpening()` itself.
 *
 * @param file the story file, relative to `test-stories/quay`
 * @returns the started engine with its packet record
 * @throws Error when the file does not compile clean
 */
async function start(file: string): Promise<Opened> {
  const source = readFileSync(join(testStories!, 'quay', file), 'utf8');
  const compiled = compile(source);
  const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
  if (!compiled.ok || errors.length > 0) {
    throw new Error(`${file} does not compile: ${errors.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; ')}`);
  }
  const story = createStory(compiled.ir, { seed: 42 });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const engine = new GameEngine({ world, parser, language, perceptionService: new PerceptionService(), config: { seed: 42 } });
  // Bootstrap's order: parser and language extended before the install.
  story.extendParser(parser);
  story.extendLanguage(language);
  engine.installStory(story);
  const packets: TurnPacket[] = [];
  const stamps: number[] = [];
  const manifestIds: string[] = [];
  engine.on('channel:packet', (packet, turn) => {
    packets.push(packet);
    stamps.push(turn);
  });
  engine.on('channel:manifest', (cmgt) => manifestIds.push(...cmgt.channels.map((c) => c.id)));
  await engine.start();
  const command = async (input: string) => {
    const from = packets.length;
    await engine.executeTurn(input);
    return packets.slice(from);
  };
  return { engine, story, world, packets, stamps, manifestIds, command };
}

/** Which part of an opening a packet is, read from the channels it carries. */
function partOf(packet: TurnPacket): Part {
  const ids = Object.keys(packet.payload);
  if (ids.length === 1 && ids[0] === 'prologue') return 'prologue';
  if (ids.length === 1 && ids[0] === 'banner') return 'banner';
  if (!ids.includes('prologue') && !ids.includes('banner') && ids.includes('room-name')) return 'look';
  return 'other';
}

/** Everything a packet carries, as one string to search. */
const textOf = (packet: TurnPacket): string => JSON.stringify(packet.payload);
const textOfAll = (packets: TurnPacket[]): string => packets.map(textOf).join('\n');

/** The room the player is in, and whether it has been visited. */
function quayVisited(world: WorldModel): boolean {
  const room = world.getEntity(world.getLocation(world.playerCharacter.id)!)!;
  return (room.get(TraitType.ROOM) as RoomTrait).visited;
}

describe.skipIf(!testStories)('the opening block reaches the engine as the story\'s opening list', () => {
  it('a story with no block states no opening, and each copy states its block\'s list', async () => {
    const lists: Record<string, readonly string[] | undefined> = {};
    for (const file of [
      'quay.story',
      'seeded/quay-reordered.story',
      'seeded/quay-no-look.story',
      'seeded/quay-no-banner.story',
      'seeded/quay-no-prologue.story',
      'seeded/quay-empty.story',
      'seeded/quay-clock.story',
    ]) {
      lists[file] = (await start(file)).story.opening;
    }
    expect(lists).toEqual({
      'quay.story': undefined,
      'seeded/quay-reordered.story': ['show-prologue', 'do-first-look', 'show-banner'],
      'seeded/quay-no-look.story': ['show-prologue', 'show-banner'],
      'seeded/quay-no-banner.story': ['show-prologue', 'do-first-look'],
      'seeded/quay-no-prologue.story': ['show-banner', 'do-first-look'],
      'seeded/quay-empty.story': [],
      'seeded/quay-clock.story': undefined,
    });
  });
});

describe.skipIf(!testStories)('the loader and IR that no compile produced', () => {
  /** The quay's compiled IR, to alter by hand. */
  const quayIR = (): StoryIR => {
    const compiled = compile(readFileSync(join(testStories!, 'quay', 'quay.story'), 'utf8'));
    expect(compiled.ok).toBe(true);
    return compiled.ir;
  };

  it('IR without the field loads as a story that states no opening', () => {
    const ir: Partial<StoryIR> = { ...quayIR() };
    delete ir.opening;
    expect('opening' in ir).toBe(false);
    expect(createStory(ir as StoryIR).opening).toBeUndefined();
  });

  it('a hand-written list is handed over as written', () => {
    expect(createStory({ ...quayIR(), opening: ['do-first-look', 'show-banner'] }).opening).toEqual(['do-first-look', 'show-banner']);
  });

  it('a list that repeats a routine is refused with a LoadError naming it', () => {
    const load = () => createStory({ ...quayIR(), opening: ['show-banner', 'show-banner'] });
    expect(load).toThrow(LoadError);
    expect(load).toThrow('names `show-banner` twice');
  });

  it('a list naming something that is not a routine is refused with a LoadError naming it', () => {
    const load = () => createStory({ ...quayIR(), opening: ['look'] } as unknown as StoryIR);
    expect(load).toThrow(LoadError);
    expect(load).toThrow('`look`, which is not a routine');
  });

  it('show-prologue in IR with no prologue is refused with a LoadError', () => {
    const ir = quayIR();
    const fields = { ...ir.meta.fields };
    delete fields.prologue;
    const load = () => createStory({ ...ir, meta: { ...ir.meta, fields }, opening: ['show-prologue'] });
    expect(load).toThrow(LoadError);
    expect(load).toThrow('the story header has no `prologue:` field');
  });
});

describe.skipIf(!testStories)('runOpening() on a compiled story prints in the block\'s order', () => {
  it('no block: prologue, banner, then the look with the chapter card and the room, every packet stamped 0', async () => {
    const b = await start('quay.story');
    expect(b.packets).toEqual([]);

    await b.engine.runOpening();

    expect(b.packets.map(partOf)).toEqual(['prologue', 'banner', 'look']);
    expect(b.stamps).toEqual([0, 0, 0]);
    expect(b.packets[0].payload).toEqual({ prologue: PROLOGUE });
    expect(b.packets[1].payload.banner).toMatchObject({ title: 'The Quay' });
    expect(b.packets[2].payload['room-name']).toBeDefined();
    expect(textOf(b.packets[2])).toContain(FIRST_VISIT);
    expect(b.packets[2].payload.turn).toBe(0);
  });

  it('the reordered block: prologue, the look, then the banner', async () => {
    const b = await start('seeded/quay-reordered.story');

    await b.engine.runOpening();

    expect(b.packets.map(partOf)).toEqual(['prologue', 'look', 'banner']);
    expect(textOf(b.packets[1])).toContain(FIRST_VISIT);
    expect(b.packets[2].payload.banner).toMatchObject({ title: 'The Quay' });
  });

  it('no banner in the block: the banner is never sent, then or on the first command', async () => {
    const b = await start('seeded/quay-no-banner.story');

    await b.engine.runOpening();
    await b.command('take key');

    expect(b.packets.map(partOf).slice(0, 2)).toEqual(['prologue', 'look']);
    expect(b.packets).toHaveLength(3);
    for (const packet of b.packets) expect(packet.payload.banner).toBeUndefined();
  });

  it('no prologue in the block: the header\'s prologue is never sent, then or on the first command', async () => {
    const b = await start('seeded/quay-no-prologue.story');

    await b.engine.runOpening();
    await b.command('take key');

    expect(b.packets.map(partOf).slice(0, 2)).toEqual(['banner', 'look']);
    expect(b.packets).toHaveLength(3);
    expect(textOfAll(b.packets)).not.toContain(PROLOGUE);
  });

  it('no look in the block: the room is not described or visited, and the first look reads as a first visit', async () => {
    const b = await start('seeded/quay-no-look.story');

    await b.engine.runOpening();

    expect(b.packets.map(partOf)).toEqual(['prologue', 'banner']);
    expect(textOfAll(b.packets)).not.toContain(FIRST_VISIT);
    expect(quayVisited(b.world)).toBe(false);

    const reply = await b.command('look');
    expect(textOfAll(reply)).toContain(FIRST_VISIT);
    expect(quayVisited(b.world)).toBe(true);
  });

  it('an empty block sends nothing, and the first command sends no prologue and no banner', async () => {
    const b = await start('seeded/quay-empty.story');

    await b.engine.runOpening();
    expect(b.packets).toEqual([]);

    const reply = await b.command('look');
    expect(reply).toHaveLength(1);
    expect(reply[0].payload.banner).toBeUndefined();
    expect(textOfAll(reply)).not.toContain(PROLOGUE);
    expect(textOfAll(reply)).toContain(FIRST_VISIT);
  });
});

describe.skipIf(!testStories)('the opening chapter\'s card comes once, with the first look', () => {
  it.each(['quay.story', 'seeded/quay-reordered.story'])(
    '%s: the card is in the look\'s packet, ahead of the room in the manifest, and not on the first command',
    async (file) => {
      const b = await start(file);
      expect(b.world.getStateValue(CHAPTER_ANNOUNCED_KEY)).toBeUndefined();

      await b.engine.runOpening();

      const look = b.packets.find((p) => partOf(p) === 'look')!;
      expect(look.payload[CHAPTER_CHANNEL_ID]).toMatchObject({ name: 'dusk', title: CARD_TITLE });
      expect(b.packets.filter((p) => p.payload[CHAPTER_CHANNEL_ID] !== undefined)).toHaveLength(1);
      expect(b.manifestIds.indexOf(CHAPTER_CHANNEL_ID)).toBeGreaterThanOrEqual(0);
      expect(b.manifestIds.indexOf(CHAPTER_CHANNEL_ID)).toBeLessThan(b.manifestIds.indexOf('room-name'));
      expect(b.world.getStateValue(CHAPTER_ANNOUNCED_KEY)).toBe('dusk');

      const reply = await b.command('take key');
      expect(reply).toHaveLength(1);
      expect(reply[0].payload[CHAPTER_CHANNEL_ID]).toBeUndefined();
      expect(textOfAll(reply)).not.toContain(CARD_TITLE);
    },
  );

  it('no look in the block: the opening has no card, and the first command\'s reply carries it once', async () => {
    const b = await start('seeded/quay-no-look.story');

    await b.engine.runOpening();
    expect(textOfAll(b.packets)).not.toContain(CARD_TITLE);
    expect(b.world.getStateValue(CHAPTER_ANNOUNCED_KEY)).toBeUndefined();

    const first = await b.command('take key');
    expect(first[0].payload[CHAPTER_CHANNEL_ID]).toMatchObject({ name: 'dusk', title: CARD_TITLE });
    expect(b.world.getStateValue(CHAPTER_ANNOUNCED_KEY)).toBe('dusk');

    const second = await b.command('drop key');
    expect(second[0].payload[CHAPTER_CHANNEL_ID]).toBeUndefined();
  });
});

describe.skipIf(!testStories)('nothing has run when the first command is typed', () => {
  it('the opening steps no timer, counts no turn and grows no meter; the first command does each once', async () => {
    const b = await start('seeded/quay-clock.story');
    const tideBefore = b.world.getStateValue(timerKey('tide'));
    expect(tideBefore).toMatchObject({ phase: 'running' });
    expect(getHungerSeverity(b.world)).toBe(0);

    await b.engine.runOpening();

    // The opening printed the room and nothing the clock says.
    expect(b.packets.map(partOf)).toEqual(['prologue', 'banner', 'look']);
    const opening = textOfAll(b.packets);
    expect(opening).toContain(FIRST_VISIT);
    expect(opening).not.toContain(TIDE_SLACK);
    expect(opening).not.toContain(PECKISH);
    expect(opening).not.toContain(LAMP_OVERDUE);
    // And changed nothing a turn changes.
    expect(b.world.getStateValue(timerKey('tide'))).toEqual(tideBefore);
    expect(getHungerSeverity(b.world)).toBe(0);
    expect(b.engine.getContext().currentTurn).toBe(1);

    const first = textOfAll(await b.command('wait'));
    expect(first).toContain(TIDE_SLACK);
    expect(first).toContain(PECKISH);
    expect(first).not.toContain(LAMP_OVERDUE);
    expect(getHungerSeverity(b.world)).toBe(3);
    expect(b.packets[b.packets.length - 1].payload.turn).toBe(1);

    const second = textOfAll(await b.command('wait'));
    expect(second).toContain(TIDE_TURNING);
    expect(second).not.toContain(LAMP_OVERDUE);

    const third = textOfAll(await b.command('wait'));
    expect(third).toContain(LAMP_OVERDUE);
    expect(b.packets[b.packets.length - 1].payload.turn).toBe(3);
  });
});
