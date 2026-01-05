# Parser Recommendations Implementation Plan

**Created**: 2026-01-05
**Status**: PROPOSED
**Target**: v1.x release cycle

---

## Overview

This plan addresses the critical gaps identified in the parser assessment:

| Gap | Priority | Complexity | Target Phase |
|-----|----------|------------|--------------|
| Pronoun resolution ("it", "them") | High | Medium | Phase 1 |
| Improved error messages | High | Low | Phase 1 |
| Disambiguation system | High | High | Phase 2 |
| Comma-separated lists | Medium | Low | Phase 1 |
| "then" command chaining | Medium | Medium | Phase 3 |
| Rule indexing (performance) | Low | Medium | Phase 4 |

---

## Phase 1: Quick Wins

### 1.1 Pronoun Resolution

**Problem**: "take lamp. light it" fails because parser doesn't track "it".

**Design**:

```typescript
// New: PronounContext tracks recent referents
interface PronounContext {
  // Singular object (last direct object)
  it: EntityReference | null;

  // Plural objects (last list or "all" result)
  them: EntityReference[] | null;

  // Gendered pronouns (last animate entity by gender)
  him: EntityReference | null;
  her: EntityReference | null;

  // Last successful command (for "again"/"g")
  lastCommand: IParsedCommand | null;
}

interface EntityReference {
  entityId: string;
  text: string;        // How player referred to it ("the lamp")
  turnNumber: number;  // When it was set
}
```

**Implementation**:

1. Add `PronounContext` to parser state
2. After successful parse, update context:
   - Direct object → `it` (if singular, non-animate)
   - Direct object → `him`/`her` (if animate with gender)
   - List items → `them`
   - Store full command → `lastCommand`
3. During tokenization, detect pronoun tokens
4. During entity slot consumption, substitute pronoun with referent
5. Fail gracefully if pronoun has no referent ("I don't know what 'it' refers to")

**Files to modify**:
- `packages/parser-en-us/src/english-parser.ts` - Add context tracking
- `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` - Handle pronouns
- `packages/lang-en-us/src/vocabulary/pronouns.ts` - Define pronoun vocabulary
- `packages/world-model/src/commands/parsed-command.ts` - Add pronoun metadata

**Effort**: 3-4 days

---

### 1.2 Improved Error Messages

**Problem**: Parser returns generic "Could not match input to any command pattern".

**Design**: Analyze partial matches to provide specific feedback.

```typescript
interface ParseFailure {
  type: 'NO_VERB' | 'UNKNOWN_VERB' | 'MISSING_OBJECT' | 'WRONG_PREPOSITION' |
        'ENTITY_NOT_FOUND' | 'SCOPE_VIOLATION' | 'AMBIGUOUS';

  // Contextual information
  verb?: string;           // If verb was recognized
  missingSlot?: string;    // "I understood 'put lamp' but need where to put it"
  unknownWord?: string;    // "I don't know the word 'xyzzy'"
  suggestion?: string;     // "Did you mean 'push'?"
  candidates?: string[];   // For AMBIGUOUS: list of options
}
```

**Implementation**:

1. Track partial match progress during rule matching
2. Collect "best failures" - matches that got furthest before failing
3. Analyze failure points:
   - No rules matched first token → UNKNOWN_VERB
   - Rules matched verb but needed more → MISSING_OBJECT
   - Entity slot found no matches → ENTITY_NOT_FOUND
   - Entity slot found matches but scope rejected → SCOPE_VIOLATION
4. Return structured failure with context

**Message templates** (in lang-en-us):
```typescript
const parserErrors = {
  'NO_VERB': "I don't understand that sentence.",
  'UNKNOWN_VERB': "I don't know the verb '{verb}'.",
  'MISSING_OBJECT': "What do you want to {verb}?",
  'MISSING_INDIRECT': "{verb} {directObject}... where?",
  'ENTITY_NOT_FOUND': "I don't see any '{noun}' here.",
  'SCOPE_VIOLATION': "You can't reach the {noun}.",
  'AMBIGUOUS': "Which {noun} do you mean: {options}?"
};
```

**Effort**: 2-3 days

---

### 1.3 Comma-Separated Lists

**Problem**: "take knife, lamp, sword" doesn't parse as a list.

**Current**: Only "take knife and lamp" works.

**Implementation**:

1. Extend `consumeEntityWithListDetection()` to recognize comma patterns
2. Handle Oxford comma: "knife, lamp, and sword"
3. Handle simple comma: "knife, lamp, sword"
4. Distinguish from command chaining (comma + verb = new command)

```typescript
// Detection logic in entity-slot-consumer.ts
private isCommaList(tokens: Token[], startIndex: number): boolean {
  // Look ahead for pattern: noun, noun[, noun]* [and noun]
  // vs: noun, verb (which is command chaining)
}
```

**Effort**: 1 day

---

## Phase 2: Disambiguation System

This is the most complex feature, requiring careful design across multiple layers.

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PARSE REQUEST                           │
│                    "take book" (2 books visible)                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ENTITY SLOT CONSUMER                         │
│  1. Find candidates: [red-book, blue-book]                      │
│  2. Calculate scores for each                                   │
│  3. Check if auto-resolvable (clear winner)                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│    AUTO-RESOLUTION      │     │      AMBIGUOUS RESULT           │
│  (Score diff > 2x)      │     │  (Scores too close)             │
│                         │     │                                 │
│  Return winning entity  │     │  Return AmbiguousSlot with      │
└─────────────────────────┘     │  candidates and scores          │
                                └─────────────────┬───────────────┘
                                                  │
                              ┌───────────────────┴───────────────┐
                              │                                   │
                              ▼                                   ▼
                ┌─────────────────────────┐     ┌─────────────────────────┐
                │   AUTHOR HOOK           │     │   CLIENT INTERACTION    │
                │   (Story provides       │     │   (Ask player)          │
                │    resolution logic)    │     │                         │
                │                         │     │   "Which book do you    │
                │   Return entity or null │     │    mean, the red book   │
                └────────────┬────────────┘     │    or the blue book?"   │
                             │                  └────────────┬────────────┘
                             │                               │
                             └───────────────┬───────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │     RESOLVED COMMAND          │
                             │     (Single entity)           │
                             └───────────────────────────────┘
```

### 2.2 Disambiguation Score System

**Entity-Level Scoring** (Author-defined):

```typescript
// In world-model: New DisambiguationTrait
interface DisambiguationTrait {
  // Static score (higher = preferred when ambiguous)
  // Default: 100
  baseScore: number;

  // Dynamic score based on context
  // Return modifier (-100 to +100) or undefined for no change
  contextScore?: (context: DisambiguationContext) => number | undefined;

  // Short description for disambiguation prompt
  // "the red book", "the dusty tome"
  briefDescription?: string;
}

interface DisambiguationContext {
  action: string;           // The action being attempted
  slot: string;             // Which slot (directObject, indirectObject)
  otherEntities: IEntity[]; // Other candidates
  recentlyUsed: string[];   // Entity IDs used in last N turns
  world: WorldModel;
}
```

**Scoring Factors**:

| Factor | Score Modifier | Rationale |
|--------|---------------|-----------|
| Recently manipulated | +50 | Player likely means same object |
| Mentioned in room desc | +30 | Prominent objects preferred |
| Carried by player | +20 | Inventory items accessible |
| Specific name match | +40 | "red book" vs just "book" |
| Adjective match | +30 | Player used distinguishing adjective |
| Unique in scope | +100 | Auto-resolve if only one |
| Author baseScore | varies | Story-specific preferences |
| Author contextScore | varies | Dynamic story logic |

**Auto-Resolution Threshold**:

```typescript
const AUTO_RESOLVE_RATIO = 1.5; // Winner must be 1.5x runner-up

function shouldAutoResolve(scores: Map<string, number>): string | null {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 1) return sorted[0][0];

  const [first, second] = sorted;
  if (first[1] >= second[1] * AUTO_RESOLVE_RATIO) {
    return first[0]; // Clear winner
  }
  return null; // Too close, need disambiguation
}
```

### 2.3 Author Disambiguation Hooks

Stories can provide custom disambiguation logic:

```typescript
// In story setup
world.setDisambiguationHandler({
  // Called before any disambiguation
  // Return entity ID to auto-resolve, or null to continue
  beforeDisambiguate(
    candidates: IEntity[],
    context: DisambiguationContext
  ): string | null {
    // Example: In the treasure room, always prefer gold items
    if (context.world.getPlayer().location === 'treasure-room') {
      const goldItem = candidates.find(c => c.get('material') === 'gold');
      if (goldItem) return goldItem.id;
    }
    return null;
  },

  // Called to filter/reorder candidates before showing to player
  filterCandidates(
    candidates: IEntity[],
    context: DisambiguationContext
  ): IEntity[] {
    // Example: Don't show hidden items in disambiguation
    return candidates.filter(c => !c.get('hidden'));
  }
});
```

### 2.4 Async Resolution Protocol

Disambiguation must be **async** - the engine emits an event and waits for the player to type a resolution command. This matches classic IF behavior:

```
> take book
Which do you mean, the red book or the blue book?
> red
Taken.
```

**State Machine**:

```
                    ┌─────────────────┐
                    │  NORMAL PARSE   │
                    └────────┬────────┘
                             │
                   Ambiguity detected
                             │
                             ▼
                    ┌─────────────────┐
     Emit event     │  AWAITING       │     Store pending
     to client  ───▶│  RESOLUTION     │◀─── command + candidates
                    └────────┬────────┘
                             │
              Player types resolution command
                             │
                             ▼
                    ┌─────────────────┐
                    │  RESOLVE &      │
                    │  EXECUTE        │
                    └─────────────────┘
```

**Event Emitted** (semantic event, rendered by lang layer):

```typescript
interface DisambiguationNeededEvent {
  type: 'if.event.disambiguate';
  data: {
    slot: string;               // 'directObject'
    prompt: string;             // Message ID: 'parser.disambiguate.which'
    candidates: Array<{
      index: number;            // 1, 2, 3...
      entityId: string;
      label: string;            // "the red book"
    }>;
    pendingCommandId: string;   // To match resolution
  };
}
```

**Pending Command Storage**:

```typescript
// Engine tracks pending disambiguation
interface PendingDisambiguation {
  commandId: string;
  originalCommand: IParsedCommand;
  unresolvedSlot: string;
  candidates: Map<string, IEntity>;  // label → entity
  candidatesByIndex: IEntity[];      // For "1", "2" resolution
  expiresAfterTurns: number;         // Clear if player does something else
}
```

**Resolution Commands** (player input):

The parser recognizes these as disambiguation resolutions when pending:

| Input | Resolution |
|-------|------------|
| `1`, `2`, `3` | Select by index |
| `red`, `red book` | Match candidate label |
| `nevermind`, `cancel` | Abort pending command |
| Any other command | Abort pending, parse new command |

**Parser Handling**:

```typescript
// In EnglishParser.parse()
parse(input: string): CommandResult<IParsedCommand, CoreParseError> {
  // Check for pending disambiguation first
  if (this.pendingDisambiguation) {
    const resolution = this.tryResolveDisambiguation(input);
    if (resolution.resolved) {
      // Clear pending, return resolved command
      const resolved = this.completePendingCommand(resolution.entity);
      this.pendingDisambiguation = null;
      return { success: true, value: resolved };
    }
    if (resolution.cancelled) {
      // Player said "nevermind" or typed different command
      this.pendingDisambiguation = null;
      if (resolution.newCommand) {
        // Parse the new command instead
        return this.parseNormal(input);
      }
      return { success: false, error: { type: 'CANCELLED' } };
    }
    // Invalid resolution - ask again
    return {
      success: false,
      error: {
        type: 'INVALID_DISAMBIGUATION',
        message: 'parser.disambiguate.invalid',
        candidates: this.pendingDisambiguation.candidates
      }
    };
  }

  // Normal parsing
  return this.parseNormal(input);
}

private tryResolveDisambiguation(input: string): DisambiguationResult {
  const pending = this.pendingDisambiguation!;
  const normalized = input.trim().toLowerCase();

  // Check for cancellation
  if (['nevermind', 'cancel', 'abort', 'n'].includes(normalized)) {
    return { cancelled: true };
  }

  // Check for index selection: "1", "2", etc.
  const indexMatch = normalized.match(/^(\d+)$/);
  if (indexMatch) {
    const index = parseInt(indexMatch[1], 10) - 1; // 1-indexed for player
    if (index >= 0 && index < pending.candidatesByIndex.length) {
      return { resolved: true, entity: pending.candidatesByIndex[index] };
    }
    return { resolved: false }; // Invalid index
  }

  // Check for label match: "red book", "red", etc.
  for (const [label, entity] of pending.candidates) {
    if (label.includes(normalized) || normalized.includes(label)) {
      return { resolved: true, entity };
    }
  }

  // Check if this looks like a completely different command
  const firstWord = normalized.split(/\s+/)[0];
  if (this.isKnownVerb(firstWord)) {
    return { cancelled: true, newCommand: input };
  }

  return { resolved: false };
}
```

**Engine Flow**:

```typescript
// In CommandExecutor
executeCommand(command: IParsedCommand): void {
  // Check for ambiguous slots
  const ambiguity = this.findFirstAmbiguity(command);

  if (ambiguity) {
    // Try author hook first (sync)
    const authorResolved = this.tryAuthorDisambiguation(ambiguity);
    if (authorResolved) {
      command.resolveSlot(ambiguity.slot, authorResolved);
      // Continue to execute
    } else {
      // Store pending and emit event - DO NOT BLOCK
      this.parser.setPendingDisambiguation({
        commandId: generateId(),
        originalCommand: command,
        unresolvedSlot: ambiguity.slot,
        candidates: ambiguity.candidates,
        candidatesByIndex: [...ambiguity.candidates.values()],
        expiresAfterTurns: 1
      });

      this.emit({
        type: 'if.event.disambiguate',
        data: {
          slot: ambiguity.slot,
          prompt: 'parser.disambiguate.which',
          candidates: this.formatCandidates(ambiguity.candidates),
          pendingCommandId: this.parser.pendingDisambiguation.commandId
        }
      });

      // Turn ends here - wait for next input
      return;
    }
  }

  // No ambiguity (or resolved by author hook) - execute normally
  this.executeResolvedCommand(command);
}
```

**Lang-en-us Messages**:

```typescript
export const disambiguationMessages = {
  'parser.disambiguate.which': 'Which {noun} do you mean?',
  'parser.disambiguate.options': '{candidates}',  // "1. the red book  2. the blue book"
  'parser.disambiguate.invalid': "Please choose one of the options, or type 'nevermind' to cancel.",
  'parser.disambiguate.expired': 'Never mind.',
};
```

**Turn Expiration**:

If player types a completely different command, the pending disambiguation is cleared:

```typescript
// At start of each turn
if (this.pendingDisambiguation) {
  this.pendingDisambiguation.expiresAfterTurns--;
  if (this.pendingDisambiguation.expiresAfterTurns <= 0) {
    this.pendingDisambiguation = null;
  }
}
```

### 2.5 Implementation Steps

1. **Add DisambiguationTrait** to world-model
2. **Modify entity-slot-consumer** to collect candidates with scores
3. **Add AmbiguousSlot** type to IParsedCommand
4. **Add disambiguation handler interface** to WorldModel
5. **Implement scoring algorithm** in new `disambiguation-scorer.ts`
6. **Add client protocol events** to core event types
7. **Modify CommandExecutor** to handle disambiguation flow
8. **Add lang-en-us prompts** for disambiguation messages
9. **Update CLI client** to handle disambiguation (simple numbered list)
10. **Add tests** for each component

**Effort**: 8-10 days

---

## Phase 3: Command Chaining with "then"

**Problem**: "take sword then go north" doesn't work.

**Design**:

```typescript
// Extend parseChain() to handle "then"
private splitOnThen(input: string): string[] {
  // "take sword then go north" → ["take sword", "go north"]
  // Handle "and then" as well
}
```

**Edge Cases**:
- "then" as part of object name (unlikely but possible)
- "and then" vs "X and Y then Z"

**Implementation**:
1. Add "then" to conjunction vocabulary
2. Extend `splitOnCommasIfChain` to also split on "then"
3. Handle "and then" as single delimiter

**Effort**: 1 day

---

## Phase 4: Performance Optimization

### 4.1 Rule Indexing

**Problem**: Linear scan through all rules for every parse.

**Design**:

```typescript
class GrammarRuleIndex {
  // Index by first literal token
  private byFirstToken: Map<string, GrammarRule[]> = new Map();

  // Index by action (for reverse lookup)
  private byAction: Map<string, GrammarRule[]> = new Map();

  // Rules that start with slots (must always check)
  private wildcardRules: GrammarRule[] = [];

  findCandidateRules(firstToken: string): GrammarRule[] {
    const exact = this.byFirstToken.get(firstToken) || [];
    return [...exact, ...this.wildcardRules];
  }
}
```

**Benefit**: Reduces rule comparisons from O(n) to O(k) where k << n.

**Effort**: 2 days

### 4.2 Scope Query Caching

**Problem**: Same scope queries repeated during parse.

**Design**:

```typescript
class ScopeCachePerTurn {
  private visible: IEntity[] | null = null;
  private touchable: IEntity[] | null = null;
  private carried: IEntity[] | null = null;

  getVisible(context: GrammarContext): IEntity[] {
    if (!this.visible) {
      this.visible = context.world.getVisibleEntities(...);
    }
    return this.visible;
  }

  // Called at start of each turn
  invalidate(): void {
    this.visible = null;
    this.touchable = null;
    this.carried = null;
  }
}
```

**Effort**: 1 day

---

## Summary Timeline

| Phase | Features | Effort | Dependencies |
|-------|----------|--------|--------------|
| **1** | Pronouns, Error messages, Comma lists | 6-8 days | None |
| **2** | Disambiguation system | 8-10 days | Phase 1 |
| **3** | "then" chaining | 1 day | None |
| **4** | Performance | 3 days | None |

**Total**: ~20 days of development

**Recommended Order**: Phase 1 → Phase 3 → Phase 2 → Phase 4

(Phase 3 is quick and independent, Phase 4 can wait until performance is measured)

---

## Testing Strategy

### Unit Tests
- Pronoun resolution edge cases
- Disambiguation scoring algorithm
- Error message generation
- Comma list parsing

### Integration Tests
- Full parse → disambiguate → execute flow
- Client disambiguation protocol
- Author hook invocation

### Transcript Tests
- Add disambiguation scenarios to existing stories
- Pronoun reference chains
- Error message verification

---

## Open Questions

1. **Pronoun scope**: Should "it" only refer to objects in current room, or anywhere? (Recommend: current room only, with "the X you had" fallback for recently dropped items)

2. **Disambiguation memory**: Should the parser remember "the red book" preference for future commands in same session? (Recommend: yes, boost score for recently-disambiguated entities)

3. **Multi-slot disambiguation**: If both direct and indirect objects are ambiguous, resolve sequentially or together? (Recommend: sequentially - "Which book?" then "Which shelf?")

4. **"All" disambiguation**: "take all books" when some books are too heavy - interactive confirmation per item? (Recommend: no, just report failures after the fact like Infocom)

5. **Resolution expiry**: Currently set to 1 turn. Should this be configurable per-story? (Recommend: yes, via `world.setDisambiguationOptions({ expiresAfterTurns: 2 })`)

6. **Disambiguation during disambiguation**: What if player's resolution input is itself ambiguous? ("red" matches "red book" and "red ball" in candidates) (Recommend: fail with "Please be more specific")

---

## References

- Assessment: `docs/work/action-grammar/assessment.md`
- ADR-087: Action-Centric Grammar
- ADR-088: Slot Consumer Refactor
- Inform 7 DM4 Chapter 33: Disambiguation
- TADS 3: Disambiguation and Ranking
