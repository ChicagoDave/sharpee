/**
 * machines.ts — the `state-machines` step: the one state-machine plugin, with every `define machine` lowered in.
 *
 * State machines are core: every story gets one state-machine plugin,
 * registered before the `use`d extensions' plugins so equal-priority
 * plugins keep one fixed tie-break. A story with no machines still
 * carries the plugin: it is the host every vehicle's built-in machine
 * ticks in, reading each `drive: state` line's `position` block through
 * the story's compiled guards.
 *
 * Public interface: installMachines (the `state-machines` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-377 D2 — state machines are core; the plugin precedes the extensions'.
 * - ADR-366 D5a, D5e — the vehicle machine and its `position` block.
 */
import type { StoryEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import { installStateMachines } from '../../state-machines.js';
import type { BuildContext } from '../context.js';
import { vehiclePositionAnswer } from '../vehicles.js';
import { installContextFor } from './install-context.js';

/**
 * The `state-machines` step: install the plugin with the story's machines.
 * @param story the build context
 * @param world the built world
 * @param engine the story-facing engine role
 */
export function installMachines(story: BuildContext, world: WorldModel, engine: StoryEngine): void {
  installStateMachines(
    story.ir,
    engine,
    installContextFor(story, world),
    (vehicleWorldId, world) => vehiclePositionAnswer(story, vehicleWorldId, world),
  );
}
