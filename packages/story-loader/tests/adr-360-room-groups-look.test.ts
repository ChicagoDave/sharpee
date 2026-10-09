/**
 * adr-360-room-groups-look.test.ts — ADR-360 AC-1 on the REAL path: rooms a
 * `rooms` group creates load with their group's heading and its one shared
 * description, the region's one-way exit table connects them, and the
 * player walks the maze by real `go` turns. A shared description keeps a
 * cycling position per room (D8), and that position survives a save and
 * restore. No doubles: the chord compile of the maze-sixteen fixture, the
 * loader's real binding, the real parser, language layer and prose
 * pipeline, `GameEngine.executeTurn`, and the engine's `SaveRestoreService`.
 *
 * Owner context: story-loader tests (ADR-360 Phases 5 and 6).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSemanticEventSource } from '@sharpee/core';
import { SaveRestoreService, type ISaveRestoreStateProvider, type Story } from '@sharpee/engine';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const MAZE = readFileSync(join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'maze-sixteen.story'), 'utf8');

const SENTENCE = 'You are in a maze of twisty little passages, all alike.';
const MAZE_LOOK = `Maze\n${SENTENCE}\n> `;
const DEAD_END_LOOK = 'Dead end.\nDead end.\n> ';

/**
 * The fixture with the maze group's description given two `cycling`
 * variants through a description marker (the D8 per-room position case).
 */
const CYCLING = MAZE.replace(`    ${SENTENCE}\n`, '    {maze-mood}\n').concat(`
define phrase maze-mood, cycling
  Twisty little passages, all alike.
or
  Little twisty passages, all alike.
end phrase
`);
const FIRST = 'Maze\nTwisty little passages, all alike.\n> ';
const SECOND = 'Maze\nLittle twisty passages, all alike.\n> ';

/** Boot a story and spend one turn, so the story banner is not in any later turn's text. */
const boot = async (source = MAZE): Promise<BootedTurns> => {
  const b = await bootTurns(source);
  await b.turnText('look');
  return b;
};

const say = async (b: BootedTurns, input: string): Promise<string> => (await b.turnText(input)).text;
const here = (b: BootedTurns): string | undefined => b.story.irIdOf(b.world.getLocation(b.player.id)!);

describe('ADR-360 AC-1 — walking a maze of group rooms (REAL-PATH)', () => {
  it('walks in from the Sphere Room and between maze rooms, each showing its group text', async () => {
    const b = await boot();
    expect(await say(b, 'north')).toBe(MAZE_LOOK);
    expect(here(b)).toBe('maze-61');
    expect(await say(b, 'east')).toBe(MAZE_LOOK);
    expect(here(b)).toBe('maze-62');
    expect(await say(b, 'south')).toBe(DEAD_END_LOOK);
    expect(here(b)).toBe('dead-end-72');
    expect(await say(b, 'north')).toBe(MAZE_LOOK);
    expect(here(b)).toBe('maze-62');
  });

  it('LOOK in the Maze 61 and in the Maze 70 prints the same heading and description', async () => {
    const b = await boot();
    await say(b, 'north'); // the Maze 61
    expect(await say(b, 'look')).toBe(MAZE_LOOK);
    for (const step of ['west', 'west', 'east']) await say(b, step); // 61 → 63 → 67 → 70
    expect(here(b)).toBe('maze-70');
    expect(await say(b, 'look')).toBe(MAZE_LOOK);
  });

  it('the one-way table infers nothing back: north from the Maze 68 gives the Maze 69 no south exit', async () => {
    const b = await boot();
    for (const step of ['north', 'west', 'west', 'north', 'north']) await say(b, step); // 61 → 63 → 67 → 68 → 69
    expect(here(b)).toBe('maze-69');
    await say(b, 'south');
    expect(here(b)).toBe('maze-69');
  });
});

describe('ADR-360 D8 — a shared description cycles per room, across save and restore (REAL-PATH)', () => {
  it('the first look in each room prints the first variant; a second look there prints the second', async () => {
    const b = await boot(CYCLING);
    expect(await say(b, 'north')).toBe(FIRST); // the Maze 61, first time
    expect(await say(b, 'look')).toBe(SECOND); // the Maze 61, second time
    for (const step of ['west', 'west']) await say(b, step); // 61 → 63 → 67
    expect(await say(b, 'east')).toBe(FIRST); // the Maze 70, first time
  });

  it("each room's position survives a save and a restore", async () => {
    const provider = (x: BootedTurns): ISaveRestoreStateProvider => ({
      getWorld: () => x.world,
      getContext: () => x.engine.getContext(),
      getStory: () => x.story as unknown as Story,
      getEventSource: () => createSemanticEventSource(),
      getPluginRegistry: () => x.engine.getPluginRegistry(),
      getParser: () => undefined,
    });
    const before = await boot(CYCLING);
    expect(await say(before, 'north')).toBe(FIRST); // the Maze 61 has shown the first variant
    const service = new SaveRestoreService();
    const saved = service.createSaveData(provider(before));

    const after = await boot(CYCLING);
    service.loadSaveData(saved, provider(after));
    expect(here(after)).toBe('maze-61');
    expect(await say(after, 'look')).toBe(SECOND);
    for (const step of ['west', 'west']) await say(after, step);
    expect(await say(after, 'east')).toBe(FIRST); // the Maze 70 never showed anything
  });
});

describe('ADR-360 AC-1 — LOOK in the dead ends (REAL-PATH)', () => {
  it('LOOK in the Dead End 72 prints "Dead end." for both the heading and the description', async () => {
    const b = await boot();
    for (const step of ['north', 'east', 'south']) await say(b, step);
    expect(await say(b, 'look')).toBe(DEAD_END_LOOK);
  });
});
