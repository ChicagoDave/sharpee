// packages/world-model/src/traits/edible/edibleTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/** Taste quality values */
export type TasteQuality = 'delicious' | 'tasty' | 'good' | 'plain' | 'bland' | 'awful' | 'terrible';

export interface IEdibleData {
  /** Nutrition value (arbitrary units) */
  nutrition?: number;

  /** Number of bites/servings remaining (alias: portions) */
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

  /** Weight of the item */
  weight?: number;

  /** Bulk of the item */
  bulk?: number;

  // Extended properties for richer food system

  /** Taste quality of the food */
  taste?: TasteQuality;

  /** Array of effect names (e.g., 'poison', 'heal', 'sleep') */
  effects?: string[];

  /** Whether eating this satisfies hunger */
  satisfiesHunger?: boolean;
}

/**
 * Edible trait indicates an entity can be eaten or drunk.
 * 
 * This trait contains only data - all consumption logic
 * is in EdibleBehavior.
 */
export class EdibleTrait implements ITrait, IEdibleData {
  static readonly type = TraitType.EDIBLE;
  readonly type = TraitType.EDIBLE;

  // Core EdibleData properties
  nutrition: number;
  servings: number;
  liquid: boolean;
  consumeMessage?: string;
  remainsType?: string;
  hasEffect: boolean;
  effectDescription?: string;
  weight: number;
  bulk: number;

  // Extended properties
  taste?: TasteQuality;
  effects?: string[];
  satisfiesHunger?: boolean;

  constructor(data: IEdibleData & { portions?: number; isDrink?: boolean; consumed?: boolean } = {}) {
    // Set defaults and merge with provided data
    // Support both 'servings' and legacy 'portions' naming
    // If consumed is true, set servings to 0
    const baseServings = data.servings ?? data.portions ?? 1;
    this.servings = data.consumed ? 0 : baseServings;

    this.nutrition = data.nutrition ?? 1;
    // Support both 'liquid' and legacy 'isDrink' naming
    this.liquid = data.liquid ?? data.isDrink ?? false;
    this.consumeMessage = data.consumeMessage;
    this.remainsType = data.remainsType;
    this.hasEffect = data.hasEffect ?? (data.effects && data.effects.length > 0) ?? false;
    this.effectDescription = data.effectDescription;
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;

    // Extended properties
    this.taste = data.taste;
    this.effects = data.effects;
    this.satisfiesHunger = data.satisfiesHunger;
  }
}
