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
  
  /** Inventory capacity */
  inventoryLimit?: {
    maxItems?: number;
    maxWeight?: number;
    maxVolume?: number;
  };
  
  /** Custom properties for game-specific actor data */
  customProperties?: Record<string, any>;
}

/**
 * Trait for entities that can act in the world (player, NPCs, etc.)
 * 
 * Actors can:
 * - Perform actions
 * - Hold inventory
 * - Move between locations
 * - Interact with objects
 */
export class ActorTrait implements Trait {
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
  
  inventoryLimit?: {
    maxItems?: number;
    maxWeight?: number;
    maxVolume?: number;
  };
  
  customProperties?: Record<string, any>;
  
  constructor(data?: Partial<ActorTrait>) {
    if (data) {
      Object.assign(this, data);
      // Ensure pronouns have all required fields if provided
      if (data.pronouns && this.pronouns !== data.pronouns) {
        this.pronouns = { ...this.pronouns, ...data.pronouns };
      }
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
  setInventoryLimit(limit: Partial<ActorTrait['inventoryLimit']>): void {
    this.inventoryLimit = { ...this.inventoryLimit, ...limit };
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