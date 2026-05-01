/**
 * AC-5 — Per-client CMGT filtering.
 *
 * Two clients connect to the same source with different capabilities;
 * their CMGT manifests differ exactly on the capability-gated media
 * channels. Standard channels appear in both regardless of capability.
 *
 * Each "client" is one full bootstrap cycle (resetSession, register,
 * produceCmgtManifest). This is what multi-user workers (ADR-164) do
 * per request; single-user surfaces do it once per process boot.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerHello,
  registerChannel,
  registerStandardChannels,
  produceCmgtManifest,
  resetSession,
  type ClientCapabilities,
  type ChannelDefinition,
  type CmgtPacket,
} from '../src';

function makeCaps(overrides: Partial<ClientCapabilities>): ClientCapabilities {
  return {
    text: true,
    images: false,
    animations: false,
    video: false,
    sound: false,
    music: false,
    speech: false,
    splitPane: false,
    statusBar: false,
    sidebar: false,
    clickableText: false,
    clickableImage: false,
    dragDrop: false,
    transitions: false,
    layers: false,
    customFonts: false,
    ...overrides,
  };
}

/**
 * Bootstrap a fresh session and register the test channel set:
 * - Ten standard channels (always pass through — never gated)
 * - Three media channels (gated): `image:main` (images), `image:bg`
 *   (images), `sound` (sound)
 * Story init runs unconditionally per ADR-163 §11.
 */
function bootstrap(caps: ClientCapabilities): CmgtPacket {
  resetSession();
  registerHello(caps);
  registerStandardChannels();
  registerChannel(
    { id: 'image:main', contentType: 'json', mode: 'replace', emit: 'always' },
    { gatedBy: 'images' },
  );
  registerChannel(
    { id: 'image:bg', contentType: 'json', mode: 'replace', emit: 'always' },
    { gatedBy: 'images' },
  );
  registerChannel(
    { id: 'sound', contentType: 'json', mode: 'event', emit: 'sparse' },
    { gatedBy: 'sound' },
  );
  return produceCmgtManifest(caps);
}

beforeEach(() => {
  resetSession();
});

describe('AC-5 — capability-gated channels filter per client', () => {
  it('client A (images:true, sound:false) sees image:* and not sound', () => {
    const a = bootstrap(makeCaps({ images: true, sound: false }));
    const ids = new Set(a.channels.map((c) => c.id));
    expect(ids.has('image:main')).toBe(true);
    expect(ids.has('image:bg')).toBe(true);
    expect(ids.has('sound')).toBe(false);
  });

  it('client B (images:false, sound:true) sees sound and not image:*', () => {
    const b = bootstrap(makeCaps({ images: false, sound: true }));
    const ids = new Set(b.channels.map((c) => c.id));
    expect(ids.has('image:main')).toBe(false);
    expect(ids.has('image:bg')).toBe(false);
    expect(ids.has('sound')).toBe(true);
  });

  it('clients with different capabilities receive different manifests', () => {
    const a = bootstrap(makeCaps({ images: true, sound: false }));
    const b = bootstrap(makeCaps({ images: false, sound: true }));
    const idsA = a.channels.map((c) => c.id).sort();
    const idsB = b.channels.map((c) => c.id).sort();
    expect(idsA).not.toEqual(idsB);
  });

  it('manifests differ ONLY on the capability-gated channels', () => {
    const a = bootstrap(makeCaps({ images: true, sound: false }));
    const b = bootstrap(makeCaps({ images: false, sound: true }));
    const idsA = new Set(a.channels.map((c) => c.id));
    const idsB = new Set(b.channels.map((c) => c.id));
    const onlyInA = [...idsA].filter((id) => !idsB.has(id)).sort();
    const onlyInB = [...idsB].filter((id) => !idsA.has(id)).sort();
    expect(onlyInA).toEqual(['image:bg', 'image:main']);
    expect(onlyInB).toEqual(['sound']);
  });

  it('all ten standard channels appear in both manifests', () => {
    const a = bootstrap(makeCaps({ images: true, sound: false }));
    const b = bootstrap(makeCaps({ images: false, sound: true }));
    const standardIds = [
      'main',
      'prompt',
      'location',
      'score',
      'turn',
      'death',
      'endgame',
      'score_notify',
      'info',
      'ifid',
    ];
    const idsA = new Set(a.channels.map((c) => c.id));
    const idsB = new Set(b.channels.map((c) => c.id));
    for (const id of standardIds) {
      expect(idsA.has(id)).toBe(true);
      expect(idsB.has(id)).toBe(true);
    }
  });

  it('client with all media capabilities sees every gated channel', () => {
    const all = bootstrap(makeCaps({ images: true, sound: true }));
    const ids = new Set(all.channels.map((c) => c.id));
    expect(ids.has('image:main')).toBe(true);
    expect(ids.has('image:bg')).toBe(true);
    expect(ids.has('sound')).toBe(true);
    expect(all.channels).toHaveLength(13); // 10 standard + 3 media
  });

  it('client with no media capabilities sees only standard channels', () => {
    const none = bootstrap(makeCaps({}));
    const ids = new Set(none.channels.map((c) => c.id));
    expect(ids.has('image:main')).toBe(false);
    expect(ids.has('image:bg')).toBe(false);
    expect(ids.has('sound')).toBe(false);
    expect(none.channels).toHaveLength(10);
  });

  it('story-defined ungated channels appear regardless of capabilities', () => {
    resetSession();
    registerHello(makeCaps({}));
    registerStandardChannels();
    // Story-defined channel without gating — should pass through.
    registerChannel({
      id: 'evidence',
      contentType: 'json',
      mode: 'append',
      emit: 'sparse',
    });
    const manifest = produceCmgtManifest(makeCaps({}));
    const ids = new Set(manifest.channels.map((c) => c.id));
    expect(ids.has('evidence')).toBe(true);
  });

  it('manifest channel definitions preserve mode and emit policy', () => {
    const a = bootstrap(makeCaps({ images: true, sound: true }));
    const imageMain = a.channels.find(
      (c: ChannelDefinition) => c.id === 'image:main',
    );
    const sound = a.channels.find((c: ChannelDefinition) => c.id === 'sound');
    expect(imageMain).toEqual({
      id: 'image:main',
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
    });
    expect(sound).toEqual({
      id: 'sound',
      contentType: 'json',
      mode: 'event',
      emit: 'sparse',
    });
  });
});
