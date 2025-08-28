// packages/world-model/src/traits/openable/openableTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IOpenableData {
  /** Whether the entity is currently open */
  isOpen?: boolean;
  
  /** Whether the entity starts open */
  startsOpen?: boolean;
  
  /** Whether this can be closed once opened */
  canClose?: boolean;
}

/**
 * Openable trait for entities that can be opened and closed.
 * Used for doors, containers, books, etc.
 * 
 * This trait contains only essential state data - all logic for opening/closing
 * is in OpenableBehavior. Complex features like sounds and messages should be
 * added through event handlers in stories.
 */
export class OpenableTrait implements ITrait, IOpenableData {
  static readonly type = TraitType.OPENABLE;
  readonly type = TraitType.OPENABLE;
  
  // OpenableData properties
  isOpen: boolean;
  startsOpen: boolean;
  canClose: boolean;
  
  constructor(data: IOpenableData = {}) {
    // Set defaults and merge with provided data
    this.startsOpen = data.startsOpen ?? false;
    this.isOpen = data.isOpen ?? this.startsOpen;
    this.canClose = data.canClose ?? true;
  }
}
