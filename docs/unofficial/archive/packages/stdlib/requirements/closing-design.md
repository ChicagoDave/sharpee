# Closing Action Design

## Overview
The Closing action handles closing openable entities (containers, doors, books, etc.). It demonstrates proper delegation to behavior classes, three-phase execution pattern, and comprehensive event generation with entity snapshots.

## Action Metadata
- **ID**: `IFActions.CLOSING`
- **Group**: `container_manipulation`
- **Direct Object**: Required (ScopeLevel.REACHABLE)
- **Indirect Object**: Not required

## Core Characteristics

### Behavior Delegation
- **OpenableBehavior**: Handles all closing logic
- **Action Layer**: Validates and coordinates
- **Clear Separation**: Action orchestrates, behavior executes
- **Single Responsibility**: Each layer has distinct role

### Three-Phase Pattern
1. **Validate**: Check preconditions via behavior
2. **Execute**: Delegate state change to behavior
3. **Report**: Generate events with snapshots

## Core Components

### 1. Main Action File (`closing.ts`)

#### Required Messages
- `no_target` - No object specified
- `not_closable` - Object cannot be closed
- `already_closed` - Object is already closed
- `closed` - Success message
- `cant_reach` - Object not reachable
- `prevents_closing` - Something prevents closing

#### Behavior Integration
```typescript
// Validation delegates to behavior
if (!OpenableBehavior.canClose(noun)) {
  // Determine specific reason
}

// Execution delegates to behavior
const result: ICloseResult = OpenableBehavior.close(noun);

// Result stored for report phase
(context as any)._closeResult = result;
```

### 2. Data Builder (`closing-data.ts`)

#### Data Structure
```typescript
{
  target: string,              // Entity name
  targetSnapshot: Snapshot,   // Complete entity state
  contentsSnapshots: Snapshot[], // Contents if container
  targetId: EntityId          // Entity identifier
}
```

#### Protected Fields
- `target`: Entity name
- `targetId`: Entity identifier

### 3. Event Data Types

#### ClosedEventData (`closing-event-data.ts`)
```typescript
{
  targetId: EntityId,
  targetName: string,
  
  // Type flags
  isContainer: boolean,
  isDoor: boolean,
  isSupporter: boolean,
  
  // Container state
  hasContents: boolean,
  contentsCount: number,
  contentsIds: EntityId[],
  
  // Snapshots
  targetSnapshot?: EntitySnapshot,
  contentsSnapshots?: EntitySnapshot[]
}
```

#### PreventsClosingErrorData (`closing-error-prevents-closing.ts`)
```typescript
{
  obstacle: string  // What's preventing closing
  // TODO: Should use entity IDs, not text
}
```

### 4. OpenableBehavior Integration

#### ICloseResult Structure
```typescript
interface ICloseResult {
  success: boolean,
  alreadyClosed?: boolean,
  cantClose?: boolean,
  stateChanged?: boolean,
  closeMessage?: string,
  closeSound?: string
}
```

## Validation Phase

### Validation Sequence

#### 1. Target Existence
```typescript
if (!noun) {
  return { valid: false, error: 'no_target' };
}
```

#### 2. Trait Check
```typescript
if (!noun.has(TraitType.OPENABLE)) {
  return { valid: false, error: 'not_closable' };
}
```

#### 3. Behavior Validation
```typescript
if (!OpenableBehavior.canClose(noun)) {
  if (!OpenableBehavior.isOpen(noun)) {
    return { valid: false, error: 'already_closed' };
  }
  return { valid: false, error: 'prevents_closing' };
}
```

#### 4. Special Requirements
```typescript
const openableTrait = noun.get(TraitType.OPENABLE);
if (openableTrait.closeRequirements) {
  if (requirement.preventedBy) {
    return { 
      valid: false, 
      error: 'prevents_closing',
      params: { obstacle: requirement.preventedBy }
    };
  }
}
```

### OpenableBehavior.canClose() Logic
The behavior checks:
1. Entity has OPENABLE trait
2. `isOpen === true` (can't close if not open)
3. `canClose === true` (some things can't be re-closed)
4. No blocking conditions

## Execution Phase

### Minimal Execution
```typescript
execute(context: ActionContext): void {
  const noun = context.command.directObject!.entity!;
  const result: ICloseResult = OpenableBehavior.close(noun);
  (context as any)._closeResult = result;
}
```

### State Mutation
OpenableBehavior.close() performs:
1. Sets `isOpen = false`
2. Returns result object
3. Includes custom messages/sounds

### Result Storage
Result stored on context for report phase:
- Avoids re-computation
- Preserves behavior output
- Enables comprehensive reporting

## Report Phase

### Error Handling

#### Validation Errors
```typescript
if (validationResult && !validationResult.valid) {
  // Capture entity snapshots
  // Generate error event
  return [context.event('action.error', {...})];
}
```

#### Execution Errors
Should not occur after validation, but handled:
```typescript
if (!result.success) {
  if (result.alreadyClosed) return 'already_closed';
  if (result.cantClose) return 'cant_close';
  return 'cannot_close';
}
```

### Success Event Generation

#### 1. Domain Event
```typescript
events.push(context.event('closed', {
  targetId: noun.id,
  targetName: noun.name,
  customMessage: result.closeMessage,
  sound: result.closeSound
}));
```

#### 2. Action Event with Data Builder
```typescript
const eventData = buildEventData(closedDataConfig, context);
events.push(context.event('if.event.closed', {
  ...eventData,
  // Additional fields for compatibility
  isContainer,
  isDoor,
  isSupporter,
  hasContents,
  contentsCount,
  contentsIds
}));
```

#### 3. Success Message
```typescript
events.push(context.event('action.success', {
  actionId: this.id,
  messageId: 'closed',
  params: { item: noun.name }
}));
```

## Trait Integrations

### Primary Trait
**OPENABLE**: Required for closing capability
```typescript
interface OpenableTrait {
  isOpen: boolean,           // Current state
  canClose: boolean,         // Can be re-closed
  closeMessage?: string,     // Custom message
  closeSound?: string,       // Sound effect
  closeRequirements?: {      // Special conditions
    preventedBy?: string
  }
}
```

### Secondary Traits
Used for event data enrichment:
- **CONTAINER**: Track contents visibility
- **DOOR**: Special handling for passages
- **SUPPORTER**: Surface objects

## Design Patterns

### Delegation Pattern
```
Action → Behavior → Trait
  ↓         ↓         ↓
Orchestrate Execute  Store
```

**Benefits:**
- Single source of truth (behavior)
- Reusable logic
- Clear responsibilities
- Testable layers

### Three-Phase Execution
```
Validate → Execute → Report
   ↓          ↓         ↓
 Check     Mutate   Events
```

**Advantages:**
- Predictable flow
- Error isolation
- State consistency
- Event atomicity

### Snapshot Pattern
Capture complete state after mutation:
```typescript
targetSnapshot = captureEntitySnapshot(noun, context.world, false);
contentsSnapshots = captureEntitySnapshots(contents, context.world);
```

## Special Cases

### Container Closing
When closing containers:
1. Contents become inaccessible
2. Visibility changes tracked
3. Contents snapshots captured
4. Count and IDs recorded

### Door Closing
When closing doors:
1. Passage blocked
2. Both sides affected
3. Room connectivity changes
4. Navigation impacts

### Prevented Closing
Some things can't close because:
- Object stuck in opening
- Mechanism damaged
- Story-specific rules
- Safety features

## Error Messages

### Context-Specific Errors
```typescript
// Already in desired state
'already_closed' - "The box is already closed."

// Cannot be closed
'not_closable' - "The window cannot be closed."

// Something prevents it
'prevents_closing' - "The drawer won't close with the folder sticking out."
```

## Comparison with Opening Action

### Symmetry
- Opening and Closing are complementary
- Share OPENABLE trait
- Use same behavior class
- Similar validation flow

### Differences
| Aspect | Opening | Closing |
|--------|---------|---------|
| Initial State | `isOpen: false` | `isOpen: true` |
| Check | `canOpen()` | `canClose()` |
| Result | Reveals contents | Hides contents |
| Common Error | Already open | Already closed |

## Performance Considerations

### Optimization Strategies
1. **Single Behavior Call**: Validate and execute once each
2. **Result Caching**: Store result in context
3. **Lazy Snapshots**: Only capture if needed
4. **Batch Events**: Generate all at once

### Memory Management
- Shallow snapshots for simple objects
- Deep snapshots only for containers
- Limit content snapshot depth
- Clear context extensions after use

## Testing Considerations

### Test Scenarios

#### Basic Closing
- Simple openable objects
- Already closed objects
- Non-closable objects
- Successful closing

#### Container Specific
- Empty containers
- Full containers
- Nested containers
- Content visibility

#### Door Specific
- Two-way doors
- One-way doors
- Locked doors
- Connected rooms

#### Error Cases
- Missing target
- Unreachable objects
- Prevented closing
- Invalid trait state

### Verification Points
- Correct state change
- Event sequence
- Snapshot accuracy
- Error message selection

## Extension Points

### Custom Requirements
Stories can add closing conditions:
```typescript
closeRequirements: {
  requiresKey: true,
  requiresStrength: 5,
  preventedBy: 'obstacleId'
}
```

### Advanced Features
- Time-based closing (auto-close)
- Partial closing (ajar state)
- Force levels (slam shut)
- Closing animations

### Event Extensions
- Sound effects
- Visual feedback
- Environmental effects
- Triggered consequences

## Future Enhancements

### Potential Features

#### 1. Closing Force
```typescript
interface ClosingForce {
  method: 'gentle' | 'normal' | 'slam',
  sound: string,
  damage?: boolean
}
```

#### 2. Partial States
```typescript
enum OpenState {
  CLOSED = 0,
  AJAR = 1,
  HALF_OPEN = 2,
  OPEN = 3
}
```

#### 3. Auto-Close Mechanics
```typescript
interface AutoClose {
  enabled: boolean,
  delay: number,
  sound?: string,
  message?: string
}
```

#### 4. Closing Obstacles
```typescript
interface ClosingObstacle {
  entityId: string,
  blockType: 'physical' | 'mechanical',
  removeMethod: string
}
```

## Design Philosophy

### Simplicity Through Delegation
- Action stays simple
- Complexity in behaviors
- Clear layer boundaries
- Maintainable code

### Consistency
- Matches opening action pattern
- Standard three-phase flow
- Predictable event structure
- Uniform error handling

### Extensibility
- Trait-based customization
- Event-driven outcomes
- Story-specific requirements
- Future-proof design
