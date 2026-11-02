/**
 * scheduler.ts — the `scheduler` step: the story's daemons on a scheduler plugin.
 *
 * Scheduler constructs (`once`, `every`, `define sequence`, every-turn
 * trait clauses) lower to plugin-scheduler daemons through the runtime.
 * A story with any registers one scheduler plugin and every daemon on
 * it; a story with none registers nothing. All progression state is world
 * state — no runner-state plumbing.
 *
 * Public interface: installScheduler (the `scheduler` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-071, ADR-120 — daemons and fuses.
 */
import type { StoryEngine } from '@sharpee/engine';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from '../context.js';

/**
 * The `scheduler` step: one plugin carrying every daemon the runtime builds.
 * @param story the build context (the runtime builds the daemons)
 * @param _world the built world (unused; the daemons read it at tick time)
 * @param engine the story-facing engine role
 */
export function installScheduler(story: BuildContext, _world: WorldModel, engine: StoryEngine): void {
  const daemons = story.runtime.buildSchedulerDaemons();
  if (daemons.length > 0) {
    const plugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(plugin);
    const scheduler = plugin.getScheduler();
    for (const daemon of daemons) scheduler.registerDaemon(daemon);
  }
}
