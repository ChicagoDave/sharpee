/**
 * Expanse trait module (ADR-376): the expanse, the floating position, the
 * instrument, the landmark, and the geometry and drift that read them.
 * Sight and place across an expanse are systems (ADR-379), exported from
 * `world/` (`SightBehavior.ts`, `ExpansePlaceBehavior.ts`).
 */

export * from './expanseTrait.js';
export * from './floatingTrait.js';
export * from './sightTrait.js';
export * from './landmarkTrait.js';
export * from './expanseBehavior.js';
