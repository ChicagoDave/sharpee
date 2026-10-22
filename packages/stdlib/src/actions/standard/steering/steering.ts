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
  isDirection,
  getVehicleAboard,
  isUnderWay,
  startVehicle,
  stopVehicle,
  takesCommandSet,
  VehicleTrait,
  edgeRefusalOf,
  headingVector,
  currentBearing,
  comeAbout,
  comeAboutRefusal,
  sailChangeRefusal,
  furlSails,
  makeSail,
  shortenSail,
  turnHeading,
  type IFEntity,
  VEHICLE_REPORT_MESSAGES,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { SteeringMessages } from './steering-messages.js';

/** The command set this action speaks for (ADR-366 D5i). */
export const COMPASS_COMMAND_SET = 'compass';
/** The sailing set (ADR-375 D3): turns by degrees, `ahead`, `come about`, and the sail words. */
export const NAVAL_COMMAND_SET = 'naval';

/** A naval gesture as the grammar matched it (ADR-375 D3, D7). */
type NavalCommand =
  | { kind: 'turn'; side: 'port' | 'starboard'; degrees: number | undefined }
  | { kind: 'ahead' }
  | { kind: 'come-about' }
  | { kind: 'make-sail' }
  | { kind: 'shorten-sail' }
  | { kind: 'furl-sails' };

/**
 * The gesture the matched grammar line names (its `means gesture <value>`
 * line, alignment finding F5): data from the parser, never the typed verb.
 */
function gestureOf(context: ActionContext): string | undefined {
  const gesture = context.command.parsed.extras?.gesture;
  return typeof gesture === 'string' ? gesture : undefined;
}

/** The degrees of a turn, from the `the turn` topic (`port 20`, `starboard 45 degrees`). */
function turnDegrees(context: ActionContext): number | undefined {
  const m = /^(\d+)(?:\s*degrees?)?$/.exec(context.command.topic?.text?.trim() ?? '');
  return m ? Number(m[1]) : undefined;
}

/** The naval gesture the command names, or undefined for `steer` and `heave to`. */
function navalCommand(context: ActionContext): NavalCommand | undefined {
  switch (gestureOf(context)) {
    case 'hard-port': return { kind: 'turn', side: 'port', degrees: 90 };
    case 'hard-starboard': return { kind: 'turn', side: 'starboard', degrees: 90 };
    case 'port': return { kind: 'turn', side: 'port', degrees: turnDegrees(context) };
    case 'starboard': return { kind: 'turn', side: 'starboard', degrees: turnDegrees(context) };
    case 'ahead': return { kind: 'ahead' };
    case 'come-about': return { kind: 'come-about' };
    case 'make-sail': return { kind: 'make-sail' };
    case 'shorten-sail': return { kind: 'shorten-sail' };
    case 'furl-sails': return { kind: 'furl-sails' };
    default: return undefined;
  }
}

/**
 * The heading the command names, undefined for `heave to`. The parser
 * hands a direction over as the platform's constant (D15), so it is read,
 * never re-spelled.
 */
function resolveHeading(context: ActionContext): DirectionType | undefined {
  const direction = context.command.parsed.extras?.direction;
  return isDirection(direction) ? direction : undefined;
}

interface SteeringSharedData {
  vehicleId?: string;
  heading?: DirectionType;
  /** ADR-375 D3, D7: the naval gesture and the bearing it left the ship on. */
  naval?: NavalCommand;
  bearing?: number;
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

/**
 * ADR-376 D8: the vehicle behavior's edge refusal, or undefined. An edge
 * reads the same whoever meets it, so the refusal is going's line, the one
 * the machine reports: the edge's phrase verbatim, else the stock line.
 */
function edgeRefusal(context: ActionContext, vehicle: IFEntity, vector: { x: number; y: number }, params: Record<string, unknown>): ValidationResult | undefined {
  const edge = edgeRefusalOf(context.world, vehicle, vector);
  if (!edge) return undefined;
  return edge.message !== undefined
    ? { valid: false, error: VEHICLE_REPORT_MESSAGES.MOVEMENT_BLOCKED, errorQualified: true, params: { ...params, message: edge.message } }
    : { valid: false, error: VEHICLE_REPORT_MESSAGES.EXPANSE_EDGE, errorQualified: true, params };
}

export const steeringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.STEERING,
  requiredMessages: [
    SteeringMessages.NOT_IN_VEHICLE,
    SteeringMessages.VEHICLE_NO_SUCH_COMMAND,
    SteeringMessages.CANNOT_STEER,
    SteeringMessages.NOT_UNDER_WAY,
    SteeringMessages.NAVAL_HOW_FAR,
    SteeringMessages.NAVAL_NO_WIND,
    SteeringMessages.NAVAL_CANNOT_COME_ABOUT,
    SteeringMessages.SAILS_AT_FULL,
    SteeringMessages.SAILS_ALREADY_FURLED,
    SteeringMessages.STEERED,
    SteeringMessages.HOVE_TO,
    SteeringMessages.TURNED,
    SteeringMessages.AHEAD,
    SteeringMessages.CAME_ABOUT,
    SteeringMessages.SAIL_MADE,
    SteeringMessages.SAIL_SHORTENED,
    SteeringMessages.SAILS_FURLED
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const vehicle = getVehicleAboard(context.world, context.actor.id);
    if (!vehicle) {
      return { valid: false, error: SteeringMessages.NOT_IN_VEHICLE };
    }
    const params = { vehicle: nounPhraseFor(vehicle) };
    const model = vehicle.get(VehicleTrait)?.model;
    const naval = navalCommand(context);
    if (naval) {
      // ADR-375 D3, D7: the naval set, on an open vehicle that lists it.
      if (!takesCommandSet(vehicle, NAVAL_COMMAND_SET) || model?.kind !== 'open') {
        return { valid: false, error: SteeringMessages.VEHICLE_NO_SUCH_COMMAND, params };
      }
      switch (naval.kind) {
        case 'turn':
          if (naval.degrees === undefined) return { valid: false, error: SteeringMessages.NAVAL_HOW_FAR, params };
          return { valid: true };
        case 'ahead': {
          return edgeRefusal(context, vehicle, headingVector(currentBearing(vehicle)!)!, params) ?? { valid: true };
        }
        case 'come-about': {
          const refusal = comeAboutRefusal(context.world, vehicle);
          if (refusal === 'no-wind') return { valid: false, error: SteeringMessages.NAVAL_NO_WIND, params };
          if (refusal === 'cannot') return { valid: false, error: SteeringMessages.NAVAL_CANNOT_COME_ABOUT, params };
          return { valid: true };
        }
        case 'make-sail':
        case 'shorten-sail':
        case 'furl-sails': {
          const change = naval.kind === 'make-sail' ? 'make' : naval.kind === 'shorten-sail' ? 'shorten' : 'furl';
          switch (sailChangeRefusal(vehicle, change)) {
            case 'no-sails': return { valid: false, error: SteeringMessages.VEHICLE_NO_SUCH_COMMAND, params };
            case 'at-full': return { valid: false, error: SteeringMessages.SAILS_AT_FULL, params };
            case 'already-furled': return { valid: false, error: SteeringMessages.SAILS_ALREADY_FURLED, params };
            default: return { valid: true };
          }
        }
      }
    }
    if (!takesCommandSet(vehicle, COMPASS_COMMAND_SET)) {
      return { valid: false, error: SteeringMessages.VEHICLE_NO_SUCH_COMMAND, params };
    }
    const heading = resolveHeading(context);
    if (model?.kind !== 'compass' && model?.kind !== 'open') {
      // A streets vehicle is steered by going (the transformer sends
      // `steer <direction>` there); reached directly, it has no heading to
      // set or clear.
      return { valid: false, error: heading ? SteeringMessages.CANNOT_STEER : SteeringMessages.NOT_UNDER_WAY, params };
    }
    if (heading === undefined && !isUnderWay(vehicle)) {
      return { valid: false, error: SteeringMessages.NOT_UNDER_WAY, params };
    }
    if (model.kind === 'open' && heading !== undefined) {
      // ADR-376 D3, D8: an open vehicle takes the eight compass headings,
      // and none with a component toward the edge it has reached.
      const vector = headingVector(heading);
      if (!vector) return { valid: false, error: SteeringMessages.CANNOT_STEER, params };
      const refused = edgeRefusal(context, vehicle, vector, params);
      if (refused) return refused;
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const vehicle = getVehicleAboard(context.world, context.actor.id)!;
    const sharedData = context.sharedData as SteeringSharedData;
    sharedData.vehicleId = vehicle.id;
    const naval = navalCommand(context);
    if (naval) {
      sharedData.naval = naval;
      const model = vehicle.get(VehicleTrait)!.model as Extract<NonNullable<VehicleTrait['model']>, { kind: 'open' }>;
      switch (naval.kind) {
        case 'turn':
          sharedData.bearing = turnHeading(vehicle, naval.side === 'port' ? -naval.degrees! : naval.degrees!);
          break;
        case 'ahead':
          startVehicle(context.world, vehicle, currentBearing(vehicle)!);
          sharedData.bearing = currentBearing(vehicle);
          break;
        case 'come-about':
          sharedData.bearing = comeAbout(context.world, vehicle) as number;
          break;
        case 'make-sail':
          makeSail(vehicle);
          break;
        case 'shorten-sail':
          shortenSail(vehicle);
          break;
        case 'furl-sails':
          furlSails(vehicle);
          break;
      }
      return;
    }
    const heading = resolveHeading(context);
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
    if (sharedData.naval) {
      const naval = sharedData.naval;
      const key =
        naval.kind === 'turn' ? SteeringMessages.TURNED
        : naval.kind === 'ahead' ? SteeringMessages.AHEAD
        : naval.kind === 'come-about' ? SteeringMessages.CAME_ABOUT
        : naval.kind === 'make-sail' ? SteeringMessages.SAIL_MADE
        : naval.kind === 'shorten-sail' ? SteeringMessages.SAIL_SHORTENED
        : SteeringMessages.SAILS_FURLED;
      const model = vehicle.get(VehicleTrait)?.model;
      return [
        context.event('if.event.steered', {
          messageId: `${context.action.id}.${key}`,
          params: {
            vehicle: nounPhraseFor(vehicle),
            ...(naval.kind === 'turn' ? { side: naval.side, degrees: naval.degrees } : {}),
            ...(sharedData.bearing !== undefined ? { bearing: sharedData.bearing } : {}),
            ...(model?.kind === 'open' && model.sails ? { setting: model.sails.current } : {}),
          },
          vehicleId: vehicle.id,
          naval: naval.kind,
          heading: sharedData.bearing ?? null,
          actorId: context.actor.id
        })
      ];
    }
    return [
      context.event('if.event.steered', {
        messageId: `${context.action.id}.${heading ? SteeringMessages.STEERED : SteeringMessages.HOVE_TO}`,
        params: { vehicle: nounPhraseFor(vehicle), ...(heading ? { direction: heading } : {}) },
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
