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

**Option C (Hybrid)** is the correct approach. Option A is rejected because it breaks internationalization.

### Why Option A Fails

The current engine-level string matching hardcodes English:

```typescript
// packages/engine/src/game-engine.ts
if (normalized === 'g' || normalized === 'again') {
```

This breaks for any non-English parser. A French player typing `encore` would get "I don't understand" instead of repeating their last command.

### i18n Architecture

Each parser package registers locale-specific patterns for the universal action ID:

| Package | Patterns | Maps To |
|---------|----------|---------|
| `parser-en-us` | `again`, `g` | `if.action.again` |
| `parser-fr-fr` | `encore`, `e` | `if.action.again` |
| `parser-de-de` | `nochmal`, `n` | `if.action.again` |
| `parser-es-es` | `otra vez`, `o` | `if.action.again` |

The **action ID is universal**, the **grammar patterns are locale-specific**. The engine never knows what word triggered the action—it just sees `if.action.again` and handles re-execution.

### Option C Flow

```
"g" → parser → if.action.again → validate (history exists?)
    → execute (no-op) → report (if.event.again with command)
    → engine sees if.event.again → re-executes stored command
```

This separates concerns properly:
- **Parser**: owns the words ("again", "g", "encore", etc.)
- **Action**: validates history exists, reports intent
- **Engine**: handles re-execution (language-agnostic)

### Meta-Action Pattern

AGAIN is fundamentally different from normal actions:
- Normal actions: parse → validate → execute → report
- AGAIN: needs to trigger another full parse → validate → execute → report cycle

This is similar to UNDO which also requires engine-level handling (snapshot restoration). Both are "meta-actions" that affect the command execution flow itself rather than game state.

The meta-action pattern: **action validates and signals intent, engine handles the special execution**.

---

## Implementation Checklist

### 1. Stdlib Action
- [ ] Create `packages/stdlib/src/actions/standard/again/again-action.ts`
- [ ] Create `packages/stdlib/src/actions/standard/again/again-events.ts`
- [ ] Create `packages/stdlib/src/actions/standard/again/again-data.ts`
- [ ] Create `packages/stdlib/src/actions/standard/again/index.ts`
- [ ] Register in `packages/stdlib/src/actions/standard/index.ts`
- [ ] Add to meta-registry exclusions (prevent AGAIN from being recorded in history)

### 2. Grammar (parser-en-us)
- [ ] Add grammar patterns in `packages/parser-en-us/src/grammar.ts`:
  - `again` → `if.action.again`
  - `g` → `if.action.again`

### 3. Language Messages (lang-en-us)
- [ ] Create `packages/lang-en-us/src/messages/again.ts`
- [ ] Register messages in `packages/lang-en-us/src/index.ts`
- [ ] Messages needed:
  - `NOTHING_TO_REPEAT`: "There is nothing to repeat."

### 4. Engine Modifications
- [ ] Add handler for `if.event.again` in game-engine.ts
- [ ] When `if.event.again` is reported, re-execute the command from event data
- [ ] Remove hardcoded `'g' || 'again'` string matching (lines 454-483)
- [ ] Ensure re-executed command output is included in turn result

### 5. Testing
- [ ] Add unit tests for again-action (validate with/without history)
- [ ] Add transcript test: `stories/dungeo/tests/transcripts/again.transcript`
- [ ] Test edge cases:
  - AGAIN with no prior command
  - AGAIN after failed command (should it repeat?)
  - AGAIN after AGAIN (should be excluded from history)

### 6. Documentation
- [ ] Update this plan with completion notes
- [ ] Add ADR if needed (may not be necessary, follows existing meta-action pattern)

---

## Open Questions

### 1. Should AGAIN repeat failed commands?

If the player types `take lamp` and it fails (lamp not here), should `g` repeat that failed attempt?

**Option A: Only repeat successful commands**
- Matches Inform 7 behavior
- History already only records successful commands
- Less confusing for players

**Option B: Repeat last attempted command regardless of success**
- Would need to track attempted commands separately
- More work, less clear benefit

**Recommendation**: Option A (current behavior) - only successful commands are in history.

### 2. Should we show "(repeating...)" feedback?

When AGAIN executes, should output include a prefix like "(repeating: take lamp)"?

**Option A: Silent** - just show the repeated command's output
**Option B: Feedback** - show "(repeating: take lamp)" before output

**Recommendation**: Silent by default. The player just typed "g" - they know what they're repeating. Could add as optional verbose mode later.

### 3. What if the repeated command is now invalid?

Player takes lamp, moves to new room, types `g`. The "take lamp" command now fails because lamp is already held.

**Behavior**: This is fine. The command re-executes through normal validation and will fail with appropriate message ("You already have that"). No special handling needed.

---

## References

- Command history capability: `packages/stdlib/src/capabilities/command-history.ts`
- Meta-command registry: `packages/stdlib/src/actions/meta-registry.ts`
- Engine handling: `packages/engine/src/game-engine.ts:454-483`
- History recording: `packages/engine/src/game-engine.ts:1133-1208`
