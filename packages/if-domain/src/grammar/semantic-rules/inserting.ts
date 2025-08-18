/**
 * Semantic Grammar Rules for INSERTING action
 * 
 * This demonstrates how semantic grammar solves the architecture problem:
 * - No need for actions to check verb.text or modify parsed commands
 * - Implicit "into" semantics are declared in the grammar
 * - Actions receive clean semantic properties
 */

import { SemanticGrammarBuilder, SemanticGrammarRule } from '../semantic-grammar';

/**
 * Create semantic grammar rules for the INSERTING action
 */
export function createInsertingRules(): SemanticGrammarRule[] {
  const rules: SemanticGrammarRule[] = [];
  
  // Rule 1: Explicit "insert X in/into Y"
  rules.push(
    new SemanticGrammarBuilder()
      .pattern('insert :item in|into :container')
      .mapsTo('if.action.inserting')
      .withPrepositions({
        'in': 'in',
        'into': 'in'  // Normalize "into" to "in"
      })
      .withVerbs({
        'insert': { manner: 'normal' },
        'stick': { manner: 'forceful' },
        'slip': { manner: 'stealthy' },
        'jam': { manner: 'forceful' },
        'slide': { manner: 'careful' }
      })
      .withDefaults({
        spatialRelation: 'in',
        implicitPreposition: false
      })
      .build()
  );
  
  // Rule 2: Implicit "insert X Y" (means "insert X into Y")
  // This is the KEY rule that eliminates the need for command modification
  rules.push(
    new SemanticGrammarBuilder()
      .pattern('insert :item :container')
      .mapsTo('if.action.inserting')
      .withVerbs({
        'insert': { manner: 'normal' },
        'stick': { manner: 'forceful' },
        'slip': { manner: 'stealthy' }
      })
      .withDefaults({
        spatialRelation: 'in',      // Grammar knows this implicitly means "in"
        implicitPreposition: true   // Flag that preposition was implicit
      })
      .build()
  );
  
  // Rule 3: Alternative verbs that imply insertion
  rules.push(
    new SemanticGrammarBuilder()
      .pattern('place :item in|into :container')
      .mapsTo('if.action.inserting')
      .withPrepositions({
        'in': 'in',
        'into': 'in'
      })
      .withVerbs({
        'place': { manner: 'careful' },
        'put': { manner: 'normal' }
      })
      .withDefaults({
        spatialRelation: 'in',
        implicitPreposition: false
      })
      .build()
  );
  
  // Rule 4: Colloquial forms
  rules.push(
    new SemanticGrammarBuilder()
      .pattern('stick :item in|into :container')
      .mapsTo('if.action.inserting')
      .withPrepositions({
        'in': 'in',
        'into': 'in'
      })
      .withDefaults({
        manner: 'forceful',
        spatialRelation: 'in',
        implicitPreposition: false
      })
      .build()
  );
  
  // Rule 5: Push variations (implies forceful insertion)
  rules.push(
    new SemanticGrammarBuilder()
      .pattern('push :item in|into :container')
      .mapsTo('if.action.inserting')
      .withPrepositions({
        'in': 'in',
        'into': 'in'
      })
      .withDefaults({
        manner: 'forceful',
        spatialRelation: 'in',
        implicitPreposition: false
      })
      .build()
  );
  
  return rules;
}

/**
 * Example of how the parser would use these rules:
 * 
 * Input: "insert coin slot"
 * Match: Rule 2 (implicit preposition)
 * Result: {
 *   actionId: 'if.action.inserting',
 *   directObject: <coin>,
 *   indirectObject: <slot>,
 *   semantics: {
 *     manner: 'normal',
 *     spatialRelation: 'in',
 *     implicitPreposition: true
 *   }
 * }
 * 
 * Input: "slip card into reader"
 * Match: Rule 1 (explicit preposition)
 * Result: {
 *   actionId: 'if.action.inserting',
 *   directObject: <card>,
 *   indirectObject: <reader>,
 *   semantics: {
 *     manner: 'stealthy',
 *     spatialRelation: 'in',
 *     implicitPreposition: false
 *   }
 * }
 */