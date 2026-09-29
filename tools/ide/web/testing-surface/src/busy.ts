/**
 * busy.ts — what the busy bar says while the driver replays a line.
 *
 * A replay retypes a line's commands one turn at a time, and for a long line
 * that takes long enough that a bare "replaying…" reads as stalled. The bar
 * counts steps instead, so progress is visible.
 *
 * Public interface: busyLabel.
 * Owner context: tools/ide — testing surface.
 */

/** Which replay the driver is running. */
export type BusyKind = 'line' | 'restore';

/**
 * The busy bar's text for one replay.
 *
 * @param kind a line visit (a pill click, a fork, a cut) or the session restore on open
 * @param done steps that have landed so far
 * @param total steps the replay will type; 0 when only the boot look is awaited
 * @returns e.g. `Replaying line — 12 of 40…`, or `Replaying line…` before any step is known
 */
export function busyLabel(kind: BusyKind, done: number, total: number): string {
  const verb = kind === 'restore' ? 'Restoring session' : 'Replaying line';
  if (total <= 0) return `${verb}…`;
  return `${verb} — ${Math.min(Math.max(done, 0), total)} of ${total}…`;
}
