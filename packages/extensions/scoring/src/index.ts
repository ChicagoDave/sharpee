/**
 * @sharpee/ext-scoring
 *
 * Scoring extension for the Sharpee IF engine (ADR-260 D5).
 *
 * Shaped exactly like `@sharpee/ext-basic-combat`: it contributes **no action,
 * no grammar, and no messages**. SCORE-the-verb stays in stdlib; this
 * extension supplies what sits behind it — the enablement flag the action
 * reads, and the plugin that notices promotions.
 *
 * **Enabling scoring and installing the ladder are separate steps, and must
 * be.** `ExtensionRegistration.registerWorld` is typed `(world) => void` on a
 * module-level const map, so a registry entry has no access to the story's IR
 * and cannot carry its ranks. The ladder travels the generic path instead —
 * the loader lowers `ir.ranks` through `world.setRanks(...)` with no knowledge
 * of which extension consumes it.
 *
 * @example
 * ```typescript
 * import { registerScoring } from '@sharpee/ext-scoring';
 *
 * // In a story's initializeWorld(world):
 * registerScoring(world);
 * world.setRanks([
 *   { id: 'novice', name: 'Novice', threshold: 0 },
 *   { id: 'expert', name: 'Expert', threshold: 400 },
 * ]);
 * ```
 */

import type { IWorldModel } from '@sharpee/world-model';
import { RankWatcherPlugin } from './rank-watcher-plugin.js';

/**
 * Enable scoring on a world.
 *
 * Flips `isScoringEnabled()`, which is what turns SCORE from *"This isn't that
 * kind of game"* into a real score line. Takes **no options**: the rank ladder
 * arrives separately via `world.setRanks(...)`.
 *
 * Idempotent and per-world, so calling it on every story load is correct.
 *
 * @param world - The world to enable scoring on
 */
export function registerScoring(world: IWorldModel): void {
  world.setScoringEnabled(true);
}

/**
 * Install the promotion watcher on an engine's plugin registry.
 *
 * Reached through `ExtensionRegistration.registerPlugin` — this is that slot's
 * first live use (ADR-260 D6). The call site is the loader's `onEngineReady`,
 * because a plugin registry exists only once an engine does.
 *
 * @param registry - The engine's plugin registry
 */
export function registerScoringPlugin(registry: { register(plugin: unknown): void }): void {
  registry.register(new RankWatcherPlugin());
}

export { RankWatcherPlugin } from './rank-watcher-plugin.js';
export type { RankWatcherState, RankRisenData } from './rank-watcher-plugin.js';
