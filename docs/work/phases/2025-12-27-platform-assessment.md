# Sharpee Platform Assessment

**Date:** 2025-12-27
**Reviewer:** Professional IF Platform Developer Assessment
**Version:** 1.0.0-alpha.1
**Branch:** phase4

---

## Executive Summary

Sharpee is a sophisticated, parser-based Interactive Fiction (IF) authoring platform built in TypeScript. After comprehensive analysis of the codebase, architecture, testing infrastructure, and story creation workflow, this assessment finds Sharpee to be a **well-architected, thoroughly documented platform** at the **mature alpha/early beta** stage of development.

**Key Findings:**
- 69+ Architecture Decision Records demonstrate exceptional design rigor
- All 43 standard actions follow the four-phase pattern (validate/execute/report/blocked)
- 187 test files with 2,700+ tests provide strong coverage
- TypeScript-first approach enables excellent tooling and type safety
- Current authoring experience requires developer expertise; Forge DSL incomplete

**Verdict:** Ready for adventurous developer-authors; not yet ready for non-programmer authors.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Architecture Assessment](#2-architecture-assessment)
3. [Testing Infrastructure](#3-testing-infrastructure)
4. [Story Creation Experience](#4-story-creation-experience)
5. [Comparison with Other IF Systems](#5-comparison-with-other-if-systems)
6. [Strengths and Weaknesses](#6-strengths-and-weaknesses)
7. [Recommendations](#7-recommendations)
8. [Conclusion](#8-conclusion)

---

## 1. Project Structure

### 1.1 Monorepo Organization

Sharpee uses a pnpm workspace monorepo with 15+ packages organized in clear layers:

```
sharpee/
├── packages/           # Core platform packages
│   ├── core/           # Generic event system, types, extensions
│   ├── if-domain/      # IF-specific contracts and types
│   ├── world-model/    # Entity system, traits, behaviors
│   ├── stdlib/         # Standard action library (43 actions)
│   ├── engine/         # Game runtime and command executor
│   ├── event-processor/# Event processing pipeline
│   ├── if-services/    # Service interfaces (text, perception)
│   ├── parser-en-us/   # English language parser
│   ├── lang-en-us/     # English vocabulary and templates
│   ├── text-services/  # Text output implementations
│   ├── forge/          # Fluent authoring API (incomplete)
│   ├── platforms/      # CLI and browser platforms
│   └── extensions/     # Extension examples (blood-magic, conversation)
├── stories/            # Example IF stories
├── docs/               # Documentation and ADRs
├── tests/              # Architecture enforcement tests
└── scripts/            # Build and utility scripts
```

### 1.2 Package Dependency Flow

```
@sharpee/core (foundation)
      ↓
@sharpee/if-domain (IF contracts)
      ↓
@sharpee/world-model (entities, traits, behaviors)
      ↓
@sharpee/stdlib (standard actions)
      ↓
@sharpee/engine (runtime)
      ↓
@sharpee/sharpee (aggregator)
      ↓
Platform packages (CLI, browser)
```

**Assessment:** The dependency graph is clean with minimal circular dependencies. The layered architecture properly separates concerns between generic event handling (`core`), IF-specific domain concepts (`if-domain`, `world-model`), and runtime concerns (`engine`, `stdlib`).

### 1.3 Build Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 10.13.1 | Package management |
| TypeScript | 5.x | Type safety |
| Turbo | 2.5.6 | Build orchestration |
| Vitest | 3.2.4 | Test framework |
| ESLint + Prettier | Latest | Code quality |

**Assessment:** Modern, well-chosen tooling. The `concurrency: 1` setting in Turbo may be conservative but ensures build stability.

---

## 2. Architecture Assessment

### 2.1 Core Architectural Patterns

#### Entity-Trait-Behavior System

The world model uses composition over inheritance:

```typescript
// Entities composed from reusable traits
const chest = world.createEntity('treasure chest', EntityType.CONTAINER);
chest.add(new IdentityTrait({ name: 'treasure chest', description: '...' }));
chest.add(new ContainerTrait({ capacity: 10 }));
chest.add(new OpenableTrait({ isOpen: false }));
chest.add(new LockableTrait({ isLocked: true, keyId: 'gold-key' }));
```

**27 Traits Available:**
- Core: Identity, Container, Room, Exit, Actor
- Interactive: Openable, Lockable, Switchable, Readable, Wearable, Edible
- Physical: Pushable, Pullable, Climbable, Supporter, LightSource
- Combat: Weapon, Breakable, Destructible, Combatant

**Assessment:** Excellent design. Trait composition enables flexible entity creation without deep inheritance hierarchies. The separation between traits (data) and behaviors (logic) follows Data-Oriented Design principles.

#### Four-Phase Action Pattern

All 43 standard actions follow a strict four-phase pattern:

```typescript
interface Action {
  validate(context: ActionContext): ValidationResult;   // Can this happen?
  execute(context: ActionContext): void;                // Make it happen
  report(context: ActionContext): ISemanticEvent[];     // Describe what happened
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[];  // Describe why not
}
```

**Key Principles:**
1. `validate()` - Pure validation, no side effects
2. `execute()` - Minimal coordination, delegates to behaviors, uses `context.sharedData`
3. `report()` - Success event emission (only called when validation passes)
4. `blocked()` - Error event emission (only called when validation fails)

**Assessment:** This is a well-thought-out pattern that enforces:
- Clear separation between decision-making and execution
- No context pollution through typed `sharedData`
- Independent testability of each phase
- Consistent error handling with dedicated `blocked()` method
- Clean separation between success and failure reporting

#### Event-Driven Architecture

```
Player Input → Parser → Validator → Action → Events → TextService → Output
                                       ↓
                                EventProcessor
                                       ↓
                              Event Handlers (entity/story level)
```

**Event Types:**
- `if.event.*` - Game state changes (taken, dropped, opened)
- `action.success/error/blocked` - Command results
- `platform.*` - System operations (save, restore, quit)
- `turn.*` - Turn lifecycle

**Assessment:** Sophisticated event system with semantic events (meaning) separated from text generation. The two-tier handler system (entity-level + story-level "daemons") provides excellent extensibility.

### 2.2 Architecture Decision Records (ADRs)

The project maintains **69+ ADRs** documenting:

| Category | Count | Key Decisions |
|----------|-------|---------------|
| Parser/Language | 12 | Semantic grammar, i18n architecture |
| Action System | 7 | Four-phase pattern, event handlers |
| World Model | 10 | Entity IDs, scope systems |
| Services | 6 | Text service, perception filtering |
| State/Persistence | 5 | Save/restore via snapshots |

**Notable ADRs:**
- **ADR-051:** Four-phase action pattern (validate/execute/report/blocked)
- **ADR-052:** Event handlers for custom game logic
- **ADR-069:** Perception-based event filtering (darkness handling)
- **ADR-054:** Semantic grammar (implemented in parser-en-us)

**Assessment:** The ADR documentation is exceptional. Each decision includes context, alternatives considered, consequences, and implementation notes. This level of documentation is rare in open-source projects and significantly reduces onboarding friction.

### 2.3 Design Maturity

| Aspect | Maturity | Notes |
|--------|----------|-------|
| Entity System | High | Trait-behavior composition well-designed |
| Action System | High | All 43 actions migrated to four-phase |
| Event System | High | Two-tier handlers, perception filtering |
| Parser | High | Working with semantic grammar implemented |
| Text Services | High | Clean separation, i18n-ready |
| Persistence | High | Snapshot-based save/restore working |
| Extension System | Medium | Architecture defined, few extensions built |
| Documentation | Very High | 69+ ADRs with detailed rationale |

---

## 3. Testing Infrastructure

### 3.1 Test Distribution

**Total: 187 test files, 2,700+ tests**

| Package | Test Files | Coverage |
|---------|------------|----------|
| world-model | 64 | Traits, behaviors, entities |
| stdlib | 59 | Actions, scope, validation |
| engine | 19 | Integration and events |
| extensions | 11 | Blood-magic extension |
| core | 9 | Types, events, rules |
| lang-en-us | 8 | Language and grammar |
| parser-en-us | 8 | Parser patterns |
| event-processor | 3 | Event pipeline |
| text-services | 2 | Text output |
| if-domain | 2 | Grammar, scope |

### 3.2 Testing Patterns

#### Golden Test Pattern (Actions)

Each action has a comprehensive "golden" test file validating:
- Three-phase pattern compliance
- Action metadata (ID, groups, messages)
- Precondition checks
- Successful execution paths
- Event structure validation

```typescript
describe('takingAction (Golden Pattern)', () => {
  describe('Three-Phase Pattern Compliance', () => { ... });
  describe('Action Metadata', () => { ... });
  describe('Precondition Checks', () => { ... });
  describe('Successful Taking', () => { ... });
  describe('Event Structure Validation', () => { ... });
});
```

#### Architecture Enforcement Tests

Located in `/tests/architecture/`:

| Test | Purpose |
|------|---------|
| `validate-execute-pattern.test.ts` | Ensures validate() before execute() |
| `behavior-usage.test.ts` | Actions delegate to behaviors |
| `dependency-rules.test.ts` | Package dependency flow |
| `architectural-debt.test.ts` | Technical debt metrics |

**Assessment:** The architecture enforcement tests are innovative and valuable. They prevent regression of architectural decisions and provide metrics on code quality over time.

### 3.3 Test Utilities

```typescript
// packages/stdlib/tests/test-utils/index.ts
setupBasicWorld()       // Creates player, room, registers capabilities
createRealTestContext() // ActionContext for testing
createCommand()         // ValidatedCommand builder
expectEvent()           // Event assertion helper
TestData               // Factory methods for test scenarios
```

### 3.4 Testing Gaps

| Area | Gap | Impact |
|------|-----|--------|
| Behaviors | Core behaviors lack dedicated unit tests | Medium |
| Parser | Limited edge case testing | Medium |
| Text Services | Only 2 test files | Low |
| Event Processor | Only 3 test files | Low |

**Overall Assessment:** Strong testing infrastructure with consistent patterns. The golden test approach for actions is particularly well-designed. The architecture enforcement tests are a standout feature.

---

## 4. Story Creation Experience

### 4.1 Current Authoring Workflow

Authors must implement the `Story` interface:

```typescript
export class MyStory implements Story {
  config: StoryConfig;

  initializeWorld(world: WorldModel): void { /* create all entities */ }
  createPlayer(world: WorldModel): IFEntity { /* configure player */ }
  getCustomActions?(): any[] { /* custom actions */ }
  extendParser?(parser: Parser): void { /* custom grammar */ }
  extendLanguage?(language: LanguageProvider): void { /* custom messages */ }
}
```

### 4.2 Entity Creation Example

```typescript
const library = this.world.createEntity('Library', EntityType.ROOM);
library.add(new RoomTrait({ isDark: true, exits: {} }));
library.add(new IdentityTrait({
  name: 'Library',
  description: 'A dusty room filled with ancient tomes.',
  aliases: ['lib', 'reading room']
}));

const book = this.world.createEntity('ancient book', EntityType.ITEM);
book.add(new IdentityTrait({ name: 'ancient book', description: '...' }));
book.add(new ReadableTrait({ text: 'The secrets of the universe...' }));

library.get(ContainerTrait).addContent(book.id);
```

### 4.3 Event Handlers for Custom Logic

```typescript
magicMirror.on = {
  'if.event.examined': (event): ISemanticEvent[] | undefined => {
    if (event.data.actor === playerId && !this.mirrorActivated) {
      this.mirrorActivated = true;
      return [{ type: 'story.mirror_activated', data: { ... } }];
    }
  }
};
```

### 4.4 Learning Curve Assessment

| Requirement | Difficulty |
|-------------|------------|
| TypeScript proficiency | High |
| Understanding traits | Medium |
| Event-driven patterns | Medium-High |
| Three-phase actions | Medium |
| Scope/visibility rules | High |

### 4.5 Author Experience Rating

| Aspect | Rating | Notes |
|--------|--------|-------|
| Power/Flexibility | A | Can implement any IF mechanic |
| Learning Curve | D | Requires significant TypeScript expertise |
| Author Experience | C | Verbose, requires engine knowledge |
| Documentation | C+ | Good core docs, missing tutorials |
| Standard Library | A | 43 well-tested actions |
| Tooling | D | No visual tools, no generators |

### 4.6 Missing Features for Authors

1. **Forge DSL** - The fluent API is incomplete
2. **Story Templates** - No scaffolding tool (`create-sharpee-story`)
3. **NPC/Conversation System** - Basic ActorTrait, no dialogue trees
4. **Visual Debugging** - No world state visualization
5. **Testing Helpers** - No author-friendly test utilities

---

## 5. Comparison with Other IF Systems

### 5.1 Feature Comparison

| Feature | Sharpee | Inform 7 | TADS | Dialog |
|---------|---------|----------|------|--------|
| Language | TypeScript | Natural language | Object-oriented | Prolog-like |
| Type Safety | Strong | None | Medium | Medium |
| Entity System | Trait composition | Class hierarchy | Class hierarchy | Facts |
| Extension Model | Registry-based | Extensions | Modules | Imports |
| i18n Support | Architecture-ready | Limited | Limited | Limited |
| Web Export | Planned | Via interpreters | Via interpreters | Via interpreters |
| Visual Tools | Planned (Forge) | IDE | IDE | None |
| Community | New | Large | Medium | Small |

### 5.2 Unique Strengths of Sharpee

1. **TypeScript Ecosystem** - Modern tooling, npm packages, IDE support
2. **Language-Agnostic Core** - Parser/language provider abstraction
3. **Event-Driven Architecture** - Clean separation, excellent extensibility
4. **Documentation Quality** - 69+ ADRs, exceptional for IF systems
5. **Three-Phase Actions** - Cleaner than traditional rule-based systems

### 5.3 Areas Where Others Excel

1. **Inform 7** - Natural language authoring, large community
2. **TADS** - Mature conversation system, proven at scale
3. **Dialog** - Minimal runtime, elegant syntax

---

## 6. Strengths and Weaknesses

### 6.1 Strengths

1. **Exceptional Documentation**
   - 69+ ADRs with detailed rationale
   - Clear core concepts reference
   - Well-documented architectural evolution

2. **Clean Separation of Concerns**
   - Parser handles syntax, not semantics
   - Actions coordinate, behaviors mutate
   - Text service handles presentation
   - Event handlers enable custom logic

3. **Strong Type Safety**
   - Typed traits and behaviors
   - Typed event data interfaces
   - Type-prefixed entity IDs for debugging

4. **Comprehensive Standard Library**
   - 43 fully-implemented actions
   - All following four-phase pattern
   - Consistent error handling

5. **Architecture Enforcement**
   - Automated tests prevent pattern violations
   - Technical debt tracking
   - Dependency rule enforcement

### 6.2 Weaknesses

1. **High Barrier to Entry**
   - Requires TypeScript expertise
   - No visual authoring tools
   - Verbose entity creation

2. **Incomplete Tooling**
   - Forge DSL not implemented
   - No story scaffolding
   - No debugging visualizations

3. **Limited Examples**
   - Only Cloak of Darkness as reference
   - Missing tutorial story
   - Few extension examples

4. **API Stability Concerns**
   - Interface naming changes (ADR-010 → ADR-053)
   - Still in alpha, breaking changes expected

---

## 7. Recommendations

### 7.1 Short-Term (1-3 months)

1. **Complete Forge DSL**
   - Highest impact for author experience
   - Enable: `forge().room("library").description("...").exit("north", "hall")`

2. **Create Story Template Generator**
   - `npx create-sharpee-story my-story`
   - Include basic rooms, items, and event handlers

3. **Add Behavior Unit Tests**
   - Core behaviors (Openable, Lockable, Container, Portable)
   - Improves confidence in behavior correctness

4. **Write Tutorial Story**
   - Step-by-step story with comments
   - Progressively introduces concepts

### 7.2 Medium-Term (3-6 months)

1. **NPC/Conversation System**
   - Dialogue trees
   - Ask/tell mechanics
   - Character schedules

2. **Web-Based Player**
   - Browser platform completion
   - Story hosting/sharing

3. **Extension Documentation**
   - Document blood-magic as template
   - Create extension authoring guide

### 7.3 Long-Term (6+ months)

1. **Visual Authoring Tool**
   - Web-based world builder
   - Visual scripting for events
   - Built on top of Forge DSL

2. **Community Infrastructure**
   - Extension registry
   - Story hosting
   - Online IDE

---

## 8. Conclusion

### Overall Assessment

Sharpee is a **well-architected, thoroughly documented** interactive fiction platform that demonstrates excellent software engineering practices. The trait-behavior entity system, four-phase action pattern, and event-driven architecture are all thoughtfully designed and consistently implemented.

### Maturity Level

**Mature Alpha / Early Beta**

The core systems are stable and well-tested:
- Entity system: Production-ready
- Action system: Production-ready (43 actions complete)
- Event system: Production-ready
- Parser: Functional, enhancements planned
- Authoring tools: Not ready (Forge incomplete)

### Target Audience

**Current:** Developer-authors comfortable with TypeScript who want maximum control over their IF implementation.

**Future (with Forge):** Broader author community seeking modern IF tooling with web deployment.

### Final Verdict

Sharpee is **recommended for developers** interested in:
- Building IF with modern TypeScript tooling
- Contributing to an actively-developed IF platform
- Creating complex, custom IF mechanics

Sharpee is **not yet recommended** for:
- Authors without TypeScript experience
- Projects needing immediate production stability
- Teams requiring visual authoring tools

The architectural foundations are excellent. With completion of Forge and improved onboarding, Sharpee has the potential to become a compelling modern alternative to established IF systems.

---

## Appendix A: Package Summary

| Package | Purpose | Status |
|---------|---------|--------|
| @sharpee/core | Event system, types | Stable |
| @sharpee/if-domain | IF contracts | Stable |
| @sharpee/world-model | Entities, traits | Stable |
| @sharpee/stdlib | Standard actions | Stable (43 complete) |
| @sharpee/engine | Runtime | Stable |
| @sharpee/parser-en-us | English parser | Stable |
| @sharpee/lang-en-us | English templates | Stable |
| @sharpee/text-services | Text output | Stable |
| @sharpee/forge | Fluent DSL | Incomplete |
| @sharpee/platform-cli-en-us | CLI platform | Stable |
| @sharpee/platform-browser-en-us | Browser platform | In progress |

## Appendix B: Test Coverage Summary

| Area | Files | Status |
|------|-------|--------|
| Actions (golden tests) | 43 | Complete |
| Traits | 27 | Good |
| Behaviors | 6 | Needs expansion |
| Integration | 19 | Good |
| Architecture enforcement | 4 | Excellent |

## Appendix C: Documentation Inventory

| Document | Location | Quality |
|----------|----------|---------|
| ADRs | docs/architecture/adrs/ | Excellent (69+) |
| Core Concepts | docs/reference/core-concepts.md | Good |
| Author Guide | docs/getting-started/authors/ | Needs work |
| Story Guide | docs/stories/ | Partial |
| API Reference | (generated) | Basic |

---

*Assessment conducted December 27, 2025*
