/**
 * Tests for the `audibility` channel (ADR-172 Phase 5).
 *
 * Verifies the channel's `produce` closure projects every
 * `sound.audibility.heard` semantic event in a turn into an array of
 * `IAudibilityEvent` payloads. Pure unit tests — no engine, no
 * propagation, no real world.
 *
 * Owner context: `@sharpee/stdlib` — channel tests.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext, IAudibilityEvent } from '@sharpee/if-domain';
import {
  audibilityChannel,
  channelRegistry,
  SOUND_EVENT_TYPES,
} from '../../src/channels';

function makeCtx(over: Partial<ChannelProduceContext> = {}): ChannelProduceContext {
  return {
    world: undefined,
    events: [],
    blocks: [],
    turn: 1,
    prevValue: undefined,
    ...over,
  };
}

function makeAudibilityEvent(over: Partial<IAudibilityEvent> = {}): IAudibilityEvent {
  return {
    sourceRoomId: 'r-parlor',
    targetRoomId: 'r-library',
    sourceEntityId: 'a-alderman',
    kind: 'speech',
    volumeTier: 'normal',
    audibilityTier: 'muffled',
    timestamp: 1,
    ...over,
  };
}

function makeEvent(type: string, data: unknown) {
  return {
    id: `e-${type}-${Math.random()}`,
    type,
    timestamp: 0,
    entities: {},
    data,
  };
}

describe('audibilityChannel — channel definition', () => {
  it('declares id "audibility" (NOT "sound" — ADR-163 owns the "sound" id)', () => {
    expect(audibilityChannel.id).toBe('audibility');
  });

  it('is append-mode, sparse-emit, json content', () => {
    expect(audibilityChannel.contentType).toBe('json');
    expect(audibilityChannel.mode).toBe('append');
    expect(audibilityChannel.emit).toBe('sparse');
  });

  it('is NOT capability-gated — text-only and audio-capable both consume', () => {
    expect(audibilityChannel.gatedBy).toBeUndefined();
  });
});

describe('audibilityChannel — produce closure', () => {
  it('returns undefined for a turn with no audibility events', () => {
    expect(audibilityChannel.produce(makeCtx())).toBeUndefined();
  });

  it('projects a single audibility event into a one-entry array', () => {
    const heard = makeAudibilityEvent();
    const result = audibilityChannel.produce(
      makeCtx({
        events: [makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, heard)],
      }),
    );
    expect(result).toEqual([heard]);
  });

  it('projects multiple audibility events into a multi-entry array (in order)', () => {
    const e1 = makeAudibilityEvent({ timestamp: 1, audibilityTier: 'full' });
    const e2 = makeAudibilityEvent({ timestamp: 2, audibilityTier: 'muffled' });
    const e3 = makeAudibilityEvent({ timestamp: 3, audibilityTier: 'fragments' });
    const result = audibilityChannel.produce(
      makeCtx({
        events: [
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, e1),
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, e2),
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, e3),
        ],
      }),
    );
    expect(result).toEqual([e1, e2, e3]);
  });

  it('ignores unrelated semantic events', () => {
    const heard = makeAudibilityEvent();
    const result = audibilityChannel.produce(
      makeCtx({
        events: [
          makeEvent('media.sound.play', { src: 'gunshot.ogg' }),
          makeEvent('if.event.examined', { targetId: 't' }),
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, heard),
          makeEvent('game.score_changed', { score: 1 }),
        ],
      }),
    );
    expect(result).toEqual([heard]);
  });

  it('skips audibility events with missing data field (defensive)', () => {
    const heard = makeAudibilityEvent();
    const result = audibilityChannel.produce(
      makeCtx({
        events: [
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, undefined),
          makeEvent(SOUND_EVENT_TYPES.AUDIBILITY_HEARD, heard),
        ],
      }),
    );
    expect(result).toEqual([heard]);
  });
});

describe('audibilityChannel — registration', () => {
  it('is registered in the canonical channelRegistry', () => {
    expect(channelRegistry.get('audibility')).toBe(audibilityChannel);
  });

  it('does not collide with the existing "sound" channel id (ADR-163 media-cue)', () => {
    const existing = channelRegistry.get('sound');
    expect(existing).toBeDefined();
    expect(existing).not.toBe(audibilityChannel);
    // The ADR-163 media-cue channel is the one gated by 'sound' capability.
    expect(existing!.gatedBy).toBe('sound');
  });
});

describe('SOUND_EVENT_TYPES', () => {
  it('exposes the audibility-heard wire event type', () => {
    expect(SOUND_EVENT_TYPES.AUDIBILITY_HEARD).toBe('sound.audibility.heard');
  });
});
