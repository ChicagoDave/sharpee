// packages/world-model/src/traits/light-source/lightSourceBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { LightSourceTrait } from './lightSourceTrait';

/**
 * Behavior for light source entities.
 * 
 * Handles the logic for entities that can provide illumination.
 */
export class LightSourceBehavior extends Behavior {
  static requiredTraits = [TraitType.LIGHT_SOURCE];
  
  /**
   * Turn on the light source
   * @returns true if successfully lit, false if out of fuel
   */
  static light(source: IFEntity): boolean {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    
    // Check if there's fuel
    if (trait.fuelRemaining !== undefined && trait.fuelRemaining <= 0) {
      return false;
    }
    
    trait.isLit = true;
    return true;
  }
  
  /**
   * Turn off the light source
   */
  static extinguish(source: IFEntity): void {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    trait.isLit = false;
  }
  
  /**
   * Check if the light source is currently lit
   */
  static isLit(source: IFEntity): boolean {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    return trait.isLit;
  }
  
  /**
   * Get the brightness level
   */
  static getBrightness(source: IFEntity): number {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    return trait.brightness;
  }
  
  /**
   * Get remaining fuel
   * @returns Fuel amount or undefined if unlimited
   */
  static getFuelRemaining(source: IFEntity): number | undefined {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    return trait.fuelRemaining;
  }
  
  /**
   * Check if the light source has fuel
   */
  static hasFuel(source: IFEntity): boolean {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    return trait.fuelRemaining === undefined || trait.fuelRemaining > 0;
  }
  
  /**
   * Consume fuel (typically called each turn the light is on)
   * @returns true if fuel was consumed, false if out of fuel
   */
  static consumeFuel(source: IFEntity, amount?: number): boolean {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    
    // No fuel tracking
    if (trait.fuelRemaining === undefined) {
      return true;
    }
    
    // Determine consumption amount
    const consumeAmount = amount ?? trait.fuelConsumptionRate ?? 1;
    
    // Check if enough fuel
    if (trait.fuelRemaining < consumeAmount) {
      trait.fuelRemaining = 0;
      trait.isLit = false; // Auto-extinguish when out of fuel
      return false;
    }
    
    trait.fuelRemaining -= consumeAmount;
    return true;
  }
  
  /**
   * Refuel the light source
   * @param amount Amount to add, or fill to max if not specified
   */
  static refuel(source: IFEntity, amount?: number): void {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    
    // Can't refuel unlimited lights
    if (trait.fuelRemaining === undefined) {
      return;
    }
    
    if (amount === undefined && trait.maxFuel !== undefined) {
      // Fill to max
      trait.fuelRemaining = trait.maxFuel;
    } else if (amount !== undefined) {
      // Add specific amount
      trait.fuelRemaining = trait.fuelRemaining + amount;
      
      // Cap at max if defined
      if (trait.maxFuel !== undefined && trait.fuelRemaining > trait.maxFuel) {
        trait.fuelRemaining = trait.maxFuel;
      }
    }
  }
  
  /**
   * Get fuel percentage remaining
   * @returns 0-100, or undefined if unlimited fuel
   */
  static getFuelPercentage(source: IFEntity): number | undefined {
    const trait = LightSourceBehavior.require<LightSourceTrait>(source, TraitType.LIGHT_SOURCE);
    
    if (trait.fuelRemaining === undefined || trait.maxFuel === undefined) {
      return undefined;
    }
    
    return Math.round((trait.fuelRemaining / trait.maxFuel) * 100);
  }
}
