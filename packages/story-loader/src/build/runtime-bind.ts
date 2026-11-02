/**
 * runtime-bind.ts — the `runtime-bind` step: the turn-by-turn runtime binds to the world.
 *
 * Rules, on-clause interceptors and derived-property chains register on
 * the world here, all per-world and keyed, through the runtime's own
 * pinned step list. The step runs after every entity exists and is wired,
 * since the clauses it binds name entities, and before the start block,
 * which executes through the bound runtime.
 *
 * Public interface: bindRuntime (the `runtime-bind` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-335 D1 — `RUNTIME_BIND_STEPS`, the runtime's own order as data.
 * - ADR-207, ADR-208 — per-world, keyed bindings.
 */
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from './context.js';

/**
 * The `runtime-bind` step: `ChordRuntime.bind` over the built world.
 * @param story the build context
 * @param world the world being built
 */
export function bindRuntime(story: BuildContext, world: WorldModel): void {
  story.runtime.bind(world);
}
