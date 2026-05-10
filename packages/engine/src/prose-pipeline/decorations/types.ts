/**
 * Local types for the engine-internal prose pipeline's decoration
 * primitives. These mirror the shape ADR-174 mandates for
 * `@sharpee/text-blocks` `IDecoration`, but sub-phase 1.1 keeps them
 * isolated here so the parser/resolver can land before the
 * cross-package shape change in sub-phase 1.2 is applied.
 *
 * Public interface: `IDecoration`, `TextContent`. Used internally by
 * the parser and (after sub-phase 1.5) by the pipeline class.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Wire shape
 */

/**
 * A span of decorated content. The `className` is the final, fully
 * resolved CSS class (already prefixed with `sharpee-` when the source
 * bracket name was in the platform vocabulary; bare otherwise).
 *
 * Renderers translate `IDecoration` to their target output (HTML span
 * for browser, ANSI for terminal, ignore for audio).
 */
export interface IDecoration {
  /** Final, fully-resolved CSS class name. */
  readonly className: string;
  /** Recursively decorated content. */
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * A piece of block content — either plain text or a decorated span.
 */
export type TextContent = string | IDecoration;
