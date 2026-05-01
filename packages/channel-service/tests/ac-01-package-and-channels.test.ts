/**
 * AC-1 — Package and standard channels.
 *
 * `@sharpee/channel-service` exists, exposes the decision-12 API, ships
 * the ten standard channels from §4, and the platform rules cover all
 * 12 `CORE_BLOCK_KEYS`.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';
import {
  STANDARD_CHANNELS,
  STANDARD_CHANNEL_IDS,
  platformRules,
  registerStandardChannels,
  registerPlatformRules,
  registerHello,
  registerChannel,
  getChannelRegistry,
  addRule,
  addRules,
  produceCmgtManifest,
  produceTurnPacket,
  resetSession,
  PROTOCOL_VERSION,
} from '../src';

const fullCaps = {
  text: true as const,
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
};

beforeEach(() => {
  resetSession();
});

describe('AC-1 — public API surface (decision 12)', () => {
  it('exposes the registry functions', () => {
    expect(typeof registerHello).toBe('function');
    expect(typeof registerChannel).toBe('function');
    expect(typeof getChannelRegistry).toBe('function');
    expect(typeof addRule).toBe('function');
    expect(typeof addRules).toBe('function');
  });

  it('exposes the producers', () => {
    expect(typeof produceCmgtManifest).toBe('function');
    expect(typeof produceTurnPacket).toBe('function');
  });

  it('exposes a numeric protocol version', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});

describe('AC-1 — ten standard channels (§4)', () => {
  it('exports exactly ten standard channel definitions', () => {
    expect(STANDARD_CHANNELS).toHaveLength(10);
  });

  it('matches the §4 table: id, contentType, mode, emit policy', () => {
    const byId = new Map(STANDARD_CHANNELS.map((c) => [c.id, c]));

    expect(byId.get('main')).toEqual({
      id: 'main',
      contentType: 'json',
      mode: 'append',
      emit: 'always',
    });
    expect(byId.get('prompt')).toEqual({
      id: 'prompt',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });
    expect(byId.get('location')).toEqual({
      id: 'location',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });
    expect(byId.get('score')).toEqual({
      id: 'score',
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
    });
    expect(byId.get('turn')).toEqual({
      id: 'turn',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
    });
    expect(byId.get('death')).toEqual({
      id: 'death',
      contentType: 'text',
      mode: 'event',
      emit: 'always',
    });
    expect(byId.get('endgame')).toEqual({
      id: 'endgame',
      contentType: 'text',
      mode: 'event',
      emit: 'always',
    });
    expect(byId.get('score_notify')).toEqual({
      id: 'score_notify',
      contentType: 'text',
      mode: 'event',
      emit: 'always',
    });
    expect(byId.get('info')).toEqual({
      id: 'info',
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
    });
    expect(byId.get('ifid')).toEqual({
      id: 'ifid',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });
  });

  it('every standard channel registers with emit:always (§5 invariant)', () => {
    for (const def of STANDARD_CHANNELS) {
      expect(def.emit).toBe('always');
    }
  });

  it('STANDARD_CHANNEL_IDS literal map matches the channel ids', () => {
    const idsFromMap = new Set(Object.values(STANDARD_CHANNEL_IDS));
    const idsFromArray = new Set(STANDARD_CHANNELS.map((c) => c.id));
    expect(idsFromMap).toEqual(idsFromArray);
  });

  it('registerStandardChannels installs all ten into the registry', () => {
    registerHello(fullCaps);
    registerStandardChannels();
    const registered = getChannelRegistry();
    expect(registered).toHaveLength(10);
    const ids = new Set(registered.map((c) => c.id));
    for (const def of STANDARD_CHANNELS) {
      expect(ids.has(def.id)).toBe(true);
    }
  });
});

describe('AC-1 — platformRules covers 12 CORE_BLOCK_KEYS', () => {
  it('every CORE_BLOCK_KEY has at least one rule keyed on it', () => {
    const ruleKeys = new Set(
      platformRules
        .map((r) => r.when.key)
        .filter((k): k is string => typeof k === 'string'),
    );

    for (const key of Object.values(CORE_BLOCK_KEYS)) {
      expect(ruleKeys.has(key)).toBe(true);
    }
  });

  it('every platform rule emits to a registered standard channel', () => {
    const standardIds = new Set(STANDARD_CHANNELS.map((c) => c.id));
    for (const rule of platformRules) {
      expect(standardIds.has(rule.emit.channel)).toBe(true);
    }
  });

  it('registerPlatformRules installs all rules', () => {
    registerHello(fullCaps);
    registerStandardChannels();
    registerPlatformRules();
    const manifest = produceCmgtManifest(fullCaps);
    expect(manifest.channels).toHaveLength(10);
  });
});
