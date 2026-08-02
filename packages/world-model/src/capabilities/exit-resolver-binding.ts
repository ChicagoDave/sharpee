/**
 * Exit-resolver binding types (ADR-295 computed exits).
 *
 * An exit resolver is the traversal-time half of a computed exit: the
 * declaration (which directions exist, with what candidate destinations)
 * is serialized trait data (`IComputedExitDeclaration`, traits/room/), while
 * the resolver is code bound per-world through this registry. Same ownership
 * model as capability behaviors (ADR-207) and action interceptors (ADR-208):
 * scoped to one running `WorldModel`, idempotent last-wins, never
 * serialized — registrars re-register on every story load.
 *
 * Public interface: `ExitResolver`, `ExitResolution`, `ExitResolverContext`.
 * Owner: world-model (computed-exit storage, ADR-295 D4).
 */

import type { ISemanticEvent, EntityId, RandomService } from '@sharpee/core';
import type { IFEntity } from '../entities/if-entity.js';
import type { ITrait } from '../traits/trait.js';
import type { WorldModel } from '../world/WorldModel.js';
import type { DirectionType } from '../constants/directions.js';
import type { IExitInfo } from '../traits/room/roomTrait.js';

/**
 * Context handed to an exit resolver at traversal time (ADR-295 D4).
 *
 * The `RandomService` is injected by the caller (the going action's
 * `context.random`); world-model never constructs randomness (ADR-293 D6).
 */
export interface ExitResolverContext {
  /** The live world the traversal is happening in. */
  world: WorldModel;
  /** The actor performing the traversal. */
  actorId: EntityId;
  /** The session random service — resolvers draw on their named points. */
  random: RandomService;
}

/**
 * A resolver's answer for one traversal (ADR-295 D4 — the CEXIT-shaped union).
 *
 * - `kind: 'exit'` — traverse to `destination`; optional narration `events`
 *   (messageId-bearing, forwarded verbatim by the going action ahead of the
 *   arrival description).
 * - `kind: 'blocked'` — the traversal does not happen; scoped to conditions
 *   knowable only at resolution time. Pure, pre-known blocking belongs on
 *   the existing blocked-exit surfaces instead.
 * - `undefined` — defer to static topology.
 */
export type ExitResolution =
  | { kind: 'exit'; destination: string; via?: string; events?: ISemanticEvent[] }
  | { kind: 'blocked'; messageId: string; params?: Record<string, unknown> }
  | undefined;

/**
 * Traversal-time destination resolution for a computed exit (ADR-295 D4).
 *
 * Called exactly once per traversal by `RoomBehavior.resolveExit`. May draw
 * on `ctx.random`; a `kind: 'exit'` destination is expected to come from the
 * declaring trait's candidate set (off-candidate returns are warned and
 * honored, D3).
 *
 * @param room - The room being exited
 * @param trait - The declaring trait instance (its data parameterizes the resolver)
 * @param direction - The direction of travel
 * @param staticExit - The static exit for this direction, if any
 * @param ctx - Live world, actor, and injected random service
 * @returns The resolution, or `undefined` to defer to static topology
 */
export type ExitResolver = (
  room: IFEntity,
  trait: ITrait,
  direction: DirectionType,
  staticExit: IExitInfo | null,
  ctx: ExitResolverContext
) => ExitResolution;
