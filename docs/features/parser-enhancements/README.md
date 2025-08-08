# Parser Enhancement Features

This directory contains proposed and implemented enhancements to the Sharpee parser.

## Proposed Features

### [Multi-Word Verb Support](./multi-word-verbs.md)
**Status:** Proposed  
**Priority:** Medium  
Support for phrasal verbs like "pick up", "look at", "talk to" as single verb units.

### [Pronoun Resolution](./pronoun-resolution.md) 
**Status:** Not Started  
**Priority:** High  
Proper handling of "it", "him", "her", "them" based on context.

### [Disambiguation System](./disambiguation.md)
**Status:** Not Started  
**Priority:** High  
Interactive disambiguation when multiple objects match player input.

### [Compound Commands](./compound-commands.md)
**Status:** Not Started  
**Priority:** Low  
Support for commands like "take all then go north" or "unlock door with key and open it".

### [Contextual Understanding](./contextual-understanding.md)
**Status:** Not Started  
**Priority:** Medium  
Understanding implicit objects: "unlock door" → "unlock door with key" (if holding one key).

## Implemented Features

_(None yet - all features are currently proposed)_

## Feature Template

When adding a new feature document, use this template:

```markdown
# Feature: [Name]

**Status:** Proposed | In Progress | Implemented  
**Priority:** Low | Medium | High  
**Effort:** Small (1 day) | Medium (2-3 days) | Large (1 week+)  
**Category:** Parser Enhancement

## Overview
Brief description of the feature.

## Motivation
Why this feature is needed.

## Current Behavior
How the system currently works.

## Proposed Solution
High-level approach to implementing the feature.

## Implementation Details
Technical details and phases.

## Examples
Concrete examples of the feature in action.

## Testing
How to test the feature.

## Performance Considerations
Impact on parser performance.

## Migration Path
How existing code will be affected.

## Success Criteria
How we'll know the feature is working correctly.

## Future Enhancements
Possible extensions to this feature.

## References
Links to relevant documentation or prior art.
```
