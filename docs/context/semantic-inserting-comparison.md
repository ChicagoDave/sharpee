# INSERTING Action: Before and After Semantic Grammar

## The Problem: Command Modification Hack

### Before (Current Implementation)
```typescript
// The action modifies the parsed command to add implicit 'in' preposition
const modifiedCommand = {
  ...context.command,
  parsed: {
    ...context.command.parsed,
    structure: {
      ...context.command.parsed.structure,
      preposition: { 
        tokens: [], 
        text: 'in' 
      }
    },
    preposition: 'in'
  }
};

// Then delegates to putting action
const modifiedContext = createActionContext(
  context.world,
  context.player,
  puttingAction,
  modifiedCommand
);

return puttingAction.execute(modifiedContext);
```

**Problems:**
1. **Architectural violation** - Actions shouldn't modify parsed data
2. **Tight coupling** - Action knows parser internal structure
3. **Delegation complexity** - Creates new contexts and delegates
4. **Lost semantics** - Can't differentiate "insert" from "put"

## The Solution: Semantic Grammar

### Grammar Rules with Semantics
```typescript
// Rule for "insert X Y" (implicit 'into')
new SemanticGrammarBuilder()
  .pattern('insert :item :container')
  .mapsTo('if.action.inserting')
  .withDefaults({
    spatialRelation: 'in',      // Grammar knows this means "in"
    implicitPreposition: true   // Flag that preposition was implicit
  })
  .build()

// Rule for "slip X into Y" (stealthy insertion)
new SemanticGrammarBuilder()
  .pattern('slip :item into :container')
  .mapsTo('if.action.inserting')
  .withDefaults({
    manner: 'stealthy',
    spatialRelation: 'in'
  })
  .build()
```

### After (Semantic Implementation)
```typescript
// Action receives clean semantic properties
const semantics = context.command.semantics || {};

// Semantic validation
if (semantics.manner === 'forceful' && container.hasAttribute('fragile')) {
  return { valid: false, error: 'would_damage' };
}

// Semantic-based execution
let messageId = 'inserted';
if (semantics.manner === 'forceful') {
  messageId = 'inserted_forcefully';
} else if (semantics.manner === 'stealthy') {
  messageId = 'inserted_stealthily';
}

// Handle implicit preposition for clearer feedback
if (semantics.implicitPreposition) {
  messageId = 'inserted_into'; // More explicit response
}
```

## Benefits

### 1. Clean Architecture
- **Before**: Action modifies parser internals
- **After**: Action receives semantic properties

### 2. No Parser Coupling
- **Before**: Knows about `parsed.structure.preposition.text`
- **After**: Uses `semantics.spatialRelation`

### 3. Rich Behavior
- **Before**: All insertions are the same
- **After**: Different behavior for forceful/stealthy/careful

### 4. Self-Contained
- **Before**: Delegates to putting action
- **After**: Handles its own logic

### 5. Interface Alignment
- **Before**: Needs access to parser internals
- **After**: Works with clean IActionContext interface

## Example Interactions

### Input: "insert coin slot"
**Before**: 
- Modifies command to add 'in' preposition
- Delegates to putting
- Generic "You put the coin in the slot" message

**After**:
- Receives `implicitPreposition: true`
- Handles directly
- Clear "You insert the coin into the slot" message

### Input: "jam card reader"
**Before**:
- No way to know this is forceful
- Same as "insert card reader"

**After**:
- Receives `manner: 'forceful'`
- Can play sound effects
- Message: "You forcefully jam the card into the reader. *CLUNK*"

### Input: "slip note pocket"
**Before**:
- No way to know this is stealthy
- Same as "insert note pocket"

**After**:
- Receives `manner: 'stealthy'`
- Quiet sound effects
- Message: "You discreetly slip the note into the pocket."

## Integration with Interface Refactoring

The semantic grammar approach perfectly complements the I-prefix interface refactoring:

1. **Clean Contracts**: IActionContext doesn't need parser details
2. **Simple CommandInput**: Just entities and semantics
3. **No Type Coupling**: Actions don't import parser types
4. **Testable**: Can test with semantic properties directly

## Next Steps

1. **Implement parser support** for semantic grammar rules
2. **Update INSERTING** to use semantic version
3. **Apply pattern** to other problematic actions:
   - GOING (direction normalization)
   - DROPPING (manner variations)
   - PUTTING (spatial relations)
4. **Complete Phase 3** of interface refactoring with semantic-aware interfaces