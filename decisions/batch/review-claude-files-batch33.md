# Sharpee Architecture Decisions - Batch 33

## File: 2025-05-27-16-05-09.json
**Topic**: Refactoring an Interactive Fiction Parser - Cold Analysis

### Decision: Commit to Pattern-Based Parser

**Context**: Cold, dispassionate analysis of parser implementation after refactoring.

**Analysis**: 
Found two parser systems coexisting:
1. IF-specific pattern-based parser (`IFParser`)
2. Linguistic analysis system (POS tagging, phrase identification)

**Decision**: 
Consolidate around the pattern-based parser and archive linguistic components.

**Rationale**:
- Linguistic analysis is overengineering for IF needs
- Most IF commands follow simple patterns
- Pattern-based approach is more author-friendly
- Complex linguistics intimidate non-programmer authors

### Decision: Simplify Language Support Architecture

**Context**: Language system too complex with full linguistic analysis.

**Proposed Architecture**:
```typescript
interface LanguageData {
  patterns: GrammarPattern[];
  articles: string[];
  pronouns: string[];
  prepositions: string[];
  normalize(word: string): string;
}
```

**Key Changes**:
- No POS tagging or phrase identification
- Just data needed for pattern matching
- Simple word normalization rules
- Language provides data, not analysis

**Rationale**: Simpler, more maintainable, easier for authors to understand.

### Decision: Parser-World Model Integration

**Context**: Parser exists in isolation without world model connection.

**Missing Integration Points**:
1. No connection to `IFWorld`
2. No command execution pipeline
3. No event/channel system integration
4. No scope calculation usage

**Recommendation**:
- Parser should work directly with `IFWorld`
- Use world's scope calculation
- Return executable commands
- Flow through event system

**Rationale**: Parser needs to be part of the larger system, not standalone.

### Decision: Archive Linguistic Components

**Context**: Implementing the decision to remove linguistic complexity.

**Archived Components**:
- POS tagging system
- Phrase identification
- Grammar analysis
- Parse tree generation
- Complex tokenizers

**Created**:
- `archive-linguistic-parser.ps1` script
- Simplified `language-data.ts`
- Minimal English language support
- Pattern-based parser documentation

**Rationale**: Clean codebase focused on IF-specific needs.

## File: 2025-05-27-16-47-28.json
**Topic**: Sharpee Interactive Fiction Refactoring - Grammar Implementation

### Decision: Enhanced Grammar System Architecture

**Context**: After parser refactoring, need to implement enhanced grammar features based on Inform 10.

**Grammar Pattern Structure**:
```typescript
interface GrammarPattern {
  pattern: string;           // "take <noun:held>"
  action: string;           // "taking"
  priority: number;         // 0-100
  category: PatternCategory;
  scopeHints?: ScopeHint[];
}
```

**Key Features**:
1. **Scope Hints** - `<noun:held>`, `<noun:container>`
2. **Compound Commands** - "take lamp and key"
3. **Pattern Priorities** - Resolve conflicts
4. **Standard Patterns** - Based on Inform 10

**Rationale**: Provides sophisticated parsing while remaining author-friendly.

### Decision: Scope Hint System

**Context**: Reduce disambiguation by providing hints about expected object types.

**Scope Hint Types**:
- HELD - In player's inventory
- CONTAINER - Is a container
- SUPPORTER - Is a supporter
- PERSON - Is a person
- DOOR - Is a door
- VISIBLE/REACHABLE - Scope constraints

**Scoring Algorithm**:
- Base score from text matching
- +50 bonus for matching scope hint
- Context bonuses (recently mentioned, etc.)

**Rationale**: Dramatically reduces need for disambiguation dialogues.

### Decision: Grammar Registry Pattern

**Context**: Need flexible system for managing grammar patterns.

**Implementation**:
- `GrammarRegistry` class manages all patterns
- Patterns indexed by verb for fast lookup
- Priority-based ordering
- Category-based organization
- Support for pattern aliases

**Benefits**:
- Fast pattern matching
- Easy to add/remove patterns
- Extensible by authors
- Clear organization

**Rationale**: Provides structure while maintaining flexibility.

### Decision: Standard Grammar Implementation

**Context**: Implementing Inform 10 standard patterns.

**Core Pattern Categories**:
1. **Object Manipulation** - take, drop, put, insert
2. **Movement** - go, enter, exit, climb
3. **Examination** - examine, look, search
4. **Container Operations** - open, close, lock, unlock
5. **Conversation** - ask, tell, say
6. **Complex Actions** - give to, show to, put on

**Implementation Order**:
1. Grammar pattern structure
2. Standard patterns
3. Scope hint system
4. Parser enhancement
5. Compound commands
6. Testing & refinement

**Rationale**: Provides comprehensive IF command coverage from day one.

## Next Review Files
- [ ] 2025-05-27-17-10-29.json
- [ ] 2025-05-27-20-24-13.json
- [ ] 2025-05-27-21-30-12.json
- [ ] 2025-05-27-21-53-12.json