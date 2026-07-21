/**
 * Effects system for ADR-075
 *
 * Handlers receive read-only WorldQuery and return Effect[].
 * EffectProcessor validates and applies effects atomically.
 */

export * from './types.js';
export { WorldQuery, createWorldQuery } from './world-query.js';
export { EffectProcessor, EventEmitCallback } from './effect-processor.js';
