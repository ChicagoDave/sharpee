// packages/engine/src/sound/propagation.ts

/**
 * Spatial sound propagation function (ADR-172 Phase 3).
 *
 * Pure logic: given a `Sound` emission, a listener entity-id, and the
 * world-model, returns the `AudibilityEvent` the listener perceives —
 * or `null` if the sound is silent at the listener's location.
 *
 * The function is structured around three pieces:
 *
 *  1. **Edge-graph construction** (`getAcousticEdges`) — for any room,
 *     enumerate the rooms it's acoustically connected to, with each
 *     edge's cost. Today's edge sources are exits-with-doors and walls
 *     (per ADR-173). Future acoustic conduits ride on the same shape
 *     without changes here.
 *
 *  2. **Path search** (`findShortestAcousticPath`) — Dijkstra from
 *     source room to listener's room. Path cost = sum of edge costs +
 *     1 unit per intermediate room. Wall edges traversed are recorded
 *     so the resulting `AudibilityEvent` can name a wall when the path
 *     crosses exactly one.
 *
 *  3. **Clarity → tier mapping** (`clarityToTier`) — the ADR-172
 *     audibility-tier table.
 *
 * The propagation function does *not* enumerate listeners — that is
 * Phase 5/6's dispatcher. This file is `propagate(sound, listenerId,
 * world, timestamp) → event | null`, intended to be called per
 * listener.
 *
 * Owner context: `@sharpee/engine` — runtime / sound subsystem.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (substrate)
 */

import type { EntityId } from '@sharpee/core';
import {
  VOLUME_TIER_BUDGETS,
  type AudibilityTier,
  type IAudibilityEvent,
  type ISound,
} from '@sharpee/if-domain';
import {
  AcousticDampenerTrait,
  ACOUSTIC_TIER_COSTS,
  AcousticTrait,
  findTraitsOnObstructors,
  IExitInfo,
  OpenableTrait,
  RoomTrait,
  TraitType,
  WallEntity,
  WorldModel,
} from '@sharpee/world-model';

// =============================================================================
// Public API
// =============================================================================

/**
 * Propagate a sound emission to a single listener.
 *
 * Returns an `AudibilityEvent` for the listener if the sound reaches
 * them at any tier above `silent`; returns `null` if the sound is
 * silent at the listener's location (no reachable path, cost too high
 * for the volume budget, or the listener has no resolvable room).
 *
 * Same-room emissions short-circuit to `full` audibility regardless of
 * intervening boundaries (degenerate case from ADR-172 §Propagation
 * function step 5).
 *
 * @param sound        The emission shape.
 * @param listenerId   The entity id of the listener.
 * @param world        The world-model carrying rooms, walls, doors,
 *                     and obstructors.
 * @param timestamp    Engine-provided turn-sequence integer for event
 *                     ordering. Phase 6's dispatcher threads this from
 *                     the turn manager.
 */
export function propagate(
  sound: ISound,
  listenerId: EntityId,
  world: WorldModel,
  timestamp: number,
): IAudibilityEvent | null {
  const listenerRoom = locateRoom(world, listenerId);
  if (!listenerRoom) return null;

  // Same-room: full audibility, no wall, no path search.
  if (sound.sourceLocation === listenerRoom) {
    return buildAudibilityEvent(sound, listenerRoom, undefined, 'full', timestamp);
  }

  const path = findShortestAcousticPath(sound.sourceLocation, listenerRoom, world);
  if (!path) return null;

  const budget = VOLUME_TIER_BUDGETS[sound.volumeTier];
  const clarity = budget - path.cost;
  const tier = clarityToTier(clarity);
  if (tier === 'silent') return null;

  // Per ADR-172 AudibilityEvent shape: `wallId` is set when the path
  // crosses exactly one wall. Multi-wall and zero-wall (door-only)
  // paths leave it undefined.
  const wallId = path.wallEdges.length === 1 ? path.wallEdges[0] : undefined;

  return buildAudibilityEvent(sound, listenerRoom, wallId, tier, timestamp);
}

/**
 * Map a clarity value (volume budget − accumulated path cost) to the
 * ADR-172 audibility tier table.
 *
 * Exposed for testability and so that future composition layers can
 * reuse the mapping (e.g., a conversation-choreography layer that
 * wants to show a "what would the audibility be at this volume from
 * here?" debug overlay).
 */
export function clarityToTier(clarity: number): AudibilityTier {
  if (clarity >= 4) return 'full';
  if (clarity === 3) return 'muffled';
  if (clarity === 2) return 'fragments';
  if (clarity === 1) return 'presence-only';
  return 'silent';
}

// =============================================================================
// Internal: room resolution
// =============================================================================

function locateRoom(world: WorldModel, entityId: EntityId): EntityId | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;
  if (entity.has(TraitType.ROOM)) return entityId;
  return world.getContainingRoom(entityId)?.id;
}

// =============================================================================
// Internal: edge-graph construction
// =============================================================================

interface IAcousticEdge {
  to: EntityId;
  cost: number;
  /** Set when this edge is contributed by a wall entity. */
  wallId?: EntityId;
}

function getAcousticEdges(roomId: EntityId, world: WorldModel): IAcousticEdge[] {
  const room = world.getEntity(roomId);
  if (!room) return [];

  const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
  if (!roomTrait) return [];

  const edges: IAcousticEdge[] = [];

  // Exits — each direction may carry a door whose state determines cost.
  if (roomTrait.exits) {
    for (const exit of Object.values(roomTrait.exits)) {
      if (!exit) continue;
      const cost = exitAcousticCost(exit, world);
      edges.push({ to: exit.destination, cost });
    }
  }

  // Walls — effective cost combines AcousticTrait base + obstructor
  // dampener contributions per ADR-173's generalized obstructor protocol.
  if (roomTrait.walls) {
    for (const wallId of roomTrait.walls) {
      const wall = world.getEntity(wallId);
      if (!(wall instanceof WallEntity)) continue;
      const otherRoom = wall.otherRoom(roomId);
      if (!otherRoom) continue;
      const cost = wallEffectiveAcousticCost(wall, world);
      // Soundproof walls (cost = ∞) contribute no usable edge — drop
      // them rather than feeding Infinity into Dijkstra.
      if (!Number.isFinite(cost)) continue;
      edges.push({ to: otherRoom, cost, wallId });
    }
  }

  // Future: acoustic conduits (separate ADR) plug in here.

  return edges;
}

function exitAcousticCost(exit: IExitInfo, world: WorldModel): number {
  if (!exit.via) return 1; // open passage, no door

  const door = world.getEntity(exit.via);
  if (!door) return 1;

  if (!door.has(TraitType.OPENABLE)) return 1; // door without state = always open
  const openable = door.get<OpenableTrait>(TraitType.OPENABLE);
  return openable?.isOpen ? 1 : 4;
}

function wallEffectiveAcousticCost(wall: WallEntity, world: WorldModel): number {
  const acoustic = wall.get<AcousticTrait>(TraitType.ACOUSTIC);
  const baseTier = acoustic?.tier ?? 'default';
  const baseCost = ACOUSTIC_TIER_COSTS[baseTier];
  if (!Number.isFinite(baseCost)) return Number.POSITIVE_INFINITY;

  // Cross-side aggregation per ADR-172 effective_cost formula:
  // base + Σ AcousticDampenerTrait.contribution for each side's
  // currently-located obstructor.
  const dampeners = findTraitsOnObstructors<AcousticDampenerTrait>(
    wall,
    TraitType.ACOUSTIC_DAMPENER,
    world,
  );
  const contribution = dampeners.reduce((sum, m) => sum + m.trait.contribution, 0);

  // Negative effective cost (a hole / amplifier / extreme conduit)
  // clamps to 0 — sound passes the wall as if it weren't there, but
  // we don't amplify beyond the volume budget.
  return Math.max(0, baseCost + contribution);
}

// =============================================================================
// Internal: path search (Dijkstra with wall-edge tracking)
// =============================================================================

interface IPathResult {
  /** Total path cost: sum of edge costs + 1 per intermediate room. */
  cost: number;
  /** Wall ids of every wall edge traversed in the chosen path. */
  wallEdges: EntityId[];
}

interface IPredecessor {
  from: EntityId;
  wallId?: EntityId;
}

function findShortestAcousticPath(
  source: EntityId,
  target: EntityId,
  world: WorldModel,
): IPathResult | null {
  if (source === target) return { cost: 0, wallEdges: [] };

  const dist = new Map<EntityId, number>();
  const prev = new Map<EntityId, IPredecessor>();
  const visited = new Set<EntityId>();

  dist.set(source, 0);

  while (true) {
    // Pick unvisited node with minimum tentative distance.
    let current: EntityId | undefined;
    let currentDist = Number.POSITIVE_INFINITY;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < currentDist) {
        current = node;
        currentDist = d;
      }
    }

    if (!current || !Number.isFinite(currentDist)) break;
    if (current === target) break;

    visited.add(current);

    const edges = getAcousticEdges(current, world);
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      // Room-traversal cost: 1 per *intermediate* room. The source
      // room contributes 0; every subsequent leg adds 1 to account
      // for traversing the room we're leaving from.
      const traversalCost = current === source ? 0 : 1;
      const tentative = currentDist + traversalCost + edge.cost;

      const known = dist.get(edge.to) ?? Number.POSITIVE_INFINITY;
      if (tentative < known) {
        dist.set(edge.to, tentative);
        prev.set(edge.to, { from: current, wallId: edge.wallId });
      }
    }
  }

  const finalCost = dist.get(target);
  if (finalCost === undefined || !Number.isFinite(finalCost)) return null;

  // Reconstruct wall edges along the chosen path.
  const wallEdges: EntityId[] = [];
  let cur: EntityId | undefined = target;
  while (cur && cur !== source) {
    const p = prev.get(cur);
    if (!p) return null;
    if (p.wallId) wallEdges.push(p.wallId);
    cur = p.from;
  }

  return { cost: finalCost, wallEdges };
}

// =============================================================================
// Internal: AudibilityEvent construction
// =============================================================================

function buildAudibilityEvent(
  sound: ISound,
  listenerRoom: EntityId,
  wallId: EntityId | undefined,
  tier: Exclude<AudibilityTier, 'silent'>,
  timestamp: number,
): IAudibilityEvent {
  return {
    sourceRoomId: sound.sourceLocation,
    targetRoomId: listenerRoom,
    wallId,
    sourceEntityId: sound.sourceEntity,
    kind: sound.kind,
    volumeTier: sound.volumeTier,
    audibilityTier: tier,
    content: sound.content,
    timestamp,
  };
}
