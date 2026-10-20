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
  edgeAhead,
  headingVector,
  bearingOf,
  comeAbout,
  furlSails,
  makeSail,
  shortenSail,
  turnHeading,
  windOf,
  type IFEntity,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { SteeringMessages } from './steering-messages.js';
import { exitMessageKey } from '@sharpee/world-model';

/** The command set this action speaks for (ADR-366 D5i). */
export const COMPASS_COMMAND_SET = 'compass';
/** The sailing set (ADR-375 D3): turns by degrees, `ahead`, `come about`, and the sail words. */
export const NAVAL_COMMAND_SET = 'naval';

/** A naval gesture as the player typed it (ADR-375 D3, D7). */
type NavalCommand =
  | { kind: 'turn'; side: 'port' | 'starboard'; degrees: number | undefined }
  | { kind: 'ahead' }
  | { kind: 'come-about' }
  | { kind: 'make-sail' }
  | { kind: 'shorten-sail' }
  | { kind: 'furl-sails' };

/** The naval gesture the command's verb names, or undefined for `steer` and `heave to`. */
function navalCommand(context: ActionContext): NavalCommand | undefined {
  const verb = (context.command.parsed.structure.verb?.text || context.command.parsed.rawInput || '').trim().toLowerCase();
  const topic = context.command.topic?.text?.trim().toLowerCase() ?? '';
  const degreesOf = (text: string): number | undefined => {
    const m = /^(\d+)(?:\s*degrees?)?$/.exec(text.trim());
    return m ? Number(m[1]) : undefined;
  };
  if (verb.startsWith('hard to port')) return { kind: 'turn', side: 'port', degrees: 90 };
  if (verb.startsWith('hard to starboard')) return { kind: 'turn', side: 'starboard', degrees: 90 };
  if (verb === 'port' || verb.startsWith('port ')) return { kind: 'turn', side: 'port', degrees: degreesOf(topic || verb.slice(5)) };
  if (verb === 'starboard' || verb.startsWith('starboard ')) return { kind: 'turn', side: 'starboard', degrees: degreesOf(topic || verb.slice(10)) };
  if (verb.startsWith('ahead')) return { kind: 'ahead' };
  if (verb.startsWith('come about')) return { kind: 'come-about' };
  if (verb.startsWith('make sail')) return { kind: 'make-sail' };
  if (verb.startsWith('shorten sail')) return { kind: 'shorten-sail' };
  if (verb.startsWith('furl')) return { kind: 'furl-sails' };
  return undefined;
}

/** The heading the command names, as the platform's direction constant; undefined for `heave to`. */
function resolveHeading(context: ActionContext): DirectionType | undefined {
  const direction = context.command.parsed.extras?.direction;
  return typeof direction === 'string' && direction.length > 0 ? (direction.toUpperCase() as DirectionType) : undefined;
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

/** ADR-376 D8: the refusal for a way with a component toward the edge the vehicle is at, or undefined. */
function edgeRefusal(context: ActionContext, vehicle: IFEntity, vector: { x: number; y: number }, params: Record<string, unknown>): ValidationResult | undefined {
  const side = edgeAhead(vehicle, vector);
  if (!side) return undefined;
  const expanseId = context.world.getLocation(vehicle.id);
  const message = expanseId !== undefined ? context.world.evaluate(exitMessageKey(expanseId, side)) : undefined;
  return typeof message === 'string' && message.length > 0
    ? { valid: false, error: SteeringMessages.EDGE_BLOCKED, params: { ...params, message } }
    : { valid: false, error: SteeringMessages.EXPANSE_EDGE, params };
}

export const steeringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.STEERING,
  requiredMessages: [
    SteeringMessages.NOT_IN_VEHICLE,
    SteeringMessages.VEHICLE_NO_SUCH_COMMAND,
    SteeringMessages.CANNOT_STEER,
    SteeringMessages.NOT_UNDER_WAY,
    SteeringMessages.EXPANSE_EDGE,
    SteeringMessages.EDGE_BLOCKED,
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
          const bearing = model.heading === null ? 0 : bearingOf(model.heading) ?? 0;
          return edgeRefusal(context, vehicle, headingVector(bearing)!, params) ?? { valid: true };
        }
        case 'come-about': {
          const wind = windOf(context.world, vehicle);
          if (!model.sailing || wind === undefined || wind === 'calm') return { valid: false, error: SteeringMessages.NAVAL_NO_WIND, params };
          const from = model.heading === null ? 0 : bearingOf(model.heading) ?? 0;
          const off = ((((from - wind) % 360) + 540) % 360) - 180;
          if (off === 0 || off === 180 || off === -180) return { valid: false, error: SteeringMessages.NAVAL_CANNOT_COME_ABOUT, params };
          return { valid: true };
        }
        case 'make-sail':
        case 'shorten-sail':
        case 'furl-sails': {
          if (!model.sails) return { valid: false, error: SteeringMessages.VEHICLE_NO_SUCH_COMMAND, params };
          const index = model.sails.settings.indexOf(model.sails.current);
          if (naval.kind === 'make-sail' && index >= model.sails.settings.length - 1) return { valid: false, error: SteeringMessages.SAILS_AT_FULL, params };
          if (naval.kind !== 'make-sail' && index <= 0) return { valid: false, error: SteeringMessages.SAILS_ALREADY_FURLED, params };
          return { valid: true };
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
          startVehicle(context.world, vehicle, model.heading === null ? 0 : bearingOf(model.heading) ?? 0);
          sharedData.bearing = bearingOf(model.heading ?? 0);
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
