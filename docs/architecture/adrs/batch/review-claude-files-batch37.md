# Batch 37: Claude Chat Review - Stdlib Package Refactoring

## File: 2025-05-27-21-53-12.json
**Title**: "Refactoring Sharpee Project Structure"
**Date**: May 27-28, 2025

### Summary
This conversation documents a major architectural refactoring to separate standard Interactive Fiction actions from the core package into a dedicated stdlib package. This change improves modularity and enables the core to remain IF-agnostic.

### Key Architectural Decisions

#### 1. Package Separation Strategy
**Decision**: Move all standard IF actions from core to stdlib
- Core package remains framework-only (IF-agnostic)
- Stdlib contains all IF-specific standard actions
- Enables using core for non-IF game types
- Allows replacing stdlib with custom action sets

#### 2. Stdlib Package Structure
```
packages/stdlib/
  src/
    actions/        # Standard IF actions
      taking.ts
      dropping.ts
      examining.ts
      ... (all standard actions)
    messages/       # Localized messages
      en-US.ts     # English messages
    index.ts       # Main exports
```

#### 3. Message System Architecture
**Pattern**: All user-facing strings externalized
```typescript
// Before (hard-coded):
message: 'Take what?'

// After (language system):
message: context.languageProvider.getMessage('action.taking.no_target') || 'Take what?'
```

**Benefits**:
- Full internationalization support
- Consistent message management
- Fallback strings for robustness
- Game-specific customization

#### 4. Message Key Convention
**Pattern**: `action.[actionName].[messageType]`

Examples:
- `action.taking.no_target`
- `action.taking.already_held`
- `action.taking.not_takeable`
- `action.opening.locked`
- `action.putting.container_closed`

#### 5. Import Path Strategy
**Decision**: Use scoped package imports
```typescript
// Old (relative imports):
import { ActionDefinition } from '../types';
import { IFCommand } from '../../../parser/if-parser-types';

// New (scoped imports):
import { ActionDefinition, PhaseResult } from '@sharpee/core/execution/actions';
import { IFCommand } from '@sharpee/core/parser';
import { GameContext } from '@sharpee/core/execution';
```

#### 6. Action Export Pattern
**Decision**: Export both individual actions and collection
```typescript
// Individual exports for selective import
export { takingAction } from './taking';
export { droppingAction } from './dropping';

// Collection for bulk registration
export const standardActions = [
  takingAction,
  droppingAction,
  // ... all actions
];
```

#### 7. Registration Helper Design
**Planned** (not fully implemented):
```typescript
export function registerStdlibActions(
  registry: ActionRegistry, 
  languageProvider: LanguageProvider
) {
  // Register messages
  languageProvider.addMessages(actionMessages);
  
  // Register actions
  standardActions.forEach(action => registry.register(action));
}
```

### Technical Implementation

#### Migration Process
1. Create stdlib package structure
2. Create message definitions for all actions
3. Move action files from core to stdlib
4. Update all imports to use scoped paths
5. Replace hard-coded strings with getMessage calls
6. Remove standard actions from core exports

#### Message File Structure
```typescript
export const actionMessages: Record<string, string> = {
  // Taking action
  'action.taking.no_target': 'Take what?',
  'action.taking.cannot_take_self': "You can't take yourself.",
  'action.taking.already_held': "You're already carrying {item}.",
  
  // Opening action
  'action.opening.no_target': 'Open what?',
  'action.opening.locked': "{item} is locked.",
  // ... etc
};
```

#### PowerShell Migration Script
Created automation script to:
- Copy action files to stdlib
- Update import statements
- Preserve functionality
- Identify strings needing replacement

### Benefits Achieved

1. **Modularity**: Core can be used without stdlib for custom games
2. **Flexibility**: Easy to create alternative action libraries
3. **Internationalization**: All text externalized to message files
4. **Maintainability**: Clear separation of framework vs. content
5. **Extensibility**: New action packages can be created alongside stdlib

### Integration Notes

- Stdlib depends on core as a peer dependency
- Actions use existing core interfaces (no changes needed)
- Message system integrates with existing LanguageProvider
- Event system remains unchanged
- Compatible with existing parser and world model

### Future Considerations

1. Additional stdlib content:
   - Standard rules
   - Common entity types
   - Utility functions
   
2. Language provider enhancements:
   - addMessages method implementation
   - Message bundling system
   - Runtime message loading

3. Package distribution:
   - Separate npm packages
   - Version coordination
   - Migration guides

## Significance
This refactoring represents a major architectural improvement that makes Sharpee more versatile and maintainable. By separating IF-specific content from the core engine, the framework can now support a wider range of interactive experiences while maintaining a clean, modular architecture. The message externalization also sets the foundation for full internationalization support.

---

## File: 2025-05-27-22-32-31.json
**Title**: "Migrate User-Facing Strings to Language Provider"
**Date**: May 27-28, 2025

### Summary
This conversation addresses the standardization of constants and elimination of hardcoded strings throughout the standard library actions. A comprehensive constants strategy was developed to ensure type safety and support internationalization.

### Key Architectural Decisions

#### 1. Comprehensive Constants File
**Decision**: Create `stdlib/constants.ts` with extensive enums

**Enums Created**:
- `EntityTypes`: All entity type strings (room, location, thing, etc.)
- `AttributeNames`: Standard attributes (name, description, takeable, etc.)
- `MessageKeys`: All message template keys for language provider
- `FailureReasons`: Semantic failure reasons for events

#### 2. Message Key Convention Enhancement
**Pattern**: Hierarchical message keys
```
action.[actionName].[messageType]
generic.[messageType]
```

**Examples**:
- `action.taking.no_target`
- `action.taking.already_held`
- `generic.cant_see`
- `generic.nothing_special`

#### 3. Phase Name Standardization
**Problem**: Old actions used inconsistent phase names
**Solution**: Enforce `ActionPhases` enum usage

**Mapping**:
- `'check'` → `ActionPhases.VALIDATE`
- `'carryOut'` → `ActionPhases.EXECUTE`
- `'report'` → Eliminated (use events)
- `'after'` → `ActionPhases.AFTER`

#### 4. Relationship Pattern Helpers
**Decision**: Create functions for dynamic relationships
```typescript
export const RelationshipPatterns = {
  EXIT: (direction: string) => `exit_${direction}`,
  DOOR: (direction: string) => `door_${direction}`,
  BLOCKED: (direction: string) => `${direction}_blocked`,
  BLOCKED_MESSAGE: (direction: string) => `${direction}_blocked_message`
};
```

#### 5. Direction System Constants
**Components**:
- `StandardDirections` array of valid directions
- `DirectionAliases` mapping (n → north, etc.)
- `OppositeDirections` mapping (north → south)

#### 6. Failure Reason Standardization
**Decision**: Replace string reasons with enum
**Benefits**:
- Type-safe error handling
- Consistent categorization
- Better rule system integration
- Easier to test

### Implementation Pattern

#### Before:
```typescript
if (!command.noun) {
  return {
    continue: false,
    events: [createEvent('action:prevented', { 
      reason: 'no_target', 
      message: 'Take what?' 
    })]
  };
}
```

#### After:
```typescript
if (!command.noun) {
  return {
    continue: false,
    events: [createEvent(constants.events.ACTION_PREVENTED, { 
      reason: FailureReasons.NO_TARGET,
      message: context.languageProvider.getMessage(MessageKeys.TAKING_NO_TARGET) || 'Take what?'
    })]
  };
}
```

### Technical Details

#### Constants Organization:
1. **Entity & World Model**: Types, attributes, relationships
2. **Messages**: Hierarchical key system for all user text
3. **Actions**: Failure reasons and semantic categorization
4. **Directions**: Complete direction system with aliases

#### Refactoring Checklist:
1. Replace action ID strings with `StandardActions` enum
2. Use `ActionPhases` enum for phase definitions
3. Replace hardcoded messages with `getMessage` calls
4. Use `FailureReasons` enum for all failures
5. Use `AttributeNames` for attribute access
6. Use `EntityTypes` for type checking

### Benefits Achieved

1. **Type Safety**: Compile-time checking for all constants
2. **Internationalization Ready**: All text externalized
3. **Consistency**: Same patterns across all actions
4. **Maintainability**: Central constants file
5. **IDE Support**: Full autocomplete for all values
6. **Testing**: Easier to mock and test with constants

### Migration Impact

- All standard actions need updating
- Language providers must implement all message keys
- Rules can now use standardized failure reasons
- Better integration with TypeScript tooling

## Significance
This standardization effort ensures that Sharpee's standard library is production-ready with proper internationalization support, type safety, and maintainability. The comprehensive constants strategy makes it impossible to have typos in critical strings and provides a clear contract for what messages each language must provide.

---

## File: 2025-05-27-23-00-56.json
**Title**: "Sharpee Project Status Review"
**Date**: May 27-28, 2025

### Summary
This conversation implements the comprehensive refactoring plan to eliminate all hardcoded strings from stdlib actions and establish a proper constant-based architecture with language provider integration.

### Key Architectural Decisions

#### 1. Core Constants Module
**Decision**: Create dedicated constants module in core
**Location**: `/packages/core/src/constants/index.ts`

**Enums Created**:
```typescript
export enum EntityTypes {
  ROOM = 'room',
  LOCATION = 'location',
  THING = 'thing',
  CONTAINER = 'container',
  DOOR = 'door',
  PERSON = 'person',
  DEVICE = 'device',
  DIRECTION = 'direction',
  PLAYER = 'player'
}

export enum StandardAttributes {
  NAME = 'name',
  DESCRIPTION = 'description',
  TAKEABLE = 'takeable',
  DROPPABLE = 'droppable',
  OPEN = 'open',
  LOCKED = 'locked',
  SWITCHABLE = 'switchable',
  // ... many more
}
```

#### 2. Verb List Architecture
**Problem**: Actions contained hardcoded verb arrays
**Solution**: Move verb lists to language provider

**New Interface Method**:
```typescript
interface LanguageProvider {
  // ... existing methods
  getActionVerbList(actionId: string): string[];
}
```

**Implementation Pattern**:
```typescript
// In action definition:
verbs: [] // Empty, populated at runtime

// In language provider:
const actionVerbMappings = {
  [StandardActions.TAKING]: ['take', 'get', 'grab', 'pick up'],
  [StandardActions.DROPPING]: ['drop', 'put down', 'discard'],
  // ... etc
};
```

#### 3. Fallback String Elimination
**Decision**: Remove all English fallback strings

**Before**:
```typescript
context.languageProvider.getMessage('action.taking.no_target') || 'Take what?'
```

**After**:
```typescript
context.languageProvider.getMessage('action.taking.no_target')
```

**Error Handling**: Throw error if message missing (fail fast)

#### 4. Action Initialization Pattern
**Helper Function Created**:
```typescript
export function initializeActionWithVerbs(
  action: ActionDefinition,
  languageProvider: LanguageProvider
): ActionDefinition {
  return {
    ...action,
    verbs: languageProvider.getActionVerbList(action.id)
  };
}
```

#### 5. Attribute Access Standardization
**Pattern**: Use constants for all attribute access

**Examples**:
```typescript
// Before:
target.attributes.name
target.attributes.takeable

// After:
target.attributes[StandardAttributes.NAME]
target.attributes[StandardAttributes.TAKEABLE]
```

### Technical Details

#### Complete Refactoring Checklist:
1. Import core constants
2. Remove hardcoded verb arrays
3. Remove fallback strings
4. Replace entity type strings with enums
5. Replace attribute strings with enums
6. Use relationship enums
7. Update action registration

#### Language Provider Enhancements:
- Added `getActionVerbList()` method
- Created action-verb mappings
- Enhanced error reporting for missing messages

#### Migration Strategy:
- Taking action fully refactored as example
- Dropping action partially refactored
- Pattern established for remaining 13 actions

### Benefits

1. **True Internationalization**: No English in stdlib
2. **Type Safety**: All strings are constants
3. **Maintainability**: Central constant definitions
4. **Flexibility**: Language-specific verb variations
5. **Error Prevention**: Compile-time constant checking
6. **Parser Integration**: Cleaner verb-to-action mapping

### Architecture Principles

1. **Language Package Owns**:
   - All user-facing strings
   - Verb definitions and mappings
   - Message templates
   - Localization logic

2. **Stdlib Package Owns**:
   - Action logic only
   - No strings or language content
   - Pure game mechanics

3. **Core Package Owns**:
   - Shared constants
   - Type definitions
   - Base interfaces

### Next Steps

1. Complete refactoring of remaining 13 actions
2. Add unit tests for missing message handling
3. Update parser to use verb mappings
4. Document the pattern for future actions

## Significance
This refactoring completes the transformation of Sharpee's action system into a truly language-agnostic architecture. By moving all language-specific content (including verb lists) to the language provider and using constants for all identifiers, the system now supports full internationalization without any modifications to game logic. This is a crucial step toward making Sharpee a world-class IF platform.
