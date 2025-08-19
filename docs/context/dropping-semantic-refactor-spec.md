# DROPPING Action: Semantic Grammar Refactor Specification

## Executive Summary

Refactor the DROPPING action to use semantic properties from grammar rules instead of directly checking verb text. This serves as a proof of concept for embedding semantics in grammar definitions.

## Current State Analysis

### How DROPPING Currently Works

```typescript
// In dropping.ts validate():
// No verb checking during validation

// In dropping.ts execute():
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drop';
if (verb === 'discard') {
  messageId = 'dropped_carelessly';
} else if (verb === 'throw') {
  messageId = 'thrown';
} else {
  messageId = 'dropped';
}
```

### Problems with Current Approach

1. **Parser Coupling**: Action reaches into `parsed.structure.verb.text`
2. **Magic Strings**: Verb names hardcoded in action logic
3. **No Type Safety**: `verb?.text` could be anything
4. **Scattered Logic**: Verb interpretation in action, not centralized
5. **Hidden Semantics**: Not clear what verbs are supported without reading code

## Proposed Solution

### 1. Semantic Grammar Rule Definition

```typescript
interface DroppingSemantics {
  manner: 'normal' | 'careful' | 'careless' | 'forceful';
  sound?: 'quiet' | 'normal' | 'loud';
  distance?: 'near' | 'far';
}

const droppingGrammarRule: SemanticGrammarRule = {
  id: 'drop-basic',
  pattern: 'VERB NOUN',
  action: 'dropping',
  
  // Semantic mappings embedded in grammar
  semantics: {
    verbs: {
      // Standard dropping
      'drop': { 
        manner: 'normal',
        sound: 'normal',
        distance: 'near'
      },
      
      // Careless variations
      'discard': { 
        manner: 'careless',
        sound: 'normal',
        distance: 'near'
      },
      'dump': { 
        manner: 'careless',
        sound: 'loud',
        distance: 'near'
      },
      
      // Forceful variations
      'throw': { 
        manner: 'forceful',
        sound: 'loud',
        distance: 'far'
      },
      'hurl': { 
        manner: 'forceful',
        sound: 'loud',
        distance: 'far'
      },
      'toss': { 
        manner: 'forceful',
        sound: 'normal',
        distance: 'far'
      },
      
      // Careful variations
      'place': { 
        manner: 'careful',
        sound: 'quiet',
        distance: 'near'
      },
      'put down': { 
        manner: 'careful',
        sound: 'quiet',
        distance: 'near'
      },
      'set down': { 
        manner: 'careful',
        sound: 'quiet',
        distance: 'near'
      }
    }
  }
};
```

### 2. Parser Output with Semantics

When parser matches "discard sword":

```typescript
interface SemanticParseResult {
  // Syntactic structure (as before)
  tokens: Token[];
  structure: {
    verb: { text: "discard", tokens: [0] },
    directObject: { text: "sword", tokens: [1] }
  },
  pattern: "VERB NOUN",
  
  // Semantic interpretation (NEW)
  semantics: {
    action: "dropping",
    manner: "careless",    // From grammar rule
    sound: "normal",       // From grammar rule
    distance: "near"       // From grammar rule
  }
}
```

### 3. Command Validation Enhancement

Validator adds semantic properties to ValidatedCommand:

```typescript
interface ValidatedCommand {
  // Existing fields
  parsed: ParsedCommand;
  actionId: string;
  directObject?: ResolvedEntity;
  indirectObject?: ResolvedEntity;
  
  // NEW: Semantics from parser
  semantics: {
    manner?: ActionManner;
    sound?: SoundLevel;
    distance?: Distance;
    [key: string]: any;  // Action-specific semantics
  };
}
```

### 4. Updated DROPPING Action

```typescript
class DroppingAction {
  validate(context: ActionContext): ValidationResult {
    // Validation logic unchanged
    // Still checks if item can be dropped
    // No verb checking needed
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    const item = context.command.directObject!.entity;
    const location = context.currentLocation;
    
    // BEFORE: Check verb text
    // const verb = context.command.parsed.structure.verb?.text.toLowerCase();
    // if (verb === 'discard') { ... }
    
    // AFTER: Use semantic properties
    const manner = context.command.semantics.manner || 'normal';
    const sound = context.command.semantics.sound || 'normal';
    const distance = context.command.semantics.distance || 'near';
    
    // Select message based on semantics
    let messageId = 'dropped';  // default
    
    switch (manner) {
      case 'careless':
        messageId = 'dropped_carelessly';
        break;
      case 'forceful':
        messageId = distance === 'far' ? 'thrown_far' : 'thrown';
        break;
      case 'careful':
        messageId = 'placed_carefully';
        break;
    }
    
    // Create event with semantic information
    const eventData: DroppedEventData = {
      item: item.name,
      itemId: item.id,
      location: location.name,
      locationId: location.id,
      manner,           // Include semantics in event
      sound,           // For sound system
      distance         // For physics/animation
    };
    
    return [
      context.event('item.dropped', eventData),
      context.event('action.success', {
        messageId,
        params: { item: item.name }
      })
    ];
  }
}
```

## Benefits Demonstrated

### 1. Cleaner Action Code
- No verb text checking
- No string comparisons
- Works with semantic properties

### 2. Type Safety
```typescript
// Before: Untyped string
const verb = parsed.structure.verb?.text;  // string | undefined
if (verb === 'discard') { }  // Magic string

// After: Typed semantic property
const manner: ActionManner = semantics.manner;  // Type safe
if (manner === 'careless') { }  // Enum/literal type
```

### 3. Declarative Verb Definitions
- All verb variations defined in grammar
- Easy to see what verbs are supported
- Easy to add new variations

### 4. Richer Semantics
- Not just manner, but sound and distance too
- Can inform other systems (physics, sound, animation)
- More expressive events

### 5. Extensibility
```typescript
// Story can add custom dropping verbs
story.extendGrammar({
  rule: 'drop-basic',
  addVerbs: {
    'yeet': { 
      manner: 'forceful', 
      sound: 'loud', 
      distance: 'far',
      meme: true  // Custom property
    }
  }
});
```

## Migration Path

### Phase 1: Add Semantic Grammar Support
1. Extend GrammarRule interface with semantics field
2. Update parser to apply semantic mappings
3. Add semantics to ParsedCommand output

### Phase 2: Flow Semantics Through Pipeline
1. ValidatedCommand includes semantics from parser
2. ActionContext exposes semantics property
3. No changes to action interface required

### Phase 3: Update DROPPING Action
1. Remove verb text checking
2. Use semantics.manner instead
3. Add richer event data

### Phase 4: Verify and Test
1. Existing tests should pass (backward compatible)
2. Add tests for semantic properties
3. Add tests for each verb variation

## Test Cases

```typescript
describe('DROPPING with semantic grammar', () => {
  // Semantic mapping tests
  test.each([
    ['drop sword', 'normal'],
    ['discard sword', 'careless'],
    ['throw sword', 'forceful'],
    ['place sword', 'careful'],
    ['yeet sword', 'forceful'],  // If extended
  ])('"%s" has manner "%s"', (input, expectedManner) => {
    const parsed = parser.parse(input);
    expect(parsed.semantics.manner).toBe(expectedManner);
  });
  
  // Action behavior tests
  test('careless dropping uses careless message', () => {
    const events = executeCommand('discard sword');
    const success = events.find(e => e.type === 'action.success');
    expect(success.data.messageId).toBe('dropped_carelessly');
  });
  
  // Event data tests
  test('dropped event includes semantic properties', () => {
    const events = executeCommand('throw sword');
    const dropped = events.find(e => e.type === 'item.dropped');
    expect(dropped.data.manner).toBe('forceful');
    expect(dropped.data.distance).toBe('far');
  });
});
```

## Success Criteria

1. ✅ **No parsed access**: Action doesn't access `context.command.parsed`
2. ✅ **Type safe**: Semantic properties are typed
3. ✅ **All verbs work**: drop, discard, throw, place all produce correct output
4. ✅ **Extensible**: Can add new verbs via grammar extension
5. ✅ **Backward compatible**: Existing game commands still work
6. ✅ **Cleaner code**: Action code is simpler and more maintainable

## Open Questions

### 1. Semantic Property Naming
Should we use:
- `manner` (generic) vs `droppingManner` (specific)?
- Flat (`manner`) vs nested (`dropping.manner`)?

### 2. Default Values
- Should grammar specify defaults?
- Or should action provide defaults?

### 3. Validation Semantics
- Should validation also use semantics?
- E.g., `manner: forceful` requires item to be throwable?

### 4. Error Messages
- Should semantics affect error messages?
- "You can't carefully place the elephant" vs "You can't drop the elephant"

## Next Steps After Success

If DROPPING refactor succeeds:

1. **GOING**: Direction normalization
   - Map n→north, u→up in grammar
   - Add movement manner (walk/run/sneak)

2. **PUTTING**: Spatial relations
   - Map prepositions to spatial relations in grammar
   - Add placement manner

3. **Core Actions**: Systematic refactor
   - All actions that check verb.text
   - All actions that use extras

4. **Framework Changes**: 
   - Make semantics first-class in framework
   - Provide semantic grammar builders
   - Document patterns

## Conclusion

The DROPPING action refactor demonstrates that embedding semantics in grammar rules:
- Eliminates parser coupling in actions
- Provides type safety
- Makes verb variations declarative
- Enables richer game mechanics
- Simplifies action code

This approach transforms the parser from a syntactic analyzer to a semantic interpreter, making the entire command processing pipeline cleaner and more maintainable.