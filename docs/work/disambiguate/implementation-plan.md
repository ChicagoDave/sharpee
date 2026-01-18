# Disambiguation via Platform Events - Implementation Plan

## Overview

Fix ISSUE-008: Disambiguation prompts show "Which do you mean?" without listing the candidate options.

**Goal**: Implement the full design from `docs/design/disambiguation-via-platform-events.md` using `client.query` events with `QuerySource.DISAMBIGUATION`.

## Current State

### What Works
- CommandValidator correctly identifies ambiguous entities and builds candidate list
- Query system infrastructure exists (QuerySource.DISAMBIGUATION, QueryType.DISAMBIGUATION)
- IQueryContext.candidates structure defined
- Language provider message templates exist

### What's Broken
1. CommandExecutor throws generic Error on validation failure, losing structured data
2. TextService only sees error string, can't extract candidates
3. No query event is emitted for disambiguation
4. No handler exists to format disambiguation prompt with options

## Implementation Phases

### Phase 1: CommandExecutor - Don't Throw on Disambiguation

**File**: `packages/engine/src/command-executor.ts`

**Current** (line 148-152):
```typescript
const validationResult = this.validator.validate(parsedCommand);
if (!validationResult.success) {
  throw new Error(`Validation failed: ${validationResult.error.code}`);
}
```

**Change**:
```typescript
const validationResult = this.validator.validate(parsedCommand);
if (!validationResult.success) {
  // Check for disambiguation - emit query event instead of throwing
  if (validationResult.error.code === 'AMBIGUOUS_ENTITY') {
    const candidates = validationResult.error.details?.ambiguousEntities || [];

    // Emit client.query event for disambiguation
    const queryEvent = eventSequencer.sequence({
      type: 'client.query',
      data: {
        source: QuerySource.DISAMBIGUATION,
        type: QueryType.DISAMBIGUATION,
        messageId: 'disambiguation.which_do_you_mean',
        candidates: candidates,
        context: {
          searchText: validationResult.error.details?.searchText,
          originalCommand: parsedCommand
        }
      }
    }, turn);

    // Return early with query pending
    return {
      turn,
      input,
      success: false,
      needsInput: true,
      events: [queryEvent],
      error: 'DISAMBIGUATION_NEEDED'
    };
  }

  // Other validation errors still throw
  throw new Error(`Validation failed: ${validationResult.error.code}`);
}
```

**Imports to add**:
```typescript
import { QuerySource, QueryType } from '@sharpee/core';
```

### Phase 2: TextService - Handle client.query Events

**File**: `packages/text-service/src/text-service.ts`

**Add new handler method**:
```typescript
private handleClientQuery(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
  const data = event.data as {
    source: string;
    type: string;
    messageId?: string;
    candidates?: Array<{ id: string; name: string; description?: string }>;
  };

  // Only handle disambiguation queries
  if (data.source !== 'disambiguation') {
    return [];
  }

  // Format candidates as natural list
  const candidateNames = (data.candidates || []).map(c => c.name);
  const options = this.formatCandidateList(candidateNames, context.languageProvider);

  // Get message template with options
  const message = context.languageProvider?.getMessage('core.disambiguation_prompt', { options })
    ?? `Which do you mean: ${options}?`;

  return [createBlock(BLOCK_KEYS.QUERY, message)];
}

private formatCandidateList(names: string[], languageProvider?: ILanguageProvider): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];

  // Format as "the X, the Y, or the Z"
  const withArticles = names.map(n => `the ${n}`);

  if (withArticles.length === 2) {
    return `${withArticles[0]} or ${withArticles[1]}`;
  }

  const last = withArticles.pop();
  return `${withArticles.join(', ')}, or ${last}`;
}
```

**Register handler in constructor/init**:
```typescript
this.eventHandlers.set('client.query', this.handleClientQuery.bind(this));
```

### Phase 3: Language Layer - Add Disambiguation Messages

**File**: `packages/lang-en-us/src/language-provider.ts`

**Add to coreMessages**:
```typescript
'core.disambiguation_prompt': "Which do you mean: {options}?",
'core.disambiguation_prompt_short': "Which one: {options}?",
```

### Phase 4: Update command.failed Handler

**File**: `packages/text-service/src/text-service.ts`

**Remove AMBIGUOUS handling from handleCommandFailed** since disambiguation now uses client.query:
```typescript
private handleCommandFailed(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
  const data = event.data as { reason?: string; input?: string };

  if (data.reason) {
    if (data.reason.includes('ENTITY_NOT_FOUND') || data.reason.includes('modifiers_not_matched')) {
      const message = context.languageProvider?.getMessage('core.entity_not_found')
        ?? "I don't see that here.";
      return [createBlock(BLOCK_KEYS.ERROR, message)];
    }

    // REMOVED: AMBIGUOUS handling - now uses client.query

    if (data.reason.includes('NO_MATCH') || data.reason.includes('parse')) {
      const message = context.languageProvider?.getMessage('core.command_not_understood')
        ?? "I don't understand that.";
      return [createBlock(BLOCK_KEYS.ERROR, message)];
    }
  }

  const message = context.languageProvider?.getMessage('core.command_failed')
    ?? "I don't understand that.";
  return [createBlock(BLOCK_KEYS.ERROR, message)];
}
```

## Testing

### Transcript Test

Create `stories/dungeo/tests/transcripts/disambiguation.transcript`:
```
title: Disambiguation Prompt Test
story: dungeo
description: Verify disambiguation lists options

---

# Setup - have both oriental rug and welcome mat (both match "rug")
> look
[OK: contains "West of House"]

> move rug
[OK: contains "Which do you mean"]
[OK: contains "oriental rug"]
[OK: contains "welcome mat"]
```

### Manual Test Cases

1. `move rug` at West of House - should list oriental rug and welcome mat
2. `take ball` with multiple balls - should list all visible balls
3. `examine torch` with multiple torches - should show options

## Files to Modify

| File | Change |
|------|--------|
| `packages/engine/src/command-executor.ts` | Emit client.query for AMBIGUOUS_ENTITY |
| `packages/text-service/src/text-service.ts` | Add handleClientQuery, formatCandidateList |
| `packages/lang-en-us/src/language-provider.ts` | Add disambiguation_prompt message |
| `stories/dungeo/tests/transcripts/disambiguation.transcript` | New test |

## Future Enhancements (Out of Scope)

These are documented in the design doc but not needed for ISSUE-008:

1. **Interactive disambiguation flow** - Handle player response to select candidate
2. **Query state management** - Track pending queries in engine
3. **Response validation** - Accept numbers, names, or distinguishing adjectives
4. **Contextual descriptions** - Show "(carried)", "(on table)" etc.
5. **Learning from responses** - Remember player preferences

## Build & Test Commands

```bash
# Build
./scripts/build-all-dungeo.sh --skip engine

# Test specific transcript
./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/disambiguation.transcript

# Run all tests
./scripts/fast-transcript-test.sh stories/dungeo --all
```

## Success Criteria

- [ ] `move rug` shows "Which do you mean: the oriental rug or the welcome mat?"
- [ ] Other ambiguous commands list their options
- [ ] Existing tests still pass
- [ ] No regression in other error messages
