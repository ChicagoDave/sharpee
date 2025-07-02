# Sharpee Platform Implementation Guide - Jack Toresal

## Platform Migration Advantages

### From Inform 7 (2010) to Sharpee (2025)
Moving from traditional parser IF to modern dynamic IF platform

### What Sharpee Enables:
1. **Dynamic UI** - No more command line parsing
2. **Visual State Tracking** - See trust levels, mood indicators
3. **Modern Save System** - Cloud saves, chapter select
4. **Responsive Design** - Mobile-friendly gameplay
5. **Rich Media** - Character portraits, mood indicators, audio cues
6. **Analytics** - Track player choices for balancing

## Sharpee-Specific Features to Leverage

### 1. Conversation Engine
**Original Inform 7:**
```
Instead of asking Bobby about "baron":
    say "Bobby looks nervous. 'I don't know nothing about that.'"
```

**Sharpee Implementation:**
- Visual emotion wheel for tone selection
- Bobby's portrait shows nervousness
- Trust meter visible during conversation
- Time pressure indicator if guards approaching
- Momentum glow effects for successful exchanges

### 2. Identity State Management
**Sharpee's State System Perfect For:**
```yaml
PlayerState:
  pronouns:
    public: "he/him"
    private: "she/her"
    internal: "she/her"
  currentSpace: "public" # or "private"
  identityStress: 0-100
  revelations:
    noble: []      # who knows
    gender: []     # who knows
    spiritTouched: [] # who knows
```

### 3. Dynamic Choice Presentation
**Instead of Inform 7's:**
```
1. Hide in the alley
2. Blend with crowd  
3. Confront mercenaries
```

**Sharpee Shows:**
- Highlighted options based on skills
- Grayed out options with requirements shown
- Time bar depleting for urgent choices
- Consequence hints on hover
- Approach tags [Street] [Noble] [Spirit]

### 4. Visual Novel Elements
**Character Portraits:**
- Bobby: Changes expression based on trust
- Jack: Outfit changes based on disguise
- Baron: Sinister smile during theological trap
- NPCs: Emotional states visible

**Scene Composition:**
- Background art for major locations
- Character positioning shows relationships
- Lighting changes for mood
- Weather effects for atmosphere

### 5. Progress Tracking
**Sharpee's Built-in Systems:**
- Relationship meters (not just numbers)
- Identity revelation network graph
- Choice history visualization
- Multiple pathway tracking
- Achievement system

## Technical Implementation

### 1. Scene Structure
```yaml
Scene: MarketChase
  background: "grubbers_market.jpg"
  music: "tension_theme.mp3"
  timeLimit: 30 # seconds for initial choice
  npcs:
    - mercenary1:
        position: left
        mood: aggressive
    - mercenary2:
        position: right
        mood: searching
    - teisha:
        position: center_background
        mood: worried
```

### 2. Conversation Format
```yaml
Conversation: BobbyFirstMeeting
  participant: Bobby
  location: dark_alley
  trustRequired: 0
  branches:
    greeting:
      bobby: "Hey there, you okay? Those guys were—"
      choices:
        suspicious:
          text: "Why do you care?"
          tone: aggressive
          effect: trust-1
        grateful:
          text: "Thanks for the help"
          tone: friendly
          effect: trust+1
        deflect:
          text: "I'm fine"
          tone: neutral
          effect: trust+0
```

### 3. Identity Revelation System
```yaml
Revelation: GenderIdentity
  target: Bobby
  trustCost: 2
  conditions:
    - location: private
    - relationship: friend
  success:
    - bobby.knows_gender = true
    - pronouns.with_bobby = "she/her"
    - unlock: deeper_conversations
  failure:
    - conversation.end
    - trust-1
```

### 4. Puzzle Implementation
```yaml
Puzzle: EstatInfiltration
  solutions:
    social:
      requirements: [noble_knowledge, dress]
      time: 20min
      consequence: seen_by_many
    stealth:
      requirements: [street_knowledge]
      time: 45min
      consequence: physically_taxing
    magical:
      requirements: [spirit_touched_revealed]
      time: 10min
      consequence: magical_signature
```

## Sharpee-Specific UI/UX

### 1. HUD Elements
- Identity stress meter (builds in public)
- Current pronouns indicator
- Trust levels with key NPCs
- Time pressure for urgent scenes
- Approach preference tracker

### 2. Conversation Interface
- Emotion wheel (inner ring)
- Action types (outer ring)
- NPC portrait with mood
- Momentum indicator
- Trust meter

### 3. Choice Presentation
- Approach tags visible
- Requirements shown
- Time limits displayed
- Consequence hints
- Lock indicators

### 4. Journal System
- Tracks identity revelations
- Shows relationship states
- Records major choices
- Displays active quests
- Contains lore/backstory

## Platform-Specific Optimizations

### 1. Mobile Considerations
- Touch-friendly emotion wheel
- Swipe gestures for choices
- Portrait mode optimization
- Quick save slots
- Reduced UI in conversations

### 2. Accessibility Features
- Pronoun stress toggle
- Conversation speed settings
- High contrast mode
- Screen reader support
- Content warnings

### 3. Analytics Integration
- Track choice distributions
- Identity revelation patterns
- Puzzle solution preferences
- Conversation success rates
- Player drop-off points

## Migration Checklist

### From Inform 7 to Sharpee:
1. [ ] Extract all room descriptions
2. [ ] Convert object interactions to visual choices
3. [ ] Map conversation trees to Sharpee format
4. [ ] Create character portrait requirements
5. [ ] Design UI layouts for each scene type
6. [ ] Implement state tracking systems
7. [ ] Add visual feedback systems
8. [ ] Create save point structure
9. [ ] Design achievement criteria
10. [ ] Build analytics hooks

## Sharpee Advantages for This Story

### 1. Identity Expression
- Visual representation of code-switching
- Stress mechanics visible to player
- Pronoun management automated
- Safe space indicators

### 2. Relationship Building
- See trust levels change in real-time
- Visual feedback for conversation success
- Character expressions match emotions
- Network visualization of who knows what

### 3. Dynamic Puzzles
- Multiple solutions presented clearly
- Requirements visible upfront
- Consequences telegraphed
- No parser guessing

### 4. Emotional Storytelling
- Music changes with mood
- Visual effects for stress/relief
- Character portraits show feelings
- Environmental storytelling

## Testing Considerations

### Sharpee-Specific Tests:
1. Pronoun switching automation
2. Trust calculation accuracy
3. Choice locking logic
4. Save state integrity
5. Mobile responsiveness
6. Analytics data collection
7. Achievement triggering
8. Audio synchronization

This migration to Sharpee will transform a 2010 text adventure into a modern, accessible, emotionally resonant experience that preserves the original's heart while adding layers of meaning through visual and mechanical storytelling.
