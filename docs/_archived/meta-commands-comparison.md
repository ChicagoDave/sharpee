# Meta-Commands: Sharpee vs TADS vs Inform 7

## Terminology Comparison

| System | Term | Implementation |
|--------|------|----------------|
| **TADS 3** | System Actions / Meta-commands | `SystemAction` class or `actionTime = 0` |
| **Inform 7** | Out of World Actions | `is an action out of world` |
| **Sharpee** | Meta-commands (proposed) | `isMeta: true` property |

## Implementation Approaches

### TADS 3
```tads3
// Option 1: SystemAction (for SAVE, RESTORE, etc.)
DefineSystemAction(Save)
    execSystemAction() { 
        // save implementation
    }
;

// Option 2: Regular action with actionTime = 0
DefineLiteralAction(Score)
    execAction() { 
        // show score
    }
    actionTime = 0  // Prevents turn counting
;
```

**Key Features:**
- Two distinct mechanisms (SystemAction vs actionTime)
- Fine-grained control over timing
- Explicit NPC restriction checking
- Can create hybrid actions that conditionally consume time

### Inform 7
```inform7
Switching the transcript on is an action out of world.
Carry out switching the transcript on:
    say "Transcript recording begun."
```

**Key Features:**
- Single, declarative approach
- Automatic exemption from Before/Instead/After rules
- Built-in player-only restriction (NPCs cannot execute)
- Clean separation from world logic

### Sharpee (Proposed)
```typescript
export class ParserEventsAction implements Action {
  id = 'author.parser_events';
  verbs = ['parser'];
  isMeta = true;  // Marks as meta-command
  
  execute(context: ActionContext): SemanticEvent[] {
    // implementation
  }
}
```

**Key Features:**
- Property-based identification
- Actions self-declare as meta
- Engine checks flag for special handling

## Turn Counting Mechanisms

| System | How Turn Counting is Prevented |
|--------|--------------------------------|
| **TADS 3** | Check `actionTime` property; if 0, skip turn increment |
| **Inform 7** | Out of world actions automatically skip turn counting |
| **Sharpee** | Check `isMeta` flag; if true, skip `updateContext()` |

## NPC/Daemon Behavior

### TADS 3
- Meta-commands explicitly check and reject NPC execution
- Daemons continue running regardless
- Turn-based events still fire

### Inform 7
- Out of world actions are player-only by design
- "Every Turn" rules continue for NPCs
- Clean separation between world and meta levels

### Sharpee (Proposed)
- Meta-commands would skip NPC/daemon triggers
- Need to implement NPC update skipping in engine
- Platform layer would check meta flag

## Standard Meta-Commands

### Common Across All Systems
- SAVE / RESTORE
- QUIT / RESTART
- SCORE
- UNDO
- VERSION
- TRANSCRIPT ON/OFF

### System-Specific
- **TADS**: OOPS, HINTS, debugging commands
- **Inform**: Preference commands, custom status
- **Sharpee**: PARSER EVENTS, VALIDATION EVENTS, SYSTEM EVENTS

## Design Philosophy Comparison

### TADS 3: Control & Flexibility
- Provides multiple mechanisms
- Allows fine-grained control
- More explicit/verbose
- Developer chooses appropriate mechanism

### Inform 7: Simplicity & Safety
- Single, clear mechanism
- Automatic safety guarantees
- Less configuration needed
- Harder to make mistakes

### Sharpee: Middle Ground
- Single mechanism (property flag)
- Simple but explicit
- Flexible for future extensions
- Consistent with event-driven architecture

## Recommendations for Sharpee

Based on this comparison, Sharpee should:

1. **Adopt Inform's Simplicity**: Use a single, clear mechanism (`isMeta` flag)

2. **Learn from TADS's Explicitness**: Make meta-command behavior explicit in the action definition

3. **Add Safety Features**:
   - Automatically exclude from command history
   - Skip turn increment
   - Prevent NPC execution (when NPCs are implemented)

4. **Consider Future Extensions**:
   - Could add `actionTime` property later for more control
   - Could support conditional meta behavior

5. **Documentation Standards**:
   - Clearly document which commands are meta
   - Explain implications for game state
   - Provide examples like TADS and Inform do

## Implementation Priority

1. **Phase 1**: Basic `isMeta` flag support (current proposal)
2. **Phase 2**: NPC/daemon skipping (when those systems exist)
3. **Phase 3**: Advanced features (conditional meta, action timing)
4. **Phase 4**: Developer tools (meta-command discovery, help system)

## Conclusion

Sharpee's proposed `isMeta` flag approach aligns well with established IF systems while maintaining simplicity. It's more like Inform's declarative approach but with TADS's explicit property setting. This positions Sharpee as a modern, author-friendly system that learns from decades of IF development experience.