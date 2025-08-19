# Parsed Command Usage Analysis

## Summary of Access Patterns

After analyzing all actions in stdlib, here's what they access from `context.command.parsed`:

### 1. Most Common: extras.direction (13 uses)
- Used by: going, pushing, pulling, climbing, turning, switching
- Pattern: `context.command.parsed.extras?.direction as string`
- Purpose: Get directional movement (north, up, left, clockwise)

### 2. Structure Fields

#### verb.text (10 uses)
- Pattern: `context.command.parsed.structure.verb?.text.toLowerCase()`
- Used for verb variations:
  - "look" vs "examine" 
  - "drop" vs "discard"
  - "eat" vs "consume"
  - "drink" vs "sip"
  - "attack" vs "hit"
  - "inventory" vs "i" vs "inv"
  - "turn" vs "rotate"
  - "touch" vs "feel"

#### preposition.text (2 uses)
- Pattern: `context.command.parsed.structure.preposition?.text`
- Used by: putting, inserting
- Purpose: Determine spatial relationship (on/in/under)

### 3. Other extras Fields

#### Save/Restore Related
- `extras.name` / `extras.slot` - save slot name
- `extras.quick` - quick save flag
- `extras.auto` - auto save flag
- `extras.force` - force overwrite
- `extras.now` - immediate action

#### Help/Settings
- `extras.topic` - help topic
- `extras.mode` - display mode for about
- `extras.setting` - setting name to change

### 4. Direct action Field (4 uses)
- Pattern: `context.command.parsed.action`
- Checks for specific actions like 'reset', 'exit'

### 5. Full parsed Object (2 uses)
- inserting action creates modified command with new preposition
- Pattern: spreads `...context.command.parsed` to modify structure

## Key Insights

1. **Most access is to extras object** - This is where parser puts additional semantic info
2. **Verb text is used for variations** - Different verbs trigger slightly different behavior
3. **Preposition only needed by spatial actions** - putting/inserting care about on/in/under
4. **Some actions check parsed.action directly** - Seems redundant with actionId

## What Actions Really Need

Based on this analysis, actions need:

```typescript
interface SimplifiedCommand {
  // Core (already have via ValidatedCommand)
  actionId: string;
  directObject?: ResolvedEntity;
  indirectObject?: ResolvedEntity;
  
  // From parsed.structure  
  verb?: string;         // The actual verb used
  preposition?: string;  // Spatial relationship
  
  // From parsed.extras (most common fields)
  direction?: string;    // Movement direction
  topic?: string;        // Help/conversation topic
  
  // From parsed
  rawText: string;       // Original input
  
  // Generic extras for less common fields
  extras?: Record<string, any>;
}
```

## The Problem with Current Approach

Actions are accessing `parsed.extras` which is:
1. **Parser-specific** - Different parsers might structure extras differently
2. **Untyped** - Everything is `any`, no type safety
3. **Implementation detail** - Actions shouldn't know about parser internals

## Recommendations

### Option 1: Flatten Common Fields
Add the commonly used fields directly to ValidatedCommand:
- `verb`, `preposition`, `direction`, `topic` as first-class properties
- Keep `extras` for uncommon fields
- Gradually migrate actions to use flat fields

### Option 2: Typed Extras
Create typed interfaces for extras:
```typescript
interface MovementExtras {
  direction?: string;
}

interface SaveExtras {
  slot?: string;
  quick?: boolean;
  force?: boolean;
}
```

### Option 3: Action-Specific Context
Each action declares what extras it needs:
```typescript
interface GoingContext extends ActionContext {
  direction?: string;
}
```

I recommend **Option 1** - flatten the common fields. It's simple, backward compatible, and makes the common cases easy.