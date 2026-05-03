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
  STANDARD_CHANNELS,
  MEDIA_CHANNELS,
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

  it('lists exactly the standard + media channels initially', () => {
    const expected = new Set<string>([
      ...Object.values(STANDARD_CHANNEL_IDS),
      ...Object.values(MEDIA_CHANNEL_IDS),
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

function makeStubChannel(id: string, mode: 'replace' | 'append' | 'event' = 'replace') {
  return {
    id,
    contentType: 'text' as const,
    mode,
    emit: 'sparse' as const,
    produce: () => undefined,
  };
}
