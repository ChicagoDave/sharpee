# Enhanced Context Pattern Refactoring - Continuation Prompt

## Context
We are in the unit testing and integration testing stage of development for the Sharpee interactive fiction engine.

**Development Environment:**
- Windows 11 filesystem, but develop using bash in WSL
- Root: C:\repotemp\sharpee
- Using pnpm for builds and tests
- Tests go in /tests at package level (e.g., /packages/core/tests)
- No need for scripts unless asked

## Core Architecture Principles
- Query-able world model (underlying data and relationships)
- No virtual machine
- Multiple language hooks
- All text is sent through events to an event source data store
- After a turn is completed, a text service uses templates and language service to emit formatted text
- Fluent author layer
- Standard library with moderate complexity

## Critical Design Decision
**ALL human-readable text and patterns MUST come from the registered language provider**
- Actions contain NO text or patterns
- Language provider is the ONLY source of human-readable content
- Actions only emit events with message IDs, never direct text

## Current Task
We are refactoring the action interface based on `/decisions/enhanced-context-patterns-checklist.md`.

### What's Been Done
1. Created `EnhancedActionContext` interface with helper methods
2. Created unified `Action` interface (but needs to remove `patterns` property)
3. Implemented `EnhancedActionContextImpl` with message ID resolution
4. Created a message catalog (but it needs to move to language provider)
5. Started migrating `taking.ts` action (but it incorrectly includes patterns and messages)

### What Needs to Be Done
1. **Fix the Action interface** - remove `patterns` property, change `messages` to `requiredMessages?: string[]`
2. **Fix the taking.ts action** - remove patterns and messages properties
3. **Update IFLanguageProvider** to:
   - Include all standard action patterns
   - Include all standard action messages from `standard-messages.ts`
   - Support registering patterns for actions
4. **Update the action registry** to get patterns from language provider
5. **Continue migrating actions** following the correct pattern

### Key Files to Review
- `/decisions/enhanced-context-patterns-checklist.md` - the refactoring plan
- `/packages/stdlib/src/actions/enhanced-types.ts` - needs interface updates
- `/packages/stdlib/src/actions/standard/taking.ts` - needs to be fixed
- `/packages/stdlib/src/language/if-language-provider.ts` - needs messages and patterns
- `/packages/stdlib/src/actions/messages/standard-messages.ts` - content to move to language provider

## Example of Correct Pattern
```typescript
// In action file - NO text or patterns
const takingAction: Action = {
  id: 'if.action.taking',
  requiredMessages: ['cant_take', 'already_have', 'taken'],
  execute(context: EnhancedActionContext): SemanticEvent[] {
    // Pure logic only
    return context.emitError('cant_take', { item: target.name });
  }
};

// In language provider - ALL text and patterns
languageProvider.registerActionPatterns('if.action.taking', [
  'take [something]',
  'get [something]'
]);

languageProvider.registerMessages('if.action.taking', {
  'cant_take': "You can't take {item}.",
  'already_have': "You already have {item}.",
  'taken': "Taken."
});
```

## Instructions
1. Start by reviewing the enhanced-context-patterns-checklist.md
2. Fix the Action interface in enhanced-types.ts
3. Fix the taking.ts action to remove text/patterns
4. Begin updating the language provider
5. Ask before making major design decisions
