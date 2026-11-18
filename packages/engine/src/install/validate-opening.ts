/**
 * The opening-validation step: refuse a story whose stated opening the
 * engine could not run as written, naming the routine at fault.
 *
 * A story's `opening` is a list of routine names. The type stops a wrong
 * name in TypeScript, but a list built at run time (or cast) can still
 * carry one, repeat one, or ask for a prologue the story does not have.
 * Each is refused here, at install, so the fault is reported against the
 * story and not discovered when the opening runs. A story with no
 * `opening` is not checked: it gets the default, whose `show-prologue`
 * prints nothing without a prologue.
 *
 * Invariant: after this step, a stated opening holds only known routine
 * names, each at most once, and names `show-prologue` only when the config
 * carries a prologue.
 *
 * Public interface: `validateOpeningStep`, `validateOpening`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-404 decision 14 (the small rules).
 */

import { OPENING_ROUTINES, type Story } from './story.js';
import type { InstallStep } from './context.js';

/**
 * Check a story's stated opening.
 *
 * @param story - The story being installed
 * @throws when the list names an unknown routine, repeats one, or names
 *         `show-prologue` in a story whose config has no prologue; the
 *         message names the routine
 */
export function validateOpening(story: Story): void {
  const opening = story.opening;
  if (opening === undefined) return;

  const known: readonly string[] = OPENING_ROUTINES;
  const seen = new Set<string>();
  for (const routine of opening) {
    if (!known.includes(routine)) {
      throw new Error(
        `The story's opening names '${String(routine)}', which is not an opening routine. ` +
        `The routines are ${known.map((name) => `'${name}'`).join(', ')}.`
      );
    }
    if (seen.has(routine)) {
      throw new Error(
        `The story's opening names '${routine}' twice. Each opening routine may appear once.`
      );
    }
    seen.add(routine);
  }

  if (seen.has('show-prologue') && !story.config.prologue) {
    throw new Error(
      "The story's opening names 'show-prologue', but the story's config has no prologue to show."
    );
  }
}

export const validateOpeningStep: InstallStep = {
  name: 'validate-opening',
  requires: ['validate-config'],
  run(context) {
    validateOpening(context.story);
  }
};
