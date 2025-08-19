// packages/world-model/src/traits/openable/openableTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IOpenableData {
  /** Whether the entity is currently open */
  isOpen?: boolean;
  
  /** Whether the entity starts open */
  startsOpen?: boolean;
  
  /** Custom message when opening */
  openMessage?: string;
  
  /** Custom message when closing */
  closeMessage?: string;
  
  /** Custom message when already open */
  alreadyOpenMessage?: string;
  
  /** Custom message when already closed */
  alreadyClosedMessage?: string;
  
  /** Whether opening reveals contents (for containers) */
  revealsContents?: boolean;
  
  /** Whether this can be closed once opened */
  canClose?: boolean;
  
  /** Sound made when opening */
  openSound?: string;
  
  /** Sound made when closing */
  closeSound?: string;
}

/**
 * Openable trait for entities that can be opened and closed.
 * Used for doors, containers, books, etc.
 * 
 * This trait contains only data - all logic for opening/closing
 * is in OpenableBehavior.
 */
export class OpenableTrait implements ITrait, IOpenableData {
  static readonly type = TraitType.OPENABLE;
  readonly type = TraitType.OPENABLE;
  
  // OpenableData properties
  isOpen: boolean;
  startsOpen: boolean;
  openMessage?: string;
  closeMessage?: string;
  alreadyOpenMessage?: string;
  alreadyClosedMessage?: string;
  revealsContents: boolean;
  canClose: boolean;
  openSound?: string;
  closeSound?: string;
  
  constructor(data: IOpenableData = {}) {
    // Set defaults and merge with provided data
    this.startsOpen = data.startsOpen ?? false;
    this.isOpen = data.isOpen ?? this.startsOpen;
    this.openMessage = data.openMessage;
    this.closeMessage = data.closeMessage;
    this.alreadyOpenMessage = data.alreadyOpenMessage;
    this.alreadyClosedMessage = data.alreadyClosedMessage;
    this.revealsContents = data.revealsContents ?? true;
    this.canClose = data.canClose ?? true;
    this.openSound = data.openSound;
    this.closeSound = data.closeSound;
  }
}
