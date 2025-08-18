/**
 * Semantic Grammar Rules for English
 * 
 * These rules demonstrate how semantic properties are embedded in grammar,
 * eliminating the need for actions to interpret raw parser data.
 */

import { GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';

/**
 * Define semantic grammar rules for INSERTING
 */
export function defineSemanticInsertingRules(grammar: GrammarBuilder): void {
  // Rule 1: Explicit "insert X in/into Y" with semantic variations
  grammar
    .define('insert :item in|into :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withSemanticVerbs({
      'insert': { manner: 'normal' },
      'stick': { manner: 'forceful' },
      'slip': { manner: 'stealthy' },
      'jam': { manner: 'forceful' },
      'slide': { manner: 'careful' }
    })
    .withSemanticPrepositions({
      'in': 'in',
      'into': 'in',  // Normalize "into" to "in"
      'inside': 'in' // Normalize "inside" to "in"
    })
    .withDefaultSemantics({
      spatialRelation: 'in',
      implicitPreposition: false
    })
    .withPriority(100)
    .build();
  
  // Rule 2: Implicit "insert X Y" (means "insert X into Y")
  // This is the KEY rule that eliminates command modification
  grammar
    .define('insert :item :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withSemanticVerbs({
      'insert': { manner: 'normal' },
      'stick': { manner: 'forceful' },
      'slip': { manner: 'stealthy' }
    })
    .withDefaultSemantics({
      spatialRelation: 'in',      // Grammar knows this implicitly means "in"
      implicitPreposition: true   // Flag that preposition was implicit
    })
    .withPriority(95) // Slightly lower priority than explicit form
    .build();
  
  // Rule 3: Forceful insertion variants
  grammar
    .define('jam :item in|into :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withSemanticPrepositions({
      'in': 'in',
      'into': 'in'
    })
    .withDefaultSemantics({
      manner: 'forceful',
      spatialRelation: 'in',
      implicitPreposition: false
    })
    .withPriority(105) // Higher priority for specific verb
    .build();
  
  // Rule 4: Stealthy insertion
  grammar
    .define('slip :item in|into :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withSemanticPrepositions({
      'in': 'in',
      'into': 'in'
    })
    .withDefaultSemantics({
      manner: 'stealthy',
      spatialRelation: 'in',
      implicitPreposition: false
    })
    .withPriority(105)
    .build();
}

/**
 * Define semantic grammar rules for GOING (direction normalization)
 */
export function defineSemanticGoingRules(grammar: GrammarBuilder): void {
  // Simple direction movement
  grammar
    .define(':direction')
    .mapsTo('if.action.going')
    .withSemanticDirections({
      'n': 'north',
      'north': 'north',
      's': 'south',
      'south': 'south',
      'e': 'east',
      'east': 'east',
      'w': 'west',
      'west': 'west',
      'ne': 'northeast',
      'northeast': 'northeast',
      'nw': 'northwest',
      'northwest': 'northwest',
      'se': 'southeast',
      'southeast': 'southeast',
      'sw': 'southwest',
      'southwest': 'southwest',
      'u': 'up',
      'up': 'up',
      'd': 'down',
      'down': 'down',
      'in': 'in',
      'out': 'out'
    })
    .withDefaultSemantics({
      implicitDirection: false
    })
    .withPriority(90)
    .build();
  
  // Go with direction
  grammar
    .define('go :direction')
    .mapsTo('if.action.going')
    .withSemanticVerbs({
      'go': { manner: 'normal' },
      'walk': { manner: 'normal' },
      'run': { manner: 'quick' },
      'sneak': { manner: 'stealthy' },
      'rush': { manner: 'quick' }
    })
    .withSemanticDirections({
      'n': 'north',
      'north': 'north',
      's': 'south',
      'south': 'south',
      'e': 'east',
      'east': 'east',
      'w': 'west',
      'west': 'west',
      'up': 'up',
      'down': 'down',
      'in': 'in',
      'out': 'out'
    })
    .withPriority(100)
    .build();
  
  // Enter/exit specific objects
  grammar
    .define('enter :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withDefaultSemantics({
      manner: 'normal',
      spatialRelation: 'in'
    })
    .withPriority(100)
    .build();
}

/**
 * Define semantic grammar rules for DROPPING (manner variations)
 */
export function defineSemanticDroppingRules(grammar: GrammarBuilder): void {
  grammar
    .define('drop :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.dropping')
    .withSemanticVerbs({
      'drop': { manner: 'normal' },
      'discard': { manner: 'careless' },
      'throw': { manner: 'forceful' },
      'place': { manner: 'careful' },
      'chuck': { manner: 'careless' },
      'toss': { manner: 'careless' }
    })
    .withDefaultSemantics({
      manner: 'normal'
    })
    .withPriority(100)
    .build();
  
  // Specific: throw down (always forceful)
  grammar
    .define('throw down :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.dropping')
    .withDefaultSemantics({
      manner: 'forceful'
    })
    .withPriority(105) // Higher priority for specific phrase
    .build();
  
  // Specific: gently place (always careful)
  grammar
    .define('gently place :item')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .mapsTo('if.action.dropping')
    .withDefaultSemantics({
      manner: 'careful'
    })
    .withPriority(105)
    .build();
}

/**
 * Define semantic grammar rules for PUTTING (spatial relations)
 */
export function defineSemanticPuttingRules(grammar: GrammarBuilder): void {
  // Put on supporter
  grammar
    .define('put :item on|onto :supporter')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('supporter', (scope: ScopeBuilder) => scope.touchable().matching({ supporter: true }))
    .mapsTo('if.action.putting')
    .withSemanticVerbs({
      'put': { manner: 'normal' },
      'place': { manner: 'careful' },
      'set': { manner: 'careful' },
      'rest': { manner: 'careful' }
    })
    .withSemanticPrepositions({
      'on': 'on',
      'onto': 'on'  // Normalize "onto" to "on"
    })
    .withDefaultSemantics({
      spatialRelation: 'on'
    })
    .withPriority(100)
    .build();
  
  // Put under something
  grammar
    .define('put :item under|beneath|below :object')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('object', (scope: ScopeBuilder) => scope.touchable())
    .mapsTo('if.action.putting')
    .withSemanticVerbs({
      'put': { manner: 'normal' },
      'hide': { manner: 'stealthy' },
      'stash': { manner: 'stealthy' }
    })
    .withSemanticPrepositions({
      'under': 'under',
      'beneath': 'under',  // Normalize variations
      'below': 'under'
    })
    .withDefaultSemantics({
      spatialRelation: 'under'
    })
    .withPriority(100)
    .build();
  
  // Hang on hook (special case of putting)
  grammar
    .define('hang :item on :hook')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('hook', (scope: ScopeBuilder) => scope.touchable())
    .mapsTo('if.action.putting')
    .withDefaultSemantics({
      manner: 'careful',
      spatialRelation: 'on',
      custom: { isHanging: true }
    })
    .withPriority(110) // Higher priority than generic put
    .build();
}

/**
 * Register all semantic grammar rules
 */
export function defineAllSemanticRules(grammar: GrammarBuilder): void {
  defineSemanticInsertingRules(grammar);
  defineSemanticGoingRules(grammar);
  defineSemanticDroppingRules(grammar);
  defineSemanticPuttingRules(grammar);
}

/**
 * Example of how actions use semantic properties:
 * 
 * Instead of:
 * ```typescript
 * // Check verb text
 * if (context.command.parsed.structure.verb.text === 'discard') {
 *   message = 'dropped_carelessly';
 * }
 * 
 * // Check direction extras
 * const direction = context.command.parsed.extras?.direction;
 * if (direction === 'n' || direction === 'north') {
 *   normalizedDir = 'north';
 * }
 * ```
 * 
 * Actions now use:
 * ```typescript
 * // Use semantic properties
 * if (context.command.semantics?.manner === 'careless') {
 *   message = 'dropped_carelessly';
 * }
 * 
 * // Direction already normalized
 * const direction = context.command.semantics?.direction; // Already 'north'
 * ```
 */