# Batch 034: Sharpee Interactive Fiction Refactoring
**Source:** claude/2025-05-27-16-47-28.json
**Date:** May 27, 2025
**Topic:** IF Platform Refactoring & Grammar Implementation

## Key Architectural Decisions

### 1. Pattern-Based Parser Finalization
- **Decision**: Locked down pattern-based parser approach, archived linguistic parser components
- **Rationale**: Simpler, more author-friendly than linguistic analysis
- **Implementation**: 
  - Archived linguistic parser to `archive/parser-linguistic/`
  - Kept useful parts (lemmatization, word lists)
  - Pattern format: `"take|get|grab <noun>"`

### 2. Enhanced Grammar System Design
- **Decision**: Implement scope hints in grammar patterns
- **Format**: `<noun:held>`, `<noun:container>`, `<noun:person>`
- **Scope Hint Types**:
  ```
  HELD = 'held'           // In player's inventory
  CONTAINER = 'container' // Is a container
  SUPPORTER = 'supporter' // Is a supporter
  ROOM = 'room'          // Is a room
  PERSON = 'person'      // Is a person
  DOOR = 'door'          // Is a door
  OPENABLE = 'openable'  // Can be opened
  LOCKABLE = 'lockable'  // Can be locked
  VISIBLE = 'visible'    // Must be visible
  REACHABLE = 'reachable'// Must be reachable
  ```

### 3. Compound Command Support
- **Decision**: Support multiple object selection in commands
- **Types**:
  - AND compounds: "take lamp and key"
  - EXCEPT compounds: "take all except sword"
  - ALL compounds: "take all"
  - LIST compounds: "take lamp, key, and sword"

### 4. Grammar Pattern Structure
```typescript
interface GrammarPattern {
  pattern: string;           // "take <noun:held>"
  action: string;           // "taking"
  priority: number;         // 0-100, higher = higher priority
  category: PatternCategory; // STANDARD, CUSTOM, SYSTEM
  scopeHints?: ScopeHint[]; // Hints for object selection
  aliases?: string[];       // Alternative phrasings
}
```

### 5. Pattern Categories
- **STANDARD**: Built-in patterns (cannot be removed)
- **LIBRARY**: From stdlib extensions
- **CUSTOM**: Author-defined patterns
- **SYSTEM**: Meta commands (save, quit, etc.)

### 6. Scoring Algorithm for Object Selection
- **Weights**:
  - Exact name match: 100
  - Synonym match: 80
  - Adjective match: +20 per adjective
  - Scope hint match: +50
  - Recently mentioned: +30
  - In same room: +20
  - Held by player: +40 (for 'held' hint)

### 7. Grammar Registry Architecture
- **Decision**: Central registry for all grammar patterns
- **Features**:
  - Verb-based indexing for fast lookup
  - Priority-based sorting
  - Support for pattern aliases
  - Category-based organization

### 8. Standard Grammar Patterns (from Inform 10)
- **Core patterns implemented**:
  ```
  // Taking
  "take|get|grab <noun>"
  "take <noun:held> off"
  "pick up <noun>" / "pick <noun> up"
  
  // Inserting/Putting
  "put <noun> in|into <noun:container>"
  "insert <noun> into <noun:container>"
  
  // Movement
  "go <direction>"
  "enter <noun:enterable>"
  "exit|leave|out"
  
  // Examining
  "examine|x|look at <noun>"
  "look in|inside <noun:container>"
  ```

### 9. Implementation Order
1. Grammar Pattern Structure
2. Standard Patterns
3. Scope Hint System
4. Parser Enhancement
5. Compound Commands
6. Testing & Refinement

## Important Code Snippets

### Grammar Config
```typescript
export const DEFAULT_GRAMMAR_CONFIG: GrammarConfig = {
  allowCustomPatterns: true,
  useScopeHints: true,
  supportCompounds: true,
  maxCompoundObjects: 10,
  defaultPriority: 50
};
```

### Pattern Normalization
- Ensures consistent pattern format
- Sets default priority if not specified
- Validates scope hints

## Status Updates
- Parser refactoring complete, linguistic components archived
- Grammar design complete based on Inform 10
- Implementation of enhanced grammar features started
- Created grammar types and registry structure

## Next Actions
1. Complete grammar registry implementation
2. Implement standard Inform 10 patterns
3. Integrate grammar with existing parser
4. Add compound command parsing
5. Implement scope hint scoring
