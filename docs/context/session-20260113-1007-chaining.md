# Session Summary: 2026-01-13 - chaining

## Status: Completed

## Goals
- Design comprehensive text service and client architecture
- Unify text decoration and template syntax across ADRs
- Create foundational packages for text rendering system
- Document future client architectures (GLK, screen reader)

## Completed

### Architecture Design Session

Conducted a major design session documented in `docs/context/session-20260113-design-text-architecture.md`. This session resolved fundamental questions about how text flows from the language layer through the text service to various client implementations.

**Key design principles established:**
- Single TextService with multiple renderers (DRY principle)
- Event-based client communication (one stream of TextBlocks)
- FyreVM-inspired channel I/O using block keys
- Story-defined colors and decorations (Photopia pattern)
- Language-agnostic TextBlock contract

### ADR Updates and Creation

**Updated ADRs:**
- **ADR-091 (Text Decorations)**: Finalized hybrid syntax decision
  - `{formatter:placeholder}` for transformations (a, the, list, cap)
  - `[type:content]` for semantic decorations (item, room, npc)
  - `*emphasis*` / `**strong**` for inline prose
  - Can be combined: `[item:{a:item}]`

- **ADR-095 (Message Templates)**: Aligned with ADR-091's unified syntax
  - Updated formatter examples
  - Clarified decoration vs transformation distinction
  - Added combined syntax patterns

**New ADRs:**
- **ADR-096 (Text Service Architecture)**: Status: Accepted
  - Defines ITextBlock, IDecoration, TextContent interfaces
  - Specifies channel-based key conventions
  - Documents single service + multiple renderer pattern
  - Details decoration parser and formatter integration

- **ADR-097 (React Client Architecture)**: Status: Accepted
  - Event-based communication via `on('turn-complete')`
  - Component structure (StatusBar, Transcript, Input)
  - Status line handling (multiple `status.*` blocks)
  - Story-defined color mapping

- **ADR-099 (GLK Client)**: Status: Identified
  - Placeholder for future GLK window system support
  - Notes compatibility considerations with Glulx interpreters

- **ADR-100 (Screen Reader Client)**: Status: Identified
  - Placeholder for accessibility-focused renderer
  - Highlights importance of blind IF player community
  - Notes semantic decoration advantage for screen readers

### Package Creation

**Created `@sharpee/text-blocks`**: Pure interface package
- `src/types.ts`: ITextBlock, IDecoration, TextContent interfaces
- `src/guards.ts`: Type guard utilities (isDecoration)
- `src/index.ts`: Barrel export
- Zero dependencies, language-agnostic

**Created `@sharpee/text-service`**: Core text service implementation
- `src/text-service.ts`: Main TextService class
  - Template resolution
  - Formatter application (articles, lists, capitalization)
  - Decoration parsing
- `src/decoration-parser.ts`: Parses `[type:content]` and `*emphasis*` syntax
- `src/cli-renderer.ts`: CLI-specific renderer (ANSI colors, whitespace)
- `src/index.ts`: Barrel export

**Files created:**
- `packages/text-blocks/package.json`
- `packages/text-blocks/tsconfig.json`
- `packages/text-blocks/src/types.ts`
- `packages/text-blocks/src/guards.ts`
- `packages/text-blocks/src/index.ts`
- `packages/text-service/package.json`
- `packages/text-service/tsconfig.json`
- `packages/text-service/src/text-service.ts`
- `packages/text-service/src/decoration-parser.ts`
- `packages/text-service/src/cli-renderer.ts`
- `packages/text-service/src/index.ts`

### Package Archival

Archived legacy text service packages that are superseded by new architecture:
- `packages/text-services/` → `archive/text-services/`
- `packages/text-service-browser/` → `archive/text-service-browser/`
- `packages/text-service-template/` → `archive/text-service-template/`

These packages had overlapping concerns and multiple implementations that violated DRY principle. The new single-service architecture replaces them.

## Key Decisions

### 1. Unified Template Syntax

**Rationale**: ADR-091 and ADR-095 had overlapping concerns about placeholders and decorations. Three distinct syntaxes for distinct purposes prevents ambiguity.

- `{formatter:placeholder}` - Transformations (changes content)
- `[type:content]` - Decorations (adds metadata)
- `*emphasis*` / `**strong**` - Prose styling

**Impact**: Clear separation of concerns. Formatters transform, decorations annotate. Can be combined when needed: `[item:{a:item}]` resolves placeholder first, then marks as item-type.

### 2. Single TextService + Multiple Renderers

**Rationale**: Applying DRY principle. Template resolution, formatter logic, and decoration parsing are identical across all clients. Only rendering differs per platform.

**Architecture**:
```
lang-en-us → TextService → ITextBlock[] → [React|CLI|JAWS] Renderer
```

**Impact**: Eliminates code duplication, simplifies maintenance, ensures consistent behavior across all client types.

### 3. Language-Agnostic TextBlocks

**Decision**: `@sharpee/text-blocks` is not language-specific (no `text-blocks-en-us`).

**Rationale**: TextBlocks are a universal container format. The prose content is localized, but the structure (ITextBlock, IDecoration) is the same regardless of language.

```typescript
// Same ITextBlock shape, different language content
{ key: 'action.result', content: ['You take the sword.'] }  // English
{ key: 'action.result', content: ['Du nimmst das Schwert.'] }  // German
```

**Impact**: Reduces package proliferation, simplifies type imports, makes translation straightforward.

### 4. FyreVM Channel I/O Pattern

**Inspiration**: Dave's 2009 FyreVM design (with Tara McGrew, inspired by Jeff Panici).

**Pattern**: Block keys act as channels routing content to appropriate UI slots:
- `room.*` → Main transcript
- `action.*` → Main transcript
- `status.*` → Status bar slots
- `error` → Main transcript (styled)
- `{story}.*` → Story-defined

**Impact**: Clean separation between content generation and display. Clients route by key prefix. Stories can define custom channels.

### 5. Event-Based Client Communication

**Decision**: Clients receive one stream of TextBlocks via `on('turn-complete')`.

**Rationale**: IF is fundamentally sequential. Everything (player commands, daemon results, NPC actions) flows in order. Client just appends and renders.

```typescript
engine.on('turn-complete', (blocks: ITextBlock[]) => {
  setTranscript((prev) => [...prev, ...blocks]);
});
```

**Impact**: Dramatically simplifies client logic. No routing complexity, no event type handling. Just receive, append, render.

### 6. Story-Defined Colors (Photopia Pattern)

**Use case**: Adam Cadre's Photopia uses color narratively (red for Alley's scenes, blue for fantasy).

**Solution**: Stories define semantic color names in config:
```typescript
export const storyColors = {
  'photopia.red': '#cc0000',
  'photopia.blue': '#0066cc',
};
```

Templates use semantic names: `[photopia.red:The light was red, like always.]`

Clients map to platform capabilities:
- Web: CSS colors
- CLI: ANSI approximations
- Screen reader: announce or ignore

**Impact**: Authors have full creative control over color as storytelling device. Semantic naming supports graceful degradation.

### 7. Open Decoration Type System

**Decision**: `IDecoration.type` is `string`, not enum.

**Rationale**: Core types (`item`, `room`, `npc`, `em`, `strong`) are conventions, not constraints. Stories need to define custom types (color names, story-specific markup).

```typescript
interface IDecoration {
  type: string;  // Open - 'em', 'item', 'photopia.red'
  content: TextContent[];
}
```

**Impact**: Extensibility without package changes. Clients render unknown types with sensible defaults.

### 8. Status Line as TextBlocks

**Decision**: Status elements are regular TextBlocks with `status.*` keys, not a special data structure.

**Rationale**: Consistency. Everything is a TextBlock. Client routes by key prefix to UI slots.

```typescript
{ key: 'status.room', content: [{ type: 'room', content: ['West of House'] }] }
{ key: 'status.score', content: ['0'] }
{ key: 'status.turns', content: ['1'] }
```

**Impact**: Simpler mental model. Status updates use same pipeline as all other text.

## Open Items

### Short Term

- **Implement React client** (`@sharpee/client-react`)
  - Event listener for `turn-complete`
  - StatusBar component (routes `status.*` keys to slots)
  - Transcript component (renders main content)
  - Input component (sends commands to engine)
  - Story color mapping

- **Integrate TextService with engine**
  - Replace existing text output with new TextService
  - Update lang-en-us to use unified syntax
  - Migrate existing formatters (articles, lists, caps)

- **Add tests for decoration parser**
  - Nested decorations: `[item:the *shiny* sword]`
  - Combined syntax: `[item:{a:item}]`
  - Edge cases: escaped brackets, unmatched delimiters

### Long Term

- **GLK Client** (ADR-099)
  - Research Glulx window system
  - Map Sharpee channels to GLK windows
  - Handle status window sizing and formatting

- **Screen Reader Client** (ADR-100)
  - ARIA landmark support
  - Semantic decoration mapping (item → "object", room → "location")
  - Command history navigation
  - Testing with JAWS, NVDA, VoiceOver

- **Story Color Validation**
  - Lint/warn when templates reference undefined color names
  - Color contrast checking for accessibility

- **Performance Optimization**
  - Benchmark decoration parsing on long text blocks
  - Consider caching parsed decorations if needed

## Files Modified

**ADRs** (5 files):
- `docs/architecture/adrs/adr-091-text-decorations.md` - Finalized hybrid syntax
- `docs/architecture/adrs/adr-095-message-templates.md` - Aligned with ADR-091
- `docs/architecture/adrs/adr-096-text-service.md` - New (architecture)
- `docs/architecture/adrs/adr-097-react-client.md` - New (React client)
- `docs/architecture/adrs/adr-099-glk-client.md` - New (identified status)
- `docs/architecture/adrs/adr-100-screen-reader-client.md` - New (identified status)

**New Packages** (2 packages):
- `packages/text-blocks/package.json` - Interface package
- `packages/text-blocks/tsconfig.json`
- `packages/text-blocks/src/types.ts` - ITextBlock, IDecoration, TextContent
- `packages/text-blocks/src/guards.ts` - Type guards
- `packages/text-blocks/src/index.ts` - Barrel export
- `packages/text-service/package.json` - Service implementation
- `packages/text-service/tsconfig.json`
- `packages/text-service/src/text-service.ts` - Main service
- `packages/text-service/src/decoration-parser.ts` - Parser
- `packages/text-service/src/cli-renderer.ts` - CLI renderer
- `packages/text-service/src/index.ts` - Barrel export

**Archived** (3 packages):
- `archive/text-services/*` - Legacy multi-service approach
- `archive/text-service-browser/*` - Browser-specific service
- `archive/text-service-template/*` - Template-based service

**Documentation**:
- `docs/context/session-20260113-design-text-architecture.md` - Design session notes

**Build Configuration**:
- `package.json` - Added text-blocks and text-service to workspace
- `pnpm-lock.yaml` - Updated dependencies

## Architectural Notes

### The Evolution

The session represented a major architectural pivot:

1. **Before**: Multiple text service implementations (`text-services`, `text-service-browser`, `text-service-template`) with duplicated logic
2. **During**: Recognition that only rendering differs per client, everything else is shared
3. **After**: Single TextService + multiple lightweight renderers

This follows the DRY principle and dramatically reduces code duplication.

### FyreVM Heritage

Dave's observation: "you just reinvented fyrevm channel IO Mr. Claude (though I actually invented it in 2009)."

The channel-based block key system (`room.*`, `status.*`, `action.*`) comes from Dave's FyreVM work. Proven design, battle-tested in production IF games. Sharpee inherits this wisdom.

### Formatters vs Decorations

A critical distinction emerged:

- **Formatters transform content**: `{a:item}` → "a sword" or "an apple"
- **Decorations add metadata**: `[item:sword]` → `{type: 'item', content: ['sword']}`

Different operations, different syntax, different purposes. Formatters are evaluated at template time. Decorations are structural and persist through to rendering.

### The IF Constraint

Dave's insight: "in IF we have one stream of text blocks including any daemons and npcs - the client would never handle anything but one set of text blocks."

This constraint simplifies everything. No complex event routing, no state management, no "handling" different event types. Just: receive blocks, append, render. The sequential nature of IF is a feature, not a limitation.

### Accessibility as Priority

Creating ADR-100 for screen readers (status: identified) signals that accessibility is not an afterthought. The semantic decoration system (`item`, `room`, `npc`) provides a foundation for meaningful screen reader output.

As Dave noted: "There are a lot of blind IF players so I really love the idea of making Sharpee an easy path for authors to make games accessible."

### Greenfield Opportunity

Dave's directive: "I'd toss the current implementation and design for what we're designing now... everything is greenfield Mr. Claude."

This session had permission to design from first principles. Not constrained by existing code, we could ask fundamental questions and arrive at cleaner solutions.

## Technical Insights

### Nested Decorations

The IDecoration interface supports nesting:

```typescript
interface IDecoration {
  type: string;
  content: TextContent[];  // TextContent = string | IDecoration
}
```

This enables rich markup:
```typescript
{
  type: 'item',
  content: [
    'a ',
    { type: 'em', content: ['shiny'] },
    ' sword'
  ]
}
```

Renders in React as: `<span class="item">a <em>shiny</em> sword</span>`

### Channel Key Conventions

| Key Pattern     | Meaning           | Typical Routing       |
|-----------------|-------------------|-----------------------|
| `room.name`     | Room title        | Status bar slot       |
| `room.description` | Long description | Main transcript    |
| `action.result` | Action outcome    | Main transcript       |
| `status.score`  | Score value       | Status bar slot       |
| `status.turns`  | Turn count        | Status bar slot       |
| `error`         | System errors     | Transcript (styled)   |
| `prompt`        | Command prompt    | Input area            |
| `photopia.narrative` | Story-specific | Story-configured  |

### Browser Bundle Architecture

No server needed. Everything runs client-side:

```
{game}.js = Engine + WorldModel + Story + TextService + lang-en-us
           ↓
         React Client (receives ITextBlock[] events)
```

Fast, simple, works offline. Bundle includes everything except the React UI shell.

## Notes

**Session duration**: ~3-4 hours (design discussion + ADR writing + package creation)

**Approach**: Design-first session. Started with first principles questions:
- What does CLI need? (solved)
- What does React need? (focus)
- What about GLK? (park as identified)
- What about accessibility? (prioritize, park as identified)

Then worked through template syntax unification, DRY analysis, and channel I/O design. Only after architecture was clear did we write ADRs and create packages.

**Key insight**: "Formatters transform, decorations annotate" - this distinction unlocked the unified syntax design.

**Credit**: Dave's FyreVM channel I/O system (2009) provided the foundation for the TextBlock key-based routing pattern.

**Next session**: Will likely focus on React client implementation and TextService integration with the engine.

---

**Progressive update**: Session completed 2026-01-13 10:07
