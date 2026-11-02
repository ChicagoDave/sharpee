/**
 * install-context.ts — the install-time services the state machines and the extensions receive.
 *
 * The state-machine plugin and each `use`d extension lower their IR
 * constructs against the built world through two story services: the
 * evaluator's condition evaluation and the runtime's statement executor.
 * Both steps build the same context from the same story and world; the
 * closures hold no state, so two instances behave as one.
 *
 * Public interface: installContextFor.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-335 D3 — `ExtensionInstallContext`, the extensions' install seam.
 */
import type { WorldModel } from '@sharpee/world-model';
import type { ExtensionInstallContext } from '../../extension-registry.js';
import type { BuildContext } from '../context.js';

/**
 * The install context over this story and its built world.
 * @param story the build context (the evaluator and the runtime)
 * @param world the built world
 * @returns the context the state machines and the extensions install with
 */
export function installContextFor(story: BuildContext, world: WorldModel): ExtensionInstallContext {
  return {
    world,
    evalCondition: (condition, world) => story.evaluator.evalCondition(condition, { world }),
    execMachineBody: (statements, world) => story.runtime.execMachineBody(statements, world),
  };
}
