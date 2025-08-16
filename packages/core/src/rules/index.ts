/**
 * Simple Rule System v2 - Main exports
 */

export * from './types';
export * from './simple-rule-system';
export * from './helpers';
export * from './rule-world-adapter';
export * from './compatibility';

// Re-export for convenience
export { createSimpleRuleSystem } from './simple-rule-system';
export { createSimpleRuleWorld } from './rule-world-adapter';

// Compatibility exports for old code
export { IRuleSystem, createRuleSystem } from './compatibility';
