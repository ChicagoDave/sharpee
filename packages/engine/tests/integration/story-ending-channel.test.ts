/**
 * The ending reaches the client as state, over a real turn (ADR-347
 * D3a, AC-6; rule 13a).
 *
 * Not a stub of the channel service and not the closure in isolation —
 * a real `GameEngine` driven through `executeTurn`, so the packet these
 * assertions read is the packet a browser would receive. The unit
 * checks on the closure and on the browser renderer live in their own
 * packages; this is the one that proves the two ends meet.
 */

import { describe, it, expect } from 'vitest';
import type { ClientCapabilities } from '@sharpee/if-domain';
import { endStory } from '@sharpee/stdlib';
import type { TurnPacket } from '@sharpee/channel-service';
import { GameEngine } from '../../src/game-engine';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

/** A started engine on the minimal story, with its packets captured. */
function started(): { engine: GameEngine; world: ReturnType<GameEngine['getWorld']>; packets: TurnPacket[] } {
  const { engine } = setupTestEngine();
  engine.installStory(new MinimalTestStory());
  const packets = capturePackets(engine);
  engine.start({ capabilities: CAPABILITIES });
  return { engine, world: engine.getWorld(), packets };
}

const CAPABILITIES = {
  text: true,
  images: true,
  animations: true,
  video: true,
  sound: true,
  music: true,
  speech: true,
  splitPane: true,
  statusBar: true,
  sidebar: true,
  clickableText: true,
  clickableImage: true,
  dragDrop: true,
  transitions: true,
  layers: true,
  customFonts: true,
  authorChannels: true,
} as unknown as ClientCapabilities;

function capturePackets(engine: GameEngine): TurnPacket[] {
  const packets: TurnPacket[] = [];
  engine.on('channel:packet', (packet: TurnPacket) => packets.push(packet));
  return packets;
}

describe('the ending reaches the client as state (ADR-347 D3a)', () => {
  it('AC-6: the turn that ends the story carries the Ending record and the end-game prompt', async () => {
    const { engine, world, packets } = started();

    // The declaring site is the story reacting to a real command, which is
    // where a `win` rule or a scoring handler would sit.
    engine.getEventProcessor().registerHandler('if.event.taken', () => {
      endStory(world, 'victory', { turn: 1, messageId: 'won.phrase' });
      return [];
    });

    await engine.executeTurn('take lamp');

    const packet = packets[packets.length - 1];
    // The record itself — kind and all — not a message about it.
    expect(packet.payload['story-ending']).toMatchObject({
      kind: 'victory',
      turn: 1,
      messageId: 'won.phrase',
    });
    // And the prompt the same turn carries is the end-game one, derived
    // from the same Ending, so no client hardcodes it.
    expect(packet.payload.prompt).toContain('RESTART');
  });

  it('a death carries it too — the stage that declares it runs before the render', async () => {
    // The case the stage order exists for: a death is declared by the
    // engine, not the story, and it used to be declared after the turn had
    // already rendered and shipped its packet.
    const { engine, world, packets } = started();
    const emittedTypes: string[] = [];
    engine.on('event', (event: { type: string }) => emittedTypes.push(event.type));

    const { killPlayer } = await import('@sharpee/stdlib');
    engine.getEventProcessor().registerHandler('if.event.taken', () => {
      const died = killPlayer(world, world.getPlayer()!, { cause: 'grue' });
      return died ? [{ type: 'emit', event: died }] : [];
    });

    const result = await engine.executeTurn('take lamp');

    const packet = packets[packets.length - 1];
    expect(packet.payload['story-ending']).toMatchObject({ kind: 'defeat', cause: 'grue' });
    expect(packet.payload.prompt).toContain('RESTART');

    // Every outcome is reported. A story's `win`/`lose` emits through the
    // statement that declared it; a death is declared by the engine, so
    // the engine reports it — once, on the turn's own stream.
    const defeats = result.events.filter((e) => e.type === 'story.defeat');
    expect(defeats).toHaveLength(1);
    expect(defeats[0].data).toMatchObject({ ending: 'defeat', cause: 'grue' });
    expect(emittedTypes).toContain('story.defeat');
  });

  it('stays quiet on an ordinary turn', async () => {
    const { engine, packets } = started();

    await engine.executeTurn('look');

    const packet = packets[packets.length - 1];
    expect(packet.payload).not.toHaveProperty('story-ending');
  });

  it('clears when a RESTORE at the end-game prompt takes the player back to a live turn', async () => {
    const { engine, world, packets } = started();

    const live = engine['createSaveData']();
    engine.registerSaveRestoreHooks({ onRestoreRequested: async () => live });
    // The RESTORE action refuses when the world lists no user save slot
    // (`restoring.ts` validate), so give it one — this test is about what
    // the channel does afterwards, not about that guard.
    engine.getWorld().registerCapability('sharedData');
    engine.getWorld().updateCapability('sharedData', { saves: { slot1: { turn: 1 } } });

    engine.getEventProcessor().registerHandler('if.event.taken', () => {
      endStory(world, 'victory', { turn: 1 });
      return [];
    });
    await engine.executeTurn('take lamp');
    expect(packets[packets.length - 1].payload['story-ending']).toMatchObject({ kind: 'victory' });
    expect(engine['phase'].name).toBe('stopped');

    // RESTORE is one of the verbs a stopped engine accepts (ADR-345 D15),
    // and it produces a packet of its own through `meta-render`.
    await engine.executeTurn('restore');

    expect(world.getEnding()).toBeUndefined();
    expect(engine['phase'].name).toBe('playing');
    const after = packets[packets.length - 1];
    // `null` is the clear signal: the client re-enables the input it
    // disabled. `undefined` would have meant "nothing to say" and left the
    // player locked out of a live game.
    expect(after.payload['story-ending']).toBeNull();
    expect(after.payload.prompt).not.toContain('RESTART');
  });
});
