/**
 * Emptying action — empty a container (ADR-370 D6).
 *
 * `empty <x>` moves everything an open, non-empty container holds to the
 * actor's current location; `empty <x> into <y>` moves it into a container
 * or onto a supporter, item by item in listing order, through the same
 * acceptance check `putting` uses (`canAccept`, which reads `holds <n>`),
 * stopping at the first item the destination will not take. A partial empty
 * is a success with a tail — the moved items stay moved and the first
 * unmoved one is named — never a refusal that undoes the moves.
 *
 * Uses four-phase pattern:
 * 1. validate: source is a reachable, open, non-empty container; destination
 *    (if any) is an open container or a supporter and not the source
 * 2. execute: move the items (the mutation), recording moved and unmoved
 * 3. blocked: a refusal from validate, or a veto from the executor
 * 4. report: emits if.event.emptied with the message id, plus a
 *    `destination_full` line when the destination stopped accepting
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `emptyingLifecycle`: the emptied container is the
 * one consultable entity.
 *
 * Public interface: emptyingAction, emptyingLifecycle.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  TraitType,
  OpenableBehavior,
  ContainerBehavior,
  SupporterBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { phraseListFor } from '../searching-helpers.js';
import { EmptiedEventData } from './emptying-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the emptied container is the only
 * consultable entity of an EMPTY command.
 */
export const emptyingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.EMPTYING,
  reportEventType: 'if.event.emptied',
  blockedEventType: 'if.event.empty_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.EMPTYING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/** Shared data passed between execute and report phases. */
interface EmptyingSharedData {
  eventData?: EmptiedEventData;
  moved?: IFEntity[];
  firstUnmoved?: IFEntity;
}

function getEmptyingSharedData(context: ActionContext): EmptyingSharedData {
  return context.sharedData as EmptyingSharedData;
}

/** A closed openable refuses as a source or a destination. */
function isClosed(entity: IFEntity): boolean {
  return entity.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(entity);
}

/**
 * Whether the destination will take one more item: a container through
 * `ContainerBehavior.canAccept`, a supporter through `SupporterBehavior.canAccept`,
 * the actor's location always.
 */
function accepts(destination: IFEntity, item: IFEntity, context: ActionContext, ontoFloor: boolean): boolean {
  if (ontoFloor) return true;
  if (destination.has(TraitType.CONTAINER)) {
    return ContainerBehavior.canAccept(destination, item, context.world);
  }
  return SupporterBehavior.canAccept(destination, item, context.world);
}

export const emptyingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EMPTYING,

  defaultScope: {
    target: ScopeLevel.REACHABLE,
    destination: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_a_container',
    'container_closed',
    'already_empty',
    'into_itself',
    'cant_empty_into',
    'destination_closed',
    'destination_full',
    'emptied_here',
    'emptied_into'
  ],

  group: "object_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE,
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const source = context.command.directObject?.entity;
    if (!source) {
      return { valid: false, error: 'no_target' };
    }
    const target = { target: nounPhraseFor(source) };
    if (!source.has(TraitType.CONTAINER)) {
      return { valid: false, error: 'not_a_container', params: target };
    }
    if (isClosed(source)) {
      return { valid: false, error: 'container_closed', params: target };
    }
    if (context.world.getContents(source.id).length === 0) {
      return { valid: false, error: 'already_empty', params: target };
    }

    const destination = context.command.indirectObject?.entity;
    if (destination) {
      const params = { ...target, destination: nounPhraseFor(destination) };
      if (destination.id === source.id) {
        return { valid: false, error: 'into_itself', params };
      }
      if (!destination.has(TraitType.CONTAINER) && !destination.has(TraitType.SUPPORTER)) {
        return { valid: false, error: 'cant_empty_into', params };
      }
      if (destination.has(TraitType.CONTAINER) && isClosed(destination)) {
        return { valid: false, error: 'destination_closed', params };
      }
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const source = context.command.directObject!.entity!;
    const named = context.command.indirectObject?.entity;
    const ontoFloor = !named;
    const destination = named ?? context.currentLocation;
    const sharedData = getEmptyingSharedData(context);

    const moved: IFEntity[] = [];
    const unmoved: IFEntity[] = [];
    let firstUnmoved: IFEntity | undefined;

    // Listing order; stop at the first item the destination will not take.
    for (const item of context.world.getContents(source.id)) {
      if (firstUnmoved || !accepts(destination, item, context, ontoFloor)) {
        firstUnmoved = firstUnmoved ?? item;
        unmoved.push(item);
        continue;
      }
      // A container or supporter destination moves the item itself
      // (behaviors own mutations); the floor is the room, which has no
      // placing behavior.
      const placed = ontoFloor
        ? context.world.moveEntity(item.id, destination.id)
        : destination.has(TraitType.CONTAINER)
          ? ContainerBehavior.addItem(destination, item, context.world).success
          : SupporterBehavior.addItem(destination, item, context.world).success;
      if (!placed) {
        firstUnmoved = item;
        unmoved.push(item);
        continue;
      }
      moved.push(item);
    }

    sharedData.moved = moved;
    sharedData.firstUnmoved = firstUnmoved;
    sharedData.eventData = {
      source: source.id,
      sourceName: source.name,
      destination: destination.id,
      destinationName: destination.name,
      ontoFloor,
      movedIds: moved.map((item) => item.id),
      unmovedIds: unmoved.map((item) => item.id)
    };
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const source = context.command.directObject?.entity;
    return [context.event('if.event.empty_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        target: source ? nounPhraseFor(source) : undefined,
        ...result.params
      },
      reason: result.error,
      targetId: source?.id,
      targetName: source?.name
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const source = context.command.directObject!.entity!;
    const named = context.command.indirectObject?.entity;
    const sharedData = getEmptyingSharedData(context);
    const moved = sharedData.moved ?? [];
    const events: ISemanticEvent[] = [];

    if (moved.length > 0) {
      const params: Record<string, unknown> = {
        target: nounPhraseFor(source),
        items: phraseListFor(moved)
      };
      if (named) params.destination = nounPhraseFor(named);
      events.push(context.event('if.event.emptied', {
        messageId: `${context.action.id}.${named ? 'emptied_into' : 'emptied_here'}`,
        params,
        ...sharedData.eventData
      }));
    }

    // The tail: the destination stopped accepting at this item.
    if (sharedData.firstUnmoved && named) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: `${context.action.id}.destination_full`,
        params: {
          destination: nounPhraseFor(named),
          item: nounPhraseFor(sharedData.firstUnmoved)
        }
      }));
    }

    return events;
  }
};
