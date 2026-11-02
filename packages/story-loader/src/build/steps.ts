/**
 * steps.ts — the world build order, as data.
 *
 * `ChordStory.initializeWorld` runs these steps in list order over one
 * `BuildContext`. Each step is one module's `run(story, world)`; the
 * `requires` on an entry name the earlier steps whose work it reads, so a
 * test pins the order and reports a reordered copy by name rather than
 * the shape of one method doing so. The list carries the entity family
 * today; the remaining stages of the build join it in their current order
 * (ADR-389 D2, phase by phase).
 *
 * Public interface: WORLD_BUILD_STEPS, WorldBuildStep.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list, one module per step.
 * - ADR-335 D1 — `RUNTIME_BIND_STEPS`, the shape this copies.
 * - ADR-378 D6, D6b — the two stamps run after every exit is wired.
 */
import type { WorldModel } from '@sharpee/world-model';
import { stampExitAdmits, stampPushingWays } from './admittance.js';
import type { BuildContext } from './context.js';
import { buildEntities } from './entity.js';
import { wireEntities } from './wiring.js';

/** One step of the world build, in the order the stages run today. */
export interface WorldBuildStep {
  readonly name: string;
  /** Names of earlier steps whose work this step reads. */
  readonly requires: readonly string[];
  readonly run: (story: BuildContext, world: WorldModel) => void;
}

/**
 * The world build order, as data. Pass 1 creates every entity; pass 2
 * wires each against a world where every id resolves; then the two
 * admittance stamps, each after the wiring it would otherwise be
 * rewritten by.
 */
export const WORLD_BUILD_STEPS: readonly WorldBuildStep[] = [
  { name: 'entities', requires: [], run: buildEntities },
  { name: 'wiring', requires: ['entities'], run: wireEntities },
  // ADR-378 D6: every exit is wired, so a stamp cannot be rewritten now.
  { name: 'exit-admittance', requires: ['wiring'], run: stampExitAdmits },
  // ADR-378 D6b: after every exit is wired and every exit line stamped.
  { name: 'pushing-ways', requires: ['exit-admittance'], run: stampPushingWays },
];


