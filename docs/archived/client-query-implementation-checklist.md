# Client Query System Implementation Checklist

## Overview
Implementation checklist for the PC communication system (ADR-018) to support client queries like quit confirmation, save prompts, disambiguation, and NPC dialogue.

## Phase 1: Core Infrastructure

### 1.1 Core Types and Interfaces
- [x] Create `packages/core/src/query/types.ts`
  - [x] `PendingQuery` interface
  - [x] `QuerySource` enum (system, disambiguation, npc, game_mechanic, narrative)
  - [x] `QueryType` enum (yes_no, multiple_choice, free_text, numeric, disambiguation)
  - [x] `QueryContext` interface
  - [x] `QueryResponse` interface
  - [x] `QueryValidator` type
  - [x] `ValidationResult` interface

### 1.2 Query Manager
- [x] Create `packages/core/src/query/query-manager.ts`
  - [x] `QueryManager` class
  - [x] Query state management (pending, stack)
  - [x] Query ID generation
  - [x] Query timeout handling
  - [x] Query interruption logic
  - [x] Response routing
  - [x] Validation framework

### 1.3 Query Events
- [x] Define query-related semantic events in `packages/core/src/events/`
  - [x] `client.query` event type
  - [x] `query.response` event type
  - [x] `query.cancelled` event type
  - [x] `query.timeout` event type

## Phase 2: Engine Integration

### 2.1 Engine Query Handling
- [x] Update `packages/engine/src/game-engine.ts`
  - [x] Add QueryManager instance
  - [x] Listen for `client.query` events
  - [x] Add query state to GameContext
  - [x] Implement input interception for responses

### 2.2 Command Executor Updates
- [x] Update `packages/engine/src/command-executor.ts`
  - [x] Check for pending queries before normal command processing
  - [x] Route input to QueryManager when query is pending
  - [x] Handle query interruption attempts

### 2.3 Turn Processing
- [x] Update turn execution flow
  - [x] Add pre-command query check
  - [x] Handle query response as special turn type
  - [ ] Ensure query responses don't affect turn count

## Phase 3: Standard Library Integration

### 3.1 Query Response Handlers
- [x] Create `packages/stdlib/src/query-handlers/`
  - [x] `QueryHandler` base interface
  - [x] `QuitQueryHandler` - handles quit confirmations
  - [ ] `SaveQueryHandler` - handles save confirmations
  - [ ] `YesNoQueryHandler` - generic yes/no handler
  - [ ] `MultipleChoiceQueryHandler` - generic choice handler

### 3.2 Query Registration
- [ ] Create query handler registry
  - [ ] Register handlers by query type
  - [ ] Allow custom handlers for stories

### 3.3 Update Existing Actions
- [x] Quit action ✅ (already done)
- [ ] Save action - emit query for overwrite confirmation
- [ ] Restore action - emit query for confirmation
- [ ] Restart action - emit query for confirmation

## Phase 4: Language Support

### 4.1 Query Messages
- [ ] Update language providers to include:
  - [ ] Standard query prompts
  - [ ] Query option labels
  - [ ] Validation error messages
  - [ ] Query timeout messages
  - [ ] Query cancelled messages

### 4.2 Parser Integration
- [ ] Update parsers to handle query responses
  - [ ] Number selection (1, 2, 3)
  - [ ] Option text matching
  - [ ] Yes/no variations
  - [ ] Cancel/abort commands

## Phase 5: Text Service Integration

### 5.1 Query Event Processing
- [x] Update text services to handle:
  - [x] `client.query` events (format for display)
  - [x] `query.response` events (confirmation messages)
  - [x] `query.cancelled` events
  - [x] `query.timeout` events

### 5.2 Query Formatting
- [ ] Create formatters for different query types
  - [ ] Yes/no prompt formatting
  - [ ] Multiple choice with numbered options
  - [ ] Free text prompt formatting

## Phase 6: Client Implementation

### 6.1 Client-Core Updates
- [ ] Update `packages/client-core/`
  - [ ] Query state management
  - [ ] Query UI components
  - [ ] Response handling

### 6.2 CLI Client
- [ ] Update `packages/client-cli/`
  - [ ] Display query prompts
  - [ ] Handle numbered responses
  - [ ] Show query state in prompt

### 6.3 Web Client
- [ ] Update `packages/client-web/`
  - [ ] Query dialog component
  - [ ] Inline query display
  - [ ] Response button handling

## Phase 7: Testing

### 7.1 Unit Tests
- [ ] QueryManager tests
  - [ ] State management
  - [ ] Timeout handling
  - [ ] Interruption logic
  - [ ] Response validation

### 7.2 Integration Tests
- [ ] Complete quit flow test
- [ ] Save overwrite flow test
- [ ] Query interruption test
- [ ] Query timeout test

### 7.3 E2E Tests
- [ ] CLI client query flow
- [ ] Web client query flow
- [ ] Multiple pending queries
- [ ] Error scenarios

## Phase 8: Advanced Features

### 8.1 Disambiguation Integration
- [ ] Connect to disambiguation system
- [ ] Handle object selection queries
- [ ] Support "all", "both" responses

### 8.2 NPC Conversation
- [ ] NPC query handler
- [ ] Conversation state tracking
- [ ] Topic-based responses

### 8.3 Game Mechanics
- [ ] Combination lock queries
- [ ] Password/riddle queries
- [ ] Timed queries

## Phase 9: Documentation

### 9.1 Developer Documentation
- [ ] Query system architecture guide
- [ ] How to create custom query handlers
- [ ] Query event reference
- [ ] Best practices for queries

### 9.2 Author Documentation
- [ ] How to emit queries from actions
- [ ] Query types and when to use them
- [ ] Examples of query usage
- [ ] Localization of queries

## Implementation Order

1. **Week 1**: Core Infrastructure (Phase 1)
2. **Week 2**: Engine Integration (Phase 2) 
3. **Week 3**: Stdlib Integration (Phase 3)
4. **Week 4**: Language & Text Service (Phases 4-5)
5. **Week 5**: Client Implementation (Phase 6)
6. **Week 6**: Testing (Phase 7)
7. **Week 7**: Advanced Features (Phase 8)
8. **Week 8**: Documentation (Phase 9)

## Success Criteria

- [ ] User can type "quit" and see confirmation dialog
- [ ] Selecting "quit" actually quits the game
- [ ] Selecting "cancel" returns to game
- [ ] Save with existing file shows overwrite confirmation
- [ ] Disambiguation shows numbered choices
- [ ] NPCs can ask questions and await responses
- [ ] Queries can timeout with appropriate message
- [ ] Queries can be interrupted when allowed
- [ ] All query types work in CLI and web clients

## Notes

- Start with minimal implementation for quit confirmation
- Build incrementally, testing each phase
- Ensure backward compatibility with existing actions
- Follow event-driven architecture throughout
- Keep text generation in text service only
