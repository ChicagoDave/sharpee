/**
 * The opening routine on a real `GameEngine` over a TypeScript story
 * (ADR-404): `runOpening()` sends one packet per routine in the story's
 * order, each stamped turn 0 with only that routine's channels; it marks
 * the starting room visited and costs nothing a turn costs; the first
 * command's packet carries turn 1 and none of the opening; a stated
 * opening the engine could not run is refused at install; and the call
 * itself is refused before `start()`, a second time, and after a command.
 *
 * Nothing here is stubbed: the engine, the world, the parser, the language
 * provider, the prose pipeline and the channel service are the real ones.
 * The one test double is a counting turn plugin, registered on the real
 * registry, standing for every each-turn mechanic that rides the tick.
 *
 * Owner context: `@sharpee/engine` — the opening routine.
 */

import { describe, it, expect } from 'vitest';
import { createEvent, type ISemanticEvent } from '@sharpee/core';
import type { TurnPacket } from '@sharpee/channel-service';
import type { TurnPlugin } from '@sharpee/plugins';
import { RoomTrait, TraitType } from '@sharpee/world-model';
import type { GameEngine } from '../../src/game-engine';
import type { OpeningRoutine, StoryConfig } from '../../src/install/story';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

const PROLOGUE = 'The last ferry left an hour ago.';

/** The minimal story with a prologue and, when given, a stated opening. */
class OpeningStory extends MinimalTestStory {
  readonly opening?: readonly OpeningRoutine[];
  constructor(opening?: readonly OpeningRoutine[], prologue: string | null = PROLOGUE) {
    super();
    const config: StoryConfig = { ...this.config };
    if (prologue !== null) config.prologue = prologue;
    this.config = config;
    if (opening !== undefined) this.opening = opening;
  }
}

/** A plugin that counts its ticks and its opening calls, and returns nothing. */
function countingPlugin(): TurnPlugin & { ticks: number; openings: number } {
  return {
    id: 'test.counting',
    priority: 10,
    ticks: 0,
    openings: 0,
    onAfterAction() {
      this.ticks++;
      return [];
    },
    onOpening() {
      this.openings++;
      return [];
    }
  };
}

interface Booted {
  engine: GameEngine;
  story: OpeningStory;
  packets: TurnPacket[];
  stamps: number[];
  plugin: ReturnType<typeof countingPlugin>;
}

/** Install the story on a real engine, start it, and record every packet; a `null` prologue is a story without one. */
function boot(opening?: readonly OpeningRoutine[], prologue: string | null = PROLOGUE): Booted {
  const { engine } = setupTestEngine();
  const story = new OpeningStory(opening, prologue);
  engine.installStory(story);
  const plugin = countingPlugin();
  engine.getPluginRegistry().register(plugin);
  const packets: TurnPacket[] = [];
  const stamps: number[] = [];
  engine.on('channel:packet', (packet, turn) => {
    packets.push(packet);
    stamps.push(turn);
  });
  engine.start();
  return { engine, story, packets, stamps, plugin };
}

/** Which routine a packet belongs to, read from the channels it carries. */
function routineOf(packet: TurnPacket): OpeningRoutine | 'mixed' {
  const ids = Object.keys(packet.payload);
  if (ids.length === 1 && ids[0] === 'prologue') return 'show-prologue';
  if (ids.length === 1 && ids[0] === 'banner') return 'show-banner';
  if (!ids.includes('prologue') && !ids.includes('banner') && ids.includes('turn')) return 'do-first-look';
  return 'mixed';
}

/** The text of every prose channel in a packet, flattened. */
function proseOf(packet: TurnPacket): string {
  return JSON.stringify(packet.payload);
}

describe('runOpening() sends one packet per routine, in the story\'s order', () => {
  it('the default opening is prologue, banner, look: three packets, each with only its own channels', async () => {
    const { engine, packets } = boot();

    await engine.runOpening();

    expect(packets.map(routineOf)).toEqual(['show-prologue', 'show-banner', 'do-first-look']);
    expect(packets[0].payload).toEqual({ prologue: PROLOGUE });
    expect(packets[1].payload.banner).toMatchObject({ title: 'Minimal Test Story' });
    expect(proseOf(packets[2])).toContain('A simple room for testing.');
    expect(packets[2].payload.location).toBeDefined();
  });

  it('a reordered opening sends the room before the banner', async () => {
    const { engine, packets } = boot(['show-prologue', 'do-first-look', 'show-banner']);

    await engine.runOpening();

    expect(packets.map(routineOf)).toEqual(['show-prologue', 'do-first-look', 'show-banner']);
    expect(proseOf(packets[1])).toContain('A simple room for testing.');
    expect(packets[2].payload.banner).toMatchObject({ title: 'Minimal Test Story' });
  });

  it('an opening without show-banner never sends the banner, not even on the first command', async () => {
    const { engine, packets } = boot(['show-prologue', 'do-first-look']);

    await engine.runOpening();
    await engine.executeTurn('take lamp');

    expect(packets.map(routineOf).slice(0, 2)).toEqual(['show-prologue', 'do-first-look']);
    expect(packets).toHaveLength(3);
    for (const packet of packets) expect(packet.payload.banner).toBeUndefined();
  });

  it('an opening without show-prologue never sends the prologue, not even on the first command', async () => {
    const { engine, packets } = boot(['show-banner', 'do-first-look']);

    await engine.runOpening();
    await engine.executeTurn('take lamp');

    expect(packets).toHaveLength(3);
    for (const packet of packets) expect(packet.payload.prologue).toBeUndefined();
  });

  it('an opening without do-first-look describes no room, leaves it unvisited, and returns an empty result', async () => {
    const { engine, story, packets, plugin } = boot(['show-prologue', 'show-banner']);

    const result = await engine.runOpening();

    expect(packets.map(routineOf)).toEqual(['show-prologue', 'show-banner']);
    expect(result.events).toEqual([]);
    expect(result.blocks).toBeUndefined();
    expect(result.success).toBe(true);
    expect(story.getRoom()!.get<RoomTrait>(TraitType.ROOM)!.visited).toBeFalsy();
    expect(plugin.openings).toBe(0);
  });

  it('an empty opening sends nothing, and the first command still carries no banner', async () => {
    const { engine, packets } = boot([]);

    const result = await engine.runOpening();
    expect(packets).toEqual([]);
    expect(result.events).toEqual([]);

    await engine.executeTurn('take lamp');
    expect(packets).toHaveLength(1);
    expect(packets[0].payload.banner).toBeUndefined();
    expect(packets[0].payload.prologue).toBeUndefined();
  });

  it('the default opening of a story with no prologue sends no prologue packet', async () => {
    const { engine, packets } = boot(undefined, null);

    await engine.runOpening();

    // `show-prologue` has nothing to show, so it sends no packet at all.
    expect(packets.map(routineOf)).toEqual(['show-banner', 'do-first-look']);
    for (const packet of packets) expect(packet.payload.prologue).toBeUndefined();
  });

  it('a prologue phrase that does not resolve writes nothing and sends no prologue packet', async () => {
    const { engine, world } = setupTestEngine();
    const story = new OpeningStory();
    story.config = { ...story.config, prologue: { kind: 'phrase-ref', value: 'never-registered-phrase' } };
    engine.installStory(story);
    const packets: TurnPacket[] = [];
    engine.on('channel:packet', (packet) => packets.push(packet));
    engine.start();

    await engine.runOpening();

    expect(packets.map(routineOf)).toEqual(['show-banner', 'do-first-look']);
    expect((world.getCapability('storyInfo') as { prologue?: string }).prologue ?? '').toBe('');
  });

  it('a story with no prologue has nothing written to the capability by the opening', async () => {
    const { engine, world } = setupTestEngine();
    engine.installStory(new OpeningStory(undefined, null));
    engine.start();

    await engine.runOpening();

    expect((world.getCapability('storyInfo') as { prologue?: string }).prologue ?? '').toBe('');
  });

  it('returns the first look\'s result: the looking action, as the player, with the room\'s events', async () => {
    const { engine } = boot();

    const result = await engine.runOpening();

    expect(result.actionId).toBe('if.action.looking');
    expect(result.actorId).toBe(engine.getContext().player.id);
    expect(result.success).toBe(true);
    expect(result.events.some((e) => e.type === 'if.event.room.description')).toBe(true);
    expect(result.blocks && result.blocks.length).toBeGreaterThan(0);
  });
});

describe('the opening is not a turn', () => {
  it('marks the starting room visited, where it was not before', async () => {
    const { engine, story } = boot();
    const room = story.getRoom()!.get<RoomTrait>(TraitType.ROOM)!;
    expect(room.visited).toBeFalsy();

    await engine.runOpening();

    expect(room.visited).toBe(true);
  });

  it('leaves the counter at 1, the history empty and no undo snapshot, and ticks no plugin', async () => {
    const { engine, plugin } = boot();
    expect(engine.getContext().currentTurn).toBe(1);

    await engine.runOpening();

    expect(engine.getContext().currentTurn).toBe(1);
    expect(engine.getContext().history).toEqual([]);
    expect(engine.canUndo()).toBe(false);
    expect(engine.getUndoLevels()).toBe(0);
    expect(plugin.ticks).toBe(0);
    expect(plugin.openings).toBe(1);
  });

  it('counts no session turn: a session stopped after the opening reports 0 turns, and 1 after one command', async () => {
    const sessionTurns = async (commands: string[]): Promise<number> => {
      const { engine } = boot();
      const events: ISemanticEvent[] = [];
      engine.on('event', (event) => events.push(event));
      await engine.runOpening();
      for (const command of commands) await engine.executeTurn(command);
      engine.stop('quit');
      const ending = events.find((e) => e.type === 'game.ending');
      expect(ending, 'stop() emitted no game.ending event').toBeDefined();
      return (ending!.data as { session: { turns: number } }).session.turns;
    };

    expect(await sessionTurns([])).toBe(0);
    expect(await sessionTurns(['take lamp'])).toBe(1);
  });

  it('the first command after the opening is turn 1, ticks the plugin once, and joins the history', async () => {
    const { engine, plugin } = boot();
    await engine.runOpening();

    const result = await engine.executeTurn('take lamp');

    expect(result.turn).toBe(1);
    expect(plugin.ticks).toBe(1);
    expect(engine.getContext().currentTurn).toBe(2);
    expect(engine.getContext().history).toHaveLength(1);
  });

  it('UNDO as the first command gets the answer it gets on an engine whose opening never ran', async () => {
    const answer = async (withOpening: boolean): Promise<string[]> => {
      const { engine } = boot();
      if (withOpening) await engine.runOpening();
      const result = await engine.executeTurn('undo');
      return result.events.map((e) => e.type);
    };

    const control = await answer(false);
    expect(control.length).toBeGreaterThan(0);
    expect(await answer(true)).toEqual(control);
  });

  it('none of the opening\'s events reach the first command\'s render', async () => {
    const { engine, packets } = boot();
    await engine.runOpening();

    const result = await engine.executeTurn('take lamp');

    // The command's blocks are rendered from the turn's store, so anything
    // the opening left there would be rendered here: a leftover
    // `game.started` as the title block, a leftover look as the room.
    const rendered = JSON.stringify(result.blocks);
    expect(rendered).toContain('Taken.');
    expect(rendered).not.toContain('Minimal Test Story');
    expect(rendered).not.toContain('A simple room for testing.');
    const first = packets[packets.length - 1];
    expect(proseOf(first)).not.toContain('A simple room for testing.');
  });

  it('what a plugin returns from onOpening is rendered with the first look, and not again with the first command', async () => {
    const { engine } = setupTestEngine();
    engine.installStory(new OpeningStory());
    const herald: TurnPlugin = {
      id: 'test.herald',
      priority: 10,
      onAfterAction: () => [],
      onOpening: () => [createEvent('game.message', { text: 'A bell rings once.' })]
    };
    engine.getPluginRegistry().register(herald);
    const packets: TurnPacket[] = [];
    engine.on('channel:packet', (packet) => packets.push(packet));
    engine.start();

    const opening = await engine.runOpening();

    expect(packets.map(routineOf)).toEqual(['show-prologue', 'show-banner', 'do-first-look']);
    const look = proseOf(packets[2]);
    expect(look).toContain('A bell rings once.');
    expect(JSON.stringify(opening.blocks)).toContain('A bell rings once.');
    expect(proseOf(packets[0])).not.toContain('A bell rings once.');
    expect(proseOf(packets[1])).not.toContain('A bell rings once.');

    const first = await engine.executeTurn('take lamp');
    expect(JSON.stringify(first.blocks)).not.toContain('A bell rings once.');
    expect(proseOf(packets[3])).not.toContain('A bell rings once.');
  });
});

describe('the turn channel through the opening', () => {
  it('is 0 in every opening packet that carries it, and every opening packet is stamped 0', async () => {
    const { engine, packets, stamps } = boot();

    await engine.runOpening();

    expect(stamps).toEqual([0, 0, 0]);
    expect(packets.map((p) => p.turn_id)).toEqual(['turn-0', 'turn-0', 'turn-0']);
    expect(packets[2].payload.turn).toBe(0);
  });

  it('is 1 in the first command\'s packet and 2 in the second\'s', async () => {
    const { engine, packets } = boot();
    await engine.runOpening();

    await engine.executeTurn('take lamp');
    await engine.executeTurn('drop lamp');

    expect(packets[3].payload.turn).toBe(1);
    expect(packets[4].payload.turn).toBe(2);
  });

  it('a meta command says how many commands have cost a turn: 0 when typed first, 1 after one command', async () => {
    const { engine, packets } = boot();
    await engine.runOpening();

    await engine.executeTurn('score');
    expect(packets[3].payload.turn).toBe(0);

    await engine.executeTurn('take lamp');
    await engine.executeTurn('score');
    expect(packets[4].payload.turn).toBe(1);
    expect(packets[5].payload.turn).toBe(1);
  });
});

describe('an engine whose opening never ran', () => {
  it('writes no prologue in the opening\'s place: the first command\'s packet carries the banner and no prologue', async () => {
    const { engine, packets } = boot();
    const world = engine.getWorld();

    await engine.executeTurn('look');

    expect(packets).toHaveLength(1);
    // The prologue is the routine's alone to write, and the routine never ran.
    expect('prologue' in packets[0].payload).toBe(false);
    // The capability's prologue is the empty string it is created with.
    expect(world.getCapability('storyInfo')?.prologue ?? '').toBe('');
    expect(packets[0].payload.banner).toMatchObject({ title: 'Minimal Test Story' });
    expect(packets[0].payload.turn).toBe(1);
    // And the opening can no longer run.
    await expect(engine.runOpening()).rejects.toThrow('a command has already been executed');
  });
});

describe('a stated opening the engine could not run is refused at install', () => {
  const install = (opening: readonly OpeningRoutine[], prologue: string | null = PROLOGUE) => () => {
    const { engine } = setupTestEngine();
    engine.installStory(new OpeningStory(opening, prologue));
  };

  it('a routine named twice, naming it', () => {
    expect(install(['show-banner', 'do-first-look', 'show-banner'])).toThrow(/'show-banner' twice/);
  });

  it('an unknown routine, naming it', () => {
    const list: readonly string[] = ['show-banner', 'show-credits'];
    expect(install(list as readonly OpeningRoutine[])).toThrow(/'show-credits', which is not an opening routine/);
  });

  it('show-prologue in a story with no prologue', () => {
    expect(install(['show-prologue', 'do-first-look'], null)).toThrow(/'show-prologue'.*no prologue/);
  });

  it('an empty list and every reordering are accepted', () => {
    expect(install([])).not.toThrow();
    expect(install(['do-first-look', 'show-banner', 'show-prologue'])).not.toThrow();
  });
});

describe('runOpening() is refused when it cannot be the opening', () => {
  it('before start(), naming the phase it found', async () => {
    const { engine } = setupTestEngine();
    engine.installStory(new OpeningStory());

    await expect(engine.runOpening()).rejects.toThrow(/'ready' phase.*Call start\(\) first/);
  });

  it('after the engine has stopped, naming the phase it found', async () => {
    const { engine, packets } = boot();
    engine.stop('quit');

    await expect(engine.runOpening()).rejects.toThrow(/'stopped' phase/);
    expect(packets).toEqual([]);
  });

  it('a second time in one engine\'s life, and the first call\'s effects stand', async () => {
    const { engine, packets } = boot();
    await engine.runOpening();
    const sent = packets.length;

    await expect(engine.runOpening()).rejects.toThrow(/already run/);
    expect(packets).toHaveLength(sent);
  });

  it('once a command has been executed, and nothing is sent', async () => {
    const { engine, packets } = boot();
    await engine.executeTurn('take lamp');
    const sent = packets.length;

    await expect(engine.runOpening()).rejects.toThrow(/command has already been executed/);
    expect(packets).toHaveLength(sent);
  });
});
