/**
 * Entering action - enter containers, supporters, or other enterable objects
 *
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and can be entered
 * 2. execute: Move the actor into the target
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `enteringLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  type IFEntity,
  TraitType,
  OpenableBehavior,
  EnterableTrait,
  getVehicleAboard,
  outsideWayOf,
  VehicleTrait,
  type WorldModel,
  boardFromExpanse,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { EnteredEventData } from './entering-events.js';
import { EnteringMessages } from './entering-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { captureRevealedRoom, revealedRoomEvents, type RevealedRoom } from '../illumination-shared.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the entered target is the only
 * consultable entity of an ENTER command.
 */
export const enteringLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.ENTERING,
  reportEventType: 'if.event.entered',
  blockedEventType: 'if.event.entered',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.ENTERING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

interface EnteringExecutionState {
  targetId: string;
  targetName: string;
  fromLocation?: string;
  preposition: 'in' | 'on';
  /** Set when the target was a vehicle with rooms aboard: the boarding room, described on arrival (ADR-366 D7). */
  boarded?: RevealedRoom;
}

/**
 * The room `boarded through:` names on a vehicle with rooms aboard (ADR-366
 * D7), or undefined for anything else — which is entered as itself.
 */
function boardedThroughOf(world: WorldModel, target: IFEntity): IFEntity | undefined {
  const id = target.get(VehicleTrait)?.boardedThrough;
  return id !== undefined ? world.getEntity(id) : undefined;
}

/**
 * Why boarding is refused, or undefined when the boarder may come aboard
 * (D7; alignment finding F10): boarding takes the boarding room's outside
 * ways in reverse, so traversal answers for the gates that hold both ways —
 * a closed or locked hatch, a way hidden by its `while`. A block on the way
 * out is that side's line and does not keep anyone off. A boarding room
 * with no outside exit is boarded as ever.
 */
function boardingRefusal(context: ActionContext, target: IFEntity, boardedThrough: IFEntity): ValidationResult | undefined {
  const way = outsideWayOf(context.world, boardedThrough, { kind: 'walker', entity: context.actor }, 'in');
  if (way.kind !== 'refused') return undefined;
  if (way.reason === 'door_closed' || way.reason === 'door_locked') {
    return { valid: false, error: EnteringMessages.CONTAINER_CLOSED, params: { container: nounPhraseFor(way.door!) } };
  }
  return { valid: false, error: EnteringMessages.VEHICLE_NOT_BOARDABLE, params: { vehicle: nounPhraseFor(target) } };
}

/**
 * Whether the command was the boarding gesture (D7: for a vehicle with rooms
 * aboard only): the grammar line's `means gesture board`, data from the
 * parser, never the typed verb (alignment finding F5).
 */
function saidBoard(context: ActionContext): boolean {
  return context.command.parsed.extras?.gesture === 'board';
}

/**
 * Shared data passed between execute and report phases
 */
interface EnteringSharedData {
  enteringState?: EnteringExecutionState;
}

function getEnteringSharedData(context: ActionContext): EnteringSharedData {
  return context.sharedData as EnteringSharedData;
}

import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';

export const enteringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ENTERING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_enterable',
    'already_inside',
    'container_closed',
    'too_full',
    'entered',
    'entered_on',
    'cant_enter',
    'boarded',
    'vehicle_not_boardable'
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const actor = context.actor;
    const target = context.command.directObject?.entity;

    // Validate target
    if (!target) {
      return {
        valid: false,
        error: EnteringMessages.NO_TARGET
      };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return {
        valid: false,
        error: EnteringMessages.ALREADY_INSIDE,
        params: { place: nounPhraseFor(target) }
      };
    }

    // A vehicle with rooms aboard is boarded, not entered (ADR-366 D7): the
    // player goes to its boarding room, through the hatch if it has one.
    const boardedThrough = boardedThroughOf(context.world, target);
    if (boardedThrough) {
      if (getVehicleAboard(context.world, actor.id)?.id === target.id) {
        return { valid: false, error: EnteringMessages.ALREADY_INSIDE, params: { place: nounPhraseFor(target) } };
      }
      return boardingRefusal(context, target, boardedThrough) ?? { valid: true };
    }
    if (saidBoard(context)) {
      // `board` is for ships (D7): anything without rooms aboard refuses,
      // naming nothing but the thing (D7a).
      return { valid: false, error: EnteringMessages.VEHICLE_NOT_BOARDABLE, params: { vehicle: nounPhraseFor(target) } };
    }

    // Check enterability
    if (!target.has(TraitType.ENTERABLE)) {
      return {
        valid: false,
        error: EnteringMessages.NOT_ENTERABLE,
        params: { place: nounPhraseFor(target) }
      };
    }

    // Check if it needs to be open
    if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
      return {
        valid: false,
        error: EnteringMessages.CONTAINER_CLOSED,
        params: { container: nounPhraseFor(target) }
      };
    }

    return { valid: true };
  },

  /**
   * Execute the enter action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.actor;
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const currentLocation = context.world.getLocation(actor.id);
    const sharedData = getEnteringSharedData(context);

    // Boarding (ADR-366 D7): the player goes to the boarding room, and sees
    // it as if they had looked.
    const boardedThrough = boardedThroughOf(context.world, target);
    if (boardedThrough) {
      context.world.moveEntity(actor.id, boardedThrough.id);
      sharedData.enteringState = {
        targetId: target.id,
        targetName: target.name,
        fromLocation: currentLocation,
        preposition: 'in',
        boarded: captureRevealedRoom(context)
      };
      return;
    }

    // Get preposition from EnterableTrait (required by validate)
    const enterableTrait = target.get(TraitType.ENTERABLE) as EnterableTrait;
    const preposition = enterableTrait.preposition;

    // Simply move the actor to the target - that's all!
    context.world.moveEntity(actor.id, target.id);
    // Back aboard from the expanse (ADR-376 D9): the position they held
    // out there is dropped, and the vehicle's machine resumes.
    boardFromExpanse(actor);

    // Store state for report phase using sharedData
    const state: EnteringExecutionState = {
      targetId: target.id,
      targetName: target.name,
      fromLocation: currentLocation,
      preposition
    };
    sharedData.enteringState = state;

  },

  /**
   * Report events after successful entering
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    // Get stored state from execute phase
    const sharedData = getEnteringSharedData(context);
    const state = sharedData.enteringState as EnteringExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('if.event.entered', {
          messageId: `${context.action.id}.${EnteringMessages.ACTION_FAILED}`,
          error: 'Missing state from execute phase'
        })
      ];
    }

    // Determine the message ID based on preposition
    const messageId = state.boarded
      ? EnteringMessages.BOARDED
      : state.preposition === 'on' ? EnteringMessages.ENTERED_ON : EnteringMessages.ENTERED;

    // Create the ENTERED event with messageId for text rendering.
    // params carry EntityInfo for the formatter chain (ADR-158).
    const target = context.command.directObject?.entity;
    const place = target ? nounPhraseFor(target) : { name: state.targetName };
    const events: ISemanticEvent[] = [context.event('if.event.entered', {
      messageId: `${context.action.id}.${messageId}`,
      params: { place, vehicle: place },
      targetId: state.targetId,
      targetName: state.targetName,
      fromLocation: state.fromLocation,
      preposition: state.preposition
    } as EnteredEventData & { messageId: string; params: Record<string, any>; targetName: string })];

    // Boarding lands in a room (ADR-366 D7): describe it, as arriving does.
    if (state.boarded) events.push(...revealedRoomEvents(context, state.boarded));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    // Standard blocked handling — params carry EntityInfo (ADR-158)
    const events: ISemanticEvent[] = [context.event('if.event.entered', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: { place: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    return events;
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
