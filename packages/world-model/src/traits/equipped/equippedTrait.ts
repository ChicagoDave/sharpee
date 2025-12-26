/**
 * Equipped trait for items that are currently equipped by an actor
 */

import { ITrait } from '../trait';

export interface IEquippedData {
  /** Which slot this item is equipped in */
  slot?: 'weapon' | 'armor' | 'shield' | 'helmet' | 'boots' | 'gloves' | 'ring' | 'amulet' | 'accessory';
  
  /** Whether this item is currently equipped */
  isEquipped?: boolean;
  
  /** Custom message when equipping */
  equipMessage?: string;
  
  /** Custom message when unequipping */
  unequipMessage?: string;
  
  /** Whether this item can be equipped in combat */
  quickEquip?: boolean;
  
  /** Stat modifiers when equipped */
  modifiers?: {
    attack?: number;
    defense?: number;
    health?: number;
    speed?: number;
  };
}

/**
 * Equipped trait indicates an item is currently equipped by an actor.
 * 
 * This trait contains only data - all equipment logic
 * is in EquipmentBehavior.
 */
export class EquippedTrait implements ITrait, IEquippedData {
  static readonly type = 'equipped' as const;
  readonly type = 'equipped' as const;
  
  // EquippedData properties
  slot: 'weapon' | 'armor' | 'shield' | 'helmet' | 'boots' | 'gloves' | 'ring' | 'amulet' | 'accessory';
  isEquipped: boolean;
  equipMessage?: string;
  unequipMessage?: string;
  quickEquip: boolean;
  modifiers?: {
    attack?: number;
    defense?: number;
    health?: number;
    speed?: number;
  };
  
  constructor(data: IEquippedData = {}) {
    // Set defaults and merge with provided data
    this.slot = data.slot ?? 'accessory';
    this.isEquipped = data.isEquipped ?? false;
    this.equipMessage = data.equipMessage;
    this.unequipMessage = data.unequipMessage;
    this.quickEquip = data.quickEquip ?? false;
    this.modifiers = data.modifiers;
  }
}