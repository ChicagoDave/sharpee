/**
 * Decorations — internal barrel for the prose pipeline's bracket
 * markup primitives.
 *
 * Public interface: re-exports from `parser`, `resolver`,
 * `platform-vocabulary`, `types`. No external package imports this;
 * the prose pipeline assembles its own consumers under
 * `packages/engine/src/prose-pipeline/`.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

export { parseDecorations } from './parser';
export { resolveClassName } from './resolver';
export {
  PLATFORM_VOCABULARY,
  PLATFORM_VOCABULARY_NAMES,
  type PlatformVocabularyName,
} from './platform-vocabulary';
export type { IDecoration, TextContent } from './types';
