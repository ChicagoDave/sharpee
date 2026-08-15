/**
 * Conscience pressure bookkeeping (ADR-318 D8) — the deposit/drain half
 * the pure arbiter never touches.
 *
 * Guilt is the ledger of the arbiter's defeats: every live principle that
 * loses an arbitration deposits pressure. The curve and its rates are
 * runtime-owned (rule 4); the bands move monotonically upward under
 * deposits (D11: ordering, not scheduling, is the testable fact).
 *
 * Public interface: depositPressure, drainPressure, pressureBandFor,
 *   BandTransition.
 * Owner context: @sharpee/character / arbiter
 */

import { CharacterModelTrait, type PressureBand } from '@sharpee/world-model';
import type { ArbiterVerdict } from './arbiter-types.js';

/** Pressure added per defeated principle (runtime-owned curve). */
const DEPOSIT_PER_DEFEAT = 15;

/** Band thresholds on the 0..100 curve (runtime-owned). */
const BURDENED_AT = 30;
const BREAKING_AT = 70;

/** A band change produced by a deposit or drain — author-channel material (D11). */
export interface BandTransition {
  from: PressureBand;
  to: PressureBand;
}

/**
 * The band a curve value falls in. Monotonic in value — deposits can only
 * hold or climb the band, never lower it (D11's ordering contract).
 *
 * @param value - Curve value, 0..100
 * @returns The band word
 */
export function pressureBandFor(value: number): PressureBand {
  if (value >= BREAKING_AT) return 'breaking';
  if (value >= BURDENED_AT) return 'burdened';
  return 'clear';
}

/**
 * Deposit pressure for a verdict's defeats onto the trait (D8). No
 * defeats → no mutation. Sensitivity is personality: `remorseful` doubles
 * each deposit, `untroubled` quarters it (runtime-owned scaling of the
 * existing adjective machinery).
 *
 * @param trait - The character's trait (mutated: pressure value + band)
 * @param verdict - The arbitration whose defeats deposit
 * @returns The band transition if the deposit crossed one, else undefined
 */
export function depositPressure(
  trait: CharacterModelTrait,
  verdict: ArbiterVerdict,
): BandTransition | undefined {
  if (verdict.defeats.length === 0) return undefined;

  let perDefeat = DEPOSIT_PER_DEFEAT;
  if ((trait.personality['remorseful'] ?? 0) > 0) perDefeat *= 2;
  if ((trait.personality['untroubled'] ?? 0) > 0) perDefeat /= 4;

  const from = trait.pressure.band;
  const value = Math.min(100, trait.pressure.value + perDefeat * verdict.defeats.length);
  const to = pressureBandFor(value);
  trait.setPressure(value, to);

  return to !== from ? { from, to } : undefined;
}

/**
 * Drain the curve on a discharge — confession ends the losing collisions
 * (D8). Resets value and band and releases every ledger pin (a `breaking`
 * discharge unpins; being broken is a state only an author writes).
 *
 * @param trait - The character's trait (mutated: pressure reset, pins released)
 * @returns The band transition if the drain crossed one, else undefined
 */
export function drainPressure(trait: CharacterModelTrait): BandTransition | undefined {
  const from = trait.pressure.band;
  trait.setPressure(0, 'clear');
  trait.unpinLedger();
  return from !== 'clear' ? { from, to: 'clear' } : undefined;
}
