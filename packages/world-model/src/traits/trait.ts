/**
 * Base trait types and utilities
 * 
 * Traits are pure data structures with no behavior.
 * All logic belongs in behaviors.
 */

import { TraitType } from './trait-types';

/**
 * Base trait interface - just type identification
 */
export interface Trait {
  readonly type: TraitType | string;  // Allow string for extensibility
}

/**
 * Trait constructor type for registry
 */
export interface TraitConstructor<T extends Trait = Trait> {
  new (data?: any): T;
  readonly type: TraitType | string;
}

/**
 * Type guard to check if an object is a trait
 */
export function isTrait(obj: any): obj is Trait {
  return obj && typeof obj === 'object' && 'type' in obj && typeof obj.type === 'string';
}

/**
 * Helper type to extract trait data type from a trait class
 */
export type TraitData<T extends Trait> = Omit<T, keyof Trait>;

/**
 * Registry for trait constructors (optional use)
 */
export class TraitRegistry {
  private static traits = new Map<string, TraitConstructor>();
  
  static register(trait: TraitConstructor): void {
    if (this.traits.has(trait.type)) {
      throw new Error(`Trait type '${trait.type}' is already registered`);
    }
    this.traits.set(trait.type, trait);
  }
  
  static get(type: string): TraitConstructor | undefined {
    return this.traits.get(type);
  }
  
  static has(type: string): boolean {
    return this.traits.has(type);
  }
  
  static clear(): void {
    this.traits.clear();
  }
  
  static getAll(): Map<string, TraitConstructor> {
    return new Map(this.traits);
  }
}
