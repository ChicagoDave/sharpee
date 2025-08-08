# Text Service Implementation Plan

## Architecture Decisions Made

1. **Separate Package**: Text service will be its own package (`@sharpee/text-service`)
2. **Query-Based**: Text service queries event source and world model (not push-based)
3. **Turn History**: All queries will be recorded for debugging/replay (ADR-029)
4. **Multiple Implementations**: Support for different text service styles via registry

## Package Structure

```
/packages/text-service/          # Core interfaces and base classes
  /src/
    - interfaces.ts             # TextService, TextChannel, etc.
    - registry.ts               # TextServiceRegistry
    - base-service.ts           # BaseTextService with query recording
    - turn-history.ts           # Turn history interfaces
    
/packages/text-service-basic/    # Basic implementation
  /src/
    - basic-text-service.ts
    
/packages/engine/                # Update to use text service
  /src/
    - integrate with text service package
```

## Updated Phase 4 Checklist

### Phase 4.1: Core Text Service Package ✅
- [x] Create `@sharpee/text-service` package
- [x] Define TextService interface with query-based design
- [x] Define TextServiceDependencies interface (eventSource, worldModel, spatialIndex, languageProvider)
- [x] Implement BaseTextService with query recording methods
- [x] Define TurnHistory and QueryRecord interfaces
- [x] Implement TextServiceRegistry for registration
- [x] Create turn history store interface
- [x] Implement InMemoryTurnHistoryStore
- [x] Create text channel implementations (buffered, console, multi)
- [x] Add comprehensive tests
- [x] Create README documentation

### Phase 4.2: Basic Text Service Implementation ✅
- [x] Create `@sharpee/text-service-basic` package
- [x] Implement BasicTextService extending BaseTextService
- [x] Query event source for message IDs in events
- [x] Use language provider for all text resolution
- [x] Add fallback to direct text for backward compatibility
- [x] Implement parameter substitution via language provider
- [x] Handle missing message IDs gracefully
- [x] Record all queries to turn history
- [x] Add configuration options (debug, showMissingMessages, etc.)
- [x] Handle special event types (location description, inventory, etc.)
- [x] Add comprehensive tests
- [x] Create README documentation

### Phase 4.3: Engine Integration ✅
- [x] Update engine package.json to include text service dependencies
- [x] Create adapters for engine systems (EventSource, WorldModel, SpatialIndex)
- [x] Update GameEngine to use new text service
- [x] Remove old text service from engine
- [x] Update engine to call text service after turn completion
- [x] Pass dependencies (eventSource, worldModel, etc.) to text service
- [x] Add getTextOutput() method to engine
- [x] Add getTextService() and setTextService() methods
- [x] Update lang-en-us to implement getMessage interface
- [x] Create migration guide documentation

### Phase 4.4: Testing Infrastructure ✅
- [x] Create test helpers for text service testing (real implementations)
- [x] Real language provider for tests (not mocks)
- [x] Test message ID resolution
- [x] Test parameter substitution
- [x] Test query recording
- [x] Test turn history storage
- [x] Test backward compatibility
- [x] Integration tests with real actions
- [x] Enhanced Context Pattern integration tests
- [x] Performance testing helpers
- [x] Common test scenarios and assertions

### Phase 4.5: Documentation
- [x] Document TextService interface
- [x] Document how to create custom text services
- [x] Document query methods and recording
- [x] Document turn history usage
- [x] Create example text service implementation
- [x] Document migration from old text service
- [ ] Update main documentation to reflect changes
- [ ] Create tutorial for custom text service development

## Key Design Points

1. **Query Methods in BaseTextService**:
   - `queryEvents(filter)` - records and returns events
   - `queryEntity(id)` - records and returns entity
   - `querySpatial(query)` - records and returns spatial results
   - `queryRelation(query)` - records and returns relations

2. **Turn Processing Flow**:
   - Engine completes turn → all state changes done
   - Engine calls `textService.processTurn(turnNumber)`
   - Text service queries needed data (all recorded)
   - Text service generates output
   - Turn history is saved
   - Output returned to engine

3. **Message Resolution Flow**:
   - Event contains `messageId` (e.g., 'taken')
   - Text service resolves to full ID (e.g., 'if.action.taking.taken')
   - Language provider returns localized text
   - Parameters substituted
   - Fallback to event.data.text if no messageId

## Completed Features

- ✅ Query-based architecture implemented
- ✅ Turn history recording working
- ✅ Message ID resolution from Enhanced Context Pattern
- ✅ Parameter substitution working
- ✅ Backward compatibility maintained
- ✅ Multiple text service support via registry
- ✅ Engine integration complete
- ✅ Language provider enhanced with getMessage

## Next Steps

1. Complete Phase 4.4 - Testing Infrastructure
2. Finish remaining documentation tasks in Phase 4.5
3. Consider creating additional text service implementations (verbose, terse, narrative)
4. Update example games to use new text service
