/**
 * The witness report's three-tier loudness is a projection of ADR-172's
 * five-tier VolumeTier, never a second scale (ADR-392 D5, AC-10).
 */

import { describe, test, expect } from 'vitest';
import type { VolumeTier } from '@sharpee/if-domain';
import { witnessSoundIntensityOf, SenseType, type WitnessSoundIntensity, type WitnessSoundEvent } from '../../../src/scope/types';

describe('witnessSoundIntensityOf (ADR-392 D5)', () => {
  test('maps every volume tier onto the three witness tiers', () => {
    const expected: Record<VolumeTier, WitnessSoundIntensity> = {
      whisper: 'faint',
      subdued: 'faint',
      normal: 'moderate',
      raised: 'loud',
      shouting: 'loud'
    };
    for (const [tier, intensity] of Object.entries(expected) as Array<[VolumeTier, WitnessSoundIntensity]>) {
      expect(witnessSoundIntensityOf(tier)).toBe(intensity);
    }
  });

  test("the witness sound event's intensity is the projection's type", () => {
    const data: WitnessSoundEvent['data'] = {
      witnessId: 'a01',
      sense: SenseType.HEARING,
      soundType: 'bell',
      intensity: witnessSoundIntensityOf('shouting'),
      timestamp: 0
    };
    expect(data.intensity).toBe('loud');
  });
});
