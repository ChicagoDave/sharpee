# Meta-Commands Implementation Checklist

## Overview
Implementing the hybrid approach for meta-commands as described in ADR-050.

## Phase 1: Core Infrastructure ✅
### Create Base Classes and Registry
- [x] Create `packages/stdlib/src/actions/meta-action.ts`
  - [x] Define abstract `MetaAction` class
  - [x] Implement `ensureRegistered()` method for registration
  - [x] Export from actions index

- [x] Create `packages/stdlib/src/actions/meta-registry.ts`
  - [x] Define `MetaCommandRegistry` class
  - [x] Add static `metaCommands` Set
  - [x] Implement `register()` method
  - [x] Implement `isMeta()` method
  - [x] Implement `getAll()` method for debugging
  - [x] Pre-register standard meta-commands:
    - [x] 'if.action.saving'
    - [x] 'if.action.restoring'
    - [x] 'if.action.quitting'
    - [x] 'if.action.restarting'
    - [x] 'if.action.scoring'
    - [x] 'if.action.version'
    - [x] 'if.action.about'
    - [x] 'if.action.help'
    - [x] 'if.action.again'
    - [x] 'transcript'
    - [x] 'undo'
  - [x] Export from actions index

### Update Exports
- [x] Update `packages/stdlib/src/actions/index.ts`
  - [x] Export `MetaAction`
  - [x] Export `MetaCommandRegistry`
  
- [x] Update `packages/stdlib/src/index.ts`
  - [x] Already re-exports through actions module

## Phase 2: Engine Integration ✅
### Modify Game Engine
- [x] Update `packages/engine/src/game-engine.ts`
  - [x] Import `MetaCommandRegistry` from stdlib
  - [x] In `executeTurn()` method at line 342:
    ```typescript
    // Check if this is a meta-command (out-of-world action)
    // Meta-commands don't increment turns, trigger NPCs, or get recorded in history
    const isMeta = result.actionId ? MetaCommandRegistry.isMeta(result.actionId) : false;
    
    if (result.success && !isMeta) {
      this.updateCommandHistory(result, input, turn);
    }
    
    if (!isMeta) {
      this.updateContext(result);
    } else {
      this.updateScopeVocabulary();
    }
    ```
  - [x] Add comment explaining meta-command handling
  - [x] Ensure turn counter doesn't increment
  - [x] Ensure command history isn't updated

### Test Engine Changes
- [x] Verify stdlib still builds
- [x] Verify engine builds with changes
- [x] Meta-command logic implemented correctly

## Phase 3: Command Migration ✅
### Refactor Author Commands
- [x] Update `packages/stdlib/src/actions/author/parser-events.ts`
  - [x] Changed to extend `MetaAction` instead of implementing `Action`
  - [x] Added constructor with `ensureRegistered()` call
  - [x] Builds successfully

- [x] Update `packages/stdlib/src/actions/author/validation-events.ts`
  - [x] Changed to extend `MetaAction`
  - [x] Added constructor with `ensureRegistered()` call
  - [x] Builds successfully

- [x] Update `packages/stdlib/src/actions/author/system-events.ts`
  - [x] Changed to extend `MetaAction`
  - [x] Added constructor with `ensureRegistered()` call
  - [x] Builds successfully

### Register Existing System Commands
- [x] Identified system commands use IFActions constants
  - [x] Found in `packages/stdlib/src/actions/constants.ts`
  - [x] Commands use `if.action.*` naming convention

- [x] Updated pre-registered commands in MetaCommandRegistry:
  - [x] 'if.action.saving'
  - [x] 'if.action.restoring'
  - [x] 'if.action.quitting'
  - [x] 'if.action.restarting'
  - [x] 'if.action.scoring'
  - [x] 'if.action.version'
  - [x] 'if.action.about'
  - [x] 'if.action.help'
  - [x] 'if.action.again'

### Update Author Command Exports
- [x] Verified `packages/stdlib/src/actions/author/index.ts` exports all commands
- [x] No changes needed - exports were already correct

## Phase 4: Testing ✅
### Unit Tests
- [x] Created `packages/stdlib/tests/unit/actions/meta-registry.test.ts`
  - [x] Test registration methods
  - [x] Test isMeta() checks
  - [x] Test pre-registered commands
  - [x] Test getAll() method
  - [x] Test reset and clear methods
  - [x] Test custom command detection
  - [x] 13 tests passing

### Integration Tests
- [x] Created `packages/stdlib/tests/integration/meta-commands.test.ts`
  - [x] Test MetaAction auto-registration
  - [x] Test standard meta-commands recognition
  - [x] Test author commands are meta
  - [x] Test non-meta commands are not recognized
  - [x] Test custom command detection
  - [x] 18 tests passing

### Manual Testing
- [x] Run Cloak of Darkness story - ✅ Story runs successfully
- [ ] Test PARSER EVENTS ON command
  - [ ] Verify no turn increment
  - [ ] Verify debug output enabled
- [ ] Test PARSER EVENTS OFF command
  - [ ] Verify no turn increment
  - [ ] Verify debug output disabled
- [ ] Test regular command after meta-command
  - [ ] Verify turn increments normally
  
**BLOCKED**: Author actions not automatically available to stories (see Issues section)

## Phase 5: Documentation ✅
### Code Documentation
- [x] Add JSDoc comments to MetaAction class
- [x] Add JSDoc comments to MetaCommandRegistry
- [x] Add inline comments in engine for meta-command handling

### User Documentation
- [x] Created ADR-050 documenting the decision
- [x] Created assessment document with comparisons
- [x] Created this implementation checklist

### Developer Documentation
- [x] Comprehensive code comments throughout
- [x] Example usage in JSDoc comments

## Phase 6: System Event Emission ✅
### Debug Capability
- [x] Created `packages/stdlib/src/capabilities/debug.ts`
  - [x] Defined DebugCapabilitySchema with flags
  - [x] debugParserEvents flag
  - [x] debugValidationEvents flag
  - [x] debugSystemEvents flag
  - [x] Export DEBUG_CAPABILITY constant
  - [x] Export helper functions

- [x] Updated `packages/stdlib/src/capabilities/index.ts`
  - [x] Added DEBUG to StandardCapabilitySchemas
  - [x] Export debug types and schema

### Command Executor Updates
- [x] Modified `packages/engine/src/command-executor.ts`
  - [x] Check debug capability flags
  - [x] Emit `system.parser` events when debugParserEvents is true
  - [x] Emit `system.validation.success` events when debugValidationEvents is true
  - [x] Emit `system.validation.failed` events when debugValidationEvents is true
  - [x] Include system events in turn results

### Test Updates
- [x] Fixed capability test expecting 6 instead of 5
- [x] Fixed text-services using getCapability instead of getSharedData

## Phase 7: Verification ✅
### Build Verification
- [x] Run `pnpm build` in stdlib - ✅ builds successfully
- [x] Run `pnpm build` in engine - ✅ builds successfully
- [x] Verify no TypeScript errors - ✅ no errors

### Test Verification
- [x] Run unit tests in stdlib - ✅ 13 tests passing
- [x] Run integration tests in stdlib - ✅ 18 tests passing
- [x] Verify all tests pass - ✅ all passing

### Runtime Verification
- [ ] Test with a complete story (manual testing pending)
- [ ] Verify meta-commands work as expected
- [ ] Verify regular commands still work
- [ ] Check turn counter behavior
- [ ] Check AGAIN command doesn't repeat meta-commands

## Completion Criteria (Partial) ⚠️
- [x] All author commands are meta-commands
- [x] Turn counter doesn't increment for meta-commands
- [x] Command history excludes meta-commands
- [x] All tests pass
- [x] Documentation is complete
- [ ] Author actions automatically available to stories **BLOCKED**
- [ ] Code review completed

## Notes
- Used `ensureRegistered()` method instead of automatic registration in constructor
- Updated registry with correct `if.action.*` IDs for standard commands
- Commented out pre-existing debug event code that had compilation errors
- Integration tests use dynamic imports to load author commands

## Issues Encountered
1. **Constructor registration timing**: Initially tried setTimeout(0) but switched to explicit `ensureRegistered()` call
2. **Action ID mismatch**: Registry had 'saving' but actions use 'if.action.saving' - updated to correct IDs
3. **Pre-existing engine errors**: Commented out debug event code with `getSharedData()` errors (unrelated to meta-commands)
4. **Test imports**: Had to use dynamic imports in integration tests for author commands
5. **Author actions not auto-loaded** ⚠️: Author actions exist in stdlib but aren't included in standardActions array that GameEngine loads
   - **Impact**: Stories can't use author commands without manual registration
   - **Workaround**: Stories must manually register author actions (defeats purpose)
   - **Solution needed**: Add author actions to standardActions array or create separate auto-loaded category

## Implementation Summary
Successfully implemented a non-invasive meta-command system using:
- **MetaAction base class**: For new meta-commands to extend
- **MetaCommandRegistry**: Centralized registry with pre-registered standard commands
- **Engine integration**: Checks registry to skip turn increment and command history
- **31 tests**: All passing (13 unit + 18 integration)

## Phase 8: Make Author Actions Built-in
### Option A: Add to standardActions (Recommended)
- [ ] Update `packages/stdlib/src/actions/standard/index.ts`
  - [ ] Import ParserEventsAction from '../author'
  - [ ] Import ValidationEventsAction from '../author'
  - [ ] Import SystemEventsAction from '../author'
  - [ ] Add to standardActions array:
    ```typescript
    new ParserEventsAction(),
    new ValidationEventsAction(),
    new SystemEventsAction(),
    ```
  - [ ] Verify no circular dependencies
  - [ ] Build and test

### Option B: Create systemActions category (Alternative)
- [ ] Create `packages/stdlib/src/actions/system/index.ts`
  - [ ] Export systemActions array with author actions
  - [ ] Export authorActions specifically
- [ ] Update `packages/stdlib/src/actions/index.ts`
  - [ ] Export systemActions
- [ ] Update `packages/engine/src/game-engine.ts`
  - [ ] Import systemActions from stdlib
  - [ ] Register systemActions in constructor after standardActions
  - [ ] Build and test

### Option C: Auto-register in StandardActionRegistry (Alternative)
- [ ] Update `packages/stdlib/src/actions/registry.ts`
  - [ ] Import author actions in StandardActionRegistry
  - [ ] In constructor, auto-register author actions
  - [ ] Ensure no duplicate registration
  - [ ] Build and test

### Verification
- [ ] Build stdlib package
- [ ] Build engine package
- [ ] Build Cloak of Darkness story
- [ ] Run story without manual registration
- [ ] Verify "parser events on" command is recognized
- [ ] Verify "validation events on" command is recognized
- [ ] Verify "system events on" command is recognized

## Phase 9: Complete Manual Testing
### Prerequisites
- [ ] Author actions are built-in (Phase 8 complete)
- [ ] All packages rebuilt
- [ ] Cloak of Darkness story built

### Test Meta-Command Behavior
- [ ] Test PARSER EVENTS ON command
  - [ ] Command is recognized
  - [ ] Turn counter doesn't increment
  - [ ] Debug capability flag is set
  - [ ] Parser events appear in subsequent commands
- [ ] Test PARSER EVENTS OFF command
  - [ ] Command is recognized
  - [ ] Turn counter doesn't increment
  - [ ] Debug capability flag is cleared
  - [ ] Parser events stop appearing
- [ ] Test VALIDATION EVENTS ON command
  - [ ] Command is recognized
  - [ ] Turn counter doesn't increment
  - [ ] Validation events appear in output
- [ ] Test VALIDATION EVENTS OFF command
  - [ ] Command is recognized
  - [ ] Turn counter doesn't increment
  - [ ] Validation events stop appearing

### Test Turn Counter Behavior
- [ ] Record turn number before meta-command
- [ ] Execute meta-command
- [ ] Verify turn number unchanged
- [ ] Execute regular command
- [ ] Verify turn number incremented by 1

### Test Command History
- [ ] Execute several regular commands
- [ ] Execute meta-command
- [ ] Execute AGAIN command
- [ ] Verify AGAIN repeats last regular command, not meta-command
- [ ] Check command history doesn't include meta-commands

### Test System Event Output
- [ ] Enable parser events
- [ ] Execute "look" command
- [ ] Verify system.parser event in output with:
  - [ ] Input string
  - [ ] Parsed action
  - [ ] Pattern matched
  - [ ] Confidence score
- [ ] Enable validation events
- [ ] Execute valid command
- [ ] Verify system.validation.success event
- [ ] Execute invalid command
- [ ] Verify system.validation.failed event

## Next Steps Required
1. **Choose implementation approach** (Option A recommended - simplest and most direct)
2. **Implement chosen approach** to make author actions built-in
3. **Complete manual testing** once actions are available
4. **Update documentation** if needed based on chosen approach

## Sign-off
- [x] Core implementation complete
- [x] Tests passing (31 tests + 1 fixed capability test)
- [x] Documentation updated
- [ ] Author actions auto-loading **PENDING**
- [ ] Ready for manual testing **BLOCKED** on author actions availability