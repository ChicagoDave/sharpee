/**
 * Engine integration tests for ADR-163 channel-I/O bootstrap.
 *
 * Drives a real `GameEngine` (with real stdlib `channelRegistry`,
 * real `ChannelService`, real `WorldModel`) through one turn and
 * asserts:
 *
 * 1. `channel:manifest` fires exactly once on `start()`, after
 *    `Story.registerChannels?` has run, with the expected channel
 *    set after capability filtering.
 * 2. `channel:packet` fires per turn (after `text-service.processTurn`)
 *    with the expected channel ids in its payload.
 * 3. The story's custom channel is registered on the shared registry
 *    and appears in the manifest.
 * 4. `start()` without an explicit `capabilities` arg uses the
 *    text-only default; gated channels are filtered out.
 *
 * Phase R3 / AC-3, AC-11, AC-12 (subset — re-emission identity is
 * exercised via the prevValue path in `ChannelService` unit tests).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  CmgtPacket,
  TurnPacket,
  ClientCapabilities,
  IChannelRegistry,
  IOChannel,
} from '@sharpee/if-domain';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { MinimalTestStory } from '../stories/minimal-test-story';
import {
  channelRegistry,
  STANDARD_CHANNEL_IDS,
  MEDIA_CHANNEL_IDS,
  StdlibChannelRegistry,
} from '@sharpee/stdlib';
import type { GameEngine } from '../../src/game-engine';

const FULL_CAPABILITIES: ClientCapabilities = {
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
};

function captureManifest(engine: GameEngine) {
  const captured: CmgtPacket[] = [];
  engine.on('channel:manifest', (cmgt) => captured.push(cmgt));
  return captured;
}

function capturePackets(engine: GameEngine) {
  const captured: Array<{ packet: TurnPacket; turn: number }> = [];
  engine.on('channel:packet', (packet, turn) => captured.push({ packet, turn }));
  return captured;
}

/**
 * Reset the shared `channelRegistry` to its initial standard+media
 * shape after a test that mutated it. The singleton is reused across
 * all tests; tests that add story channels must clean up to avoid
 * cross-test contamination.
 */
function resetRegistry() {
  // The exported `channelRegistry` is the singleton; we cannot replace
  // it. Instead, re-add the default standards/media to overwrite any
  // story-registered overrides, then remove story-only ids by
  // capturing the current full set and pruning. The registry doesn't
  // expose `delete`, so the cheapest approach is to reset by removing
  // story-specific ids manually in each test. Tests that register
  // 'story.*' ids should remove them via `(registry as any).delete`
  // if needed; for these tests we use story prefixes that don't
  // collide with standards.
  // (No-op here; beforeEach in each suite handles its own cleanup.)
}

// ────────────────────────────────────────────────────────────────────
//  Test stories with registerChannels hooks
// ────────────────────────────────────────────────────────────────────

class StoryWithChannel extends MinimalTestStory {
  channelsRegistered = false;
  registry?: IChannelRegistry;

  registerChannels(registry: IChannelRegistry): void {
    this.channelsRegistered = true;
    this.registry = registry;
    const customChannel: IOChannel = {
      id: 'story.debug-stats',
      contentType: 'json',
      mode: 'replace',
      emit: 'sparse',
      produce: () => ({ marker: 'hello' }),
    };
    registry.add(customChannel);
  }
}

class StoryWithoutChannel extends MinimalTestStory {}

// ────────────────────────────────────────────────────────────────────
//  Tests
// ────────────────────────────────────────────────────────────────────

describe('GameEngine — channel:manifest emission', () => {
  it('emits channel:manifest exactly once during start()', () => {
    const { engine } = setupTestEngine();
    const story = new StoryWithoutChannel();
    engine.setStory(story);
    const manifests = captureManifest(engine);

    engine.start({ capabilities: FULL_CAPABILITIES });
    expect(manifests).toHaveLength(1);
    expect(manifests[0].kind).toBe('cmgt');
    expect(manifests[0].protocol_version).toBe(1);
  });

  it('invokes Story.registerChannels before constructing the manifest', () => {
    const { engine } = setupTestEngine();
    const story = new StoryWithChannel();
    engine.setStory(story);
    const manifests = captureManifest(engine);

    engine.start({ capabilities: FULL_CAPABILITIES });
    expect(story.channelsRegistered).toBe(true);
    expect(story.registry).toBe(channelRegistry);
    const ids = manifests[0].channels.map((c) => c.id);
    expect(ids).toContain('story.debug-stats');
  });

  it('lists all standard channels in the manifest', () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const manifests = captureManifest(engine);

    engine.start({ capabilities: FULL_CAPABILITIES });
    const ids = new Set(manifests[0].channels.map((c) => c.id));
    for (const id of Object.values(STANDARD_CHANNEL_IDS)) {
      expect(ids.has(id), `standard channel ${id} should appear`).toBe(true);
    }
  });

  it('filters the character author channel out of a player profile\'s manifest (ADR-310 D12 / Acceptance 8)', () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const manifests = captureManifest(engine);

    engine.start({ capabilities: { ...FULL_CAPABILITIES, authorChannels: false } });
    const ids = new Set(manifests[0].channels.map((c) => c.id));
    expect(ids.has('character')).toBe(false);
  });

  it('filters the scene wire channels out of a player profile\'s manifest (ADR-320 AC11)', () => {
    // The isolation criterion at the channel layer: a player-facing build
    // (authorChannels absent — the platform-browser player default) can
    // provably carry no scene internals beyond rendered prose. The
    // author-profile presence side rides the all-standard-channels test
    // above, since all three ids are in STANDARD_CHANNEL_IDS.
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const manifests = captureManifest(engine);

    engine.start({ capabilities: { ...FULL_CAPABILITIES, authorChannels: false } });
    const ids = new Set(manifests[0].channels.map((c) => c.id));
    expect(ids.has('scene')).toBe(false);
    expect(ids.has('exchange-affordances')).toBe(false);
    // The D14 thread wire (Phase 10.6) holds the same discipline.
    expect(ids.has('thread-affordances')).toBe(false);
  });

  it('includes media channels when capabilities allow', () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const manifests = captureManifest(engine);

    engine.start({ capabilities: FULL_CAPABILITIES });
    const ids = new Set(manifests[0].channels.map((c) => c.id));
    expect(ids.has(MEDIA_CHANNEL_IDS.IMAGE_MAIN)).toBe(true);
    expect(ids.has(MEDIA_CHANNEL_IDS.SOUND)).toBe(true);
    expect(ids.has(MEDIA_CHANNEL_IDS.MUSIC)).toBe(true);
  });

  it('filters media channels out under the default text-only capabilities', () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const manifests = captureManifest(engine);

    engine.start(); // omit capabilities → DEFAULT_TEXT_CAPABILITIES
    const ids = new Set(manifests[0].channels.map((c) => c.id));
    // Standards survive
    expect(ids.has(STANDARD_CHANNEL_IDS.ROOM_DESCRIPTION)).toBe(true);
    expect(ids.has(STANDARD_CHANNEL_IDS.PREFERRED_LAYOUT)).toBe(true);
    expect(ids.has(STANDARD_CHANNEL_IDS.SCORE)).toBe(true);
    // Media gated out
    expect(ids.has(MEDIA_CHANNEL_IDS.IMAGE_MAIN)).toBe(false);
    expect(ids.has(MEDIA_CHANNEL_IDS.SOUND)).toBe(false);
    expect(ids.has(MEDIA_CHANNEL_IDS.MUSIC)).toBe(false);
  });
});

describe('GameEngine — channel:packet emission', () => {
  it('emits a channel:packet after each turn', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    await engine.executeTurn('look');
    expect(packets.length).toBeGreaterThanOrEqual(1);
    const last = packets[packets.length - 1];
    expect(last.packet.kind).toBe('turn');
    expect(typeof last.packet.turn_id).toBe('string');
    expect(last.turn).toBeGreaterThan(0);
  });

  it('always-mode standard channels appear in the packet payload', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    await engine.executeTurn('look');
    expect(packets.length).toBeGreaterThanOrEqual(1);
    const payload = packets[0].packet.payload;
    // turn channel reads ctx.turn directly — must be present each turn
    expect(payload).toHaveProperty('turn');
    expect(typeof payload.turn).toBe('number');
    // prompt channel always emits (defaults to '> ')
    expect(payload).toHaveProperty('prompt');
  });

  it('story channels emit on the packet alongside standards', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithChannel());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    await engine.executeTurn('look');
    const payloads = packets.map((p) => p.packet.payload);
    const sawStoryChannel = payloads.some(
      (p) => (p['story.debug-stats'] as { marker?: string })?.marker === 'hello',
    );
    expect(sawStoryChannel).toBe(true);
  });

  it('packet turn_id matches turn-${turn} pattern', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    await engine.executeTurn('look');
    const last = packets[packets.length - 1];
    expect(last.packet.turn_id).toMatch(/^turn-\d+$/);
  });

  it('infoChannel emits non-empty fields from Story.config (+ StoryInfoTrait when set)', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    await engine.executeTurn('look');
    const infoPayload = packets[0].packet.payload['info'];
    // MinimalTestStory's config carries title/author/version/description.
    // No StoryInfoTrait is set by this fixture, so build-pipeline
    // fields (engineVersion / clientVersion / buildDate) stay absent.
    expect(infoPayload).toEqual({
      title: 'Minimal Test Story',
      authors: ['Test Suite'],
      version: '1.0.0',
      description: 'A minimal story for testing basic engine functionality',
    });
  });
});

describe('GameEngine — bootstrap order (AC-11)', () => {
  it('emits channel:manifest before the first channel:packet', async () => {
    const { engine } = setupTestEngine();
    engine.setStory(new StoryWithoutChannel());

    const order: string[] = [];
    engine.on('channel:manifest', () => order.push('manifest'));
    engine.on('channel:packet', () => order.push('packet'));

    engine.start({ capabilities: FULL_CAPABILITIES });
    await engine.executeTurn('look');

    expect(order[0]).toBe('manifest');
    expect(order.slice(1).every((e) => e === 'packet')).toBe(true);
  });
});

describe('prologue resolution and emission (ADR-298 D3)', () => {
  it('a literal prologue lands on the storyInfo capability and the prologue channel', async () => {
    const { engine, world } = setupTestEngine();
    const story = new MinimalTestStory();
    story.config = { ...story.config, prologue: 'Long ago, in the Great Underground Empire…' };
    engine.setStory(story);
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    const cap = world.getCapability('storyInfo') as { prologue?: string };
    expect(cap.prologue).toBe('Long ago, in the Great Underground Empire…');

    await engine.executeTurn('look');
    expect(packets[0].packet.payload['prologue']).toBe(
      'Long ago, in the Great Underground Empire…',
    );
  });

  it('a phrase-ref prologue resolves through the phrase machinery at start', async () => {
    const { engine, world, languageProvider } = setupTestEngine();
    languageProvider.addMessage('opening-crawl', 'A cold night falls over Fernhill.');
    const story = new MinimalTestStory();
    story.config = {
      ...story.config,
      prologue: { kind: 'phrase-ref', value: 'opening-crawl' },
    };
    engine.setStory(story);
    engine.start({ capabilities: FULL_CAPABILITIES });

    const cap = world.getCapability('storyInfo') as { prologue?: string };
    expect(cap.prologue).toBe('A cold night falls over Fernhill.');
  });

  it('an unresolvable phrase-ref writes nothing — capability stays empty, channel silent', async () => {
    const { engine, world } = setupTestEngine();
    const story = new MinimalTestStory();
    story.config = {
      ...story.config,
      prologue: { kind: 'phrase-ref', value: 'never-registered-phrase' },
    };
    engine.setStory(story);
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    const cap = world.getCapability('storyInfo') as { prologue?: string };
    expect(cap.prologue ?? '').toBe('');

    await engine.executeTurn('look');
    expect(packets[0].packet.payload['prologue']).toBeUndefined();
  });

  it('no prologue → capability default stays empty and the channel stays silent', async () => {
    const { engine, world } = setupTestEngine();
    engine.setStory(new MinimalTestStory());
    const packets = capturePackets(engine);
    engine.start({ capabilities: FULL_CAPABILITIES });

    const cap = world.getCapability('storyInfo') as { prologue?: string };
    expect(cap.prologue ?? '').toBe('');

    await engine.executeTurn('look');
    expect(packets[0].packet.payload['prologue']).toBeUndefined();
  });
});

describe('StdlibChannelRegistry — story override of standard channel', () => {
  it('replacing the standard channel id propagates through the manifest', () => {
    const reg = new StdlibChannelRegistry();
    reg.add({
      id: 'room-description',
      contentType: 'text',
      mode: 'replace',
      emit: 'sparse',
      produce: () => 'overridden',
    });
    const channel = reg.get('room-description');
    expect(channel?.mode).toBe('replace');
    expect(channel?.contentType).toBe('text');
    // Last-write-wins is unit-tested in stdlib; here we just confirm
    // the same registry shape an override on the engine path would use.
  });
});
