# Session Summary: 20260114 - dungeo

## Status: Completed

## Goals
- Explore future architectural directions for Sharpee
- Design dialogue/conversation system architecture
- Design choice-based (CYOA) story architecture
- Document both designs as ADRs

## Completed

### ADR-102: Dialogue Extension Architecture

Designed a flexible dialogue system that avoids baking a single conversation approach into stdlib.

**Key Design Principles:**
- Stdlib provides thin action shells (ASK, TELL, SAY, TALK TO) that delegate to story-provided extensions
- Extensions implement `DialogueExtension` interface with 4 handler methods
- Story owns all topic definitions and conversation logic
- Extension determines what is "conversable" (no ConversableTrait)
- One extension per story, but extension can handle multiple conversation styles internally
- Default behavior: "Talking to yourself is a sign of impending mental collapse."

**Extension Examples:**
- `@sharpee/dialogue-simple` - Keyword-to-response mapping, stateless
- `@sharpee/dialogue-threaded` - Quip-based with flow, memory, suggestions (Emily Short style)
- `@sharpee/dialogue-menu` - Present numbered options for selection

**Pattern Rationale:**
- Stories choose complexity level appropriate to their needs
- No stdlib bloat for unused features
- Extensions can be shared across stories as reusable packages
- Clean separation: stdlib routes commands, extension handles conversation

### ADR-103: Choice-Based Story Architecture

Designed a narrative-as-code approach to CYOA-style IF, addressing Twine's pain points at scale.

**Core Problems Addressed:**
- State spaghetti (flag management chaos)
- Manual testing (clicking through every branch)
- No static analysis (unreachable passages, unused flags, dead ends)
- Refactoring risk (find/replace and hope)
- No type safety (typo surprises)
- Poor debugging ("why didn't that choice appear?")

**Two Modes:**

1. **Narrative Mode** - Pure branching narrative
   - Typed flags and counters (compile-time safety)
   - Current passage ID for location
   - Simple state model, no world simulation

2. **Simulation Mode** - World model with choice presentation
   - Full WorldModel (entities, traits, behaviors)
   - Choice provider generates options from world state
   - Reuses parser for action resolution

**Key Features:**

- **Type-safe state**: Interface defines flags/counters, TypeScript catches typos
- **Transcript-style tests**: Same testing pattern as parser IF
- **Static analysis**: Finds unreachable passages, unused flags, impossible conditions, circular paths
- **Reachability queries**: "Show me all paths from start to secret_ending"
- **Interactive debugging**: `:why` command explains why choices aren't available
- **Coverage reporting**: What % of passages/choices are tested

**Differentiators from Twine:**
- Code-first (version control friendly)
- Type safety catches errors at compile time
- Automated testing enables CI/CD
- Static analysis finds structural problems
- Debugging tools explain choice availability
- Reusable mechanics reduce boilerplate

### Documentation Updates

Updated `docs/architecture/adrs/README.md` to include both new ADRs in the "Interaction Paradigms & Clients" section.

## Key Decisions

### 1. Dialogue: Extension Pattern Over Built-in System

**Rationale**: Parser IF has diverse dialogue approaches (keyword-based, menu-based, quip graphs, etc.). Rather than force one approach, stdlib provides routing infrastructure and stories plug in appropriate extensions.

**Implications:**
- Stories wanting dialogue must include an extension
- Extensions can be shared as packages
- No stdlib bloat for unused features
- Clear separation of concerns

### 2. Choice-Based: Two Modes (Narrative vs Simulation)

**Rationale**: Pure branching narratives and simulation-based dungeon crawls have different needs. Narrative mode offers simplicity and speed. Simulation mode reuses world model for complex state.

**Implications:**
- Authors choose appropriate mode for their story
- Narrative mode has lower cognitive overhead
- Simulation mode enables parser/choice hybrid stories
- Both modes use same testing infrastructure

### 3. Static Analysis as Core Value Proposition

**Rationale**: Twine's biggest pain at scale is manual testing and hidden structural problems. Static analysis makes Sharpee's code-first approach worth the higher barrier to entry.

**Implications:**
- Analysis tooling is critical to build early
- Must integrate with CI/CD workflows
- IDE integration needed for author experience
- Debugging tools are first-class citizens

### 4. Narrative-as-Code Philosophy

**Rationale**: Trade visual editing (Twine) for version control, type safety, automated testing, and static analysis. Target authors comfortable with code.

**Implications:**
- Higher barrier to entry than Twine
- Better for large/complex stories
- Better for team collaboration
- Enables software engineering practices (CI, refactoring, code review)

## Open Items

### Short Term
- None - ADRs are complete and documented

### Long Term (Implementation Priorities)

**Dialogue System:**
1. Implement stdlib action shells (ASK, TELL, SAY, TALK TO)
2. Create `@sharpee/dialogue-simple` extension for Dungeo
3. Consider `@sharpee/dialogue-threaded` for richer conversation needs

**Choice-Based System:**
1. Implement narrative mode core (`@sharpee/narrative` package)
2. Build static analyzer (unreachable passages, unused flags, etc.)
3. Create narrative test runner (transcript-style)
4. Add reachability query tool
5. Build interactive debugger with `:why` command
6. Consider simulation mode (lower priority)
7. Package reusable mechanics (inventory, relationships, etc.)

**Integration:**
- Visual passage graph generator (from code, read-only)
- IDE integration (hover for flag dependencies, go-to-passage)
- Coverage reporting for CI
- Narrative language layer (localization)

## Files Modified

**Created** (3 files):
- `docs/architecture/adrs/adr-102-dialogue-extension-architecture.md` - Dialogue extension pattern, stdlib action shells, topic ownership, example extensions
- `docs/architecture/adrs/adr-103-choice-based-story-architecture.md` - Narrative vs simulation modes, type-safe state, static analysis, testing, debugging
- Updated `docs/architecture/adrs/README.md` - Added both ADRs to index under "Interaction Paradigms & Clients"

## Architectural Notes

### Extension Pattern Consistency

Both ADR-102 (dialogue) and ADR-090 (capability dispatch) use similar extension patterns:
- Stdlib provides infrastructure/routing
- Stories provide specific implementations
- One registration per story
- Clean separation of concerns

This pattern is becoming a Sharpee idiom for pluggable behavior.

### Testing Pattern Consistency

Both parser IF (ADR-073) and choice-based IF (ADR-103) use transcript-style testing:
- Text file format for test definitions
- Command/response pairs
- State assertions
- Same tooling patterns

This consistency enables authors to learn one testing approach.

### Code-First Trade-offs

The shift from visual editing (Twine) to code-first authoring trades:
- **Give up**: Visual passage editor, low barrier to entry
- **Gain**: Type safety, automated testing, static analysis, version control, refactoring

Target audience: Authors comfortable with code who need scale/complexity management.

### Future: Parser/Choice Hybrid

Simulation mode enables hybrid stories:
- Main exploration: parser IF (type commands)
- Critical moments: choice-based (present options)
- Seamless transition between modes
- Same world model, same testing

Example: Parser IF with occasional moral choice menus at key plot points.

## Notes

**Session duration**: ~3 hours

**Approach**: Exploratory design session with user. Discussed future directions for Sharpee, explored dialogue system needs, CYOA pain points, and how Sharpee's code-first philosophy could address them. Wrote two comprehensive ADRs documenting design decisions.

**Context**: These ADRs are forward-looking. Neither system is implemented yet. Dungeo project may need simple dialogue (SAY for puzzle answers), making ADR-102 relevant for near-term implementation. ADR-103 is purely exploratory for now.

**Methodology**: Standard ADR format (Context/Decision/Consequences). Included extensive examples, test formats, CLI tool usage, and comparison to existing tools (Twine, Emily Short's Threaded Conversation).

**Quality Notes:**
- Both ADRs are comprehensive with concrete examples
- Clear decision rationales with trade-off analysis
- Practical tooling examples (CLI commands, test formats)
- Strong connection to existing Sharpee patterns (transcripts, extensions)

---

**Progressive update**: Session completed 2026-01-14 20:30
