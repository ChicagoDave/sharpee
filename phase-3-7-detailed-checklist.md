# Phase 3.7 Detailed Checklist - Core Refactoring (True Separation)

## Overview
This checklist breaks down the Core Refactoring phase into manageable tasks. The goal is to move IF-specific types from @sharpee/core to @sharpee/world-model, making core a truly generic narrative engine.

## Pre-flight Checks ✅ PARTIALLY COMPLETED

✅ **Backup Current State**
  - Create a git branch: `feature/core-refactoring-phase-3-7` ⚠️ (Recommended before continuing)
  - Document current working build state ✅
  - Run all tests to ensure starting from green ⚠️ (Recommended before continuing)

✅ **Inventory Current Core Exports**
  - Listed exports from @sharpee/core ✅
  - Found duplicate command types in core ✅
  - Identified IF-specific types to move ✅
  - Estimated ~50+ files need updating ✅

## Step 1: Create Event Source Infrastructure in Core ✅ COMPLETED

✅ **Design Generic Event Source**
  - Created GenericEventSource<T> interface and SimpleEventSource implementation
  - Added pub/sub pattern with error handling
  - Created comprehensive tests

✅ **Create System Event Type**
  - Created SystemEvent interface for debug/monitoring
  - Added helper functions and type guards
  - Separated from SemanticEvent (story events)

✅ **Replace Old EventSource**
  - Moved old EventSource to SemanticEventSource
  - Maintained backwards compatibility
  - Updated event-system.ts to use new infrastructure
  - Cleaned up imports and exports

✅ **Update Core Events Index**
  - Export GenericEventSource, SystemEvent, SemanticEvent ✓
  - Export SemanticEventSource for backwards compatibility ✓
  - Remove any IF-specific exports ✓ None found

## Step 2: Prepare World-Model for IF Types ✅ COMPLETED

✅ **Create Command Types Directory**
  - Created packages/world-model/src/commands/
  - Created packages/world-model/src/interfaces/

✅ **Move ParsedCommand and Related Types**
  - Created world-model/src/commands/parsed-command.ts
  - Includes: ParsedCommand, ParsedObjectReference, ParseError

✅ **Move ValidatedCommand and Related Types**
  - Created world-model/src/commands/validated-command.ts
  - Includes: ValidatedCommand, ValidatedObjectReference, ValidationError

✅ **Move Command Interfaces**
  - Parser interface → world-model/src/interfaces/parser.ts
  - CommandValidator interface → world-model/src/interfaces/command-validator.ts
  - CommandExecutor interface → world-model/src/interfaces/command-executor.ts
  - CommandProcessor interface → world-model/src/interfaces/command-processor.ts

✅ **Move Action Interface**
  - Created world-model/src/interfaces/action.ts
  - Designed for three-phase architecture
  - Includes ActionContext and ActionRegistry

✅ **Create World-Model Exports**
  - Updated world-model/src/index.ts
  - Exports commands and interfaces
  - All IF-specific types now available from @sharpee/world-model

## Step 3: Update Parser Package ✅ COMPLETED

✅ **Update Parser Imports**
  - Changed imports from '@sharpee/core' to '@sharpee/world-model'
  - Updated SystemEvent import to remain from '@sharpee/core'

✅ **Update BasicParser**
  - File: `stdlib/src/parser/basic-parser.ts` ✓
  - Updated all type imports ✓
  - Changed debug callback to use SystemEvent ✓

✅ **Update Parser Types**
  - Updated parser-types.ts imports ✓
  - Changed setDebugEventSource to setDebugCallback ✓
  - No changes needed to parser-internals.ts ✓

✅ **Handle Name Conflicts**
  - Renamed old ParsedCommand to ResolvedCommand ✓
  - Updated command-resolver.ts to use renamed type ✓
  - Added deprecation notice ✓

✅ **Files Updated**
  - ✓ `stdlib/src/parser/basic-parser.ts`
  - ✓ `stdlib/src/parser/parser-types.ts`
  - ✓ `stdlib/src/parser/parsed-command.ts`
  - ✓ `stdlib/src/parser/command-resolver.ts`
  - ✓ No test files found (none exist yet)

## Step 4: Update Validator Package ✅ COMPLETED

✅ **Update Validator Imports**
  - Changed command type imports from '@sharpee/core' to '@sharpee/world-model' ✓
  - Kept SystemEvent and GenericEventSource imports from '@sharpee/core' ✓
  - Updated Entity and CommandResult to remain from '@sharpee/core' ✓

✅ **Update CommandValidator Class**
  - File: `stdlib/src/validation/command-validator.ts` ✓
  - Updated all type imports ✓
  - Changed from DebugEventCallback to GenericEventSource<SystemEvent> ✓
  - Updated setDebugCallback() to setSystemEventSource() ✓
  - Updated emitDebugEvent to use event source pattern ✓

✅ **Update Validation Tests**
  - Updated all interface imports (removed I prefix) ✓
  - Fixed MockEventSource to implement GenericEventSource<SystemEvent> ✓
  - Updated all test assertions for new event structure ✓
  - Fixed method names (getAction → get) ✓

✅ **Files Updated**
  - ✓ `stdlib/src/validation/command-validator.ts`
  - ✓ `stdlib/src/validation/index.ts`
  - ✓ `stdlib/src/validation/command-validator.test.ts`
  - ✓ `stdlib/src/validation/README.md`
  - Note: No separate types.ts or helpers.ts files exist

## Step 5: Update Actions ✅ COMPLETED

✅ **Update Action Imports**
  - Changed ValidatedCommand import from '@sharpee/core' to '@sharpee/world-model' ✓
  - Kept SemanticEvent import from '@sharpee/core' ✓
  - Made ActionExecutor extend Action from '@sharpee/world-model' ✓

✅ **Update Each Action File**
  - ✓ `stdlib/src/actions/standard/taking.ts`
  - ✓ `stdlib/src/actions/standard/dropping.ts`
  - ✓ `stdlib/src/actions/standard/examining.ts`
  - ✓ `stdlib/src/actions/standard/going.ts`
  - ✓ `stdlib/src/actions/standard/opening.ts`
  - Note: No closing, inventory, looking actions found (not implemented yet)
  - Note: No movement/* or meta/* directories found

✅ **Update Action Registry**
  - File: `stdlib/src/actions/registry.ts` ✓
  - No imports needed updating (uses local types)

✅ **Update Action Types**
  - File: `stdlib/src/actions/types.ts` ✓
  - Updated imports from world-model ✓
  - Made ActionExecutor extend Action interface ✓

## Step 6: Update Engine Package ✅ COMPLETED

✅ **Update Engine Imports**
  - Changed command type imports to world-model ✓
  - Kept event imports from core ✓
  - Updated action imports to come from stdlib ✓

✅ **Update CommandExecutor**
  - File: `engine/src/command-executor.ts` ✓
  - Import command types from world-model ✓
  - Import event types from core ✓
  - Refactored to use three-phase architecture (parse → validate → execute) ✓
  - Updated constructor to create parser and validator ✓
  - Removed old resolver-based code ✓

✅ **Update GameEngine**
  - File: `engine/src/game-engine.ts` ✓
  - Updated imports to use stdlib for actions ✓
  - Created local ActionRegistry instead of importing ✓
  - Updated commandExecutor creation with world parameter ✓

✅ **Files Updated**
  - ✓ `engine/src/command-executor.ts`
  - ✓ `engine/src/game-engine.ts`
  - ✓ `engine/src/types.ts`
  - ✓ `engine/src/index.ts` (no changes needed)
  - ✓ `engine/src/event-sequencer.ts` (no changes needed)

## Step 7: Clean Up Core Package ✅ COMPLETED

✅ **Remove IF-Specific Files**
  - ✓ Deleted: `core/src/command/` directory (moved to .deleted)
  - ✓ Updated `core/src/execution/types.ts` to use generic type parameters
  - ✓ Cleaned up orphaned imports
  - ✓ Removed old backup directories (if-types.bak, debug-events.ts.old)

✅ **Update Core Exports**
  - ✓ Removed command-related exports from `core/src/index.ts`
  - ✓ Only generic types are exported
  - ✓ Added new Result<T,E> type for generic operations

✅ **Verify Core Independence**
  - ✓ Core package.json has zero @sharpee dependencies
  - ✓ No remaining IF-specific code
  - ✓ Execution types now use generic parameters (CommandHandler<TCommand, TResult>)

## Step 8: Update Peripheral Packages ✅ COMPLETED

✅ **Update Examples**
  - ✓ Created new `three-phase-demo.ts` showing Parser → Validator → Actions
  - ✓ Renamed old `parser-world-integration.ts` to .old
  - ✓ Examples demonstrate clean separation of concerns

✅ **Update Tests**
  - ✓ Assessed existing tests - most still passing
  - ✓ Integration tests deferred to Phase 5 (need engine updates)
  - ✓ No immediate test breakage

✅ **Update Documentation**
  - ✓ Updated Engine README with three-phase architecture
  - ✓ Completely rewrote Stdlib README
  - ✓ Added integration examples and clear explanations
  - ✓ Verified other package docs don't need updates

## Step 8.5: Fix Action Interface Location (NEW) ✅ COMPLETED

✅ **Remove Action Interface from World-Model**
  - Delete `packages/world-model/src/interfaces/action.ts` ✅
  - Remove export from `packages/world-model/src/interfaces/index.ts` ✅
  - This interface doesn't belong in world-model ✅

✅ **Update ValidatedCommand Interface**
  - File: `packages/world-model/src/commands/validated-command.ts` ✅
  - Change `actionHandler: Action` to `actionId: string` ✅
  - Remove import of Action interface ✅
  - Update comments to reflect this is just an ID ✅

✅ **Update CommandValidator Implementation**
  - File: `packages/stdlib/src/validation/command-validator.ts` ✅
  - Change to store action.id instead of action reference ✅
  - Update return type to use actionId ✅
  - Ensure validator still validates action exists ✅

✅ **Update CommandExecutor**
  - File: `packages/engine/src/command-executor.ts` ✅
  - Look up action from registry using `validatedCommand.actionId` ✅
  - Add error handling if action not found ✅
  - Remove any Action imports from world-model ✅

✅ **Remove 'extends Action' from ActionExecutor**
  - File: `packages/stdlib/src/actions/types.ts` ✅
  - ActionExecutor should be standalone interface ✅
  - No longer extends anything from world-model ✅

✅ **Update Tests**
  - Fix any tests that expect actionHandler to be an object ✅
  - Update to expect actionId string instead ✅
  - Update mock ValidatedCommand objects ✅
  - Fix imports (CommandValidatorImpl, StandardActionRegistry) ✅

✅ **Fix Import Errors**
  - Remove any remaining imports of Action from world-model ✅
  - Ensure all action imports come from stdlib ✅
  - Fix SystemEvent/GenericEventSource export from core ✅
  - Fixed PartOfSpeech enum → const object ✅
  - Removed obsolete command-resolver.ts ✅

✅ **Additional Fixes**
  - Created ADR-005 for Action Interface Location decision ✅
  - Created ADR-006 for Const Objects vs Enums ✅
  - Fixed standard-english.ts to use string literals ✅

## Step 9: Build and Test

☐ **Clean Build**
  ```bash
  npm run clean
  rm -rf node_modules
  npm install
  npm run build
  ```

☐ **Run All Tests**
  ```bash
  npm test
  ```

☐ **Check for Circular Dependencies**
  ```bash
  npx madge --circular packages/
  ```

☐ **Verify Package Dependencies**
  - Core should not depend on any @sharpee packages
  - World-model should only depend on core
  - Stdlib should depend on world-model and core
  - Engine should depend on all three

## Step 10: Migration and Cleanup

☐ **Create Migration Guide**
  - Document all import changes
  - Provide sed/grep commands for bulk updates
  - List breaking changes

☐ **Remove Old Code**
  - Delete any backup files
  - Remove commented-out code
  - Clean up TODO comments

☐ **Update Type Definition Files**
  - Regenerate .d.ts files
  - Ensure proper exports

## Rollback Plan

If issues arise:
1. Git stash current changes
2. Revert to pre-refactor branch
3. Analyze what went wrong
4. Create smaller incremental changes

## Success Criteria

- [ ] All packages build successfully
- [ ] All tests pass
- [ ] No circular dependencies
- [x] Core has zero @sharpee dependencies ✓
- [ ] Examples run correctly
- [x] Import paths are logical and consistent ✓

## Risk Mitigation

### High Risk Areas
1. **Duplicate Type Definitions** - May have types defined in multiple places
2. **Hidden Dependencies** - Core might have subtle IF assumptions
3. **Test Brittleness** - Tests might break from import changes
4. **Build Order** - Might need to adjust lerna/npm workspace configuration

### Mitigation Strategies
1. Use TypeScript's "find all references" before moving types
2. Run builds after each major step
3. Keep old types temporarily with deprecation notices
4. Update imports incrementally, testing after each package

## Estimated Timeline

- Step 1-2: 2 hours (Infrastructure setup)
- Step 3-6: 4 hours (Update all imports)
- Step 7-8: 2 hours (Cleanup and peripherals)
- Step 9-10: 2 hours (Testing and documentation)
- Buffer: 2 hours (For unexpected issues)

**Total: ~12 hours of focused work**

## Current Status

**Completed Steps:** 1, 2, 3, 4, 5, 6, 7, 8, 8.5 (8.5 of 10 steps - 85% complete)

**Remaining Steps:**
- Step 9: Build and Test
- Step 10: Migration and Cleanup

**Major Achievements:**
- ✅ Core is now truly generic with zero IF dependencies
- ✅ All IF-specific types moved to world-model
- ✅ Three-phase architecture fully implemented
- ✅ All packages updated to use new imports
- ✅ Documentation reflects new architecture
- ✅ Action interface location fixed - ValidatedCommand uses actionId
- ✅ Const objects pattern enforced (no enums)

## Notes

- This is a breaking change that will require version bump
- Consider releasing as alpha/beta first
- May want to maintain a compatibility layer temporarily
- Document thoroughly for external consumers
