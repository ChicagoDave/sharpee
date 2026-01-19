// packages/world-model/src/traits/identity/identityTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Identity trait provides basic naming and description for entities.
 * This is one of the most fundamental traits in IF.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by IdentityBehavior.
 */
export class IdentityTrait implements ITrait {
  static readonly type = TraitType.IDENTITY;
  readonly type = TraitType.IDENTITY;
  
  /** Primary name of the entity */
  name = '';
  
  /** Full description shown when examining */
  description = '';

  /**
   * Message ID for localized name (ADR-107).
   * If set, the language layer resolves this ID to the actual name text.
   * Takes precedence over literal `name` if both are set.
   */
  nameId?: string;

  /**
   * Message ID for localized description (ADR-107).
   * If set, the language layer resolves this ID to the actual description text.
   * Takes precedence over literal `description` if both are set.
   */
  descriptionId?: string;

  /** Alternative names/aliases the entity can be referred to by */
  aliases: string[] = [];
  
  /** Brief description shown in room listings */
  brief?: string;
  
  /** Whether the entity has a proper name (like "John" vs "a man") */
  properName = false;
  
  /** Article to use with the name ("a", "an", "the", "some", or empty for proper names) */
  article = 'a';
  
  /** Whether this entity is concealed from normal view */
  concealed = false;
  
  /** Weight of the object (undefined = negligible/not tracked) */
  weight?: number;
  
  /** Volume of the object (undefined = negligible/not tracked) */
  volume?: number;
  
  /** Size category of the object */
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';

  /**
   * Grammatical number for inanimate objects (ADR-089).
   * - 'singular': "it" (default) - "take it", "the lamp"
   * - 'plural': "them" - "take them", "the coins"
   * Only used for entities WITHOUT ActorTrait.
   */
  grammaticalNumber?: 'singular' | 'plural';

  /**
   * Adjectives that can be used to refer to this entity (ADR-093).
   * Used for disambiguation when multiple entities share a noun.
   * Example: ['yellow'] for "yellow button" vs ['red'] for "red button"
   */
  adjectives: string[] = [];

  /**
   * Noun type for article/formatter selection (ADR-095).
   * - 'common': Regular countable noun (a sword, the sword)
   * - 'proper': Proper name (John, not "a John")
   * - 'mass': Uncountable noun (water, not "a water" - use "some water")
   * - 'unique': One-of-a-kind (the sun, not "a sun")
   * - 'plural': Inherently plural (scissors, pants)
   *
   * If not set, formatters use `properName` and `grammaticalNumber` as fallback.
   */
  nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';

  constructor(data?: Partial<IdentityTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
