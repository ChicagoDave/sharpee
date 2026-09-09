/**
 * The install runner: runs a story's installation steps in order and
 * returns what the engine adopts.
 *
 * Every step runs; a step that throws (a config or world validation
 * failure) ends the installation with nothing adopted, which is the
 * fail-fast posture the validators already take. When the list has run,
 * the draft must carry narrative settings, a player, and metadata — a
 * list that ends without one has lost a step, and that is a programming
 * error reported by field, not a story the engine can start.
 *
 * Public interface: `runInstallSteps`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-334 A1 (the list idiom shared with the turn runner).
 */

import type { InstallContext, InstallStep, StoryInstallResult } from './context.js';

/**
 * Run the installation steps over the context and return the result the
 * engine adopts.
 *
 * @param context - The installation's context, built by the engine
 * @param steps - The steps, in run order
 * @throws whatever a step throws; an Error naming the missing field when the list ends without a required one
 */
export function runInstallSteps(context: InstallContext, steps: readonly InstallStep[]): StoryInstallResult {
  for (const step of steps) step.run(context);
  const { narrativeSettings, player, metadata, implicitActions } = context.draft;
  if (!narrativeSettings) throw new Error('The story installed without narrativeSettings');
  if (!player) throw new Error('The story installed without a player');
  if (!metadata) throw new Error('The story installed without metadata');
  return { story: context.story, narrativeSettings, player, metadata, implicitActions };
}
