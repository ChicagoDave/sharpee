# Semantic Grammar Rules: Embedding Meaning in Parsing

## The Insight
Instead of parsing syntax then interpreting semantics separately, what if grammar rules directly produced semantic outcomes?

## Current Grammar Rules (Syntax Only)
```typescript
// Current: Grammar identifies structure
const dropRule: GrammarRule = {
  pattern: 'VERB(drop|discard|throw) NOUN',
  action: 'dropping',
  slots: ['directObject']
};
```

## Proposed: Grammar Rules with Semantic Outcomes
```typescript
// Proposed: Grammar maps to semantics directly
const dropRule: SemanticGrammarRule = {
  pattern: 'VERB(drop|discard|throw) NOUN',
  action: 'dropping',
  slots: ['directObject'],
  
  // Semantic mappings embedded in rule
  semantics: {
    manner: {
      'drop': 'normal',
      'discard': 'careless', 
      'throw': 'forceful'
    }
  }
};

const goRule: SemanticGrammarRule = {
  pattern: 'VERB(go|walk|run) DIRECTION',
  action: 'going',
  
  semantics: {
    manner: {
      'go': 'normal',
      'walk': 'normal',
      'run': 'quick'
    },
    direction: {
      'n|north': 'north',
      's|south': 'south',
      'u|up': 'up',
      'd|down': 'down'
    }
  }
};
```

## More Sophisticated Example
```typescript
const putRule: SemanticGrammarRule = {
  pattern: 'VERB(put|place|insert) NOUN PREP(on|onto|in|into|under) NOUN',
  action: 'putting',
  slots: ['directObject', 'indirectObject'],
  
  semantics: {
    manner: {
      'put': 'normal',
      'place': 'careful',
      'jam': 'forceful',
      'slip': 'stealthy'
    },
    spatialRelation: {
      'on|onto': 'on',
      'in|into': 'in',
      'under|beneath|below': 'under'
    },
    // Can even have conditional semantics
    special: (match) => {
      if (match.verb === 'slip' && match.prep === 'into') {
        return { stealth: true };
      }
    }
  }
};
```

## Grammar Builder API with Semantics
```typescript
// Fluent API for building semantic grammar rules
grammar
  .rule('dropping')
  .pattern('VERB NOUN')
  .withVerbs({
    'drop': { manner: 'normal' },
    'discard': { manner: 'careless' },
    'throw': { manner: 'forceful' },
    'place': { manner: 'careful' },
    'chuck': { manner: 'careless', force: 'high' }
  })
  .mapSlot('directObject', 'NOUN')
  .produces((match, semantics) => ({
    action: 'dropping',
    directObject: match.noun,
    manner: semantics.manner,
    force: semantics.force
  }));

// Direction-based movement
grammar
  .rule('directional-movement')
  .pattern('DIRECTION')
  .withDirections({
    'n|north': { direction: 'north' },
    's|south': { direction: 'south' },
    'ne|northeast': { direction: 'northeast' },
    'u|up|upward|upwards': { direction: 'up', vertical: true },
    'd|down|downward|downwards': { direction: 'down', vertical: true }
  })
  .produces((match, semantics) => ({
    action: 'going',
    direction: semantics.direction,
    isVertical: semantics.vertical || false
  }));
```

## Parser Output with Embedded Semantics
```typescript
interface SemanticParseResult {
  // Syntax (as before)
  tokens: Token[];
  structure: CommandStructure;
  pattern: string;
  
  // Semantics (from grammar rules)
  semantics: {
    action: string;
    manner?: ActionManner;
    direction?: Direction;
    spatialRelation?: SpatialRelation;
    
    // Action-specific semantics
    custom?: Record<string, any>;
  };
}

// Example parse result
{
  tokens: [...],
  structure: {
    verb: { text: "discard" },
    directObject: { text: "sword" }
  },
  pattern: "VERB NOUN",
  
  // Semantics came from grammar rule
  semantics: {
    action: "dropping",
    manner: "careless"  // Grammar rule knew discard = careless
  }
}
```

## Benefits of Semantic Grammar

### 1. Declarative Semantics
- Semantics defined with grammar, not in code
- Easier to see what words mean what
- Story authors can customize both together

### 2. Single Source of Truth
- No separate interpretation phase
- Grammar IS the semantic definition
- Less chance of mismatch

### 3. Performance
- Semantics computed during parsing
- No separate interpretation pass
- Single traversal of input

### 4. Extensibility
```typescript
// Stories can extend grammar with custom semantics
story.extendGrammar({
  rule: 'magic-casting',
  pattern: 'VERB(cast|invoke|summon) SPELL',
  semantics: {
    power: {
      'cast': 'normal',
      'invoke': 'strong',
      'summon': 'ultimate'
    }
  }
});
```

### 5. Better Error Messages
```typescript
// Grammar knows semantic intent
"I don't understand 'yeet' as a way to drop things"
// vs
"I don't understand 'yeet'"
```

## Implementation Approach

### Phase 1: Extend Grammar Definition
```typescript
interface SemanticGrammarRule extends GrammarRule {
  // Semantic mappings
  semantics?: {
    // Verb variations to semantic properties
    verbs?: Record<string, SemanticProperties>;
    
    // Direction mappings
    directions?: Record<string, Direction>;
    
    // Preposition mappings
    prepositions?: Record<string, SpatialRelation>;
    
    // Custom semantic extraction
    custom?: (match: ParseMatch) => any;
  };
}
```

### Phase 2: Update Parser
```typescript
class Parser {
  parse(input: string): SemanticParseResult {
    // Match against grammar rules
    const rule = this.findMatchingRule(input);
    const match = this.extractParts(input, rule);
    
    // Apply semantic mappings from rule
    const semantics = this.applySemantics(match, rule.semantics);
    
    return {
      ...match,
      semantics
    };
  }
}
```

### Phase 3: Simplify Pipeline
```
Before: Parse → Validate → Interpret → Action
After:  Parse (with semantics) → Validate → Action
```

The validator just resolves entities, and actions receive semantic properties directly from the parser.

## Challenges to Consider

### 1. Grammar Complexity
- Rules become larger with semantic definitions
- Need good organization/modularity

### 2. Dynamic Semantics
- What if semantics depend on world state?
- "take the hot potato" - manner should be 'quick'

### 3. Ambiguity
- Multiple rules might match with different semantics
- Need precedence/scoring system

### 4. Debugging
- Harder to debug when grammar does more
- Need good tooling to visualize rules

## Example: Complete Rule Set
```typescript
// Define semantic constants
const Manner = {
  NORMAL: 'normal',
  CAREFUL: 'careful',
  CARELESS: 'careless',
  FORCEFUL: 'forceful'
} as const;

// Define rules with semantics
const rules: SemanticGrammarRule[] = [
  {
    id: 'drop-basic',
    pattern: 'VERB NOUN',
    verbs: ['drop', 'discard', 'throw', 'place'],
    action: 'dropping',
    semantics: {
      verbs: {
        'drop': { manner: Manner.NORMAL },
        'discard': { manner: Manner.CARELESS },
        'throw': { manner: Manner.FORCEFUL },
        'place': { manner: Manner.CAREFUL }
      }
    }
  },
  
  {
    id: 'put-spatial',
    pattern: 'VERB NOUN PREP NOUN',
    verbs: ['put', 'place', 'insert'],
    action: 'putting',
    semantics: {
      verbs: {
        'put': { manner: Manner.NORMAL },
        'place': { manner: Manner.CAREFUL }
      },
      prepositions: {
        'on': 'on',
        'onto': 'on',
        'in': 'in',
        'into': 'in',
        'under': 'under'
      }
    }
  }
];
```

## The Key Question

Should semantic interpretation be:
1. **Part of grammar** (parser's job)
2. **Separate phase** (interpreter's job)
3. **Part of validation** (validator's job)
4. **Part of actions** (action's job)

Embedding in grammar means:
- ✅ Single source of truth
- ✅ Declarative configuration
- ✅ Story customization is easier
- ❌ Grammar rules more complex
- ❌ Parser does more work
- ❌ Harder to test in isolation

This approach treats the grammar as not just syntax rules but as a complete linguistic model that understands meaning, not just structure.