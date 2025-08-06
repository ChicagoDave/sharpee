# ADR-006: Use Const Objects Instead of Enums

## Status
Accepted

## Date
2025-06-30

## Context
During Phase 3.7 refactoring, we encountered TypeScript enums in the codebase (e.g., `PartOfSpeech`). This violates our established development standards which prefer const objects over enums.

TypeScript enums have several issues:
- They generate runtime code (not just types)
- String enums can't be used with string literals without importing the enum
- They create an unnecessary abstraction layer
- They're not as flexible for extensions or modifications

## Decision
Use const objects with `as const` assertion instead of enums throughout the codebase.

## Implementation

Instead of:
```typescript
export enum PartOfSpeech {
  VERB = 'verb',
  NOUN = 'noun',
  PREPOSITION = 'preposition'
}

// Usage requires import
import { PartOfSpeech } from './types';
const pos = PartOfSpeech.VERB;
```

Use:
```typescript
export const PartOfSpeech = {
  VERB: 'verb',
  NOUN: 'noun',
  PREPOSITION: 'preposition'
} as const;

export type PartOfSpeech = typeof PartOfSpeech[keyof typeof PartOfSpeech];

// Usage with string literals
const pos: PartOfSpeech = 'verb'; // Works!
const pos2 = PartOfSpeech.VERB; // Also works!
```

## Consequences

### Positive
- No runtime overhead (const objects are compile-time only)
- String literals work directly without imports
- More flexible - can be extended or modified easily
- Better tree-shaking (unused values can be eliminated)
- Cleaner generated JavaScript
- Aligns with modern TypeScript best practices

### Negative
- Slightly more verbose type definition
- No automatic reverse mapping (enum feature rarely used)

### Neutral
- Requires `as const` assertion for type safety
- Pattern might be unfamiliar to developers used to enums

## Examples in Codebase

1. **PartOfSpeech** - Vocabulary system
2. **IFEvents** - Event type constants
3. **TraitType** - Entity trait types
4. **ActionFailureReason** - Validation failure codes
5. **Subsystems** - System event subsystems

## Related
- Development Standards document
- ADR-001: Core Architecture Principles
- TypeScript configuration
