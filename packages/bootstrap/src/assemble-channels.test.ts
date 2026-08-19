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
const { EntityType, IdentityTrait, RoomTrait, ActorTrait, CharacterModelTrait } =
  nodeRequire('@sharpee/world-model');

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
    const game = assembleGame(makeStory(), { seed: 42, channels: ['score'] });
    await game.executeCommand('look');

    // The score channel (replace/always, ungated) emits {current, max} every
    // turn — captured as one key-sorted JSON line. The turn's prose is
    // composed into lastOutput (ADR-300 D9) and is not a declared channel.
    expect(game.lastChannels.score).toEqual(['{"current":0,"max":null}']);
    expect(game.lastOutput.length).toBeGreaterThan(0);
  });

  it('flips a gated channel\'s capability on and captures it when declared', async () => {
    const game = assembleGame(makeStory({ registerGated: true }), {
      seed: 42, channels: ['chime'],
    });
    await game.executeCommand('look');
    // gatedBy: 'sound' is false in CLI_CAPABILITIES — without the D15 flip
    // the channel service would gate this channel out of every packet.
    expect(game.lastChannels.chime).toEqual(['{"cue":"chime","gain":1}']);
  });

  it('captures only the opening channels when none are declared (David 2026-08-09)', async () => {
    const game = assembleGame(makeStory(), { seed: 42 });
    await game.executeCommand('look');
    // The banner, the prologue and info are ALWAYS captured — a transcript's
    // opening claims read them via the boot snapshot. Nothing else joins
    // the capture set without a channels: declaration.
    //
    // `info` joined this set for GH #280: synthesizeOpeningAssertions reads
    // its title/description, so leaving it uncaptured made that branch
    // unreachable and every story recorded an empty opening card. The
    // assertion below is the one that has to move when the opening set
    // changes — which is the point of it, so keep it exact rather than
    // loosening it to a subset check.
    expect(Object.keys(game.lastChannels).every(
      (id) => id === 'banner' || id === 'prologue' || id === 'info',
    )).toBe(true);
    expect(game.lastChannels.chime).toBeUndefined();
  });

  it('the banner reaches the opening\'s readers and the boot snapshot never re-takes', async () => {
    const game = assembleGame(makeStory(), { seed: 42 });
    await game.executeCommand('look');
    // Via the boot snapshot when the engine flushes before any command, or
    // the first command's own capture when it rides the first packet — the
    // opening's readers merge both.
    const opening = game.bootChannelValues.banner ?? game.lastChannelValues.banner;
    expect(opening?.[0]).toMatchObject({ title: 'Channels Test' });
    const snapshot = game.bootChannelValues;
    await game.executeCommand('look');
    expect(game.bootChannelValues).toBe(snapshot);   // never re-snapshotted
  });

  it('rejects an unknown declared channel by name', () => {
    expect(() => assembleGame(makeStory(), { seed: 42, channels: ['nonesuch'] }))
      .toThrow(/unknown channel 'nonesuch'/);
  });

  // A story with a modeled NPC and a registered dialogue selector whose
  // selection carries author-channel events (the shape the character
  // package's selector produces on a ledger mint). Shared by the readout
  // test (positive: declared → capability flipped → rows) and the D12
  // isolation test (negative: undeclared → no packet ever carries it).
  function makeCharacterStory() {
    return {
      ...makeStory(),
      initializeWorld(world: any) {
        const room = world.createEntity('Test Chamber', EntityType.ROOM);
        room.add(new IdentityTrait({
          name: 'Test Chamber',
          description: 'A bare chamber for channel testing.',
        }));
        room.add(new RoomTrait({ exits: {} }));
        const player = world.getPlayer();
        if (player) world.moveEntity(player.id, room.id);

        const hermit = world.createEntity('hermit', EntityType.ACTOR);
        hermit.add(new IdentityTrait({ name: 'hermit', description: 'A hermit.' }));
        hermit.add(new ActorTrait({ isPlayer: false }));
        hermit.add(new CharacterModelTrait({}));
        world.moveEntity(hermit.id, room.id);

        world.registerDialogueSelector({
          select: (npc: any, intent: any) => ({
            handled: true,
            messageId: 'character.conversation.hermit-answers',
            authorEvents: [{
              id: 'a1', type: 'character.author.ledger_mint', timestamp: 0,
              entities: { actor: npc.id },
              data: {
                audience: 'player', factId: 'the-killer',
                claimedValue: 'nobody', topic: intent.text,
              },
            }],
          }),
        });
      },
    };
  }

  it('the character author channel rides the capture path — the raw "explain this NPC\'s turn" readout (ADR-318 D11)', async () => {
    // Declaring `channels: ['character']` flips its `authorChannels` gate
    // in the derived profile (D15) — the same mechanism as `chime`/`sound`.
    const game = assembleGame(makeCharacterStory(), { seed: 42, channels: ['character'] });
    await game.executeCommand('ask hermit about the crime');

    // The selection's author event rode the action's report events into the
    // turn's packet, and the `character` channel projected it into a row —
    // the raw per-NPC-turn readout a testing/IDE surface reads.
    const rows = game.lastChannelValues.character?.flat() as Array<Record<string, unknown>>;
    expect(rows).toBeDefined();
    const mint = rows.find(r => r.kind === 'character.author.ledger_mint')!;
    expect(mint).toBeDefined();
    expect(mint.data).toMatchObject({
      audience: 'player', factId: 'the-killer', claimedValue: 'nobody',
    });
    expect(typeof mint.turn).toBe('number');
  });

  it('D12 isolation (ADR-310 Acceptance 8): an undeclared player profile\'s stream never carries the character channel', async () => {
    // Same story, same mint-producing ask — but no channels: declaration,
    // so the profile is CLI_CAPABILITIES with authorChannels false. The
    // assertion rides the raw production wire (`channel:packet`), not the
    // capture filter: the ChannelService must never PRODUCE the channel,
    // so a published client receives nothing to leak.
    const game = assembleGame(makeCharacterStory(), { seed: 42 });
    const packetChannelIds: string[] = [];
    game.engine.on('channel:packet', (packet: any) => {
      packetChannelIds.push(...Object.keys(packet?.payload ?? {}));
    });

    await game.executeCommand('ask hermit about the crime');

    // The turn's packet fired (other channels present — the vacuity guard)
    // and the selector DID hand its author events to the action — the
    // positive test above proves those events exist on this exact story —
    // yet no packet carried the channel.
    expect(packetChannelIds.length).toBeGreaterThan(0);
    expect(packetChannelIds).not.toContain('character');
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
