// packages/world-model/src/traits/light-source/lightSourceTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * LightSource trait allows entities to provide illumination.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by LightSourceBehavior.
 */
export class LightSourceTrait implements Trait {
  static readonly type = TraitType.LIGHT_SOURCE;
  readonly type = TraitType.LIGHT_SOURCE;
  
  /** Light output level (1-10) */
  brightness: number = 5;
  
  /** Whether the light is currently providing illumination */
  isLit: boolean = false;
  
  /** Optional fuel/battery remaining (undefined = infinite) */
  fuelRemaining?: number;
  
  /** Maximum fuel capacity (for refillable lights) */
  maxFuel?: number;
  
  /** Fuel consumption rate per turn (when lit) */
  fuelConsumptionRate?: number;
  
  constructor(data?: Partial<LightSourceTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
