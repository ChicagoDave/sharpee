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
   * Supports both 'servings' (canonical) and 'consumed' (legacy) property names
   */
  static canConsume(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    // Check legacy 'consumed' flag first
    if ((edible as any).consumed === true) {
      return false;
    }
    // Then check servings (default to 1 if undefined)
    const servings = edible.servings ?? (edible as any).portions ?? 1;
    return servings > 0;
  }
  
  /**
   * Consume the item
   * @returns Events describing what happened
   * Supports both 'servings' (canonical) and 'portions' (legacy) property names
   */
  static consume(item: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);

    // Get current servings (supporting legacy properties)
    let currentServings = edible.servings ?? (edible as any).portions ?? 1;
    const isLiquid = edible.liquid || (edible as any).isDrink || false;

    if (currentServings <= 0 || (edible as any).consumed === true) {
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

    // Consume one serving - update both properties for compatibility
    currentServings--;
    edible.servings = currentServings;
    if ((edible as any).portions !== undefined) {
      (edible as any).portions = currentServings;
    }
    // Mark as consumed if no servings left
    if (currentServings <= 0) {
      (edible as any).consumed = true;
    }
    
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
   * Supports both 'servings' (canonical) and 'consumed' (legacy) property names
   */
  static isEmpty(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    // Check legacy 'consumed' flag first
    if ((edible as any).consumed === true) {
      return true;
    }
    // Then check servings
    const servings = edible.servings ?? (edible as any).portions ?? 1;
    return servings <= 0;
  }
  
  /**
   * Check if this is a liquid
   * Supports both 'liquid' (canonical) and 'isDrink' (legacy) property names
   */
  static isLiquid(item: IFEntity): boolean {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    // Support both property names for backward compatibility
    return edible.liquid || (edible as any).isDrink || false;
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
   * Supports both 'servings' (canonical) and 'portions' (legacy) property names
   */
  static getServings(item: IFEntity): number {
    const edible = EdibleBehavior.require<EdibleTrait>(item, TraitType.EDIBLE);
    // Check legacy 'consumed' flag - if consumed, return 0
    if ((edible as any).consumed === true) {
      return 0;
    }
    return edible.servings ?? (edible as any).portions ?? 1;
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
