/**
 * Computed-exit declaration contract (ADR-295 D3).
 *
 * A story trait fulfills this contract to declare that some (or all) of a
 * room's directions are computed exits: existence and the candidate
 * destination set are pure serialized trait data, consultable at validate
 * time with no code execution and no draw. The traversal-time half — which
 * candidate the actor actually reaches — is a registered `ExitResolver`
 * (capabilities/exit-resolver-binding.ts).
 *
 * Public interface: `IComputedExitDeclaration`, `IComputedExitCarrier`,
 * `isComputedExitCarrier`.
 * Owner: world-model (room domain, ADR-295 D3).
 */

import type { DirectionType } from '../../constants/directions.js';
import type { ITrait } from '../trait.js';

/**
 * The declared outcome space of one computed exit (ADR-295 D3).
 *
 * Candidates are what make the outcome space finite and enumerable
 * (ADR-293 D4): topology tools show the set honestly, and a resolver
 * returning a destination outside it is warned and honored.
 */
export interface IComputedExitDeclaration {
  /** Room entity ids the resolver may return for this direction. */
  candidates: string[];
}

/**
 * The data shape a computed-exit-declaring trait carries (ADR-295 D3).
 *
 * Exactly one of the two fields is expected:
 * - `computedExits` — per-direction declarations; each declared direction
 *   EXISTS as an exit (in addition to any static exits).
 * - `computedExitsAll` — one declaration overlaying every direction the room
 *   exposes statically; contributes no existence beyond the static map.
 */
export interface IComputedExitCarrier {
  computedExits?: Partial<Record<DirectionType, IComputedExitDeclaration>>;
  computedExitsAll?: IComputedExitDeclaration;
}

/**
 * Duck-type check: does this trait declare computed exits?
 *
 * @param trait - Any trait instance on a room
 * @returns true when the trait carries either declaration field
 */
export function isComputedExitCarrier(trait: ITrait): trait is ITrait & IComputedExitCarrier {
  const carrier = trait as ITrait & IComputedExitCarrier;
  return carrier.computedExits !== undefined || carrier.computedExitsAll !== undefined;
}
