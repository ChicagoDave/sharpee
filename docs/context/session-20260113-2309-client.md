# Session Summary: 2026-01-13 - client

## Status: Completed (Text Pipeline Architecture - ADR-095, ADR-096)

## Goals
- Implement ADR-095: Message Templates with Formatters
- Implement ADR-096: Text Service Architecture
- Complete Phase 6: Perspective Placeholders
- Wire up new text pipeline throughout the engine
- Ensure all dungeo transcripts pass with new architecture

## Completed

### ADR-095: Message Templates with Formatters (Phase 2)

Implemented comprehensive formatter system for natural language text generation.

**New formatter packages** (`packages/lang-en-us/src/formatters/`):
- `article.ts` (154 lines) - Indefinite (a/an) and definite (the) article selection
- `list.ts` (92 lines) - List joining with Oxford comma: "x, y, and z"
- `text.ts` (83 lines) - Text transformations (cap, upper, etc.)
- `registry.ts` (148 lines) - Formatter registration and resolution engine
- `types.ts` (47 lines) - Type definitions for formatters

**Key features**:
- **Article selection**: Respects noun types (common, proper, mass, unique, plural)
  - `{a:item}` → "a sword" / "an apple" / "Excalibur" / "some water"
- **List formatting**: `{a:items:list}` → "a sword, a key, and a lantern"
- **Formatter chaining**: `{the:items:list:cap}` → "The sword and the key"
- **Noun type system**: Added `nounType` field to IdentityTrait
- **33 formatter tests**: All passing

**Integration**:
- Extended `LanguageProvider.getMessage()` to resolve formatters
- Syntax: `{formatter:placeholder}` (e.g., `{a:item}`, `{list:items}`)
- Formatters transform values before placeholder substitution

### ADR-096: Text Service Architecture (Phases 3-5)

Complete rewrite of text output pipeline based on FyreVM channel I/O pattern.

#### Phase 3: TextBlocks Package Refactor

Redesigned `@sharpee/text-blocks` as pure interfaces package:
- `ITextBlock`: Block of text with semantic key (channel)
- `IDecoration`: Decorated content with type
- `TextContent`: String or IDecoration tree
- Type guards for safe navigation

**Key changes**:
- Removed `priority` and `role` fields (YAGNI)
- Made `type` open string for story extensions (Photopia colors)
- Content is readonly array supporting nested decorations

#### Phase 4: TextService Pipeline Implementation

Refactored `@sharpee/text-service` to pipeline architecture:

```
Events → Filter → Sort → Assemble → TextBlocks
```

**New pipeline stages** (`packages/text-service/src/stages/`):
- `filter.ts` - Skip system events and events without templates
- `sort.ts` - Order events for prose (action.* first, then by chainDepth)
- `assemble.ts` - Convert events to TextBlocks with channel keys

**Event handlers** (`packages/text-service/src/handlers/`):
- `action.ts` - Handle action.* events (success/blocked)
- `room.ts` - Handle room description and name events
- `revealed.ts` - Handle if.event.revealed (container contents)
- `generic.ts` - Fallback handler for other events

**Event sorting for prose order**:
- Sorts events within each transaction (by `transactionId`)
- Priority: action.* first, then by `chainDepth` (lower first)
- Produces natural prose: "You open the chest. Inside you see a sword."

**10 new tests** for event ordering (ADR-094 integration)

#### Phase 5: Engine Integration

Simplified text service wiring per ADR-096 stateless design:

**Deleted obsolete packages**:
- `@sharpee/if-services/text-service.ts` (161 lines) - Old TextService interface
- Removed TextService implementations from all platforms (browser-en-us, cli-en-us, test)
- Deleted ~50 lines of TextServiceContext creation code from engine

**New architecture**:
- Engine creates TextService internally with LanguageProvider
- TextService is pure stateless transformer: `events → TextBlocks`
- No context object needed - events contain all data
- Engine calls `textService.processTurn(events)` after turn completes
- Engine emits `turn-complete` with TextBlocks to client

**Files simplified**:
- `packages/engine/src/game-engine.ts` (-70 lines)
- `packages/platforms/*/src/index.ts` (all platforms simplified)
- Test helpers updated for new architecture

### Phase 6: Perspective Placeholders

Updated 42 action template files to use perspective-aware placeholders.

**Pattern changes**:
```typescript
// Before
'taken': "You take {item}."
'not_visible': "You can't see {target}."

// After
'taken': "{You} {take} {item}."
'not_visible': "{You} {can't} see {target}."
```

**Action files updated** (42 total):
- answering.ts, asking.ts, attacking.ts, climbing.ts
- drinking.ts, eating.ts, entering.ts, examining.ts
- exiting.ts, giving.ts, going.ts, inserting.ts
- inventory.ts, listening.ts, locking.ts, looking.ts
- lowering.ts, pulling.ts, pushing.ts, putting.ts
- quitting.ts, raising.ts, removing.ts, restoring.ts
- saving.ts, scoring.ts, searching.ts, showing.ts
- sleeping.ts, smelling.ts, switching-off.ts, switching-on.ts
- taking-off.ts, talking.ts, telling.ts, throwing.ts
- touching.ts, turning.ts, unlocking.ts, using.ts
- waiting.ts, wearing.ts

**Extended verb recognition** (`placeholder-resolver.ts`):
Added ~40 new verbs to conjugation patterns:
- respond, greet, introduce, swing, graze, land, punch, kick, smash, destroy, strike
- quaff, gulp, sip, nibble, taste, devour, munch, doze, fall, enjoy
- sniff, detect, discover, insert, adjust, lower, raise, tug, drag, press
- inform, grow, toss, poke, prod, pat, stroke, crank, rotate, spin
- toggle, apply, activate, acknowledge

**Result**: All templates now support 1st/2nd/3rd person narrative:
- 2nd person (default): "You take the lamp."
- 1st person: "I take the lamp."
- 3rd person (she/her): "She takes the lamp."
- 3rd person (they/them): "They take the lamp."

### Text Service Bug Fixes

**Bundle entry fix** (`scripts/bundle-entry.js`):
- Updated package references from deleted `text-services` to new `text-blocks` + `text-service`
- Bundle now compiles successfully (1.5mb)

**Missing message templates**:
- Added `contents_list` to `looking.ts`: "You can see {items} here."
- Added `no_exit_that_way` to `going.ts`: "You can't go that way."

**Null safety** (`packages/text-service/src/handlers/generic.ts`):
- Added null check for `event.data` (platform events use `payload` not `data`)
- Prevents crash on UNDO/SAVE commands

**Numeric placeholder support** (`packages/lang-en-us/src/formatters/registry.ts`):
- Extended `formatMessage()` to handle numbers and booleans
- Fixed scoring showing "undefined out of undefined"

### Test Results

**Unit tests**:
- lang-en-us: 294 tests passing (includes 33 formatter tests)
- text-service: 10 event sorting tests passing
- Perspective placeholders: 29 tests passing

**Integration tests**:
- Dungeo transcripts: 1052 passed, 22 failed
- **12 failures fixed** by text service work (all text-related)
- Remaining 22 failures are game logic bugs (glacier, dam controls, etc.)

## Key Decisions

### 1. Formatter Syntax - Modifier Prefix with Colons

**Decision**: Use `{modifier:modifier:placeholder}` syntax for formatters.

**Rationale**:
- Reads left-to-right in application order
- Familiar syntax (similar to Python format specs)
- `{a:item}` reads naturally as "a item" → "a sword"
- Clear separation between modifiers and placeholder name

### 2. Stateless TextService

**Decision**: TextService is a pure transformer function with no state or context object.

**Rationale**:
- Events contain all data needed for rendering
- Engine owns event accumulation and ordering
- Simplifies testing and reasoning about behavior
- Follows functional programming principles

**Impact**: Removed ~200 lines of TextServiceContext creation code.

### 3. Event Sorting for Prose Order

**Decision**: Sort events within each transaction (by `transactionId`) with action.* first, then by `chainDepth`.

**Rationale**:
- Events arrive in emission order, but prose needs different order
- Players expect action result first: "You open the chest."
- Then consequences: "Inside you see a sword."
- Maintains correct order across different transactions

### 4. Noun Type System

**Decision**: Add `nounType` field to IdentityTrait with values: common, proper, mass, unique, plural.

**Rationale**:
- Enables proper article selection ("a sword" vs "Excalibur" vs "some water")
- Supports I18n (different languages have different article rules)
- Default is `common` for backward compatibility

### 5. Keep Verb Placeholders Simple

**Decision**: Use `{verb}` format (e.g., `{take}`, `{open}`) rather than special syntax.

**Rationale**:
- Placeholder resolver already handles conjugation based on perspective
- Simple patterns are more readable for authors
- Extended verb recognition list handles edge cases

### 6. Pipeline Architecture

**Decision**: Structure TextService as explicit filter → sort → assemble pipeline with separate handlers.

**Rationale**:
- Clear separation of concerns (filtering, ordering, assembly)
- Handlers specialize by event type (room, action, revealed)
- Easy to test each stage independently
- Extensible for story-specific event types

## Architectural Notes

### FyreVM Channel I/O Pattern

The new architecture follows FyreVM's channel I/O design (2009):
- Single stream of TextBlocks with semantic keys (channels)
- Client routes blocks by key prefix (`room.*`, `action.*`, `status.*`)
- Stories can define custom channels (`dungeo.thief.taunt`)
- Proven pattern from real-world IF systems

### Text Pipeline Flow

```
1. Player command → Engine processes → Events accumulated
2. Event chains fire → More events accumulated (with transactionId/chainDepth)
3. Turn completes
4. Engine calls TextService.processTurn(events)
5. TextService pipeline:
   a. Filter: Skip system.* events, events without templates
   b. Sort: Order for prose (action.* first, then by chainDepth)
   c. Assemble: For each event:
      i. Handler resolves template via LanguageProvider
      ii. LanguageProvider applies formatters ({a:item} → "a sword")
      iii. Handler assigns channel key (action.result, room.description, etc.)
      iv. Returns ITextBlock
6. TextService returns ITextBlock[]
7. Engine emits 'turn-complete' with blocks
8. Client routes blocks by key (transcript vs status bar)
```

### Separation of Concerns

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Events** | Semantic meaning | `if.event.revealed`, `action.success` |
| **LanguageProvider** | Template + formatter resolution | `{a:items:list}` → "a sword and a key" |
| **TextService** | Event → TextBlock transformation | Assign channel keys, order for prose |
| **Client** | Rendering TextBlocks | Route to transcript/status, apply styling |

### Integration with ADR-094 (Event Chaining)

TextService fully supports ADR-094 event chains:
- `transactionId` groups related events
- `chainDepth` indicates nesting level
- Events sorted within transaction for natural prose
- Example: Opening chest produces action.success + if.event.revealed in correct order

## Files Modified

**New packages/modules** (15 files):
- `packages/lang-en-us/src/formatters/` (6 files, ~560 lines)
- `packages/text-service/src/handlers/` (5 files, ~390 lines)
- `packages/text-service/src/stages/` (4 files, ~139 lines)

**Refactored** (8 files):
- `packages/text-blocks/src/types.ts` - Redesigned ITextBlock interfaces
- `packages/text-service/src/text-service.ts` - Rewritten as pipeline
- `packages/lang-en-us/src/language-provider.ts` - Added formatter integration
- `packages/engine/src/game-engine.ts` - Simplified text service wiring
- `packages/world-model/src/traits/identity/identityTrait.ts` - Added nounType field

**Updated for perspective** (42 files):
- All action files in `packages/lang-en-us/src/actions/`
- `packages/lang-en-us/src/perspective/placeholder-resolver.ts`

**Platform updates** (3 files):
- `packages/platforms/browser-en-us/src/index.ts`
- `packages/platforms/cli-en-us/src/index.ts`
- `packages/platforms/test/src/index.ts`

**Deleted** (1 file):
- `packages/if-services/src/text-service.ts` (161 lines)

**Documentation** (3 files):
- `docs/architecture/adrs/adr-095-message-templates.md` (291 lines)
- `docs/architecture/adrs/adr-096-text-service.md` (504 lines)
- `docs/work/client/README.md` (617 lines) - Implementation plan

**Session summaries** (3 files):
- `docs/context/session-20260113-1334-client.md` (Phase 4 implementation)
- `docs/context/session-20260113-1441-client.md` (Phase 5 wiring)
- `docs/context/session-20260113-2232-client.md` (Phase 6 perspective)

**Total changes**: 50 files changed, 3237 insertions(+), 974 deletions(-)

## Open Items

### Short Term

**Remaining transcript failures** (22 failures):
- Glacier puzzle (4) - North exit not blocked until glacier melted
- Wave-rainbow (2) - Exit blocking issue
- Robot commands (1) - Robot EAST command not working
- Dam controls (6) - Press button output missing
- Other game logic (9) - Various issues

These are **game logic bugs** in story code, not text service issues. Should be addressed in a dungeo-focused session.

**Missing message templates**:
- More may be discovered during dungeo testing
- Consider audit of all stdlib actions for missing templates

### Long Term

**Phase 7: React Client** (Not started):
- React component to render ITextBlock[]
- Route blocks to transcript vs status bar
- Apply decorations as styled components
- Handle story-defined colors

**Client implementation tracking**: See `docs/work/client/README.md` for full roadmap.

**Story color extensions**:
- Define story color configuration format
- Implement color mapping in CLI renderer
- Document custom channel pattern for stories

## Related ADRs

| ADR | Status | Relationship |
|-----|--------|--------------|
| **ADR-089** | Accepted | Foundation - noun types, perspective placeholders |
| **ADR-091** | Accepted | Sibling - decoration syntax `[type:content]` |
| **ADR-094** | Accepted | Integrated - event chaining with transactionId/chainDepth |
| **ADR-095** | Accepted | **Implemented this session** - formatter system |
| **ADR-096** | Accepted | **Implemented this session** - text service architecture |
| **ADR-097** | Planned | Future - React client to consume ITextBlock[] |

## Commit History

Two major commits on client branch:

### Commit ac970ce (Phase 2-4)
```
feat(text): Implement text pipeline and formatter system (ADR-095, ADR-096)

Phase 4: TextService Pipeline
- Add event sorting by transactionId and chainDepth (ADR-094)
- Refactor to pipeline architecture: filter → sort → assemble
- Extract handlers to separate modules (room, action, revealed, generic)
- Add 10 tests for event ordering

Phase 2: Formatter System (ADR-095)
- Add nounType field to IdentityTrait
- Create formatter registry with article, list, and text formatters
- Syntax: {formatter:placeholder} e.g. {a:item}, {list:items}
- Integrate formatters into LanguageProvider.getMessage()
- Add 33 formatter tests
```

### Commit f9213dd (Phase 5)
```
refactor(text-service): Wire up ADR-096 text service architecture

- Delete obsolete TextService interface from if-services
- Simplify text-service to pure stateless transformer per ADR-096
- Change processTurn() to take events as parameter
- Engine creates TextService internally with languageProvider
- Remove ~50 lines of TextServiceContext creation code
- Update all platforms to remove stub TextService implementations
- Update package configs and tsconfig references

The TextService is now a pure function: events → TextBlocks
No context object needed - events contain all data.
```

## Notes

**Session duration**: ~8 hours (spanning multiple sessions 2026-01-13)

**Sessions included**:
1. 11:58 - Phase 2-4 implementation (formatters + pipeline)
2. 14:41 - Phase 5 wiring (engine integration)
3. 15:00 - Bug fixes (bundle, messages, null check, numbers)
4. 22:32 - Phase 6 perspective placeholders (42 action files)

**Approach**:
- Implemented two major ADRs in parallel (ADR-095, ADR-096)
- Test-driven development (33 formatter tests, 10 sorting tests)
- Integration testing via dungeo transcripts (1074 tests)
- Systematic batch updates for perspective placeholders

**Key insight**: The text pipeline architecture significantly simplifies the system:
- TextService went from ~400 lines to ~140 lines (pipeline stages)
- Engine lost ~70 lines of TextServiceContext creation
- All platforms simplified by removing TextService implementations
- Net result: -974 deletions, +3237 insertions (new capabilities > code removed)

**What this enables**:
1. **Natural language generation**: Proper articles, lists, pluralization
2. **Multi-perspective narratives**: 1st/2nd/3rd person support
3. **Event chain prose**: "You open the chest. Inside you see..."
4. **Structured output**: Rich clients (React, GLK) can render decorations
5. **Story extensibility**: Custom formatters, channels, colors

---

**Progressive update**: Session completed 2026-01-13 23:09

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
