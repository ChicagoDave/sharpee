/**
 * AC-4 — Hello packet contract.
 * AC-11 — Bootstrap ordering and registration discipline (a/b/c/d).
 *
 * Both ACs are about packet ordering invariants from ADR-163 §11.
 * Grouped here because they share setup (resetSession + minimal hello)
 * and exercise overlapping code paths.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerHello,
  registerChannel,
  addRule,
  produceCmgtManifest,
  produceTurnPacket,
  resetSession,
  createDecoder,
  type ClientCapabilities,
} from '../src';

const minimalCaps: ClientCapabilities = {
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
};

beforeEach(() => {
  resetSession();
});

describe('AC-4 — produceCmgtManifest requires hello first', () => {
  it('throws when called before any hello has been registered', () => {
    expect(() => produceCmgtManifest(minimalCaps)).toThrow(/before registerHello/);
  });

  it('error message references the bootstrap-order invariant', () => {
    expect(() => produceCmgtManifest(minimalCaps)).toThrow(
      /Bootstrap order invariant/,
    );
  });

  it('throws even when only registerChannel was called (no hello)', () => {
    registerChannel({ id: 'main', contentType: 'json', mode: 'append', emit: 'always' });
    expect(() => produceCmgtManifest(minimalCaps)).toThrow(/before registerHello/);
  });

  it('succeeds once registerHello has been called', () => {
    registerHello(minimalCaps);
    const manifest = produceCmgtManifest(minimalCaps);
    expect(manifest.kind).toBe('cmgt');
  });
});

describe('AC-11(a) — cmgt-after-hello: producer rejects cmgt before hello', () => {
  it('produceCmgtManifest throws if hello has not been registered', () => {
    expect(() => produceCmgtManifest(minimalCaps)).toThrow();
  });

  it('produceCmgtManifest succeeds after registerHello', () => {
    registerHello(minimalCaps);
    const out = produceCmgtManifest(minimalCaps);
    expect(out.kind).toBe('cmgt');
    expect(out.protocol_version).toBe(1);
  });
});

describe('AC-11(b) — turn-after-cmgt: producer rejects turn before cmgt', () => {
  it('produceTurnPacket throws when cmgt has not been produced', () => {
    registerHello(minimalCaps);
    registerChannel({ id: 'main', contentType: 'json', mode: 'append', emit: 'always' });
    expect(() => produceTurnPacket({ textBlocks: [] })).toThrow(
      /before produceCmgtManifest/,
    );
  });

  it('produceTurnPacket succeeds after produceCmgtManifest', () => {
    registerHello(minimalCaps);
    registerChannel({ id: 'main', contentType: 'json', mode: 'append', emit: 'always' });
    produceCmgtManifest(minimalCaps);
    const turn = produceTurnPacket({ textBlocks: [] });
    expect(turn.kind).toBe('turn');
    expect(turn.turn_id).toMatch(/^turn-\d+$/);
  });
});

describe('AC-11(c) — registration closes at cmgt', () => {
  it('registerChannel after produceCmgtManifest throws naming the channel', () => {
    registerHello(minimalCaps);
    registerChannel({ id: 'main', contentType: 'json', mode: 'append', emit: 'always' });
    produceCmgtManifest(minimalCaps);
    expect(() =>
      registerChannel({ id: 'late_channel', contentType: 'text', mode: 'replace' }),
    ).toThrow(/'late_channel'/);
  });

  it('registerChannel error references the manifest-frozen invariant', () => {
    registerHello(minimalCaps);
    produceCmgtManifest(minimalCaps);
    expect(() =>
      registerChannel({ id: 'late', contentType: 'text', mode: 'replace' }),
    ).toThrow(/CMGT manifest has been produced/);
  });

  it('addRule after produceCmgtManifest throws', () => {
    registerHello(minimalCaps);
    registerChannel({ id: 'main', contentType: 'json', mode: 'append', emit: 'always' });
    produceCmgtManifest(minimalCaps);
    expect(() =>
      addRule({ when: { key: 'room.name' }, emit: { channel: 'main' } }),
    ).toThrow(/CMGT manifest has been produced/);
  });

  it('produceCmgtManifest cannot be called twice in the same session', () => {
    registerHello(minimalCaps);
    produceCmgtManifest(minimalCaps);
    expect(() => produceCmgtManifest(minimalCaps)).toThrow(/already produced/);
  });

  it('resetSession reopens registration', () => {
    registerHello(minimalCaps);
    produceCmgtManifest(minimalCaps);
    resetSession();
    registerHello(minimalCaps);
    // No throw — registration is open again.
    registerChannel({ id: 'after_reset', contentType: 'text', mode: 'replace' });
    const manifest = produceCmgtManifest(minimalCaps);
    expect(manifest.channels.map((c) => c.id)).toContain('after_reset');
  });
});

describe('AC-11(d) — decoder rejects out-of-order turn', () => {
  it('starts in awaiting-cmgt state', () => {
    const dec = createDecoder();
    expect(dec.state.status).toBe('awaiting-cmgt');
    expect(dec.lastTurn).toBeNull();
  });

  it('transitions to live on cmgt and exposes the manifest', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'cmgt', protocol_version: 1, channels: [] });
    expect(dec.state.status).toBe('live');
    if (dec.state.status === 'live') {
      expect(dec.state.cmgt.protocol_version).toBe(1);
    }
  });

  it('rejects a turn packet received before cmgt', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'turn', turn_id: 'turn-1', payload: { main: ['hi'] } });
    expect(dec.state.status).toBe('error');
    if (dec.state.status === 'error') {
      expect(dec.state.reason).toMatch(/turn received before cmgt/);
    }
  });

  it('renders nothing on out-of-order turn (lastTurn stays null)', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'turn', turn_id: 'turn-1', payload: {} });
    expect(dec.lastTurn).toBeNull();
  });

  it('accepts turns after cmgt and exposes them via lastTurn', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'cmgt', protocol_version: 1, channels: [] });
    dec.ingest({ kind: 'turn', turn_id: 'turn-1', payload: { main: ['ok'] } });
    expect(dec.state.status).toBe('live');
    expect(dec.lastTurn?.turn_id).toBe('turn-1');
    expect(dec.lastTurn?.payload['main']).toEqual(['ok']);
  });

  it('error state is unrecoverable — subsequent valid packets are ignored', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'turn', turn_id: 'turn-1', payload: {} });
    expect(dec.state.status).toBe('error');
    dec.ingest({ kind: 'cmgt', protocol_version: 1, channels: [] });
    expect(dec.state.status).toBe('error');
  });

  it('rejects a hello received as server→client', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'hello', capabilities: minimalCaps });
    expect(dec.state.status).toBe('error');
  });

  it('rejects a command received as server→client', () => {
    const dec = createDecoder();
    dec.ingest({ kind: 'command', text: 'look' });
    expect(dec.state.status).toBe('error');
  });
});
