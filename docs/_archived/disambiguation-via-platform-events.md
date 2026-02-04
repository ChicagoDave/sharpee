# Disambiguation via Platform Events with Language Provider Integration

## Executive Summary
Rather than building a separate disambiguation service, we should leverage the existing platform query system (ADR-018) which was specifically designed for player interactions including disambiguation. This approach uses established patterns and infrastructure while properly integrating with the language provider for natural language generation.

---

## Current Infrastructure

### Query System Components (Already Implemented)

1. **Query Types** (`/packages/core/src/query/types.ts`)
   - `QuerySource.DISAMBIGUATION` - Specific source for parser disambiguation
   - `QueryType.DISAMBIGUATION` - Dedicated query type
   - `IQueryContext.candidates` - Structure for disambiguation choices

2. **Event Flow**
   ```
   Parser → client.query event → Platform → Player Response → query.response → Action
   ```

3. **Built-in Support**
   ```typescript
   interface IQueryContext {
     candidates?: Array<{
       id: string;
       name: string;
       description?: string;
     }>;
   }
   ```

---

## Language Provider Integration

### Message Definitions for Disambiguation

```typescript
// packages/lang-en-us/src/messages/disambiguation.ts

export const disambiguationMessages = {
  // Core disambiguation prompts - natural sentence format
  'disambiguation.which_do_you_mean': 'Which do you mean, {options}?',
  'disambiguation.which_one': 'Which one: {options}?',
  'disambiguation.did_you_mean': 'Did you mean {options}?',
  
  // Connectors for natural lists
  'disambiguation.or': 'or',
  'disambiguation.comma': ',',
  'disambiguation.the': 'the',
  
  // Contextual descriptions
  'disambiguation.location.carried': '(carried)',
  'disambiguation.location.worn': '(worn)',
  'disambiguation.location.here': '(here)',
  'disambiguation.location.in_container': '(in {container})',
  'disambiguation.location.on_supporter': '(on {supporter})',
  
  // State descriptions
  'disambiguation.state.open': '(open)',
  'disambiguation.state.closed': '(closed)',
  'disambiguation.state.locked': '(locked)',
  'disambiguation.state.lit': '(lit)',
  'disambiguation.state.unlit': '(unlit)',
  
  // Grouping messages
  'disambiguation.group.all_here': 'All of these are here:',
  'disambiguation.group.you_can_see': 'You can see:',
  'disambiguation.group.you_are_carrying': 'You are carrying:',
  
  // Error messages
  'disambiguation.invalid_choice': 'Please choose a number from 1 to {max}.',
  'disambiguation.no_match': "I don't understand which one you mean.",
  'disambiguation.cancelled': 'Never mind.',
};
```

### Language Provider Enhancement

```typescript
// packages/lang-en-us/src/language-provider.ts

class EnglishLanguageProvider implements ParserLanguageProvider {
  
  /**
   * Generate a contextual description for an entity
   * Used in disambiguation prompts
   */
  getEntityDescription(
    entity: IFEntity, 
    context: DisambiguationContext
  ): string {
    const parts: string[] = [];
    
    // Add location context
    const location = context.world.getLocation(entity.id);
    if (location === context.actor.id) {
      parts.push(this.getMessage('disambiguation.location.carried'));
    } else if (location) {
      const container = context.world.getEntity(location);
      if (container?.has('container')) {
        parts.push(this.getMessage('disambiguation.location.in_container', {
          container: container.name
        }));
      }
    }
    
    // Add state context
    if (entity.has('openable')) {
      const isOpen = entity.get('openable')?.isOpen;
      parts.push(this.getMessage(
        isOpen ? 'disambiguation.state.open' : 'disambiguation.state.closed'
      ));
    }
    
    if (entity.has('light-source')) {
      const isLit = entity.get('light-source')?.isLit;
      parts.push(this.getMessage(
        isLit ? 'disambiguation.state.lit' : 'disambiguation.state.unlit'
      ));
    }
    
    return parts.length > 0 ? parts.join(' ') : '';
  }
  
  /**
   * Format a natural language disambiguation prompt
   * Example: "Which do you mean, the red ball or the orange ball?"
   */
  formatDisambiguationPrompt(
    candidates: DisambiguationCandidate[],
    context: DisambiguationContext
  ): string {
    // Build natural language list of options
    const options = this.formatNaturalList(candidates);
    
    // Get appropriate prompt template
    const template = candidates.length === 2 
      ? 'disambiguation.which_do_you_mean'
      : 'disambiguation.which_one';
    
    return this.getMessage(template, { options });
  }
  
  /**
   * Format entities as natural language list
   * Example: "the red ball or the orange ball"
   */
  private formatNaturalList(candidates: DisambiguationCandidate[]): string {
    const formattedItems = candidates.map(c => {
      // Include article and distinguishing adjectives
      const article = this.getMessage('disambiguation.the');
      const adjectives = this.getDistinguishingAdjectives(c);
      const noun = c.baseNoun || c.name;
      
      return adjectives.length > 0
        ? `${article} ${adjectives.join(' ')} ${noun}`
        : `${article} ${noun}`;
    });
    
    // Join with commas and 'or'
    if (formattedItems.length === 2) {
      return `${formattedItems[0]} ${this.getMessage('disambiguation.or')} ${formattedItems[1]}`;
    } else {
      const lastItem = formattedItems.pop();
      return `${formattedItems.join(', ')}, ${this.getMessage('disambiguation.or')} ${lastItem}`;
    }
  }
  
  /**
   * Get distinguishing adjectives for an entity
   */
  private getDistinguishingAdjectives(candidate: DisambiguationCandidate): string[] {
    // Return adjectives that distinguish this from other candidates
    return candidate.adjectives || [];
  }
}
```

## Implementation Design

### 1. Command Validator Integration with Language Provider

```typescript
// packages/stdlib/src/validation/command-validator.ts

import { QuerySource, QueryType } from '@sharpee/core';
import { ILanguageProvider } from '@sharpee/world-model';

class CommandValidator {
  private eventSource: IGenericEventSource;
  private languageProvider: ILanguageProvider;
  private pendingDisambiguation?: {
    candidates: ScoredEntityMatch[];
    command: IParsedCommand;
    resolver: (entity: IFEntity) => void;
  };

  constructor(
    world: WorldModel, 
    actionRegistry: ActionRegistry,
    languageProvider: ILanguageProvider
  ) {
    this.world = world;
    this.actionRegistry = actionRegistry;
    this.languageProvider = languageProvider;
  }

  validate(command: IParsedCommand): Result<ValidatedCommand, IValidationError> {
    // Find matches for direct object
    if (command.directObject) {
      const matches = this.findMatches(command.directObject);
      
      if (matches.length > 1) {
        // Try automatic disambiguation
        const resolved = this.resolveAmbiguity(matches, command.directObject, command);
        
        if (!resolved) {
          // Need player input - emit query event with language provider
          return this.requestDisambiguation(matches, command, 'directObject');
        }
        
        command.directObject.entity = resolved.entity;
      }
    }
    
    // Continue normal validation...
  }

  private requestDisambiguation(
    matches: ScoredEntityMatch[],
    command: IParsedCommand,
    slot: 'directObject' | 'indirectObject'
  ): Result<ValidatedCommand, IValidationError> {
    // Store state for when response comes back
    this.pendingDisambiguation = {
      candidates: matches,
      command,
      resolver: null
    };
    
    // Build context for language provider
    const disambiguationContext = {
      world: this.world,
      actor: this.world.getPlayer(),
      action: command.action,
      noun: command[slot].text
    };
    
    // Generate descriptions using language provider
    const candidatesWithDescriptions = matches.map(m => ({
      id: m.entity.id,
      name: m.entity.name,
      description: this.languageProvider.getEntityDescription?.(
        m.entity, 
        disambiguationContext
      ) || this.getBasicDescription(m.entity)
    }));
    
    // Get localized prompt message
    const promptMessage = this.languageProvider.getMessage(
      'disambiguation.which_one',
      { noun: command[slot].text }
    );
    
    // Emit platform query event
    this.eventSource.emit({
      type: 'client.query',
      data: {
        source: QuerySource.DISAMBIGUATION,
        type: QueryType.DISAMBIGUATION,
        messageId: 'disambiguation.prompt',
        message: promptMessage, // Pre-formatted message
        messageParams: {
          verb: command.action,
          noun: command[slot].text
        },
        options: candidatesWithDescriptions.map(c => 
          `${c.name} ${c.description}`.trim()
        ),
        context: {
          candidates: candidatesWithDescriptions,
          rawCandidates: matches.map(m => m.entity.id)
        },
        allowInterruption: false
      }
    });
    
    // Return a special result indicating we need input
    return {
      success: false,
      error: {
        type: 'needs_disambiguation',
        message: this.languageProvider.getMessage('disambiguation.waiting'),
        data: { candidates: matches }
      }
    };
  }

  handleDisambiguationResponse(response: IQueryResponse): ValidatedCommand {
    if (!this.pendingDisambiguation) {
      throw new Error('No pending disambiguation');
    }
    
    const { candidates, command } = this.pendingDisambiguation;
    
    // Try to match response against candidates
    const selected = this.matchResponseToCandidate(response.response, candidates);
    
    if (!selected) {
      // Invalid response - ask again
      this.eventSource.emit({
        type: 'system.message',
        data: {
          message: this.languageProvider.getMessage('disambiguation.no_match')
        }
      });
      return null; // Stay in disambiguation mode
    }
    
    // Update command with selected entity
    if (command.directObject) {
      command.directObject.entity = selected.entity;
    }
    
    // Clear pending state
    this.pendingDisambiguation = undefined;
    
    // Continue validation with resolved entity
    return this.validate(command).value as ValidatedCommand;
  }
  
  /**
   * Match player response to a candidate
   * Accepts: numbers, full names, or distinguishing adjectives
   */
  private matchResponseToCandidate(
    response: string | number,
    candidates: ScoredEntityMatch[]
  ): ScoredEntityMatch | null {
    const input = String(response).toLowerCase().trim();
    
    // 1. Try number selection (1, 2, 3, etc.)
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= candidates.length) {
      return candidates[num - 1];
    }
    
    // 2. Try exact name match
    const exactMatch = candidates.find(c => 
      c.entity.name.toLowerCase() === input
    );
    if (exactMatch) return exactMatch;
    
    // 3. Try adjective match (e.g., "red" for "red ball")
    const adjectiveMatch = candidates.find(c => {
      const adjectives = this.getEntityAdjectives(c.entity);
      return adjectives.some(adj => adj.toLowerCase() === input);
    });
    if (adjectiveMatch) return adjectiveMatch;
    
    // 4. Try partial match (e.g., "red b" for "red ball")
    const partialMatch = candidates.find(c => {
      const fullName = this.getFullEntityName(c.entity);
      return fullName.toLowerCase().includes(input);
    });
    if (partialMatch) return partialMatch;
    
    // 5. Try single word from name (e.g., "ball" when both are balls but different colors)
    const words = input.split(/\s+/);
    if (words.length === 1) {
      const wordMatches = candidates.filter(c => {
        const adjectives = this.getEntityAdjectives(c.entity);
        const noun = this.getEntityNoun(c.entity);
        return adjectives.includes(words[0]) || noun === words[0];
      });
      
      // Only accept if it uniquely identifies one candidate
      if (wordMatches.length === 1) {
        return wordMatches[0];
      }
    }
    
    return null;
  }

  private getDisambiguationDescription(entity: IFEntity): string {
    const location = this.world.getLocation(entity.id);
    const container = location ? this.world.getEntity(location) : null;
    
    // Build contextual description
    if (container) {
      if (container.id === this.world.getPlayer().id) {
        return '(carried)';
      }
      if (container.has('room')) {
        return '(here)';
      }
      return `(in ${container.name})`;
    }
    
    return '';
  }
}
```

### 2. Engine Integration

```typescript
// packages/engine/src/game-engine.ts

class GameEngine {
  private validator: CommandValidator;
  private queryManager: QueryManager;
  
  async executeTurn(input: string): Promise<TurnResult> {
    // Check if we're responding to a query
    if (this.queryManager.hasPendingQuery()) {
      const query = this.queryManager.getCurrentQuery();
      
      if (query.source === QuerySource.DISAMBIGUATION) {
        // Handle disambiguation response
        const response = this.queryManager.processResponse(input);
        const validated = this.validator.handleDisambiguationResponse(response);
        
        // Continue with resolved command
        return this.executeCommand(validated);
      }
    }
    
    // Normal command processing
    const parsed = this.parser.parse(input);
    const validated = this.validator.validate(parsed);
    
    if (!validated.success && validated.error.type === 'needs_disambiguation') {
      // Validation triggered a disambiguation query
      // The query event was already emitted, just return status
      return {
        success: true,
        needsInput: true,
        events: [{
          type: 'system.message',
          data: { 
            message: 'Which do you mean?',
            choices: validated.error.data.candidates 
          }
        }]
      };
    }
    
    return this.executeCommand(validated.value);
  }
}
```

### 3. Platform Presentation

```typescript
// packages/platforms/cli-en-us/src/cli-platform.ts

class CLIPlatform {
  private languageProvider: ILanguageProvider;
  
  private formatDisambiguationPrompt(query: IPendingQuery): string {
    // The message and options are already formatted by validator with language provider
    // Platform just needs to present them appropriately for CLI
    
    const message = query.data.message || 
                   this.languageProvider.getMessage('disambiguation.which_do_you_mean');
    const options = query.data.options || [];
    
    if (options.length === 0) {
      return message;
    }
    
    // Format for CLI display
    const lines = [message];
    options.forEach((option, i) => {
      lines.push(`  ${i + 1}. ${option}`);
    });
    
    return lines.join('\n');
  }
  
  handleQueryEvent(event: ISemanticEvent): void {
    if (event.data.source === QuerySource.DISAMBIGUATION) {
      const prompt = this.formatDisambiguationPrompt(event.data);
      this.output(prompt);
      this.waitingForResponse = true;
    }
  }
}

// packages/platforms/browser-en-us/src/browser-platform.ts

class BrowserPlatform {
  private formatDisambiguationForHTML(query: IPendingQuery): HTMLElement {
    const container = document.createElement('div');
    container.className = 'disambiguation-prompt';
    
    // Add message
    const message = document.createElement('p');
    message.textContent = query.data.message;
    container.appendChild(message);
    
    // Add clickable options
    const list = document.createElement('ol');
    query.data.options.forEach((option, i) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.textContent = option;
      button.onclick = () => this.selectOption(i);
      item.appendChild(button);
      list.appendChild(item);
    });
    container.appendChild(list);
    
    return container;
  }
}
```

---

## Advanced Features Using Platform Events

### 1. Contextual Disambiguation

```typescript
// Use the query context to provide rich information
context: {
  candidates: matches.map(m => ({
    id: m.entity.id,
    name: m.entity.name,
    description: this.getContextualDescription(m.entity),
    metadata: {
      distance: this.getProximityScore(m.entity),
      lastUsed: this.getLastInteractionTime(m.entity),
      state: this.getEntityState(m.entity)
    }
  }))
}
```

### 2. Learning from Responses

```typescript
class DisambiguationLearner {
  private preferences: Map<string, Map<string, number>> = new Map();
  
  handleQueryResponse(event: ISemanticEvent): void {
    if (event.type !== 'query.response') return;
    if (event.data.query.source !== QuerySource.DISAMBIGUATION) return;
    
    const { query, response } = event.data;
    const selected = query.context.candidates[response.selectedIndex];
    
    // Track player preference
    const key = `${query.messageParams.verb}:${query.messageParams.noun}`;
    const prefs = this.preferences.get(key) || new Map();
    prefs.set(selected.id, (prefs.get(selected.id) || 0) + 1);
    this.preferences.set(key, prefs);
  }
  
  getBias(verb: string, noun: string, entityId: string): number {
    const key = `${verb}:${noun}`;
    const prefs = this.preferences.get(key);
    if (!prefs) return 1.0;
    
    const count = prefs.get(entityId) || 0;
    const total = Array.from(prefs.values()).reduce((a, b) => a + b, 0);
    
    // Boost score based on selection frequency
    return 1.0 + (count / total) * 0.5;
  }
}
```

### 3. Interruption Handling

```typescript
// Platform events support interruption
if (query.allowInterruption && this.isInterruptCommand(input)) {
  this.eventSource.emit({
    type: 'query.interrupted',
    data: { query, command: input }
  });
  
  // Process the interrupting command instead
  return this.executeCommand(input);
}
```

---

## Benefits of Using Platform Events

### 1. Consistency
- Same query/response pattern as save/quit/restore
- Players learn one interaction model
- Platforms handle presentation consistently

### 2. No New Infrastructure
- Query system already exists and is tested
- Event routing already implemented
- Platform integration already done

### 3. Rich Features
- Built-in validation
- Timeout support
- Interruption handling
- History tracking
- Priority queueing

### 4. Platform Flexibility
- CLI can use numbered lists
- GUI can use clickable buttons
- Voice can read options
- Each platform optimizes for its medium

---

## Implementation Plan

### Phase 1: Basic Integration (Week 1)
1. Add disambiguation check to CommandValidator
2. Emit client.query events for ambiguous references
3. Handle query.response events
4. Test with simple cases

### Phase 2: Smart Formatting (Week 2)
1. Add contextual descriptions
2. Group similar items
3. Sort by relevance
4. Test with complex scenarios

### Phase 3: Learning (Week 3)
1. Track player preferences
2. Adjust scoring based on history
3. Reduce disambiguation over time
4. Add metrics

### Phase 4: Polish (Week 4)
1. Optimize prompts
2. Add configuration options
3. Documentation
4. Integration tests

---

## Message Generation Flow

### Complete Flow with Language Provider

```
1. Parser → "take torch" → Finds multiple matches

2. CommandValidator:
   - Detects ambiguity (3 torches)
   - Calls languageProvider.getEntityDescription() for each
   - Gets localized prompt via languageProvider.getMessage()
   - Emits client.query event with formatted data

3. Language Provider generates:
   - Message: "Which torch do you mean?"
   - Descriptions: "(on wall)", "(in pack)", "(carried by guard)"
   - Complete options: ["brass torch (on wall)", "wooden torch (in pack)", "lit torch (carried by guard)"]

4. Platform receives query event:
   - CLI: Formats as numbered list
   - Browser: Creates clickable buttons
   - Voice: Reads options aloud

5. Player responds: "1" or clicks first button

6. Platform emits query.response

7. CommandValidator:
   - Receives response
   - Resolves to selected entity
   - Continues validation with resolved entity
```

### Language Provider Responsibilities

1. **Message Storage**: All disambiguation messages in language files
2. **Entity Descriptions**: Context-aware descriptions based on state and location
3. **Formatting Rules**: Language-specific formatting (articles, prepositions)
4. **Localization**: Complete support for non-English languages

### Platform Responsibilities

1. **Presentation**: Format for specific medium (text, HTML, voice)
2. **Input Handling**: Capture and validate player response
3. **Event Routing**: Emit appropriate events
4. **UI State**: Manage waiting-for-input state

## Standard IF Disambiguation Examples

### Example 1: Simple Two-Item Disambiguation
```
> take ball
Which do you mean, the red ball or the orange ball?

> red
You take the red ball.
```

### Example 2: Multiple Items with Adjectives
```
> open box
Which one: the small wooden box, the large metal box, or the ornate jewelry box?

> wooden
You open the small wooden box.

> metal
You open the large metal box.

> 3
You open the ornate jewelry box.
```

### Example 3: Location-Based Disambiguation
```
> examine torch
Which do you mean, the brass torch (on the wall) or the wooden torch (in your pack)?

> brass
The brass torch is firmly mounted to the wall.

> wall
The brass torch is firmly mounted to the wall.
```

### Example 4: State-Based Disambiguation
```
> drink potion
Which one: the blue potion (full) or the blue potion (half-empty)?

> full
You drink the full blue potion.
```

### Example 5: Complex Multi-Adjective
```
> take sword
Which do you mean, the rusty iron sword, the gleaming steel sword, or the ancient silver sword?

> rusty
You take the rusty iron sword.

> steel
You take the gleaming steel sword.

> ancient silver
You take the ancient silver sword.
```

## Response Acceptance Rules

The system accepts multiple response formats:

1. **Number**: `1`, `2`, `3` (position in list)
2. **Full Name**: `red ball`, `wooden box`
3. **Distinguishing Adjective**: `red`, `wooden`, `brass`
4. **Multiple Adjectives**: `ancient silver`, `small wooden`
5. **Partial Match**: `met` for `metal box` (if unique)
6. **Context Word**: `wall` for item on wall (if unique)

---

## Migration Strategy

### For Existing Code
1. CommandValidator already has `resolveAmbiguity()` - enhance it
2. Add event emission at disambiguation points
3. Keep automatic resolution as fallback
4. Gradually improve heuristics

### For Actions
- No changes needed!
- Actions receive pre-resolved entities
- Disambiguation happens before validation

---

## Benefits of Language Provider Integration

### 1. Proper Localization
- All messages come from language files
- Consistent with rest of game text
- Easy to translate to other languages
- Cultural adaptation of prompts

### 2. Context-Aware Descriptions
- Language provider knows grammar rules
- Proper article usage ("a", "an", "the")
- Correct prepositions for each language
- Natural phrasing for descriptions

### 3. Extensibility
- Story authors can override messages
- Custom descriptions for special items
- Domain-specific disambiguation rules
- Rich narrative voice maintained

### 4. Consistency
- Same message system as actions
- Same formatting rules throughout
- Single source of truth for text
- Unified localization strategy

## Conclusion

Using platform events with language provider integration for disambiguation:
1. **Leverages existing infrastructure** - Query system + language provider
2. **Maintains separation of concerns** - Each layer has clear responsibilities
3. **Enables rich natural language** - Proper localization and context
4. **Supports learning** - Can track and improve over time
5. **Platform-optimized** - Each platform presents optimally

This approach provides natural, localized disambiguation while maintaining clean architecture and reusing existing systems.