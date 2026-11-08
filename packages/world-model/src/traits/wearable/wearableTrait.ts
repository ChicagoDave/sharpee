// packages/world-model/src/traits/wearable/wearableTrait.ts

/**
 * Wearable trait — the data of a thing an actor can put on and take off.
 *
 * A wearable is one of two shapes, told apart by `placement` (ADR-392 D1):
 *
 * - **Simple** (`placement` absent): a ring, a badge, a satchel. It is worn or
 *   not, and it never conflicts with or blocks any other wearable.
 * - **Placed** (`placement` present): it sits on a named body part at a
 *   layer. Two placed things on the same part conflict at the same layer and
 *   stack at different layers, outer over inner; an outer thing blocks taking
 *   off the inner one. Both fields of the pair are required together — there
 *   is no half-placed wearable, which is what the old free-standing
 *   `bodyPart`/`layer` fields (defaulted to 'torso' and 1) allowed, and why
 *   the conflict rule could never fire for a constructed trait.
 *
 * The placement pair is the one placement model: the earlier `slot`,
 * `blocksSlots` and `wearableOver` vocabulary, which no action ever read, is
 * retired with ADR-392.
 *
 * Pure data (ADR-346 D1): defaults, no policing. WearableBehavior owns the
 * mutations; stdlib's wearable-shared owns the conflict and layering rules.
 *
 * Public interface: WearableTrait, IWearableData, IWearablePlacement.
 * Owner context: @sharpee/world-model — traits.
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/** Where a placed wearable sits: the body part, and its layer (higher is outer). */
export interface IWearablePlacement {
  /** The body part this is worn on — compared by equality, nothing more. */
  bodyPart: string;
  /** Layer on that part; equal layers conflict, a higher layer is worn over a lower. */
  layer: number;
}

export interface IWearableData {
  /** Whether the item is currently being worn */
  isWorn?: boolean;

  /** ID of who is wearing this (if worn) */
  wornBy?: string;

  /** Where it sits on the body; absent means a simple wearable that never conflicts */
  placement?: IWearablePlacement;

  /** Custom message when wearing this item */
  wearMessage?: string;

  /** Custom message when removing this item */
  removeMessage?: string;

  /** Weight of the item */
  weight?: number;

  /** Bulk of the item */
  bulk?: number;

  /** Whether this item can be removed once worn */
  canRemove?: boolean;
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
  placement?: IWearablePlacement;
  wearMessage?: string;
  removeMessage?: string;
  weight: number;
  bulk: number;
  canRemove: boolean;

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
    this.placement = data.placement === undefined
      ? undefined
      : { bodyPart: data.placement.bodyPart, layer: data.placement.layer };
    this.wearMessage = data.wearMessage;
    this.removeMessage = data.removeMessage;
    this.weight = data.weight ?? 1;
    this.bulk = data.bulk ?? 1;
    this.canRemove = data.canRemove ?? true;
  }
}
