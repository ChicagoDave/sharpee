/**
 * ADR-248 harness reboot tests for assembleGame().
 *
 * Real-path: a real minimal story runs through the real engine; RESTART
 * flows through the stdlib restarting action, the engine's platform-op
 * processing (ack + stop('restart')), and assembleGame's deferred
 * in-place reboot via the freshStory provider.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Load through Node's resolver, not vite's transform: importing bootstrap's
// index pulls the entire platform through vite and overflows its module
// graph. The built dist is the artifact the CLI bundle actually consumes,
// so this is also the more faithful surface. (Requires a built bootstrap —
// same precondition as everything else that consumes dist.)
const nodeRequire = createRequire(__filename);
const { assembleGame } = nodeRequire('../dist/index.js');
const { EntityType, IdentityTrait, RoomTrait } = nodeRequire('@sharpee/world-model');

interface TestStoryHandle {
  story: any;
  /** How many times initializeWorld ran on this instance. */
  initCount(): number;
}

let instanceCounter = 0;

function makeStory(): TestStoryHandle {
  let inits = 0;
  const instanceId = ++instanceCounter;
  const story = {
    config: {
      id: 'restart-test',
      title: `Restart Test #${instanceId}`,
      authors: ['tester'],
      version: '1.0.0',
      description: 'ADR-248 harness reboot test story',
    },
    createPlayer(world: any) {
      const player = world.createEntity('you', EntityType.ACTOR);
      player.add(new IdentityTrait({ name: 'you', description: 'An adventurer.' }));
      return player;
    },
    initializeWorld(world: any) {
      inits += 1;
      const room = world.createEntity('Test Chamber', EntityType.ROOM);
      room.add(new IdentityTrait({
        name: 'Test Chamber',
        description: 'A bare chamber for restart testing.',
      }));
      room.add(new RoomTrait({ exits: {} }));
      const player = world.getPlayer();
      if (player) world.moveEntity(player.id, room.id);
    },
  };
  return { story, initCount: () => inits };
}

describe('ADR-248 assembleGame restart reboot', () => {
  it('reboots in place on RESTART: fresh engine/world/story, ack + banner in the output', async () => {
    const first = makeStory();
    const second = makeStory();
    let freshCalls = 0;

    const game = assembleGame(first.story, {
      // The banner is its own channel now, so declare it — that is where the
      // rebooted story's identity shows up.
      channels: ['banner'],
      freshStory: () => {
        freshCalls += 1;
        return second.story;
      },
    });

    const engineBefore = game.engine;
    const worldBefore = game.world;
    expect(first.initCount()).toBe(1);

    const output = await game.executeCommand('restart');

    // Ack from the dying engine's final packet; no restart_completed claim.
    expect(output).toContain('The story restarts.');

    // The reboot actually swapped engine, world, and story.
    expect(freshCalls).toBe(1);
    expect(game.engine).not.toBe(engineBefore);
    expect(game.world).not.toBe(worldBefore);
    expect(second.initCount()).toBe(1);
    // The first instance was NOT re-initialized (initializeWorld runs at
    // most once per story instance — the re-entrancy contract is gone).
    expect(first.initCount()).toBe(1);

    // The rebooted game keeps executing turns through the same handle, and
    // renders the SECOND instance's banner — proof the fresh story took.
    const look = await game.executeCommand('look');
    expect(look).toContain('Test Chamber');

    // The banner travels on its own channel, carrying the title as a property
    // rather than a line of prose mixed into the room description.
    const banner = JSON.parse(game.lastChannels.banner[0]);
    expect(banner.title).toContain('Restart Test #');
    expect(banner.title).toBe(second.story.config.title);
  });

  it('#227 — a runner registering save/restore hooks does not disable the reboot', async () => {
    // The real path for issue #227, end to end: bootstrap registers
    // onRestartRequested at boot, a harness then registers its own save and
    // restore hooks on the same engine, and the reboot must still fire. Before
    // the #229 merge fix, the second registration replaced the hook object,
    // `shouldRestart` defaulted to true, and the engine acked and stopped
    // without ever rebooting — leaving every later command dead.
    const first = makeStory();
    const second = makeStory();
    let freshCalls = 0;

    const game = assembleGame(first.story, {
      freshStory: () => {
        freshCalls += 1;
        return second.story;
      },
    });

    let captured: unknown = null;
    game.engine.registerSaveRestoreHooks({
      onSaveRequested: async (data: unknown) => { captured = data; },
      onRestoreRequested: async () => null,
    });

    // The harness's own hooks work — merging did not cost it its registration.
    await expect(game.engine.save()).resolves.toBe(true);
    expect(captured).not.toBeNull();

    const output = await game.executeCommand('restart');
    expect(output).toContain('The story restarts.');
    expect(freshCalls).toBe(1);

    // The engine is alive on the other side. This is the assertion that failed
    // as "Error: Engine is not running" for every node with a parent.
    const look = await game.executeCommand('look');
    expect(look).toContain('Test Chamber');
    expect(look).not.toContain('Engine is not running');
  });

  it('without a freshStory provider, a confirmed restart surfaces an honest error', async () => {
    const { story } = makeStory();
    const game = assembleGame(story);

    const output = await game.executeCommand('restart');

    expect(output).toContain('Restart failed:');
    expect(output).toContain('no freshStory provider');
  });
});
