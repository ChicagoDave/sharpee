/**
 * extension-plugins.ts — the `extensions` step: each `use`d extension's plugin and its IR-shaped construction.
 *
 * The trusted extensions, in the registry's order — never the header's
 * `use` order, so two extensions' equal-priority plugins keep one fixed
 * tie-break whatever an author wrote first. Per `use`d extension, its
 * config-free plugin slot and its IR-shaped construction — the only
 * moment a plugin registry exists. Generic and naming no extension:
 * enabling one is a registry entry, never a loader edit. A construct
 * present without its `use` never reaches here: `validateIR` refused the
 * IR at `createStory`.
 *
 * Public interface: installExtensionPlugins (the `extensions` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2, D4 — the engine wiring as a named step list; the IR gate.
 * - ADR-215; ADR-335 D3 — the extension registry and its install slots.
 */
import type { StoryEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import { EXTENSION_REGISTRY } from '../../extension-registry.js';
import type { BuildContext } from '../context.js';
import { installContextFor } from './install-context.js';

/**
 * The `extensions` step: every `use`d extension's `registerPlugin` and
 * `installFromIR`, in the registry's order.
 * @param story the build context
 * @param world the built world
 * @param engine the story-facing engine role
 */
export function installExtensionPlugins(story: BuildContext, world: WorldModel, engine: StoryEngine): void {
  const uses = story.ir.uses ?? [];
  const installContext = installContextFor(story, world);
  for (const [name, registration] of EXTENSION_REGISTRY) {
    if (!uses.includes(name)) continue;
    registration.registerPlugin?.(engine.getPluginRegistry());
    registration.installFromIR?.(story.ir, engine, installContext);
  }
}
