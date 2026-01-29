/**
 * Effect Executor - applies state machine effects to the world model.
 */

import { EntityId, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { Effect, EntityBindings } from './types';
import { resolveRef } from './guard-evaluator';

let eventCounter = 0;

export function executeEffects(
  effects: Effect[],
  world: WorldModel,
  bindings: EntityBindings,
  playerId: EntityId,
  machineId: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  for (const effect of effects) {
    const result = executeEffect(effect, world, bindings, playerId, machineId);
    events.push(...result);
  }

  return events;
}

function executeEffect(
  effect: Effect,
  world: WorldModel,
  bindings: EntityBindings,
  playerId: EntityId,
  machineId: string
): ISemanticEvent[] {
  switch (effect.type) {
    case 'move': {
      const entityId = resolveRef(effect.entityRef, bindings);
      const destId = resolveRef(effect.destinationRef, bindings);
      world.moveEntity(entityId, destId);
      return [createEvent(`sm.entity_moved`, machineId, {
        entityId,
        destination: destId,
      })];
    }

    case 'remove': {
      const entityId = resolveRef(effect.entityRef, bindings);
      world.removeEntity(entityId);
      return [createEvent(`sm.entity_removed`, machineId, { entityId })];
    }

    case 'set_trait': {
      const entityId = resolveRef(effect.entityRef, bindings);
      const entity = world.getEntity(entityId);
      if (entity) {
        const trait = entity.getTrait(effect.trait);
        if (trait) {
          (trait as unknown as Record<string, unknown>)[effect.property] = effect.value;
        }
      }
      return [];
    }

    case 'set_state': {
      world.setStateValue(effect.key, effect.value);
      return [];
    }

    case 'message': {
      return [createEvent(effect.messageId, machineId, {
        ...(effect.params || {}),
        source: 'state-machine',
      })];
    }

    case 'emit_event': {
      const entities: Record<string, string> = {};
      if (effect.entities) {
        for (const [role, ref] of Object.entries(effect.entities)) {
          if (ref) entities[role] = resolveRef(ref, bindings);
        }
      }
      return [{
        id: `sm-event-${++eventCounter}`,
        type: effect.eventType,
        timestamp: Date.now(),
        entities,
        data: effect.data,
      }];
    }

    case 'custom': {
      const result = effect.execute(world, bindings, playerId);
      const events: ISemanticEvent[] = [];
      if (result.events) {
        for (const e of result.events) {
          events.push({
            id: `sm-custom-${++eventCounter}`,
            type: e.type,
            timestamp: Date.now(),
            entities: (e.entities || {}) as ISemanticEvent['entities'],
            data: e.data,
          });
        }
      }
      if (result.messages) {
        for (const m of result.messages) {
          events.push(createEvent(m.messageId, machineId, {
            ...(m.params || {}),
            source: 'state-machine',
          }));
        }
      }
      return events;
    }
  }
}

function createEvent(type: string, machineId: string, data: unknown): ISemanticEvent {
  return {
    id: `sm-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
    tags: ['state-machine', machineId],
  };
}
