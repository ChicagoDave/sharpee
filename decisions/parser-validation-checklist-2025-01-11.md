# Parser-Validation-Execution Refactor Checklist

**Last Updated:** 2025-01-11

## Phase 1: Parser Refactoring ✅ COMPLETE

### Type Definitions
- [x] Create ParsedCommand type in @sharpee/core
- [x] Create ValidatedCommand type in @sharpee/core  
- [x] Create ParsedObjectReference & ValidatedObjectReference types
- [x] Create CommandResult type wrapper
- [x] Create error types (ParseError, ValidationError, ExecutionError)
- [x] Create interfaces (IParser, ICommandValidator, ICommandExecutor)
- [x] Export new types from @sharpee/core/command

### Parser Updates
- [x] Update BasicParser to implement IParser
- [x] Add parse() method returning CommandResult<ParsedCommand>
- [x] Make CandidateCommand internal (moved to parser-internals.ts)
- [x] Remove parseMultiple() from public API  
- [x] Update parser to be completely world-agnostic
- [x] Add debug event support (setDebugEventSource)
- [x] Emit debug events at key points:
  - [x] tokenize event
  - [x] pattern_match event
  - [x] candidate_selection event
  - [x] parse_error event

### Documentation
- [x] Create ADR-001 for Parser Debug Events
- [x] Create ADR-002 for Debug Mode Meta Commands
- [x] Create ADR-003 for Internal Parser Types
- [x] Document debug event structure

## Phase 2: Validator Implementation 🚧 IN PROGRESS

### Core Validator
- [x] Create CommandValidator class structure
- [x] Implement ICommandValidator interface
- [x] Basic entity resolution (by type/name)
- [x] Basic visibility checks (same room + inventory)
- [ ] Complete entity resolution logic:
  - [ ] Handle adjective matching (red ball vs blue ball)
  - [ ] Implement scope rules (reachable, touchable)
  - [ ] Add pronoun resolution ("it", "them", "all")
  - [ ] Handle ambiguous references
  - [ ] Support "all" and "all except" patterns
- [ ] Add debug event support for validator
- [ ] Comprehensive precondition checking

### Validator Integration  
- [ ] Extract reusable logic from CommandResolver
- [ ] Decide: refactor or replace CommandResolver
- [ ] Create validator factory/configuration
- [ ] Add validator to game context

### Action Metadata
- [ ] Define ActionMetadata interface
- [ ] Add metadata to actions:
  - [ ] requiresDirectObject: boolean
  - [ ] requiresIndirectObject: boolean  
  - [ ] validPrepositions: string[]
  - [ ] preconditions: Precondition[]

## Phase 3: Action Updates ❌ NOT STARTED

### Type Updates
- [ ] Update IAction interface to use ValidatedCommand
- [ ] Remove ParsedCommand from action signatures
- [ ] Update ActionContext if needed

### Action Migration
- [ ] Update TakeAction to use ValidatedCommand
- [ ] Update DropAction to use ValidatedCommand
- [ ] Update ExamineAction to use ValidatedCommand
- [ ] Update GoAction to use ValidatedCommand
- [ ] Update OpenAction to use ValidatedCommand
- [ ] Remove validation logic from actions

### Action Registry
- [ ] Update ActionRegistry to work with new types
- [ ] Ensure registry provides action metadata
- [ ] Update action lookup mechanisms

## Phase 4: Integration ❌ NOT STARTED

### Command Processor
- [ ] Create CommandProcessor class
- [ ] Chain parse → validate → execute phases
- [ ] Handle errors from each phase appropriately
- [ ] Add performance timing/metrics

### Engine Updates
- [ ] Update Engine to use CommandProcessor
- [ ] Remove old command processing path
- [ ] Update GameContext with new components
- [ ] Ensure backward compatibility where needed

### Debug Mode Implementation
- [ ] Create DebugOnAction and DebugOffAction
- [ ] Implement DebugEventSource with ring buffer
- [ ] Create DebugTextFormatter
- [ ] Add debug mode state to GameState
- [ ] Wire up debug commands in vocabulary

## Phase 5: Testing & Cleanup ❌ NOT STARTED

### Unit Tests
- [ ] Parser tests (without world model)
- [ ] Validator tests (with mock world)
- [ ] Action tests (with validated commands)
- [ ] Integration tests for full pipeline

### Documentation
- [ ] Update API documentation
- [ ] Create migration guide
- [ ] Update examples
- [ ] Architecture diagrams

### Cleanup
- [ ] Remove deprecated code paths
- [ ] Clean up circular dependencies
- [ ] Optimize performance hot spots
- [ ] Final build verification

## Current Status Summary

**Completed:**
- Parser is fully refactored and world-agnostic ✅
- All types are defined in @sharpee/core ✅
- Parser debug events are implemented ✅
- Internal types are properly encapsulated ✅

**In Progress:**
- CommandValidator has basic structure but needs completion 🚧
- Entity resolution is rudimentary 🚧

**Not Started:**
- Actions still use old ParsedCommand type ❌
- No integration between phases ❌
- Debug mode commands not implemented ❌

**Next Immediate Tasks:**
1. Complete entity resolution in CommandValidator
2. Add debug events to CommandValidator
3. Extract/refactor CommandResolver logic
4. Begin updating actions to use ValidatedCommand
