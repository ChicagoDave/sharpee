/**
 * Tests for `handleAudibilityHeard` — ADR-172 Phase 7a, ported to
 * engine per ADR-174.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-174 §Engine-internal prose pipeline
 */

import { describe, it, expect } from 'vitest';
import { handleAudibilityHeard } from '../../../src/prose-pipeline/handlers/audibility';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

describe('handleAudibilityHeard', () => {
  it('renders speech at full tier with content interpolation', () => {
    const provider = makeProvider({
      'sound.heard.speech.full': 'You hear: "{content}"',
      'lib.herve.confession': 'I never meant for it to happen.',
    });
    const event = makeEvent('sound.audibility.heard', {
      sourceRoomId: 'lib',
      targetRoomId: 'lib',
      sourceEntityId: 'herve',
      kind: 'speech',
      volumeTier: 'normal',
      audibilityTier: 'full',
      content: { messageId: 'lib.herve.confession' },
      timestamp: 1,
    });

    const blocks = handleAudibilityHeard(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual([
      'You hear: "I never meant for it to happen."',
    ]);
  });

  it('renders ambient at muffled tier with kind interpolation', () => {
    const provider = makeProvider({
      'sound.heard.ambient.muffled': 'You hear a muffled {kind}.',
    });
    const event = makeEvent('sound.audibility.heard', {
      sourceRoomId: 'street',
      targetRoomId: 'parlor',
      sourceEntityId: 'pedestrian',
      kind: 'ambient',
      volumeTier: 'normal',
      audibilityTier: 'muffled',
      timestamp: 2,
    });

    const blocks = handleAudibilityHeard(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['You hear a muffled ambient.']);
  });

  it('falls back to default template when kind-specific template is missing', () => {
    const provider = makeProvider({
      'sound.heard.default.presence-only': 'You hear something distant.',
    });
    const event = makeEvent('sound.audibility.heard', {
      sourceRoomId: 'sky',
      targetRoomId: 'parlor',
      sourceEntityId: 'storm',
      kind: 'thunderclap',
      volumeTier: 'shouting',
      audibilityTier: 'presence-only',
      timestamp: 3,
    });

    const blocks = handleAudibilityHeard(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['You hear something distant.']);
  });

  it('produces one block per event in the order called', () => {
    const provider = makeProvider({
      'sound.heard.ambient.full': 'You hear {kind}.',
      'sound.heard.ambient.fragments': 'You catch the faint sound of {kind}.',
    });
    const events = [
      makeEvent('sound.audibility.heard', {
        sourceRoomId: 'r1',
        targetRoomId: 'r1',
        sourceEntityId: 'e1',
        kind: 'ambient',
        volumeTier: 'normal',
        audibilityTier: 'full',
        timestamp: 4,
      }),
      makeEvent('sound.audibility.heard', {
        sourceRoomId: 'r2',
        targetRoomId: 'r1',
        sourceEntityId: 'e2',
        kind: 'ambient',
        volumeTier: 'subdued',
        audibilityTier: 'fragments',
        timestamp: 4,
      }),
    ];
    const ctx = makeContext(provider);

    const blocks = events.flatMap((e) => handleAudibilityHeard(e, ctx));

    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toEqual(['You hear ambient.']);
    expect(blocks[1].content).toEqual([
      'You catch the faint sound of ambient.',
    ]);
  });

  it('returns empty array when event.data is missing', () => {
    const provider = makeProvider({
      'sound.heard.default.full': 'You hear {kind}.',
    });
    const event = makeEvent('sound.audibility.heard', undefined);

    const blocks = handleAudibilityHeard(event, makeContext(provider));

    expect(blocks).toEqual([]);
  });

  it('returns empty array for silent tier (defense-in-depth)', () => {
    const provider = makeProvider({
      'sound.heard.default.full': 'You hear {kind}.',
    });
    const event = makeEvent('sound.audibility.heard', {
      sourceRoomId: 'r1',
      targetRoomId: 'r1',
      sourceEntityId: 'e1',
      kind: 'speech',
      volumeTier: 'whisper',
      audibilityTier: 'silent',
      timestamp: 5,
    });

    const blocks = handleAudibilityHeard(event, makeContext(provider));

    expect(blocks).toEqual([]);
  });

  it('returns empty array when languageProvider is absent', () => {
    const event = makeEvent('sound.audibility.heard', {
      sourceRoomId: 'r1',
      targetRoomId: 'r1',
      sourceEntityId: 'e1',
      kind: 'speech',
      volumeTier: 'normal',
      audibilityTier: 'full',
      content: { messageId: 'some.line' },
      timestamp: 6,
    });

    const blocks = handleAudibilityHeard(event, makeContext());

    expect(blocks).toEqual([]);
  });
});
