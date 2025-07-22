// packages/world-model/src/traits/actor/actorTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';
import { EntityId } from '@sharpee/core';

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
  
  /** Pronouns for this actor */
  pronouns?: {
    subject: string;    // he/she/they/it
    object: string;     // him/her/them/it
    possessive: string; // his/her/their/its
    reflexive: string;  // himself/herself/themself/itself
  };
  
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
export class ActorTrait implements Trait, IActorTrait {
  static readonly type = TraitType.ACTOR;
  readonly type = TraitType.ACTOR;
  
  isPlayer: boolean = false;
  isPlayable: boolean = true;
  state?: string;
  
  pronouns: {
    subject: string;
    object: string;
    possessive: string;
    reflexive: string;
  } = {
    subject: 'they',
    object: 'them',
    possessive: 'their',
    reflexive: 'themself'
  };
  
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
      
      // Handle pronouns
      if (data.pronouns) {
        this.pronouns = { ...this.pronouns, ...data.pronouns };
      }
      
      // Handle container properties
      this.capacity = data.capacity;
      this.allowedTypes = data.allowedTypes;
      this.excludedTypes = data.excludedTypes;
    }
  }
  
  /**
   * Set pronouns for this actor
   */
  setPronouns(pronouns: Partial<ActorTrait['pronouns']>): void {
    this.pronouns = { ...this.pronouns, ...pronouns };
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