// packages/world-model/src/traits/wearable/wearableTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface WearableData {
  /** Whether the item is currently being worn */
  worn?: boolean;
  
  /** ID of who is wearing this (if worn) */
  wornBy?: string;
  
  /** Body slot this item occupies when worn */
  slot?: string;
  
  /** Layer for items in same slot (higher = outer) */
  layer?: number;
  
  /** Custom message when wearing this item */
  wearMessage?: string;
  
  /** Custom message when removing this item */
  removeMessage?: string;
  
  /** Whether this item can be worn over other items */
  wearableOver?: boolean;
  
  /** Slots this item blocks when worn */
  blocksSlots?: string[];
  
  /** Weight of the item (since we removed PortableTrait) */
  weight?: number;
  
  /** Bulk of the item */
  bulk?: number;
}

/**
 * Wearable trait indicates an entity can be worn by the player.
 * 
 * This trait contains only data - all logic for wearing/removing
 * is in WearableBehavior.
 */
export class WearableTrait implements Trait, WearableData {
  static readonly type = TraitType.WEARABLE;
  readonly type = TraitType.WEARABLE;
  
  // WearableData properties
  worn: boolean;
  wornBy?: string;
  slot: string;
  layer: number;
  wearMessage?: string;
  removeMessage?: string;
  wearableOver: boolean;
  blocksSlots: string[];
  weight: number;
  bulk: number;
  
  constructor(data: WearableData = {}) {
    // Set defaults and merge with provided data
    this.worn = data.worn ?? false;
    this.wornBy = data.wornBy;
    this.slot = data.slot ?? 'clothing';
    this.layer = data.layer ?? 1;
    this.wearMessage = data.wearMessage;
    this.removeMessage = data.removeMessage;
    this.wearableOver = data.wearableOver ?? true;
    this.blocksSlots = data.blocksSlots ?? [];
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;
  }
}
