# Sharpee Implementation Tasks

Based on our design discussions, here's a structured list of tasks to implement the command execution and text emission systems for Sharpee:

## 1. Command Execution System

- [ ] Create a new module in `packages/core/src/execution/`
        1. `command-router.ts` - Routes parsed commands to appropriate handlers
        2. `command-handler.ts` - Base interfaces and types for command handlers
        3. `game-context.ts` - Context object structure for command execution
        4. `handlers/` subdirectory - Individual command handlers for standard verbs:
        - `look-handler.ts`
        - `take-handler.ts`
        - `drop-handler.ts`
        - `inventory-handler.ts`
        - `movement-handler.ts`
        - etc.
        5. `execution-result.ts` - Structures for command execution results
        6. `validation.ts` - Command validation utilities
        7. `index.ts` - Exports for the execution module
- [ ] Define interfaces in `types.ts` for:
  - [ ] `CommandHandler`
  - [ ] `CommandRouter`
  - [ ] `CommandResult`
  - [ ] `GameContext`
- [ ] Implement the base `CommandRouter` class
- [ ] Create a standard set of command handlers for basic IF verbs:
  - [ ] Look/Examine handler
  - [ ] Take/Get handler 
  - [ ] Drop handler
  - [ ] Inventory handler
  - [ ] Movement handler
- [ ] Implement command validation logic
- [ ] Link command execution system to parser output
- [ ] Create extension points for pre/post command processing

## 2. Semantic Event System

- [ ] Create a new module in `packages/core/src/events/`
- [ ] Define the `SemanticEvent` interface with:
  - [ ] Type identifiers
  - [ ] Entity references
  - [ ] Tags
  - [ ] Parameters
  - [ ] Priority
- [ ] Create standard event types enum
- [ ] Implement `EventSource` class for collecting events
- [ ] Add event emission methods to command handlers
- [ ] Create interfaces for event filtering and querying
- [ ] Implement event storage and retrieval

## 3. Channel System

- [ ] Create a new module in `packages/core/src/channels/`
- [ ] Define interfaces for:
  - [ ] `Channel`
  - [ ] `ChannelDefinition`
  - [ ] `ChannelManager`
- [ ] Implement standard channels
- [ ] Create a registration system for custom channels
- [ ] Implement channel filtering and grouping
- [ ] Link channel system to event source
- [ ] Add methods for channel content retrieval
- [ ] Create utility functions for channel operations

## 4. Text Generation System

- [ ] Create a new module in `packages/core/src/text-generation/`
- [ ] Define the `TextGenerator` interface
- [ ] Define template interfaces and functions
- [ ] Implement standard templates for common events
- [ ] Create helper functions for context-aware text generation
- [ ] Implement text formatting utilities
- [ ] Add support for different markup formats
- [ ] Build template registration system for author customization

## 5. Integration Tasks

- [ ] Connect parser output to command router
- [ ] Link command handler events to event source
- [ ] Connect event source to channel manager
- [ ] Link text generator to channels
- [ ] Create a main engine coordinator class
- [ ] Implement turn processing logic
- [ ] Build client response formatting

## 6. Extension Points

- [ ] Create pre-command execution hooks
- [ ] Add post-command execution hooks
- [ ] Implement event filtering extension points
- [ ] Create channel customization interfaces
- [ ] Build template override mechanisms
- [ ] Add response interceptor hooks

## 7. Testing

- [ ] Write unit tests for command handlers
- [ ] Create tests for event emission
- [ ] Test channel content generation
- [ ] Implement integration tests for full command flow
- [ ] Create test fixtures for common IF scenarios
- [ ] Build test utilities for story testing

## 8. Documentation

- [ ] Document command execution flow
- [ ] Create event type reference
- [ ] Document standard channels
- [ ] Write text generation guide
- [ ] Create extension examples
- [ ] Build author's guide for text customization

## 9. Sample Implementation

- [ ] Create a simple room navigation demo
- [ ] Implement basic object interaction
- [ ] Build a small sample story
- [ ] Demonstrate custom channel usage
- [ ] Show template customization examples
- [ ] Create extension examples

## Next Immediate Steps

1. Start by defining the core interfaces in command execution and event systems
2. Create the basic `CommandRouter` implementation
3. Implement at least one command handler (e.g., Look or Take)
4. Build the event emission system
5. Create initial channel definitions
6. Test the full flow with a simple command

This gives you a structured roadmap to implement the design concepts we've discussed. Would you like to focus on implementing any specific component first?