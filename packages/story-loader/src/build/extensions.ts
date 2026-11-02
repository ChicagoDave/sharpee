/**
 * extensions.ts — the `extensions` step: each `use`d extension registers on the world.
 *
 * The trusted extensions a story's header names register FIRST — their
 * world-side registrations (interceptors, resolvers) must exist before
 * any entity composes their vocabulary, so this is the first step of the
 * build. A name with no registry entry is a load-time fact, not a
 * backstop: the compiler admits only the names its manifests carry, so
 * the refusal fires only when the two registries have drifted apart (the
 * manifest-conformance test pins them together).
 *
 * Public interface: registerExtensionWorlds (the `extensions` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-215 — `use`-declared trusted extensions and their registration slots.
 */
import type { WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { EXTENSION_REGISTRY } from '../extension-registry.js';
import type { BuildContext } from './context.js';

/**
 * The `extensions` step: every `use`d extension's `registerWorld`, in the
 * header's order.
 * @param story the build context
 * @param world the world being built
 * @throws LoadError when a `use` name has no registry entry (registry drift)
 */
export function registerExtensionWorlds(story: BuildContext, world: WorldModel): void {
  for (const name of story.ir.uses ?? []) {
    const registration = EXTENSION_REGISTRY.get(name);
    if (!registration) {
      throw new LoadError(
        `\`use ${name}\` names no trusted extension — known: ${[...EXTENSION_REGISTRY.keys()].join(', ')}.`,
      );
    }
    registration.registerWorld?.(world);
  }
}
