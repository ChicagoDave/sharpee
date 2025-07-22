# Platform Events Implementation Checklist

This checklist covers the implementation of platform event handling for save, restore, quit, and restart operations that require client/host intervention.

## Core Architecture Updates

### 1. Platform Event Types (in `@sharpee/core`)
- [x] Create `platform-events.ts` in `core/src/events/`
- [x] Define `PlatformEventType` enum:
  - [x] `platform.save_requested`
  - [x] `platform.restore_requested`
  - [x] `platform.quit_requested`
  - [x] `platform.restart_requested`
- [x] Define `PlatformEvent` interface extending `SemanticEvent`
- [x] Add `requiresClientAction: true` flag
- [x] Export from events index

### 2. Engine Platform Operation Handling
- [x] Add `pendingPlatformOps` array to GameEngine
- [x] In `executeTurn()`, after events are emitted:
  - [x] Check for platform operation events
  - [x] Add to pending operations queue
- [x] After turn completion, before text service:
  - [x] Process pending platform operations
  - [x] Call appropriate hooks (save/restore/quit/restart)
  - [x] Emit completion events
- [x] Clear pending operations after processing

### 3. Platform Completion Events
- [x] Define completion event types:
  - [x] `platform.save_completed`
  - [x] `platform.restore_completed`
  - [x] `platform.quit_confirmed`
  - [x] `platform.restart_completed`
- [x] Include success/failure status
- [x] Include any error messages

## Action Updates (in `@sharpee/stdlib`)

### 4. Update Saving Action
- [x] Remove async from execute method
- [x] Remove direct engine.save() call
- [x] Emit `platform.save_requested` event instead
- [x] Include save context (name, slot, etc.)
- [x] Keep existing validation logic

### 5. Update Restoring Action
- [x] Create restoring action if not exists
- [x] Emit `platform.restore_requested` event
- [x] Include restore context (slot selection, etc.)

### 6. Update Quitting Action
- [x] Update to emit `platform.quit_requested` event
- [x] Include context (score, moves, unsaved changes)
- [x] Let query system handle confirmation

### 7. Update Restarting Action
- [x] Create restarting action if not exists
- [x] Emit `platform.restart_requested` event
- [x] Include restart context

## Hook Interfaces

### 8. Extend SaveRestoreHooks
- [x] Add quit handler: `onQuitRequested?: (context: QuitContext) => Promise<boolean>`
- [x] Add restart handler: `onRestartRequested?: (context: RestartContext) => Promise<boolean>`
- [x] Document that these are optional
- [x] Define context interfaces

### 9. Create Platform Event Contexts
- [x] `SaveContext`: saveName, timestamp, metadata
- [x] `RestoreContext`: available saves, last save info
- [x] `QuitContext`: score, moves, hasUnsavedChanges
- [x] `RestartContext`: current progress, confirmation needed

## Query System Integration

### 10. Platform Query Handlers
- [x] Update quit handler to work with new events
- [x] Create restart confirmation handler
- [x] Ensure handlers emit platform completion events
- [x] Connect handlers to engine event source

## Text Service Updates

### 11. Platform Event Messages
- [x] Add message handlers for platform events:
  - [x] `platform.save_requested` → "Saving game..."
  - [x] `platform.save_completed` → "Game saved."
  - [x] `platform.save_failed` → "Save failed: {reason}"
- [x] Similar for restore, quit, restart
- [x] Ensure messages are in language files

## Testing

### 12. Unit Tests
- [x] Test platform event emission from actions
- [x] Test engine platform operation processing
- [x] Test completion event generation
- [x] Test error cases (failed saves, etc.)

### 13. Integration Tests
- [x] Test full save flow: command → action → event → hook → completion
- [x] Test interruption of platform operations
- [x] Test multiple pending operations
- [x] Test platform events in event history

### 14. Client Integration Tests
- [x] Create mock client with platform hooks
- [x] Test save/restore round trip
- [x] Test quit confirmation flow
- [x] Test restart with unsaved changes

## Documentation Updates

### 15. Update ADRs
- [ ] Update ADR-018: Add platform queries section
- [ ] Update ADR-033: Document platform event flow
- [ ] Update ADR-034: Note compatibility with event sourcing
- [ ] Create new ADR for platform events if needed

### 16. Implementation Guide
- [ ] Document how clients implement platform hooks
- [ ] Provide example implementations (browser, Node.js)
- [ ] Document platform event flow diagram
- [ ] Add to client implementation guide

## Migration/Compatibility

### 17. Backward Compatibility
- [ ] Ensure old save hooks still work
- [ ] Provide migration guide for clients
- [ ] Test with existing client implementations

### 18. Feature Detection
- [ ] Add capability flags for platform features
- [ ] Allow actions to check if platform supports operations
- [ ] Graceful degradation if hooks not provided

## Example Implementation Order

1. **Phase 1**: Core platform event types and interfaces
2. **Phase 2**: Engine platform operation handling
3. **Phase 3**: Update save/restore actions
4. **Phase 4**: Add quit/restart actions
5. **Phase 5**: Query system integration
6. **Phase 6**: Testing and documentation

## Success Criteria

- [ ] All platform operations go through event system
- [ ] No async operations in action execute methods
- [ ] Clear separation between intent and execution
- [ ] Platform operations complete before text service runs
- [ ] All events properly recorded in event history
- [ ] Clients can implement platform operations cleanly
- [ ] No breaking changes to existing functionality
