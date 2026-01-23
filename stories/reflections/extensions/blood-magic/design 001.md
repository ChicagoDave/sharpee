# Blood Magic Extension Design

## Overview
The Blood Magic extension provides a systemic magic system based on hereditary blood powers. Each blood type grants specific abilities that follow consistent rules.

## Blood Types

### Blood of the Silver
**Power**: Mirror portal creation and travel
**Rules**:
- Can touch any reflective surface to sense other mirrors
- Can connect two mirrors to create a portal between them
- Can step through connected mirrors to travel instantly
- Leaves "signatures" on mirrors that other Silver carriers can detect
- Connected mirrors maintain their link until broken
- Breaking a mirror severs all its connections
- Size does not matter: even small mirrors can be used to travel

### Blood of the Moon  
**Power**: Invisibility and concealment
**Rules**:
- Can become invisible at will
- Can extend invisibility to touched objects/people
- Moonlight enhances the power (longer duration)
- Darkness makes invisibility more effective

### Blood of the Earth
**Power**: Preservation and resurrection
**Rules**:

Only the young girl's mother has it and she never uses it in the story.

### Blood of the Stars (rare, usually in the blind/deaf)
**Power**: Foresight and knowledge
**Rules**:
- Can glimpse the lives of other blood magic wielders

Only an NPC will have this. An old woman in a rocking chair in the brothel in Paris. No one knows why she smiles and cries, but she's the reveal at the end of the story. She's been watching everyone.

## Implementation Architecture

### Actions

**TOUCH MIRROR** - Sense other mirrors and connections
**CONNECT MIRROR TO [target]** - Establish portal connection  
**ENTER MIRROR** - Travel through portal
**BREAK MIRROR** - Destroy mirror and connections
**LOOK THROUGH MIRROR** - see through connected mirror
**LISTEN TO MIRROR** - listen to location of connected mirror

(these may need discussion for on/off triggers)
**TOUCH MOON** - Helps focus on moon to become invisible
**FORGET MOON** - Become visible

### Events

```typescript
// Mirror events
'blood.mirror.touched' - Carrier touches a mirror
'blood.mirror.connected' - Two mirrors are linked
'blood.mirror.entered' - Entity enters a portal
'blood.mirror.exited' - Entity exits a portal  
'blood.mirror.broken' - Mirror is destroyed

// Power-specific events
'blood.moon.invisible' - Entity becomes invisible
'blood.moon.visible' - Invisibility ends
```

### Behaviors

## Integration Points

### With Core Systems

**Parser**: New verbs for blood-specific actions
**Scope**: Invisibility affects what can be perceived
**Events**: Rich event system for story hooks
**World Model**: New traits for entities

### With Stories

Stories using blood magic should:

## Testing Strategy

1. **Unit tests** for each blood type's rules
2. **Integration tests** for mirror portal network
3. **Story tests** using Reflections as example
4. **Balance tests** for exhaustion/recovery rates

## Future Extensions

- Blood mixing (carriers with multiple types)
- Ancient blood (prehistoric power types)

