# Client Implementation Plan

**Branch**: `client`
**ADRs**: 089, 091, 095, 096, 097

## Overview

This work implements the complete text output pipeline from semantic events to rendered UI. The architecture follows FyreVM channel I/O patterns: a single TextService produces structured `ITextBlock[]` output that multiple renderers (CLI, React) can consume.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                   │
│                                                                      │
│  Engine accumulates events (including chains from ADR-094)           │
│       │                                                              │
│       ▼                                                              │
│  TextService.processTurn(events)                                     │
│       │                                                              │
│       ├─→ Filter (skip system.*, no-template events)                 │
│       ├─→ Sort within transactions (ADR-094 metadata)                │
│       ├─→ Resolve templates via LanguageProvider (ADR-095)           │
│       ├─→ Parse decorations (ADR-091)                                │
│       └─→ Produce ITextBlock[] (ADR-096)                             │
│                   │                                                  │
│                   ▼                                                  │
│  Engine emits 'turn-complete' with blocks                            │
│                   │                                                  │
│       ┌──────────┴──────────┐                                        │
│       ▼                     ▼                                        │
│  CLI Renderer          React Client                                  │
│  (ANSI strings)        (JSX components)                              │
└─────────────────────────────────────────────────────────────────────┘
```

## ADR Dependencies

| ADR | Topic | Status | This Work |
|-----|-------|--------|-----------|
| 089 | Pronoun/Identity System | Phases A-D complete | Phase E: Verb conjugation |
| 091 | Text Decorations | Accepted | Implement parser |
| 094 | Event Chaining | Complete | Use transactionId for sorting |
| 095 | Message Templates | Accepted | Implement formatters |
| 096 | Text Service | Accepted | Full implementation |
| 097 | React Client | Accepted | Full implementation |

## New Packages

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| `@sharpee/text-blocks` | Pure interfaces (ITextBlock, IDecoration) | None |
| `@sharpee/text-service` | TextService + CLI renderer | text-blocks, lang-en-us |
| `@sharpee/client-react` | React components | text-blocks, react |

## Archived Packages

These packages are deprecated and should be archived (not deleted):

- `@sharpee/text-services` → `archive/text-services`
- `@sharpee/text-service-browser` → `archive/text-service-browser`
- `@sharpee/text-service-template` → `archive/text-service-template`

---

## Phase 1: Text Blocks Interface Package

**Goal**: Create pure interfaces package with zero dependencies.

### Tasks

1. Create `packages/text-blocks/` package structure
2. Define core types:
   ```typescript
   export type TextContent = string | IDecoration;

   export interface IDecoration {
     readonly type: string;
     readonly content: ReadonlyArray<TextContent>;
   }

   export interface ITextBlock {
     readonly key: string;
     readonly content: ReadonlyArray<TextContent>;
   }
   ```
3. Add type guards: `isDecoration()`, `isTextBlock()`
4. Export all types from index.ts
5. Configure package.json with proper exports

### Files

- `packages/text-blocks/package.json`
- `packages/text-blocks/src/index.ts`
- `packages/text-blocks/src/types.ts`
- `packages/text-blocks/tsconfig.json`

### Acceptance Criteria

- [ ] Package builds without errors
- [ ] Types are importable from `@sharpee/text-blocks`
- [ ] No runtime dependencies

---

## Phase 2: Formatter System (ADR-095)

**Goal**: Implement message template formatters in language layer.

### Formatter Syntax

```
{formatter:formatter:...:placeholder}
```

Example: `{a:items:list}` → applies `a` formatter, then `list` formatter to items.

### Built-in Formatters

| Formatter | Description | Example |
|-----------|-------------|---------|
| `a` | Indefinite article | `{a:item}` → "a sword" / "an apple" |
| `the` | Definite article | `{the:item}` → "the sword" |
| `some` | Mass noun article | `{some:item}` → "some water" |
| `list` | Join with ", " and "and" | `{items:list}` → "x, y, and z" |
| `or-list` | Join with ", " and "or" | `{items:or-list}` → "x, y, or z" |
| `cap` | Capitalize first letter | `{name:cap}` → "Sword" |
| `upper` | All uppercase | `{name:upper}` → "SWORD" |
| `plural` | Pluralize noun | `{item:plural}` → "swords" |
| `count` | Number + noun | `{items:count}` → "3 swords" |

### Noun Types

Add to `IdentityTrait`:
```typescript
nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
article?: string;  // Override for edge cases
```

### Tasks

1. Add `nounType` and `article` to IdentityTrait
2. Create formatter registry in lang-en-us
3. Implement article formatters (`a`, `the`, `some`)
4. Implement list formatters (`list`, `or-list`)
5. Implement text formatters (`cap`, `upper`)
6. Implement noun formatters (`plural`, `count`)
7. Update `formatMessage()` to parse and apply formatters
8. Add story formatter registration API

### Files

- `packages/world-model/src/traits/identity/identity-trait.ts` (update)
- `packages/lang-en-us/src/formatters/index.ts` (new)
- `packages/lang-en-us/src/formatters/article-formatters.ts` (new)
- `packages/lang-en-us/src/formatters/list-formatters.ts` (new)
- `packages/lang-en-us/src/formatters/text-formatters.ts` (new)
- `packages/lang-en-us/src/formatter-registry.ts` (new)
- `packages/lang-en-us/src/language-provider.ts` (update)

### Acceptance Criteria

- [ ] `{a:item}` produces "a sword" / "an apple" based on first letter
- [ ] `{a:item}` respects noun types (proper nouns get no article)
- [ ] `{items:list}` produces "a, b, and c"
- [ ] Formatters can chain: `{a:items:list:cap}` works
- [ ] Stories can register custom formatters

---

## Phase 3: Decoration Parser (ADR-091)

**Goal**: Parse decoration syntax from resolved template text.

### Decoration Syntax

| Syntax | Purpose |
|--------|---------|
| `[type:content]` | Semantic decoration |
| `*text*` | Emphasis |
| `**text**` | Strong emphasis |

### Parser Requirements

- Handle nested decorations: `[item:*glowing* lantern]`
- Support escaping: `\*`, `\[`, `\]`
- Graceful degradation: unclosed markers treated as literal

### Tasks

1. Create decoration parser module
2. Implement bracket decoration parsing `[type:content]`
3. Implement emphasis parsing `*text*` and `**text**`
4. Handle nesting and escaping
5. Write comprehensive tests for edge cases

### Files

- `packages/text-service/src/parser/decoration-parser.ts` (new)
- `packages/text-service/tests/decoration-parser.test.ts` (new)

### Acceptance Criteria

- [ ] `[item:sword]` → `{ type: 'item', content: ['sword'] }`
- [ ] `*emphasis*` → `{ type: 'em', content: ['emphasis'] }`
- [ ] `**strong**` → `{ type: 'strong', content: ['strong'] }`
- [ ] Nested: `[item:*glowing* lantern]` parses correctly
- [ ] Escaped: `\*literal\*` outputs `*literal*`
- [ ] Unclosed `*text` outputs literal `*text`

---

## Phase 4: Text Service Package (ADR-096)

**Goal**: Create TextService that transforms events to TextBlocks.

### Interface

```typescript
export interface ITextService {
  processTurn(events: ISemanticEvent[]): ITextBlock[];
}

export function createTextService(languageProvider: LanguageProvider): ITextService;
```

### Processing Pipeline

1. **Filter**: Skip `system.*` events and events without templates
2. **Sort**: Within transactions, action.* first, then by chainDepth
3. **Resolve**: Look up template, apply formatters via LanguageProvider
4. **Parse**: Convert decoration markers to IDecoration tree
5. **Assemble**: Create ITextBlock with appropriate key

### Event to Key Mapping

| Event Type | Block Key |
|------------|-----------|
| `if.event.room_description` | `room.description` |
| `if.event.room.name` | `room.name` |
| `action.success` | `action.result` |
| `action.blocked` | `action.blocked` |
| `if.event.revealed` | `action.result` |
| Story events | Derived from type |

### Tasks

1. Create `packages/text-service/` package structure
2. Implement event filtering logic
3. Implement event sorting (using transactionId, chainDepth from ADR-094)
4. Implement template lookup and formatter resolution
5. Integrate decoration parser
6. Implement block assembly with key mapping
7. Write unit tests for each pipeline stage

### Files

- `packages/text-service/package.json`
- `packages/text-service/src/index.ts`
- `packages/text-service/src/text-service.ts`
- `packages/text-service/src/event-filter.ts`
- `packages/text-service/src/event-sorter.ts`
- `packages/text-service/src/block-assembler.ts`
- `packages/text-service/tests/text-service.test.ts`
- `packages/text-service/tsconfig.json`

### Acceptance Criteria

- [ ] `processTurn([])` returns `[]`
- [ ] System events are filtered out
- [ ] Events without templates are filtered out
- [ ] Events within same transaction sorted correctly
- [ ] Templates resolved with formatters
- [ ] Decorations parsed into structured content
- [ ] Block keys assigned correctly

---

## Phase 5: CLI Renderer

**Goal**: Render ITextBlock[] to ANSI strings for terminal output.

### Interface

```typescript
export function renderToString(
  blocks: ITextBlock[],
  options?: CLIRenderOptions
): string;

export interface CLIRenderOptions {
  ansi?: boolean;           // Enable ANSI color codes
  blockSeparator?: string;  // Separator between blocks
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

### Tasks

1. Create CLI renderer module
2. Implement decoration-to-ANSI mapping
3. Implement plain text fallback
4. Handle story-defined colors (approximate to ANSI)
5. Write tests

### Files

- `packages/text-service/src/renderers/cli-renderer.ts`
- `packages/text-service/tests/cli-renderer.test.ts`

### Acceptance Criteria

- [ ] Renders blocks to string
- [ ] ANSI mode produces colored output
- [ ] Plain mode produces readable text
- [ ] Unknown decoration types render content without decoration
- [ ] Story colors approximated to nearest ANSI

---

## Phase 6: Perspective Placeholders (ADR-089 Phase E)

**Goal**: Implement `{You}`, `{your}`, `{take}` etc. placeholders based on narrative perspective.

### Placeholder Resolution

| Placeholder | 2nd Person | 1st Person | 3rd (she/her) | 3rd (they/them) |
|-------------|------------|------------|---------------|-----------------|
| `{You}` | You | I | She | They |
| `{you}` | you | I | she | they |
| `{your}` | your | my | her | their |
| `{take}` | take | take | takes | take |
| `{have}` | have | have | has | have |
| `{are}` | are | am | is | are |

### Tasks

1. Create perspective placeholder resolver
2. Implement verb conjugation table for common verbs
3. Integrate with LanguageProvider
4. Update templates to use perspective placeholders
5. Test all three perspectives

### Files

- `packages/lang-en-us/src/perspective/index.ts` (new)
- `packages/lang-en-us/src/perspective/verb-conjugation.ts` (new)
- `packages/lang-en-us/src/perspective/pronouns.ts` (new)

### Acceptance Criteria

- [ ] `{You} {take} {the:item}` → "You take the sword" (2nd person)
- [ ] `{You} {take} {the:item}` → "I take the sword" (1st person)
- [ ] `{You} {take} {the:item}` → "She takes the sword" (3rd person she/her)
- [ ] Verb conjugation handles irregular verbs (be, have, do, go)

---

## Phase 7: React Client Package (ADR-097)

**Goal**: Create React components for web/Electron deployment.

### Components

```
<Game>
├── <StatusBar>      (status.* blocks)
├── <Transcript>     (other blocks, scrollable)
└── <CommandInput>   (user input)
```

### Props

```typescript
interface GameProps {
  engine: IGameEngine;
  config?: GameConfig;
}

interface GameConfig {
  colors?: Record<string, string>;  // Story-defined colors
  theme?: 'classic' | 'dark' | 'light';
  showScore?: boolean;
  showTurns?: boolean;
}
```

### Tasks

1. Create `packages/client-react/` package structure
2. Implement `<Game>` root component with state management
3. Implement `<StatusBar>` with slot routing
4. Implement `<Transcript>` with auto-scroll
5. Implement `<CommandInput>` with history
6. Implement `renderContent()` for decoration rendering
7. Add base CSS styles
8. Add story color configuration
9. Add accessibility features (ARIA, keyboard nav)

### Files

- `packages/client-react/package.json`
- `packages/client-react/src/index.ts`
- `packages/client-react/src/components/Game.tsx`
- `packages/client-react/src/components/StatusBar.tsx`
- `packages/client-react/src/components/Transcript.tsx`
- `packages/client-react/src/components/CommandInput.tsx`
- `packages/client-react/src/utils/renderContent.tsx`
- `packages/client-react/src/styles/sharpee.css`
- `packages/client-react/tsconfig.json`

### Acceptance Criteria

- [ ] Game component connects to engine and receives blocks
- [ ] StatusBar displays room, score, turns
- [ ] Transcript renders blocks with decorations
- [ ] CommandInput submits commands to engine
- [ ] Story-defined colors render correctly
- [ ] Keyboard accessible (tab, up/down history)
- [ ] Screen reader compatible (ARIA live regions)

---

## Phase 8: Engine Integration

**Goal**: Wire TextService into engine turn cycle.

### Changes to Engine

1. Engine creates TextService at startup
2. After turn completes (all events collected, chains resolved), call `textService.processTurn(events)`
3. Emit `'turn-complete'` event with `ITextBlock[]`

### Interface

```typescript
// Engine event
engine.on('turn-complete', (blocks: ITextBlock[]) => { ... });

// Engine method
engine.submitCommand(input: string): void;
```

### Tasks

1. Add TextService as engine dependency
2. Update turn cycle to call TextService after event collection
3. Update `'turn-complete'` event to emit ITextBlock[]
4. Update transcript tester to use new text service
5. Verify dungeo transcripts pass

### Files

- `packages/engine/src/engine.ts` (update)
- `packages/engine/src/types.ts` (update)
- `packages/transcript-tester/src/runner.ts` (update)

### Acceptance Criteria

- [ ] Engine emits ITextBlock[] on turn-complete
- [ ] Existing transcript tests pass
- [ ] dungeo transcripts render correctly

---

## Phase 9: Archive Old Packages

**Goal**: Clean up deprecated packages.

### Tasks

1. Create `archive/` directory
2. Move deprecated packages:
   - `packages/text-services` → `archive/text-services`
   - `packages/text-service-browser` → `archive/text-service-browser`
   - `packages/text-service-template` → `archive/text-service-template`
3. Update root `package.json` workspace patterns
4. Verify build still works

### Acceptance Criteria

- [ ] Old packages moved to archive
- [ ] workspace excludes archive directory
- [ ] Full build passes

---

## Phase 10: Integration Testing

**Goal**: Verify complete pipeline works end-to-end.

### Tasks

1. Create integration test that:
   - Creates engine with TextService
   - Runs commands
   - Verifies ITextBlock[] output
2. Test with dungeo story
3. Test in browser (React client)
4. Test in CLI (ANSI renderer)
5. Test event chaining produces correct prose order

### Test Cases

| Test | Verifies |
|------|----------|
| Open container | Chain events render in order (action result then revealed) |
| Room description | Decoration parsing for room names, exits |
| NPC interaction | Pronoun resolution and perspective |
| Story colors | Custom decoration types render correctly |
| Ambiguous command | Error messages use formatters correctly |

### Acceptance Criteria

- [ ] All dungeo transcripts pass
- [ ] React client renders dungeo correctly
- [ ] CLI renderer produces readable output
- [ ] Event chains produce coherent prose

---

## Implementation Order

```
Phase 1: text-blocks        ──┐
                              │
Phase 2: formatters         ──┼─→ Phase 4: text-service ─┐
                              │                          │
Phase 3: decoration parser  ──┘                          │
                                                         │
Phase 5: CLI renderer      ←─────────────────────────────┘
                                                         │
Phase 6: perspective       ←─────────────────────────────┘
                                                         │
Phase 7: client-react      ←─────────────────────────────┼─→ Phase 8: engine integration
                                                         │
Phase 9: archive           ←─────────────────────────────┘
                                                         │
Phase 10: integration      ←─────────────────────────────┘
```

### Parallelization Notes

- Phases 1-3 can be done in parallel
- Phase 4 depends on 1, 2, 3
- Phases 5, 6 depend on 4
- Phase 7 depends on 1 (text-blocks types)
- Phase 8 depends on 4, 5
- Phase 9 can be done anytime after Phase 4
- Phase 10 depends on everything

---

## Testing Strategy

### Unit Tests

- Formatter functions (Phase 2)
- Decoration parser (Phase 3)
- Event filter/sorter (Phase 4)
- Block assembler (Phase 4)
- CLI renderer (Phase 5)

### Integration Tests

- TextService.processTurn() end-to-end (Phase 4)
- Engine + TextService + CLI (Phase 8)
- React client + engine (Phase 10)

### Transcript Tests

- Existing dungeo transcripts verify compatibility
- New transcripts for decoration/formatting features

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing transcripts | Run transcripts after each phase |
| Complex formatter interactions | Extensive unit tests per formatter |
| Decoration parser edge cases | Fuzzing and corner case tests |
| React bundle size | Use tree-shaking, monitor size |
| Performance regression | Profile TextService with large event batches |

---

## Success Criteria

1. **All dungeo transcripts pass** with new text service
2. **React client renders** dungeo playable in browser
3. **CLI output** is readable and colored
4. **Event chains** produce grammatically correct prose
5. **Story extensions** (custom formatters, colors) work
6. **No regressions** in existing functionality

---

## References

- ADR-089: Pronoun and Identity System
- ADR-091: Text Decorations
- ADR-094: Event Chaining
- ADR-095: Message Templates with Formatters
- ADR-096: Text Service Architecture
- ADR-097: React Client Architecture
- FyreVM Channel I/O (2009) - architectural inspiration
