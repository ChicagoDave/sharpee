/**
 * Type re-exports for the engine-internal prose pipeline's decoration
 * primitives. Sub-phase 1.1 declared these locally; sub-phase 1.2
 * lifted the shape change into `@sharpee/text-blocks`, so the
 * engine-side module now re-exports the canonical types from there.
 *
 * Public interface: `IDecoration`, `TextContent`. Used internally by
 * the parser, resolver, and (after sub-phase 1.5) by the pipeline
 * class.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Wire shape
 */

export type { IDecoration, TextContent } from '@sharpee/text-blocks';
