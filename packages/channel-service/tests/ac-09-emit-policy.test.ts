/**
 * AC-9 — Per-channel emit-policy invariants.
 *
 *   (a) emit:'always' populate-every-turn — replace-mode channel
 *       re-emits its previous value on a turn that did not change it.
 *   (b) emit:'sparse' skip-when-unchanged — story replace-mode channel
 *       is absent from the payload when its value did not change.
 *   (c) Story-channel opt-in to 'always' — replace-mode channel
 *       registered with emit:'always' re-emits unchanged value.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import {
  registerHello,
  registerChannel,
  registerStandardChannels,
  registerPlatformRules,
  addRule,
  produceCmgtManifest,
  produceTurnPacket,
  resetSession,
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

function block(key: string, ...content: ReadonlyArray<string>): ITextBlock {
  return { key, content };
}

beforeEach(() => {
  resetSession();
});

describe("AC-9(a) — emit:'always' replace channel re-emits on idle turn", () => {
  it('score channel carries unchanged value when no status.score block this turn', () => {
    registerHello(minimalCaps);
    registerStandardChannels();
    registerPlatformRules();
    produceCmgtManifest(minimalCaps);

    // Turn 1: emit status.score = '42' → score channel = {current:42,max:null}
    const t1 = produceTurnPacket({ textBlocks: [block('status.score', '42')] });
    expect(t1.payload['score']).toEqual({ current: 42, max: null });

    // Turn 2: no status.score block. score must still be in payload.
    const t2 = produceTurnPacket({ textBlocks: [] });
    expect(t2.payload['score']).toEqual({ current: 42, max: null });
  });

  it('location, turn, prompt all re-emit their last value on idle turn', () => {
    registerHello(minimalCaps);
    registerStandardChannels();
    registerPlatformRules();
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({
      textBlocks: [
        block('status.room', 'Hallway'),
        block('status.turns', '5'),
        block('prompt', '> '),
      ],
    });

    const idle = produceTurnPacket({ textBlocks: [] });
    expect(idle.payload['location']).toBe('Hallway');
    expect(idle.payload['turn']).toBe(5);
    expect(idle.payload['prompt']).toBe('> ');
  });

  it('a never-set always-mode channel does not appear (no prior value)', () => {
    registerHello(minimalCaps);
    registerStandardChannels();
    registerPlatformRules();
    produceCmgtManifest(minimalCaps);

    // First turn ever, no input blocks at all — score has never been set.
    const t = produceTurnPacket({ textBlocks: [] });
    expect(t.payload['score']).toBeUndefined();
  });
});

describe("AC-9(b) — emit:'sparse' replace channel absent when unchanged", () => {
  it('sparse channel is absent from idle turn after one emission', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'inventory',
      contentType: 'text',
      mode: 'replace',
      emit: 'sparse',
    });
    addRule({
      when: { key: 'inventory.snapshot' },
      emit: { channel: 'inventory', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    const t1 = produceTurnPacket({
      textBlocks: [block('inventory.snapshot', 'sword')],
    });
    expect(t1.payload['inventory']).toBe('sword');

    const t2 = produceTurnPacket({ textBlocks: [] });
    expect('inventory' in t2.payload).toBe(false);
  });

  it('sparse channel re-emits when value changes', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'inventory',
      contentType: 'text',
      mode: 'replace',
      emit: 'sparse',
    });
    addRule({
      when: { key: 'inventory.snapshot' },
      emit: { channel: 'inventory', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({
      textBlocks: [block('inventory.snapshot', 'sword')],
    });
    const t2 = produceTurnPacket({
      textBlocks: [block('inventory.snapshot', 'shield')],
    });
    expect(t2.payload['inventory']).toBe('shield');
  });

  it('sparse channel is absent when same value re-emitted', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'inventory',
      contentType: 'text',
      mode: 'replace',
      emit: 'sparse',
    });
    addRule({
      when: { key: 'inventory.snapshot' },
      emit: { channel: 'inventory', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({
      textBlocks: [block('inventory.snapshot', 'sword')],
    });
    const t2 = produceTurnPacket({
      textBlocks: [block('inventory.snapshot', 'sword')],
    });
    expect('inventory' in t2.payload).toBe(false);
  });

  it('sparse defaults when emit field is omitted', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'evidence',
      contentType: 'json',
      mode: 'replace',
      // emit omitted → defaults to sparse per ADR-163 §5
    });
    addRule({
      when: { key: 'evidence.update' },
      emit: { channel: 'evidence', extract: 'content' },
    });
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({
      textBlocks: [block('evidence.update', 'fingerprint')],
    });
    const idle = produceTurnPacket({ textBlocks: [] });
    expect('evidence' in idle.payload).toBe(false);
  });
});

describe("AC-9(c) — story-channel opt-in to emit:'always'", () => {
  it("replace+always story channel re-emits unchanged value on idle turn", () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'stamina',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
    });
    addRule({
      when: { key: 'stat.stamina' },
      emit: { channel: 'stamina', extract: 'number' },
    });
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({ textBlocks: [block('stat.stamina', '100')] });
    const idle = produceTurnPacket({ textBlocks: [] });
    expect(idle.payload['stamina']).toBe(100);
  });

  it("replace+always story channel emits same-value when changed-to-same", () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'stamina',
      contentType: 'number',
      mode: 'replace',
      emit: 'always',
    });
    addRule({
      when: { key: 'stat.stamina' },
      emit: { channel: 'stamina', extract: 'number' },
    });
    produceCmgtManifest(minimalCaps);

    produceTurnPacket({ textBlocks: [block('stat.stamina', '50')] });
    const t2 = produceTurnPacket({
      textBlocks: [block('stat.stamina', '50')],
    });
    expect(t2.payload['stamina']).toBe(50);
  });
});

describe('AC-9 — append-mode emit policy', () => {
  it("emit:'always' append channel emits empty array on idle turn", () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'log',
      contentType: 'json',
      mode: 'append',
      emit: 'always',
    });
    addRule({
      when: { key: 'log.line' },
      emit: { channel: 'log', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    const idle = produceTurnPacket({ textBlocks: [] });
    expect(idle.payload['log']).toEqual([]);
  });

  it("emit:'sparse' append channel is absent on idle turn", () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'log',
      contentType: 'json',
      mode: 'append',
      emit: 'sparse',
    });
    addRule({
      when: { key: 'log.line' },
      emit: { channel: 'log', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    const idle = produceTurnPacket({ textBlocks: [] });
    expect('log' in idle.payload).toBe(false);
  });

  it('append channel carries new entries this turn (not accumulated)', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'log',
      contentType: 'json',
      mode: 'append',
      emit: 'always',
    });
    addRule({
      when: { key: 'log.line' },
      emit: { channel: 'log', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    const t1 = produceTurnPacket({
      textBlocks: [block('log.line', 'a'), block('log.line', 'b')],
    });
    expect(t1.payload['log']).toEqual(['a', 'b']);

    // Next turn: ONE new entry. The payload carries only the new one,
    // not the accumulation across turns (§5).
    const t2 = produceTurnPacket({ textBlocks: [block('log.line', 'c')] });
    expect(t2.payload['log']).toEqual(['c']);
  });
});

describe('AC-9 — event-mode emit policy', () => {
  it('event channel only appears when fired', () => {
    registerHello(minimalCaps);
    registerChannel({
      id: 'death',
      contentType: 'text',
      mode: 'event',
      emit: 'always',
    });
    addRule({
      when: { key: 'death' },
      emit: { channel: 'death', extract: 'string' },
    });
    produceCmgtManifest(minimalCaps);

    const idle = produceTurnPacket({ textBlocks: [] });
    expect('death' in idle.payload).toBe(false);

    const fired = produceTurnPacket({ textBlocks: [block('death', 'You died.')] });
    expect(fired.payload['death']).toBe('You died.');
  });
});
