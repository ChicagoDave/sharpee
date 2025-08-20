# Semantic Constants Approach

## Core Idea
Instead of exposing parser internals, the validator converts everything to semantic constants that actions understand.

## Examples of Semantic Conversion

### 1. Movement Direction
```typescript
// Instead of:
const direction = command.extras?.direction as string; // "north", "n", "up", etc.

// We have:
type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'in' | 'out';
interface MovementCommand extends ValidatedCommand {
  direction: Direction;
}
```

### 2. Action Style/Manner
```typescript
// Instead of:
if (command.parsed.structure.verb?.text === 'discard') { }

// We have:
type ActionManner = 'normal' | 'careful' | 'careless' | 'forceful' | 'gentle';
interface ValidatedCommand {
  manner?: ActionManner;
}

// Validator maps verbs to manner:
// "drop" -> 'normal'
// "discard" -> 'careless'
// "place" -> 'careful'
```

### 3. Spatial Relations
```typescript
// Instead of:
const prep = command.parsed.structure.preposition?.text; // "on", "in", "under"

// We have:
type SpatialRelation = 'on' | 'in' | 'under' | 'behind' | 'beside';
interface ValidatedCommand {
  spatialRelation?: SpatialRelation;
}
```

### 4. Conversation Topics
```typescript
// Instead of:
const topic = command.extras?.topic; // any string

// We have:
interface ConversationCommand extends ValidatedCommand {
  topic: string; // Still string, but validated/normalized
  topicType: 'subject' | 'object' | 'abstract';
}
```

## Implementation Architecture

### Layer 1: Parser Output (Raw)
```typescript
interface IParsedCommand {
  structure: {
    verb: { text: "discard" },
    preposition: { text: "onto" }
  },
  extras: { direction: "n" }
}
```

### Layer 2: Semantic Interpretation (Validator)
```typescript
class CommandValidator {
  private interpretManner(verb: string): ActionManner {
    const mannerMap: Record<string, ActionManner> = {
      'drop': 'normal',
      'discard': 'careless',
      'throw': 'forceful',
      'place': 'careful',
      'put': 'normal'
    };
    return mannerMap[verb.toLowerCase()] || 'normal';
  }

  private interpretDirection(dir: string): Direction {
    const directionMap: Record<string, Direction> = {
      'n': 'north',
      'north': 'north',
      'up': 'up',
      'u': 'up',
      // etc.
    };
    return directionMap[dir.toLowerCase()] || null;
  }

  private interpretSpatialRelation(prep: string): SpatialRelation {
    const spatialMap: Record<string, SpatialRelation> = {
      'on': 'on',
      'onto': 'on',
      'in': 'in',
      'into': 'in',
      'under': 'under',
      'beneath': 'under',
      'below': 'under'
    };
    return spatialMap[prep.toLowerCase()];
  }
}
```

### Layer 3: Action Interface (Clean)
```typescript
interface SemanticCommand {
  actionId: string;
  directObject?: ResolvedEntity;
  indirectObject?: ResolvedEntity;
  
  // Semantic properties (no parser details)
  manner?: ActionManner;
  direction?: Direction;
  spatialRelation?: SpatialRelation;
  
  // For action-specific needs
  parameters?: ActionParameters;
}

interface ActionParameters {
  // Strongly typed per action
}

interface GoingParameters extends ActionParameters {
  direction: Direction; // Required for going
}

interface SavingParameters extends ActionParameters {
  slot?: string;
  quick?: boolean;
  force?: boolean;
}
```

## Benefits

1. **True Decoupling**: Actions never see parser internals
2. **Type Safety**: Everything is strongly typed enums/constants
3. **Validation**: Invalid values caught at validation time
4. **Consistency**: "n", "north", "NORTH" all become Direction.NORTH
5. **Documentation**: Clear what values are possible
6. **Testing**: Can test with constants, not magic strings
7. **Parser Independence**: Can swap parsers without changing actions

## Challenges

### 1. Where to Define Constants?
- **Option A**: In if-domain (shared constants)
- **Option B**: Per action (action-specific types)
- **Option C**: Mixed (common in if-domain, specific in actions)

### 2. Extensibility
- How do custom actions add new semantic properties?
- How do extensions add new directions or manners?

### 3. Backward Compatibility
- Existing actions expect raw extras
- Need migration path

### 4. Interpretation Logic
- Where does verb → manner mapping live?
- How to make it configurable per story?

## Proposed Implementation Plan

### Phase 1: Define Core Constants
```typescript
// In if-domain/src/constants.ts
export type Direction = 'north' | 'south' | 'east' | 'west' | 
                       'up' | 'down' | 'in' | 'out' |
                       'northeast' | 'northwest' | 'southeast' | 'southwest';

export type ActionManner = 'normal' | 'careful' | 'careless' | 
                          'forceful' | 'gentle' | 'quick' | 'slow';

export type SpatialRelation = 'on' | 'in' | 'under' | 'behind' | 
                              'beside' | 'near' | 'through';
```

### Phase 2: Create Semantic Command Types
```typescript
// In if-domain/src/contracts.ts
export interface SemanticCommand {
  actionId: string;
  directObject?: EntityReference;
  indirectObject?: EntityReference;
  
  // Common semantic properties
  manner?: ActionManner;
  direction?: Direction;
  spatialRelation?: SpatialRelation;
  
  // Raw text for reference
  inputText: string;
  
  // Action-specific parameters (typed)
  parameters?: Record<string, unknown>;
}
```

### Phase 3: Add Interpretation to Validator
- Validator converts parsed command to semantic command
- Mapping functions for each semantic property
- Configurable mappings for story customization

### Phase 4: Update Actions
- Actions use semantic properties
- No more accessing parsed or extras
- Type-safe parameter access

## Example: Going Action

### Before (Current)
```typescript
const direction = context.command.parsed.extras?.direction as string || 
                 context.command.directObject?.entity?.name;
if (!direction) {
  return { valid: false, error: 'no_direction' };
}
// Hope direction is valid...
```

### After (Semantic)
```typescript
const direction = context.command.direction;
if (!direction) {
  return { valid: false, error: 'no_direction' };
}
// TypeScript knows direction is Direction type
// Validator already normalized "n" → Direction.NORTH
```

## Questions to Resolve

1. **Should manner be per-action or global?**
   - Global: Any action can be done carefully/carelessly
   - Per-action: Only certain actions have manner

2. **How to handle story-specific interpretations?**
   - Story wants "yank" to mean forceful pulling
   - Story adds custom directions like "portal" or "starboard"

3. **What about truly dynamic extras?**
   - Save slot names
   - Conversation topics
   - Can't enumerate all possible values

4. **Should we version the semantic model?**
   - SemanticCommandV1, SemanticCommandV2?
   - Or extend through optional properties?

This approach is more work upfront but creates a much cleaner, type-safe boundary between parsing and action execution.