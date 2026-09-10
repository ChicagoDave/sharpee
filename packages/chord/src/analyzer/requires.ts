/**
 * requires.ts — the order check for a declared list of named steps.
 *
 * A step list (analysis passes, entity line builders) carries, per entry,
 * the names of the earlier entries it reads from. This module checks that
 * every such name is on the list and listed earlier, and reports each fault
 * by the two names involved. It reads the list and runs nothing, so a test
 * can check a reordered copy as easily as the real list.
 *
 * Public interface: OrderedStep, OrderViolation, requiresOrderViolations().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * References:
 * - ADR-336 D2/D3 — the pass list and the builder list are data whose order
 *   a test pins by `requires`.
 */

/** A named step with the names of the earlier steps it reads from. */
export interface OrderedStep {
  readonly name: string;
  readonly requires: readonly string[];
}

/** One ordering fault: `name` needs `requires`, which is absent or not earlier. */
export interface OrderViolation {
  name: string;
  requires: string;
}

/**
 * Every `requires` an ordered list fails to satisfy — a required name absent
 * from the list, or listed at or after the step that needs it.
 * @param steps the list to check, in execution order
 * @returns the faults, empty when the order satisfies every entry
 */
export function requiresOrderViolations(steps: ReadonlyArray<OrderedStep>): OrderViolation[] {
  const violations: OrderViolation[] = [];
  steps.forEach((step, index) => {
    for (const required of step.requires) {
      const at = steps.findIndex((s) => s.name === required);
      if (at === -1 || at >= index) violations.push({ name: step.name, requires: required });
    }
  });
  return violations;
}
