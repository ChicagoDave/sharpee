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
export interface ITrait {
  readonly type: TraitType | string;  // Allow string for extensibility
}

/**
 * Trait constructor type for registry
 */
export interface ITraitConstructor<T extends ITrait = ITrait> {
  new (data?: any): T;
  readonly type: TraitType | string;
  /** Action IDs this trait handles via capability dispatch (ADR-090) */
  readonly capabilities?: readonly string[];
  /** Action IDs this trait intercepts via interceptor hooks (ADR-118) */
  readonly interceptors?: readonly string[];
}

/**
 * Type guard to check if an object is a trait
 */
export function isTrait(obj: any): obj is ITrait {
  return obj && typeof obj === 'object' && 'type' in obj && typeof obj.type === 'string';
}

/**
 * Helper type to extract trait data type from a trait class
 */
export type TraitData<T extends ITrait> = Omit<T, keyof ITrait>;

/**
 * Registry for trait constructors (optional use)
 */
export class TraitRegistry {
  private static traits = new Map<string, ITraitConstructor>();
  
  static register(trait: ITraitConstructor): void {
    if (this.traits.has(trait.type)) {
      throw new Error(`Trait type '${trait.type}' is already registered`);
    }
    this.traits.set(trait.type, trait);
  }
  
  static get(type: string): ITraitConstructor | undefined {
    return this.traits.get(type);
  }
  
  static has(type: string): boolean {
    return this.traits.has(type);
  }
  
  static clear(): void {
    this.traits.clear();
  }
  
  static getAll(): Map<string, ITraitConstructor> {
    return new Map(this.traits);
  }
}
