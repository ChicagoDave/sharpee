/**
 * Setting-course action — the `destinations` command set aboard a flight
 * vehicle (ADR-366 D5d, D5i): `set course for <destination>` names one of
 * the vehicle's `destinations:` and puts it under way. The destination is
 * typed as free text (a topic slot, as `setting`'s value is), because the
 * rooms a ship flies to are never in the player's scope; it is matched
 * against the destination rooms' names here. The departure, the passage
 * and the arrival are the vehicle's machine (D5e); this action records
 * where it is bound and nothing else.
 *
 * Uses four-phase pattern:
 * 1. validate: aboard a flight vehicle that lists the `destinations` set,
 *    not under way, naming one of its destinations that is not where it is
 * 2. execute: `sendVehicle`
 * 3. blocked: the refusal, every one a stock line (D7a)
 * 4. report: emits if.event.course_set
 *
 * Public interface: settingCourseAction, settingCourseLifecycle,
 * SettingCourseMessages.
 * Owner context: stdlib / standard actions / movement
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  getVehicleAboard,
  type IFEntity,
  isUnderWay,
  sendVehicle,
  takesCommandSet,
  VehicleTrait,
  type WorldModel,
  edgeAhead,
  ExpanseTrait,
  isInsideExpanse,
  landmarkCellOf,
  placeOf,
  type IExpanseCell,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { SettingCourseMessages } from './setting-course-messages.js';
import { exitMessageKey } from '@sharpee/world-model';

/** The command set this action speaks for (ADR-366 D5i). */
export const DESTINATIONS_COMMAND_SET = 'destinations';
/** The command set an open vehicle lists for `set course for <x>, <y>` and `<landmark>` (ADR-376 D4). */
export const COORDINATES_COMMAND_SET = 'coordinates';

/** `<x>, <y>` as typed, or undefined for any other text. */
function typedCell(typed: string): IExpanseCell | undefined {
  const m = /^(\d+)\s*,\s*(\d+)$/.exec(typed);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : undefined;
}

/** The course an open vehicle is asked for: a cell, or a landmark room with its cell. */
type OpenCourse = { cell: IExpanseCell; room?: IFEntity };

function matchOpenCourse(world: WorldModel, expanse: IFEntity, typed: string): OpenCourse | { error: string } | undefined {
  const trait = expanse.get(ExpanseTrait)!;
  const cell = typedCell(typed);
  if (cell) return isInsideExpanse(trait, cell) ? { cell } : { error: SettingCourseMessages.COORDINATES_OUTSIDE_EXPANSE };
  for (const roomId of Object.keys(trait.landmarks)) {
    const room = world.getEntity(roomId);
    if (room && room.name.trim().toLowerCase() === typed) return { cell: landmarkCellOf(trait, roomId)!, room };
  }
  return undefined;
}

/** The typed destination, trimmed and lowercased with a leading article dropped; undefined when none was typed. */
function typedDestination(context: ActionContext): string | undefined {
  const text = context.command.topic?.text?.trim().toLowerCase().replace(/^(the|a|an)\s+/, '');
  return text ? text : undefined;
}

/** The destination room whose name the player typed, among the vehicle's destinations. */
function matchDestination(world: WorldModel, vehicle: IFEntity, typed: string): IFEntity | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'flight') return undefined;
  for (const id of model.destinations) {
    const room = world.getEntity(id);
    if (room && room.name.trim().toLowerCase() === typed) return room;
  }
  return undefined;
}

interface SettingCourseSharedData {
  vehicleId?: string;
  destinationId?: string;
  /** ADR-376 D4: the cell a course was set for, when not a room. */
  cell?: IExpanseCell;
}

/**
 * Interceptor surface (ADR-228): the vehicle whose course is set, resolved
 * from where the actor is — the command names a destination, never a noun.
 */
export const settingCourseLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SETTING_COURSE,
  reportEventType: 'if.event.course_set',
  blockedEventType: 'if.event.course_blocked',
  slots: [
    {
      id: 'vehicle',
      actionIds: [IFActions.SETTING_COURSE],
      resolve: (ctx) => getVehicleAboard(ctx.world, ctx.actor.id),
      seedData: (ctx) => ({ destination: typedDestination(ctx) })
    }
  ]
};

export const settingCourseAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SETTING_COURSE,
  requiredMessages: [
    SettingCourseMessages.NOT_IN_VEHICLE,
    SettingCourseMessages.VEHICLE_NO_SUCH_COMMAND,
    SettingCourseMessages.NO_DESTINATION,
    SettingCourseMessages.NOT_A_DESTINATION,
    SettingCourseMessages.ALREADY_THERE,
    SettingCourseMessages.VEHICLE_UNDER_WAY,
    SettingCourseMessages.COORDINATES_OUTSIDE_EXPANSE,
    SettingCourseMessages.EXPANSE_EDGE,
    SettingCourseMessages.EDGE_BLOCKED,
    SettingCourseMessages.COURSE_SET,
    SettingCourseMessages.COURSE_SET_CELL
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const vehicle = getVehicleAboard(context.world, context.actor.id);
    if (!vehicle) {
      return { valid: false, error: SettingCourseMessages.NOT_IN_VEHICLE };
    }
    const params = { vehicle: nounPhraseFor(vehicle) };
    const model = vehicle.get(VehicleTrait)?.model;
    const open = model?.kind === 'open' && takesCommandSet(vehicle, COORDINATES_COMMAND_SET);
    if (!open && (!takesCommandSet(vehicle, DESTINATIONS_COMMAND_SET) || model?.kind !== 'flight')) {
      return { valid: false, error: SettingCourseMessages.VEHICLE_NO_SUCH_COMMAND, params };
    }
    const typed = typedDestination(context);
    if (typed === undefined) {
      return { valid: false, error: SettingCourseMessages.NO_DESTINATION, params };
    }
    if (isUnderWay(vehicle)) {
      return { valid: false, error: SettingCourseMessages.VEHICLE_UNDER_WAY, params };
    }
    if (open) {
      // ADR-376 D3, D4, D8: a cell of the vehicle's expanse or one of its
      // landmarks; a course whose first leg heads into the edge it is at
      // is refused with the edge's phrase. Where the vehicle is — its cell
      // under way, its landmark's row moored — is the place system's answer.
      const place = placeOf(context.world, vehicle);
      if (!place) return { valid: false, error: SettingCourseMessages.NOT_A_DESTINATION, params: { ...params, destination: typed } };
      const expanse = place.expanse;
      const course = matchOpenCourse(context.world, expanse, typed);
      if (!course) return { valid: false, error: SettingCourseMessages.NOT_A_DESTINATION, params: { ...params, destination: typed } };
      if ('error' in course) return { valid: false, error: course.error, params: { ...params, destination: typed } };
      if (course.room && context.world.getLocation(vehicle.id) === course.room.id) {
        return { valid: false, error: SettingCourseMessages.ALREADY_THERE, params: { ...params, destination: nounPhraseFor(course.room) } };
      }
      const from = place.cell;
      const side = edgeAhead(vehicle, { x: Math.sign(course.cell.x - from.x), y: Math.sign(course.cell.y - from.y) });
      if (side) {
        const message = context.world.evaluate(exitMessageKey(expanse.id, side));
        return typeof message === 'string' && message.length > 0
          ? { valid: false, error: SettingCourseMessages.EDGE_BLOCKED, params: { ...params, message } }
          : { valid: false, error: SettingCourseMessages.EXPANSE_EDGE, params };
      }
      return { valid: true };
    }
    const destination = matchDestination(context.world, vehicle, typed);
    if (!destination) {
      return { valid: false, error: SettingCourseMessages.NOT_A_DESTINATION, params: { ...params, destination: typed } };
    }
    if (context.world.getLocation(vehicle.id) === destination.id) {
      return { valid: false, error: SettingCourseMessages.ALREADY_THERE, params: { ...params, destination: nounPhraseFor(destination) } };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const vehicle = getVehicleAboard(context.world, context.actor.id)!;
    const sharedData = context.sharedData as SettingCourseSharedData;
    sharedData.vehicleId = vehicle.id;
    const typed = typedDestination(context)!;
    if (vehicle.get(VehicleTrait)?.model?.kind === 'open') {
      const expanse = placeOf(context.world, vehicle)!.expanse;
      const course = matchOpenCourse(context.world, expanse, typed) as OpenCourse;
      if (course.room) {
        sendVehicle(context.world, vehicle, course.room.id);
        sharedData.destinationId = course.room.id;
      } else {
        sendVehicle(context.world, vehicle, course.cell);
        sharedData.cell = course.cell;
      }
      return;
    }
    const destination = matchDestination(context.world, vehicle, typed)!;
    sendVehicle(context.world, vehicle, destination.id);
    sharedData.destinationId = destination.id;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = context.sharedData as SettingCourseSharedData;
    const vehicle = context.world.getEntity(sharedData.vehicleId!)!;
    if (sharedData.cell) {
      return [
        context.event('if.event.course_set', {
          messageId: `${context.action.id}.${SettingCourseMessages.COURSE_SET_CELL}`,
          params: { vehicle: nounPhraseFor(vehicle), x: sharedData.cell.x, y: sharedData.cell.y },
          vehicleId: vehicle.id,
          cell: sharedData.cell,
          actorId: context.actor.id
        })
      ];
    }
    const destination = context.world.getEntity(sharedData.destinationId!)!;
    return [
      context.event('if.event.course_set', {
        messageId: `${context.action.id}.${SettingCourseMessages.COURSE_SET}`,
        params: { vehicle: nounPhraseFor(vehicle), destination: nounPhraseFor(destination) },
        vehicleId: vehicle.id,
        destinationId: destination.id,
        actorId: context.actor.id
      })
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('if.event.course_blocked', {
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

export { SettingCourseMessages };
