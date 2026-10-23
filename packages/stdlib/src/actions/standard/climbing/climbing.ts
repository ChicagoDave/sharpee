/**
 * Climbing action - climb objects or in directions
 *
 * This action handles climbing objects (trees, ladders, etc.) or climbing
 * in directions (up, down). It can result in movement or just changing position.
 * A climb up or down is going that way, delegated (ADR-378 D7, as pushing):
 * traversal decides whether the way may be taken, going moves the climber
 * and narrates the arrival, and both ids' hooks fire.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if climbing is possible (valid direction/climbable object)
 * 2. execute: Perform world mutation (move player to destination/onto object)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `climbingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, ClimbableBehavior, Direction, type DirectionType } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ClimbedEventData } from './climbing-events.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ValidatedCommand } from '../../../validation/types.js';
import { goingAction, goingLifecycle, getGoingSharedData } from '../going/going.js';
import { GoingMessages } from '../going/going-messages.js';
import { Delegation, delegateValidate, delegateExecute, delegateReport, inDelegateWords } from '../delegation-shared.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the climbed object is the only consultable
 * entity of a CLIMB command. Directional climbing ("climb up") has no direct
 * object, so the slot resolves to undefined — zero consultations.
 */
export const climbingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.CLIMBING,
  reportEventType: 'if.event.climbed',
  blockedEventType: 'if.event.climbed',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.CLIMBING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface ClimbingSharedData {
  mode: 'directional' | 'object';
  direction?: DirectionType;  // UP or DOWN for directional climbing
  targetId?: string;          // target entity ID for object climbing
  targetName?: string;        // target name for messages
  destinationId?: string;     // destination room ID for directional climbing
  fromLocationId?: string;    // current location before climbing
  /** A directional climb is going up or down, delegated (ADR-378 D7, as pushing). */
  delegation?: Delegation;
  /** Whether the delegated going moved the climber (a resolve-time block leaves them put). */
  moved?: boolean;
}

/** The command the delegated going sees: the way up or down, and no object. */
function goingCommand(context: ActionContext, direction: DirectionType): ValidatedCommand {
  return {
    ...context.command,
    actionId: IFActions.GOING,
    directObject: undefined,
    indirectObject: undefined,
    parsed: {
      ...context.command.parsed,
      extras: { ...context.command.parsed.extras, direction }
    }
  };
}

function getClimbingSharedData(context: ActionContext): ClimbingSharedData {
  return context.sharedData as ClimbingSharedData;
}

export const climbingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CLIMBING,
  requiredMessages: [
    'no_target',
    'not_climbable',
    'climb_nowhere',
    'cant_go_that_way',
    'climbed_up',
    'climbed_down',
    'climbed_onto',
    'already_there',
    'too_high',
    'too_dangerous'
  ],
  group: 'movement',

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as DirectionType | undefined;

    // No target or direction specified — defensive early return, no hooks
    if (!direction && !target) {
      return { valid: false, error: 'no_target' };
    }

    // Handle directional climbing (climb up, climb down) or object climbing
    const result = (direction && !target)
      ? validateDirectionalClimbing(direction, context)
      : validateObjectClimbing(target, context);
    if (!result.valid) return result;

    // A climb up or down is the walker's traversal, and that is going's
    // (ADR-378 D7, ADR-379): the way's hiding, blocking, door, computed
    // destination and admittance are traversal's answer, refused in going's
    // words, and going's hooks fire on its context.
    if (direction && !target) {
      const { delegation, result: delegated } = delegateValidate(context, goingAction, goingLifecycle, goingCommand(context, direction));
      getClimbingSharedData(context).delegation = delegation;
      // No way up or down at all is this action's line, not going's.
      if (!delegated.valid && !delegated.errorQualified && (delegated.error === GoingMessages.NO_EXIT_THAT_WAY || delegated.error === GoingMessages.NO_EXITS)) {
        return { valid: false, error: 'cant_go_that_way', params: { direction } };
      }
      return inDelegateWords(delegated, delegation);
    }

    return result;
  },

  /**
   * Execute the climbing action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as DirectionType | undefined;
    const sharedData = getClimbingSharedData(context);

    // Store current location for all modes
    sharedData.fromLocationId = context.currentLocation.id;

    if (direction && !target) {
      // Directional climbing
      sharedData.mode = 'directional';
      sharedData.direction = direction;

      // Going moves the climber (ADR-378 D7); a resolve-time block leaves
      // them where they were.
      const delegation = sharedData.delegation!;
      delegateExecute(delegation);
      const going = getGoingSharedData(delegation.context);
      sharedData.moved = going.currentLocation !== undefined && going.currentLocation !== going.previousLocation;
      if (sharedData.moved) sharedData.destinationId = going.currentLocation;
    } else if (target) {
      // Object climbing
      sharedData.mode = 'object';
      sharedData.targetId = target.id;
      sharedData.targetName = target.name;

      // A configured climb destination (top of tree, far side of fence) wins;
      // otherwise the player moves onto the target itself.
      const climbable = target.has(TraitType.CLIMBABLE)
        ? (target.get(TraitType.CLIMBABLE) as { destination?: string })
        : undefined;
      const moveTarget = climbable?.destination ?? target.id;
      if (climbable?.destination) {
        sharedData.destinationId = climbable.destination;
      }

      const moved = context.world.moveEntity(context.actor.id, moveTarget);
      if (!moved) {
        // Invariant (belt-and-suspenders, same pattern as the loader's door
        // guard): validate already established the target/destination can
        // receive the player — a refusal here is a platform bug and must
        // never become a silent no-op with success narration.
        throw new Error(
          `climbing: moveEntity refused after validation passed (player ${context.actor.id} -> ${moveTarget})`
        );
      }
    }

  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as DirectionType | undefined;
    const events: ISemanticEvent[] = [context.event('if.event.climbed', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name,
      direction
    })];

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getClimbingSharedData(context);

    if (sharedData.mode === 'directional') {
      // A climb going stopped at resolve time has no climbed line: going's
      // own blocked event says why nothing moved.
      if (!sharedData.moved) return delegateReport(sharedData.delegation!);

      // Directional climbing - determine message
      const messageId = sharedData.direction === Direction.UP ? 'climbed_up' : 'climbed_down';

      // Emit climbed event with messageId for text rendering
      events.push(context.event('if.event.climbed', {
        messageId: `${context.action.id}.${messageId}`,
        params: { direction: sharedData.direction },
        direction: sharedData.direction,
        method: 'directional',
        destinationId: sharedData.destinationId
      } as ClimbedEventData & { messageId: string; params: Record<string, any> }));

      // Then the move and the arrival as going records and narrates them.
      events.push(...delegateReport(sharedData.delegation!));
    } else {
      // Object climbing - emit climbed event with messageId for text rendering
      // params carry EntityInfo for the formatter chain (ADR-158)
      const target = context.command.directObject?.entity;
      events.push(context.event('if.event.climbed', {
        messageId: `${context.action.id}.climbed_onto`,
        params: { target: target ? nounPhraseFor(target) : { name: sharedData.targetName ?? '' } },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        method: 'onto'
      } as ClimbedEventData & { messageId: string; params: Record<string, any>; targetName?: string }));

      if (sharedData.destinationId) {
        // Destination climb (configured on the ClimbableTrait): the player
        // ended up somewhere else — emit moved, matching the directional path
        events.push(context.event('if.event.moved', {
          fromRoom: sharedData.fromLocationId,
          toRoom: sharedData.destinationId,
          method: 'climbing'
        }));
      } else {
        // Entered event for climbing onto
        events.push(context.event('if.event.entered', {
          targetId: sharedData.targetId,
          method: 'climbing',
          preposition: 'onto'
        }));
      }
    }

    return events;
  }
};

/**
 * Validate climbing in a direction (up/down)
 */
function validateDirectionalClimbing(
  direction: DirectionType,
  context: ActionContext
): ValidationResult {
  // Only handle up/down for climbing; the parser hands over the constant
  if (direction !== Direction.UP && direction !== Direction.DOWN) {
    return { valid: false, error: 'cant_go_that_way', params: { direction } };
  }

  // Get current location
  const currentLocation = context.currentLocation;
  if (!currentLocation.has(TraitType.ROOM)) {
    return { valid: false, error: 'cant_go_that_way', params: { direction } };
  }

  // Whether the way exists is traversal's, asked through going (validate).
  return { valid: true };
}

/**
 * Validate climbing a specific object
 */
function validateObjectClimbing(
  target: any,
  context: ActionContext
): ValidationResult {
  // Check if object is climbable
  let isClimbable = false;

  // Check if it has the CLIMBABLE trait
  if (target.has(TraitType.CLIMBABLE)) {
    const result = ClimbableBehavior.climb(target);
    if (result.success) {
      isClimbable = true;
    }
  } else if (target.has(TraitType.SUPPORTER)) {
    // Also allow climbing onto enterable supporters
    const supporterTrait = target.get(TraitType.SUPPORTER) as { enterable?: boolean };
    if (supporterTrait.enterable) {
      isClimbable = true;
    }
  }

  if (!isClimbable) {
    return { valid: false, error: 'not_climbable', params: { object: nounPhraseFor(target) } };
  }

  // Check if already on/in the target
  const currentLocation = context.world.getLocation(context.actor.id);
  if (currentLocation === target.id) {
    return { valid: false, error: 'already_there', params: { place: nounPhraseFor(target) } };
  }

  // David's ruling (2026-07-20): a bare `climbable` does NOT imply a place to
  // be — no auto-composed destination. The target must actually be able to
  // receive the player: a configured climb destination that exists, or a
  // shape the world-model's own move authority accepts (supporter, enterable,
  // container, …). Consulting canMoveEntity keeps validate and execute on ONE
  // definition of "receivable" — the same predicate execute's mutation uses.
  if (target.has(TraitType.CLIMBABLE)) {
    const climbable = target.get(TraitType.CLIMBABLE) as { destination?: string };
    const destinationExists = climbable.destination
      ? !!context.world.getEntity(climbable.destination)
      : false;
    if (!destinationExists && !context.world.canMoveEntity(context.actor.id, target.id)) {
      return { valid: false, error: 'climb_nowhere', params: { object: nounPhraseFor(target) } };
    }
  }

  return { valid: true };
}
