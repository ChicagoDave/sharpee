/**
 * The opening on the bootstrap game handle (ADR-404): `LoadedGame.runOpening`
 * and the restart reboot's opening.
 *
 * Real path: a real minimal story on the real engine through `assembleGame`,
 * the surface the CLI bundle, the transcript runner and `sharpee play` use.
 * Derived from the Behavior Statement: the handle records the opening's
 * packets in arrival order and its captures as the boot captures; nothing
 * about the opening costs a turn; a second call and a call after a command
 * are refused; a RESTART on an opened handle runs the rebooted game's
 * opening as a new opening, apart from the restart command's own output; and
 * a handle that never calls it behaves as it did before.
 *
 * Owner context: build/test devkit layer (ADR-180).
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import type { OpeningRoutine, Story, StoryEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';

// Loaded through Node's resolver from the built dist, as the restart suite
// beside this file does and for the same reason.
const nodeRequire = createRequire(__filename);
const { assembleGame } = nodeRequire('../dist/index.js') as typeof import('./index.js');
const { EntityType, ActorTrait, IdentityTrait, RoomTrait } =
  nodeRequire('@sharpee/world-model') as typeof import('@sharpee/world-model');

const PROLOGUE = 'The tide was out, and the lamp was cold.';

/**
 * A one-room story with a prologue and, when given, a stated opening.
 *
 * @param failingOpening when true, the story registers a plugin whose
 *   opening hook throws, so the engine's opening fails after the prologue
 *   and the banner have been sent
 */
function makeStory(title: string, opening?: readonly OpeningRoutine[], failingOpening = false): Story {
  let startRoomId: string | undefined;
  return {
    ...(failingOpening
      ? {
          onEngineReady(engine: StoryEngine) {
            engine.getPluginRegistry().register({
              id: 'test.failing-opening',
              priority: 10,
              onAfterAction: () => [],
              onOpening: () => {
                throw new Error('the lamp would not light');
              },
            });
          },
        }
      : {}),
    config: {
      id: 'opening-test',
      title,
      authors: ['tester'],
      version: '1.0.0',
      description: 'The opening on the bootstrap handle',
      prologue: PROLOGUE,
    },
    ...(opening !== undefined ? { opening } : {}),
    createPlayer(world: WorldModel) {
      const player = world.createEntity('you', EntityType.ACTOR);
      player.add(new ActorTrait({ isPlayable: true }));
      player.add(new IdentityTrait({ name: 'you', description: 'A keeper.' }));
      if (startRoomId) world.moveEntity(player.id, startRoomId);
      return player;
    },
    initializeWorld(world: WorldModel) {
      const room = world.createEntity('Lamp Room', EntityType.ROOM);
      room.add(new IdentityTrait({ name: 'Lamp Room', description: 'A round room around a cold lamp.' }));
      room.add(new RoomTrait({ exits: {} }));
      startRoomId = room.id;
    },
  } as Story;
}

/** Which routine a recorded packet is, read off what it carries. */
function partOf(packet: { output: string; channels: Record<string, string[]> }): string {
  if (packet.channels['prologue']) return 'prologue';
  if (packet.channels['banner']) return 'banner';
  return packet.output ? 'look' : 'empty';
}

/** The title on a recorded banner packet. */
function bannerTitle(packet: { channels: Record<string, string[]> }): string {
  return JSON.parse(packet.channels['banner'][0]).title;
}

describe('LoadedGame.runOpening', () => {
  it('records the default opening as three packets in arrival order: prologue, banner, look', async () => {
    const game = assembleGame(makeStory('The Lamp'));
    expect(game.openingPending).toBe(true);
    expect(game.openingPackets).toEqual([]);

    const firstLook = await game.runOpening();

    expect(game.openingPackets.map(partOf)).toEqual(['prologue', 'banner', 'look']);
    expect(game.openingPackets[0].channels['prologue']).toEqual([PROLOGUE]);
    expect(bannerTitle(game.openingPackets[1])).toBe('The Lamp');
    expect(game.openingPackets[2].output).toContain('A round room around a cold lamp.');
    // The prologue and the banner are not prose: the returned text is the look.
    expect(firstLook).toBe(game.openingPackets[2].output);
    expect(firstLook).not.toContain(PROLOGUE);
    expect(game.openingPending).toBe(false);
    // The handle's last-run fields describe the opening until a command runs.
    expect(game.lastOutput).toBe(firstLook);
    expect(game.lastTurnResult?.success).toBe(true);
    expect(game.lastEvents.length).toBeGreaterThan(0);
    expect(game.lastChannels['prologue']).toEqual([PROLOGUE]);
    expect(game.lastChannelValues['prologue']).toEqual([PROLOGUE]);
  });

  it("records a reordered opening in the story's order", async () => {
    const game = assembleGame(makeStory('The Lamp', ['show-prologue', 'do-first-look', 'show-banner']));

    await game.runOpening();

    expect(game.openingPackets.map(partOf)).toEqual(['prologue', 'look', 'banner']);
  });

  it('records only what the opening names, and returns no text without a first look', async () => {
    const game = assembleGame(makeStory('The Lamp', ['show-banner']));

    const firstLook = await game.runOpening();

    expect(game.openingPackets.map(partOf)).toEqual(['banner']);
    expect(firstLook).toBe('');
    expect(game.bootChannelValues['prologue']).toBeUndefined();
  });

  it("keeps the opening's captures as the boot captures, across the first command", async () => {
    const game = assembleGame(makeStory('The Lamp'));

    await game.runOpening();
    const boot = game.bootChannelValues;
    expect(boot['prologue']).toEqual([PROLOGUE]);
    expect((boot['banner'][0] as { title: string }).title).toBe('The Lamp');

    const bootBefore = JSON.stringify(boot);

    await game.executeCommand('look');

    expect(game.bootChannelValues).toBe(boot);
    // Nothing the command sent joined the boot captures or the opening.
    expect(JSON.stringify(game.bootChannelValues)).toBe(bootBefore);
    expect(game.openingPackets).toHaveLength(3);
    // The banner was the opening's: the first command's capture has none.
    expect(game.lastChannels['banner']).toBeUndefined();
  });

  it('keeps a packet that arrives before the first command out of the boot captures', async () => {
    const game = assembleGame(makeStory('The Lamp'));
    await game.runOpening();
    const bootBefore = JSON.stringify(game.bootChannelValues);

    // A packet from outside any command, as a restore sends one.
    game.engine.emit('channel:packet', { turn: 0, payload: { prologue: 'not the opening' } } as never);

    expect(JSON.stringify(game.bootChannelValues)).toBe(bootBefore);
    expect(game.openingPackets).toHaveLength(3);
  });

  it('costs no turn: the counter stays at 1 and the first command is turn 1', async () => {
    const game = assembleGame(makeStory('The Lamp'));

    await game.runOpening();
    expect(game.engine.getContext().currentTurn).toBe(1);

    await game.executeCommand('look');
    expect(game.lastTurnResult?.turn).toBe(1);
    expect(game.engine.getContext().currentTurn).toBe(2);
  });

  it('refuses a second call, naming that the opening already ran', async () => {
    const game = assembleGame(makeStory('The Lamp'));
    await game.runOpening();

    await expect(game.runOpening()).rejects.toThrow('the opening has already run on this game');
    expect(game.openingPackets.map(partOf)).toEqual(['prologue', 'banner', 'look']);
  });

  it('refuses a call after a command, and records no opening', async () => {
    const game = assembleGame(makeStory('The Lamp'));
    await game.executeCommand('look');
    expect(game.openingPending).toBe(false);

    await expect(game.runOpening()).rejects.toThrow('a command has already been executed');
    expect(game.openingPackets).toEqual([]);
  });
});

describe('LoadedGame.openingEvents', () => {
  it('is empty until the opening runs, then holds the opening\'s events, and no command\'s events join them', async () => {
    const game = assembleGame(makeStory('First Night'));
    expect(game.openingEvents).toEqual([]);

    await game.runOpening();
    const openingTypes = game.openingEvents.map((event) => event.type);
    expect(openingTypes.length).toBeGreaterThan(0);
    // Right after the opening they are the game's last events too.
    expect(game.lastEvents.map((event) => event.type)).toEqual(openingTypes);
    const held = game.openingEvents;

    await game.executeCommand('inventory');
    // The command has events of its own, and the opening's are as they were.
    expect(game.lastEvents.length).toBeGreaterThan(0);
    expect(game.lastEvents).not.toBe(held);
    expect(game.openingEvents).toBe(held);
    expect(game.openingEvents.map((event) => event.type)).toEqual(openingTypes);
  });

  it('a RESTART\'s reboot replaces them with the new game\'s opening events, apart from the restart command\'s', async () => {
    const game = assembleGame(makeStory('First Night'), {
      freshStory: () => makeStory('Second Night'),
    });
    await game.runOpening();
    const first = game.openingEvents;
    const firstTypes = first.map((event) => event.type);

    await game.executeCommand('restart');

    expect(game.openingEvents).not.toBe(first);
    // The same story opens the same way, so the new opening's events are the same kinds.
    expect(game.openingEvents.map((event) => event.type)).toEqual(firstTypes);
    // The restart command's own events are its own, not the opening's.
    expect(game.lastEvents).not.toBe(game.openingEvents);
  });
});

describe('the restart reboot and the opening', () => {
  it('runs the rebooted game\'s opening as a new opening, apart from the restart command', async () => {
    const game = assembleGame(makeStory('First Night'), {
      freshStory: () => makeStory('Second Night'),
    });
    await game.runOpening();
    await game.executeCommand('look');
    const firstOpening = game.openingPackets;
    expect(game.engine.getContext().currentTurn).toBe(2);

    const output = await game.executeCommand('restart');

    // The command's own output is the acknowledgement alone.
    expect(output).toContain('The story restarts.');
    expect(output).not.toContain('A round room around a cold lamp.');
    expect(game.lastChannels['banner']).toBeUndefined();
    // The new game's opening replaced the old one, in order.
    expect(game.openingPackets).not.toBe(firstOpening);
    expect(game.openingPackets.map(partOf)).toEqual(['prologue', 'banner', 'look']);
    expect(bannerTitle(game.openingPackets[1])).toBe('Second Night');
    expect((game.bootChannelValues['banner'][0] as { title: string }).title).toBe('Second Night');
    // And it cost the new game no turn.
    expect(game.engine.getContext().currentTurn).toBe(1);
    await game.executeCommand('look');
    expect(game.lastTurnResult?.turn).toBe(1);
    expect(game.lastChannels['banner']).toBeUndefined();
    expect(game.openingPackets).toHaveLength(3);
  });

  it('when the rebooted opening throws, the packets and the boot captures both describe the new game', async () => {
    const game = assembleGame(makeStory('First Night'), {
      freshStory: () => makeStory('Second Night', undefined, true),
    });
    await game.runOpening();

    const output = await game.executeCommand('restart');

    expect(output).toContain('Restart failed: the lamp would not light');
    // The new game got as far as its prologue and banner.
    expect(game.openingPackets.map(partOf)).toEqual(['prologue', 'banner']);
    expect(bannerTitle(game.openingPackets[1])).toBe('Second Night');
    expect((game.bootChannelValues['banner'][0] as { title: string }).title).toBe('Second Night');
    // And the restart command's own captures are still its own.
    expect(game.lastChannels['banner']).toBeUndefined();
  });

  it('runs no opening on the reboot of a handle that was never opened', async () => {
    const game = assembleGame(makeStory('First Night'), {
      freshStory: () => makeStory('Second Night'),
    });
    const before = game.openingPackets;
    await game.executeCommand('look');

    await game.executeCommand('restart');

    expect(game.openingPackets).toBe(before);
    expect(game.openingPackets).toEqual([]);
  });
});
