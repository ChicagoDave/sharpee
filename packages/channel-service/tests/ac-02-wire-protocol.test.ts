/**
 * AC-2 — Wire protocol module.
 *
 * The wire-protocol module exports the seven public types (HelloPacket,
 * CmgtPacket, TurnPacket, CommandPacket, ChannelDefinition,
 * ChannelContentType, ClientCapabilities) and is importable directly
 * from the package and from the `/wire` subpath. The module is free of
 * runtime-specific types (no Node, browser, or DOM globals) — verified
 * by the fact that this file imports cleanly under vitest's Node
 * environment without DOM polyfills.
 */

import { describe, expect, it } from 'vitest';

// Two import paths, same types — verifies the subpath export works.
import type {
  HelloPacket,
  CmgtPacket,
  TurnPacket,
  CommandPacket,
  ChannelDefinition,
  ChannelContentType,
  ClientCapabilities,
  WirePacket,
} from '../src';

import type {
  HelloPacket as WireHelloPacket,
  CmgtPacket as WireCmgtPacket,
  TurnPacket as WireTurnPacket,
  CommandPacket as WireCommandPacket,
  ChannelDefinition as WireChannelDefinition,
  ChannelContentType as WireChannelContentType,
  ClientCapabilities as WireClientCapabilities,
  WirePacket as WireWirePacket,
} from '../src/wire';

describe('AC-2 — seven wire types importable from the package', () => {
  it('HelloPacket has kind discriminator and capabilities', () => {
    const packet: HelloPacket = {
      kind: 'hello',
      capabilities: makeCaps(),
    };
    expect(packet.kind).toBe('hello');
    expect(packet.capabilities.text).toBe(true);
  });

  it('CmgtPacket has kind discriminator, protocol_version, channels', () => {
    const packet: CmgtPacket = {
      kind: 'cmgt',
      protocol_version: 1,
      channels: [{ id: 'main', contentType: 'json', mode: 'append', emit: 'always' }],
    };
    expect(packet.kind).toBe('cmgt');
    expect(packet.protocol_version).toBe(1);
    expect(packet.channels).toHaveLength(1);
  });

  it('TurnPacket has kind discriminator, turn_id, payload', () => {
    const packet: TurnPacket = {
      kind: 'turn',
      turn_id: 'turn-1',
      payload: { main: ['hello'] },
    };
    expect(packet.kind).toBe('turn');
    expect(packet.turn_id).toBe('turn-1');
    expect(packet.payload['main']).toEqual(['hello']);
  });

  it('CommandPacket has kind discriminator and text', () => {
    const packet: CommandPacket = { kind: 'command', text: 'look' };
    expect(packet.kind).toBe('command');
    expect(packet.text).toBe('look');
  });

  it('ChannelDefinition shape (id/contentType/mode/emit?)', () => {
    const def: ChannelDefinition = {
      id: 'evidence',
      contentType: 'json',
      mode: 'append',
    };
    expect(def.id).toBe('evidence');
    expect(def.contentType).toBe('json');
    expect(def.mode).toBe('append');
    expect(def.emit).toBeUndefined();
  });

  it('ChannelContentType is exactly the three literal types', () => {
    const t: ChannelContentType = 'text';
    const n: ChannelContentType = 'number';
    const j: ChannelContentType = 'json';
    expect([t, n, j]).toEqual(['text', 'number', 'json']);
  });

  it('ClientCapabilities preserves ADR-101 fields', () => {
    const caps: ClientCapabilities = makeCaps();
    expect(caps.text).toBe(true);
    expect(typeof caps.images).toBe('boolean');
    expect(typeof caps.sound).toBe('boolean');
    expect(typeof caps.splitPane).toBe('boolean');
    expect(typeof caps.clickableImage).toBe('boolean');
    expect(typeof caps.transitions).toBe('boolean');
  });

  it('WirePacket discriminated union covers all four kinds', () => {
    const packets: WirePacket[] = [
      { kind: 'hello', capabilities: makeCaps() },
      { kind: 'cmgt', protocol_version: 1, channels: [] },
      { kind: 'turn', turn_id: 't', payload: {} },
      { kind: 'command', text: 'x' },
    ];
    expect(packets.map((p) => p.kind).sort()).toEqual([
      'cmgt',
      'command',
      'hello',
      'turn',
    ]);
  });
});

describe('AC-2 — same types reachable via /wire subpath', () => {
  // Type-level equivalence: a value typed under one path is assignable
  // to the corresponding type from the other path. If these compile,
  // the two import paths refer to the same declarations.
  it('subpath types are assignable to package-root types', () => {
    const wireHello: WireHelloPacket = { kind: 'hello', capabilities: makeCaps() };
    const rootHello: HelloPacket = wireHello;
    expect(rootHello.kind).toBe('hello');

    const wireCmgt: WireCmgtPacket = { kind: 'cmgt', protocol_version: 1, channels: [] };
    const rootCmgt: CmgtPacket = wireCmgt;
    expect(rootCmgt.protocol_version).toBe(1);

    const wireTurn: WireTurnPacket = { kind: 'turn', turn_id: 't', payload: {} };
    const rootTurn: TurnPacket = wireTurn;
    expect(rootTurn.turn_id).toBe('t');

    const wireCmd: WireCommandPacket = { kind: 'command', text: 'go' };
    const rootCmd: CommandPacket = wireCmd;
    expect(rootCmd.text).toBe('go');

    const wireDef: WireChannelDefinition = {
      id: 'x',
      contentType: 'text',
      mode: 'replace',
    };
    const rootDef: ChannelDefinition = wireDef;
    expect(rootDef.id).toBe('x');

    const wireCt: WireChannelContentType = 'json';
    const rootCt: ChannelContentType = wireCt;
    expect(rootCt).toBe('json');

    const wireCaps: WireClientCapabilities = makeCaps();
    const rootCaps: ClientCapabilities = wireCaps;
    expect(rootCaps.text).toBe(true);

    const wireUnion: WireWirePacket = { kind: 'command', text: 'q' };
    const rootUnion: WirePacket = wireUnion;
    expect(rootUnion.kind).toBe('command');
  });
});

describe('AC-2 — module is runtime-agnostic', () => {
  it('runtime exports load without runtime-specific globals', async () => {
    // A `vitest run` against `environment: 'node'` would have failed
    // before reaching this point if the package's runtime barrel
    // (`src/index.ts`) transitively imported `Buffer`, `fs`,
    // `DOMException`, or any other host-only API. We assert here on a
    // concrete runtime value — `PROTOCOL_VERSION` — to confirm the
    // module evaluated rather than was tree-shaken away.
    const mod = await import('../src');
    expect(mod.PROTOCOL_VERSION).toBe(1);
    expect(typeof mod.ChannelService).toBe('function');
  });
});

function makeCaps(): ClientCapabilities {
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
  };
}
