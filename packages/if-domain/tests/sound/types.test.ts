/**
 * @file ADR-172 Phase 1 — sound type shapes verification.
 *
 * Type-level checks that the public sound contracts compile against the
 * shapes downstream phases will consume:
 *
 *  - Phase 3 (`@sharpee/engine`): a propagation function with signature
 *    `(sound, listener, world) => AudibilityEvent | null`.
 *  - Phase 6 (`@sharpee/stdlib`): an `emitSound(sound)` API on
 *    `ActionContext`.
 *  - Phase 5 (channel routing): an `AudibilityEvent` payload flowing
 *    through ADR-163's channel registry.
 *
 * The tests assert on the runtime budgets table (the only data this
 * phase ships) and on the type-system constraints that downstream
 * phases will rely on.
 *
 * Owner context: `@sharpee/if-domain` — domain-layer contracts.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  VOLUME_TIER_BUDGETS,
  type AudibilityTier,
  type IAudibilityEvent,
  type ISound,
  type ISoundContent,
  type SoundKind,
  type VolumeTier,
} from '../../src/sound';

describe('VOLUME_TIER_BUDGETS', () => {
  it('declares an integer budget for every volume tier', () => {
    const tiers: VolumeTier[] = ['whisper', 'subdued', 'normal', 'raised', 'shouting'];
    for (const tier of tiers) {
      expect(VOLUME_TIER_BUDGETS[tier]).toBeTypeOf('number');
      expect(Number.isInteger(VOLUME_TIER_BUDGETS[tier])).toBe(true);
      expect(VOLUME_TIER_BUDGETS[tier]).toBeGreaterThan(0);
    }
  });

  it('matches the ADR-172 budget table exactly (1 / 2 / 5 / 7 / 9)', () => {
    expect(VOLUME_TIER_BUDGETS.whisper).toBe(1);
    expect(VOLUME_TIER_BUDGETS.subdued).toBe(2);
    expect(VOLUME_TIER_BUDGETS.normal).toBe(5);
    expect(VOLUME_TIER_BUDGETS.raised).toBe(7);
    expect(VOLUME_TIER_BUDGETS.shouting).toBe(9);
  });

  it('orders strictly by tier (each louder tier ≥ the next-quieter one)', () => {
    expect(VOLUME_TIER_BUDGETS.whisper).toBeLessThan(VOLUME_TIER_BUDGETS.subdued);
    expect(VOLUME_TIER_BUDGETS.subdued).toBeLessThan(VOLUME_TIER_BUDGETS.normal);
    expect(VOLUME_TIER_BUDGETS.normal).toBeLessThan(VOLUME_TIER_BUDGETS.raised);
    expect(VOLUME_TIER_BUDGETS.raised).toBeLessThan(VOLUME_TIER_BUDGETS.shouting);
  });

  it('is frozen (platform default; stories override via their own table)', () => {
    expect(Object.isFrozen(VOLUME_TIER_BUDGETS)).toBe(true);
  });
});

describe('VolumeTier and AudibilityTier shapes', () => {
  it('VolumeTier is the closed five-tier union', () => {
    expectTypeOf<VolumeTier>().toEqualTypeOf<
      'whisper' | 'subdued' | 'normal' | 'raised' | 'shouting'
    >();
  });

  it('AudibilityTier is the closed five-tier union including silent', () => {
    expectTypeOf<AudibilityTier>().toEqualTypeOf<
      'silent' | 'presence-only' | 'fragments' | 'muffled' | 'full'
    >();
  });
});

describe('ISound — emission shape', () => {
  it('accepts a content-bearing emission with all fields', () => {
    const sound: ISound = {
      sourceLocation: 'r-parlor',
      sourceEntity: 'a-alderman',
      kind: 'speech',
      volumeTier: 'normal',
      content: {
        messageId: 'dungeo.alderman.parlor.beat-3',
        params: { mood: 'agitated' },
      },
    };
    expect(sound.kind).toBe('speech');
  });

  it('accepts an ambient emission without content', () => {
    const sound: ISound = {
      sourceLocation: 'r-study',
      sourceEntity: 'o-pistol',
      kind: 'gunshot',
      volumeTier: 'shouting',
    };
    expect(sound.content).toBeUndefined();
  });

  it('SoundKind is an open string union (story-extensible)', () => {
    // Story-defined kinds must not require platform knowledge:
    const customKind: SoundKind = 'dungeo.bell-toll';
    expect(typeof customKind).toBe('string');
  });
});

describe('IAudibilityEvent — listener-side delivery shape', () => {
  it('accepts a delivered event with the full field set', () => {
    const event: IAudibilityEvent = {
      sourceRoomId: 'r-parlor',
      targetRoomId: 'r-hallway',
      wallId: 'w-parlor-hallway',
      sourceEntityId: 'a-alderman',
      kind: 'speech',
      volumeTier: 'raised',
      audibilityTier: 'muffled',
      content: { messageId: 'dungeo.alderman.parlor.beat-3' },
      timestamp: 42,
    };
    expect(event.audibilityTier).toBe('muffled');
  });

  it('accepts an event without wallId (door / conduit / same-room paths)', () => {
    const event: IAudibilityEvent = {
      sourceRoomId: 'r-study',
      targetRoomId: 'r-study',
      sourceEntityId: 'a-self',
      kind: 'speech',
      volumeTier: 'whisper',
      audibilityTier: 'full',
      timestamp: 0,
    };
    expect(event.wallId).toBeUndefined();
  });

  it('audibilityTier excludes silent (silent suppresses delivery)', () => {
    expectTypeOf<IAudibilityEvent['audibilityTier']>().toEqualTypeOf<
      'presence-only' | 'fragments' | 'muffled' | 'full'
    >();
  });
});

describe('Phase 1 type contracts compile against downstream consumer signatures', () => {
  // Phase 3 (engine): propagate(sound, listener, world) → AudibilityEvent | null
  it('the propagation function signature compiles', () => {
    type PropagateFn = (
      sound: ISound,
      listenerId: string,
      world: object,
    ) => IAudibilityEvent | null;

    const propagate: PropagateFn = (sound) => {
      // Same-room path: ADR-172 §Propagation function step 5 — clarity is
      // always full when source and listener share a location, so the stub
      // returns a degenerate full-clarity event when listener is in the
      // sound's source room. This stub exists only to satisfy the type.
      return {
        sourceRoomId: sound.sourceLocation,
        targetRoomId: sound.sourceLocation,
        sourceEntityId: sound.sourceEntity,
        kind: sound.kind,
        volumeTier: sound.volumeTier,
        audibilityTier: 'full',
        content: sound.content,
        timestamp: 0,
      };
    };

    const result = propagate(
      {
        sourceLocation: 'r-parlor',
        sourceEntity: 'a-alderman',
        kind: 'speech',
        volumeTier: 'normal',
      },
      'a-player',
      {},
    );
    expect(result).not.toBeNull();
  });

  // Phase 6 (stdlib): context.emitSound(sound) — the action-side API
  it('the emitSound signature accepts a Sound and returns void', () => {
    type EmitSound = (sound: ISound) => void;
    const emit: EmitSound = () => {
      /* phase-1 stub */
    };
    emit({
      sourceLocation: 'r-parlor',
      sourceEntity: 'a-alderman',
      kind: 'speech',
      volumeTier: 'normal',
    });
  });

  // Phase 5 (channels): an AudibilityEvent flows as a sound-channel payload
  it('AudibilityEvent is structurally compatible with a wire payload', () => {
    type WirePayload<T> = { kind: string; payload: T };

    const wire: WirePayload<IAudibilityEvent> = {
      kind: 'sound',
      payload: {
        sourceRoomId: 'r-parlor',
        targetRoomId: 'r-hallway',
        sourceEntityId: 'a-alderman',
        kind: 'speech',
        volumeTier: 'raised',
        audibilityTier: 'muffled',
        timestamp: 1,
      },
    };
    expect(wire.payload.audibilityTier).toBe('muffled');
  });

  // ISoundContent is optional and structurally separable
  it('ISoundContent type is exported and consumable independently', () => {
    const content: ISoundContent = { messageId: 'dungeo.alderman.line-1' };
    expect(content.messageId).toBe('dungeo.alderman.line-1');
  });
});
