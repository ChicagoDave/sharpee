// packages/world-model/src/traits/wearable/wearableTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IWearableData {
  /** Whether the item is currently being worn */
  isWorn?: boolean;

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

  /** Whether this item can be removed once worn */
  canRemove?: boolean;

  /** Body part this item is worn on */
  bodyPart?: string;
}

/**
 * Wearable trait indicates an entity can be worn by the player.
 * This is the base trait for all wearable items (rings, necklaces, clothing, etc.)
 * 
 * This trait contains only data - all logic for wearing/removing
 * is in WearableBehavior.
 */
export class WearableTrait implements ITrait, IWearableData {
  static readonly type = TraitType.WEARABLE;
  readonly type = TraitType.WEARABLE;

  // WearableData properties - internal storage
  worn: boolean = false;
  wornBy?: string;
  slot: string;
  layer: number;
  wearMessage?: string;
  removeMessage?: string;
  wearableOver: boolean;
  blocksSlots: string[];
  weight: number;
  bulk: number;
  canRemove: boolean;
  bodyPart: string;

  // Public accessor
  get isWorn(): boolean {
    return this.worn;
  }

  set isWorn(value: boolean) {
    this.worn = value;
  }

  constructor(data: IWearableData = {}) {
    // Set defaults and merge with provided data
    this.worn = data.isWorn ?? false;
    this.wornBy = data.wornBy;
    this.slot = data.slot ?? 'clothing';
    this.layer = data.layer ?? 1;
    this.wearMessage = data.wearMessage;
    this.removeMessage = data.removeMessage;
    this.wearableOver = data.wearableOver ?? true;
    this.blocksSlots = data.blocksSlots ?? [];
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;
    this.canRemove = data.canRemove ?? true;
    this.bodyPart = data.bodyPart ?? 'torso';
  }
}
