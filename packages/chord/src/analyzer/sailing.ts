/**
 * sailing.ts — the compass-to-bearing table and the wind lowering (ADR-375 D2, D4)
 *
 * Public interface: COMPASS_BEARINGS, bearingOfDirection, windToIR.
 * Owner context: @sharpee/chord analyzer. A compass word names a bearing
 * (north 0, clockwise), so a wind or a heading written as a word lowers to
 * the same number a bearing does; the loader reads one shape.
 *
 * References:
 * - ADR-375 D2 — headings are bearings in whole degrees; a compass direction names its bearing.
 * - ADR-375 D4 — `wind: from <direction or bearing>` or `wind: calm`.
 */
import type { WindValue } from '../ast.js';
import type { IRWind } from '../ir.js';

/** The eight compass words and their bearings (ADR-375 D2). */
export const COMPASS_BEARINGS: ReadonlyMap<string, number> = new Map([
  ['north', 0], ['northeast', 45], ['east', 90], ['southeast', 135],
  ['south', 180], ['southwest', 225], ['west', 270], ['northwest', 315],
]);

/** A compass word's bearing, or undefined for any other word. */
export function bearingOfDirection(direction: string): number | undefined {
  return COMPASS_BEARINGS.get(direction.toLowerCase());
}

/** A wind as written to the IR's one shape: the bearing it comes from, or a calm. */
export function windToIR(wind: WindValue): IRWind {
  if (wind.kind === 'calm') return 'calm';
  if (wind.kind === 'bearing') return { bearing: wind.bearing };
  return { bearing: bearingOfDirection(wind.direction) ?? 0 };
}
