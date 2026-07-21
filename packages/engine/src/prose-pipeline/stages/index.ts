/**
 * Prose pipeline stages — internal barrel.
 *
 * Public interface: re-exports `filterEvents`, `sortEventsForProse`,
 * and `getChainMetadata`. Used by the pipeline class (sub-phase 1.5).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

export { filterEvents } from './filter.js';
export { sortEventsForProse, getChainMetadata } from './sort.js';
