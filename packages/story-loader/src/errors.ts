/**
 * errors.ts — story-loader load failure type.
 *
 * Purpose: the single error every load-time failure throws. Loading is
 * atomic (ADR-210): the first LoadError aborts the load; there is no
 * partial registration to clean up because the engine discards the world.
 *
 * Public interface: LoadError.
 * Owner context: @sharpee/story-loader.
 */
import type { Span } from '@sharpee/chord';

/** A story failed to load. Carries the `.story` span when one is known. */
export class LoadError extends Error {
  constructor(
    message: string,
    /** Source span in the `.story` file, when attributable. */
    readonly span?: Span,
  ) {
    super(span ? `${message} (line ${span.line})` : message);
    this.name = 'LoadError';
  }
}
