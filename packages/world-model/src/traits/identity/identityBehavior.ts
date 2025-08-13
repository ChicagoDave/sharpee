// packages/world-model/src/traits/identity/identityBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { IdentityTrait } from './identityTrait';

/**
 * Behavior for entities with identity.
 * 
 * Handles name formatting, visibility, and validation of identity data.
 */
export class IdentityBehavior extends Behavior {
  static requiredTraits = [TraitType.IDENTITY];
  
  /**
   * Check if identity data is valid for game use
   * @throws Error if identity data is invalid
   */
  static validateIdentity(entity: IFEntity): void {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    
    if (!identity.name || !identity.name.trim()) {
      throw new Error(`Entity ${entity.id} has no name`);
    }
    
    if (identity.properName && identity.article) {
      // Proper names shouldn't have articles
      identity.article = '';
    }
    
    if (identity.weight !== undefined && identity.weight < 0) {
      throw new Error(`Entity ${entity.id} has negative weight`);
    }
    
    if (identity.volume !== undefined && identity.volume < 0) {
      throw new Error(`Entity ${entity.id} has negative volume`);
    }
    
    const validSizes = ['tiny', 'small', 'medium', 'large', 'huge'];
    if (identity.size !== undefined && !validSizes.includes(identity.size)) {
      throw new Error(`Entity ${entity.id} has invalid size: ${identity.size}`);
    }
  }
  
  /**
   * Format an entity's name for display with proper article
   */
  static formatName(entity: IFEntity, options?: {
    capitalize?: boolean;
    definite?: boolean;
  }): string {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    
    let name: string;
    
    if (identity.properName || !identity.article) {
      name = identity.name;
    } else {
      name = `${identity.article} ${identity.name}`;
    }
    
    // Handle definite article request
    if (options?.definite && !identity.properName && identity.article !== 'the') {
      name = `the ${identity.name}`;
    }
    
    // Handle capitalization
    if (options?.capitalize) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    return name;
  }
  
  /**
   * Get a possessive form of the entity's name
   */
  static getPossessiveName(entity: IFEntity): string {
    const name = IdentityBehavior.formatName(entity);
    
    // Handle names ending in 's'
    if (name.endsWith('s')) {
      return `${name}'`;
    }
    
    return `${name}'s`;
  }
  
  /**
   * Check if a given name matches this entity
   */
  static matchesName(entity: IFEntity, name: string): boolean {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    const lowerName = name.toLowerCase();
    
    // Check main name
    if (identity.name.toLowerCase() === lowerName) return true;
    
    // Check aliases
    return identity.aliases.some((alias: string) => alias.toLowerCase() === lowerName);
  }
  
  /**
   * Check if an entity should be visible in normal circumstances
   */
  static isConcealed(entity: IFEntity): boolean {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    return identity.concealed;
  }
  
  /**
   * Set whether an entity is concealed
   */
  static setConcealed(entity: IFEntity, concealed: boolean): void {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    identity.concealed = concealed;
  }
  
  /**
   * Reveal a concealed entity (convenience method)
   */
  static reveal(entity: IFEntity): void {
    IdentityBehavior.setConcealed(entity, false);
  }
  
  /**
   * Conceal an entity (convenience method)
   */
  static conceal(entity: IFEntity): void {
    IdentityBehavior.setConcealed(entity, true);
  }
  
  /**
   * Get the weight of the entity (not including contents)
   */
  static getWeight(entity: IFEntity): number {
    if (!entity.has(TraitType.IDENTITY)) {
      return 0; // Default weight for items without identity trait
    }
    const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;
    return identity?.weight || 0;
  }
  
  /**
   * Get the volume of the entity
   */
  static getVolume(entity: IFEntity): number {
    if (!entity.has(TraitType.IDENTITY)) {
      return 0; // Default volume for items without identity trait
    }
    const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;
    return identity?.volume || 0;
  }
  
  /**
   * Get the size category of the entity
   */
  static getSize(entity: IFEntity): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | undefined {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    return identity.size;
  }
  
  /**
   * Get total weight including contents (for containers/supporters)
   * Note: This method needs a world context to access contents
   */
  static getTotalWeight(entity: IFEntity, getContents?: (entityId: string) => IFEntity[]): number {
    const identity = IdentityBehavior.require<IdentityTrait>(entity, TraitType.IDENTITY);
    let weight = identity.weight || 0;
    
    // Add weight of contents if this is a container/supporter and we have a way to get contents
    if (getContents && (entity.has(TraitType.CONTAINER) || entity.has(TraitType.SUPPORTER))) {
      const contents = getContents(entity.id);
      for (const item of contents) {
        weight += IdentityBehavior.getTotalWeight(item, getContents);
      }
    }
    
    return weight;
  }
}
