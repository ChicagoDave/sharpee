# ADR-096: Text Service Architecture

## Status: ACCEPTED

## Date: 2026-01-13

## Context

Sharpee needs a unified text output system that:

1. Produces structured output from semantic events
2. Supports multiple client types (CLI, React, GLK, screen readers)
3. Separates template resolution from rendering
4. Allows author-defined extensions (custom channels, colors)

The current implementation has multiple fragmented text service packages that duplicate logic and produce flat strings. This ADR defines a clean architecture inspired by FyreVM channel I/O (2009, David Cornelson/Tara McGrew/Jeff Panici).

## Decision

### Core Principle: One TextService, Multiple Renderers

Following DRY principles, there is **one TextService** that:
- Resolves templates via LanguageProvider
- Parses decoration syntax into structured trees
- Produces `ITextBlock[]` output

**Renderers** are pure mapping functions that convert `ITextBlock[]` to platform output:
- CLI renderer: `ITextBlock[]` → `string`
- React renderer: `ITextBlock[]` → `ReactNode`
- Future: GLK, screen reader renderers

## TextBlock Contract

### Package: `@sharpee/text-blocks`

A pure interfaces package with no implementation logic.

### Core Types

```typescript
/**
 * Content within a text block - either plain string or decorated content
 */
export type TextContent = string | IDecoration;

/**
 * Decorated content with semantic type
 * Type is open string to support story-defined extensions (Photopia colors)
 */
export interface IDecoration {
  readonly type: string;
  readonly content: ReadonlyArray<TextContent>;
}

/**
 * A block of text output with semantic key (channel)
 */
export interface ITextBlock {
  readonly key: string;
  readonly content: ReadonlyArray<TextContent>;
}
```

### Type Guards

```typescript
export function isDecoration(content: TextContent): content is IDecoration {
  return typeof content === 'object' && content !== null && 'type' in content;
}

export function isTextBlock(value: unknown): value is ITextBlock {
  return typeof value === 'object' && value !== null && 'key' in value && 'content' in value;
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| No `priority` field | YAGNI - if needed, derive from key conventions |
| No `role` field | YAGNI - unclear value |
| `type` is open string | Supports story extensions (Photopia colors) |
| `content` is readonly array | Immutability, can contain nested decorations |

## Channel Key Conventions

Keys act as channels (FyreVM pattern). Client routes blocks by key prefix.

### Core Keys (Platform-defined)

| Key Pattern | Purpose | Client Routing |
|-------------|---------|----------------|
| `room.name` | Room title | Transcript (styled) |
| `room.description` | Room description | Transcript |
| `room.contents` | Items in room | Transcript |
| `action.result` | Action outcome | Transcript |
| `action.blocked` | Why action failed | Transcript (error style) |
| `status.room` | Current location | Status bar slot |
| `status.score` | Current score | Status bar slot |
| `status.turns` | Turn count | Status bar slot |
| `error` | System errors | Transcript (error style) |
| `prompt` | Command prompt | Input area |

### Story Keys (Author-extensible)

Authors can emit custom keys:

```typescript
// Story emits custom channel
{ key: 'dungeo.thief.taunt', content: ['The thief chuckles.'] }
{ key: 'dungeo.oracle.prophecy', content: ['Beware the grue...'] }
```

Clients render unknown keys in main transcript with default styling.

### Status Blocks

Status elements are individual blocks with `status.*` keys:

```typescript
{ key: 'status.room', content: [{ type: 'room', content: ['West of House'] }] }
{ key: 'status.score', content: ['0'] }
{ key: 'status.turns', content: ['1'] }

// Author-defined status elements
{ key: 'status.health', content: ['♥♥♥♥♥'] }
{ key: 'status.compass', content: ['N', 'E'] }
```

React client routes `status.*` blocks to designated slots.

## TextService Architecture

### Package: `@sharpee/text-service`

Single service implementation replacing fragmented packages.

### Engine Integration

**The Engine calls TextService** - it does not listen for events.

```
┌─────────────────────────────────────────────────────────────┐
│                         ENGINE                               │
│                                                              │
│  1. Player command processed                                 │
│  2. Actions emit events → EventSource accumulates            │
│  3. Event chains fire → more events accumulate               │
│  4. Turn completes                                           │
│  5. Engine calls textService.processTurn(events)             │
│  6. TextService returns ITextBlock[]                         │
│  7. Engine emits 'turn-complete' with blocks to Client       │
└─────────────────────────────────────────────────────────────┘
```

This push model means:
- TextService is a stateless transformer
- Engine owns event accumulation and ordering
- Chained events are already interleaved when TextService processes them
- TextService just maps events → TextBlocks in order

### Interface

```typescript
export interface ITextService {
  /**
   * Process turn events and produce TextBlocks.
   * Called by Engine after turn completes.
   *
   * @param events - All events from this turn (including chained events)
   * @returns TextBlocks for client rendering
   */
  processTurn(events: ISemanticEvent[]): ITextBlock[];
}

/**
 * Create a TextService with the given LanguageProvider.
 * LanguageProvider supplies templates (standard + story-registered).
 */
export function createTextService(languageProvider: LanguageProvider): ITextService;
```

### Dependencies

TextService depends only on `LanguageProvider`:
- No context object needed
- LanguageProvider supplies templates via `formatMessage(key, data)`
- Templates come from stdlib (standard) and story (author-registered)

### Processing Pipeline

For each event in the input array:

```
ISemanticEvent
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Event Filtering                      │
│    Skip system.* events                 │
│    Skip events with no template         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. Template Lookup + Formatter Resolution│
│    key = event.type (e.g., 'if.event.revealed')
│    text = languageProvider.formatMessage(key, event.data)
│    Returns text with decoration markers │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. Decoration Parsing                   │
│    [item:sword] → IDecoration           │
│    *emphasis* → IDecoration             │
│    Build content tree                   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. Block Assembly                       │
│    Assign key based on event type       │
│    (see Event to Key Mapping below)     │
│    Create ITextBlock                    │
└─────────────────────────────────────────┘
    │
    ▼
ITextBlock (appended to output)
```

**Note**: Steps 2 (template lookup + formatters) happen in `LanguageProvider.formatMessage()`.
TextService only handles steps 1, 3, and 4. See ADR-095 for formatter details.

### Decoration Parser

Parses decoration syntax from ADR-091:

```typescript
// Input (after formatter resolution)
'You take [item:the sword].'

// Output
{
  key: 'action.result',
  content: [
    'You take ',
    { type: 'item', content: ['the sword'] },
    '.'
  ]
}
```

Handles:
- `[type:content]` - semantic decorations
- `*text*` - emphasis
- `**text**` - strong emphasis
- Nested decorations: `[item:*glowing* lantern]`
- Escaping: `\*`, `\[`, `\]`

### Event to Key Mapping

| Event Type | Block Key |
|------------|-----------|
| `if.event.room_description` | `room.description` |
| `if.event.room.name` | `room.name` |
| `action.success` | `action.result` |
| `action.blocked` | `action.blocked` |
| `game.message` | `game.message` |
| `if.event.revealed` | `action.result` (appended) |
| Story events | Derived from event type |

## Client Communication

### Event-Based Model

After processing, Engine emits blocks to Client:

```typescript
// Inside Engine (simplified)
const blocks = textService.processTurn(events);
this.emit('turn-complete', blocks);

// Client side
engine.on('turn-complete', (blocks: ITextBlock[]) => {
  // All blocks for this turn - commands, daemons, NPCs, everything
  // Includes results from chained events in correct order
});

// Submit command
engine.submitCommand(input: string): void;
```

**Key point**: Client receives blocks from Engine, not from TextService directly.
This keeps TextService as a pure transformer with no client coupling.

### One Stream, Many Channels

Everything flows through one stream. Client routes by key:

```typescript
function handleTurnComplete(blocks: ITextBlock[]) {
  const statusBlocks = blocks.filter(b => b.key.startsWith('status.'));
  const transcriptBlocks = blocks.filter(b => !b.key.startsWith('status.'));

  updateStatusBar(statusBlocks);
  appendToTranscript(transcriptBlocks);
}
```

## Event Chaining Integration (ADR-094)

Event chains produce events that TextService renders as prose.

### Example: Opening a Container

```
Player: "open chest"

Events accumulated by Engine (emission order):
1. if.event.opened      { meta: { transactionId: 'txn-1', chainDepth: 0 } }
2. if.event.revealed    { meta: { transactionId: 'txn-1', chainDepth: 1, chainedFrom: 'if.event.opened' } }
3. action.success       { meta: { transactionId: 'txn-1', chainDepth: 0 } }

TextService sorts for prose order:
1. action.success       → "You open the wooden chest."
2. if.event.opened      → (no template, state event)
3. if.event.revealed    → "Inside the wooden chest you see a sword and a key."

TextService.processTurn(events) produces:
[
  { key: 'action.result', content: ['You open the wooden chest.'] },
  { key: 'action.result', content: ['Inside the wooden chest you see a sword and a key.'] }
]

Client renders:
> You open the wooden chest. Inside the wooden chest you see a sword and a key.
```

### Chained Event Templates

Chained events use their `event.type` as the template key:

| Event Type | Template Key | Template (from lang-en-us) |
|------------|--------------|----------------------------|
| `if.event.revealed` | `if.event.revealed` | `'Inside the {container} you see {a:items:list}.'` |
| `if.event.hidden` | `if.event.hidden` | `'The contents of the {container} are no longer visible.'` |
| `dungeo.trap.triggered` | `dungeo.trap.triggered` | Story-registered template |

### Event Sorting for Prose Order

Events arrive from Engine in emission order, but prose requires a different order:
- Action result first ("You open the chest.")
- Then consequences ("Inside you see...")

TextService sorts events within each transaction for correct prose:

```typescript
private sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[] {
  // Stable sort preserving order across different transactions
  return [...events].sort((a, b) => {
    // Different transactions: maintain original order
    if (a.meta?.transactionId !== b.meta?.transactionId) return 0;

    // Same transaction: action.* first
    const aIsAction = a.type.startsWith('action.');
    const bIsAction = b.type.startsWith('action.');
    if (aIsAction && !bIsAction) return -1;
    if (!aIsAction && bIsAction) return 1;

    // Then by chain depth (lower depth first)
    return (a.meta?.chainDepth ?? 0) - (b.meta?.chainDepth ?? 0);
  });
}
```

**Sort order within a transaction:**
1. `action.*` events (success/blocked) - the main action result
2. Depth 0 events (direct state changes)
3. Depth 1+ events (chained consequences)

See ADR-094 for `transactionId` and `chainDepth` metadata details.

## CLI Renderer

Included in `@sharpee/text-service` for testing and CLI clients.

```typescript
export function renderToString(
  blocks: ITextBlock[],
  options?: CLIRenderOptions
): string;

export interface CLIRenderOptions {
  /** Enable ANSI color codes */
  ansi?: boolean;
  /** Separator between blocks */
  blockSeparator?: string;
}
```

### Decoration Rendering

| Decoration Type | ANSI | Plain |
|-----------------|------|-------|
| `em` | Italic | *text* |
| `strong` | Bold | **text** |
| `item` | Cyan | text |
| `room` | Yellow | text |
| `npc` | Magenta | text |
| `command` | Green | text |
| Unknown | Default | text |

### Story Colors

CLI approximates story-defined colors:

```typescript
// Story config
storyColors: {
  'photopia.red': '#cc0000',
  'photopia.blue': '#0066cc',
}

// CLI approximation
'photopia.red' → ANSI red
'photopia.blue' → ANSI blue
```

## Migration Path

### Deprecated Packages

These packages are archived (not deleted):

- `@sharpee/text-services` → `archive/text-services`
- `@sharpee/text-service-browser` → `archive/text-service-browser`
- `@sharpee/text-service-template` → `archive/text-service-template`

### New Packages

| Package | Purpose |
|---------|---------|
| `@sharpee/text-blocks` | Pure interfaces |
| `@sharpee/text-service` | Single TextService + CLI renderer |

## Implementation

### Phase 1: Interfaces

1. Create `@sharpee/text-blocks` package
2. Define `ITextBlock`, `IDecoration`, `TextContent`
3. Add type guards

### Phase 2: Text Service

1. Create `@sharpee/text-service` package
2. Implement decoration parser
3. Implement TextService with pipeline
4. Implement CLI renderer

### Phase 3: Integration

1. Wire up to engine
2. Update transcript tester to use new service
3. Verify dungeo transcripts pass

## Consequences

### Positive

- Single source of truth for text processing (DRY)
- Structured output enables rich clients
- FyreVM-inspired channels proven in production
- Story extensibility (custom keys, colors)

### Negative

- Breaking change from current text services
- More complex than flat string output
- Decoration parsing adds overhead

### Neutral

- Clients need to understand ITextBlock structure
- Testing requires both unit tests and integration tests

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-091 | Defines decoration syntax this service parses |
| ADR-094 | Event chaining - produces events TextService renders |
| ADR-095 | Defines formatter syntax for template resolution |
| ADR-097 | React client that consumes ITextBlock[] |
| ADR-099 | Future GLK client |
| ADR-100 | Future screen reader client |

## References

- FyreVM Channel I/O (2009) - architectural inspiration
- ADR-091: Text Decorations
- ADR-095: Message Templates
