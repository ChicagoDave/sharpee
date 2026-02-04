# Feature-009: Choice-Based Interaction Architecture

## Status
Proposed

## Context
While Sharpee is parser-based, many modern IF players expect choice-based interactions similar to Twine, Ink, or ChoiceScript. Rather than requiring a completely different interface, we can provide architectural support for choice-driven gameplay within a parser context. This allows authors to mix parser and choice-based interactions, use choices for conversations and major decisions, and provide accessibility for players less comfortable with parsers.

## Problem
- Parser interfaces can be intimidating for new players
- Conversations feel unnatural with parser commands
- Some narrative moments work better with explicit choices
- Difficult to show all available options in parser IF
- Mobile/touch interfaces work poorly with parser input
- No standard way to mix parser and choice interactions
- Players from Twine/Choice IF background expect visible options
- Accessibility concerns for players with disabilities

## Solution
Implement a choice architecture that seamlessly integrates with parser-based gameplay, allowing authors to use choices where appropriate while maintaining parser interaction elsewhere:

```typescript
// Define a choice-enabled game
export const HybridGame = Game.create('parser-with-choices')
  .configure({
    primaryInterface: 'parser',
    choiceInterface: 'integrated',
    
    // When to show choices
    choiceTriggers: {
      conversations: true,      // NPCs offer dialogue choices
      majorDecisions: true,     // Big story moments
      firstTimeHints: true,     // Help new players
      mobileMode: 'auto'        // Detect touch devices
    }
  })
  
  // Conversation with choices
  .npc('innkeeper')
    .dialogue({
      greeting: 'Welcome to the Prancing Pony! What can I do for you?',
      
      // Choices appear as numbered or lettered options
      choices: [
        {
          text: 'Ask about rumors',
          requires: null,  // Always available
          response: 'Well, folks say strange things been happening at the old mill...',
          followup: 'mill-rumors'
        },
        {
          text: 'Rent a room',
          requires: { gold: 10 },
          response: 'That\'ll be 10 gold pieces for the night.',
          action: () => game.rentRoom('inn'),
          consumesGold: 10
        },
        {
          text: 'Ask about other guests',
          requires: { reputation: 'trusted' },
          response: 'There\'s a hooded stranger in the corner booth...',
          revealsChoice: 'approach-stranger'
        },
        {
          text: 'Leave',
          response: 'Come back anytime!',
          ends: true
        }
      ],
      
      // Can also use parser
      parserFallback: {
        enabled: true,
        commands: {
          'ask about *': (topic) => this.handleTopic(topic),
          'buy *': (item) => this.handlePurchase(item)
        }
      }
    });

  // Major story decision
  .scene('moral-crossroads')
    .decision({
      text: 'The captured bandit begs for mercy. Your sword is at his throat.',
      
      // These appear as special formatted choices
      choices: [
        {
          text: '[MERCY] Lower your sword',
          sets: { path: 'merciful', karma: '+10' },
          narration: 'You step back. "Go. Don\'t let me see you again."'
        },
        {
          text: '[JUSTICE] Strike him down',
          sets: { path: 'just', karma: '-10' },
          narration: 'Your blade falls. Justice, cold and final.'
        },
        {
          text: '[PRAGMATIC] Make him useful',
          requires: { intelligence: 12 },
          sets: { path: 'pragmatic' },
          narration: 'You smile coldly. "You\'re going to help me get inside."'
        }
      ],
      
      // No parser fallback for major decisions
      parserFallback: false,
      
      // Track this decision
      remember: 'bandit-fate'
    });
```

### Choice Presentation Styles

```typescript
// Inline choices - appear in text flow
.inlineChoice({
  text: 'You could [go left] or [go right] at the fork.',
  
  handlers: {
    'go left': () => player.move('dark-path'),
    'go right': () => player.move('sunny-path')
  },
  
  // Also accept parser commands
  parserEquivalents: {
    'go left': ['left', 'go left', 'take left path'],
    'go right': ['right', 'go right', 'take right path']
  }
})

// Menu choices - separate section
.menuChoice({
  prompt: 'What would you like to examine?',
  
  choices: [
    { text: 'The strange painting', action: 'examine painting' },
    { text: 'The dusty bookshelf', action: 'examine bookshelf' },
    { text: 'The locked chest', action: 'examine chest' },
    { text: 'Nothing', action: null }
  ],
  
  // Auto-generate from room contents
  autoGenerate: {
    from: 'visible-objects',
    filter: 'interesting',
    limit: 5
  }
})

// Hybrid choices - mix with parser
.hybridChoice({
  text: 'The merchant shows his wares.',
  
  showChoices: [
    'Buy healing potion (10g)',
    'Buy magic sword (100g)',
    'Buy map (25g)'
  ],
  
  additionalParser: 'You can also ASK ABOUT items or EXAMINE them first.',
  
  // Choices just execute parser commands
  choiceMapping: {
    'Buy healing potion (10g)': 'buy potion',
    'Buy magic sword (100g)': 'buy sword',
    'Buy map (25g)': 'buy map'
  }
})
```

### Dynamic Choice Generation

```typescript
// Context-sensitive choices
.dynamicChoices({
  // Base choices always available
  base: [
    'Look around',
    'Check inventory',
    'Wait'
  ],
  
  // Add choices based on context
  conditional: [
    {
      condition: (ctx) => ctx.room.hasNPC(),
      choice: 'Talk to {npc.name}'
    },
    {
      condition: (ctx) => ctx.room.hasExit('north'),
      choice: 'Go north'
    },
    {
      condition: (ctx) => ctx.player.hasItem('key'),
      choice: 'Use key'
    }
  ],
  
  // Smart choice ordering
  ordering: 'contextual',  // Most relevant first
  
  // Limit choices to prevent overwhelming
  maxChoices: 7
})

// Conversation trees
.conversationTree('elder-dialogue', {
  root: {
    text: 'The elder strokes his beard thoughtfully.',
    choices: [
      { text: 'Ask about the prophecy', next: 'prophecy' },
      { text: 'Ask about the ruins', next: 'ruins' },
      { text: 'Ask about your father', next: 'father', requires: 'know-father' }
    ]
  },
  
  prophecy: {
    text: 'Ah, the prophecy... it speaks of a chosen one...',
    choices: [
      { text: 'Am I the chosen one?', next: 'chosen' },
      { text: 'What must the chosen one do?', next: 'quest' },
      { text: '[Back]', next: 'root' }
    ]
  },
  
  // Auto-track conversation state
  tracking: {
    remember: 'all',  // Remember all visited nodes
    showVisited: true,  // Mark visited choices
    unlockBased: true  // New choices appear based on knowledge
  }
})
```

### Accessibility and Mobile Support

```typescript
// Touch-friendly mode
.touchMode({
  // Auto-detect touch devices
  autoEnable: true,
  
  // Show common commands as buttons
  quickActions: [
    { icon: '👁', command: 'look' },
    { icon: '🎒', command: 'inventory' },
    { icon: '⬆️', command: 'north' },
    { icon: '⬇️', command: 'south' },
    { icon: '⬅️', command: 'west' },
    { icon: '➡️', command: 'east' }
  ],
  
  // Object interaction shows choices
  onTap: (object) => {
    showChoices([
      `Examine ${object}`,
      `Take ${object}`,
      `Use ${object}`
    ]);
  }
})

// Screen reader support
.accessibility({
  // Announce available choices
  announceChoices: true,
  
  // Navigation by number/letter
  choiceKeys: 'numbers',  // Press 1-9 for choices
  
  // Help command always shows choices
  'help': () => showAvailableChoices()
})
```

### Parser-Choice Integration

```typescript
// Seamless switching
.scene('tavern')
  .onEnter(({ player, scene }) => {
    // Start with parser
    scene.mode('parser');
    
    // Switch to choices for conversation
    scene.on('talk to bartender', () => {
      scene.mode('choice');
      scene.showDialogue('bartender-main');
    });
    
    // Back to parser after conversation
    scene.on('dialogue-end', () => {
      scene.mode('parser');
    });
  })

// Choice shortcuts in parser
.parserShortcuts({
  // Numbers select choices when visible
  '1': () => selectChoice(0),
  '2': () => selectChoice(1),
  '3': () => selectChoice(2),
  
  // 'choices' command shows available
  'choices': () => showAvailableChoices(),
  'c': () => showAvailableChoices()
})

// Progressive disclosure
.tutorialMode({
  // New players see more choices
  firstScene: {
    showAllActions: true,
    explainParser: true,
    choicesFor: ['movement', 'objects', 'npcs']
  },
  
  // Gradually reduce choices
  fadeToParser: {
    after: 10,  // commands
    keepChoicesFor: ['conversations', 'combat']
  }
})
```

## Consequences

### Positive
- **Accessibility**: Easier for new players and touch devices
- **Natural Conversations**: Dialogue feels more natural
- **Clear Options**: Players know what's possible
- **Hybrid Flexibility**: Use best interface for each situation
- **Mobile Friendly**: Works well on phones/tablets
- **Reduced Friction**: Less guess-the-verb frustration
- **Progressive Learning**: Can teach parser gradually

### Negative
- **Complexity**: Two interaction modes to design and test
- **Player Confusion**: Switching modes might confuse
- **Limited Exploration**: Choices can reduce discovery
- **Design Overhead**: Must decide when to use which mode
- **Parser Purists**: Some players prefer parser-only

### Neutral
- Changes game feel from exploration to selection
- May attract different audience
- Requires UI design consideration
- Influences puzzle design

## Implementation Notes

### Choice Manager
```typescript
class ChoiceManager {
  private currentChoices: Choice[] = [];
  private mode: 'parser' | 'choice' | 'hybrid' = 'parser';
  
  presentChoices(choices: Choice[], context: ChoiceContext): void {
    // Filter available choices
    const available = choices.filter(c => 
      this.checkRequirements(c.requires, context)
    );
    
    // Order by relevance
    const ordered = this.orderChoices(available, context);
    
    // Present to player
    this.renderer.showChoices(ordered, {
      numbered: context.prefersNumbers,
      highlighted: context.lastChoice
    });
    
    this.currentChoices = ordered;
  }
  
  handleInput(input: string): boolean {
    // Check if input matches a choice
    const choiceIndex = this.parseChoiceSelection(input);
    
    if (choiceIndex !== null && this.currentChoices[choiceIndex]) {
      this.executeChoice(this.currentChoices[choiceIndex]);
      return true;
    }
    
    // Fall back to parser
    return false;
  }
}
```

### Integration with Parser
```typescript
class HybridParser extends Parser {
  private choiceManager: ChoiceManager;
  
  parse(input: string): ParsedCommand | ChoiceResult {
    // Try choices first if active
    if (this.choiceManager.hasActiveChoices()) {
      const choiceResult = this.choiceManager.handleInput(input);
      if (choiceResult) return choiceResult;
    }
    
    // Fall back to standard parsing
    return super.parse(input);
  }
  
  enhanceWithChoices(command: ParsedCommand): EnhancedCommand {
    // Add available choices as hints
    const choices = this.getContextualChoices(command);
    
    return {
      ...command,
      availableChoices: choices,
      showChoicesHint: choices.length > 0
    };
  }
}
```

## Examples

### Adventure Game with Dialogue
```typescript
Game.create('fantasy-adventure')
  .defaultMode('parser')
  .useChoicesFor(['dialogue', 'combat', 'major-decisions'])
  
  .npc('wizard')
    .dialogue({
      system: 'tree',
      entryPoint: 'greeting',
      nodes: {
        greeting: {
          text: 'Ah, young adventurer! How may I help you?',
          choices: [
            { text: 'Teach me magic', next: 'magic-lesson' },
            { text: 'Tell me about the dragon', next: 'dragon-info' },
            { text: 'Goodbye', exit: true }
          ]
        }
      }
    });
```

### Mystery Game with Investigation
```typescript
Game.create('noir-mystery')
  .scene('crime-scene')
    .investigation({
      // Parser for exploration
      examineMode: 'parser',
      
      // Choices for questioning
      interrogationMode: 'choice',
      
      // Hybrid for deduction
      deductionMode: {
        showEvidence: 'choice',
        connectEvidence: 'parser'
      }
    });
```

### Tutorial Integration
```typescript
Game.create('parser-teaching')
  .tutorial({
    phase1: {
      text: 'You can go places by clicking:',
      choices: ['Go North', 'Go South'],
      teaches: 'movement'
    },
    phase2: {
      text: 'Or type compass directions:',
      parser: true,
      hints: 'Try typing NORTH or just N'
    }
  });
```

## Related Patterns
- Feature-008: Narrative Flow (choices for story beats)
- Feature-002: Quest Framework (choice-based objectives)
- Feature-007: Hub-and-Bottleneck (choices at bottlenecks)

## Edge Cases
- Player types choice text instead of number
- Choices overflow screen space
- Dynamic choices change while displayed
- Parser command conflicts with choice
- Save/load during choice presentation

## Future Considerations
- Visual choice presentation (icons, graphics)
- Timed choices for pressure
- Partial choice revelation
- Community choice templates
- Analytics on choice usage

## References
- Twine (choice-based authoring)
- Ink by Inkle (hybrid approach)
- ChoiceScript (structured choices)
- Fallen London (quality-based choices)
- 80 Days (narrative choices)
- Sorcery! series (hybrid parser/choice)
