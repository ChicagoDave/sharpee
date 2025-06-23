// packages/world-model/src/traits/edible/edibleTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface EdibleData {
  /** Nutrition value (arbitrary units) */
  nutrition?: number;
  
  /** Number of bites/servings remaining */
  servings?: number;
  
  /** Whether this is a liquid (drunk vs eaten) */
  liquid?: boolean;
  
  /** Custom message when eating/drinking */
  consumeMessage?: string;
  
  /** What remains after consumption (entity type to create) */
  remainsType?: string;
  
  /** Whether consuming this has special effects */
  hasEffect?: boolean;
  
  /** Effect description if hasEffect is true */
  effectDescription?: string;
  
  /** Weight of the item (since we removed PortableTrait) */
  weight?: number;
  
  /** Bulk of the item */
  bulk?: number;
}

/**
 * Edible trait indicates an entity can be eaten or drunk.
 * 
 * This trait contains only data - all consumption logic
 * is in EdibleBehavior.
 */
export class EdibleTrait implements Trait, EdibleData {
  static readonly type = TraitType.EDIBLE;
  readonly type = TraitType.EDIBLE;
  
  // EdibleData properties
  nutrition: number;
  servings: number;
  liquid: boolean;
  consumeMessage?: string;
  remainsType?: string;
  hasEffect: boolean;
  effectDescription?: string;
  weight: number;
  bulk: number;
  
  constructor(data: EdibleData = {}) {
    // Set defaults and merge with provided data
    this.nutrition = data.nutrition ?? 1;
    this.servings = data.servings ?? 1;
    this.liquid = data.liquid ?? false;
    this.consumeMessage = data.consumeMessage;
    this.remainsType = data.remainsType;
    this.hasEffect = data.hasEffect ?? false;
    this.effectDescription = data.effectDescription;
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;
  }
}
