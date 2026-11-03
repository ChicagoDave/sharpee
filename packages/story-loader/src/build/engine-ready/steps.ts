/**
 * steps.ts — the engine-ready order, as data.
 *
 * `ChordStory.onEngineReady` is a loop over these steps, in list order,
 * over the story's `BuildContext`, the built world and the engine. Each
 * step is one module's `run(story, world, engine)`; the `requires` on an
 * entry name the earlier steps whose work it depends on, so a test pins
 * the order and reports a reordered copy by name. Three of the steps
 * register turn plugins, and equal-priority plugins tie-break by
 * registration order, so their `requires` chain is that order: the
 * story's own flush first, then the state-machine plugin, then the
 * `use`d extensions' plugins, then the scheduler.
 *
 * Public interface: ENGINE_READY_STEPS, EngineReadyStep.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list, one module per step.
 * - ADR-335 D1 — `RUNTIME_BIND_STEPS`, the shape this copies.
 * - ADR-377 D2 — the state-machine plugin registers before the extensions'.
 * - ADR-332 — the story-reactions band leads; the flush is its first plugin.
 */
import type { StoryEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from '../context.js';
import { registerCharacterPhase } from './character-phase.js';
import { registerDeadlyExits } from './deadly-exits.js';
import { wireEngineSeams } from './engine-seams.js';
import { installExtensionPlugins } from './extension-plugins.js';
import { installMachines } from './machines.js';
import { registerNpcBehaviors } from './npc-behaviors.js';
import { registerPresentEntries } from './present-entries.js';
import { installScheduler } from './scheduler.js';

/** One step of the engine-ready wiring, in the order the stages run today. */
export interface EngineReadyStep {
  readonly name: string;
  /** Names of earlier steps whose work this step depends on. */
  readonly requires: readonly string[];
  readonly run: (story: BuildContext, world: WorldModel, engine: StoryEngine) => void;
}

/**
 * The engine-ready order, as data: the engine's seams into the runtime
 * and the evaluator first, then the NPC service's behaviors and the
 * character tick phase, then the plugins in their tie-break order, then
 * the two registrations that need only the engine.
 */
export const ENGINE_READY_STEPS: readonly EngineReadyStep[] = [
  { name: 'engine-seams', requires: [], run: wireEngineSeams },
  { name: 'npc-behaviors', requires: [], run: registerNpcBehaviors },
  { name: 'character-phase', requires: [], run: registerCharacterPhase },
  // ADR-377 D2: before the extensions' plugins, after the story's flush.
  { name: 'state-machines', requires: ['engine-seams'], run: installMachines },
  { name: 'extensions', requires: ['state-machines'], run: installExtensionPlugins },
  { name: 'scheduler', requires: ['extensions'], run: installScheduler },
  { name: 'deadly-exits', requires: [], run: registerDeadlyExits },
  { name: 'present-entries', requires: [], run: registerPresentEntries },
];
