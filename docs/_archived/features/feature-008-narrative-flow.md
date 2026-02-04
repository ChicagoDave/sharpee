# Feature-008: Narrative Flow Architecture

## Status
Proposed

## Context
Some Interactive Fiction prioritizes emotional impact and narrative experience over puzzle-solving. Games like "Photopia," "Rameses," and "The Baron" use interactivity not as challenges to overcome but as a way to control pacing, create complicity, and enhance emotional engagement. The player's actions drive the narrative forward rather than solving problems. This style requires different architectural support than puzzle-based IF.

## Problem
- Traditional IF frameworks assume puzzle-based gameplay
- Inventory management and object manipulation may be irrelevant
- Standard hint systems and scoring don't apply
- Need to guide players without making them feel railroaded
- Emotional pacing is more important than logical challenge
- Player expectations from commands may not match narrative needs
- Traditional "you can't do that" responses break immersion
- Difficult to create meaningful choices that aren't puzzles
- Standard world model may be overkill for narrative needs

## Solution
Implement a narrative flow system that prioritizes story beats, emotional pacing, and meaningful interaction without traditional puzzles:

```typescript
// Define a narrative-focused game
export const NarrativeGame = Narrative.create('photopia-like')
  .configure({
    style: 'literary',
    inventory: false,  // No inventory management
    score: false,      // No points
    compass: false,    // No compass directions
    examineAll: true,  // Everything has description
    autoProgress: true // Some scenes progress automatically
  })
  
  .scene('opening', {
    mood: 'mysterious',
    viewpoint: 'second-person',
    location: 'undefined-space',
    
    beats: [
      {
        id: 'awakening',
        text: 'You're not sure where you are. Colors shift and blend...',
        pause: 3000,  // Milliseconds before accepting input
        
        prompts: [
          { input: ['look', 'where'], advance: 'orientation' },
          { input: ['wait', 'z'], advance: 'patience' },
          { input: '*', advance: 'confusion' }  // Any other input
        ]
      },
      
      {
        id: 'orientation',
        text: 'The colors resolve into a room. A child\'s room.',
        
        // Emotional choices rather than puzzle solutions
        choices: {
          'examine toys': {
            text: 'The toys are well-loved, carefully arranged...',
            memory: 'childhood-care',
            advance: 'revelation'
          },
          'look at window': {
            text: 'Outside is nothing but white light...',
            memory: 'isolation',
            advance: 'revelation'
          }
        }
      }
    ],
    
    // Scene completes when all key beats are experienced
    completion: {
      required: ['revelation'],
      transition: 'flashback-childhood'
    }
  })
  
  .scene('flashback-childhood', {
    mood: 'nostalgic',
    viewpoint: 'third-person',  // Shift perspective
    character: 'young-alley',
    tint: 'sepia',  // Visual/textual atmosphere
    
    // Linear but interactive narrative
    sequence: [
      {
        narrative: 'Alley runs through the field, chasing fireflies.',
        interaction: {
          'catch firefly': 'Her hands close on empty air, but she laughs.',
          'run': 'She runs faster, grass whipping at her legs.',
          'stop': 'She pauses, breathing hard, watching the lights dance.'
        },
        // All paths lead forward, but create different emotional textures
        allAdvance: true
      }
    ]
  })
  
  .parallel('mary-and-alley', {
    // Scenes that interweave
    scenes: ['mary-waiting', 'alley-journey'],
    switching: {
      trigger: 'beat-complete',
      effect: 'fade-transition',
      showConnection: true  // Make parallels clear
    }
  });
```

### Narrative Interaction Patterns

```typescript
// Complicity Creation - player must type specific things
.beat('difficult-moment', {
  text: 'You hold the knife. You know what you have to do.',
  
  required: {
    input: ['cut rope', 'use knife'],
    reject: [
      { input: 'drop knife', response: 'Your hand won\'t let go.' },
      { input: 'wait', response: 'Time stretches, but nothing changes.' }
    ],
    hint: {
      after: 3,  // After 3 attempts
      text: 'The rope is all that holds the weight.'
    }
  },
  
  onComplete: ({ player }) => {
    player.setEmotionalState('complicit');
  }
})

// Exploration Without Puzzles
.location('bedroom', {
  description: 'Her bedroom, exactly as she left it.',
  
  details: {
    // Rich descriptions for atmosphere, not puzzle clues
    'bed': 'The quilted cover still shows the impression of her body.',
    'desk': 'Homework half-finished. A life interrupted.',
    'window': 'Rain traces patterns on the glass.',
    
    // Emotional discoveries, not inventory items
    'photo': {
      text: 'A photo of two girls laughing.',
      emotion: 'bittersweet',
      memory: 'summer-camp'
    }
  },
  
  // No objects to take, but everything can be examined
  interactions: 'examine-only'
})

// Meaningful Choices Without Puzzles
.choice('hospital-vigil', {
  text: 'The doctor is speaking, but you can barely hear...',
  
  options: {
    'ask about chances': {
      text: 'The numbers mean nothing. Everything. Nothing.',
      flag: 'sought-hope'
    },
    'stay silent': {
      text: 'Words are pointless. You hold her hand tighter.',
      flag: 'chose-presence'
    },
    'demand action': {
      text: 'Your voice cracks. The doctor\'s eyes are kind.',
      flag: 'fought-fate'
    }
  },
  
  // Choices affect narrative texture, not outcomes
  consequence: 'emotional-shading'
})
```

### Pacing and Flow Control

```typescript
// Automatic progression for dramatic effect
.sequence('crash-sequence', {
  beats: [
    { text: 'The car spins', duration: 1000 },
    { text: 'Glass explodes inward', duration: 1500 },
    { text: 'Time stops', duration: 3000 },
    { text: 'And then you\'re somewhere else entirely', duration: 2000 }
  ],
  
  // Player can't interrupt
  interruptible: false,
  
  // But can control replay pacing
  onReplay: 'player-controlled'
})

// Gated revelation
.revelation('understanding', {
  pieces: [
    { id: 'alice-story', scene: 'playground' },
    { id: 'mary-story', scene: 'bedroom' },
    { id: 'rob-story', scene: 'car' }
  ],
  
  // When all pieces experienced
  onComplete: {
    text: 'Now you understand. You were the light.',
    achievement: 'illumination'
  }
})
```

### Adaptive Command Interpretation

```typescript
// Context-sensitive command understanding
.commandContext('emotional-scene', {
  // Remap standard commands to narrative actions
  mapping: {
    'inventory': 'You carry nothing but memories.',
    'score': 'This isn\'t that kind of story.',
    'save': 'Some moments can\'t be saved.',
    'undo': 'You can\'t change what happened.'
  },
  
  // Gentle guidance instead of parser errors
  unknown: {
    responses: [
      'That doesn\'t seem important right now.',
      'You\'re drawn back to the moment.',
      'Try focusing on what\'s here.'
    ],
    
    // After multiple attempts, be more direct
    persistent: 'Perhaps just look, or wait.'
  }
})
```

## Consequences

### Positive
- **Emotional Focus**: Architecture supports emotional pacing
- **Reduced Friction**: No puzzle frustration to break narrative flow
- **Literary Tools**: Perspective shifts, parallel narratives, etc.
- **Guided Experience**: Players stay on narrative path naturally
- **Meaningful Interaction**: Every action enhances story
- **Accessibility**: No puzzle-solving skills required
- **Replayability**: Different emotional textures on replay

### Negative
- **Limited Agency**: Players have less freedom
- **Genre Expectations**: Some players expect puzzles
- **Replayability Concerns**: Story-focused games may have less replay value
- **Design Challenge**: Harder to create meaningful interaction

### Neutral
- Different audience than puzzle IF
- Requires strong writing to succeed
- May blur line between IF and hypertext fiction

## Implementation Notes

### Scene Management
```typescript
class NarrativeSceneManager {
  private currentScene: Scene;
  private history: SceneHistory;
  private emotionalState: EmotionalState;
  
  advanceScene(trigger: Trigger): void {
    const nextBeat = this.currentScene.getNextBeat(trigger);
    
    if (nextBeat.requiresPause) {
      this.pauseInput(nextBeat.pauseDuration);
    }
    
    this.renderBeat(nextBeat);
    this.updateEmotionalState(nextBeat.emotion);
    
    if (this.currentScene.isComplete()) {
      this.transitionToNextScene();
    }
  }
  
  handleInput(input: string): void {
    // More forgiving parser for narrative games
    const normalized = this.fuzzyMatch(input);
    const response = this.currentScene.getResponse(normalized);
    
    // Always advance narrative, even on "wrong" input
    this.advanceScene({
      input: normalized,
      response: response || this.getGenericResponse()
    });
  }
}
```

### Emotional State Tracking
```typescript
interface EmotionalState {
  current: Emotion;
  history: Emotion[];
  
  // Affects text rendering
  textFilter: (text: string) => string;
  
  // Affects available choices
  choiceFilter: (choices: Choice[]) => Choice[];
}

// Colors narrative based on emotional state
const renderWithEmotion = (text: string, emotion: Emotion): string => {
  switch(emotion) {
    case 'grief':
      return addPhrasings(text, ['heavily', 'slowly', 'dimly']);
    case 'joy':
      return addPhrasings(text, ['brightly', 'quickly', 'warmly']);
    case 'fear':
      return addPhrasings(text, ['suddenly', 'sharply', 'coldly']);
  }
};
```

## Examples

### Memory-Based Narrative
```typescript
Narrative.create('memory-game')
  .structure('fragmented')
  .scenes({
    'present-day': { tense: 'present', mood: 'melancholic' },
    'childhood': { tense: 'past', mood: 'innocent' },
    'revelation': { tense: 'present', mood: 'transcendent' }
  })
  .flow({
    type: 'associative',  // Memories trigger memories
    connections: {
      'swing-set': ['playground', 'accident'],
      'hospital': ['injury', 'birth', 'death'],
      'light': ['sun', 'lamp', 'understanding']
    }
  });
```

### Parallel Perspectives
```typescript
Narrative.create('multiple-viewpoints')
  .characters(['sarah', 'david', 'narrator'])
  .structure({
    type: 'interwoven',
    switching: 'player-triggered',
    command: 'switch to [character]'
  })
  .constraint({
    // Each character sees same events differently
    sharedEvents: ['argument', 'departure', 'return'],
    uniquePerspectives: true
  });
```

### Emotional Journey
```typescript
Narrative.create('stages-of-grief')
  .stages([
    { name: 'denial', scenes: ['morning', 'phone-call'] },
    { name: 'anger', scenes: ['empty-house', 'thrown-glass'] },
    { name: 'bargaining', scenes: ['prayer', 'what-if'] },
    { name: 'depression', scenes: ['bed', 'silence'] },
    { name: 'acceptance', scenes: ['sunrise', 'first-step'] }
  ])
  .progression({
    type: 'emotional-threshold',
    allowBacksliding: true,
    minimumEngagement: 3  // Beats per stage
  });
```

## Related Patterns
- Feature-002: Quest Framework (could be adapted for story beats)
- Feature-003: Environmental Systems (mood and atmosphere)
- Feature-006: Event Communication (emotional state changes)
- Feature-007: Hub-and-Bottleneck (adapted for narrative pacing)

## Edge Cases
- Player tries to "break" the narrative with silly commands
- Speedrunners trying to skip emotional beats
- Players expecting traditional IF puzzles
- Replay when emotional impact is diminished
- Accessibility for players who need more time

## Future Considerations
- Procedural narrative generation
- AI-assisted emotional pacing
- Multiplayer narrative experiences
- Integration with visual/audio elements
- Community tools for narrative IF creation

## References
- Photopia by Adam Cadre
- Rameses by Stephen Bond
- The Baron by Victor Gijsbers
- What Remains of Edith Finch (video game)
- Kentucky Route Zero (narrative pacing)
- Twine community practices
