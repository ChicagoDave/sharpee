// packages/world-model/src/traits/scenery/sceneryBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { SceneryTrait } from './sceneryTrait';

/**
 * Behavior for scenery entities.
 * Handles logic related to fixed-in-place objects.
 */
export class SceneryBehavior {
  static readonly requiredTraits = [TraitType.SCENERY];
  
  /**
   * Get the reason why this item can't be taken
   */
  static getUntakeableReason(entity: IFEntity): string {
    const trait = entity.get(TraitType.SCENERY) as SceneryTrait;
    if (!trait) return 'not_scenery';
    
    // If there's a custom message, return a marker for it
    if (trait.cantTakeMessage) {
      return 'custom_message';
    }
    
    // Default reason
    return 'fixed_in_place';
  }
  
  /**
   * Get the custom can't-take message if any
   */
  static getCantTakeMessage(entity: IFEntity): string | undefined {
    const trait = entity.get(TraitType.SCENERY) as SceneryTrait;
    return trait?.cantTakeMessage;
  }
  
  /**
   * Check if this scenery should be mentioned in room descriptions
   */
  static isMentioned(entity: IFEntity): boolean {
    const trait = entity.get(TraitType.SCENERY) as SceneryTrait;
    return trait ? trait.mentioned : true;
  }
}