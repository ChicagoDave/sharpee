# ADR-018: Conversational State Management

## Status
Partially Implemented

## Context
Interactive fiction requires managing conversational state between the system and the player character (PC). There are multiple scenarios where the system needs to ask the player a question and await a response:

1. **Disambiguation** (see ADR-017): "Which torch do you mean?"
2. **NPC Dialogue**: "The guard asks, 'What's the password?'"
3. **System Queries**: "What would you like to name your character?"
4. **Confirmations**: "Are you sure you want to restart? (Y/N)"
5. **Multi-step Commands**: "What would you like to write on the note?"

Currently, IF systems handle this in ad-hoc ways, often losing context or creating confusing states where the player doesn't know if they're answering a question or entering a new command.

## Decision
We will implement a unified conversational state system that:

1. **Tracks pending questions** from any source
2. **Maintains context** about what's being asked
3. **Routes responses** appropriately
4. **Allows interruption** when necessary
5. **Provides clear feedback** about the current state

### Conversation State Model

```typescript
interface ConversationState {
  pendingQuery?: PendingQuery;
  conversationStack: PendingQuery[];  // For nested conversations
  lastQueryTime: number;
  responseTimeout?: number;  // Optional timeout for responses
}

interface PendingQuery {
  id: string;                        // Unique query ID
  source: QuerySource;               // Who/what is asking
  type: QueryType;                   // Category of query
  prompt: string;                    // The question text
  context: any;                      // Source-specific context
  validator?: ResponseValidator;     // Optional response validation
  allowInterruption: boolean;        // Can player ignore this?
  options?: string[];               // For multiple choice
  created: number;                  // Timestamp
}

enum QuerySource {
  SYSTEM = 'system',           // Platform needs info
  DISAMBIGUATION = 'disambiguation',  // Parser needs clarification
  NPC = 'npc',                // NPC dialogue
  GAME_MECHANIC = 'mechanic', // Game mechanics (saving, etc.)
  NARRATIVE = 'narrative'      // Story-driven prompts
}

enum QueryType {
  YES_NO = 'yes_no',
  MULTIPLE_CHOICE = 'multiple_choice',
  FREE_TEXT = 'free_text',
  NUMERIC = 'numeric',
  DISAMBIGUATION = 'disambiguation'
}

type ResponseValidator = (response: string) => ValidationResult;

interface ValidationResult {
  valid: boolean;
  message?: string;  // Error message if invalid
  normalized?: any;  // Normalized/parsed response
}
```

### Query Manager

```typescript
class QueryManager {
  private state: ConversationState = {
    conversationStack: [],
    lastQueryTime: 0
  };
  
  private handlers = new Map<QuerySource, QueryHandler>();
  private eventEmitter: EventEmitter;
  
  async askQuery(query: PendingQuery): Promise<any> {
    // Stack the query if there's already one pending
    if (this.state.pendingQuery) {
      if (query.priority > this.state.pendingQuery.priority) {
        // Higher priority interrupts
        this.state.conversationStack.push(this.state.pendingQuery);
        this.state.pendingQuery = query;
      } else {
        // Queue for later
        this.state.conversationStack.push(query);
        return;
      }
    } else {
      this.state.pendingQuery = query;
    }
    
    // Emit the query to the UI
    this.eventEmitter.emit('query:pending', {
      prompt: query.prompt,
      type: query.type,
      options: query.options
    });
    
    // Return a promise that resolves when answered
    return new Promise((resolve, reject) => {
      this.pendingResolvers.set(query.id, { resolve, reject });
    });
  }
  
  processInput(input: string): ProcessResult {
    if (!this.state.pendingQuery) {
      // No pending query, this is a normal command
      return { type: 'command', input };
    }
    
    const query = this.state.pendingQuery;
    
    // Check for interruption attempts
    if (this.looksLikeCommand(input) && !query.allowInterruption) {
      return {
        type: 'reminder',
        message: `Please answer the question first: ${query.prompt}`
      };
    }
    
    if (this.looksLikeCommand(input) && query.allowInterruption) {
      // Cancel the query and process as command
      this.cancelCurrentQuery();
      return { type: 'command', input };
    }
    
    // Validate the response
    if (query.validator) {
      const validation = query.validator(input);
      if (!validation.valid) {
        return {
          type: 'invalid',
          message: validation.message || 'Invalid response. Try again.'
        };
      }
      input = validation.normalized || input;
    }
    
    // Route to appropriate handler
    const handler = this.handlers.get(query.source);
    const response = handler.handleResponse(input, query.context);
    
    // Resolve the promise
    const resolver = this.pendingResolvers.get(query.id);
    if (resolver) {
      resolver.resolve(response);
      this.pendingResolvers.delete(query.id);
    }
    
    // Clear current query and pop next from stack
    this.state.pendingQuery = undefined;
    if (this.state.conversationStack.length > 0) {
      this.state.pendingQuery = this.state.conversationStack.shift();
      // Re-prompt for the restored query
      this.eventEmitter.emit('query:restored', {
        prompt: this.state.pendingQuery.prompt
      });
    }
    
    return { type: 'response_processed' };
  }
  
  private looksLikeCommand(input: string): boolean {
    // Heuristics to detect if input looks like a command
    // rather than a response to the query
    const commandPatterns = [
      /^(look|take|drop|go|examine|inventory|save|load|help)/i,
      /^(n|s|e|w|ne|nw|se|sw|up|down|in|out)$/i,
      /^x\s+/i,  // "x thing" for examine
      /^g\s+/i   // "g place" for go
    ];
    
    return commandPatterns.some(pattern => pattern.test(input.trim()));
  }
}
```

### Integration Examples

#### Disambiguation
```typescript
// From the disambiguation service
const result = await queryManager.askQuery({
  id: generateId(),
  source: QuerySource.DISAMBIGUATION,
  type: QueryType.MULTIPLE_CHOICE,
  prompt: 'Which torch do you mean?',
  options: ['the lit torch', 'the unlit torch', 'the brass torch'],
  context: { candidates: torchEntities },
  allowInterruption: true,
  validator: (response) => {
    const num = parseInt(response);
    if (num >= 1 && num <= 3) {
      return { valid: true, normalized: num - 1 };
    }
    // Also accept text matching
    const index = options.findIndex(opt => 
      opt.toLowerCase().includes(response.toLowerCase())
    );
    if (index >= 0) {
      return { valid: true, normalized: index };
    }
    return { valid: false, message: 'Please choose a number or describe which one.' };
  }
});
```

#### NPC Dialogue
```typescript
// From an NPC conversation behavior
const answer = await queryManager.askQuery({
  id: generateId(),
  source: QuerySource.NPC,
  type: QueryType.FREE_TEXT,
  prompt: 'The guard narrows his eyes. "What\'s the password?"',
  context: { npcId: guard.id, expectedPassword: 'swordfish' },
  allowInterruption: false,  // Must answer the guard
  timeout: 30000  // 30 seconds to answer
});
```

#### System Query
```typescript
// From game initialization
const name = await queryManager.askQuery({
  id: generateId(),
  source: QuerySource.SYSTEM,
  type: QueryType.FREE_TEXT,
  prompt: 'What would you like to name your character?',
  context: {},
  allowInterruption: false,
  validator: (response) => {
    if (response.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters.' };
    }
    if (response.length > 20) {
      return { valid: false, message: 'Name must be 20 characters or less.' };
    }
    return { valid: true, normalized: response.trim() };
  }
});
```

### UI Integration

The UI layer receives events and updates display accordingly:

```typescript
queryManager.on('query:pending', ({ prompt, type, options }) => {
  if (type === QueryType.MULTIPLE_CHOICE && options) {
    // Display numbered options
    ui.showPrompt(prompt);
    options.forEach((opt, i) => {
      ui.showOption(`${i + 1}. ${opt}`);
    });
  } else {
    // Simple prompt
    ui.showPrompt(prompt);
  }
  
  // Visual indicator that we're waiting for a response
  ui.setInputMode('responding');
});

queryManager.on('query:cancelled', () => {
  ui.setInputMode('command');
  ui.showMessage('(Question cancelled)');
});

queryManager.on('query:timeout', ({ prompt }) => {
  ui.showMessage('(Response timed out)');
  ui.setInputMode('command');
});
```

## Consequences

### Positive
- **Unified System**: All queries go through same pipeline
- **Context Preservation**: Never lose track of what's being asked
- **Interruption Handling**: Clear rules about when player can break out
- **Validation**: Built-in response validation
- **UI Flexibility**: UI can show appropriate widgets based on query type
- **Nested Conversations**: Can handle guard asking password while disambiguating

### Negative
- **Complexity**: Another state machine to manage
- **Learning Curve**: Authors need to understand the query system
- **Edge Cases**: Many interaction patterns to handle
- **State Persistence**: Need to save conversation state

### Neutral
- **Standard Pattern**: Most IF systems have similar mechanisms
- **Player Expectations**: Players expect contextual conversations

## Implementation Priority

1. **Core State Management**: Basic query/response flow
2. **Disambiguation Integration**: Connect to ADR-017
3. **Validation Framework**: Response validators
4. **UI Events**: Proper event system for UI updates
5. **Advanced Features**: Timeouts, nested conversations
6. **NPC Integration**: Dialogue system support

## Alternatives Considered

### 1. Modal Dialogs
Use UI modal dialogs for all queries.
- **Pros**: Clear separation from game
- **Cons**: Breaks immersion, not text-like

### 2. Special Commands
Require special syntax for responses (e.g., "ANSWER yes").
- **Pros**: Unambiguous
- **Cons**: Unnatural, hard to discover

### 3. Inline Responses
No special state, just parse responses in context.
- **Pros**: Simple
- **Cons**: Ambiguous, hard to manage

### 4. Separate Input Modes
Different input fields for commands vs responses.
- **Pros**: Clear distinction
- **Cons**: Requires UI changes, confusing

## References
- Inform 7's conversation system
- TADS 3's ConversationManager
- Ink's choice/branching system
- Modern chat UI patterns (typing indicators, etc.)

## Platform Query Integration

The query system has been extended to work with platform events (ADR-035):

### Platform Query Handlers
- **QuitQueryHandler**: Processes quit confirmation responses and emits platform events
- **RestartQueryHandler**: Handles restart confirmations
- Both handlers support save-and-quit/restart options

### Event Flow
1. Action emits platform event (e.g., `platform.quit_requested`)
2. Platform hook can optionally use query system for confirmation
3. Query handler processes response and emits appropriate platform event
4. Engine processes platform operation based on final event

This allows flexible client implementations:
- Clients can handle confirmations directly in their hooks
- Or use the query system for text-based confirmations
- Or implement their own UI (modal dialogs, etc.)

## Future Considerations

- **Voice Integration**: Handle voice input/output
- **Multiplayer**: Multiple players answering questions
- **Undo/Redo**: How to handle undo across conversations
- **Save/Load**: Preserving conversation state
- **Localization**: Translating prompts and validations
- **Platform Queries**: Extended for save name input, restore slot selection
