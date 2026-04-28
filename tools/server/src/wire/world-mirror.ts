/**
 * Wire types for world-model replication (ADR-162).
 *
 * Public interface:
 *   - {@link SerializedWorldModel}: the serialized form of a WorldModel
 *     that rides the wire. Resolves to `string` (the verbatim return of
 *     `WorldModel.toJSON()`).
 *   - {@link ReadOnlyWorldModel}: the query-only narrowing of
 *     `IWorldModel` that server and client mirrors expose to renderers.
 *     Compile-time enforcement that mirror code cannot call mutators.
 *
 * Bounded context: shared wire-protocol types. Per ADR-162 Decision 4
 * and CLAUDE.md rule 7b (co-located wire-type sharing), this module is
 * imported by both the Node server and the browser client. Promotion
 * to `@sharpee/world-model` is deferred until a second consumer
 * surfaces.
 *
 * Invariant: this module declares types only. No runtime-specific
 * imports (Node-only, browser-only, or sandbox-only) — both sides must
 * be able to import without dragging in a runtime they lack.
 */

import type { IWorldModel, WorldModel } from '@sharpee/world-model';

/**
 * The wire shape of a world snapshot.
 *
 * `WorldModel.toJSON()` returns a JSON string; this alias preserves
 * that shape so receivers can pass it directly to `loadJSON()` without
 * a parse/stringify round-trip.
 */
export type SerializedWorldModel = ReturnType<WorldModel['toJSON']>;

/**
 * The query subset of `IWorldModel` exposed by server and client
 * mirrors. Mutators (`createEntity`, `moveEntity`, `removeEntity`,
 * `setStateValue`, scoring writes, scope writes, event-history writes,
 * etc.) are intentionally absent — the type system rejects any call
 * to them through a `ReadOnlyWorldModel` reference.
 *
 * The underlying instance is still a full `WorldModel` with mutators
 * present; the narrowing is at the type level only (per ADR-162
 * Decision 4).
 */
export type ReadOnlyWorldModel = Pick<
  IWorldModel,
  | 'getEntity'
  | 'hasEntity'
  | 'getAllEntities'
  | 'getLocation'
  | 'getContents'
  | 'getContainingRoom'
  | 'getAllContents'
  | 'getCapability'
  | 'hasCapability'
  | 'getStateValue'
  | 'getPrompt'
  | 'findByTrait'
  | 'findByType'
  | 'findWhere'
  | 'getVisible'
  | 'getInScope'
  | 'canSee'
  | 'getRelated'
  | 'areRelated'
  | 'getTotalWeight'
  | 'wouldCreateLoop'
  | 'findPath'
  | 'getPlayer'
  | 'isInRegion'
  | 'getRegionCrossings'
  | 'getSceneConditions'
  | 'getAllSceneConditions'
  | 'isSceneActive'
  | 'hasSceneEnded'
  | 'hasSceneHappened'
>;
