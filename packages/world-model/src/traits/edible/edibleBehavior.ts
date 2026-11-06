/**
 * edibleBehavior.ts — the rules for a thing that is eaten or drunk: whether
 * it can be consumed, consuming one serving, and taking it out of the world
 * once nothing is left of it. The trait holds the data; every change to it,
 * and the removal, is made here.
 *
 * Public interface: EdibleBehavior (`canConsume`, `consume`,
 * `removeIfFinished`, `isEmpty`, and the read accessors).
 * Owner context: @sharpee/world-model, the edible trait.
 *
 * References:
 * - ADR-213 — `world.removeEntity` is the removed-from-play seam.
 */

import { Behavior } from '../../behaviors/behavior.js';
import { IFEntity } from '../../entities/if-entity.js';
import type { WorldModel } from '../../world/WorldModel.js';
import { TraitType } from '../trait-types.js';
import { EdibleTrait, TasteQuality } from './edibleTrait.js';
import { type ISemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events.js';
import { ActionFailureReason } from '../../constants/action-failures.js';

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
            reason: 'consumed'
          },
          { target: item.id, actor: actor.id }
        )
      );
    }
    
    return events;
  }
  
  /**
   * Take a finished item out of the world: one with no serving left is
   * removed, so it is gone from whoever held it and from every lookup by id.
   * An item with a serving left is untouched.
   *
   * The caller keeps its reference to the entity, whose traits stay readable
   * after the removal, so a report built from that reference still names it.
   *
   * @param item the edible item, after a consume
   * @param world the world the item is in
   * @returns true when the item was removed, false when a serving remains
   * @throws if the item has no edible trait
   */
  static removeIfFinished(item: IFEntity, world: WorldModel): boolean {
    if (!EdibleBehavior.isEmpty(item)) return false;
    world.removeEntity(item.id);
    return true;
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
