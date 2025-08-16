/**
 * @file Blood Magic Grammar Rules
 * @description Grammar patterns for blood magic commands
 */

import { GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';

/**
 * Define blood magic grammar rules
 * @param grammar The grammar builder to use
 */
export function defineBloodGrammar(grammar: GrammarBuilder): void {
  // Mirror-related patterns
  
  // Touching mirrors (for connection or usage)
  grammar
    .define('touch :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.touching_mirror')
    .withPriority(100)
    .build();
    
  // Connecting mirrors (requires two mirrors)
  grammar
    .define('connect :mirror1 to :mirror2')
    .where('mirror1', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .where('mirror2', (scope: ScopeBuilder) => scope.visible().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.connecting_mirrors')
    .withPriority(100)
    .build();
    
  grammar
    .define('link :mirror1 to :mirror2')
    .where('mirror1', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .where('mirror2', (scope: ScopeBuilder) => scope.visible().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.connecting_mirrors')
    .withPriority(95)
    .build();
    
  // Entering mirrors
  grammar
    .define('enter :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.entering_mirror')
    .withPriority(100)
    .build();
    
  grammar
    .define('go through :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.entering_mirror')
    .withPriority(95)
    .build();
    
  grammar
    .define('step into :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.entering_mirror')
    .withPriority(95)
    .build();
    
  // Looking through mirrors
  grammar
    .define('look through :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.visible().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.looking_through_mirror')
    .withPriority(100)
    .build();
    
  grammar
    .define('peer through :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.visible().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.looking_through_mirror')
    .withPriority(95)
    .build();
    
  // Stepping on mirrors (floor mirrors)
  grammar
    .define('step on :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.stepping_on_mirror')
    .withPriority(100)
    .build();
    
  // Falling through mirrors (ceiling mirrors)
  grammar
    .define('fall through :mirror')
    .where('mirror', (scope: ScopeBuilder) => scope.reachable().matching({ traits: ['mirror'] }))
    .mapsTo('blood.action.falling_through_mirror')
    .withPriority(100)
    .build();
    
  // Moon-related patterns
  
  // Touching moon (activate invisibility)
  grammar
    .define('touch moon')
    .mapsTo('blood.action.touching_moon')
    .withPriority(100)
    .build();
    
  grammar
    .define('invoke moon')
    .mapsTo('blood.action.touching_moon')
    .withPriority(95)
    .build();
    
  grammar
    .define('become invisible')
    .mapsTo('blood.action.touching_moon')
    .withPriority(90)
    .build();
    
  // Forgetting moon (deactivate invisibility)
  grammar
    .define('forget moon')
    .mapsTo('blood.action.forgetting_moon')
    .withPriority(100)
    .build();
    
  grammar
    .define('release moon')
    .mapsTo('blood.action.forgetting_moon')
    .withPriority(95)
    .build();
    
  grammar
    .define('become visible')
    .mapsTo('blood.action.forgetting_moon')
    .withPriority(90)
    .build();
    
  // Blood sensing commands
  grammar
    .define('sense blood')
    .mapsTo('blood.action.sensing_blood')
    .withPriority(100)
    .build();
    
  grammar
    .define('feel ripples')
    .mapsTo('blood.action.sensing_ripples')
    .withPriority(100)
    .build();
}