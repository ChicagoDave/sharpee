# Talking Action Design

## Overview
The talking action initiates conversation with NPCs, handling greetings, personality types, and conversation states. Unlike many actions, this one calls validate from execute to avoid duplication, though this is non-standard.

## Required Messages
- `no_target` - No one to talk to
- `not_visible` - Target not visible
- `too_far` - Target in different location
- `not_actor` - Target cannot talk
- `self` - Cannot talk to self
- `not_available` - NPC unavailable
- `talked` - Basic talked message
- `no_response` - NPC doesn't respond
- `acknowledges` - NPC acknowledges
- `first_meeting` - First conversation
- `greets_back` - Returns greeting
- `formal_greeting` - Formal personality
- `casual_greeting` - Casual personality
- `greets_again` - Subsequent meeting
- `remembers_you` - NPC remembers player
- `friendly_greeting` - Friendly relationship
- `has_topics` - Topics available
- `nothing_to_say` - No topics

## Validation Logic

### 1. Basic Checks
- Target must exist (`no_target`)
- Must be visible (`not_visible`)
- Same location required (`too_far`)

### 2. Actor Validation
- Must have ACTOR trait (`not_actor`)
- Cannot be self (`self`)

### 3. Availability Check
Complex property checking:
- Checks `targetActor.conversation`
- Falls back to `ActorBehavior.getCustomProperty()`
- Checks `isAvailable` flag (`not_available`)

## Execution Flow

### UNIQUE PATTERN: Validate from Execute
**Calls `this.validate()` at start of execute:**
- Avoids logic duplication
- Non-standard but effective
- Returns error if validation fails

### 1. Conversation State Analysis
Checks conversation object for:
- `state` - Current conversation state
- `topics` - Available discussion topics
- `hasGreeted` - First meeting flag
- `personality` - Formal/casual
- `relationship` - Friendly/neutral
- `remembersPlayer` - Recognition flag

### 2. Message Selection Logic

#### First Meeting
- Formal personality → `formal_greeting`
- Casual personality → `casual_greeting`
- Default → `first_meeting`

#### Subsequent Meetings
- Friendly relationship → `friendly_greeting`
- Remembers player → `remembers_you`
- Default → `greets_again`

#### Topic Handling
Special greetings override topic messages
Otherwise:
- Has topics → `has_topics`
- Explicitly no topics → `nothing_to_say`
- No conversation system → `no_response`

## Data Structures

### TalkedEventData
```typescript
interface TalkedEventData {
  target: EntityId;
  targetName: string;
  conversationState?: string;
  hasTopics?: boolean;
  firstMeeting?: boolean;
}
```

### Conversation Object
```typescript
interface Conversation {
  state?: string;
  topics?: Record<string, any>;
  hasGreeted?: boolean;
  personality?: 'formal' | 'casual';
  relationship?: 'friendly' | 'neutral';
  remembersPlayer?: boolean;
  isAvailable?: boolean;
}
```

## Traits and Behaviors

### Required Traits
- `ACTOR` - Target must be actor

### Behaviors Used
- `ActorBehavior`:
  - `getCustomProperty()` - Fallback for conversation data

## Message Priority System

### Special Greetings (Highest Priority)
1. `formal_greeting`
2. `casual_greeting`
3. `first_meeting`
4. `friendly_greeting`
5. `remembers_you`

These override topic-based messages

## Current Implementation Notes

### Strengths
1. **No duplication**: Calls validate from execute
2. **Rich conversation**: Personality and relationship
3. **Fallback system**: Property checking with fallback
4. **Topic awareness**: Handles available topics
5. **State tracking**: Conversation progression

### Design Issues
1. **Non-standard pattern**: Validate from execute unusual
2. **No three-phase**: Missing report phase
3. **Complex property access**: Two-path checking
4. **Limited states**: Basic conversation model

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**
2. **Standardize property access**
3. **Create ConversationBehavior**

### Feature Enhancements
1. **Dialog trees**: Branching conversations
2. **Mood system**: NPC emotional states
3. **Memory system**: Remember past interactions
4. **Topic discovery**: Learn new topics
5. **Interruption handling**: Dynamic responses

## Usage Examples

### First Meeting
```
> talk to shopkeeper
"Good day! Welcome to my shop," says the shopkeeper formally.
```

### Friendly NPC
```
> talk to friend
"Hey there! Good to see you again!" your friend says warmly.
```

### No Response
```
> talk to guard
The guard doesn't respond.
```

### Error Cases
```
> talk to rock
You can't talk to that.

> talk to distant npc
They're too far away.
```