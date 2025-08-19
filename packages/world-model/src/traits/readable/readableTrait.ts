// packages/world-model/src/traits/readable/readableTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Readable trait for entities that have text to read.
 * Used for books, signs, notes, inscriptions, etc.
 * 
 * This trait contains only data - all behavior is in ReadableBehavior.
 */
export class ReadableTrait implements ITrait {
  static readonly type = TraitType.READABLE;
  readonly type = TraitType.READABLE;
  
  /** The main text content */
  text: string = '';
  
  /** Short preview shown in descriptions */
  preview?: string;
  
  /** Whether the text is currently visible */
  isReadable: boolean = true;
  
  /** Language of the text (for multi-language games) */
  language: string = 'common';
  
  /** Whether reading requires a specific skill or item */
  requiresAbility: boolean = false;
  
  /** Ability/item needed to read (if requiresAbility) */
  requiredAbility?: string;
  
  /** Message when unable to read */
  cannotReadMessage?: string;
  
  /** Whether this has been read by the player */
  hasBeenRead: boolean = false;
  
  /** Type of readable (book, sign, note, inscription, etc.) */
  readableType: string = 'text';
  
  /** Number of pages (for books) */
  pages?: number;
  
  /** Current page (for multi-page items) */
  currentPage?: number;
  
  /** Content per page (for multi-page items) */
  pageContent?: string[];
  
  constructor(data?: Partial<ReadableTrait>) {
    if (data) {
      Object.assign(this, data);
    }
    
    // Initialize current page for multi-page items
    if (this.pageContent && this.pageContent.length > 0 && !this.currentPage) {
      this.currentPage = 1;
      this.pages = this.pageContent.length;
    }
  }
}