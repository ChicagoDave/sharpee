// packages/core/src/index.ts
// Core exports for Sharpee - Generic data store and event system
// Export version
export const version = '0.1.0';
// Re-export core types first (includes EntityId)
export * from './types';
// Re-export from execution module
export * from './execution';
export { createEvent, createEventSource, createEventEmitter } from './events/event-system';
export { createTextService } from './events/text-processor';
// Re-export from channels module
export * from './channels';
// Re-export from extensions module
export { ExtensionType } from './extensions/types';
export { ExtensionRegistry, createExtensionRegistry } from './extensions/registry';
// Re-export from rules module
export { 
// Functions
createSimpleRuleSystem, createSimpleRuleWorld, 
// Helpers
getTargetItem, getActor, entityIs, getAttribute, hasAbility, giveAbility, removeAbility, setAttribute, itemTooHeavy, isTaking, playerHasAbility, createRuleSystem } from './rules';
// Re-export from language module
export * from './language';
// Re-export from constants module
export * from './constants';
//# sourceMappingURL=index.js.map