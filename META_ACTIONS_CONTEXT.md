# Sharpee Framework - Meta Actions Implementation Context

## Current State
We are in the unit testing and integration testing stage of the Sharpee interactive fiction framework.

**Testing Progress**: 39/46 actions tested (85% coverage)
- All core gameplay mechanics are complete and tested
- Only Information & Meta actions remain (7 actions)

## System Information
- File system: Windows 11
- Development: WSL Bash
- Root: C:\repotemp\sharpee
- Build system: pnpm
- Test location: /packages/stdlib/tests/unit/actions/

## Core Architecture Principles
- Query-able world model (underlying data and relationships)
- No virtual machine
- Multiple language hooks
- Event-driven architecture: All text is sent through events to an event source data store
- After a turn is completed, a text service uses templates and language service to emit formatted text
- Fluent author layer
- Standard library designed for mid to junior programmers, but allows advanced usage

## Key Implementation Rules
```typescript
// ❌ WRONG
return "You can't take that.";

// ✅ RIGHT
return getMessage('cant_take_that');
```

## Remaining Meta Actions to Implement/Review

### 1. scoring.ts
- Display current score and rank
- Show points breakdown
- Achievement system integration?

### 2. help.ts
- Context-sensitive help
- Command listing
- Tutorial integration?

### 3. about.ts
- Game credits and information
- Version details
- Author notes

### 4. saving.ts
- Save game state
- Multiple save slots?
- Autosave functionality?

### 5. restoring.ts
- Load saved games
- Save file validation
- Recovery from corrupted saves?

### 6. quitting.ts
- Exit confirmation
- Autosave on quit?
- Cleanup operations

## Testing Patterns Established

### Golden Test Structure
Each action test follows this pattern:
1. **Action Metadata** - Verify ID, required messages, and group
2. **Precondition Checks** - Test all failure conditions
3. **Successful Execution** - Test success scenarios
4. **Event Structure** - Validate event format and entities
5. **Testing Pattern Examples** - Additional patterns specific to the action

### Key Testing Utilities
- `createEntity()` - Create mock entities with traits
- `createTestContext()` - Create action execution context
- `expectEvent()` - Validate event structure
- `TestData` - Helper for common test setups
- `createCommand()` - Create validated commands

## Ideas for Meta Action Implementation

### Potential Considerations:
1. **State Management**: How do meta actions interact with the world model?
2. **Event Patterns**: Should meta actions emit semantic events like gameplay actions?
3. **Permission System**: Should some meta actions be restrictable by game authors?
4. **Integration Points**: How do these actions integrate with the larger game system?
5. **User Experience**: What makes for good UX in IF meta commands?

### Questions to Explore:
- Should scoring be automatic or manual?
- How detailed should help be?
- What information belongs in about?
- How do we handle save/restore in an event-sourced system?
- Should quitting have different modes (quick quit, save and quit, etc.)?

## File Locations for Reference

### Action Implementations
- `/packages/stdlib/src/actions/standard/scoring.ts`
- `/packages/stdlib/src/actions/standard/help.ts`
- `/packages/stdlib/src/actions/standard/about.ts`
- `/packages/stdlib/src/actions/standard/saving.ts`
- `/packages/stdlib/src/actions/standard/restoring.ts`
- `/packages/stdlib/src/actions/standard/quitting.ts`

### Test Files (to be created)
- `/packages/stdlib/tests/unit/actions/scoring-golden.test.ts`
- `/packages/stdlib/tests/unit/actions/help-golden.test.ts`
- `/packages/stdlib/tests/unit/actions/about-golden.test.ts`
- `/packages/stdlib/tests/unit/actions/saving-golden.test.ts`
- `/packages/stdlib/tests/unit/actions/restoring-golden.test.ts`
- `/packages/stdlib/tests/unit/actions/quitting-golden.test.ts`

### Key Reference Files
- `/packages/stdlib/src/actions/enhanced-types.ts` - Action interfaces
- `/packages/stdlib/src/actions/constants.ts` - Action IDs
- `/packages/stdlib/tests/test-utils.ts` - Testing utilities
- `/ACTION_TESTS_CHECKLIST.md` - Progress tracker

## Next Steps
1. Review current implementation of meta actions
2. Discuss design improvements or changes
3. Implement any changes
4. Create golden tests for each action
5. Complete 100% action coverage

## Additional Context
The framework uses a sophisticated event-driven architecture where:
- Actions are pure functions that return events
- The world model is updated by applying events
- All text output goes through a message system
- Actions can emit multiple types of events (semantic, success, error)

Meta actions might need special consideration as they operate at a different level than gameplay actions - they affect the game system itself rather than the game world.
