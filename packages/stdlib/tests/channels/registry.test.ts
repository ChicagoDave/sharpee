/**
 * Tests for `channelRegistry` — the pre-populated stdlib channel
 * registry instance (ADR-163 §7, §13, §14).
 */

import { describe, expect, it } from 'vitest';
import {
  channelRegistry,
  StdlibChannelRegistry,
  STANDARD_CHANNEL_IDS,
  MEDIA_CHANNEL_IDS,
  SOUND_CHANNEL_IDS,
  STANDARD_CHANNELS,
  MEDIA_CHANNELS,
  SOUND_CHANNELS,
} from '../../src/channels';

describe('channelRegistry', () => {
  it('pre-registers all ten standard channels at module init', () => {
    for (const id of Object.values(STANDARD_CHANNEL_IDS)) {
      expect(channelRegistry.get(id), `expected ${id}`).toBeDefined();
    }
  });

  it('pre-registers all eleven static media channels at module init', () => {
    for (const id of Object.values(MEDIA_CHANNEL_IDS)) {
      expect(channelRegistry.get(id), `expected ${id}`).toBeDefined();
    }
  });

  it('pre-registers the sound subsystem channels at module init (ADR-172)', () => {
    for (const id of Object.values(SOUND_CHANNEL_IDS)) {
      expect(channelRegistry.get(id), `expected ${id}`).toBeDefined();
    }
  });

  it('lists exactly the standard + media + sound channels initially', () => {
    const expected = new Set<string>([
      ...Object.values(STANDARD_CHANNEL_IDS),
      ...Object.values(MEDIA_CHANNEL_IDS),
      ...Object.values(SOUND_CHANNEL_IDS),
    ]);
    const actual = new Set(channelRegistry.all().map((c) => c.id));
    expect(actual).toEqual(expected);
  });

  it('STANDARD_CHANNELS array matches the channels stored under the standard ids', () => {
    for (const channel of STANDARD_CHANNELS) {
      expect(channelRegistry.get(channel.id)).toBe(channel);
    }
  });

  it('MEDIA_CHANNELS array matches the channels stored under the media ids', () => {
    for (const channel of MEDIA_CHANNELS) {
      expect(channelRegistry.get(channel.id)).toBe(channel);
    }
  });

  it('SOUND_CHANNELS array matches the channels stored under the sound ids (ADR-172)', () => {
    for (const channel of SOUND_CHANNELS) {
      expect(channelRegistry.get(channel.id)).toBe(channel);
    }
  });
});

describe('StdlibChannelRegistry — last-write-wins', () => {
  it('add(channel) replaces a prior registration with the same id', () => {
    const reg = new StdlibChannelRegistry();
    const a = makeStubChannel('foo', 'replace');
    const b = makeStubChannel('foo', 'append');
    reg.add(a);
    reg.add(b);
    expect(reg.get('foo')).toBe(b);
    expect(reg.all().filter((c) => c.id === 'foo')).toHaveLength(1);
  });

  it('preserves insertion order for ids()', () => {
    const reg = new StdlibChannelRegistry();
    reg.add(makeStubChannel('c'));
    reg.add(makeStubChannel('a'));
    reg.add(makeStubChannel('b'));
    expect(reg.ids()).toEqual(['c', 'a', 'b']);
  });

  it('re-registering keeps original insertion position', () => {
    const reg = new StdlibChannelRegistry();
    reg.add(makeStubChannel('c'));
    reg.add(makeStubChannel('a'));
    reg.add(makeStubChannel('c', 'append'));
    expect(reg.ids()).toEqual(['c', 'a']);
  });
});

describe('StdlibChannelRegistry — registration position (ADR-330 D4 amended)', () => {
  it('add(channel, { before }) places a new id immediately before the named one, others keeping their order', () => {
    const reg = new StdlibChannelRegistry();
    reg.add(makeStubChannel('banner'));
    reg.add(makeStubChannel('room-name'));
    reg.add(makeStubChannel('preferred-layout'));
    const chapter = makeStubChannel('story.chapter');
    reg.add(chapter, { before: 'room-name' });
    expect(reg.ids()).toEqual(['banner', 'story.chapter', 'room-name', 'preferred-layout']);
    expect(reg.all().map((c) => c.id)).toEqual(['banner', 'story.chapter', 'room-name', 'preferred-layout']);
    expect(reg.get('story.chapter')).toBe(chapter);
  });

  it('an unknown before-id throws, naming both ids, and registers nothing', () => {
    const reg = new StdlibChannelRegistry();
    reg.add(makeStubChannel('banner'));
    expect(() => reg.add(makeStubChannel('story.chapter'), { before: 'room-nmae' })).toThrow(
      /'story\.chapter'.*'room-nmae'/,
    );
    expect(reg.get('story.chapter')).toBeUndefined();
    expect(reg.ids()).toEqual(['banner']);
  });

  it('re-adding an existing id with a position replaces it in place and does not move it', () => {
    const reg = new StdlibChannelRegistry();
    reg.add(makeStubChannel('banner'));
    reg.add(makeStubChannel('story.chapter'));
    reg.add(makeStubChannel('room-name'));
    const replacement = makeStubChannel('room-name', 'append');
    reg.add(replacement, { before: 'banner' });
    expect(reg.ids()).toEqual(['banner', 'story.chapter', 'room-name']);
    expect(reg.get('room-name')).toBe(replacement);
  });

  it('the canonical registry places a channel registered before room-name after banner and ahead of every prose channel', () => {
    const reg = new StdlibChannelRegistry();
    for (const channel of STANDARD_CHANNELS) reg.add(channel);
    reg.add(makeStubChannel('story.chapter'), { before: 'room-name' });
    const ids = reg.ids();
    const at = (id: string) => ids.indexOf(id);
    expect(at('story.chapter')).toBe(at('banner') + 1);
    expect(at('story.chapter')).toBe(at('room-name') - 1);
    expect(at('story.chapter')).toBeLessThan(at('preferred-layout'));
  });
});

function makeStubChannel(id: string, mode: 'replace' | 'append' | 'event' = 'replace') {
  return {
    id,
    contentType: 'text' as const,
    mode,
    emit: 'sparse' as const,
    produce: () => undefined,
  };
}
