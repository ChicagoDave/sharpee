# Examining Action Design

## Overview
The Examining action is a read-only observation action that provides detailed information about entities without modifying world state. It demonstrates comprehensive trait inspection, data building patterns, and dynamic message selection based on entity characteristics.

## Action Metadata
- **ID**: `IFActions.EXAMINING`
- **Group**: `observation`
- **Direct Object**: Required (ScopeLevel.VISIBLE)
- **Indirect Object**: Not required

## Core Characteristics

### Read-Only Nature
- **No State Mutations**: Execute phase is empty
- **Pure Observation**: Only queries world state
- **Safe Operation**: Can be repeated without side effects
- **Event-Driven Output**: All information via events

### Information Gathering
- **Trait Inspection**: Examines all entity traits
- **State Queries**: Checks current state of behaviors
- **Content Discovery**: Lists container/supporter contents
- **Snapshot Capture**: Complete entity state preservation

## Core Components

### 1. Main Action File (`examining.ts`)

#### Required Messages
- `no_target` - No object specified
- `not_visible` - Target cannot be seen
- `examined` - Basic examination
- `examined_self` - Self-examination
- `examined_container` - Container-specific
- `examined_supporter` - Supporter-specific
- `examined_readable` - Shows readable text
- `examined_switchable` - Shows on/off state
- `examined_wearable` - Shows worn state
- `examined_door` - Door-specific information
- `nothing_special` - No notable features
- `description` - Full description
- `brief_description` - Short description

#### Three-Phase Implementation
```typescript
validate(context): ValidationResult {
  // Check target exists
  // Check visibility (unless self)
  return { valid: true };
}

execute(context): void {
  // Empty - no mutations
}

report(context): ISemanticEvent[] {
  // Build comprehensive data
  // Select appropriate message
  // Generate events
}
```

### 2. Data Builder (`examining-data.ts`)

#### Data Collection Strategy
The data builder inspects multiple traits to create a comprehensive view:

```typescript
const eventData = {
  // Core fields
  target: entitySnapshot,        // Complete snapshot
  targetId: noun.id,             // Entity ID
  targetName: noun.name,         // Display name
  
  // Trait flags
  isContainer: boolean,
  isSupporter: boolean,
  isSwitchable: boolean,
  isReadable: boolean,
  isWearable: boolean,
  isDoor: boolean,
  
  // State information
  isOpen: boolean,
  isOn: boolean,
  isWorn: boolean,
  isLocked: boolean,
  
  // Content data
  hasContents: boolean,
  contentCount: number,
  contentsSnapshots: EntitySnapshot[],
  contents: { id, name }[]      // Backward compatibility
};
```

#### Message Selection Logic
```typescript
function buildExaminingMessageParams(eventData, noun) {
  // Priority-based message selection:
  if (self) return 'examined_self';
  if (isContainer) return 'examined_container';
  if (isSupporter) return 'examined_supporter';
  if (isSwitchable) return 'examined_switchable';
  if (isReadable && hasText) return 'examined_readable';
  if (isWearable) return 'examined_wearable';
  if (isDoor) return 'examined_door';
  return 'examined';  // Default
}
```

### 3. Event Types (`examining-events.ts`)

#### ExaminedEventData Interface
Comprehensive data structure with sections for:
- **Identity**: Basic entity information
- **Container State**: Open/closed, contents
- **Supporter State**: Items on surface
- **Device State**: On/off, locked/unlocked
- **Content State**: Readable text, worn status
- **Snapshots**: Complete entity preservation

## Validation Phase

### Validation Checks
1. **Target Existence**
   - Verify direct object is present
   - Return `no_target` if missing

2. **Visibility Check**
   - Skip for self-examination
   - Use `context.canSee()` for others
   - Return `not_visible` if cannot see

### Validation Simplicity
- Minimal validation due to read-only nature
- No capacity checks needed
- No state requirements
- Focus on basic accessibility

## Execution Phase

### Empty Implementation
```typescript
execute(context: ActionContext): void {
  // No mutations - examining is a read-only action
}
```

### Design Rationale
- **State Immutability**: Examining never changes world
- **Predictable Behavior**: No side effects
- **Performance**: No write operations
- **Simplicity**: Clear separation of concerns

## Report Phase

### Data Building Process

#### 1. Entity Snapshot Capture
```typescript
const entitySnapshot = captureEntitySnapshot(noun, context.world, true);
```
- Includes nested contents
- Preserves complete state
- Enables atomic events

#### 2. Trait Inspection
For each relevant trait:
```typescript
if (noun.has(TraitType.CONTAINER)) {
  const contents = context.world.getContents(noun.id);
  eventData.isContainer = true;
  eventData.hasContents = contents.length > 0;
  eventData.contentCount = contents.length;
  eventData.contentsSnapshots = captureEntitySnapshots(contents);
}
```

#### 3. State Queries
Using behavior classes:
```typescript
if (noun.has(TraitType.OPENABLE)) {
  eventData.isOpenable = true;
  eventData.isOpen = OpenableBehavior.isOpen(noun);
}
```

### Event Generation

#### Success Events
Always generates two events:

1. **Domain Event** (`if.event.examined`)
   - Complete entity data
   - All trait information
   - State snapshots

2. **Success Event** (`action.success`)
   - Selected message ID
   - Formatted parameters
   - Display-ready data

### Error Handling
- Validation errors include entity snapshots
- Execution errors (shouldn't occur) handled gracefully
- Missing target fallback

## Trait Integrations

### Inspected Traits
- **IDENTITY**: Description and brief text
- **CONTAINER**: Contents and capacity
- **SUPPORTER**: Surface items
- **OPENABLE**: Open/closed state
- **SWITCHABLE**: On/off state
- **READABLE**: Text content
- **WEARABLE**: Worn status
- **DOOR**: Passage information
- **LOCKABLE**: Lock state

### Behavior Dependencies
Read-only queries via behavior classes:
- `OpenableBehavior.isOpen()`
- `SwitchableBehavior.isOn()`
- `LockableBehavior.isLocked()`
- `WearableBehavior.isWorn()`

### No Behavior Mutations
- Never calls behavior setters
- No state changes through behaviors
- Pure inspection only

## Data Builder Pattern

### Configuration
```typescript
export const examiningDataConfig: ActionDataConfig = {
  builder: buildExaminingData,
  protectedFields: ['targetId', 'targetName', 'target']
};
```

### Protected Fields
Core fields that cannot be overridden:
- `targetId`: Entity identifier
- `targetName`: Display name
- `target`: Complete snapshot

### Extensibility
Stories can add custom data:
- Additional trait checks
- Custom state information
- Story-specific properties

## Message Selection Strategy

### Priority System
Messages selected in priority order:
1. **Self-examination** (`examined_self`)
2. **Container** (`examined_container`)
3. **Supporter** (`examined_supporter`)
4. **Switchable** (`examined_switchable`)
5. **Readable** (if has text)
6. **Wearable** (`examined_wearable`)
7. **Door** (`examined_door`)
8. **Default** (`examined`)

### Message Parameters
Each message type receives appropriate parameters:
```typescript
// Container message
params = {
  isOpen: boolean,
  description: string
}

// Switchable message
params = {
  isOn: boolean,
  target: string
}

// Readable message
params = {
  text: string
}
```

## Performance Considerations

### Optimization Strategies

#### Selective Snapshot Depth
- Full snapshots for examined entity
- Shallow snapshots for contents
- No snapshots for deeply nested items

#### Trait Check Ordering
1. Check common traits first (IDENTITY)
2. Check expensive traits last (large containers)
3. Short-circuit on self-examination

#### Content Limiting
- Cap content snapshots at reasonable limit
- Use summary for large collections
- Defer deep inspection to dedicated actions

### Caching Opportunities
- Entity snapshots within turn
- Trait presence checks
- Content listings

## Design Patterns

### Read-Only Action Pattern
**Characteristics:**
- Empty execute phase
- All logic in validate/report
- No world mutations
- Pure queries only

**Benefits:**
- Predictable behavior
- Safe repetition
- Easy testing
- Clear intent

### Comprehensive Data Builder
**Approach:**
- Inspect all relevant traits
- Query all states
- Capture complete context
- Build rich event data

**Trade-offs:**
- More computation per examination
- Larger event payloads
- But complete information

### Dynamic Message Selection
**Strategy:**
- Priority-based selection
- Trait-specific messages
- Context-aware parameters
- Fallback to generic

**Advantages:**
- Rich, specific output
- Appropriate detail level
- Natural language variation

## Extension Points

### Story Customization

#### Custom Descriptions
Stories can provide:
- Trait-based descriptions
- State-dependent text
- Dynamic content generation

#### Additional Traits
New traits automatically included:
- Add trait check in data builder
- Define new message type
- Set priority in selection

#### Event Extensions
Stories can extend event data:
- Custom properties
- Additional snapshots
- Computed values

### Message Customization
- Override required messages
- Add new message types
- Customize parameters

## Comparison with Other Actions

### vs. Looking (Room Description)
**Examining:**
- Single entity focus
- Detailed inspection
- All traits examined

**Looking:**
- Room/area focus
- Overview perspective
- Lists visible entities

### vs. Reading
**Examining:**
- General inspection
- May show readable text
- Covers all traits

**Reading:**
- Focused on text
- Requires READABLE trait
- Single-purpose

### vs. Searching
**Examining:**
- Surface inspection
- Shows visible contents
- No discovery

**Searching:**
- Active investigation
- May reveal hidden items
- Can change state

## Testing Considerations

### Test Scenarios
1. **Basic Examination**
   - Simple entity
   - With/without description
   - Various trait combinations

2. **Container Examination**
   - Empty/full containers
   - Open/closed states
   - Nested contents

3. **Complex Entities**
   - Multiple traits
   - State combinations
   - Deep nesting

### Verification Points
- Correct message selection
- Complete data capture
- No state mutations
- Event structure validity

## Future Enhancements

### Potential Improvements
1. **Partial Visibility**
   - Fog/darkness effects
   - Partial information
   - Uncertainty representation

2. **Detail Levels**
   - Brief/normal/verbose modes
   - Player preferences
   - Context-aware detail

3. **Discovery Mechanics**
   - Hidden details
   - Skill-based observation
   - Progressive revelation

4. **Multi-Sensory**
   - Sound descriptions
   - Smell/touch information
   - Environmental details
