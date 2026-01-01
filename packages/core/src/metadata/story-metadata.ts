// packages/core/src/metadata/story-metadata.ts
// Story metadata interface per ADR-074

/**
 * Story metadata for Treaty of Babel compliance.
 * Contains bibliographic information embedded in compiled stories.
 */
export interface StoryMetadata {
  /** Unique IFID (Interactive Fiction Identifier) */
  ifid: string;

  /** Story title */
  title: string;

  /** Author name(s) */
  author: string;

  /** Year of first publication (e.g., "2025") */
  firstPublished?: string;

  /** Brief tagline (e.g., "An Interactive Fiction") */
  headline?: string;

  /** Genre classification */
  genre?: string;

  /** Story blurb/description */
  description?: string;

  /** Primary language code (e.g., "en") */
  language?: string;

  /** Series name if part of a series */
  series?: string;

  /** Number in series */
  seriesNumber?: number;

  /** Zarfian forgiveness scale */
  forgiveness?: 'Merciful' | 'Polite' | 'Tough' | 'Nasty' | 'Cruel';
}

/**
 * Sharpee config section in package.json
 */
export interface SharpeeConfig {
  /** Story IFID */
  ifid: string;

  /** Story title */
  title: string;

  /** Author name(s) */
  author: string;

  /** Year of first publication */
  firstPublished?: string;

  /** Brief tagline */
  headline?: string;

  /** Genre classification */
  genre?: string;

  /** Story description */
  description?: string;

  /** Primary language code */
  language?: string;

  /** Series name */
  series?: string;

  /** Number in series */
  seriesNumber?: number;

  /** Zarfian forgiveness scale */
  forgiveness?: 'Merciful' | 'Polite' | 'Tough' | 'Nasty' | 'Cruel';
}

/**
 * Validation result for story configuration
 */
export interface StoryConfigValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}
