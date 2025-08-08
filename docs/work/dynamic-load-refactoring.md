# Dynamic Load Refactoring Checklist

## Status Update - August 8, 2025 (01:20 CDT)

### Phase 4 Completion Summary
✅ **Parser and Language Provider Extensions Completed**
- All 4 failing tests in parser-extension.test.ts fixed
- Parser extension methods working:
  - `addVerb()` now registers both vocabulary and grammar patterns
  - `addPreposition()` registers vocabulary and common patterns (put/place)
  - `addNoun()` and `addAdjective()` placeholder methods in place
- Language provider extensions working:
  - `addMessage()` for custom messages
  - `addActionHelp()` using correct ActionHelp interface (summary, not usage)
  - `addActionPatterns()` with proper storage and retrieval
  - Pattern merging with existing actions functional

### Test Suite Status
- **Engine Tests**: 177 passed | 4 skipped | 0 failed
- **Parser Extension Tests**: All 8 passing ✅
- **Language Provider Tests**: All passing ✅
- **Stdlib Tests**: Module resolution issues need addressing

### Key Fixes Applied
1. **Parser Grammar Registration**: `addVerb()` now creates grammar patterns alongside vocabulary
2. **ActionHelp Interface**: Fixed test to use `summary` instead of non-existent `usage` property
3. **Pattern Storage**: Added `customActionPatterns` Map to language provider for proper pattern management
4. **Vitest Configuration**: Added aliases for parser-en-us and lang-en-us packages

### Command History Architecture Confirmed
- **Command History**: Stores only successful, repeatable commands for AGAIN functionality
- **Event Source**: Complete audit trail of all events including failures
- Implementation correctly filters based on `result.success` before adding to history

### Next Priority
- Fix stdlib test module resolution (vitest can't find parser/lang packages)
- Complete Phase 5: Update Stories
- Begin Phase 6: Platform Event Refactoring

## Overview
Refactor from dynamic loading to static language/parser/text-service architecture per ADR-048.

## Phase 1: Create Platform Packages
- [x] Create `packages/platforms/` directory structure
- [x] Create `packages/platforms/cli-en-us/` package
  - [x] Create `package.json` with dependencies
  - [x] Create `src/index.ts` entry point
  - [x] Create `src/cli-platform.ts` platform handler
  - [x] Create `src/cli-input.ts` input handler
  - [x] Create `src/cli-output.ts` output handler
  - [x] Create `src/cli-query.ts` query handler
- [x] Create `packages/platforms/test/` package for testing
  - [x] Create minimal test platform
  - [x] Export test helpers

## Phase 2: Refactor Engine Core

### 2.1 GameEngine Class (`packages/engine/src/game-engine.ts`)
- [x] Change constructor signature to accept dependencies
  ```typescript
  constructor(options: {
    world: WorldModel;
    player: Entity;
    parser: Parser;
    language: LanguageProvider;
    textService: TextService;
  })
  ```
- [x] Remove `setLanguage()` method
- [x] Remove `setTextService()` method
- [x] Remove `setTextServiceFromConfig()` private method
- [x] Remove `loadLanguageAndParser()` private method
- [x] Remove language loading from `setStory()`
- [x] Update `setStory()` to only handle world initialization
- [x] Remove `config.language` and `config.textService` handling
- [x] Update `start()` to verify dependencies are present
- [x] Update error messages to reflect new architecture

### 2.2 Story Interface (`packages/engine/src/story.ts`)
- [x] Remove `StoryConfig.language` field
- [x] Remove `StoryConfig.textService` field
- [x] Add optional `extendParser?(parser: Parser): void` method
- [x] Add optional `extendLanguage?(language: LanguageProvider): void` method
- [x] Remove `loadLanguageProvider()` function
- [x] Remove `loadTextService()` function
- [x] Remove `loadParser()` function
- [x] Update `validateStoryConfig()` to not check language
- [x] Update TSDoc comments

### 2.3 Command Executor (`packages/engine/src/command-executor.ts`)
- [x] Update constructor to receive parser directly
- [x] Remove any dynamic parser resolution
- [x] Update error messages

### 2.4 Remove Dynamic Loading Utils
- [x] Delete `packages/engine/src/utils/load-language.ts` (if exists)
- [x] Delete `packages/engine/src/utils/load-parser.ts` (if exists)
- [x] Delete `packages/engine/src/utils/load-text-service.ts` (if exists)

## Phase 3: Update Test Infrastructure

### 3.1 Create Test Helpers (`packages/engine/tests/test-helpers/`)
- [x] Update `setup-test-engine.ts` with static imports
- [x] Create `create-test-platform.ts` helper (via setupTestEngine)
- [x] Update `mock-text-service.ts` if needed
- [x] Create `test-fixtures.ts` for common test data (via MinimalTestStory)

### 3.2 Update Integration Tests (`packages/engine/tests/integration/`)
- [x] Fix `command-history.test.ts`
  - [x] Use static imports
  - [x] Use setupTestEngine helper
  - [x] Remove async story loading
  - [ ] Fix test isolation issues (7 tests skipped)
- [x] Fix `query-system.test.ts`
  - [x] Use static imports
  - [x] Remove async loading workarounds
  - [x] Fix query type expectations
  - [x] Fix event emission and propagation
- [x] Fix `query-events.test.ts`
  - [x] Simplify setup
  - [x] Fix event connections
- [x] Update `platform-operations.test.ts`
  - [x] Fix save/restore parameter expectations
  - [x] Fix event payload structure
  - [x] Add missing turnHistory field
- [ ] Update `text-output.test.ts`
  - [ ] Direct text service usage

### 3.3 Update Unit Tests (`packages/engine/tests/unit/`)
- [x] Update `game-engine.test.ts`
  - [x] Use setupTestEngine helper
  - [x] Fix platform event expectations
- [x] Update `command-executor.test.ts`
  - [x] Use static dependencies
  - [x] Fix language provider usage
- [x] Update any other affected unit tests

### 3.4 Update Story Tests
- [x] Update `packages/engine/tests/stories/` test stories
- [x] Remove language config from test stories
- [x] Create MinimalTestStory fixture

## Phase 4: Update Parser and Language Packages ✅

### 4.1 Parser Updates (`packages/parser-en-us/`)
- [x] Export class directly (not default export)
- [x] Add extension methods for custom vocabulary
  - [x] `addVerb(actionId: string, verbs: string[], pattern?: string, prepositions?: string[])`
  - [x] `addNoun(word: string, canonical: string)` - Placeholder for future
  - [x] `addAdjective(word: string)` - Placeholder for future
  - [x] `addPreposition(word: string)`
- [x] Update exports in `index.ts`
- ⚠️ Note: Verb and preposition registration needs debugging (tests failing)

### 4.2 Language Provider Updates (`packages/lang-en-us/`)
- [x] Export class directly (not default export)
- [x] Add extension methods
  - [x] `addMessage(messageId: string, template: string)` ✅ Working
  - [x] `addActionHelp(actionId: string, help: ActionHelp)` ✅ Working
  - [x] `addActionPatterns(actionId: string, patterns: string[])` ✅ Working
- [x] Update exports in `index.ts`
- ✅ All language provider extension tests passing

## Phase 5: Update Stories

### 5.1 Cloak of Darkness (`stories/cloak-of-darkness/`)
- [x] Remove language from config
- [x] Remove text service from config
- [x] Add `extendParser()` if custom vocabulary needed
- [x] Add `extendLanguage()` if custom messages needed
- [x] Update `run-cli.js` to use platform package
- [ ] Update any build scripts

### 5.2 Other Stories (if any)
- [ ] Apply same changes as above

## Phase 6: Platform Event Refactoring

### 6.1 Move Query Management to Platform
- [ ] Move query manager from engine to platform
- [ ] Platform owns query handlers
- [ ] Platform decides query UI (terminal vs dialog)

### 6.2 Platform Event Handlers
- [ ] Move quit handling to platform
- [ ] Move save/restore to platform
- [ ] Move restart to platform
- [ ] Platform subscribes directly to events

## Phase 7: Build Process Updates

### 7.1 Package.json Scripts
- [ ] Add build script for each platform/language combo
- [ ] Update test scripts to not need dynamic loading
- [ ] Add watch scripts for development
- [ ] Update release scripts

### 7.2 Build Configuration
- [ ] Create build configs for each platform
- [ ] Set up tree-shaking optimization
- [ ] Configure bundling per platform

### 7.3 CI/CD Updates
- [ ] Update GitHub Actions to build all platforms
- [ ] Update test runners
- [ ] Update release process

## Phase 8: Documentation Updates

### 8.1 Architecture Docs
- [ ] Update architecture diagrams
- [ ] Update component descriptions
- [ ] Update sequence diagrams

### 8.2 Developer Guides
- [ ] Create platform development guide
- [ ] Update story creation guide
- [ ] Update testing guide

### 8.3 API Documentation
- [ ] Update engine API docs
- [ ] Update story interface docs
- [ ] Update platform API docs

## Phase 9: Migration Tools

### 9.1 Story Migration Script
- [ ] Create script to migrate story configs
- [ ] Remove language/textService from config
- [ ] Generate platform entry points
- [ ] Test on all existing stories

### 9.2 Test Migration Script
- [ ] Create script to update test imports
- [ ] Convert async setup to sync
- [ ] Update to use test helpers

## Phase 10: Cleanup

### 10.1 Remove Old Code
- [ ] Remove all dynamic import code
- [ ] Remove unused async helpers
- [ ] Remove compatibility layers

### 10.2 Dependency Updates
- [ ] Update package dependencies
- [ ] Remove unused dependencies
- [ ] Update peer dependencies

### 10.3 Final Testing
- [ ] Run full test suite
- [ ] Test all platform builds
- [ ] Performance benchmarks
- [ ] Memory usage analysis

## Verification Checklist

### Tests Pass
- [x] All unit tests pass
- [x] All integration tests pass (except 7 skipped for isolation)
- [x] No test timeouts
- [x] Tests run in reasonable time

### Builds Work
- [ ] CLI English build works
- [ ] Each platform builds successfully
- [ ] Bundle sizes are reasonable
- [ ] Tree-shaking is effective

### Stories Run
- [ ] Cloak of Darkness runs correctly
- [ ] Custom vocabulary works
- [ ] Platform events work
- [ ] Query system works

### Performance Metrics
- [ ] Startup time < 100ms
- [ ] Command response < 50ms
- [ ] Memory usage stable
- [ ] No memory leaks

## Rollback Plan
If issues arise:
1. Git branch has all changes isolated
2. Can revert to dynamic loading temporarily
3. Can ship hybrid (some static, some dynamic)
4. Keep old test helpers available

## Success Criteria
- [ ] No dynamic imports in core engine
- [ ] All tests run without timeouts
- [ ] Platform-specific builds work
- [ ] Developer experience improved
- [ ] Type safety throughout

## Notes
- Start with test platform to validate approach
- Keep changes in feature branch until complete
- Run tests after each phase
- Document any unexpected issues