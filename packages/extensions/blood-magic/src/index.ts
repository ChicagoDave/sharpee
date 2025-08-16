/**
 * Blood Magic Extension for Sharpee
 * 
 * Provides:
 * - Mirror portal system (Blood of Silver)
 * - Invisibility mechanics (Blood of Moon)
 * - Related traits, actions, and events
 */

import { Extension, ExtensionType } from '@sharpee/core';

// Export all traits and behaviors
export * from './traits';

// Export all events
export * from './events/blood-events';

// Export all actions
export * from './actions';

// Export all grammar
export * from './grammar';

// TODO: Export rules when implemented  
// export * from './rules/invisibility-scope';

// TODO: Export messages when implemented
// export * from './messages/blood-messages';

/**
 * Blood Magic Extension definition
 */
export const BloodMagicExtension: Extension = {
  id: 'blood-magic',
  name: 'Blood Magic System',
  version: '0.1.0',
  dependencies: []
};

/**
 * Register the extension with the game
 * This would be called by the story during initialization
 */
export function registerBloodMagic(/* registry, world, language */) {
  // TODO: Register all components with appropriate systems
  
  // Register traits with world model
  // world.registerTrait('mirror', MirrorTrait);
  // world.registerTrait('blood_silver', BloodSilverTrait);
  // world.registerTrait('blood_moon', BloodMoonTrait);
  
  // Register actions with language/parser
  // language.addAction(touchMirrorAction);
  // language.addAction(connectMirrorAction);
  // language.addAction(enterMirrorAction);
  // etc.
  
  // Register grammar patterns
  // parser.addGrammar(mirrorGrammar);
  
  // Register scope rules
  // world.addScopeRule(invisibilityRule);
  
  // Register messages
  // language.addMessages(bloodMessages);
  
  console.log('Blood Magic extension registered');
}