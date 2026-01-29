/**
 * Guard Evaluator - evaluates guard conditions against world state.
 */

import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import {
  GuardCondition,
  EntityBindings,
} from './types';

export function evaluateGuard(
  guard: GuardCondition,
  world: WorldModel,
  bindings: EntityBindings,
  playerId: EntityId
): boolean {
  switch (guard.type) {
    case 'entity':
      return evaluateEntityGuard(guard, world, bindings);
    case 'state':
      return world.getStateValue(guard.key) === guard.value;
    case 'location':
      return evaluateLocationGuard(guard, world, bindings, playerId);
    case 'inventory':
      return evaluateInventoryGuard(guard, world, bindings, playerId);
    case 'and':
      return guard.conditions.every(c => evaluateGuard(c, world, bindings, playerId));
    case 'or':
      return guard.conditions.some(c => evaluateGuard(c, world, bindings, playerId));
    case 'not':
      return !guard.conditions.every(c => evaluateGuard(c, world, bindings, playerId));
    case 'custom':
      return guard.evaluate(world, bindings, playerId);
  }
}

function evaluateEntityGuard(
  guard: { entityRef: string; trait: string; property: string; value: unknown },
  world: WorldModel,
  bindings: EntityBindings
): boolean {
  const entityId = resolveRef(guard.entityRef, bindings);
  const entity = world.getEntity(entityId);
  if (!entity) return false;

  const trait = entity.getTrait(guard.trait);
  if (!trait) return false;

  return (trait as unknown as Record<string, unknown>)[guard.property] === guard.value;
}

function evaluateLocationGuard(
  guard: { actorRef?: string; roomRef: string },
  world: WorldModel,
  bindings: EntityBindings,
  playerId: EntityId
): boolean {
  const actorId = guard.actorRef ? resolveRef(guard.actorRef, bindings) : playerId;
  const roomId = resolveRef(guard.roomRef, bindings);
  return world.getLocation(actorId) === roomId;
}

function evaluateInventoryGuard(
  guard: { actorRef?: string; entityRef: string },
  world: WorldModel,
  bindings: EntityBindings,
  playerId: EntityId
): boolean {
  const actorId = guard.actorRef ? resolveRef(guard.actorRef, bindings) : playerId;
  const entityId = resolveRef(guard.entityRef, bindings);
  return world.getLocation(entityId) === actorId;
}

export function resolveRef(ref: string, bindings: EntityBindings): EntityId {
  if (ref.startsWith('$')) {
    const bound = bindings[ref];
    if (!bound) {
      throw new Error(`Unresolved binding: ${ref}`);
    }
    return bound;
  }
  return ref;
}
