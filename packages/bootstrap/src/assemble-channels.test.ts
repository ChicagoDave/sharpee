/**
 * ADR-294 D15 channel-capture tests for assembleGame().
 *
 * Real-path: a real minimal story runs through the real engine and channel
 * service; capture rides the same `channel:packet` listener production uses.
 * Verifies the two mutations the Behavior Statement names: the derived
 * capability profile (gatedBy flip) reaches engine.start, and per-command
 * captures land in game.lastChannels — plus the unknown-channel rejection.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Same loading rationale as assemble-restart.test.ts: the built dist is the
// artifact the CLI bundle consumes; importing src pulls the platform through
// vite's transform and overflows its module graph.
const nodeRequire = createRequire(__filename);
const { assembleGame, flattenChannelValue } = nodeRequire('../dist/index.js');
const { EntityType, IdentityTrait, RoomTrait } = nodeRequire('@sharpee/world-model');

function makeStory(opts?: { registerGated?: boolean }) {
  return {
    config: {
      id: 'channels-test',
      title: 'Channels Test',
      authors: ['tester'],
      version: '1.0.0',
      description: 'ADR-294 D15 channel capture test story',
    },
    createPlayer(world: any) {
      const player = world.createEntity('you', EntityType.ACTOR);
      player.add(new IdentityTrait({ name: 'you', description: 'An adventurer.' }));
      return player;
    },
    initializeWorld(world: any) {
      const room = world.createEntity('Test Chamber', EntityType.ROOM);
      room.add(new IdentityTrait({
        name: 'Test Chamber',
        description: 'A bare chamber for channel testing.',
      }));
      room.add(new RoomTrait({ exits: {} }));
      const player = world.getPlayer();
      if (player) world.moveEntity(player.id, room.id);
    },
    ...(opts?.registerGated
      ? {
          registerChannels(registry: any) {
            registry.add({
              id: 'chime',
              contentType: 'json',
              mode: 'replace',
              emit: 'always',
              gatedBy: 'sound',
              produce: () => ({ cue: 'chime', gain: 1 }),
            });
          },
        }
      : {}),
  };
}

describe('ADR-294 D15 assembleGame channel capture', () => {
  it('captures a declared standard channel per command into lastChannels', async () => {
    const game = assembleGame(makeStory(), { seed: 42, channels: ['main', 'score'] });
    await game.executeCommand('look');

    // The score channel (replace/always, ungated) emits {current, max} every
    // turn — captured as one key-sorted JSON line. main stays out of
    // lastChannels; it rides lastOutput as always.
    expect(game.lastChannels.score).toEqual(['{"current":0,"max":null}']);
    expect(game.lastChannels.main).toBeUndefined();
    expect(game.lastOutput.length).toBeGreaterThan(0);
  });

  it('flips a gated channel\'s capability on and captures it when declared', async () => {
    const game = assembleGame(makeStory({ registerGated: true }), {
      seed: 42, channels: ['main', 'chime'],
    });
    await game.executeCommand('look');
    // gatedBy: 'sound' is false in CLI_CAPABILITIES — without the D15 flip
    // the channel service would gate this channel out of every packet.
    expect(game.lastChannels.chime).toEqual(['{"cue":"chime","gain":1}']);
  });

  it('captures nothing beyond main when no channels are declared (today\'s behavior)', async () => {
    const game = assembleGame(makeStory(), { seed: 42 });
    await game.executeCommand('look');
    expect(game.lastChannels).toEqual({});
  });

  it('rejects an unknown declared channel by name', () => {
    expect(() => assembleGame(makeStory(), { seed: 42, channels: ['main', 'nonesuch'] }))
      .toThrow(/unknown channel 'nonesuch'/);
  });
});

describe('flattenChannelValue determinism', () => {
  it('splits strings, flattens arrays, and key-sorts objects', () => {
    expect(flattenChannelValue('one\ntwo')).toEqual(['one', 'two']);
    expect(flattenChannelValue([{ b: 1, a: 2 }, 'x'])).toEqual(['{"a":2,"b":1}', 'x']);
    expect(flattenChannelValue({ z: { y: 1, x: [2, null] } })).toEqual(['{"z":{"x":[2,null],"y":1}}']);
    expect(flattenChannelValue(null)).toEqual(['null']);
  });
});
