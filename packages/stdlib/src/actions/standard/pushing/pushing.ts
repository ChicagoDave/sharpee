/**
 * Pushing action — press a thing, or push it through an exit into the next
 * room.
 *
 * The thing says it can be pushed (`PushableTrait`, a marker); the way says
 * whether a push moves it (`admits pushing` on the exit line or the room,
 * read through traversal's home, ADR-378 D6). With no direction the push is
 * a press: a switchable thing is toggled, and the stock line prints. With a
 * direction the actor's own traversal is `going`'s, delegated (ADR-228
 * D6-B): every refusal going knows — no exit, a hidden way, the blocked
 * phrase, a closed or locked door, a vehicle the actor rides — is the push's
 * refusal in going's words (ADR-378 D7), and both ids' hooks fire. The
 * pushed thing is going's mover, so a way that exists but does not admit it
 * — a computed way's drawn room included — refuses `cannot_push_that_way`.
 *
 * Uses four-phase pattern:
 * 1. validate: target, reach, the marker; with a direction, the way and
 *    the delegated going
 * 2. execute: the press's toggle, or going's move then the thing's
 * 3. blocked: the refusal event
 * 4. report: the pushed event, then going's arrival events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `pushingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  SwitchableTrait,
  SwitchableBehavior,
  isDirection,
  type DirectionType,
  type IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/types.js';
import { ValidatedCommand } from '../../../validation/types.js';
import { PushedEventData } from './pushing-events.js';
import { getPushingSharedData } from './pushing-types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { goingAction, goingLifecycle, getGoingSharedData, PUSHED_THING_EXTRA } from '../going/going.js';
import { delegateValidate, delegateExecute, delegateReport, inDelegateWords } from '../delegation-shared.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the pushed target is the only
 * consultable entity of a PUSH command under this id; a push with a
 * direction also consults going's entities under going's ids, inside the
 * delegated context (D6-B).
 */
export const pushingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.PUSHING,
  reportEventType: 'if.event.pushed',
  blockedEventType: 'if.event.pushed',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.PUSHING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      // Context the old hand-rolled wiring seeded — kept for story
      // interceptors outside this repo (ADR-228 D3 symmetric-context).
      seedData: (_ctx, entity) => ({
        targetId: entity.id,
        targetName: entity.name
      })
    }
  ]
};

/**
 * The command the delegated going sees: the direction, no object, and the
 * pushed thing named as the way's mover.
 */
function goingCommand(context: ActionContext, direction: DirectionType, pushed: IFEntity): ValidatedCommand {
  return {
    ...context.command,
    actionId: IFActions.GOING,
    directObject: undefined,
    indirectObject: undefined,
    parsed: {
      ...context.command.parsed,
      extras: { ...context.command.parsed.extras, direction, [PUSHED_THING_EXTRA]: pushed.id }
    }
  };
}

export const pushingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUSHING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'wearing_it',
    'carrying_it',
    'button_pushed',
    'button_clicks',
    'switch_toggled',
    'pushed_direction',
    'cannot_push_that_way',
    'pushing_does_nothing',
    'fixed_in_place'
  ],

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.actor;
    const target = context.command.directObject?.entity;
    const sharedData = getPushingSharedData(context);

    // Must have something to push
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Can't push worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return {
          valid: false,
          error: 'wearing_it'
        };
      }
    }

    // Check if object is pushable
    if (!target.has(TraitType.PUSHABLE)) {
      // Not pushable - check if it's fixed scenery
      if (target.has(TraitType.SCENERY)) {
        return {
          valid: false,
          error: 'fixed_in_place'
        };
      }
      // Regular non-pushable object
      return {
        valid: false,
        error: 'pushing_does_nothing'
      };
    }

    const direction = context.command.parsed.extras?.direction as string | undefined;
    if (!direction) return { valid: true };

    // A push with a direction (ADR-378 D6): the thing stands in the actor's
    // room, the way is a compass exit of that room, and it admits pushing.
    // A passage is not a direction, so one never arrives here.
    if (context.world.getLocation(target.id) === actor.id) {
      return { valid: false, error: 'carrying_it', params: { target: nounPhraseFor(target) } };
    }
    const room = context.world.getContainingRoom(actor.id) ?? context.currentLocation;
    const refusal = { target: nounPhraseFor(target), direction };
    if (!isDirection(direction) || context.world.getLocation(target.id) !== room.id) {
      return { valid: false, error: 'cannot_push_that_way', params: refusal };
    }

    // The traversal is going's (ADR-378 D7), with the pushed thing as the
    // mover: traversal admits the way for it (a way that does not refuses
    // in this action's words), every other refusal is going's to word, and
    // going's hooks fire on its context.
    const { delegation, result } = delegateValidate(context, goingAction, goingLifecycle, goingCommand(context, direction, target));
    sharedData.delegation = delegation;
    return inDelegateWords(result, delegation);
  },

  /**
   * Execute the push action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject!.entity!;
    const sharedData = getPushingSharedData(context);

    // Store basic info
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.messageParams = { target: nounPhraseFor(target) };

    const delegation = sharedData.delegation;
    if (delegation) {
      // Going moves the actor (or the vehicle they steer); the thing follows
      // to wherever the actor arrived, so a computed way or a resolve-time
      // block (ADR-295 D5) leaves both where they were.
      delegateExecute(delegation);
      const going = getGoingSharedData(delegation.context);
      const direction = going.direction as string;
      sharedData.direction = direction;
      if (going.currentLocation && going.currentLocation !== going.previousLocation) {
        context.world.moveEntity(target.id, going.currentLocation);
        sharedData.moved = true;
        sharedData.destinationId = going.currentLocation;
        sharedData.messageId = 'pushed_direction';
        sharedData.messageParams.direction = direction;
      } else {
        sharedData.moved = false;
      }
      return;
    }

    // The press: a switchable thing is toggled; anything else just takes
    // the push and lets its interceptors say what happened.
    if (target.has(TraitType.SWITCHABLE)) {
      const switchable = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
      sharedData.willToggle = true;
      sharedData.currentState = switchable.isOn;
      sharedData.newState = !switchable.isOn;
      SwitchableBehavior.toggle(target, context.world);
      sharedData.messageId = target.has(TraitType.BUTTON) ? 'button_clicks' : 'switch_toggled';
      sharedData.messageParams.newState = sharedData.newState ? 'on' : 'off';
    } else {
      sharedData.messageId = 'button_pushed';
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    // Standard blocked handling — params carry EntityInfo for the
    // formatter chain (ADR-158); top-level fields stay strings for handlers.
    const events: ISemanticEvent[] = [context.event('if.event.pushed', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPushingSharedData(context);

    // A push whose going stopped at resolve time has no pushed line: going's
    // own blocked event says why nothing moved.
    if (sharedData.delegation && !sharedData.moved) {
      return delegateReport(sharedData.delegation);
    }

    // Emit pushed event with messageId for text rendering
    const data: PushedEventData & { messageId: string; params: Record<string, unknown> } = {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.messageParams ?? {},
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      direction: sharedData.direction,
      willToggle: sharedData.willToggle,
      currentState: sharedData.currentState,
      newState: sharedData.newState,
      moved: sharedData.moved,
      destinationId: sharedData.destinationId
    };
    events.push(context.event('if.event.pushed', data));

    // Then the arrival as going narrates it, with the thing already there.
    if (sharedData.delegation) events.push(...delegateReport(sharedData.delegation));

    return events;
  },

  group: "device_manipulation"
};
