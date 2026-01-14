# Session Summary: 2026-01-13 - client

## Status: Completed

## Goals
- Implement text output pipeline architecture (ADR-096)
- Implement message template formatters (ADR-095)
- Complete event chaining with transactionId metadata (ADR-094)
- Establish foundation for React client (ADR-097)

## Completed

### Phase 1: Event Chaining Metadata (ADR-094)
- Added `transactionId` to all semantic events for grouping events from single player action
- Added `chainDepth` tracking to event metadata (0 = original, 1+ = chained)
- Implemented `chainedFrom` tracking to show which event triggered a chain
- Engine now assigns transactionId at start of each turn
- EventProcessor propagates transactionId and increments chainDepth for chained events

**Files**:
- `packages/engine/src/interfaces/events.ts` - Added EventMeta with transactionId, chainDepth
- `packages/engine/src/services/event/event-processor.ts` - Metadata propagation logic
- `packages/engine/src/services/game-service.ts` - TransactionId generation

### Phase 2: Message Template Formatters (ADR-095)
- Extended IdentityTrait with `nounType` field ('common'|'proper'|'mass'|'unique'|'plural')
- Created comprehensive formatter system in `packages/lang-en-us/src/formatters/`:
  - **types.ts**: Core types (`Formatter`, `FormatterContext`, `EntityInfo`)
  - **registry.ts**: `createFormatterRegistry()`, `formatMessage()`, `applyFormatters()`
  - **article.ts**: Article formatters - `{a:item}`, `{the:item}`, `{some:item}`, `{your:item}`
  - **list.ts**: List formatters - `{list:items}`, `{or-list:items}`, `{comma-list:items}`, `{count:items}`
  - **text.ts**: Text transformers - `{cap:text}`, `{upper:text}`, `{lower:text}`, `{title:text}`
- Integrated formatter registry into LanguageProvider's `getMessage()` method
- Formatters apply left-to-right: `{a:items:list}` → add articles → join list

**Examples**:
```typescript
// Article selection by noun type
{a:item} where item.nounType === 'common' → "a sword" / "an apple"
{a:item} where item.nounType === 'proper' → "Excalibur" (no article)
{a:item} where item.nounType === 'mass' → "some water"

// List formatting
{a:items:list} with ['sword', 'key'] → "a sword and a key"
{the:items:or-list} with ['north', 'south', 'west'] → "the north, the south, or the west"

// Chaining formatters
{a:items:list:cap} → "A sword and a key"
```

**Tests**: 33 formatter tests (294 total passing in lang-en-us)

### Phase 3: Text Blocks Package (ADR-096)
- Created `@sharpee/text-blocks` package - pure interfaces, zero dependencies
- Defined core types:
  - `ITextBlock` - channel key + content array
  - `IDecoration` - semantic decoration with open string type
  - `TextContent` - string | IDecoration union type
- Added type guards: `isDecoration()`, `isTextBlock()`
- Established contract for text service → client communication

**Design decisions**:
- No `priority` field (YAGNI - derive from key conventions if needed)
- No `role` field (YAGNI - unclear value)
- `type` is open string to support story extensions (Photopia color pattern)
- `content` is readonly array for immutability and nesting support

### Phase 4: Text Service Implementation (ADR-096)
- Created `@sharpee/text-service` package replacing fragmented text services
- Implemented **three-stage pipeline architecture**:
  1. **Filter Stage** (`stages/filter.ts`) - Skip system.* events, filter by template existence
  2. **Sort Stage** (`stages/sort.ts`) - Sort events within transaction for prose order
  3. **Assemble Stage** (`stages/assemble.ts`) - Convert events to TextBlocks

**Event Sorting Logic** (critical for prose coherence):
```typescript
// Within same transaction:
// 1. action.* events first (success/blocked)
// 2. Then by chainDepth (lower first)
// 3. Preserves order across different transactions
```

**Event Handlers** (`handlers/`):
- **room.ts**: Room descriptions, room names, exits
- **action.ts**: Action success/blocked messages
- **revealed.ts**: `if.event.revealed` chain event handler
- **generic.ts**: Fallback handler for any event with template
- **types.ts**: Handler registry and dispatcher

**Event to Key Mapping**:
| Event Type | Block Key |
|------------|-----------|
| `if.event.room_description` | `room.description` |
| `if.event.room.name` | `room.name` |
| `action.success` | `action.result` |
| `action.blocked` | `action.blocked` |
| `if.event.revealed` | `action.result` (prose continuation) |
| `if.event.opened` | (no output - state event only) |

**Tests**: 10 tests covering event sorting, filtering, and assembly

### Phase 5: Package Integration
- Fixed `@sharpee/text-blocks` exports (main, module, types fields)
- Fixed `@sharpee/text-service` exports configuration
- Updated platform packages to use new text architecture:
  - `@sharpee/platforms/browser-en-us`
  - `@sharpee/platforms/test`
  - Updated stories (cloak-of-darkness, dungeo, reflections)
- Wired TextService into engine turn completion flow
- Removed deprecated text service packages (moved to archive/)

**Deprecated/Archived**:
- `packages/text-service-browser/` (deleted)
- `packages/text-service-template/` (deleted)
- `packages/text-services/` (deleted)

## Key Decisions

### 1. Pipeline Architecture Over Monolithic Service
**Decision**: Split TextService into distinct stages (filter → sort → assemble) with specialized event handlers.

**Rationale**:
- Clear separation of concerns (filtering logic separate from sorting logic)
- Testable stages in isolation
- Event sorting is critical for prose coherence - deserved dedicated stage
- Handler registry pattern allows extensibility (stories can register custom handlers)

**Implementation**:
```
Events → Filter (skip system.*, no-template)
       → Sort (transaction + chainDepth order)
       → Assemble (handlers convert to TextBlocks)
       → ITextBlock[]
```

### 2. TransactionId for Event Grouping
**Decision**: All events from single player action share `transactionId` in metadata.

**Rationale**:
- Enables correct prose ordering (action result before chained consequences)
- Supports debugging/tracing event flow
- Allows TextService to group related events for narrative coherence
- Foundation for future features (paragraph grouping, undo by transaction)

**From ADR-094**: Engine assigns transaction ID at turn start, all emitted events (including chained) inherit the same ID.

### 3. Formatter-First Template Resolution
**Decision**: Formatters resolve in `LanguageProvider.getMessage()` BEFORE TextService sees the text.

**Rationale**:
- Clean separation: formatters transform values, decorations annotate presentation
- TextService only handles decoration parsing, not value transformation
- Formatters are language-layer concern (vary by locale)
- Allows formatter chaining without decoration parser involvement

**Flow**:
```
Template: "You take [item:{the:item}]."
         → LanguageProvider applies {the:item} formatter
Result:   "You take [item:the sword]."
         → TextService parses [item:...] decoration
Output:   ITextBlock with decorated content
```

### 4. Event Sorting Within Transactions
**Decision**: Sort events within each transaction to place `action.*` events first, then by `chainDepth`.

**Rationale**:
- Prose requires action result before consequences
- Example: "You open the chest. Inside you see..." (not "Inside... You open...")
- Chained events have depth 1+, should appear after depth 0 events
- Stable sort preserves order across different transactions (NPC turns, daemons)

**Algorithm**:
```typescript
sort((a, b) => {
  // Different transactions: preserve original order
  if (a.meta?.transactionId !== b.meta?.transactionId) return 0;

  // Same transaction: action.* first
  if (a.type.startsWith('action.') && !b.type.startsWith('action.')) return -1;
  if (!a.type.startsWith('action.') && b.type.startsWith('action.')) return 1;

  // Then by chain depth
  return (a.meta?.chainDepth ?? 0) - (b.meta?.chainDepth ?? 0);
});
```

### 5. Handler Registry Pattern
**Decision**: Event handlers registered by type prefix, with fallback to generic handler.

**Rationale**:
- Extensibility: Stories can register custom handlers for custom event types
- Specialization: Different logic for room events vs action events vs revealed events
- Maintainability: Each handler focuses on one event category
- Fallback: Generic handler ensures all events with templates produce output

**Registry Structure**:
```typescript
const handlers = new Map<string, EventHandler>();
handlers.set('if.event.room_description', roomDescriptionHandler);
handlers.set('if.event.revealed', revealedHandler);
handlers.set('action.success', actionSuccessHandler);
// ... etc

// Lookup with fallback
const handler = handlers.get(event.type) ?? genericHandler;
```

## Architectural Notes

### The TextService Contract

TextService is a **pure transformer** - stateless, side-effect-free:

```typescript
interface ITextService {
  processTurn(events: ISemanticEvent[]): ITextBlock[];
}
```

**Key properties**:
- No event listening - Engine pushes events to it
- No world queries - all data in event.data
- No client coupling - returns data structure, clients decide rendering
- Testable - pure function transformation

### Channel-Based Output (FyreVM Pattern)

Inspired by FyreVM Channel I/O (2009, Cornelson/McGrew/Panici):

**One stream, many channels**:
- TextBlocks have `key` field acting as channel identifier
- Client routes blocks by key prefix
- Status blocks (`status.*`) → status bar slots
- Transcript blocks (`action.*`, `room.*`) → main transcript
- Story blocks (custom keys) → client decides routing

**Benefits**:
- No hard-coded UI assumptions in platform code
- Stories can extend with custom channels
- Clients can specialize rendering per channel
- Screen readers can prioritize certain channels

### Integration Points

**Engine → TextService**:
```typescript
// Inside Engine.processTurn()
const blocks = this.textService.processTurn(events);
this.emit('turn-complete', blocks);
```

**Client ← Engine**:
```typescript
engine.on('turn-complete', (blocks: ITextBlock[]) => {
  const statusBlocks = blocks.filter(b => b.key.startsWith('status.'));
  const transcriptBlocks = blocks.filter(b => !b.key.startsWith('status.'));

  updateStatusBar(statusBlocks);
  appendToTranscript(transcriptBlocks);
});
```

**No direct TextService ↔ Client connection** - Engine mediates.

### Event Chaining Flow

Example: Opening a chest with contents

```
Player: "open chest"

Events accumulated by Engine (emission order):
1. if.event.opened      { transactionId: 'txn-abc', chainDepth: 0 }
2. if.event.revealed    { transactionId: 'txn-abc', chainDepth: 1, chainedFrom: 'if.event.opened' }
3. action.success       { transactionId: 'txn-abc', chainDepth: 0 }

TextService sorts for prose order:
1. action.success       → "You open the wooden chest."
2. if.event.opened      → (no template, skipped)
3. if.event.revealed    → "Inside you see a sword and a key."

Output:
[
  { key: 'action.result', content: ['You open the wooden chest.'] },
  { key: 'action.result', content: ['Inside you see a sword and a key.'] }
]

Client renders:
> You open the wooden chest. Inside you see a sword and a key.
```

**Critical insight**: Sorting by `action.*` first + `chainDepth` ensures narrative coherence.

## Open Items

### Short Term
- [ ] Implement decoration parser for `[type:content]` syntax (ADR-091)
- [ ] Add CLI renderer to text-service package
- [ ] Wire up React client skeleton (ADR-097)
- [ ] Test with dungeo transcripts to verify prose quality

### Long Term
- [ ] Implement story-defined decoration types (Photopia color pattern)
- [ ] Add paragraph grouping for related events
- [ ] Status block updates (score, turns, health)
- [ ] Screen reader accessibility features
- [ ] GLK client integration (ADR-099)

## Files Modified

**Core Packages** (18 files):
- `packages/text-blocks/package.json` - New package
- `packages/text-blocks/src/index.ts` - ITextBlock, IDecoration, TextContent types
- `packages/text-blocks/src/types.ts` - Core type definitions
- `packages/text-blocks/tsconfig.json` - TypeScript configuration
- `packages/text-service/package.json` - New package replacing text-services
- `packages/text-service/src/index.ts` - Main exports
- `packages/text-service/src/text-service.ts` - TextService implementation
- `packages/text-service/src/stages/filter.ts` - Event filtering stage
- `packages/text-service/src/stages/sort.ts` - Event sorting stage
- `packages/text-service/src/stages/assemble.ts` - TextBlock assembly stage
- `packages/text-service/src/handlers/room.ts` - Room event handlers
- `packages/text-service/src/handlers/action.ts` - Action event handlers
- `packages/text-service/src/handlers/revealed.ts` - Revealed event handler
- `packages/text-service/src/handlers/generic.ts` - Fallback handler
- `packages/text-service/src/handlers/types.ts` - Handler registry types
- `packages/text-service/tests/text-service.test.ts` - 10 tests for sorting/assembly
- `packages/text-service/tsconfig.json` - TypeScript configuration
- `packages/text-service/vitest.config.ts` - Test configuration

**Engine** (3 files):
- `packages/engine/src/interfaces/events.ts` - Added EventMeta interface
- `packages/engine/src/services/event/event-processor.ts` - TransactionId propagation
- `packages/engine/src/services/game-service.ts` - TransactionId generation

**Language Layer** (9 files):
- `packages/lang-en-us/src/formatters/types.ts` - Formatter, FormatterContext, EntityInfo
- `packages/lang-en-us/src/formatters/registry.ts` - Registry implementation
- `packages/lang-en-us/src/formatters/article.ts` - Article formatters (a, the, some, your)
- `packages/lang-en-us/src/formatters/list.ts` - List formatters (list, or-list, count)
- `packages/lang-en-us/src/formatters/text.ts` - Text transformers (cap, upper, lower)
- `packages/lang-en-us/src/index.ts` - Export formatters
- `packages/lang-en-us/src/language-provider.ts` - Integrated formatters into getMessage()
- `packages/lang-en-us/tests/formatters.test.ts` - 33 formatter tests
- `packages/world-model/src/traits/identity-trait.ts` - Added nounType field

**Platform Packages** (6 files):
- `packages/platforms/browser-en-us/package.json` - Updated dependencies
- `packages/platforms/browser-en-us/src/index.ts` - Use new text-service
- `packages/platforms/test/package.json` - Updated dependencies
- `packages/platforms/test/src/index.ts` - Use new text-service
- `packages/sharpee/package.json` - Updated exports
- `packages/sharpee/src/index.ts` - Export text-blocks and text-service

**Stories** (4 files):
- `stories/cloak-of-darkness/package.json` - Updated dependencies
- `stories/dungeo/package.json` - Updated dependencies
- `stories/reflections/package.json` - Updated dependencies
- `stories/reflections/tsconfig.json` - Build configuration

**Deleted** (9 files):
- `packages/text-service-browser/` - Replaced by unified text-service
- `packages/text-service-template/` - Obsolete template pattern
- `packages/text-services/` - Fragmented implementations consolidated

**Configuration** (3 files):
- `pnpm-lock.yaml` - Dependency updates
- `package.json` - Workspace configuration
- `.architecture-metrics.json` - Architecture metrics update

**Total**: 52 files modified/created, 9 deleted

## Test Coverage

**Lang-en-us**: 294 tests passing (33 formatter tests added)
- Article formatters: a/an selection, noun type handling
- List formatters: and-list, or-list, comma-list, count
- Text transformers: cap, upper, lower, title
- Chained formatters: {a:items:list:cap}

**Text Service**: 10 tests passing
- Event filtering (system.* events, no-template events)
- Event sorting (transactionId grouping, action.* priority, chainDepth ordering)
- TextBlock assembly (key assignment, content preservation)
- Handler dispatch (type-specific handlers, generic fallback)

## Notes

**Session duration**: ~4 hours

**Approach**: Implemented text architecture redesign across 5 ADRs in vertical slices. Each phase built on previous:
1. Event metadata (ADR-094) - foundation for grouping/ordering
2. Formatters (ADR-095) - value transformation before presentation
3. TextBlocks (ADR-096) - contract for client communication
4. TextService pipeline (ADR-096) - event → TextBlock transformation
5. Integration - wiring everything together

**Key insight**: Sorting events by `action.*` first + `chainDepth` is critical for prose coherence. Early implementation attempts without sorting produced confusing output like "Inside you see items. You opened the chest."

**Architecture pattern**: Following FyreVM channel I/O model (2009) for structured output enables rich client experiences while maintaining platform/client separation.

---

**Progressive update**: Session completed 2026-01-13 13:34

**Next session**: Implement decoration parser (ADR-091) and CLI renderer, then test with dungeo transcripts to verify prose quality in real gameplay scenarios.
