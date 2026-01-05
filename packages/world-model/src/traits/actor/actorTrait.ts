// packages/world-model/src/traits/actor/actorTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';
import { EntityId } from '@sharpee/core';

/**
 * Full pronoun set for animate entities (ADR-089)
 */
export interface PronounSet {
  /** Nominative case: "he", "she", "they", "xe" */
  subject: string;
  /** Accusative case: "him", "her", "them", "xem" */
  object: string;
  /** Possessive pronoun (standalone): "his", "hers", "theirs", "xyrs" */
  possessive: string;
  /** Possessive adjective (before noun): "his", "her", "their", "xyr" */
  possessiveAdj: string;
  /** Reflexive: "himself", "herself", "themselves", "xemself" */
  reflexive: string;
  /** Verb agreement: 'singular' or 'plural' (they takes plural verbs) */
  verbForm: 'singular' | 'plural';
}

/**
 * Standard pronoun sets (ADR-089)
 */
export const PRONOUNS = {
  HE_HIM: {
    subject: 'he', object: 'him', possessive: 'his',
    possessiveAdj: 'his', reflexive: 'himself', verbForm: 'singular'
  } as PronounSet,
  SHE_HER: {
    subject: 'she', object: 'her', possessive: 'hers',
    possessiveAdj: 'her', reflexive: 'herself', verbForm: 'singular'
  } as PronounSet,
  THEY_THEM: {
    subject: 'they', object: 'them', possessive: 'theirs',
    possessiveAdj: 'their', reflexive: 'themselves', verbForm: 'plural'
  } as PronounSet,
  // Neopronouns
  XE_XEM: {
    subject: 'xe', object: 'xem', possessive: 'xyrs',
    possessiveAdj: 'xyr', reflexive: 'xemself', verbForm: 'singular'
  } as PronounSet,
  ZE_ZIR: {
    subject: 'ze', object: 'zir', possessive: 'zirs',
    possessiveAdj: 'zir', reflexive: 'zirself', verbForm: 'singular'
  } as PronounSet,
  ZE_HIR: {
    subject: 'ze', object: 'hir', possessive: 'hirs',
    possessiveAdj: 'hir', reflexive: 'hirself', verbForm: 'singular'
  } as PronounSet,
  EY_EM: {
    subject: 'ey', object: 'em', possessive: 'eirs',
    possessiveAdj: 'eir', reflexive: 'emself', verbForm: 'singular'
  } as PronounSet,
  FAE_FAER: {
    subject: 'fae', object: 'faer', possessive: 'faers',
    possessiveAdj: 'faer', reflexive: 'faerself', verbForm: 'singular'
  } as PronounSet,
} as const;

/**
 * Standard honorifics/titles (ADR-089)
 */
export const HONORIFICS = {
  MR: 'Mr.',
  MRS: 'Mrs.',
  MS: 'Ms.',
  MX: 'Mx.',       // Gender-neutral
  MISS: 'Miss',
  DR: 'Dr.',
  PROF: 'Prof.',
} as const;

/**
 * Grammatical gender for localization (ADR-089)
 * Separate from pronouns - used for agreement in gendered languages
 */
export type GrammaticalGender = 'masculine' | 'feminine' | 'neuter' | 'common';

/**
 * Interface for the Actor trait data
 */
export interface IActorTrait {
  /** Whether this actor is the player character */
  isPlayer?: boolean;

  /** Whether this actor can be controlled by the player */
  isPlayable?: boolean;

  /** Current state/mood of the actor */
  state?: string;

  /**
   * Pronouns for this actor. Can be:
   * - A single PronounSet (most common)
   * - An array of PronounSets for people who use multiple (e.g., he/they)
   *   First in array is "primary" for parser resolution; all are valid
   */
  pronouns?: PronounSet | PronounSet[];

  /** Optional honorific/title: "Mr.", "Ms.", "Mx.", "Dr.", etc. */
  honorific?: string;

  /**
   * Semantic gender for grammatical agreement in gendered languages.
   * IMPORTANT: Separate from pronouns! A they/them person may specify
   * 'masculine' for French "il" agreement.
   */
  grammaticalGender?: GrammaticalGender;

  /**
   * Brief description for disambiguation prompts.
   * Example: "the tall woman", "the barista", "your friend Sam"
   */
  briefDescription?: string;

  /** Inventory capacity - actors can carry items */
  capacity?: {
    maxItems?: number;
    maxWeight?: number;
    maxVolume?: number;
  };

  /** Only these entity types can be carried by the actor */
  allowedTypes?: string[];

  /** These entity types cannot be carried by the actor */
  excludedTypes?: string[];

  /** Custom properties for game-specific actor data */
  customProperties?: Record<string, any>;
}

/**
 * Trait for entities that can act in the world (player, NPCs, etc.)
 * 
 * Actors can:
 * - Perform actions
 * - Hold inventory (actors inherently have container functionality)
 * - Move between locations
 * - Interact with objects
 * 
 * Like rooms, actors have built-in container functionality for their inventory.
 * The actual containment relationships are stored in the SpatialIndex.
 */
export class ActorTrait implements ITrait, IActorTrait {
  static readonly type = TraitType.ACTOR;
  readonly type = TraitType.ACTOR;

  isPlayer: boolean = false;
  isPlayable: boolean = true;
  state?: string;

  /** Pronouns - defaults to they/them (ADR-089) */
  pronouns: PronounSet | PronounSet[] = PRONOUNS.THEY_THEM;

  /** Optional honorific/title */
  honorific?: string;

  /** Grammatical gender for localization */
  grammaticalGender?: GrammaticalGender;

  /** Brief description for disambiguation */
  briefDescription?: string;

  // Container functionality for inventory
  capacity?: {
    maxItems?: number;
    maxWeight?: number;
    maxVolume?: number;
  };
  allowedTypes?: string[];
  excludedTypes?: string[];

  // Actors are not transparent (can't see inside inventory) and not enterable
  readonly isTransparent: boolean = false;
  readonly enterable: boolean = false;

  customProperties?: Record<string, any>;

  constructor(data?: Partial<IActorTrait>) {
    if (data) {
      // Handle basic properties
      this.isPlayer = data.isPlayer ?? this.isPlayer;
      this.isPlayable = data.isPlayable ?? this.isPlayable;
      this.state = data.state;
      this.customProperties = data.customProperties;

      // Handle pronouns (ADR-089)
      if (data.pronouns) {
        this.pronouns = data.pronouns;
      }
      this.honorific = data.honorific;
      this.grammaticalGender = data.grammaticalGender;
      this.briefDescription = data.briefDescription;

      // Handle container properties
      this.capacity = data.capacity;
      this.allowedTypes = data.allowedTypes;
      this.excludedTypes = data.excludedTypes;
    }
  }

  /**
   * Get the primary pronoun set (first if array, or the single set)
   */
  getPrimaryPronouns(): PronounSet {
    return Array.isArray(this.pronouns) ? this.pronouns[0] : this.pronouns;
  }

  /**
   * Set pronouns for this actor
   */
  setPronouns(pronouns: PronounSet | PronounSet[]): void {
    this.pronouns = pronouns;
  }
  
  /**
   * Set inventory limits
   */
  setInventoryLimit(limit: Partial<{ maxItems?: number; maxWeight?: number; maxVolume?: number }>): void {
    this.capacity = { ...this.capacity, ...limit };
  }
  
  /**
   * Mark as player character
   */
  makePlayer(): void {
    this.isPlayer = true;
    this.isPlayable = true;
  }
  
  /**
   * Set custom property
   */
  setCustomProperty(key: string, value: any): void {
    if (!this.customProperties) {
      this.customProperties = {};
    }
    this.customProperties[key] = value;
  }
  
  /**
   * Get custom property
   */
  getCustomProperty(key: string): any {
    return this.customProperties?.[key];
  }
}