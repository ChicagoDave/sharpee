/**
 * Semantic Core Grammar Rules
 * 
 * This replaces core-grammar.ts with semantic-aware grammar rules that
 * provide semantic properties to actions, eliminating parser coupling.
 */

import { GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';

/**
 * Define core English grammar rules with semantic mappings
 */
export function defineSemanticCoreGrammar(grammar: GrammarBuilder): void {
  // ============================================================================
  // LOOKING AND EXAMINING
  // ============================================================================
  
  grammar
    .define('look')
    .mapsTo('if.action.looking')
    .withDefaultSemantics({
      manner: 'normal'
    })
    .withPriority(100)
    .build();

  grammar
    .define('look around')
    .mapsTo('if.action.looking')
    .withDefaultSemantics({
      manner: 'careful'
    })
    .withPriority(101)
    .build();

  grammar
    .define('examine :target')
    .where('target', (scope: ScopeBuilder) => scope.visible())
    .mapsTo('if.action.examining')
    .withSemanticVerbs({
      'examine': { manner: 'normal' },
      'inspect': { manner: 'careful' },
      'study': { manner: 'careful' }
    })
    .withPriority(100)
    .build();

  // ============================================================================
  // TAKING AND DROPPING with semantic manner
  // ============================================================================
  
  grammar
    .define('take :item')
    .where('item', (scope: ScopeBuilder) => scope.visible().matching({ portable: true }))
    .mapsTo('if.action.taking')
    .withSemanticVerbs({
      'take': { manner: 'normal' },
      'grab': { manner: 'forceful' },
      'snatch': { manner: 'forceful' },
      'pick': { manner: 'careful' }
    })
    .withDefaultSemantics({
      manner: 'normal'
    })
    .withPriority(100)
    .build();

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

  // ============================================================================
  // INSERTING with semantic spatial relations (the key improvement!)
  // ============================================================================
  
  // Explicit preposition: "insert X in/into Y"
  grammar
    .define('insert :item in|into|inside :container')
    .where('item', (scope: ScopeBuilder) => scope.carried())
    .where('container', (scope: ScopeBuilder) => scope.touchable().matching({ container: true }))
    .mapsTo('if.action.inserting')
    .withSemanticVerbs({
      'insert': { manner: 'normal' },
      'put': { manner: 'normal' },
      'place': { manner: 'careful' },
      'jam': { manner: 'forceful' },
      'stuff': { manner: 'forceful' },
      'slip': { manner: 'stealthy' },
      'slide': { manner: 'careful' }
    })
    .withSemanticPrepositions({
      'in': 'in',
      'into': 'in',      // Normalize to 'in'
      'inside': 'in'     // Normalize to 'in'
    })
    .withDefaultSemantics({
      spatialRelation: 'in',
      implicitPreposition: false
    })
    .withPriority(100)
    .build();

  // Implicit preposition: "insert X Y" means "insert X into Y"
  // This rule eliminates the need for command modification!
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
      spatialRelation: 'in',      // Grammar knows this means "in"
      implicitPreposition: true   // Flag that preposition was implicit
    })
    .withPriority(95)  // Slightly lower priority than explicit form
    .build();

  // ============================================================================
  // PUTTING with semantic spatial relations
  // ============================================================================
  
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
      'onto': 'on'  // Normalize to 'on'
    })
    .withDefaultSemantics({
      spatialRelation: 'on'
    })
    .withPriority(100)
    .build();

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
    .withPriority(110)  // Higher priority than generic put
    .build();

  // ============================================================================
  // GOING with semantic direction normalization
  // ============================================================================
  
  // Simple direction (just "n" or "north")
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
      manner: 'normal'
    })
    .withPriority(90)
    .build();

  // Go/walk/run + direction
  grammar
    .define('go :direction')
    .mapsTo('if.action.going')
    .withSemanticVerbs({
      'go': { manner: 'normal' },
      'walk': { manner: 'normal' },
      'run': { manner: 'quick' },
      'rush': { manner: 'quick' },
      'sneak': { manner: 'stealthy' },
      'creep': { manner: 'stealthy' }
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
      'u': 'up',
      'up': 'up',
      'd': 'down',
      'down': 'down',
      'in': 'in',
      'out': 'out'
    })
    .withPriority(100)
    .build();

  // ============================================================================
  // OPENING AND CLOSING
  // ============================================================================
  
  grammar
    .define('open :target')
    .where('target', (scope: ScopeBuilder) => scope.touchable().matching({ openable: true }))
    .mapsTo('if.action.opening')
    .withSemanticVerbs({
      'open': { manner: 'normal' },
      'unlock': { manner: 'careful' },
      'force': { manner: 'forceful' },
      'pry': { manner: 'forceful' }
    })
    .withPriority(100)
    .build();

  grammar
    .define('close :target')
    .where('target', (scope: ScopeBuilder) => scope.touchable().matching({ openable: true }))
    .mapsTo('if.action.closing')
    .withSemanticVerbs({
      'close': { manner: 'normal' },
      'shut': { manner: 'normal' },
      'slam': { manner: 'forceful' },
      'seal': { manner: 'careful' }
    })
    .withPriority(100)
    .build();

  // ============================================================================
  // INVENTORY
  // ============================================================================
  
  grammar
    .define('inventory')
    .mapsTo('if.action.inventory')
    .withPriority(100)
    .build();

  grammar
    .define('i')
    .mapsTo('if.action.inventory')
    .withPriority(90)  // Lower priority for abbreviation
    .build();

  // ============================================================================
  // REMOVING
  // ============================================================================
  
  grammar
    .define('remove :item from :container')
    .where('item', (scope: ScopeBuilder) => scope.visible())
    .where('container', (scope: ScopeBuilder) => scope.touchable())
    .mapsTo('if.action.removing')
    .withSemanticVerbs({
      'remove': { manner: 'normal' },
      'extract': { manner: 'careful' },
      'yank': { manner: 'forceful' },
      'pull': { manner: 'normal' }
    })
    .withSemanticPrepositions({
      'from': 'from',
      'out': 'from',
      'off': 'from'
    })
    .withPriority(100)
    .build();

  // ============================================================================
  // ENTERING AND EXITING
  // ============================================================================
  
  grammar
    .define('enter :portal')
    .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
    .mapsTo('if.action.entering')
    .withSemanticVerbs({
      'enter': { manner: 'normal' },
      'go': { manner: 'normal' },
      'climb': { manner: 'careful' },
      'jump': { manner: 'forceful' }
    })
    .withDefaultSemantics({
      spatialRelation: 'in'
    })
    .withPriority(100)
    .build();

  grammar
    .define('exit')
    .mapsTo('if.action.exiting')
    .withDefaultSemantics({
      manner: 'normal',
      spatialRelation: 'out'
    })
    .withPriority(100)
    .build();
}

/**
 * Benefits of Semantic Core Grammar:
 * 
 * 1. Actions receive semantic properties instead of raw parser data
 * 2. Verb variations map to manner (forceful, careful, stealthy)
 * 3. Prepositions normalized to spatial relations
 * 4. Directions normalized from abbreviations
 * 5. Implicit prepositions flagged for better error messages
 * 6. No need for actions to access parsed.structure or parsed.extras
 * 
 * Example usage in actions:
 * ```typescript
 * // Instead of:
 * if (context.command.parsed.structure.verb?.text === 'discard') { ... }
 * 
 * // Use:
 * if (context.command.semantics?.manner === 'careless') { ... }
 * ```
 */