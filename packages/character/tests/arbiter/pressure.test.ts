/**
 * Pressure bookkeeping tests (ADR-318 D8, D11)
 *
 * Derived from the depositPressure / drainPressure Behavior Statements:
 * every DOES line asserts on trait.pressure / trait.ledger state, every
 * REJECTS WHEN line has a no-mutation test.
 */

import { describe, it, expect } from 'vitest';
import { CharacterModelTrait } from '@sharpee/world-model';
import { depositPressure, drainPressure, pressureBandFor } from '../../src/arbiter';
import type { ArbiterVerdict } from '../../src/arbiter';

function defeatVerdict(defeatCount: number): ArbiterVerdict {
  return {
    winner: 'fear',
    act: 'comply',
    readings: [],
    defeats: Array.from({ length: defeatCount }, (_, i) => ({
      force: 'duty' as const,
      feed: `principle:p${i}`,
    })),
  };
}

describe('pressureBandFor — monotonic thresholds (D11)', () => {
  it('maps the curve to clear / burdened / breaking', () => {
    expect(pressureBandFor(0)).toBe('clear');
    expect(pressureBandFor(29)).toBe('clear');
    expect(pressureBandFor(30)).toBe('burdened');
    expect(pressureBandFor(69)).toBe('burdened');
    expect(pressureBandFor(70)).toBe('breaking');
    expect(pressureBandFor(100)).toBe('breaking');
  });
});

describe('depositPressure (D8: guilt is the ledger of defeats)', () => {
  it('raises pressure.value by 15 per defeat and recomputes the band', () => {
    const trait = new CharacterModelTrait();
    expect(trait.pressure).toEqual({ value: 0, band: 'clear' });

    const transition = depositPressure(trait, defeatVerdict(1));
    expect(trait.pressure).toEqual({ value: 15, band: 'clear' });
    expect(transition).toBeUndefined();

    const crossing = depositPressure(trait, defeatVerdict(1));
    expect(trait.pressure).toEqual({ value: 30, band: 'burdened' });
    expect(crossing).toEqual({ from: 'clear', to: 'burdened' });
  });

  it('climbs monotonically to breaking and caps at 100', () => {
    const trait = new CharacterModelTrait();
    const bands: string[] = [];
    for (let i = 0; i < 8; i++) {
      depositPressure(trait, defeatVerdict(1));
      bands.push(trait.pressure.band);
    }
    // Ordering is the contract: never a lower band after a higher one
    const order = ['clear', 'burdened', 'breaking'];
    for (let i = 1; i < bands.length; i++) {
      expect(order.indexOf(bands[i])).toBeGreaterThanOrEqual(order.indexOf(bands[i - 1]));
    }
    expect(trait.pressure.value).toBeLessThanOrEqual(100);
    expect(trait.pressure.band).toBe('breaking');
  });

  it('does not mutate on a defeat-free verdict', () => {
    const trait = new CharacterModelTrait();
    trait.setPressure(40, 'burdened');

    const transition = depositPressure(trait, defeatVerdict(0));

    expect(transition).toBeUndefined();
    expect(trait.pressure).toEqual({ value: 40, band: 'burdened' });
  });

  it('remorseful doubles the deposit; untroubled quarters it (sensitivity is personality)', () => {
    const remorseful = new CharacterModelTrait({ personality: { remorseful: 0.5 } });
    depositPressure(remorseful, defeatVerdict(1));
    expect(remorseful.pressure.value).toBe(30);

    const untroubled = new CharacterModelTrait({ personality: { untroubled: 0.5 } });
    depositPressure(untroubled, defeatVerdict(1));
    expect(untroubled.pressure.value).toBe(3.75);
  });
});

describe('drainPressure (D8: discharge resets the curve; D9: it unpins)', () => {
  it('resets value and band and releases every ledger pin', () => {
    const trait = new CharacterModelTrait();
    trait.setPressure(80, 'breaking');
    trait.mintLedgerEntry({
      kind: 'claim', audience: 'inspector', factId: 'killer',
      claimedValue: 'nobody', turnMinted: 3, pinned: true,
    });

    const transition = drainPressure(trait);

    expect(trait.pressure).toEqual({ value: 0, band: 'clear' });
    expect(trait.ledger.every(e => !e.pinned)).toBe(true);
    // The entry itself survives — the platform remembers the lie, not the strain
    expect(trait.ledger).toHaveLength(1);
    expect(transition).toEqual({ from: 'breaking', to: 'clear' });
  });

  it('reports no transition when already clear (idempotent)', () => {
    const trait = new CharacterModelTrait();
    expect(drainPressure(trait)).toBeUndefined();
    expect(trait.pressure).toEqual({ value: 0, band: 'clear' });
  });
});
