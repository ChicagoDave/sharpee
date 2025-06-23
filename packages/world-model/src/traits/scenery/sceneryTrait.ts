// packages/world-model/src/traits/scenery/sceneryTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Scenery trait marks items as fixed in place and not takeable.
 * 
 * In IF conventions, objects are takeable by default unless they have
 * this trait. This replaces the need for a separate "portable" trait.
 * 
 * This trait contains only data - all behavior is in SceneryBehavior.
 */
export class SceneryTrait implements Trait {
  static readonly type = TraitType.SCENERY;
  readonly type = TraitType.SCENERY;
  
  /** 
   * Custom message when trying to take this item.
   * If not provided, a default message will be used.
   */
  cantTakeMessage?: string;
  
  /**
   * Whether this scenery is mentioned in room descriptions.
   * If false, the item won't be listed but can still be examined.
   */
  mentioned: boolean = true;
  
  constructor(data?: Partial<SceneryTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}