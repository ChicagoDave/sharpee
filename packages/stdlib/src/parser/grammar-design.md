# Sharpee Grammar Design Document

## Overview

The Sharpee grammar system uses pattern-based matching with enhanced features for interactive fiction. This document outlines the design decisions and implementation details.

## Core Design Principles

### 1. Action Categorization
Grammar patterns are organized by action categories:
- **Object Manipulation**: take, drop, insert, remove
- **Movement**: go, enter, exit, climb
- **Examination**: look, examine, search, read
- **Conversation**: ask, tell, give, show
- **Manipulation**: open, close, lock, unlock, push, pull
- **Clothing**: wear, remove
- **Meta**: save, restore, undo, help
- **Consumption**: eat, drink
- **Violence**: attack, break
- **Social**: kiss, wave

### 2. Inline Synonyms
All verb synonyms are included directly in the pattern:
```
'take|get|pick up|grab|carry|hold <noun>'
```
This makes patterns self-documenting and easier to understand.

### 3. Scope Hints
Patterns can specify preferred object scope using colon notation:
```
<noun:held>      // Prefer items in inventory
<noun:here>      // Prefer items in current location
<noun:worn>      // Prefer worn items
<noun:container> // Prefer containers
<noun:person>    // Prefer people/NPCs
```

### 4. Compound Commands
Support for multiple objects and exclusions:
```
<noun+>          // One or more: "take lamp and key"
<noun*>          // Zero or more: "drop all"
all|everything (except|but) <noun+>  // "take all except sword"
```

### 5. Pattern Priority
Patterns have optional priority values:
- Higher priority patterns match first
- Prevents generic patterns from overriding specific ones
- Example: "look" (100) before direction-only "n" (50)

## Grammar Features

### Object Iteration
```typescript
{
  pattern: 'take|get <noun+:here>',
  iterateObjects: true  // Apply to each object
}
```
Generates multiple commands: "take lamp and key" → two taking commands

### Reversed Arguments
```typescript
{
  pattern: 'give <second:person> <noun:held>',
  reversed: true  // Arguments swapped from canonical order
}
```
Handles natural variations: "give Bob the key" vs "give the key to Bob"

### Text Capture
```typescript
{
  pattern: 'ask <noun:person> about <topic>',
  textCapture: 'topic'  // Capture free text
}
```
For conversation topics and consulting books

### Meta Commands
```typescript
{
  pattern: 'save',
  meta: true  // Bypasses normal turn processing
}
```
Game control commands that don't advance time

## Implementation Details

### Pattern Matching Process
1. Clean input and convert to lowercase
2. Match against patterns in priority order
3. Extract placeholders (<noun>, <second>, etc.)
4. Apply scope hints to scoring
5. Handle disambiguation if needed
6. Generate command objects

### Scope Hint Scoring
When a pattern includes scope hints:
- Objects matching the hint get +50 bonus points
- Non-matching objects get -20 penalty
- Ensures preferred objects rank higher

### Compound Parsing
For patterns with <noun+>:
1. Split on conjunctions ("and", ",")
2. Parse each object separately
3. Check for "all" or "everything"
4. Handle except clauses
5. Generate command for each object

### Error Handling
- **No match**: "I don't understand that command."
- **Object not found**: "I don't see any brass key here."
- **Missing second noun**: "What do you want to unlock it with?"
- **Disambiguation needed**: "Which key do you mean?"

## Usage Examples

### Basic Commands
```
> take key
> drop all except sword
> put coins in chest
> ask wizard about portal
```

### Scope Preferences
```
> wear ring     // Prefers wearable items
> open door     // Prefers openable items
> give apple to horse  // Apple must be held, horse must be person
```

### Compound Commands
```
> take lamp and sword and shield
> drop all but food
> examine table and chairs
```

## Localization Considerations

Each language provides:
1. Translated patterns with local verb forms
2. Language-specific prepositions
3. Cultural action variants
4. Local abbreviations and shortcuts

Spanish example:
```typescript
{
  pattern: 'tomar|coger|agarrar <noun+:here>',
  action: 'taking'
}
```

## Future Enhancements

### Planned Features
1. **Optional words**: `look (at) <noun>`
2. **Number support**: `take 3 coins`
3. **Partial matching**: Suggest corrections for typos
4. **Context-sensitive patterns**: Different actions based on game state

### Possible Extensions
1. **Adverb support**: `go north quickly`
2. **Complex conditions**: `take all coins except gold ones`
3. **Multi-step commands**: `go north then take key then return`
4. **Implicit objects**: `unlock door` → find suitable key

## Best Practices

### For Pattern Authors
1. List most common verb first
2. Include all reasonable synonyms
3. Use appropriate scope hints
4. Set priority for ambiguous patterns
5. Keep patterns readable

### For Game Authors
1. Override standard patterns sparingly
2. Add game-specific patterns after standard ones
3. Use consistent action names
4. Provide helpful error messages
5. Test compound commands thoroughly

## Conclusion

The Sharpee grammar system balances simplicity with power. Authors can understand and extend patterns easily, while the system handles complex parsing needs for modern IF. The scope hint system and compound command support make it more sophisticated than traditional IF parsers while remaining approachable.
