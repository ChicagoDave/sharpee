/**
 * bandOf — resolve which band a value falls into (ADR-262 D1).
 *
 * The pure lookup at the heart of the banded-scalar crossing engine: given a
 * value and a list of band thresholds sorted ascending, return the index of the
 * highest band whose threshold the value has reached, or -1 when the value is
 * below every band.
 *
 * Derived on every call, never stored (ADR-262 D5) — the same discipline
 * `ScoreLedger.getRank` follows, and the walk it replaces.
 *
 * Thresholds MUST be ascending and unique. Duplicate rejection happens at
 * registration (`ScoreLedger.setRanks`, the crossing-watcher factory), never
 * here — a lookup that silently tolerated a duplicate would make the resolved
 * band depend on array order (ADR-262 acceptance 1a).
 *
 * @param value - The scalar to place
 * @param ascendingThresholds - Band thresholds, sorted ascending, unique
 * @returns The index of the reached band, or -1 if the value is below all bands
 */
export function bandOf(value: number, ascendingThresholds: number[]): number {
  let index = -1;
  for (let i = 0; i < ascendingThresholds.length; i++) {
    if (ascendingThresholds[i] <= value) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
