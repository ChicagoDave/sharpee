# Inserting Action Design

## Overview
The Inserting action is a specialized container-focused action that delegates most of its functionality to the Putting action. It provides explicit semantics for placing items specifically into containers (never onto supporters), demonstrating both the delegation pattern and semantic action design principles.

## Action Metadata
- **ID**: `IFActions.INSERTING`
- **Group**: `object_manipulation`
- **Direct Object**: Required (ScopeLevel.CARRIED)
- **Indirect Object**: Required (ScopeLevel.REACHABLE)

## Architecture Patterns

### Primary Pattern: Delegation
The current implementation delegates to the Putting action by:
1. Modifying the command to add an implicit 'in' preposition
2. Creating a new context with the modified command
3. Executing the Putting action with container-specific semantics
4. Returning the Putting action's events

### Alternative Pattern: Semantic Version
A semantic version (`inserting-semantic.ts`) demonstrates a self-contained implementation that:
- Uses grammar-provided semantic properties
- Eliminates command modification
- Provides manner-based behavior variations
- Generates context-appropriate events

## Core Components

### 1. Main Action File (`inserting.ts`)

#### Required Messages
- `no_target` - No item specified
- `no_destination` - No container specified
- `not_held` - Item not in inventory
- `not_insertable` - Item cannot be inserted
- `not_container` - Target is not a container
- `already_there` - Item already in container
- `inserted` - Success message
- `wont_fit` - Container capacity exceeded
- `container_closed` - Container is closed

#### Command Modification Strategy
```typescript
const modifiedCommand = {
  ...context.command,
  parsed: {
    ...context.command.parsed,
    structure: {
      ...context.command.parsed.structure,
      preposition: { 
        tokens: [], 
        text: 'in' 
      }
    },
    preposition: 'in'
  }
};
```

### 2. Data Builder (`inserting-data.ts`)

#### Data Structure
```typescript
{
  item: string,              // Item name (backward compatibility)
  itemSnapshot: any,         // Complete item entity snapshot
  container: string,         // Container name
  containerSnapshot: any,    // Complete container snapshot
  itemId: string,           // Item entity ID
  containerId: string       // Container entity ID
}
```

#### Protected Fields
- `item`
- `container`
- `itemId`
- `containerId`

### 3. Event Types (`inserting-events.ts`)

#### Event Reuse
Inserting reuses Putting's event types:
- `InsertedEventData` aliases `PutInEventData`
- Events map to `if.event.put_in`

### 4. Semantic Version (`inserting-semantic.ts`)

#### Semantic Properties Used
- `spatialRelation`: Normalized to 'in' from various forms
- `manner`: How insertion is performed (forceful, careful, stealthy)
- `implicitPreposition`: Whether user omitted the preposition

#### Manner-Based Messages
- `inserted` - Default
- `inserted_forcefully` - With force
- `inserted_carefully` - With care
- `inserted_stealthily` - Quietly
- `inserted_into` - When preposition was implicit

## Validation Phase

### Delegation Strategy
1. **Basic Validation**
   - Check for direct object (item)
   - Check for indirect object (container)

2. **Command Modification**
   - Add 'in' preposition to parsed structure
   - Preserve all other command properties

3. **Delegate to Putting**
   - Create new context with modified command
   - Call `puttingAction.validate(modifiedContext)`
   - Return putting's validation result

### Putting's Validation (Delegated)
When inserting delegates, putting performs:
- Self-insertion check
- Already-there check
- Container trait verification
- Openable state check
- Capacity validation via `ContainerBehavior.canAccept()`

## Execution Phase

### Delegation Process
1. **Command Modification**
   - Same modification as validation phase
   - Ensures 'in' preposition is present

2. **Context Creation**
   ```typescript
   const modifiedContext = createActionContext(
     context.world,
     context.player,
     puttingAction,
     modifiedCommand
   );
   ```

3. **Store Modified Context**
   - Saves to `context._modifiedContext` for report phase

4. **Execute Putting**
   - Calls `puttingAction.execute(modifiedContext)`
   - Putting handles all state mutations

### Putting's Execution (Delegated)
When delegated from inserting:
- Determines target is container (due to 'in' preposition)
- Calls `ContainerBehavior.addItem()`
- Stores result for reporting

## Report Phase

### Error Handling

#### Validation Errors
- Captures entity snapshots for both objects
- Creates `action.error` event with:
  - Error reason
  - Message ID
  - Entity snapshots as parameters

#### Execution Errors
- Generic execution failure event
- Includes error message

### Success Reporting (Delegated)
1. **Retrieve Modified Context**
   - Gets stored context from execution phase

2. **Delegate to Putting's Report**
   - Calls `puttingAction.report(modifiedContext)`
   - Returns putting's events unchanged

3. **Putting's Events** (when delegated)
   - `if.event.put_in` - Container placement event
   - `action.success` - With 'put_in' message ID

## Semantic Version Improvements

### No Command Modification
- Trusts grammar-provided `semantics.spatialRelation`
- No need to modify `parsed.structure.preposition`

### Semantic-Based Behavior
```typescript
// Different behaviors based on manner
if (semantics.manner === 'forceful') {
  // Validate against fragile containers
  // Generate loud sound events
} else if (semantics.manner === 'careful') {
  // Generate careful insertion message
} else if (semantics.manner === 'stealthy') {
  // Generate quiet sound events
}
```

### Additional Events
- Sound events based on manner
- Context-specific success messages
- Implicit preposition handling

### Self-Contained Logic
- No delegation needed
- Direct world model manipulation
- Complete validation logic

## Design Patterns

### Delegation Pattern
**Advantages:**
- Code reuse between inserting and putting
- Consistent behavior for container operations
- Single source of truth for container logic

**Disadvantages:**
- Command modification complexity
- Context creation overhead
- Less semantic expressiveness

### Semantic Action Pattern
**Advantages:**
- Clean separation from parser internals
- Rich semantic-driven behavior
- No command modification needed
- Better testability

**Disadvantages:**
- Some code duplication with putting
- Requires semantic grammar support

### Event Reuse Pattern
- Inserting events alias putting events
- Maintains consistency in event structure
- Simplifies event handling downstream

## Trait Integrations

### Direct Dependencies
- **CONTAINER**: Target must have container trait
- **OPENABLE**: Checked for closed containers
- **WEARABLE**: May need removal before insertion

### Behavior Usage
- **ContainerBehavior**: 
  - `canAccept()` - Capacity validation
  - `addItem()` - Actual insertion
- **OpenableBehavior**:
  - `isOpen()` - Access validation

## World Model Integration

### Required Methods (via Putting)
- `getLocation(entityId)`: Check current location
- `getEntity(entityId)`: Retrieve entities
- `moveEntity(entityId, targetId)`: Transfer items

### Delegation Context Requirements
- `createActionContext()`: New context creation
- Modified command structure support
- Action reference switching

## Comparison: Delegation vs Semantic

### Command Handling
**Delegation Approach:**
```typescript
// Modifies command to add preposition
const modifiedCommand = {
  ...context.command,
  parsed: { 
    ...context.command.parsed,
    preposition: 'in' 
  }
};
```

**Semantic Approach:**
```typescript
// Uses grammar-provided semantics
const semantics = context.command.semantics || {};
if (semantics.spatialRelation === 'in') { ... }
```

### Validation Logic
**Delegation:** Relies entirely on putting's validation
**Semantic:** Implements container-specific validation

### Event Generation
**Delegation:** Returns putting's events unchanged
**Semantic:** Generates insertion-specific events with semantic context

## Extension Points

### Story Customization
- Custom error messages via required messages
- Extended event data through data builder
- Semantic manner variations

### Protected Operations
- Core event fields are protected
- Command modification pattern is fixed
- Delegation target (putting) is hardcoded

## Performance Considerations

### Delegation Overhead
- Context creation for every operation
- Command object cloning
- Double validation (inserting then putting)

### Optimization Opportunities
- Cache modified commands
- Share context between phases
- Direct behavior invocation for common cases

## Migration Path

### From Delegation to Semantic
1. Implement self-contained validation
2. Add semantic property handling
3. Generate insertion-specific events
4. Remove command modification
5. Eliminate putting delegation

### Backward Compatibility
- Event structure remains compatible
- Message IDs unchanged
- Entity snapshot pattern consistent
