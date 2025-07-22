# Query System Implementation TODO

This document outlines what needs to be implemented for the PC communication query system to work properly with the quit action and other query-based interactions.

## Overview

The quit action now properly emits a `client.query` event following ADR-018, but the query system itself hasn't been implemented yet. When the user types "quit", the action emits an event asking the client to display a confirmation dialog.

## Components Needed

### 1. Query Manager (Core)
Location: `packages/core/src/query/`

- **QueryManager class**: Manages pending queries and routes responses
- **PendingQuery interface**: Represents a query waiting for response
- **QueryHandler interface**: Handles responses for specific query types
- **QueryValidator**: Validates responses before processing

### 2. Query Response Handler (Engine)
Location: `packages/engine/src/`

The game engine needs to:
- Listen for `client.query` events
- Store pending queries
- Intercept input that looks like a response
- Route responses to appropriate handlers
- Emit response events

### 3. Query Response Actions (Stdlib)
Location: `packages/stdlib/src/actions/query-responses/`

We need actions that handle query responses:
- **QuitResponseHandler**: Processes quit confirmation responses
- **SaveResponseHandler**: Processes save confirmation responses
- **GenericYesNoHandler**: Handles simple yes/no queries

### 4. Client Implementation
Location: `packages/client-*`

Clients need to:
- Listen for `client.query` events
- Display appropriate UI (dialog, inline prompt, etc.)
- Send responses back as commands or special response events

## Event Flow

1. **User types "quit"** → Parser → Quit action executes
2. **Quit action emits** `client.query` event with:
   ```typescript
   {
     queryId: "quit_1234567890",
     source: "system",
     type: "quit_confirmation",
     messageId: "quit_confirm_query",
     options: ["quit", "cancel"],
     context: { score: 10, maxScore: 100, ... },
     allowInterruption: false
   }
   ```

3. **Query Manager** receives event and:
   - Stores pending query
   - Notifies client to display dialog
   - Sets input mode to "awaiting response"

4. **Client displays** confirmation dialog:
   ```
   Are you sure you want to quit?
   [1] Quit
   [2] Return to game
   ```

5. **User selects option** → Client sends response
6. **Query Manager** validates and routes to QuitResponseHandler
7. **Handler emits** appropriate events:
   - If "quit": `game.quit` event
   - If "cancel": `quit.cancelled` event

8. **Text service** processes events and generates output

## Implementation Priority

1. **Basic Query Manager** - Just enough to handle quit confirmation
2. **Engine Integration** - Wire up query interception
3. **Quit Response Handler** - Complete the quit flow
4. **Generic Handlers** - Yes/No, Multiple Choice
5. **Advanced Features** - Timeouts, nested queries, validation

## Testing Approach

1. **Unit tests** for QueryManager state management
2. **Integration tests** for complete quit flow
3. **Mock client** for testing without UI
4. **E2E tests** with actual client implementations

## Notes

- The quit action is already implemented correctly
- Language files have the proper query messages
- This follows the event-driven architecture
- No text generation happens in actions
- All text comes from the text service processing events
