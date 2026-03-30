/**
 * Custom story-specific actions for the regression test story.
 *
 * Public interface: inspectAction, pingAction, PING_ACTION_ID
 * Owner: npm regression test suite
 */

import {
  IFEntity,
  CapabilityBehavior,
  CapabilitySharedData,
  findTraitWithCapability,
  getBehaviorForCapability,
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { INSPECT_ACTION_ID } from './behaviors';
import { getRoomIds } from './world-setup';

export const PING_ACTION_ID = 'regression.action.ping';
export const STATUS_ACTION_ID = 'regression.action.status';
export const CHECK_ACTION_ID = 'regression.action.check';

/**
 * INSPECT action — routes through capability dispatch to InspectableTrait behaviors.
 */
export const inspectAction: Action = {
  id: INSPECT_ACTION_ID,
  group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) {
      return { valid: false, error: 'regression.inspect.no_target' };
    }
    const trait = findTraitWithCapability(entity, INSPECT_ACTION_ID);
    if (!trait) {
      return { valid: false, error: 'regression.inspect.not_inspectable' };
    }
    const behavior = getBehaviorForCapability(trait, INSPECT_ACTION_ID);
    if (!behavior) {
      return { valid: false, error: 'regression.inspect.not_inspectable' };
    }
    const sharedData: CapabilitySharedData = {};
    const result = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
    context.sharedData.capEntity = entity;
    context.sharedData.capBehavior = behavior;
    context.sharedData.capSharedData = sharedData;
    return { valid: true };
  },
  execute(context: ActionContext): void {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (entity && behavior) {
      behavior.execute(entity, context.world, context.player.id, sharedData);
      context.world.awardScore('inspect-server', 5, 'Inspected the server rack');
    }
  },
  report(context: ActionContext): ISemanticEvent[] {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (!entity || !behavior) return [];
    const effects = behavior.report(entity, context.world, context.player.id, sharedData);
    return effects.map((effect) => context.event(effect.type, effect.payload));
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('regression.event.inspect_blocked', {
        messageId: result.error || 'regression.inspect.not_inspectable',
      }),
    ];
  },
};

/**
 * PING action — story-specific custom action (no entity target).
 * Only works on the rooftop.
 */
export const pingAction: Action = {
  id: PING_ACTION_ID,
  group: 'communication',
  validate(context: ActionContext): ValidationResult {
    const loc = context.world.getLocation(context.player.id);
    if (loc !== getRoomIds().rooftop) {
      return { valid: false, error: 'regression.ping.wrong_room' };
    }
    return { valid: true };
  },
  execute(context: ActionContext): void {
    context.world.awardScore('ping-antenna', 10, 'Pinged the antenna');
  },
  report(context: ActionContext): ISemanticEvent[] {
    return [
      context.event('regression.event.pinged', {
        messageId: 'regression.ping.success',
      }),
    ];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('regression.event.ping_blocked', {
        messageId: result.error || 'regression.ping.wrong_room',
      }),
    ];
  },
};

/**
 * STATUS action — reads custom state values and reports them.
 * Tests world.setStateValue() / world.getStateValue().
 */
export const statusAction: Action = {
  id: STATUS_ACTION_ID,
  group: 'information',
  validate(_context: ActionContext): ValidationResult {
    return { valid: true };
  },
  execute(_context: ActionContext): void {
    // Read-only — no mutations
  },
  report(context: ActionContext): ISemanticEvent[] {
    const facilityStatus = context.world.getStateValue('facility.status') || 'unknown';
    const alertLevel = context.world.getStateValue('facility.alert') || 'none';
    return [
      context.event('regression.event.status', {
        messageId: 'regression.status.report',
        params: { facilityStatus, alertLevel },
      }),
    ];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('regression.event.status_blocked', { messageId: 'regression.status.error' })];
  },
};

/**
 * CHECK action — reads annotations on the current room and reports count.
 * Tests entity.annotate() / entity.getAnnotations().
 */
export const checkAction: Action = {
  id: CHECK_ACTION_ID,
  group: 'information',
  validate(_context: ActionContext): ValidationResult {
    return { valid: true };
  },
  execute(_context: ActionContext): void {
    // Read-only — no mutations
  },
  report(context: ActionContext): ISemanticEvent[] {
    const roomId = context.world.getLocation(context.player.id);
    const room = roomId ? context.world.getEntity(roomId) : null;
    const annotations = room?.getAnnotations('illustration') || [];
    const count = annotations.length;
    return [
      context.event('regression.event.checked', {
        messageId: 'regression.check.report',
        params: { count: String(count) },
      }),
    ];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('regression.event.check_blocked', { messageId: 'regression.check.error' })];
  },
};
