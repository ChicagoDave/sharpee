# ADR-133: Structured Text Output

## Status
Proposed

## Context

The text pipeline produces structured output (`ITextBlock[]` with semantic keys and decorations) but the engine flattens it to a plain string before delivering it to clients. This was a shortcut to get the text service working — `renderToString()` was convenient but it belongs in the client, not the engine.

This became a concrete blocker during Reflections development, which needs:

- **Multi-character narration**: Three playable characters (Thief, Old Man, Girl) each with distinct narrative voice, routed to separate UI regions
- **Ambient/environmental text**: Distinct from action responses
- **Character-keyed styling**: Decorations and text blocks attributed to specific characters

### Current pipeline

```
ISemanticEvent[] → TextService.processTurn() → ITextBlock[] → renderToString() → string
                                                    ↑                              ↑
                                          keys, decorations              all structure lost
                                          fully intact
```

The shortcut is in `game-engine.ts`, where this happens at two call sites:

```typescript
const blocks = this.textService.processTurn(turnEvents);
const output = renderToString(blocks);      // ← engine flattens to string
if (output) {
  this.emit('text:output', output, turn);   // ← client gets flat text
}
```

The engine is doing rendering work that belongs to the client. Each client has different capabilities — CLI needs a flat string, Zifmia can route blocks to panels, a browser client can map blocks to React components. The engine shouldn't be making that decision.

### What already exists

| Infrastructure | Location | Status |
|---------------|----------|--------|
| `ITextBlock.key` | `packages/text-blocks/src/types.ts` | Populated by TextService, discarded by engine |
| `IDecoration.type` | `packages/text-blocks/src/types.ts` | Open string, supports story-defined types |
| `text:channel` event | `GameEngineEvents` interface | Declared, never emitted (remove — see below) |
| `engine.setTextService()` | `GameEngine` | Works — stories can replace the text service |
| `renderToString()` | `packages/text-blocks` | Utility function, currently misused by engine |

## Design: TextBlock Keys Are Channels

There is no separate "channel" abstraction. `ITextBlock.key` already serves this purpose — it identifies what kind of content the block contains. The engine auto-assigns keys based on event type, and stories can define custom keys for story-specific output streams.

### Standard keys (auto-assigned by TextService)

These map naturally from event types that the engine already knows about:

| Key | Content | FyreVM equivalent |
|-----|---------|-------------------|
| `location` | Room name/description | LOCN |
| `score` | Score value | SCOR |
| `score.notify` | Score change notification text | SNOT |
| `time` | Turn counter | TIME |
| `death` | Death/game-over text | DEAD |
| `turn` | Turn number | TURN |
| `info` | Story metadata (title, author, IFID) | INFO |

There is no `main` key. Action responses, examination text, NPC dialogue — these are all distinct event types that TextService already differentiates via `ITextBlock.key`. A catch-all bucket would undo the structure that TextService produces.

There is no `prompt` key. The input prompt is client-owned in Sharpee/Zifmia — it's a UI concern, not part of the text output stream.

### Story-defined keys

Stories produce custom keys through their TextService or by decorating events:

```typescript
// Thief daemon produces a taunt event
// TextService maps it to a block with key 'dungeo.thief.taunt'

// Reflections character narration
// keys: 'narration.thief', 'narration.oldman', 'narration.girl'
```

No upfront registration required. Any key used in a TextBlock just works. The client handles whatever arrives — unknown keys can fall back to default rendering.

## Proposed Solution

### 1. Remove `renderToString()` from the engine

Replace both call sites in `game-engine.ts`:

**Before:**
```typescript
const blocks = this.textService.processTurn(turnEvents);
const output = renderToString(blocks);
if (output) {
  this.emit('text:output', output, turn);
}
```

**After:**
```typescript
const blocks = this.textService.processTurn(turnEvents);
if (blocks.length > 0) {
  this.emit('text:output', blocks, turn);
}
```

The engine no longer imports or calls `renderToString()`.

### 2. Change `text:output` signature

```typescript
// Before
'text:output': (text: string, turn: number) => void;

// After
'text:output': (blocks: ITextBlock[], turn: number) => void;
```

### 3. Add `blocks` to `TurnResult`

```typescript
export interface TurnResult {
  // ... existing fields ...

  /**
   * Structured text blocks from TextService, with semantic keys intact.
   * Clients render these according to their capabilities.
   */
  blocks: ITextBlock[];
}
```

This replaces the flat text that callers of `executeTurn()` currently get via `text:output` event listeners.

### 4. Remove `text:channel` from `GameEngineEvents`

The declared-but-never-emitted `text:channel` event is unnecessary. Clients that need per-key routing iterate `blocks` and group by `key`. No separate per-channel event needed.

### 5. Move `renderToString()` to client layer

`renderToString()` stays in the `text-blocks` package as a utility. Clients that need flat text call it themselves:

**CLI client:**
```typescript
engine.on('text:output', (blocks, turn) => {
  const text = renderToString(blocks);
  process.stdout.write(text);
});
```

**Zifmia client:**
```typescript
engine.on('text:output', (blocks, turn) => {
  for (const block of blocks) {
    this.routeToPanel(block.key, block);
  }
});
```

**Browser/React client:**
```typescript
engine.on('text:output', (blocks, turn) => {
  // Map blocks to React components by key
  setOutputBlocks(prev => [...prev, ...blocks]);
});
```

## Migration

This is a breaking change to `GameEngineEvents` and `TurnResult`. Downstream consumers:

| Consumer | Change needed |
|----------|--------------|
| CLI client | Add `renderToString(blocks)` call |
| Transcript tester | Add `renderToString(blocks)` call |
| Zifmia runner | Add `renderToString(blocks)` call (or route by key) |
| Browser client | Add `renderToString(blocks)` call (or map to components) |

All consumers currently receive a string and display it. The minimal migration is to add one `renderToString()` call at each site. Richer clients can then incrementally adopt per-key routing.

## Scope

This ADR covers the engine change only — stop flattening, deliver structure. How each client uses that structure (panel routing, React components, styled regions) is client-specific work outside this ADR.

## Related ADRs

| ADR | Relationship |
|-----|-------------|
| ADR-096 | Defines ITextBlock with semantic keys — the structured output this ADR preserves |
| ADR-100 | Screen reader accessibility — structured blocks enable per-block ARIA semantics instead of flat-text containers |
| ADR-125 | Zifmia Panels — block keys map naturally to panel routing |
| ADR-132 | PC switching — `pc:switched` event produces blocks that clients can render per-character |
