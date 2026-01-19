# Sharpee Architecture Review

**Date:** January 2026
**Reviewers:** Architecture Review
**Platform Version:** Engine 0.1.65
**Scope:** Complete platform architecture including packages, stories, and deployment

---

## Executive Summary

Sharpee is a parser-based Interactive Fiction (IF) authoring platform built in TypeScript. The architecture demonstrates **high maturity** with clean separation of concerns, well-documented decisions (90+ ADRs), and a sophisticated trait-based entity system.

### Key Findings

| Category | Assessment | Notes |
|----------|------------|-------|
| **Layered Architecture** | Excellent | Clear boundaries between foundation, world model, actions, and presentation |
| **Extensibility** | Excellent | Trait/capability system enables story-specific logic without platform changes |
| **Event System** | Excellent | Events are first-class citizens with handlers, not just logging |
| **Language Separation** | Excellent | Full i18n readiness; no hardcoded strings in core logic |
| **Code Organization** | Very Good | Consistent patterns, though some large files could be decomposed |
| **Testing Strategy** | Good | Transcript-based integration tests; unit test patterns established |
| **Documentation** | Good | ADRs comprehensive; inline documentation could improve |

### Architecture Maturity Score: 8.5/10

The platform is production-ready for IF authoring. The primary opportunities are in test coverage expansion and documentation tooling.

---

## 1. Architecture Overview

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SHARPEE PLATFORM                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐│
│  │  CLI     │  │  Web     │  │  Future  │  │     Story Authors    ││
│  │ Terminal │  │ Browser  │  │ Electron │  │  (dungeo, custom)    ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘│
│       │             │             │                    │            │
│       └─────────────┴─────────────┴────────────────────┘            │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │   GameEngine      │                            │
│                    │ (Turn Orchestration)│                           │
│                    └─────────┬─────────┘                            │
│                              │                                       │
│       ┌──────────────┬───────┴───────┬──────────────┐               │
│       ▼              ▼               ▼              ▼               │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐         │
│  │ Parser  │   │  Stdlib  │   │  World   │   │   Text    │         │
│  │(Grammar)│   │ (Actions)│   │  Model   │   │  Service  │         │
│  └─────────┘   └──────────┘   └──────────┘   └───────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Architectural Style

The platform employs a **layered event-driven architecture** with:

- **Domain-Driven Design (DDD)** concepts (entities, traits, behaviors)
- **Event Sourcing** for state changes (all mutations flow through events)
- **Composition over Inheritance** (trait-based entity system)
- **Hexagonal Architecture** elements (ports/adapters for parser, language)

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | TypeScript + Node.js | Core execution |
| Build | pnpm workspace + esbuild | Monorepo management, bundling |
| Testing | Vitest + Transcripts | Unit and integration testing |
| Deployment | Browser (IIFE), CLI (Node) | Multi-platform targets |

---

## 2. Package Structure & Dependencies

### 2.1 Package Inventory

| Package | Files | LOC | Purpose |
|---------|-------|-----|---------|
| `core` | 49 | ~3,500 | Event system, entity interfaces, utilities |
| `if-domain` | 21 | ~1,500 | Domain contracts (actions, grammar, validation) |
| `if-services` | 2 | ~200 | Runtime service interfaces |
| `text-blocks` | 3 | ~300 | Output structure definitions |
| `world-model` | 140 | ~12,000 | Entities, traits, behaviors, services |
| `event-processor` | 17 | ~2,000 | Event application and handlers |
| `stdlib` | 247 | ~15,000 | 43 standard actions, capability dispatch |
| `parser-en-us` | 16 | ~2,500 | English grammar and parsing |
| `lang-en-us` | 70 | ~5,000 | English text generation |
| `text-service` | 14 | ~2,000 | Event → TextBlock pipeline |
| `engine` | 23 | ~4,000 | Game loop, command execution |
| `sharpee` | 3 | ~500 | CLI entry point, bundle |
| `transcript-tester` | 9 | ~1,500 | Integration test runner |
| `forge` | 12 | ~1,500 | Story compilation tools |

**Total:** ~626 files, ~51,500 lines of TypeScript

### 2.2 Dependency Graph

```
                    ┌─────────────────────────────────┐
                    │        APPLICATION LAYER        │
                    │  sharpee | transcript-tester    │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │          ENGINE LAYER           │
                    │   GameEngine + CommandExecutor  │
                    └─┬──────┬──────────┬──────────┬──┘
                      │      │          │          │
           ┌──────────┼──────┼──────────┼──────────┼──────────┐
           │          │      │          │          │          │
     ┌─────▼────┐ ┌───▼────┐ │   ┌──────▼─────┐ ┌──▼────────┐ │
     │  text-   │ │ event- │ │   │  parser-   │ │  stdlib   │ │
     │ service  │ │processor│ │   │  en-us     │ │ (actions) │ │
     └────┬─────┘ └───┬────┘ │   └──────┬─────┘ └─────┬─────┘ │
          │           │      │          │             │       │
          │     ┌─────▼──────▼───┐   ┌──▼────────┐    │       │
          │     │   world-model  │   │ lang-en-us│◄───┘       │
          │     │   (entities)   │   └───────────┘            │
          │     └───────┬────────┘                            │
          │             │                                     │
     ┌────▼─────────────▼─────────────────────────────────────┴──┐
     │                   FOUNDATION LAYER                         │
     │    core  |  if-domain  |  if-services  |  text-blocks     │
     └───────────────────────────────────────────────────────────┘
```

### 2.3 Dependency Analysis

**Strengths:**
- Clear hierarchical layering with no circular dependencies
- Foundation layer has zero platform-specific dependencies
- Parser and language are independently replaceable

**Coupling Assessment:**
- `stdlib` → `lang-en-us`: Required for message IDs (appropriate coupling)
- `world-model` ↔ `event-processor`: Bidirectional awareness (acceptable)
- `engine` → all: Expected for orchestration layer

---

## 3. Core Architectural Patterns

### 3.1 Trait-Based Entity System

**Pattern:** Composition over inheritance via traits

```typescript
// Entity definition (pure data container)
interface IEntity {
  id: string;
  type: string;
  displayName: string;
  traits: Map<string, ITrait>;
  on?: EventHandlerMap;
}

// Trait adds capabilities (pure data)
class ContainerTrait implements ITrait {
  static readonly type = 'container';
  capacity: number;
  isOpen: boolean;
}

// Behavior implements logic (separate from trait)
class ContainerBehavior {
  static canHold(trait: ContainerTrait, item: IEntity): boolean;
  static addItem(trait: ContainerTrait, item: IEntity): void;
}
```

**Assessment:** Excellent design. Traits are serializable (pure data), behaviors are testable in isolation, and the system is infinitely extensible without modification.

### 3.2 Four-Phase Action Pattern (ADR-051)

Every action follows a strict lifecycle:

```
┌────────────────────────────────────────────────────────────────┐
│                       ACTION LIFECYCLE                          │
├───────────┬───────────┬───────────────────┬───────────────────┤
│ VALIDATE  │  EXECUTE  │      REPORT       │      BLOCKED      │
├───────────┼───────────┼───────────────────┼───────────────────┤
│ Can this  │ Perform   │ Emit semantic     │ Generate error    │
│ action    │ world     │ events describing │ events for        │
│ proceed?  │ mutations │ what happened     │ why action failed │
├───────────┼───────────┼───────────────────┼───────────────────┤
│ Returns   │ Mutates   │ Returns           │ Returns           │
│ Valid/    │ World     │ ISemanticEvent[]  │ ISemanticEvent[]  │
│ Error     │ State     │                   │                   │
└───────────┴───────────┴───────────────────┴───────────────────┘
```

**Assessment:** Clean separation enables testing each phase independently. The `sharedData` pattern (ADR-042) for inter-phase communication is elegant.

### 3.3 Capability Dispatch (ADR-090)

For verbs without standard semantics (LOWER, TURN, WAVE), traits declare capabilities:

```typescript
class BasketElevatorTrait {
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'];
}

// Behaviors registered at story initialization
registerCapabilityBehavior(
  BasketElevatorTrait.type,
  'if.action.lowering',
  BasketLoweringBehavior
);
```

**Assessment:** Solves the "verb proliferation" problem elegantly. Story authors define entity-specific behavior without modifying platform grammar or actions.

### 3.4 Event-Driven State Changes

All world mutations flow through events:

```
┌──────────┐    ┌───────────┐    ┌─────────────┐    ┌────────────┐
│  Action  │───▶│   Event   │───▶│   Event     │───▶│   World    │
│ Report() │    │ Emitted   │    │  Processor  │    │   State    │
└──────────┘    └───────────┘    └──────┬──────┘    └────────────┘
                                        │
                                        ▼
                               ┌────────────────┐
                               │ Reaction Events│
                               │  (handlers)    │
                               └────────────────┘
```

**Assessment:** Events are first-class citizens, not just logging. Handlers can react to any event, enabling complex multi-entity puzzles without action modification.

### 3.5 Language Layer Separation

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│    stdlib    │────▶│   Message ID      │────▶│  lang-en-us  │
│  (actions)   │     │ 'action.taking.   │     │  (text)      │
│              │     │  success'         │     │              │
└──────────────┘     └───────────────────┘     └──────────────┘

// In stdlib (message ID only):
events.push(event('action.success', { messageId: 'action.taking.success' }));

// In lang-en-us (actual text):
messages.set('action.taking.success',
  (params) => `You pick up ${describeEntity(params.item)}.`);
```

**Assessment:** True i18n readiness. Adding a new language requires only a new `lang-{locale}` package without touching any core logic.

---

## 4. Data Flow Analysis

### 4.1 Turn Cycle Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TURN CYCLE                                   │
└─────────────────────────────────────────────────────────────────────┘

  Player Input: "take ball"
         │
         ▼
  ┌──────────────────┐
  │  1. PARSE        │  Parser tokenizes, matches grammar patterns
  │     Parser       │  Output: ParsedCommand { verb, directObject }
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  2. RESOLVE      │  Entity resolution, scope checking
  │     Scope        │  Output: ValidatedCommand with entity refs
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  3. EXECUTE      │  Four-phase action execution
  │     Action       │  validate → execute → report OR blocked
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  4. PROCESS      │  Event handlers react, mutations applied
  │     Events       │  Output: WorldChanges, ReactionEvents
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  5. SCHEDULE     │  Daemons tick, fuses decrement
  │     Tick         │  Output: Scheduled events
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  6. NPCs         │  NPC behaviors execute
  │     Turn         │  Output: NPC action events
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  7. RENDER       │  Text service transforms events to prose
  │     Text         │  Output: TextBlock[]
  └────────┬─────────┘
           │
           ▼
      Display to Player
```

### 4.2 Event Flow for Complex Puzzle

Example: Throwing torch at glacier

```
Player: "throw torch at glacier"

  ┌─────────────────────────────────────────────────────────────┐
  │  ThrowingAction.execute()                                    │
  │  • Validates player has torch                                │
  │  • Validates glacier is visible target                       │
  └────────────────────────┬────────────────────────────────────┘
                           │
  ┌────────────────────────▼────────────────────────────────────┐
  │  ThrowingAction.report()                                     │
  │  • Emits: if.event.thrown { item: torch, target: glacier }  │
  └────────────────────────┬────────────────────────────────────┘
                           │
  ┌────────────────────────▼────────────────────────────────────┐
  │  EventProcessor.processEvents()                              │
  │  • Glacier handler triggers (registered by story)            │
  │  • Handler checks: is it a torch? → YES                      │
  │  • Handler mutates: glacier.melted = true                    │
  │  • Handler emits: if.event.glacier_melts { passage opened }  │
  └────────────────────────┬────────────────────────────────────┘
                           │
  ┌────────────────────────▼────────────────────────────────────┐
  │  TextService.processTurn()                                   │
  │  • Processes if.event.thrown → "You throw the torch..."      │
  │  • Processes if.event.glacier_melts → "The glacier melts..." │
  │  • Processes passage_revealed → "A passage opens north..."   │
  └─────────────────────────────────────────────────────────────┘
```

### 4.3 Text Service Pipeline (ADR-096)

```
  Raw Events (all from turn)
         │
         ▼
  ┌──────────────────┐
  │  Filter Stage    │  Remove system/debug events
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Sort Stage      │  Narrative ordering (ADR-094)
  │  (important!)    │  Room descriptions first, etc.
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Process Stage   │  Route to event-specific handlers
  │  • Room handler  │  • Action success/failure handlers
  │  • Entity reveal │  • Generic message handler
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Assemble Stage  │  Create TextBlock[] with decorations
  │  + formatting    │  (bold, links, colors)
  └──────────────────┘
```

---

## 5. Deployment Architecture

### 5.1 Build Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                       BUILD PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────┘

  Source Packages (pnpm workspace)
         │
         ├──► build-platform.sh
         │    └──► dist/sharpee.js (Node bundle for CLI/testing)
         │
         ├──► build-dungeo.sh
         │    └──► Platform + Story bundle
         │
         └──► build-web.sh
              └──► dist/web/dungeo/
                   ├── dungeo.js (IIFE browser bundle)
                   ├── dungeo.js.map
                   ├── index.html
                   └── styles.css
```

### 5.2 Browser Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BROWSER ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐        ┌─────────────────────────────────┐   │
│  │   index.html     │        │       browser-entry.ts          │   │
│  │                  │        │  • GameEngine initialization     │   │
│  │  Status Line     │───────▶│  • DOM event handling           │   │
│  │  Main Window     │        │  • localStorage save/restore    │   │
│  │  Command Input   │        │  • Auto-save (per turn)         │   │
│  │  Modal Dialogs   │        │  • Command history              │   │
│  └──────────────────┘        │  • PC speaker beep (Web Audio)  │   │
│                              └─────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    dungeo.js (IIFE bundle)                    │   │
│  │  SharpeeGame = {                                              │   │
│  │    Platform: { engine, world-model, parser, lang, stdlib }   │   │
│  │    Story: { regions, npcs, actions, handlers }               │   │
│  │  }                                                            │   │
│  │  ~2.5MB uncompressed, ~400KB gzipped                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Save/Restore Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   BROWSER SAVE/RESTORE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  localStorage Keys:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  dungeo-saves-index     Array<SaveSlotMeta>                  │   │
│  │  dungeo-save-{name}     BrowserSaveData                      │   │
│  │  dungeo-save-autosave   Auto-saved after each turn           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  BrowserSaveData = {                                                │
│    version: "2.0.0-browser",                                        │
│    timestamp: number,                                               │
│    turnCount: number,                                               │
│    score: number,                                                   │
│    locations: Record<entityId, locationId>,                         │
│    traits: Record<entityId, Record<traitName, traitData>>,         │
│    transcript: string[]  // Full output history                     │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architectural Strengths

### 6.1 Clean Separation of Concerns

Each package has a single, well-defined responsibility:
- `world-model` owns entity state, never actions
- `stdlib` owns action logic, never persistence
- `text-service` owns rendering, never parsing
- `parser-en-us` owns grammar, never text generation

### 6.2 Event-First Design

The event system enables:
- **Observability**: Every state change is traceable
- **Extensibility**: Handlers can react to any event
- **Testing**: Events can be captured and asserted
- **Replay**: Event history enables debugging

### 6.3 Trait/Capability Architecture

The ADR-090 capability dispatch pattern:
- Eliminates action proliferation
- Enables entity-specific behavior
- Keeps grammar simple (one pattern per verb)
- Story authors extend without platform changes

### 6.4 Language Agnosticism

True internationalization readiness:
- No English strings in core packages
- Message ID → text mapping in language packages
- Grammar patterns can be language-specific
- Same world model works with any language

### 6.5 Deterministic Design

Key for testing and debugging:
- Seeded random number generator
- Turn-based (no real-time dependencies)
- Event ordering is deterministic
- Save/restore preserves exact state

### 6.6 Well-Documented Decisions

90+ ADRs covering:
- Major architectural decisions
- Trade-offs considered
- Implementation details
- Status and evolution

---

## 7. Areas for Improvement

### 7.1 Technical Debt

| Issue | Severity | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Custom properties via `as any`** | Medium | Type safety | Define proper interfaces for treasure/puzzle state |
| **Large action files** | Low | Maintainability | Some actions (going, taking) could be decomposed |
| **Magic strings** | Medium | Refactoring risk | Extract more constants for event types, message IDs |
| **Test coverage gaps** | Medium | Regression risk | Ensure all mutation actions have world-state verification |

### 7.2 Documentation Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| API reference docs | Onboarding friction | Generate TypeDoc from interfaces |
| Story authoring guide | Adoption barrier | Consolidate patterns from dungeo into guide |
| Architecture diagrams | Understanding | Generate from code (see Appendix A) |
| ADR cross-references | Navigation | Add "related ADRs" sections |

### 7.3 Testing Improvements

**Current State:**
- Transcript-based integration tests (100+ for dungeo)
- Unit tests for some packages
- Missing: systematic world-state verification in action tests

**Recommendation:**
- Implement the mitigation plan from the "dropping bug" analysis
- Add `expectLocation()`, `expectTraitValue()` assertions to all mutation tests
- Consider property-based testing for parser

### 7.4 Potential Architectural Enhancements

| Enhancement | Benefit | Complexity |
|-------------|---------|------------|
| **Event versioning** | Backward compatibility | Medium |
| **Command undo** | Player experience | High |
| **Plugin architecture** | Third-party extensions | High |
| **Visual story editor** | Accessibility | Very High |

---

## 8. Recommendations

### 8.1 Short-Term (1-2 months)

1. **Type Safety for Story State**
   - Define `TreasureProperties`, `PuzzleState` interfaces
   - Replace `(entity as any).treasureValue` with proper typing
   - Add runtime validation for story-defined properties

2. **Test Coverage**
   - Implement world-state verification in all action tests
   - Add regression tests for past bugs
   - Target 80% coverage for stdlib package

3. **Documentation**
   - Generate API reference with TypeDoc
   - Create "Story Author's Guide" from dungeo patterns
   - Add sequence diagrams to key ADRs

### 8.2 Medium-Term (3-6 months)

1. **Event System Enhancement**
   - Add event schema versioning for forward compatibility
   - Implement event replay for debugging
   - Consider event compression for large save files

2. **Performance Optimization**
   - Profile bundle size, identify unused code
   - Lazy-load language packages
   - Optimize scope calculations for large worlds

3. **Developer Experience**
   - Create story project template (`create-sharpee-story`)
   - Add hot-reload for story development
   - Improve error messages with suggestions

### 8.3 Long-Term (6-12 months)

1. **Plugin Architecture**
   - Define extension points formally
   - Create plugin manifest format
   - Enable third-party traits, actions, behaviors

2. **Multi-Platform**
   - Electron desktop app
   - Mobile-responsive web UI
   - Voice interface (speech-to-text)

3. **Tooling**
   - Visual world editor
   - Transcript analyzer
   - Story debugger with breakpoints

---

## 9. Conclusion

Sharpee demonstrates **mature, well-considered architecture** that successfully balances:
- **Flexibility** (trait system, capability dispatch) with **Consistency** (four-phase actions, event flow)
- **Extensibility** (story-level customization) with **Simplicity** (clear patterns to follow)
- **Power** (complex puzzle logic) with **Accessibility** (transcript testing, message IDs)

The platform is ready for serious IF authoring. The primary investment areas should be:
1. Improving test coverage and type safety
2. Generating comprehensive documentation
3. Creating story authoring tooling

The architecture supports these improvements without requiring fundamental changes.

---

## Appendix A: Diagram Index

The following diagrams are recommended for generation:

| Diagram | Type | Purpose |
|---------|------|---------|
| Package dependency graph | Component | Show build-time dependencies |
| Turn cycle sequence | Sequence | Detail command processing |
| Event processing flow | Sequence | Show event → handler → reaction |
| Entity composition | Class | Trait relationships |
| Capability dispatch | Sequence | Show trait → behavior lookup |
| Save/restore flow | Sequence | Browser and CLI persistence |
| Grammar resolution | Flowchart | Parser pattern matching |

See `diagram-specifications.md` for PlantUML/Mermaid specifications.

---

## Appendix B: ADR Summary by Domain

### Core Engine (8 ADRs)
- ADR-008: Core as generic event system
- ADR-040: Turn-based time progression
- ADR-049: Auto-save architecture
- ADR-060: Command executor refactor
- ADR-077: Release build system
- ADR-086: Event handler unification

### World Model (12 ADRs)
- ADR-009: Deep cloning strategy
- ADR-011: Entity ID system
- ADR-014: AuthorModel for setup
- ADR-015: SpatialIndex pattern
- ADR-020: Clothing & pockets
- ADR-045: Scope management
- ADR-046: Perception service
- ADR-047: Entity type safety
- ADR-068: Unified darkness

### Actions & Behaviors (15 ADRs)
- ADR-051: Action behaviors (superseded)
- ADR-052: Event handlers for custom logic
- ADR-057: Before/after rules
- ADR-058: Action report function
- ADR-059: Action customization boundaries
- ADR-061: Snapshot code smell
- ADR-063: Sub-actions pattern
- ADR-064: World vs action events
- ADR-090: Capability dispatch

### Parser & Language (18 ADRs)
- ADR-001-003: Parser debug infrastructure
- ADR-004: Parser-validation-execution separation
- ADR-026-028: Language-specific parsers
- ADR-036-037: Parser contracts
- ADR-080: Raw text slots
- ADR-087: Action-centric grammar
- ADR-088: Grammar engine refactor

### Text & Output (10 ADRs)
- ADR-023: Message system
- ADR-028: Language management
- ADR-029: Text service architecture
- ADR-048: Static language
- ADR-066: Text snippets
- ADR-067: Linguistics
- ADR-089: Narrative perspective
- ADR-094: Event sorting
- ADR-095: Message templates
- ADR-096: Text service pipeline

### NPCs & Scheduling (2 ADRs)
- ADR-070: NPC system architecture
- ADR-071: Daemons and fuses

### Testing (2 ADRs)
- ADR-056: Story testing (superseded)
- ADR-073: Transcript-based testing

---

## Appendix C: Key File Locations

### Platform Core
- `packages/core/src/` - Event system, entity model
- `packages/if-domain/src/` - Domain contracts
- `packages/world-model/src/entities/` - Entity implementation
- `packages/world-model/src/traits/` - 30+ trait definitions
- `packages/world-model/src/capabilities/` - Capability dispatch

### Actions & Behaviors
- `packages/stdlib/src/actions/standard/` - 43 standard actions
- `packages/stdlib/src/actions/context.ts` - ActionContext
- `packages/stdlib/src/capabilities/` - Capability registry

### Parser & Language
- `packages/parser-en-us/src/grammar.ts` - Grammar patterns
- `packages/parser-en-us/src/english-parser.ts` - Parser implementation
- `packages/lang-en-us/src/language-provider.ts` - Text generation

### Engine & Output
- `packages/engine/src/game-engine.ts` - Main runtime
- `packages/engine/src/command-executor.ts` - 4-phase orchestration
- `packages/text-service/src/text-service.ts` - Event → text

### Story Implementation
- `stories/dungeo/src/index.ts` - Story entry point
- `stories/dungeo/src/regions/` - 13 geographic regions
- `stories/dungeo/src/npcs/` - 5 NPC implementations
- `stories/dungeo/src/actions/` - 40+ custom actions
- `stories/dungeo/src/handlers/` - 20+ event handlers

### Documentation
- `docs/architecture/adrs/` - 90+ ADRs
- `docs/reference/core-concepts.md` - Quick reference
- `docs/work/dungeo/` - Project tracking

---

*End of Architecture Review*
