# AGAIN (G) Command Implementation

## Current State

The AGAIN command is **partially implemented** with engine-level special-casing that bypasses the normal action dispatch flow.

### What Exists

| Component | Status | Location |
|-----------|--------|----------|
| Engine handling | ✅ Working | `packages/engine/src/game-engine.ts:454-483` |
| Command history capability | ✅ Working | `packages/stdlib/src/capabilities/command-history.ts` |
| Meta-registry entry | ✅ Registered | `packages/stdlib/src/actions/meta-registry.ts` |
| Grammar patterns | ❌ Missing | `packages/parser-en-us/src/grammar.ts` |
| Stdlib action | ❌ Missing | No action file exists |
| Language messages | ❌ Missing | `packages/lang-en-us/` |

### Current Implementation

The engine handles AGAIN by intercepting literal strings **before parsing**:

```typescript
// packages/engine/src/game-engine.ts:454-483
const normalized = input.trim().toLowerCase();
if (normalized === 'g' || normalized === 'again') {
  const historyData = this.world.getCapability(StandardCapabilities.COMMAND_HISTORY);

  if (!historyData?.entries?.length) {
    return { success: false, error: 'There is nothing to repeat.' };
  }

  // Substitute input with last command
  input = historyData.entries[historyData.entries.length - 1].originalText;
}
```

This works but:
- Bypasses parser entirely
- No grammar registration (can't be extended with aliases)
- No action dispatch (no 4-phase pattern)
- Error message is hardcoded in engine, not in language layer

### Command History

Successfully executed non-meta commands are recorded:

```typescript
interface CommandHistoryEntry {
  actionId: string;           // 'if.action.taking'
  originalText: string;       // 'take the brass lamp'
  parsedCommand: {
    verb: string;
    directObject?: string;
    indirectObject?: string;
    preposition?: string;
  };
  turnNumber: number;
  timestamp: number;
}
```

Excluded from history: `again`, `g`, `oops`, `undo` (prevents circular references).

---

## Proposed Implementation

### Option A: Minimal - Keep Engine Handling, Add Grammar

Keep the current engine-level substitution but add proper grammar registration so the pattern is documented and extensible.

**Changes:**
1. Add grammar patterns to `packages/parser-en-us/src/grammar.ts`:
   ```typescript
   grammar.define('again').mapsTo('if.action.again').build();
   grammar.define('g').mapsTo('if.action.again').build();
   ```

2. Add language messages to `packages/lang-en-us/src/messages/`:
   ```typescript
   export const AgainMessages = {
     NOTHING_TO_REPEAT: 'There is nothing to repeat.',
     REPEATING: '(repeating: {command})'  // optional feedback
   };
   ```

3. Update engine to use language layer for error message.

**Pros:** Minimal changes, grammar is registered, error messages localized.
**Cons:** Still bypasses action dispatch, two-tier handling.

### Option B: Full Stdlib Action

Create a proper stdlib action that follows the 4-phase pattern.

**Challenge:** The action needs to replay a command, but the action system executes actions—it doesn't re-parse and execute arbitrary input. The current engine substitution happens BEFORE parsing specifically to avoid this.

**Approach:** The action would need to:
1. Retrieve last command from history
2. Signal to engine to "re-execute" that command
3. Engine handles the actual re-execution

**Implementation:**

1. **Create action file** `packages/stdlib/src/actions/standard/again/`:
   ```typescript
   // again-action.ts
   export const againAction: Action = {
     id: 'if.action.again',
     group: 'meta',

     validate(context) {
       const history = context.world.getCapability(StandardCapabilities.COMMAND_HISTORY);
       if (!history?.entries?.length) {
         return context.invalid('NOTHING_TO_REPEAT');
       }
       context.sharedData.lastCommand = history.entries[history.entries.length - 1];
       return context.valid();
     },

     execute(context) {
       // No mutation - engine handles re-execution
     },

     report(context) {
       const lastCommand = context.sharedData.lastCommand;
       return [{
         type: 'if.event.again',
         data: {
           command: lastCommand.originalText,
           actionId: lastCommand.actionId
         }
       }];
     },

     blocked(context, result) {
       return [{ type: 'if.event.again_blocked', data: { reason: result.reason } }];
     }
   };
   ```

2. **Add grammar patterns** to `packages/parser-en-us/src/grammar.ts`:
   ```typescript
   grammar.define('again').mapsTo('if.action.again').build();
   grammar.define('g').mapsTo('if.action.again').build();
   ```

3. **Add language messages** to `packages/lang-en-us/`:
   ```typescript
   export const AgainMessages = {
     NOTHING_TO_REPEAT: 'There is nothing to repeat.',
   };
   ```

4. **Modify engine** to handle `if.event.again`:
   - When action reports success with `if.event.again`, engine re-executes the command
   - This is similar to how UNDO works (action validates, engine handles state change)

5. **Remove engine special-case** for "g"/"again" string detection.

**Pros:** Follows architecture, extensible, language-layer messages.
**Cons:** More complex, requires engine modification to handle "re-execute" pattern.

### Option C: Hybrid - Action for Validation, Engine for Execution

1. Parser routes "again"/"g" to `if.action.again`
2. Action validates (history exists) and stores last command in sharedData
3. Action reports `if.event.again_request` with the command to replay
4. Engine intercepts this event and re-executes the stored command
5. Combined result includes both AGAIN acknowledgment and replayed command output

This separates concerns: action handles validation/reporting, engine handles re-execution.

---

## Recommended Approach

**Option A (Minimal)** for immediate use—adds grammar and language layer without major refactoring.

**Option C (Hybrid)** for proper architecture alignment if we want full stdlib integration.

The key insight is that AGAIN is fundamentally different from other actions:
- Normal actions: parse → validate → execute → report
- AGAIN: needs to trigger another full parse → validate → execute → report cycle

This is similar to UNDO which also requires engine-level handling (snapshot restoration). Both are "meta-actions" that affect the command execution flow itself rather than game state.

---

## Implementation Checklist

### Phase 1: Grammar + Language (Option A)
- [ ] Add grammar patterns in `packages/parser-en-us/src/grammar.ts`
- [ ] Add `AgainMessages` in `packages/lang-en-us/src/messages/again.ts`
- [ ] Update engine to use language messages for "nothing to repeat" error
- [ ] Add transcript test for AGAIN command
- [ ] Update docs

### Phase 2: Full Stdlib Action (Option C)
- [ ] Create `packages/stdlib/src/actions/standard/again/` action files
- [ ] Add `if.event.again` and `if.event.again_blocked` event types
- [ ] Modify engine to handle `if.event.again` re-execution
- [ ] Remove engine string-literal special case
- [ ] Add unit tests for action
- [ ] Update transcript tests

---

## References

- Command history capability: `packages/stdlib/src/capabilities/command-history.ts`
- Meta-command registry: `packages/stdlib/src/actions/meta-registry.ts`
- Engine handling: `packages/engine/src/game-engine.ts:454-483`
- History recording: `packages/engine/src/game-engine.ts:1133-1208`
