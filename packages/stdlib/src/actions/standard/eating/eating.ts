/**
 * Eating action - consume edible items
 *
 * This action handles eating items that have the EDIBLE trait.
 * It validates that the item is edible and not a drink.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item is reachable, edible, not a drink, and not consumed
 * 2. execute: Delegate to EdibleBehavior for consumption
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 *
 * Supports implicit take - "eat apple" when apple is on ground will
 * automatically take it first.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  EdibleBehavior,
  ActionInterceptor,
  InterceptorSharedData,
  applyInterceptorReportResult
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EatenEventData } from './eating-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { nounPhraseFor } from '../../../utils';

/**
 * Shared data passed between execute and report phases
 */
interface EatingSharedData {
  itemId: string;
  itemName: string;
  messageId: string;
  eventData: EatenEventData;
  /** Interceptor on the eaten entity (ADR-118), resolved in validate */
  _interceptor?: ActionInterceptor;
  /** Shared data threaded through the interceptor's phases */
  _interceptorData?: InterceptorSharedData;
}

function getEatingSharedData(context: ActionContext): EatingSharedData {
  return context.sharedData as EatingSharedData;
}

export const eatingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EATING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE
  },

  // ADR-104: Implicit inference requirements
  targetRequirements: {
    trait: TraitType.EDIBLE,
    description: 'edible'
  },

  // Eating requires holding the food
  requiresHolding: true,

  requiredMessages: [
    'no_item',
    'not_visible',
    'not_reachable',
    'not_edible',
    'is_drink',
    'already_consumed',
    'eaten',
    'eaten_all',
    'eaten_some',
    'delicious',
    'tasty',
    'bland',
    'awful',
    'filling',
    'still_hungry',
    'poisonous'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;

    // Must have an item to eat
    if (!item) {
      return {
        valid: false,
        error: 'no_item'
      };
    }

    // Check for interceptor on the eaten entity (ADR-118)
    // Runs first so entity-specific blocks take priority (taking.ts pattern)
    const interceptorResult = context.world.getInterceptorForAction(item, IFActions.EATING);
    if (interceptorResult) {
      const { interceptor } = interceptorResult;
      const interceptorData: InterceptorSharedData = {};

      // Store interceptor in sharedData for later phases
      const sharedData = getEatingSharedData(context);
      sharedData._interceptor = interceptor;
      sharedData._interceptorData = interceptorData;

      // === PRE-VALIDATE HOOK ===
      if (interceptor.preValidate) {
        const result = interceptor.preValidate(item, context.world, context.player.id, interceptorData);
        if (result !== null && !result.valid) {
          return {
            valid: false,
            error: result.error,
            params: result.params
          };
        }
      }
    }

    // Check scope - must be able to reach the item
    const scopeCheck = context.requireScope(item, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if item is edible
    if (!item.has(TraitType.EDIBLE)) {
      return {
        valid: false,
        error: 'not_edible',
        params: { item: nounPhraseFor(item) }
      };
    }

    // Use behavior for liquid check (it's a drink, not food)
    if (EdibleBehavior.isLiquid(item)) {
      return {
        valid: false,
        error: 'is_drink',
        params: { item: nounPhraseFor(item) }
      };
    }

    // Use behavior for consumption check (servings > 0)
    if (!EdibleBehavior.canConsume(item)) {
      return {
        valid: false,
        error: 'already_consumed',
        params: { item: nounPhraseFor(item) }
      };
    }

    // Implicit take - "eat apple" when apple is on ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }

    // === POST-VALIDATE HOOK (ADR-118) ===
    if (interceptorResult) {
      const sharedData = getEatingSharedData(context);
      const interceptor = sharedData._interceptor;
      const interceptorData = sharedData._interceptorData ?? {};
      if (interceptor?.postValidate) {
        const result = interceptor.postValidate(item, context.world, context.player.id, interceptorData);
        if (result !== null && !result.valid) {
          return {
            valid: false,
            error: result.error,
            params: result.params
          };
        }
      }
    }

    return { valid: true };
  },

  /**
   * Execute the eat action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const actor = context.player;

    // Capture state before mutation for event data
    const servingsBefore = EdibleBehavior.getServings(item);
    const nutrition = EdibleBehavior.getNutrition(item);
    const taste = EdibleBehavior.getTaste(item);
    const effects = EdibleBehavior.getEffects(item);
    const satisfiesHunger = EdibleBehavior.satisfiesHunger(item);

    // Delegate to behavior for consumption (decrements servings)
    EdibleBehavior.consume(item, actor);

    // Calculate servings remaining after consumption
    const servingsRemaining = EdibleBehavior.getServings(item);

    // Build event data
    const eventData: EatenEventData = {
      item: item.id,
      itemName: item.name
    };

    // Add nutritional information if available
    if (nutrition !== undefined && nutrition !== 1) {
      eventData.nutrition = nutrition;
    }

    // Include servings info for multi-serving food (servingsBefore > 1)
    // Note: We can't detect if single-serving food was originally multi-serving
    // after all but one serving was consumed. This is a known limitation.
    if (servingsBefore > 1) {
      eventData.servings = servingsBefore;
      eventData.servingsRemaining = servingsRemaining;
    }

    // Add effects if present
    if (effects && effects.length > 0) {
      eventData.effects = effects;
    }

    // Add hunger satisfaction if set
    if (satisfiesHunger !== undefined) {
      eventData.satisfiesHunger = satisfiesHunger;
    }

    // Determine message based on properties
    let messageId = 'eaten';

    // Message priority: effects > taste > servings > hunger > default
    if (effects && effects.includes('poison')) {
      messageId = 'poisonous';
    } else if (taste) {
      switch (taste) {
        case 'delicious':
          messageId = 'delicious';
          break;
        case 'tasty':
        case 'good':
          messageId = 'tasty';
          break;
        case 'bland':
        case 'plain':
          messageId = 'bland';
          break;
        case 'awful':
        case 'terrible':
          messageId = 'awful';
          break;
      }
    } else if (servingsBefore > 1 && servingsRemaining > 0) {
      // Multi-serving food with servings remaining
      messageId = 'eaten_some';
    } else if (servingsBefore > 1 && servingsRemaining === 0) {
      // Finished all servings of multi-serving food (e.g., ate 2-serving food going to 0)
      messageId = 'eaten_all';
    } else if (satisfiesHunger === true) {
      messageId = 'filling';
    } else if (satisfiesHunger === false) {
      messageId = 'still_hungry';
    }

    // Store in sharedData for report phase
    const sharedData = getEatingSharedData(context);
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;
    sharedData.messageId = messageId;
    sharedData.eventData = eventData;

    // === POST-EXECUTE HOOK (ADR-118) ===
    // Entity-specific consequences after the standard consumption
    if (sharedData._interceptor?.postExecute) {
      sharedData._interceptor.postExecute(item, context.world, actor.id, sharedData._interceptorData ?? {});
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;

    // === ON-BLOCKED HOOK (ADR-118) ===
    const sharedData = getEatingSharedData(context);
    if (sharedData._interceptor?.onBlocked && item && result.error) {
      const customEffects = sharedData._interceptor.onBlocked(
        item, context.world, context.player.id, result.error, sharedData._interceptorData ?? {}
      );
      if (customEffects !== null) {
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

    return [context.event('if.event.eaten', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { item: item ? nounPhraseFor(item) : undefined, ...result.params },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name
    })];
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getEatingSharedData(context);

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Emit the EATEN event with messageId for text rendering.
    // params carry EntityInfo for the formatter chain (ADR-158).
    const item = context.command.directObject?.entity;
    events.push(context.event('if.event.eaten', {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: { item: item ? nounPhraseFor(item) : { name: sharedData.eventData?.itemName ?? '' } },
      ...sharedData.eventData
    }));

    // === POST-REPORT HOOK (ADR-118, ISSUE-074 semantics) ===
    // `override` replaces the if.event.eaten messageId; `emit` appends events.
    if (sharedData._interceptor?.postReport && item) {
      const reportResult = sharedData._interceptor.postReport(
        item, context.world, context.player.id, sharedData._interceptorData ?? {}
      );
      if (reportResult) {
        applyInterceptorReportResult(events, 'if.event.eaten', reportResult, context);
      }
    }

    return events;
  },

  group: "interaction"
};
