// packages/world-model/src/traits/edible/edibleBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { EdibleTrait, TasteQuality } from './edibleTrait';
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
    return (edible.servings ?? 1) > 0;
  }
  
  /**
   * Consume the item
   * @returns Events describing what happened
   */
  static consume(item: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);

    let currentServings = edible.servings ?? 1;
    const isLiquid = edible.liquid ?? false;

    if (currentServings <= 0) {
      return [
        createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: isLiquid ? 'drink' : 'eat',
            reason: ActionFailureReason.NOTHING_LEFT,
            customMessage: "There's nothing left."
          },
          { target: item.id, actor: actor.id }
        )
      ];
    }

    currentServings--;
    edible.servings = currentServings;
    
    const events: ISemanticEvent[] = [
      createEvent(
        isLiquid ? IFEvents.ITEM_DRUNK : IFEvents.ITEM_EATEN,
        {
          nutrition: edible.nutrition,
          servingsLeft: currentServings,
          customMessage: edible.consumeMessage,
          hasEffect: edible.hasEffect,
          effectDescription: edible.effectDescription
        },
        { target: item.id, actor: actor.id }
      )
    ];

    // If fully consumed, note that
    if (currentServings <= 0) {
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
    return (edible.servings ?? 1) <= 0;
  }
  
  /**
   * Check if this is a liquid
   */
  static isLiquid(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.liquid ?? false;
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
    return edible.servings ?? 1;
  }
  
  /**
   * Check if consuming has special effects
   */
  static hasEffect(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.hasEffect;
  }

  /**
   * Get taste quality
   */
  static getTaste(item: IFEntity): TasteQuality | undefined {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.taste;
  }

  /**
   * Get effects array
   */
  static getEffects(item: IFEntity): string[] | undefined {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.effects;
  }

  /**
   * Check if item has a specific effect
   */
  static hasSpecificEffect(item: IFEntity, effect: string): boolean {
    const effects = EdibleBehavior.getEffects(item);
    return effects?.includes(effect) ?? false;
  }

  /**
   * Check if eating satisfies hunger
   */
  static satisfiesHunger(item: IFEntity): boolean | undefined {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    return edible.satisfiesHunger;
  }
}
