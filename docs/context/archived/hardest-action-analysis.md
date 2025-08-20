# Finding the Hardest Action for Semantic Grammar Test

## What Makes an Action "Hard"?

1. **Multiple semantic dimensions** - Not just one property
2. **Complex grammar patterns** - Multiple valid forms
3. **Context-dependent semantics** - Meaning changes based on objects
4. **Parser extras usage** - Heavy reliance on parser internals
5. **Conditional logic** - Behavior varies significantly

## The Contenders

### INSERTING (Highest Complexity) ⭐⭐⭐⭐⭐

Currently INSERTING is a mess - it actually modifies the parsed command to redirect to PUTTING:

```typescript
// Current horror in inserting.ts
const modifiedCommand: ValidatedCommand = {
  ...context.command,
  parsed: {
    ...context.command.parsed,
    structure: {
      ...context.command.parsed.structure,
      preposition: { 
        tokens: [], 
        text: 'in'  // Forces preposition!
      }
    }
  }
};

// Then calls putting with modified command
const puttingContext = {
  ...context,
  command: modifiedCommand
};
return puttingAction.execute(puttingContext);
```

**Why it's hard:**
- Modifies parsed command structure (!)
- Redirects to another action
- Needs to understand spatial semantics
- Grammar ambiguity: "insert X" vs "insert X into Y"

### GOING (Directional Complexity) ⭐⭐⭐⭐

```typescript
// Multiple ways to express movement
"go north"
"n"
"go to the kitchen"
"enter"
"exit"
"go through door"
"climb up"
"go up the stairs"
```

**Why it's hard:**
- Direction can be in extras, directObject, or standalone
- Some directions are entities (doors, rooms)
- Some are abstract (north, up)
- Verb variations affect manner (walk/run/sneak)
- Special cases (enter/exit/climb)

### ATTACKING (Combat Semantics) ⭐⭐⭐⭐

```typescript
// Current complexity
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'attack';
const parsed = context.command.parsed;
const attackVerb = parsed.action || 'attack';

// Different attack types
"attack orc"
"hit orc with sword"
"strike orc"
"kill orc"
"punch orc"
"kick orc"
"shoot orc with bow"
```

**Why it's hard:**
- Weapon can be explicit or implicit
- Attack type varies by verb
- Damage/force semantics
- Body part variations (punch/kick)

### PUTTING (Spatial Relations) ⭐⭐⭐⭐

```typescript
// Spatial complexity
"put book on table"
"put book in box"
"put book under bed"
"put book behind door"
"put book beside lamp"
```

**Why it's hard:**
- Preposition determines spatial relation
- Container vs supporter logic
- Validity depends on target object
- Multiple valid prepositions per target

### CONVERSATION ACTIONS (Removed but Instructive) ⭐⭐⭐⭐⭐

```typescript
// TELLING/ASKING complexity
const topic = context.command.parsed.extras?.topic || 
              context.command.parsed.structure.preposition?.text ||
              context.command.indirectObject?.parsed.text;

// Many forms
"tell bob about treasure"
"ask bob about treasure"
"tell bob 'hello'"
"say hello to bob"
"answer yes"
```

**Why they're hard:**
- Topic extraction from multiple sources
- Quote handling
- Direct vs indirect speech
- Topic vs literal text

## The Winner: INSERTING

**INSERTING is the hardest because:**

1. **It's architecturally broken** - Currently hacks the parsed command
2. **Semantic ambiguity** - "insert" implies "into" but where?
3. **Grammar variations**:
   - "insert coin" (into what?)
   - "insert coin into slot"
   - "insert coin in slot"
4. **Redirect complexity** - Calls another action
5. **Spatial semantics** - Must understand containment

## Why INSERTING is the Perfect Test Case

### Current Problems to Solve

1. **Command modification hack**
```typescript
// This is terrible - modifying parsed command!
parsed: {
  ...context.command.parsed,
  structure: {
    ...context.command.parsed.structure,
    preposition: { text: 'in' }
  }
}
```

2. **Implicit semantics**
- "insert X" implies "into something"
- But into what? The first container in scope?

3. **Action coupling**
- INSERTING depends on PUTTING
- Has to know PUTTING's interface

### Semantic Grammar Solution

```typescript
const insertingRules: SemanticGrammarRule[] = [
  {
    id: 'insert-implicit',
    pattern: 'VERB(insert|slot|slide) NOUN',
    action: 'inserting',
    semantics: {
      spatialRelation: 'in',  // Always means "in/into"
      targetMode: 'implicit',  // Find suitable container
      manner: {
        'insert': 'normal',
        'slot': 'careful',
        'jam': 'forceful',
        'slide': 'smooth'
      }
    }
  },
  
  {
    id: 'insert-explicit',
    pattern: 'VERB(insert|slot|slide) NOUN PREP(in|into) NOUN',
    action: 'inserting',
    semantics: {
      spatialRelation: 'in',
      targetMode: 'explicit',
      manner: {
        'insert': 'normal',
        'slot': 'careful',
        'jam': 'forceful'
      }
    }
  },
  
  // This is really putting!
  {
    id: 'insert-redirect',
    pattern: 'VERB(insert) NOUN PREP(on|onto|under) NOUN',
    action: 'putting',  // Different action!
    semantics: {
      spatialRelation: '$PREP',  // Use actual preposition
      manner: 'normal'
    }
  }
];
```

### Benefits of Solving INSERTING

1. **Eliminates command modification hack**
2. **Grammar determines action routing** (insert+on → putting)
3. **Implicit semantics made explicit**
4. **Clean separation of concerns**
5. **Type-safe spatial relations**

## Test Specification for INSERTING

### Phase 1: Grammar Rules
```typescript
// Grammar understands that "insert" implies containment
{
  pattern: 'VERB(insert) NOUN',
  semantics: {
    spatialRelation: 'in',
    requiresContainer: true,
    findContainer: 'auto'  // Find suitable container
  }
}
```

### Phase 2: Semantic Interpretation
```typescript
// Parser output for "insert coin"
{
  semantics: {
    action: 'inserting',
    spatialRelation: 'in',
    requiresContainer: true,
    findContainer: 'auto'
  }
}
```

### Phase 3: Action Refactor
```typescript
class InsertingAction {
  validate(context: ActionContext): ValidationResult {
    const semantics = context.command.semantics;
    
    // Use semantics instead of hacking command
    if (semantics.findContainer === 'auto') {
      // Find suitable container
      const container = this.findSuitableContainer(context);
      if (!container) {
        return { valid: false, error: 'no_container' };
      }
    }
    
    // No command modification!
    return { valid: true };
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    // Use semantics directly
    const spatialRelation = context.command.semantics.spatialRelation;
    
    // No redirect to putting - handle directly
    // Or emit event that putting can handle
  }
}
```

## Alternative: GOING as Hardest

GOING could also be considered hardest because:
- 13 uses of parsed.extras.direction
- Complex direction resolution
- Entity vs abstract directions
- Movement manner variations

But INSERTING wins because it has an actual architectural problem (command modification) that semantic grammar would solve elegantly.

## Conclusion

**INSERTING is the hardest action** because:
1. It currently hacks the parsed command (architectural smell)
2. It has implicit semantics (insert → into)
3. It redirects to another action (coupling)
4. It has complex spatial semantics

Successfully refactoring INSERTING would prove that semantic grammar can:
- Eliminate parser hacking
- Make implicit semantics explicit
- Route to correct actions based on grammar
- Handle complex spatial relations

If we can fix INSERTING, we can fix anything.