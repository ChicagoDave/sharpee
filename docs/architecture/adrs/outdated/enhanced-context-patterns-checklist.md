# Enhanced Context Pattern Implementation Checklist

## Architecture Principles

### Separation of Concerns
1. **Actions** - Pure logic, no text or patterns
   - Define behavior and business rules
   - Emit semantic events with message IDs
   - Declare required message IDs for documentation

2. **Language Provider** - All human-facing content
   - Action patterns/aliases (e.g., "take", "get", "pick up")
   - All message text with parameter placeholders
   - Localization and customization

3. **Text Service** - Message resolution
   - Receives events with message IDs
   - Queries language provider for text
   - Performs parameter substitution
   - Outputs formatted text

### Key Design Decisions
- Actions NEVER contain text or patterns
- Language provider is the ONLY source of human-readable content
- Message IDs follow namespaced convention: `{action.id}.{message_key}`
- Enhanced context helpers make it easy to emit properly formatted events

## Phase 1: Core Infrastructure

### 1.1 Define Enhanced Interfaces
- [x] Create `EnhancedActionContext` interface extending `ActionContext`
- [x] Add helper methods: `emitSuccess()`, `emitError()`, `emit()`
- [x] Create unified `Action` interface with SemanticEvent[] return
- [x] ~~Add `messages?: Record<string, string>` to Action interface~~ CHANGED: No messages in Action
- [x] Add `requiredMessages?: string[]` to Action interface (list of message IDs only)
- [ ] Remove/deprecate `ActionResult` interface

### 1.2 Update Action Types
- [x] ~~Move patterns from separate place into Action interface~~ CHANGED: Patterns stay in language provider
- [x] Ensure Action.execute returns `SemanticEvent[]`
- [ ] Remove direct text fields (message, error) from any result types
- [x] Add message ID constants for standard actions (IFActions in constants.ts)
- [x] Remove `patterns` property from Action interface
- [x] Update Action interface to use `descriptionMessageId` and `examplesMessageId` instead of text

### 1.3 Create Context Implementation
- [x] Implement `EnhancedActionContext` with helper methods
- [x] Add message ID resolution (action-scoped IDs)
- [x] Create event builder utilities
- [ ] Add timestamp and sequence generation

## Current Architecture Status

### What's Been Done:
1. **Action Interface** - Updated to have no text/patterns, only logic
2. **Language Provider Interface** - Extended with methods for patterns/messages
3. **Taking Action** - Refactored to use enhanced context, no text
4. **Language Content** - Created in lang-en-us package with separate files per action

### Architecture Flow:
1. **lang-en-us** exports action language definitions (patterns, messages, help)
2. **stdlib** IFLanguageProvider imports and registers these definitions
3. **Actions** contain only logic and emit message IDs
4. **Enhanced Context** resolves short message IDs to full IDs
5. **Text Service** queries language provider to resolve message IDs to text

### Next Steps:
1. Update IFLanguageProvider implementation to import from lang-en-us
2. Update action registry to use language provider for patterns
3. Migrate remaining actions to enhanced context pattern
4. Update text service to resolve message IDs

## Phase 2: Registry Updates

### 2.1 Update Action Registry
- [ ] Remove adapter code for old Action interface
- [x] Update registry to work with unified Action interface (adapter exists)
- [ ] Update registry to get patterns from language provider instead of actions
- [ ] Add language provider dependency to registry
- [ ] Support action-scoped message namespacing

### 2.2 Language Provider Integration
- [x] Ensure language provider interface supports action patterns/aliases
- [x] Language provider must provide all action messages
- [x] Language provider must provide all action patterns
- [x] Update IFLanguageProvider to include standard action messages
- [x] Support message inheritance/overrides in language provider

## Phase 3: Standard Action Migration

### Migration Status Summary
**Total Standard Actions: 45** (44 in index + 1 removing action added)
- ✅ Migrated to Enhanced Context: 45 actions (100%) 🎉
- ❌ Need Migration: 0 actions (0%)
- 📝 Language Content Created: 45 files (100%)
- 📝 Language Content Needed: 0 files

**Files Audit Results:**
- Total .ts files in /standard: 53
- Action files: 46 (excluding index.ts and .d.ts files)
- Extra file: taking-enhanced.ts (test/duplicate version)
- Missing from index: removing.ts (now added)

### 3.1 Define Standard Messages in Language Provider
- [x] ~~Create message catalog for all standard actions~~ MOVED: Must be in language provider
- [x] ~~Move all messages from standard-messages.ts to IFLanguageProvider~~ CHANGED: Moved to lang-en-us package
- [x] Define message IDs following naming convention
- [x] Include parameter placeholders in messages
- [x] Group related messages (e.g., all "taking" messages)
- [x] Move all action patterns to language provider
- [x] Create separate files for each action's language content in lang-en-us
- [x] Structure: lang-en-us/src/actions/{actionname}.ts with patterns, messages, and help

### 3.2 Migrate Core Actions
- [x] Update `taking` action to use enhanced context
- [x] Update `dropping` action
- [x] Update `looking` action  
- [x] Update `inventory` action
- [x] Update `examining` action
- [x] Update `going` action

### 3.2.1 Language Content Created (in lang-en-us)
- [x] Created taking.ts with patterns, messages, and help
- [x] Created dropping.ts with patterns, messages, and help
- [x] Created looking.ts with patterns, messages, and help
- [x] Created inventory.ts with patterns, messages, and help
- [x] Created examining.ts with patterns, messages, and help
- [x] Created going.ts with patterns, messages, and help
- [x] Created opening.ts with patterns, messages, and help
- [x] Created closing.ts with patterns, messages, and help
- [x] Created putting.ts with patterns, messages, and help
- [x] Created inserting.ts with patterns, messages, and help
- [x] Created removing.ts with patterns, messages, and help
- [x] Created wearing.ts with patterns, messages, and help
- [x] Created taking-off.ts with patterns, messages, and help
- [x] Created locking.ts with patterns, messages, and help
- [x] Created unlocking.ts with patterns, messages, and help
- [x] Updated index.ts to export all action language definitions

### 3.3 Migrate Container Actions
- [x] Update `opening` action
- [x] Update `closing` action
- [x] Update `putting` action
- [x] Update `inserting` action
- [x] Update `removing` action (created new)

### 3.4 Migrate Wearable & Lock Actions
- [x] Update `wearing` action
- [x] Update `taking_off` action
- [x] Update `locking` action
- [x] Update `unlocking` action

### 3.5 Migrate Movement Actions
- [x] Update `entering` action
- [x] Update `exiting` action
- [x] Update `climbing` action

### 3.6 Migrate Sensory Actions
- [x] Update `searching` action
- [x] Update `listening` action
- [x] Update `smelling` action
- [x] Update `touching` action

### 3.7 Migrate Device Actions
- [x] Update `switching_on` action
- [x] Update `switching_off` action
- [x] Update `pushing` action
- [x] Update `pulling` action
- [x] Update `turning` action

### 3.8 Migrate Social Actions
- [x] Update `giving` action
- [x] Update `showing` action
- [x] Update `talking` action
- [x] Update `asking` action
- [x] Update `telling` action
- [x] Update `answering` action

### 3.9 Migrate Other Interaction Actions
- [x] Update `throwing` action
- [x] Update `using` action
- [x] Update `eating` action
- [x] Update `drinking` action
- [x] Update `attacking` action

### 3.10 Migrate Meta Actions
- [x] Update `waiting` action
- [x] Update `scoring` action
- [x] Update `help` action
- [x] Update `about` action
- [x] Update `saving` action
- [x] Update `restoring` action
- [x] Update `quitting` action

### 3.11 Create Missing Language Content (in lang-en-us)
All language content files have been created!
- [x] Create searching.ts
- [x] Create listening.ts
- [x] Create smelling.ts
- [x] Create touching.ts
- [x] Create switching-on.ts
- [x] Create switching-off.ts
- [x] Create pushing.ts
- [x] Create pulling.ts
- [x] Create turning.ts
- [x] Create giving.ts
- [x] Create showing.ts
- [x] Create throwing.ts
- [x] Create using.ts
- [x] Create eating.ts
- [x] Create drinking.ts
- [x] Create attacking.ts
- [x] Create talking.ts
- [x] Create asking.ts
- [x] Create telling.ts
- [x] Create answering.ts
- [x] Create waiting.ts
- [x] Create scoring.ts
- [x] Create help.ts
- [x] Create about.ts
- [x] Create saving.ts
- [x] Create restoring.ts
- [x] Create quitting.ts

## Phase 4: Text Service Updates

### 4.1 Event Processing
- [ ] Update text service to look for message IDs in events
- [ ] Text service must use language provider for all text resolution
- [ ] Add fallback to direct text for backward compatibility
- [ ] Implement parameter substitution via language provider
- [ ] Handle missing message IDs gracefully

### 4.2 Language Provider Integration
- [ ] Ensure language provider can resolve action messages
- [ ] Support message override/customization
- [ ] Add message existence checking
- [ ] Implement message inheritance

## Phase 5: Testing Infrastructure

### 5.1 Update Test Helpers
- [ ] Create test context builder with enhanced features
- [ ] Add message assertion helpers
- [ ] Update mock implementations
- [ ] Create test message catalog

### 5.2 Migration Tests
- [ ] Test backward compatibility
- [ ] Test message resolution
- [ ] Test parameter substitution
- [ ] Test error cases

## Phase 6: Documentation

### 6.1 API Documentation
- [ ] Document EnhancedActionContext interface
- [ ] Document Action interface changes
- [ ] Create migration guide from old patterns
- [ ] Add code examples

### 6.2 Author Documentation
- [ ] Explain message system for authors
- [ ] Show how to create custom actions
- [ ] Document message naming conventions
- [ ] Provide templates and examples

## Phase 7: Tooling & Utilities

### 7.1 Development Tools
- [ ] Create action generator with messages
- [ ] Add message validation tool
- [ ] Create message coverage checker
- [ ] Build type definitions for message IDs

### 7.2 Runtime Support
- [ ] Add debug mode for message resolution
- [ ] Create message missing reporter
- [ ] Add performance monitoring
- [ ] Build message usage analytics

## Implementation Order

1. **Start with**: Phase 1.1-1.3 (Core Infrastructure)
2. **Then**: Phase 3.1 (Define Standard Messages)
3. **Then**: Phase 2 (Registry Updates)
4. **Then**: Migrate 2-3 actions as proof of concept
5. **Then**: Phase 4 (Text Service Updates)
6. **Then**: Complete Phase 3 (All Actions)
7. **Finally**: Phases 5-7 (Testing, Docs, Tools)

## Success Criteria

- [ ] All standard actions use enhanced context
- [ ] No direct text in action results
- [ ] Message IDs used throughout
- [ ] Text service resolves messages correctly
- [ ] Backward compatibility maintained
- [ ] Tests pass without modification
- [ ] Forge can build on this foundation

## Code Examples

### Before:
```typescript
return {
  success: false,
  error: "You can't take that."
};
```

### After:
```typescript
return context.emitError('cant_take', { 
  item: target.name 
});
```

### Action Definition (in stdlib):
```typescript
const takingAction: Action = {
  id: IFActions.TAKING, // 'if.action.taking'
  requiredMessages: [
    'no_target',
    'cant_take_self',
    'already_have',
    'cant_take_room',
    'fixed_in_place',
    'container_full',
    'too_heavy',
    'taken',
    'taken_from'
  ],
  group: 'object_manipulation',
  execute(context: EnhancedActionContext): SemanticEvent[] {
    // Pure logic only - NO text
    return context.emitError('cant_take', { item: target.name });
  }
};
```

### Language Definition (in lang-en-us/src/actions/taking.ts):
```typescript
export const takingLanguage = {
  actionId: 'if.action.taking',
  
  patterns: [
    'take [something]',
    'get [something]',
    'pick up [something]',
    'grab [something]'
  ],
  
  messages: {
    'no_target': "Take what?",
    'cant_take_self': "You can't take yourself.",
    'already_have': "You already have {item}.",
    'cant_take_room': "You can't take {item}.",
    'fixed_in_place': "{item} is fixed in place.",
    'container_full': "You're carrying too much already.",
    'too_heavy': "{item} is too heavy to carry.",
    'taken': "Taken.",
    'taken_from': "You take {item} from {container}."
  },
  
  help: {
    description: 'Pick up objects and add them to your inventory.',
    examples: 'take book, get lamp, pick up the key, grab sword'
  }
};
```
```