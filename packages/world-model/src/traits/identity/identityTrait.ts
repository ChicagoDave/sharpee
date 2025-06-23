// packages/world-model/src/traits/identity/identityTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Identity trait provides basic naming and description for entities.
 * This is one of the most fundamental traits in IF.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by IdentityBehavior.
 */
export class IdentityTrait implements Trait {
  static readonly type = TraitType.IDENTITY;
  readonly type = TraitType.IDENTITY;
  
  /** Primary name of the entity */
  name: string = '';
  
  /** Full description shown when examining */
  description: string = '';
  
  /** Alternative names/aliases the entity can be referred to by */
  aliases: string[] = [];
  
  /** Brief description shown in room listings */
  brief?: string;
  
  /** Whether the entity has a proper name (like "John" vs "a man") */
  properName: boolean = false;
  
  /** Article to use with the name ("a", "an", "the", "some", or empty for proper names) */
  article: string = 'a';
  
  /** Whether this entity is concealed from normal view */
  concealed: boolean = false;
  
  /** Weight of the object (undefined = negligible/not tracked) */
  weight?: number;
  
  /** Volume of the object (undefined = negligible/not tracked) */
  volume?: number;
  
  /** Size category of the object */
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  
  constructor(data?: Partial<IdentityTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
