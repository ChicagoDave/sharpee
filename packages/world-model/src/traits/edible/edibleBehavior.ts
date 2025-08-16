// packages/world-model/src/traits/edible/edibleBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { EdibleTrait } from './edibleTrait';
import { ISemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failures';

/**
 * Behavior for edible entities.
 * 
 * Handles the logic for consuming food and drink.
 */
export class EdibleBehavior extends Behavior {
  static requiredTraits = [TraitType.EDIBLE];
  
  /**
   * Check if an item can be consumed
   */
  static canConsume(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.servings > 0;
  }
  
  /**
   * Consume the item
   * @returns Events describing what happened
   */
  static consume(item: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    
    if (edible.servings <= 0) {
      return [
        createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: edible.liquid ? 'drink' : 'eat',
            reason: ActionFailureReason.NOTHING_LEFT,
            customMessage: "There's nothing left."
          },
          { target: item.id, actor: actor.id }
        )
      ];
    }
    
    // Consume one serving
    edible.servings--;
    
    const events: ISemanticEvent[] = [
      createEvent(
        edible.liquid ? IFEvents.ITEM_DRUNK : IFEvents.ITEM_EATEN,
        {
          nutrition: edible.nutrition,
          servingsLeft: edible.servings,
          customMessage: edible.consumeMessage,
          hasEffect: edible.hasEffect,
          effectDescription: edible.effectDescription
        },
        { target: item.id, actor: actor.id }
      )
    ];
    
    // If fully consumed, note that
    if (edible.servings <= 0) {
      events.push(
        createEvent(
          IFEvents.ITEM_DESTROYED,
          {
            reason: 'consumed',
            remainsType: edible.remainsType
          },
          { target: item.id, actor: actor.id }
        )
      );
    }
    
    return events;
  }
  
  /**
   * Check if item is fully consumed
   */
  static isEmpty(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.servings <= 0;
  }
  
  /**
   * Check if this is a liquid
   */
  static isLiquid(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.liquid;
  }
  
  /**
   * Get nutrition value
   */
  static getNutrition(item: IFEntity): number {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.nutrition;
  }
  
  /**
   * Get remaining servings
   */
  static getServings(item: IFEntity): number {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.servings;
  }
  
  /**
   * Check if consuming has special effects
   */
  static hasEffect(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.hasEffect;
  }
}
