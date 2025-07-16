# ADR-031: Self-Inflating Help System

## Status
Accepted

## Context
Interactive fiction games need comprehensive help systems to guide players through available commands. Traditionally, help content is manually maintained separately from action implementations, leading to:
- Help documentation that gets out of sync with actual commands
- Duplicated information between action patterns and help text
- Inconsistent help formatting across different actions
- Missing help for newly added actions

We need a help system that automatically stays in sync with the available actions while remaining flexible enough for customization.

## Decision
We will implement a self-inflating help system that automatically generates help content from action definitions and language files:

1. **Help Content in Language Files**: Each action's language file contains a `help` property with:
   - `description`: Brief explanation of what the action does
   - `examples`: Comma-separated list of example commands
   - `summary`: One-line help format "VERB/ALIASES - Description. Example: COMMAND"

2. **Automatic Verb Extraction**: The `LanguageProvider.getActionHelp(actionId)` method extracts available verbs from the action's `patterns` array, ensuring help always reflects actual command patterns.

3. **Structured Help Interface**: The `ActionHelp` interface provides:
   ```typescript
   interface ActionHelp {
     description: string;    // What the action does
     verbs: string[];       // Available verb forms (extracted from patterns)
     examples: string[];    // Example commands (parsed from help.examples)
     summary?: string;      // One-line summary for quick reference
   }
   ```

4. **No Separate Help Database**: Help content lives alongside the action's messages and patterns, preventing drift between implementation and documentation.

5. **Event-Driven Help Resolution**: The help action emits events without retrieving data:
   - For specific help: `{ helpRequest: 'take' }` - just the user's input
   - For general help: `{ helpType: 'general' }` with metadata
   - The text service handles all data retrieval and formatting

## Example Implementation

```typescript
// In lang-en-us/src/actions/taking.ts
export const takingLanguage = {
  actionId: 'if.action.taking',
  
  patterns: [
    'take [something]',
    'get [something]',
    'pick up [something]',
    'grab [something]'
  ],
  
  messages: {
    'taken': 'Taken.',
    'not_held': "You aren't holding {item}."
    // ... other messages
  },
  
  help: {
    description: 'Pick up objects and add them to your inventory.',
    examples: 'take book, get lamp, pick up the key, grab sword',
    summary: 'TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP'
  }
};

// Help action emits:
context.emit('if.event.help_displayed', {
  specificHelp: true,
  helpRequest: 'take'  // User typed "help take"
});

// Text service handles:
const actionId = resolveToActionId('take');  // → 'if.action.taking'
const help = languageProvider.getActionHelp(actionId);
// Automatically extracts verbs: ['TAKE', 'GET', 'PICK', 'GRAB']
```

## Consequences

### Positive
- **Always Current**: Help automatically reflects the actual patterns defined for each action
- **Single Source of Truth**: No separate help files to maintain
- **Consistent Format**: All actions follow the same help structure
- **Localization-Ready**: Help text is part of the language system
- **Type-Safe**: TypeScript interfaces ensure complete help information
- **Discoverable**: Help action can enumerate all available commands

### Negative
- **Language File Coupling**: Help content must be maintained in language files
- **Limited Flexibility**: Help structure is somewhat rigid
- **No Topic-Based Help**: System is action-centric (though we avoid "topic" terminology due to IF conventions)

### Neutral
- **Migration Effort**: Existing actions need their language files updated
- **Pattern Parsing**: Verb extraction relies on pattern format conventions

## Implementation Notes

1. **Verb Extraction**: The system extracts the first word from each pattern (e.g., "take [something]" → "TAKE")

2. **Example Parsing**: Examples are stored as comma-separated strings and parsed into arrays

3. **Help Action Integration**: The help action:
   - Emits events with the user's help request
   - Does NOT retrieve help data or resolve action names
   - Maintains separation between action layer and text formatting

4. **Text Service Responsibilities**: The text service:
   - Resolves help requests to action IDs or topics
   - Calls `languageProvider.getActionHelp(actionId)` for actions
   - Formats help using appropriate templates
   - Falls back to topic-based help or "unknown" messages

5. **Future Extensions**:
   - Category-based help (movement, manipulation, communication)
   - Context-sensitive help based on current game state
   - Progressive disclosure for beginners vs. experienced players

## Related ADRs
- ADR-006: Enhanced Action System with Message ID Resolution
- ADR-008: Localization and Language System
- ADR-029: Language Provider Integration

## References
- Traditional IF help systems (Inform 7, TADS)
- Self-documenting code principles
- Domain-driven design (keeping related concerns together)
