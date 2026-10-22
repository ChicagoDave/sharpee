/**
 * Setting-course action — the `destinations` command set aboard a flight
 * vehicle (ADR-366 D5d, D5i): `set course for <destination>` names one of
 * the vehicle's `destinations:` and puts it under way. The destination is
 * a topic slot, because the rooms a ship flies to are never in the
 * player's scope; the action names them (`topicCandidates`) and the
 * validator resolves the typed words among them by name and alias, so
 * this action reads a room, never English (alignment finding F5). Only a
 * cell, `<x>, <y>`, is read from the text. The departure, the passage
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
  edgeRefusalOf,
  ExpanseTrait,
  isInsideExpanse,
  landmarkCellOf,
  placeOf,
  type IExpanseCell,
  VEHICLE_REPORT_MESSAGES,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { SettingCourseMessages } from './setting_course-messages.js';

/** The command set this action speaks for (ADR-366 D5i). */
export const DESTINATIONS_COMMAND_SET = 'destinations';
/** The command set an open vehicle lists for `set course for <x>, <y>` and `<landmark>` (ADR-376 D4). */
export const COORDINATES_COMMAND_SET = 'coordinates';

/** `<x>, <y>` as typed, or undefined for any other text. */
function typedCell(typed: string): IExpanseCell | undefined {
  const m = /^(\d+)\s*,\s*(\d+)$/.exec(typed);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : undefined;
}

/**
 * The rooms a course may name from aboard the actor's vehicle: a flight
 * vehicle's `destinations:`, or the landmarks of the expanse an open
 * vehicle is in. The validator resolves the typed destination among them
 * by name and alias (alignment finding F5), so this action never reads
 * the typed words for a place.
 */
function courseCandidates(world: WorldModel, actorId: string): readonly string[] {
  const vehicle = getVehicleAboard(world, actorId);
  const model = vehicle?.get(VehicleTrait)?.movement;
  if (model?.kind === 'flight') return model.destinations;
  if (model?.kind === 'open') {
    const expanse = placeOf(world, vehicle!)?.expanse;
    return expanse ? Object.keys(expanse.get(ExpanseTrait)!.landmarks) : [];
  }
  return [];
}

/** The course an open vehicle is asked for: a cell, or a landmark room with its cell. */
type OpenCourse = { cell: IExpanseCell; room?: IFEntity };

function matchOpenCourse(expanse: IFEntity, typed: string, named: IFEntity | undefined): OpenCourse | { error: string } | undefined {
  const trait = expanse.get(ExpanseTrait)!;
  const cell = typedCell(typed);
  if (cell) return isInsideExpanse(trait, cell) ? { cell } : { error: SettingCourseMessages.COORDINATES_OUTSIDE_EXPANSE };
  const landmark = named ? landmarkCellOf(trait, named.id) : undefined;
  return landmark ? { cell: landmark, room: named } : undefined;
}

/** The destination as typed, trimmed; undefined when none was typed. */
function typedDestination(context: ActionContext): string | undefined {
  const text = context.command.topic?.text?.trim();
  return text ? text : undefined;
}

/** The room the validator resolved the destination to, among `courseCandidates`; undefined on a miss. */
function namedDestination(context: ActionContext): IFEntity | undefined {
  const id = context.command.topic?.entity;
  return id ? context.world.getEntity(id) : undefined;
}

/** The destination room the player named, among the vehicle's destinations. */
function matchDestination(vehicle: IFEntity, named: IFEntity | undefined): IFEntity | undefined {
  const model = vehicle.get(VehicleTrait)?.movement;
  if (model?.kind !== 'flight' || !named) return undefined;
  return model.destinations.includes(named.id) ? named : undefined;
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
    const model = vehicle.get(VehicleTrait)?.movement;
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
      const course = matchOpenCourse(expanse, typed, namedDestination(context));
      if (!course) return { valid: false, error: SettingCourseMessages.NOT_A_DESTINATION, params: { ...params, destination: typed } };
      if ('error' in course) return { valid: false, error: course.error, params: { ...params, destination: typed } };
      if (course.room && context.world.getLocation(vehicle.id) === course.room.id) {
        return { valid: false, error: SettingCourseMessages.ALREADY_THERE, params: { ...params, destination: nounPhraseFor(course.room) } };
      }
      const from = place.cell;
      const edge = edgeRefusalOf(context.world, vehicle, { x: Math.sign(course.cell.x - from.x), y: Math.sign(course.cell.y - from.y) });
      if (edge) {
        // ADR-376 D8: an edge reads the same whoever meets it — going's line.
        return edge.message !== undefined
          ? { valid: false, error: VEHICLE_REPORT_MESSAGES.MOVEMENT_BLOCKED, errorQualified: true, params: { ...params, message: edge.message } }
          : { valid: false, error: VEHICLE_REPORT_MESSAGES.EXPANSE_EDGE, errorQualified: true, params };
      }
      return { valid: true };
    }
    const destination = matchDestination(vehicle, namedDestination(context));
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
    if (vehicle.get(VehicleTrait)?.movement?.kind === 'open') {
      const expanse = placeOf(context.world, vehicle)!.expanse;
      const course = matchOpenCourse(expanse, typed, namedDestination(context)) as OpenCourse;
      if (course.room) {
        sendVehicle(context.world, vehicle, course.room.id);
        sharedData.destinationId = course.room.id;
      } else {
        sendVehicle(context.world, vehicle, course.cell);
        sharedData.cell = course.cell;
      }
      return;
    }
    const destination = matchDestination(vehicle, namedDestination(context))!;
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
    directObjectScope: ScopeLevel.VISIBLE,
    topicCandidates: courseCandidates
  }
};

export { SettingCourseMessages };
