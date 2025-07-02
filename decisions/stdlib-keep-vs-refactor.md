# StdLib Refactoring Guide - Keep vs. Refactor

## Keep (Refactor in Place)

### Actions Structure ✓
- **Location**: `/actions/*`
- **Why Keep**: Good organization, just needs service integration
- **Changes Needed**: Use services instead of direct manipulation

### Parser Core ✓
- **Location**: `/parser/if-parser.ts`, `/parser/grammar/*`
- **Why Keep**: Solid parsing logic, just needs world integration
- **Changes Needed**: Add world-awareness, use visibility service

### Language System ✓
- **Location**: `/language/*`
- **Why Keep**: Good abstraction for multi-language support
- **Changes Needed**: Minor updates for new event types

### Constants ✓
- **Location**: `/constants/*`
- **Why Keep**: These are stdlib's domain
- **Changes Needed**: Ensure no duplicates with world-model

## Refactor Completely

### World-Model Directory ❌
- **Location**: `/world-model/*`
- **Why Remove**: This is OLD code from before extraction
- **Replace With**: Import from `@sharpee/world-model` package

### Story Classes ⚠️
- **Location**: `/story/*`
- **Current State**: Mixed concerns, too much responsibility
- **Replace With**: Cleaner orchestration using services

### Text Service ⚠️
- **Location**: `/text/*`
- **Current State**: Overly complex, mixed concerns
- **Replace With**: Template-based system with clear boundaries

## Delete

### Languages.bak ❌
- **Location**: `/languages.bak/*`
- **Why**: Backup directory, not needed

### Old Handlers ❌
- **Location**: Any "handler" pattern files
- **Replace With**: ActionExecutor pattern

## New Additions Needed

### Services Layer ✨
```
/services/
  types.ts
  roomService.ts
  inventoryService.ts
  visibilityService.ts
  movementService.ts
  textService.ts
  parserService.ts
```

### Action Base Classes ✨
```
/actions/base/
  actionExecutor.ts
  actionContext.ts
  actionValidation.ts
```

### Integration Layer ✨
```
/integration/
  worldModelBridge.ts  # Coordinate with world-model
  forgeHelpers.ts      # Utilities for Forge
```

## Migration Priority

1. **Delete** `/world-model/*` directory entirely
2. **Create** `/services/*` with core implementations
3. **Update** imports to use `@sharpee/world-model`
4. **Refactor** one action (taking) as proof of concept
5. **Test** extensively before proceeding

## Quick Wins

1. **Fix Imports**: Change all relative world-model imports to package imports
2. **Remove Duplicates**: Delete any code that duplicates world-model
3. **Create Services**: Start with RoomService as it's most needed
4. **Update Actions**: Pick simplest action (examining) to refactor first

## Architecture Rules

1. **No Direct Entity Manipulation**: Always use behaviors/services
2. **Services for Orchestration**: Multi-entity operations go in services
3. **Actions Use Services**: Actions should be thin orchestrators
4. **Clear Boundaries**: Don't mix concerns between layers
5. **Event-Driven**: All state changes emit events

This approach lets us:
- Keep the good parts of stdlib
- Remove the problematic legacy code
- Add the missing service layer
- Maintain a working system during migration
