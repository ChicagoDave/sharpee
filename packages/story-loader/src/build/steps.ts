/**
 * steps.ts — the world build order, as data.
 *
 * `ChordStory.initializeWorld` is a loop over these steps, in list order,
 * over one `BuildContext`. Each step is one module's `run(story, world)`;
 * the `requires` on an entry name the earlier steps whose work it reads,
 * so a test pins the order and reports a reordered copy by name rather
 * than the shape of one method doing so. Every stage of the build is on
 * the list: the extensions' world registrations, the entity family, the
 * story's opening state, the three registrations that close over the
 * world, the reference drain, the runtime bind, the tool-gated check, and
 * the start block that settles the role.
 *
 * Public interface: WORLD_BUILD_STEPS, WorldBuildStep.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list, one module per step.
 * - ADR-335 D1 — `RUNTIME_BIND_STEPS`, the shape this copies.
 * - ADR-215 — extensions register before any entity composes their vocabulary.
 * - ADR-378 D6, D6b — the two stamps run after every exit is wired.
 * - ADR-230 D3c — references resolve once every entity exists.
 * - ADR-327 D10 — the start block runs last, against the built world.
 */
import type { WorldModel } from '@sharpee/world-model';
import { resolvePendingEntityRefs } from './adjectives.js';
import { stampExitAdmits, stampPushingWays } from './admittance.js';
import type { BuildContext } from './context.js';
import { checkCuttableImplementations } from './cuttable.js';
import { compileDetailChannels } from './detail-channels.js';
import { buildEntities } from './entity.js';
import { registerExtensionWorlds } from './extensions.js';
import { compileLocationNames } from './location-names.js';
import { registerRemovalObserver } from './removal-observer.js';
import { bindRuntime } from './runtime-bind.js';
import { startBlock } from './start.js';
import { seedStoryState } from './story-state.js';
import { wireEntities } from './wiring.js';

/** One step of the world build, in the order the stages run today. */
export interface WorldBuildStep {
  readonly name: string;
  /** Names of earlier steps whose work this step reads. */
  readonly requires: readonly string[];
  readonly run: (story: BuildContext, world: WorldModel) => void;
}

/**
 * The world build order, as data. The extensions register first; pass 1
 * creates every entity; pass 2 wires each against a world where every id
 * resolves; then the two admittance stamps, each after the wiring it
 * would otherwise be rewritten by; the story's opening state and the
 * registrations that close over the world; the reference drain once every
 * entity exists; the runtime bind; the tool-gated check against the live
 * capability surface; and last the start block, which runs through the
 * bound runtime and settles the role.
 */
export const WORLD_BUILD_STEPS: readonly WorldBuildStep[] = [
  // ADR-215: world-side registrations exist before any entity composes
  // an extension's vocabulary.
  { name: 'extensions', requires: [], run: registerExtensionWorlds },
  { name: 'entities', requires: ['extensions'], run: buildEntities },
  { name: 'wiring', requires: ['entities'], run: wireEntities },
  // ADR-378 D6: every exit is wired, so a stamp cannot be rewritten now.
  { name: 'exit-admittance', requires: ['wiring'], run: stampExitAdmits },
  // ADR-378 D6b: after every exit is wired and every exit line stamped.
  { name: 'pushing-ways', requires: ['exit-admittance'], run: stampPushingWays },
  // World state only — the story phase, counters, the score ceiling, ranks.
  { name: 'story-state', requires: [], run: seedStoryState },
  // Z3: one pre-removal observer serves every authored `disappeared` block.
  { name: 'removal-observer', requires: [], run: registerRemovalObserver },
  // Z3b: the two shipped trait shapes write fields pass 1 composed.
  { name: 'detail-channels', requires: ['entities'], run: compileDetailChannels },
  // ADR-349 D16: registered by IR id, which is the world id (ADR-389 D1).
  { name: 'location-names', requires: [], run: compileLocationNames },
  // ADR-230 D3c: forward references resolve now that every entity exists.
  { name: 'pending-refs', requires: ['entities'], run: resolvePendingEntityRefs },
  // The clauses it binds name entities pass 1 made.
  { name: 'runtime-bind', requires: ['entities'], run: bindRuntime },
  // ADR-230 D3c (PIN 3): reads each entity's traits and the live capability surface.
  { name: 'cuttable-check', requires: ['entities'], run: checkCuttableImplementations },
  // ADR-327 D10: the start block runs through the bound runtime against the
  // wired world; the role it assigns is placed by pass 2.
  { name: 'start-block', requires: ['wiring', 'runtime-bind'], run: startBlock },
];
