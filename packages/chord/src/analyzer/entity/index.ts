/**
 * index.ts — the entity-block line builders, in the order they run.
 *
 * `ENTITY_LINE_BUILDERS` is the order `Analyzer.buildEntity` runs the
 * builders in. Each entry names the builders whose slices it reads, and
 * `entityBuilderOrderViolations` checks the order against those names, so a
 * builder moved above one it reads from fails a test naming both. The order
 * is also the order a block's diagnostics are reported in.
 *
 * Public interface: ENTITY_LINE_BUILDERS, entityBuilderOrderViolations(),
 * and the context and assembler modules' exports.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-336 D2 — builders keyed by keyword family, order pinned by a test.
 */
import { requiresOrderViolations, type OrderViolation } from '../requires.js';
import type { EntityLineBuilder } from './context.js';
import { characterHostBuilder } from './character-host.js';
import { characterLinesBuilder } from './character-lines.js';
import { clausesBuilder } from './clauses.js';
import { compositionsBuilder } from './compositions.js';
import { countersBuilder } from './counters.js';
import { exitsBuilder } from './exits.js';
import { hostGatesBuilder } from './host-gates.js';
import { identityBuilder } from './identity.js';
import { normativeLinesBuilder } from './normative-lines.js';
import { placementBuilder } from './placement.js';
import { playableBuilder } from './playable.js';
import { startsBuilder } from './starts.js';
import { proseBuilder } from './prose.js';
import { statesBuilder } from './states.js';

export { assembleEntity } from './assemble.js';
export { isPersonDecl, isPlayableDecl, newEntityDraft } from './context.js';
export type { EntityBuildContext, EntityDraft, EntityLineBuilder } from './context.js';

/** The builders in execution order. */
export const ENTITY_LINE_BUILDERS: ReadonlyArray<EntityLineBuilder> = [
  playableBuilder,
  compositionsBuilder,
  startsBuilder,
  identityBuilder,
  characterHostBuilder,
  characterLinesBuilder,
  normativeLinesBuilder,
  hostGatesBuilder,
  placementBuilder,
  exitsBuilder,
  statesBuilder,
  countersBuilder,
  proseBuilder,
  clausesBuilder,
];

/**
 * Every `requires` a builder list fails to satisfy — see `requiresOrderViolations`.
 * @param builders the list to check, in execution order
 */
export function entityBuilderOrderViolations(builders: ReadonlyArray<EntityLineBuilder>): OrderViolation[] {
  return requiresOrderViolations(builders);
}
