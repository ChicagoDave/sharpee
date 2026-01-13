# Session Summary: 2026-01-13 - chaining

## Status: Completed

## Goals
- Reconcile event chaining (ADR-094) with text service architecture (ADR-096)
- Clarify how TextService integrates with Engine
- Add transactionId for grouping related events

## Completed

### ADR-094 Updates (Event Chaining)

Added Event Metadata section documenting:
- `transactionId` - groups all events from one player action
- `chainDepth` - 0 for direct events, 1+ for chained
- `chainedFrom` - the trigger event type
- Transaction flow diagram showing how events relate
- Engine responsibility for assigning transactionId

### ADR-096 Updates (Text Service)

Major clarifications:
1. **Engine Integration** - TextService is called by Engine (push model), not listening for events
2. **Interface change** - `processTurn(events: ISemanticEvent[]): ITextBlock[]`
3. **Dependencies** - Just LanguageProvider, no context object needed
4. **Event sorting** - TextService sorts events within each transaction for correct prose order:
   - `action.*` events first (the main action result)
   - Then by chainDepth (lower first)
5. **Processing pipeline** - Event type used as template key for LanguageProvider lookup
6. **Event Chaining Integration section** - Concrete example showing opened→revealed flow with transactionId

### Implementation: transactionId Passthrough

Updated `WorldModel.executeChains()` to:
- Extract `_transactionId` from trigger event
- Pass it through to all chained events
- Added tests verifying passthrough behavior

## Key Decisions

### 1. Engine Owns Event Accumulation

TextService doesn't listen for events. Engine:
1. Accumulates events during turn (including chains)
2. Calls `textService.processTurn(events)`
3. Receives TextBlocks back
4. Emits 'turn-complete' to Client

### 2. TextService Owns Prose Ordering

Events arrive in emission order, but prose needs different order:
- "You open the chest." (action result) before
- "Inside you see..." (chained consequence)

TextService sorts by transactionId + chainDepth to achieve this.

### 3. Event Type = Template Key

Convention: `event.type` is used as the message key for LanguageProvider lookup.
- `if.event.revealed` → `languageProvider.formatMessage('if.event.revealed', data)`
- No separate messageId needed for chained events

## Files Modified

**ADRs:**
- `docs/architecture/adrs/adr-094-event-chaining.md` - Added Event Metadata section
- `docs/architecture/adrs/adr-096-text-service.md` - Engine integration, sorting, chaining integration

**Implementation:**
- `packages/world-model/src/world/WorldModel.ts` - transactionId passthrough in executeChains()
- `packages/world-model/tests/unit/world/event-chaining.test.ts` - Tests for transactionId passthrough

## Open Items (Deferred)

### TextService Implementation
Current implementation doesn't match ADR-096:
- Still uses context pull model
- Has hard-coded event type switch
- Needs rewrite to use LanguageProvider.formatMessage() pattern

### Engine Changes
- Assign transactionId at start of each player action
- Pass events to TextService after turn completes

### LanguageProvider Changes
- May need `formatMessage()` method (vs current `getMessage()`)
- Need to register templates for event types like `if.event.revealed`

## Architecture Summary

```
Player Command
     │
     ▼
┌─────────────────────────────────────────┐
│                 ENGINE                   │
│                                          │
│  1. Assign transactionId                 │
│  2. Execute action                       │
│  3. Events accumulate (with chains)      │
│  4. Call textService.processTurn(events) │
│  5. Emit 'turn-complete' to Client       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│              TEXT SERVICE                │
│                                          │
│  1. Sort events for prose order          │
│  2. For each event:                      │
│     - Look up template by event.type     │
│     - Resolve formatters                 │
│     - Parse decorations                  │
│     - Create TextBlock                   │
│  3. Return ITextBlock[]                  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│                CLIENT                    │
│                                          │
│  Receives blocks, routes by key prefix,  │
│  renders to UI                           │
└─────────────────────────────────────────┘
```

## Notes

- Session clarified that TextService is a stateless transformer
- Event metadata (`transactionId`, `chainDepth`, `chainedFrom`) enables correct prose ordering
- Implementation is compartmentalized: ADRs complete, minimal code changes, larger rewrite deferred
