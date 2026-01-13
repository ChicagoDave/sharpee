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

### Interface

```typescript
export interface ITextService {
  /**
   * Initialize with game context
   */
  initialize(context: TextServiceContext): void;

  /**
   * Set the language provider for template resolution
   */
  setLanguageProvider(provider: LanguageProvider): void;

  /**
   * Process current turn events and produce TextBlocks
   */
  processTurn(): ITextBlock[];
}
```

### Processing Pipeline

```
Semantic Events
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Event Filtering                      │
│    Skip system.* events                 │
│    Group by type                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. Template Lookup                      │
│    event.messageId → template           │
│    Use LanguageProvider.getTemplate()   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. Formatter Resolution                 │
│    {a:item} → "a sword"                 │
│    Decorations markers preserved        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. Decoration Parsing                   │
│    [item:sword] → IDecoration           │
│    *emphasis* → IDecoration             │
│    Build content tree                   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. Block Assembly                       │
│    Assign key based on event type       │
│    Create ITextBlock                    │
└─────────────────────────────────────────┘
    │
    ▼
ITextBlock[]
```

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

Engine emits one event per turn with all blocks:

```typescript
// Engine side
engine.on('turn-complete', (blocks: ITextBlock[]) => {
  // All blocks for this turn - commands, daemons, NPCs, everything
});

// Submit command
engine.submitCommand(input: string): void;
```

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
| ADR-095 | Defines formatter syntax for template resolution |
| ADR-097 | React client that consumes ITextBlock[] |
| ADR-099 | Future GLK client |
| ADR-100 | Future screen reader client |

## References

- FyreVM Channel I/O (2009) - architectural inspiration
- ADR-091: Text Decorations
- ADR-095: Message Templates
