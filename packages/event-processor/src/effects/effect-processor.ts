/**
 * EffectProcessor: Validates and applies effects per ADR-075
 *
 * This is the ONLY place effects become mutations. It validates effects,
 * ensures atomicity (all-or-nothing), and applies them through proper channels.
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, RoomTrait } from '@sharpee/world-model';
import {
  Effect,
  EffectError,
  EffectResult,
  ScoreEffect,
  FlagEffect,
  MessageEffect,
  EmitEffect,
  MoveEntityEffect,
  UpdateEntityEffect,
  SetStateEffect,
  UpdateExitsEffect,
} from './types';

/**
 * Callback to emit events (provided by EventProcessor)
 */
export type EventEmitCallback = (events: ISemanticEvent[]) => void;

/**
 * EffectProcessor validates and applies effects atomically
 */
export class EffectProcessor {
  constructor(
    private world: WorldModel,
    private emitEvents?: EventEmitCallback
  ) {}

  // Collect emitted events during processing
  private pendingEmittedEvents: ISemanticEvent[] = [];

  /**
   * Process effects with two-phase atomic processing
   *
   * Phase 1: Validate ALL effects before applying any
   * Phase 2: Apply all effects (atomic - all or nothing)
   */
  process(effects: Effect[]): EffectResult {
    // Reset emitted events collector
    this.pendingEmittedEvents = [];

    // Phase 1: Validate ALL effects before applying any
    const errors = this.validateAll(effects);
    if (errors.length > 0) {
      return { success: false, errors, applied: [] };
    }

    // Phase 2: Apply all effects (atomic - all or nothing)
    for (const effect of effects) {
      this.apply(effect);
    }

    // Collect emitted events to return
    const emittedEvents = this.pendingEmittedEvents.length > 0
      ? [...this.pendingEmittedEvents]
      : undefined;
    this.pendingEmittedEvents = [];

    return { success: true, errors: [], applied: effects, emittedEvents };
  }

  /**
   * Validate all effects, returning any errors
   */
  private validateAll(effects: Effect[]): EffectError[] {
    const errors: EffectError[] = [];
    for (const effect of effects) {
      const error = this.validate(effect);
      if (error) {
        errors.push({ effect, reason: error });
      }
    }
    return errors;
  }

  /**
   * Validate a single effect
   */
  private validate(effect: Effect): string | null {
    switch (effect.type) {
      case 'score':
        if (typeof effect.points !== 'number') {
          return 'points must be a number';
        }
        break;

      case 'flag':
        if (!effect.name || typeof effect.name !== 'string') {
          return 'flag name required';
        }
        if (typeof effect.value !== 'boolean') {
          return 'flag value must be a boolean';
        }
        break;

      case 'message':
        if (!effect.id || typeof effect.id !== 'string') {
          return 'message id required';
        }
        break;

      case 'emit':
        if (!effect.event || !effect.event.type) {
          return 'emit effect requires a valid event';
        }
        break;

      case 'move_entity':
        if (!effect.entityId) {
          return 'entityId required';
        }
        if (!this.world.hasEntity(effect.entityId)) {
          return `entity ${effect.entityId} not found`;
        }
        if (effect.destination !== null && !this.world.hasEntity(effect.destination)) {
          return `destination ${effect.destination} not found`;
        }
        break;

      case 'update_entity':
        if (!effect.entityId) {
          return 'entityId required';
        }
        if (!this.world.hasEntity(effect.entityId)) {
          return `entity ${effect.entityId} not found`;
        }
        break;

      case 'set_state':
        if (!effect.key || typeof effect.key !== 'string') {
          return 'state key required';
        }
        break;

      case 'update_exits':
        if (!effect.roomId) {
          return 'roomId required';
        }
        if (!this.world.hasEntity(effect.roomId)) {
          return `room ${effect.roomId} not found`;
        }
        break;

      case 'unblock':
      case 'block':
        if (!effect.room) {
          return 'room required';
        }
        if (!this.world.hasEntity(effect.room)) {
          return `room ${effect.room} not found`;
        }
        if (!effect.exit) {
          return 'exit direction required';
        }
        break;

      case 'schedule':
        if (!effect.daemon || typeof effect.daemon !== 'string') {
          return 'daemon id required';
        }
        if (typeof effect.turns !== 'number' || effect.turns < 0) {
          return 'turns must be a non-negative number';
        }
        break;
    }

    return null;
  }

  /**
   * Apply a single effect
   */
  private apply(effect: Effect): void {
    switch (effect.type) {
      case 'score':
        this.applyScoreEffect(effect);
        break;

      case 'flag':
        this.applyFlagEffect(effect);
        break;

      case 'message':
        this.applyMessageEffect(effect);
        break;

      case 'emit':
        this.applyEmitEffect(effect);
        break;

      case 'move_entity':
        this.applyMoveEntityEffect(effect);
        break;

      case 'update_entity':
        this.applyUpdateEntityEffect(effect);
        break;

      case 'set_state':
        this.applySetStateEffect(effect);
        break;

      case 'update_exits':
        this.applyUpdateExitsEffect(effect);
        break;

      case 'unblock':
        // TODO: Implement when exit blocking system is in place
        break;

      case 'block':
        // TODO: Implement when exit blocking system is in place
        break;

      case 'schedule':
        // TODO: Implement when scheduler integration is ready
        break;
    }
  }

  private applyScoreEffect(effect: ScoreEffect): void {
    const scoring = this.world.getCapability('scoring');
    if (scoring && typeof scoring.score === 'number') {
      this.world.updateCapability('scoring', {
        score: scoring.score + effect.points
      });
    }
  }

  private applyFlagEffect(effect: FlagEffect): void {
    this.world.setStateValue(`flag.${effect.name}`, effect.value);
  }

  private applyMessageEffect(effect: MessageEffect): void {
    if (this.emitEvents) {
      const messageEvent: ISemanticEvent = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: effect.id,
          ...effect.data
        },
        narrate: true
      };
      this.emitEvents([messageEvent]);
    }
  }

  private applyEmitEffect(effect: EmitEffect): void {
    // Collect emitted events to return (instead of immediate callback)
    this.pendingEmittedEvents.push(effect.event);
    // Also call callback for backward compatibility
    if (this.emitEvents) {
      this.emitEvents([effect.event]);
    }
  }

  private applyMoveEntityEffect(effect: MoveEntityEffect): void {
    this.world.moveEntity(effect.entityId, effect.destination);
  }

  private applyUpdateEntityEffect(effect: UpdateEntityEffect): void {
    this.world.updateEntity(effect.entityId, (entity) => {
      for (const [key, value] of Object.entries(effect.updates)) {
        (entity as unknown as Record<string, unknown>)[key] = value;
      }
    });
  }

  private applySetStateEffect(effect: SetStateEffect): void {
    this.world.setStateValue(effect.key, effect.value);
  }

  private applyUpdateExitsEffect(effect: UpdateExitsEffect): void {
    const room = this.world.getEntity(effect.roomId);
    if (!room) return;

    const roomTrait = room.get(RoomTrait);
    if (!roomTrait) return;

    if (!roomTrait.exits) {
      roomTrait.exits = {};
    }

    // Cast exits to a mutable record for dynamic key access
    const exits = roomTrait.exits as Record<string, { destination: string } | undefined>;

    for (const [direction, exitInfo] of Object.entries(effect.exits)) {
      if (exitInfo === null) {
        delete exits[direction];
      } else {
        exits[direction] = exitInfo;
      }
    }
  }
}
