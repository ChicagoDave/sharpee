# Dynamic Load Refactoring Checklist

## Overview
Refactor from dynamic loading to static language/parser/text-service architecture per ADR-048.

## Phase 1: Create Platform Packages
- [ ] Create `packages/platforms/` directory structure
- [ ] Create `packages/platforms/cli-en-us/` package
  - [ ] Create `package.json` with dependencies
  - [ ] Create `src/index.ts` entry point
  - [ ] Create `src/cli-platform.ts` platform handler
  - [ ] Create `src/cli-input.ts` input handler
  - [ ] Create `src/cli-output.ts` output handler
  - [ ] Create `src/cli-query.ts` query handler
- [ ] Create `packages/platforms/test/` package for testing
  - [ ] Create minimal test platform
  - [ ] Export test helpers

## Phase 2: Refactor Engine Core

### 2.1 GameEngine Class (`packages/engine/src/game-engine.ts`)
- [ ] Change constructor signature to accept dependencies
  ```typescript
  constructor(options: {
    world: WorldModel;
    player: Entity;
    parser: Parser;
    language: LanguageProvider;
    textService: TextService;
  })
  ```
- [ ] Remove `setLanguage()` method
- [ ] Remove `setTextService()` method
- [ ] Remove `setTextServiceFromConfig()` private method
- [ ] Remove `loadLanguageAndParser()` private method
- [ ] Remove language loading from `setStory()`
- [ ] Update `setStory()` to only handle world initialization
- [ ] Remove `config.language` and `config.textService` handling
- [ ] Update `start()` to verify dependencies are present
- [ ] Update error messages to reflect new architecture

### 2.2 Story Interface (`packages/engine/src/story.ts`)
- [ ] Remove `StoryConfig.language` field
- [ ] Remove `StoryConfig.textService` field
- [ ] Add optional `extendParser?(parser: Parser): void` method
- [ ] Add optional `extendLanguage?(language: LanguageProvider): void` method
- [ ] Remove `loadLanguageProvider()` function
- [ ] Remove `loadTextService()` function
- [ ] Remove `loadParser()` function
- [ ] Update `validateStoryConfig()` to not check language
- [ ] Update TSDoc comments

### 2.3 Command Executor (`packages/engine/src/command-executor.ts`)
- [ ] Update constructor to receive parser directly
- [ ] Remove any dynamic parser resolution
- [ ] Update error messages

### 2.4 Remove Dynamic Loading Utils
- [ ] Delete `packages/engine/src/utils/load-language.ts` (if exists)
- [ ] Delete `packages/engine/src/utils/load-parser.ts` (if exists)
- [ ] Delete `packages/engine/src/utils/load-text-service.ts` (if exists)

## Phase 3: Update Test Infrastructure

### 3.1 Create Test Helpers (`packages/engine/tests/test-helpers/`)
- [ ] Update `setup-test-engine.ts` with static imports
- [ ] Create `create-test-platform.ts` helper
- [ ] Update `mock-text-service.ts` if needed
- [ ] Create `test-fixtures.ts` for common test data

### 3.2 Update Integration Tests (`packages/engine/tests/integration/`)
- [ ] Fix `command-history.test.ts`
  - [ ] Use static imports
  - [ ] Use setupTestEngine helper
  - [ ] Remove async story loading
- [ ] Fix `query-system.test.ts`
  - [ ] Use static imports
  - [ ] Remove async loading workarounds
- [ ] Fix `query-events.test.ts`
  - [ ] Simplify setup
- [ ] Update `platform-operations.test.ts`
  - [ ] Use platform-specific handlers
- [ ] Update `text-output.test.ts`
  - [ ] Direct text service usage

### 3.3 Update Unit Tests (`packages/engine/tests/unit/`)
- [ ] Update `game-engine.test.ts`
- [ ] Update `command-executor.test.ts`
- [ ] Update any other affected unit tests

### 3.4 Update Story Tests
- [ ] Update `packages/engine/tests/stories/` test stories
- [ ] Remove language config from test stories

## Phase 4: Update Parser and Language Packages

### 4.1 Parser Updates (`packages/parser-en-us/`)
- [ ] Export class directly (not default export)
- [ ] Add extension methods for custom vocabulary
  - [ ] `addVerb(id: string, patterns: string[])`
  - [ ] `addNoun(word: string, canonical: string)`
  - [ ] `addAdjective(word: string)`
  - [ ] `addPreposition(word: string)`
- [ ] Update exports in `index.ts`

### 4.2 Language Provider Updates (`packages/lang-en-us/`)
- [ ] Export class directly (not default export)
- [ ] Add extension methods
  - [ ] `addMessage(id: string, template: string)`
  - [ ] `addActionHelp(actionId: string, help: string)`
  - [ ] `addActionPatterns(actionId: string, patterns: string[])`
- [ ] Update exports in `index.ts`

## Phase 5: Update Stories

### 5.1 Cloak of Darkness (`stories/cloak-of-darkness/`)
- [ ] Remove language from config
- [ ] Remove text service from config
- [ ] Add `extendParser()` if custom vocabulary needed
- [ ] Add `extendLanguage()` if custom messages needed
- [ ] Update `run-cli.js` to use platform package
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
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No test timeouts
- [ ] Tests run in < 5 seconds

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