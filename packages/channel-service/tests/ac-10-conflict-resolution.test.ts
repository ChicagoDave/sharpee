/**
 * AC-10 — Conflict resolution.
 *
 * Two rules registered against the same `key`, both emitting to the
 * same `replace`-mode channel. Higher-priority rule's value wins;
 * ties resolved by registration order (first-registered wins).
 *
 * Implemented by `produce-turn.ts collectContributions` — rules are
 * iterated in `_getRulesInDispatchOrder` (priority desc, registration
 * order asc) and the first match per (block, channel) contributes.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import {
  registerHello,
  registerChannel,
  addRule,
  produceCmgtManifest,
  produceTurnPacket,
  resetSession,
  type ClientCapabilities,
} from '../src';

const caps: ClientCapabilities = {
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

describe('AC-10 — higher-priority rule wins', () => {
  it('rule with priority 10 beats rule with priority 5 (same key, same channel)', () => {
    registerHello(caps);
    registerChannel({
      id: 'banner',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    // Register the LOW-priority rule first to demonstrate that priority
    // (not registration order) is the primary tiebreaker.
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'LOW-PRIORITY' },
      priority: 5,
    });
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'HIGH-PRIORITY' },
      priority: 10,
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('shared', 'irrelevant')] });
    expect(turn.payload['banner']).toBe('HIGH-PRIORITY');
  });

  it('higher-priority rule wins regardless of declaration order', () => {
    registerHello(caps);
    registerChannel({
      id: 'banner',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    // Register HIGH first this time. Result must still be HIGH.
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'HIGH' },
      priority: 100,
    });
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'LOW' },
      priority: 1,
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('shared', 'x')] });
    expect(turn.payload['banner']).toBe('HIGH');
  });
});

describe('AC-10 — ties resolved by registration order (first wins)', () => {
  it('two equal-priority rules: first-registered wins', () => {
    registerHello(caps);
    registerChannel({
      id: 'banner',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'FIRST' },
      priority: 5,
    });
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'SECOND' },
      priority: 5,
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('shared', 'x')] });
    expect(turn.payload['banner']).toBe('FIRST');
  });

  it('default-priority (omitted) rules also tiebreak by registration order', () => {
    registerHello(caps);
    registerChannel({
      id: 'banner',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'FIRST' },
    });
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'SECOND' },
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('shared', 'x')] });
    expect(turn.payload['banner']).toBe('FIRST');
  });

  it('rule registered later with HIGHER priority still wins over earlier rule', () => {
    registerHello(caps);
    registerChannel({
      id: 'banner',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'EARLIER-LOW' },
      priority: 1,
    });
    addRule({
      when: { key: 'shared' },
      emit: { channel: 'banner', extract: () => 'LATER-HIGH' },
      priority: 100,
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('shared', 'x')] });
    expect(turn.payload['banner']).toBe('LATER-HIGH');
  });
});

describe('AC-10 — story override pattern (the canonical use case)', () => {
  it('story rule at priority 100 overrides platform-style rule at priority 0', () => {
    registerHello(caps);
    registerChannel({
      id: 'main',
      contentType: 'json',
      mode: 'append',
      emit: 'always',
    });

    // Simulate the platform's default rule (priority 0).
    addRule({
      when: { key: 'room.name' },
      emit: { channel: 'main', extract: () => ({ kind: 'platform-default' }) },
    });
    // Story override at higher priority for the same key+channel.
    addRule({
      when: { key: 'room.name' },
      emit: { channel: 'main', extract: () => ({ kind: 'story-override' }) },
      priority: 100,
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({ textBlocks: [block('room.name', 'Forest')] });
    // Append channel: only one entry per block (dedup by channel within block).
    expect(turn.payload['main']).toEqual([{ kind: 'story-override' }]);
  });
});

describe('AC-10 — conflict scope is per-(block, channel)', () => {
  it('the same block can still fan out to TWO different channels via two rules', () => {
    registerHello(caps);
    registerChannel({
      id: 'main',
      contentType: 'json',
      mode: 'append',
      emit: 'always',
    });
    registerChannel({
      id: 'location',
      contentType: 'text',
      mode: 'replace',
      emit: 'always',
    });

    // Two rules — same key, but DIFFERENT target channels. Both must fire.
    addRule({
      when: { key: 'room.name' },
      emit: { channel: 'main', extract: 'content' },
    });
    addRule({
      when: { key: 'room.name' },
      emit: { channel: 'location', extract: 'string' },
    });

    produceCmgtManifest(caps);
    const turn = produceTurnPacket({
      textBlocks: [block('room.name', 'West of House')],
    });
    expect(turn.payload['main']).toEqual([['West of House']]);
    expect(turn.payload['location']).toBe('West of House');
  });
});
