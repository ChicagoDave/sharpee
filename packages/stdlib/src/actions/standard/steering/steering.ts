/**
 * Steering action — the `compass` command set aboard a vehicle (ADR-366
 * D5c, D5i): `steer <direction>` sets a compass vehicle's heading and
 * `heave to` clears it. The vehicle's own machine then moves it every
 * `pace` turns (D5e); this action writes the heading and nothing else.
 *
 * `go <direction>` aboard a compass vehicle is this action too — the
 * vehicle command transformer rewrites it before validation — so the two
 * gestures are one action and a Chord `on the player steering` clause
 * sees both. `steer <direction>` aboard a streets vehicle is rewritten
 * the other way, into going, which moves it one exit.
 *
 * Uses four-phase pattern:
 * 1. validate: aboard a vehicle that lists the `compass` set and has a
 *    compass model; `heave to` only while a heading is set
 * 2. execute: `startVehicle` with the heading, or `stopVehicle`
 * 3. blocked: the refusal, every one a stock line (D7a)
 * 4. report: emits if.event.steered
 *
 * Public interface: steeringAction, steeringLifecycle, SteeringMessages.
 * Owner context: stdlib / standard actions / movement
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  type DirectionType,
  getVehicleAboard,
  isUnderWay,
  startVehicle,
  stopVehicle,
  takesCommandSet,
  VehicleTrait,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { SteeringMessages } from './steering-messages.js';

/** The command set this action speaks for (ADR-366 D5i). */
export const COMPASS_COMMAND_SET = 'compass';

/** The heading the command names, as the platform's direction constant; undefined for `heave to`. */
function resolveHeading(context: ActionContext): DirectionType | undefined {
  const direction = context.command.parsed.extras?.direction;
  return typeof direction === 'string' && direction.length > 0 ? (direction.toUpperCase() as DirectionType) : undefined;
}

interface SteeringSharedData {
  vehicleId?: string;
  heading?: DirectionType;
}

/**
 * Interceptor surface (ADR-228): the vehicle steered, resolved from where
 * the actor is — STEER names no noun.
 */
export const steeringLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.STEERING,
  reportEventType: 'if.event.steered',
  blockedEventType: 'if.event.steer_blocked',
  slots: [
    {
      id: 'vehicle',
      actionIds: [IFActions.STEERING],
      resolve: (ctx) => getVehicleAboard(ctx.world, ctx.actor.id),
      seedData: (ctx) => ({ direction: resolveHeading(ctx) })
    }
  ]
};

export const steeringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.STEERING,
  requiredMessages: [
    SteeringMessages.NOT_IN_VEHICLE,
    SteeringMessages.VEHICLE_NO_SUCH_COMMAND,
    SteeringMessages.CANNOT_STEER,
    SteeringMessages.NOT_UNDER_WAY,
    SteeringMessages.STEERED,
    SteeringMessages.HOVE_TO
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const vehicle = getVehicleAboard(context.world, context.actor.id);
    if (!vehicle) {
      return { valid: false, error: SteeringMessages.NOT_IN_VEHICLE };
    }
    const params = { vehicle: nounPhraseFor(vehicle) };
    if (!takesCommandSet(vehicle, COMPASS_COMMAND_SET)) {
      return { valid: false, error: SteeringMessages.VEHICLE_NO_SUCH_COMMAND, params };
    }
    const heading = resolveHeading(context);
    const model = vehicle.get(VehicleTrait)?.model;
    if (model?.kind !== 'compass') {
      // A streets vehicle is steered by going (the transformer sends
      // `steer <direction>` there); reached directly, it has no heading to
      // set or clear.
      return { valid: false, error: heading ? SteeringMessages.CANNOT_STEER : SteeringMessages.NOT_UNDER_WAY, params };
    }
    if (heading === undefined && !isUnderWay(vehicle)) {
      return { valid: false, error: SteeringMessages.NOT_UNDER_WAY, params };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const vehicle = getVehicleAboard(context.world, context.actor.id)!;
    const heading = resolveHeading(context);
    const sharedData = context.sharedData as SteeringSharedData;
    sharedData.vehicleId = vehicle.id;
    if (heading === undefined) {
      stopVehicle(vehicle);
    } else {
      startVehicle(context.world, vehicle, heading);
      sharedData.heading = heading;
    }
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = context.sharedData as SteeringSharedData;
    const vehicle = context.world.getEntity(sharedData.vehicleId!)!;
    const heading = sharedData.heading;
    return [
      context.event('if.event.steered', {
        messageId: `${context.action.id}.${heading ? SteeringMessages.STEERED : SteeringMessages.HOVE_TO}`,
        params: { vehicle: nounPhraseFor(vehicle), ...(heading ? { direction: heading.toLowerCase() } : {}) },
        vehicleId: vehicle.id,
        heading: heading ?? null,
        actorId: context.actor.id
      })
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('if.event.steer_blocked', {
        blocked: true,
        messageId: blockedMessageId(context, result),
        params: result.params ?? {},
        reason: result.error,
        actorId: context.actor.id
      })
    ];
  },

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};

export { SteeringMessages };
