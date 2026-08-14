# About Action Design

## Overview
The About action is a meta-action that displays information about the game itself. It follows a minimalist design pattern where the action simply signals that game information should be displayed, delegating all formatting and content retrieval to the text service layer.

## Action Metadata
- **ID**: `IFActions.ABOUT`
- **Group**: `meta`
- **Direct Object**: Not required
- **Indirect Object**: Not required

## Core Characteristics

### Meta-Action Pattern
- **No World State Access**: Doesn't query or modify game world
- **Signal-Only**: Emits event to trigger display
- **Delegation Model**: Text service handles content
- **No Required Messages**: Display handled elsewhere

### Separation of Concerns
- **Action Layer**: Validates and signals intent
- **Text Service**: Queries story configuration
- **Story Config**: Provides actual content
- **Display Layer**: Formats and presents

## Core Components

### 1. Main Action File (`about.ts`)

#### Minimal Implementation
```typescript
validate(context: ActionContext): ValidationResult {
  // About action always succeeds
  const displayMode = context.command.parsed.extras?.mode || 'standard';
  return { valid: true };
}

execute(context: ActionContext): ISemanticEvent[] {
  const displayMode = context.command.parsed.extras?.mode || 'standard';
  const eventData: AboutDisplayedEventData = { displayMode };
  
  return [
    context.event('if.action.about', eventData)
  ];
}
```

### 2. Event Types (`about-events.ts`)

#### Simple Event Data
```typescript
interface AboutDisplayedEventData {
  displayMode: 'standard' | 'brief' | 'verbose' | string;
}
```

### 3. Display Modes
- **standard**: Normal game information
- **brief**: Minimal version info
- **verbose**: Extended credits and details
- **custom**: Story-defined modes

## Architecture Pattern

### Event-Driven Display
```
User Input → Parser → About Action → Event → Text Service → Display
                                         ↓
                                   Story Config
```

### Why This Design?

#### 1. Content Independence
- Action doesn't contain display strings
- Story config owns all content
- Easy to update without code changes

#### 2. Localization Ready
- Text service can select language
- No hardcoded strings in action
- Display logic separate from content

#### 3. Story Customization
- Stories override display format
- Custom about sections
- Additional metadata display

## Validation Phase

### Always Valid
```typescript
validate(context): ValidationResult {
  return { valid: true };
}
```

### Design Rationale
- No preconditions for viewing about
- Available at any game state
- No resources consumed
- No side effects

## Execution Phase

### Single Event Emission
```typescript
execute(context): ISemanticEvent[] {
  return [context.event('if.action.about', eventData)];
}
```

### No Three-Phase Pattern
- No separate report phase needed
- Execute handles everything
- Single event sufficient

## Event Flow

### Event Processing
1. **Action emits**: `if.action.about`
2. **Text service receives**: Event with display mode
3. **Story config queried**: Title, author, version, etc.
4. **Format applied**: Based on display mode
5. **Output generated**: Formatted text to player

### Story Configuration Access
Text service queries:
```typescript
{
  title: string,
  author: string,
  version: string,
  copyright?: string,
  license?: string,
  description?: string,
  credits?: string[],
  contact?: string,
  website?: string
}
```

## Design Patterns

### Signal Pattern
**Characteristics:**
- Action as pure signal
- No business logic
- No data transformation
- Minimal coupling

**Benefits:**
- Maximum flexibility
- Clear separation
- Easy testing
- Simple implementation

### Delegation Pattern
**Text Service Responsibilities:**
- Query story configuration
- Format based on mode
- Handle missing fields
- Apply localization

## Extension Points

### Display Mode Extensions
Stories can define custom modes:
```typescript
displayMode: 'credits'    // Show only credits
displayMode: 'legal'      // Show license info
displayMode: 'history'    // Show version history
```

### Story Configuration
Stories provide rich metadata:
```typescript
{
  title: "The Great Adventure",
  author: "Jane Smith",
  version: "1.2.3",
  copyright: "© 2024",
  license: "MIT",
  description: "A thrilling tale of...",
  credits: [
    "Testing: John Doe",
    "Art: Alice Johnson"
  ],
  contact: "author@example.com",
  website: "https://game.example.com"
}
```

## Comparison with Other Meta Actions

### vs. Help
- **About**: Game metadata
- **Help**: Gameplay instructions

### vs. Version
- **About**: Complete information
- **Version**: Technical version only

### vs. Credits
- **About**: Includes credits
- **Credits**: Dedicated credit display

## Testing Considerations

### Test Scenarios
1. **Display Modes**
   - Standard mode
   - Brief mode
   - Verbose mode
   - Invalid modes (fallback)

2. **Event Generation**
   - Correct event type
   - Mode parameter included
   - Event data structure

### Verification Points
- Always validates successfully
- Event emission confirmed
- Display mode preserved
- No state mutations

## Implementation Simplicity

### Line Count
- ~30 lines of actual code
- Minimal complexity
- Clear intent
- Easy maintenance

### No Edge Cases
- Always succeeds
- No error conditions
- No state dependencies
- No timing issues

## Performance Considerations

### Minimal Overhead
- No world queries
- No state lookups
- Single event creation
- Immediate return

### Memory Usage
- No data caching
- No state storage
- Minimal event payload
- No entity snapshots

## Future Enhancements

### Potential Features

#### 1. Dynamic Content
- Runtime statistics
- Play time tracking
- Achievement count
- Progress indicators

#### 2. Interactive About
- Clickable links
- Navigation to sections
- Embedded media
- Rich formatting

#### 3. Context Awareness
- Different info during play
- Completion percentage
- Current chapter info
- Adaptive content

#### 4. Multi-Language Support
- Language selection in mode
- Localized content retrieval
- Cultural adaptations
- Regional information

## Design Philosophy

### Minimalism
The About action exemplifies minimalist design:
- Does one thing well
- No unnecessary complexity
- Clear boundaries
- Easy to understand

### Flexibility Through Delegation
By delegating to the text service:
- Stories control their own branding
- Display can evolve independently
- Multiple output formats possible
- No recompilation for content changes

### Event-Driven Architecture
Pure event-based communication:
- Loose coupling
- Clear contracts
- Testable boundaries
- Extensible system
