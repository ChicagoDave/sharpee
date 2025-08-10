# Meta-Commands Implementation Assessment

## Current System Analysis

### Turn Management
- **Location**: `packages/engine/src/game-engine.ts:726`
- **Mechanism**: `context.currentTurn++` happens in `updateContext()` after every successful command
- **Trigger**: Called from `executeTurn()` at line 359
- **No current meta-command detection**: All successful commands increment the turn counter

### Command History
- **Location**: `updateCommandHistory()` at line 741
- **Non-repeatable actions**: Already excludes AGAIN, SAVING, RESTORING, etc. from history
- **This shows awareness of special commands but not full meta-command handling**

### NPC/Daemon Triggers
- **Not found in current codebase**: No explicit daemon or NPC update system
- **Turn events**: The system emits `'turn:complete'` events that could trigger NPCs
- **Would need to be implemented in story/game-specific code**

## Meta-Command Requirements

### Definition
Meta-commands are author/debug commands that:
1. Don't advance game time (no turn increment)
2. Don't trigger NPCs or daemons
3. Don't get recorded in command history
4. Are for debugging/authoring purposes only

### Examples
- `PARSER EVENTS ON/OFF` - Toggle parser debug output
- `VALIDATION EVENTS ON/OFF` - Toggle validation debug output  
- `SYSTEM EVENTS ON/OFF` - Toggle all system debug output
- `TRANSCRIPT ON/OFF` - Toggle transcript recording
- `VERBOSE/BRIEF` - Change output mode
- `SCORE` - Display current score

## Implementation Options

### Option 1: Action-Level Metadata (Recommended)
Add a `isMeta` property to the `Action` interface:

```typescript
interface Action {
  id: string;
  // ... existing properties
  isMeta?: boolean;  // Marks this as a meta-command
}
```

**Pros:**
- Simple and declarative
- Each action self-identifies as meta
- Easy to check in engine

**Cons:**
- Requires updating Action interface
- All meta-commands must set this flag

### Option 2: Event-Based Signaling
Meta-commands emit a special event type:

```typescript
execute(context): SemanticEvent[] {
  return [
    context.event('meta.command', { ... }),
    // other events
  ];
}
```

**Pros:**
- No interface changes needed
- Flexible event-based approach

**Cons:**
- Requires engine to understand meta events
- Less explicit than a property

### Option 3: Registry-Based
Maintain a registry of meta-command IDs:

```typescript
const META_COMMANDS = new Set([
  'author.parser_events',
  'author.validation_events',
  'author.system_events',
  // ...
]);
```

**Pros:**
- Centralized list
- No action changes needed

**Cons:**
- Maintenance burden
- Not co-located with action definition

## Recommended Implementation Plan

### Phase 1: Update Action Interface
1. Add `isMeta?: boolean` to `Action` interface in `enhanced-types.ts`
2. Default to `false` if not specified

### Phase 2: Mark Author Commands as Meta
1. Set `isMeta = true` in all author command classes:
   - `ParserEventsAction`
   - `ValidationEventsAction`
   - `SystemEventsAction`

### Phase 3: Update Game Engine
1. Modify `executeTurn()` to check for meta-commands
2. Skip `updateContext()` for meta-commands (no turn increment)
3. Skip command history update for meta-commands
4. Add metadata to turn result indicating it was a meta-command

### Phase 4: Platform Integration
1. Ensure platforms don't trigger NPCs/daemons for meta-commands
2. Add visual indication in output that command was meta (optional)

## Code Changes Required

### 1. enhanced-types.ts
```typescript
export interface Action {
  // ... existing properties
  
  /**
   * Whether this is a meta-command that doesn't advance game time
   * Meta-commands don't increment turns, trigger NPCs, or get recorded in history
   * Examples: debug commands, transcript control, display settings
   */
  isMeta?: boolean;
}
```

### 2. game-engine.ts (executeTurn method)
```typescript
// After successful command execution (line ~342)
if (result.success) {
  // Check if this was a meta-command
  const action = this.actionRegistry.get(result.actionId);
  const isMeta = action?.isMeta || false;
  
  if (!isMeta) {
    // Only update history and context for non-meta commands
    this.updateCommandHistory(result, input, turn);
    this.updateContext(result);
  } else {
    // For meta-commands, just update vocabulary
    this.updateScopeVocabulary();
  }
}
```

### 3. Author command files
```typescript
export class ParserEventsAction implements Action {
  id = 'author.parser_events';
  verbs = ['parser'];
  isMeta = true;  // Mark as meta-command
  // ...
}
```

## Testing Considerations

1. Verify turn counter doesn't increment for meta-commands
2. Verify command history doesn't include meta-commands
3. Verify AGAIN command doesn't repeat meta-commands
4. Verify meta-commands still produce output
5. Verify debug flags are properly set/unset

## Future Considerations

1. **Meta-command permissions**: Should meta-commands be restricted in release builds?
2. **Meta-command discovery**: Should there be a HELP META command?
3. **Nested meta-commands**: Can meta-commands trigger other meta-commands?
4. **Save/Restore**: Should meta-command state (debug flags) be saved?

## Conclusion

The recommended approach is to add an `isMeta` property to the Action interface and check it in the game engine. This is the cleanest, most maintainable solution that clearly identifies meta-commands at the action level while requiring minimal changes to the existing architecture.