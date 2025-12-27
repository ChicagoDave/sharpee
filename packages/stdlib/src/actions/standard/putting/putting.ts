/**
 * Putting action - put objects in containers or on supporters
 *
 * This action handles putting objects into containers or onto supporters.
 * It determines the appropriate preposition based on the target's traits.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and destination exist and are compatible
 * 2. execute: Delegate to ContainerBehavior or SupporterBehavior
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with put data
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ContainerBehavior, SupporterBehavior, OpenableBehavior, IAddItemResult, IAddItemToSupporterResult } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { IFActions } from '../../constants';
import { buildEventData } from '../../data-builder-types';
import { putDataConfig } from './putting-data';
import { PuttingMessages } from './putting-messages';

/**
 * Shared data passed between execute and report phases
 */
interface PuttingSharedData {
  targetPreposition?: 'in' | 'on';
  putResult?: IAddItemResult | IAddItemToSupporterResult;
}

function getPuttingSharedData(context: ActionContext): PuttingSharedData {
  return context.sharedData as PuttingSharedData;
}

export const puttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUTTING,
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_container',
    'not_surface',
    'container_closed',
    'already_there',
    'put_in',
    'put_on',
    'cant_put_in_itself',
    'cant_put_on_itself',
    'no_room',
    'no_space'
  ],
  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;

    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: PuttingMessages.NO_TARGET
      };
    }

    // Validate we have a destination
    if (!target) {
      return {
        valid: false,
        error: PuttingMessages.NO_DESTINATION,
        params: { item: item.name }
      };
    }

    // Prevent putting something inside/on itself
    if (item.id === target.id) {
      const messageId = preposition === 'on' ? PuttingMessages.CANT_PUT_ON_ITSELF : PuttingMessages.CANT_PUT_IN_ITSELF;
      return {
        valid: false,
        error: messageId,
        params: { item: item.name }
      };
    }

    // Check if item is already in/on target
    if (context.world.getLocation(item.id) === target.id) {
      const relation = target.has(TraitType.SUPPORTER) ? 'on' : 'in';
      return {
        valid: false,
        error: PuttingMessages.ALREADY_THERE,
        params: {
          item: item.name,
          relation: relation,
          destination: target.name
        }
      };
    }

    // Determine if target is a container or supporter
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);

    // Determine the appropriate action based on preposition and target type
    let targetPreposition: 'in' | 'on';

    if (preposition) {
      // User specified a preposition
      if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
        targetPreposition = 'in';
      } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
        targetPreposition = 'on';
      } else {
        // Mismatched preposition
        if (preposition === 'in' || preposition === 'into' || preposition === 'inside') {
          return {
            valid: false,
            error: PuttingMessages.NOT_CONTAINER,
            params: { destination: target.name }
          };
        } else {
          return {
            valid: false,
            error: PuttingMessages.NOT_SURFACE,
            params: { destination: target.name }
          };
        }
      }
    } else {
      // Auto-determine based on target type (prefer container over supporter)
      if (isContainer) {
        targetPreposition = 'in';
      } else if (isSupporter) {
        targetPreposition = 'on';
      } else {
        return {
          valid: false,
          error: PuttingMessages.NOT_CONTAINER,
          params: { destination: target.name }
        };
      }
    }

    // Container-specific checks using ContainerBehavior
    if (targetPreposition === 'in') {
      // Check if container is open
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return {
          valid: false,
          error: PuttingMessages.CONTAINER_CLOSED,
          params: { container: target.name }
        };
      }

      // Check capacity using ContainerBehavior
      if (!ContainerBehavior.canAccept(target, item, context.world)) {
        return {
          valid: false,
          error: PuttingMessages.NO_ROOM,
          params: { container: target.name }
        };
      }
    }

    // Supporter-specific checks using SupporterBehavior
    if (targetPreposition === 'on') {
      if (!SupporterBehavior.canAccept(target, item, context.world)) {
        return {
          valid: false,
          error: PuttingMessages.NO_SPACE,
          params: { surface: target.name }
        };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const target = context.command.indirectObject!.entity!; // Safe because validate ensures it exists
    const preposition = context.command.parsed.structure.preposition?.text;

    // Determine the appropriate action based on preposition and target type
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);
    let targetPreposition: 'in' | 'on';

    if (preposition) {
      // User specified a preposition
      if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
        targetPreposition = 'in';
      } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
        targetPreposition = 'on';
      } else {
        // This should not happen due to validation, but handle gracefully
        targetPreposition = isContainer ? 'in' : 'on';
      }
    } else {
      // Auto-determine based on target type (prefer container over supporter)
      targetPreposition = isContainer ? 'in' : 'on';
    }

    // Store data for report phase using sharedData
    const sharedData = getPuttingSharedData(context);
    sharedData.targetPreposition = targetPreposition;

    // Delegate to appropriate behavior for validation
    if (targetPreposition === 'in') {
      const result: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
      sharedData.putResult = result;
    } else {
      // targetPreposition === 'on'
      const result: IAddItemToSupporterResult = SupporterBehavior.addItem(target, item, context.world);
      sharedData.putResult = result;
    }

    // Actually move the item to the target (behaviors validate, actions mutate)
    context.world.moveEntity(item.id, target.id);
  },

  /**
   * Report events after successful putting
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject!.entity!;
    const sharedData = getPuttingSharedData(context);
    const targetPreposition = sharedData.targetPreposition as 'in' | 'on';
    const result = sharedData.putResult as IAddItemResult | IAddItemToSupporterResult;

    const events: ISemanticEvent[] = [];

    if (targetPreposition === 'in') {
      // Success - create events with snapshots
      events.push(context.event('if.event.put_in', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'in' as const,
        // Add atomic event snapshots
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));

      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: PuttingMessages.PUT_IN,
        params: { item: item.name, container: target.name }
      }));
    } else {
      // targetPreposition === 'on'
      // Success - create events with snapshots
      events.push(context.event('if.event.put_on', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'on' as const,
        // Add atomic event snapshots
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));

      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: PuttingMessages.PUT_ON,
        params: { item: item.name, surface: target.name }
      }));
    }

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: item?.name,
        destination: target?.name
      }
    })];
  }
};
