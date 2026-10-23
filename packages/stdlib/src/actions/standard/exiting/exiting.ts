/**
 * Exiting action - exit from containers, supporters, or other enterable objects
 *
 * This action handles exiting objects that the actor is currently inside/on.
 * In a room the actor is inside nothing, so `go out`, `exit` and `leave` are
 * going out, delegated (ADR-228 D6-B, as climbing and pushing): the room's
 * `out` way and every traversal gate on it are going's, and a room with no
 * way out keeps exiting's own line.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  OpenableBehavior,
  IFEntity,
  Direction,
  leaveVehicleIntoExpanse,
  outsideWayOf,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ValidatedCommand } from '../../../validation/types.js';
import { goingAction, goingLifecycle } from '../going/going.js';
import { GoingMessages } from '../going/going-messages.js';
import { Delegation, delegateValidate, delegateExecute, delegateReport, inDelegateWords } from '../delegation-shared.js';
import { ExitedEventData } from './exiting-events.js';
import { ExitingMessages } from './exiting-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * The enterable the actor is currently inside/on — exiting's affected
 * entity is never a parsed object (EXIT takes no noun), so it resolves
 * implicitly from the actor's location (ADR-228 D3 implicit-entity slot).
 * Resolves undefined when the actor is directly in a room.
 */
function resolveCurrentContainer(context: ActionContext): IFEntity | undefined {
  const currentLocation = context.world.getLocation(context.actor.id);
  if (!currentLocation) return undefined;
  const container = context.world.getEntity(currentLocation);
  if (!container || container.has(TraitType.ROOM)) return undefined;
  return container;
}

/**
 * Interceptor surface (ADR-228): the container/supporter being exited —
 * `on exiting it` on a boat, cage, or bed fires here.
 */
export const exitingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.EXITING,
  reportEventType: 'if.event.exited',
  blockedEventType: 'if.event.exited',
  slots: [
    {
      id: 'container',
      actionIds: [IFActions.EXITING],
      resolve: resolveCurrentContainer
    }
  ]
};

interface ExitingExecutionState {
  fromLocation: string;
  fromLocationName: string;
  toLocation: string;
  preposition: string;
}

/**
 * Shared data passed between execute and report phases
 */
interface ExitingSharedData {
  exitingState?: ExitingExecutionState;
  /** In a room, exiting is going out, delegated. */
  delegation?: Delegation;
}

function getExitingSharedData(context: ActionContext): ExitingSharedData {
  return context.sharedData as ExitingSharedData;
}

/** The command the delegated going sees: the way out, and no object. */
function goingOutCommand(context: ActionContext): ValidatedCommand {
  return {
    ...context.command,
    actionId: IFActions.GOING,
    directObject: undefined,
    indirectObject: undefined,
    parsed: {
      ...context.command.parsed,
      extras: { ...context.command.parsed.extras, direction: Direction.OUT }
    }
  };
}

import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';

export const exitingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXITING,
  requiredMessages: [
    'already_outside',
    'container_closed',
    'cant_exit',
    'exited',
    'exited_from',
    'nowhere_to_go',
    'not_in_that',
    'not_on_that',
    'vehicle_not_at_hatch',
    'outside_ambiguous'
  ],
  group: 'movement',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.actor;
    const currentLocation = context.world.getLocation(actor.id);

    if (!currentLocation) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    const currentContainer = context.world.getEntity(currentLocation);
    if (!currentContainer) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    // Targeted forms (`exit :container`, `get off :vehicle`, `disembark
    // :vehicle`) name what the player believes they occupy — the named
    // target must BE the current container, else refuse (ADR-231 Phase 4
    // audit defect: validate() previously ignored the direct object and
    // exited whatever the player was in). Checked before the room check so
    // `exit basket` from open ground refuses as "not in/on that", not
    // "you're not inside anything".
    const target = context.command.directObject?.entity;
    if (target && target.id !== currentLocation) {
      return {
        valid: false,
        error: target.has(TraitType.SUPPORTER)
          ? ExitingMessages.NOT_ON_THAT
          : ExitingMessages.NOT_IN_THAT,
        params: { container: nounPhraseFor(target) }
      };
    }

    // Check if we're in something we can exit from
    // Rooms cannot be exited (use GO to move between rooms)
    const isRoom = currentContainer.has(TraitType.ROOM);

    if (isRoom) {
      // Aboard a vehicle (ADR-366 D7): the vehicle command transformer sends
      // `exit` along the one way out traversal grants, as going. Reaching
      // here, the room has no way out, or more than one is granted and the
      // platform does not choose between them (Q2).
      if (currentContainer.has(TraitType.ABOARD)) {
        const way = outsideWayOf(context.world, currentContainer, { kind: 'walker', entity: actor });
        return { valid: false, error: way.kind === 'ambiguous' ? ExitingMessages.OUTSIDE_AMBIGUOUS : ExitingMessages.VEHICLE_NOT_AT_HATCH };
      }
      // In a room, exiting is going out: the author's `out` way and its
      // gates are traversal's, refused in going's words.
      const { delegation, result: delegated } = delegateValidate(context, goingAction, goingLifecycle, goingOutCommand(context));
      getExitingSharedData(context).delegation = delegation;
      // No way out at all is this action's line, not going's.
      if (!delegated.valid && !delegated.errorQualified && (delegated.error === GoingMessages.NO_EXIT_THAT_WAY || delegated.error === GoingMessages.NO_EXITS)) {
        return { valid: false, error: ExitingMessages.ALREADY_OUTSIDE };
      }
      return inDelegateWords(delegated, delegation);
    }

    // Find the parent location (where we'll exit to)
    const parentLocation = context.world.getLocation(currentLocation);
    if (!parentLocation) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    // Check if container needs to be open to exit using behavior
    if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(currentContainer)) {
        return {
          valid: false,
          error: ExitingMessages.CONTAINER_CLOSED,
          params: { container: nounPhraseFor(currentContainer) }
        };
      }
    }

    return { valid: true };
  },
  
  /**
   * Execute the exit action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    // Going out of a room: going moves the actor (validate delegated it).
    const delegation = getExitingSharedData(context).delegation;
    if (delegation) {
      delegateExecute(delegation);
      return;
    }

    const actor = context.actor;
    const currentLocation = context.world.getLocation(actor.id)!; // Safe because validate ensures it exists
    const currentContainer = context.world.getEntity(currentLocation)!; // Safe because validate ensures it exists
    const parentLocation = context.world.getLocation(currentLocation)!; // Safe because validate ensures it exists
    
    // Determine preposition based on what we're exiting from
    let preposition = 'from';
    if (currentContainer.has(TraitType.CONTAINER)) {
      preposition = 'out of';
    } else if (currentContainer.has(TraitType.SUPPORTER)) {
      preposition = 'off';
    }
    
    // Out of an open vehicle positioned in its expanse (ADR-376 D9), the
    // actor takes the vehicle's cell as a position of their own; from
    // anything else, the move to the parent is the whole of it.
    if (!(currentContainer.has(TraitType.VEHICLE) && leaveVehicleIntoExpanse(context.world, actor, currentContainer))) {
      context.world.moveEntity(actor.id, parentLocation);
    }
    
    // Store state for report phase using sharedData
    const state: ExitingExecutionState = {
      fromLocation: currentLocation,
      fromLocationName: currentContainer.name,
      toLocation: parentLocation,
      preposition
    };
    const sharedData = getExitingSharedData(context);
    sharedData.exitingState = state;

  },
  
  /**
   * Report phase - generates events after successful execution
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    // Get stored state from execute phase
    const sharedData = getExitingSharedData(context);
    // Going out of a room: the move and arrival are going's to record.
    if (sharedData.delegation) return delegateReport(sharedData.delegation);
    const state = sharedData.exitingState as ExitingExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('if.event.exited', {
          messageId: `${context.action.id}.action_failed`,
          error: 'Missing state from execute phase'
        })
      ];
    }

    // Create the EXITED event with messageId for text rendering.
    // params carry EntityInfo for the formatter chain (ADR-158);
    // re-derive from the entity since it's available via context.world.
    const fromEntity = context.world.getEntity(state.fromLocation);
    const events: ISemanticEvent[] = [context.event('if.event.exited', {
      messageId: `${context.action.id}.exited`,
      params: { place: fromEntity ? nounPhraseFor(fromEntity) : { name: state.fromLocationName } },
      fromLocation: state.fromLocation,
      fromLocationName: state.fromLocationName,
      toLocation: state.toLocation,
      preposition: state.preposition
    } as ExitedEventData & { messageId: string; params: Record<string, any>; fromLocationName: string })];

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const events: ISemanticEvent[] = [context.event('if.event.exited', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      reason: result.error
    })];

    return events;
  },
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};