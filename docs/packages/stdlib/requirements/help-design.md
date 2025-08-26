# Help Action Design Document

## Action Overview
The help action is a meta-action that provides gameplay instructions and command information to players. It supports both general help and topic-specific help, with automated content generation from the LanguageProvider. The action emits events containing the requested help type, allowing text services to retrieve and display appropriate help content.

## Action ID
`IFActions.HELP`

## Required Messages
- `general_help` - General help content
- `help_topic` - Help for a specific topic
- `unknown_topic` - Topic not recognized
- `help_movement` - Movement commands help
- `help_objects` - Object interaction help
- `help_special` - Special commands help
- `first_time_help` - Additional content for first-time users
- `hints_available` - Hints system is enabled
- `hints_disabled` - Hints system is disabled
- `stuck_help` - Help for stuck players
- `help_footer` - Footer text for help display

## Validation Logic

### Phase: validate()
**Note**: The validate method builds event data but doesn't perform actual validation.

1. **Determine Help Topic**
   - Checks for topic in multiple sources:
     - `context.command.parsed.extras?.topic`
     - `context.command.indirectObject?.parsed.text`
     - `context.command.directObject?.parsed.text`
   - Falls back to null if no topic found

2. **Topic-Specific Help**
   - If topic found:
     - Sets `specificHelp` flag to true
     - Stores topic in `helpRequest` field

3. **General Help**
   - If no topic:
     - Sets `generalHelp` flag to true
     - Sets `helpType` to "general"
     - Checks first-time status from shared data
     - Sets `firstTime` flag if never requested
     - Retrieves help sections from shared data
     - Default sections: basic_commands, movement, objects, special_commands
     - Checks hints availability (default: enabled)

### Return Value
- Always returns `{ valid: true }` (no validation failures possible)

## Execution Logic

### Phase: execute()
**Note**: This action duplicates the logic from validate() phase.

1. **Determine Help Topic** (Repeated)
   - Same logic as validate phase
   - Checks same sources for topic

2. **Build Event Data** (Repeated)
   - For specific topic:
     - Sets `specificHelp` and `helpRequest`
   - For general help:
     - Sets `generalHelp` and `helpType`
     - Checks first-time status
     - Includes help sections
     - Includes hints availability

3. **Generate Event**
   - Creates single `if.event.help_displayed` event
   - Passes built event data
   - No success/error messages generated

## Reporting Logic
**Note**: No separate report() method - all logic in execute().

## Data Structures

### HelpDisplayedEventData
```typescript
{
  generalHelp?: boolean,      // True for general help
  specificHelp?: boolean,     // True for topic help
  helpType?: string,          // Type of help (e.g., "general")
  helpRequest?: string,       // Specific topic requested
  firstTime?: boolean,        // First help request
  sections?: string[],        // Available help sections
  hintsAvailable?: boolean    // Whether hints are enabled
}
```

### Shared Data Structure
```typescript
{
  helpRequested: boolean,     // Tracks if help ever requested
  helpSections: string[],     // Custom help sections
  hintsEnabled: boolean       // Hints system status
}
```

## Traits Used
**None** - This action doesn't interact with entity traits.

## Message Selection Logic

The action doesn't directly select messages. Instead:
1. Emits event with help context
2. Text service interprets event data
3. Text service selects appropriate messages based on:
   - General vs specific help
   - First-time vs repeat request
   - Available sections
   - Hints status

## Metadata

```typescript
{
  requiresDirectObject: false,
  requiresIndirectObject: false
}
```

- **Group**: `meta`
- **Direct Object**: Not required (can parse topic from it)
- **Indirect Object**: Not required (can parse topic from it)

## Event Flow

1. **Validation Phase**
   - Builds event data (but doesn't use it)
   - Always returns valid

2. **Execution Phase**
   - Rebuilds same event data
   - Emits single help event
   - No success/error events

## Special Behaviors

### Topic Detection
- Multiple sources for topic extraction:
  - Command extras
  - Indirect object text
  - Direct object text
- First non-null value used
- Flexible parsing support

### First-Time Detection
- Tracks help usage in shared data
- Special content for new players
- Persistent across session

### Section Configuration
- Customizable help sections
- Default set provided
- Story-specific sections supported

### Hints System
- Configurable hints availability
- Default enabled
- Status included in event

## Integration Points

### World Model Integration
- Accesses shared data via `getSharedData()`
- Reads but doesn't modify state
- Graceful fallback for missing data

### Language Provider
- Help content retrieved by text service
- Action only provides context
- Separation of concerns

### Event System
- Single domain event emission
- No UI events generated
- Text service handles display

## Error Handling

### Missing Data Handling
- Graceful fallback for undefined shared data
- Default values for all fields:
  - `helpRequested`: false
  - `helpSections`: default array
  - `hintsEnabled`: true

### Topic Parsing
- Multiple fallback sources
- Null-safe navigation
- No errors on missing topics

## Design Patterns

### Current Implementation Notes
1. **Duplicate Logic**
   - Validate and execute have identical code
   - Event data built twice
   - Validate result not used

2. **Event-Driven Content**
   - Action emits context only
   - Content retrieved elsewhere
   - Clean separation of concerns

3. **Flexible Topic Sources**
   - Multiple parsing strategies
   - Accommodates different syntaxes
   - Robust topic extraction

4. **Stateless Operation**
   - Reads but doesn't modify state
   - No side effects
   - Pure information display

## Limitations and Assumptions

1. **No Validation Failures**
   - Always succeeds
   - No error conditions
   - Cannot fail validation

2. **Duplicate Code**
   - Same logic in validate and execute
   - Maintenance burden
   - Potential for divergence

3. **Limited Topic Recognition**
   - Simple text extraction
   - No fuzzy matching
   - No command aliases

4. **No Context Awareness**
   - Doesn't consider game state
   - No dynamic help based on situation
   - Static section list

5. **Single Event Output**
   - No success/error events
   - Limited feedback options
   - Relies entirely on text service

## Recommended Improvements

1. **Remove Duplication**
   - Move logic to single location
   - Use validate result in execute
   - Or skip validate entirely

2. **Enhanced Topic Matching**
   - Support command aliases
   - Fuzzy matching for topics
   - Command-specific help

3. **Context-Aware Help**
   - Consider current location
   - Show relevant commands
   - Dynamic section generation

4. **Help History**
   - Track viewed topics
   - Suggest unread sections
   - Progressive disclosure