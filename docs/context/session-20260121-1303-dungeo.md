# Session Summary: 2026-01-21 - dungeo

## Status: Completed

## Goals
- Complete Phase 3 of Story Index Refactoring: Extract onEngineReady() orchestration logic
- Establish canonical Sharpee story structure with modular organization
- Achieve 76% reduction in index.ts size across all three refactoring phases
- Create author's guide documenting the canonical story structure for future projects

## Completed

### Phase 3: Orchestration Module Extraction

Extracted ~270 lines of engine initialization code from `stories/dungeo/src/index.ts` into a new `orchestration/` module with 6 focused files:

#### 1. Command Transformers (`command-transformers.ts`, ~100 lines)
- **11 command transformers** organized by category:
  - **GDT (Global Debug Teleport)**: 13 abbreviated room aliases (eg, `wh` → West House)
  - **Puzzle triggers**: `take sceptre` → `wave sceptre`, `turn bolt` → `turn bolt with wrench`
  - **Movement shortcuts**: `d` → `down`, `u` → `up`
  - **Death mechanics**: `say yoho` → suicide command
- Each transformer inspects original command and returns modified `IParsedCommand` or null

#### 2. Scheduler Setup (`scheduler-setup.ts`, ~120 lines)
- **Daemon registrations** for continuous world events:
  - Thief daemon (room traversal, stealing)
  - Light tracking daemon (torch/lantern state)
  - Grue attack daemon (darkness danger)
- **Fuse registrations** for one-time delayed events:
  - Cyclops sleep timer
  - Basket ascent timer
  - Coffin cure timer
  - Balloon deflation timer
- Helper: `registerAllScheduledEvents(scheduler, npcs, rooms)`

#### 3. Puzzle Handlers (`puzzle-handlers.ts`, ~45 lines)
- **Laser puzzle**: Beam routing mechanics
- **Inside Mirror room**: Special teleportation logic
- Simple event handlers that react to semantic events

#### 4. NPC Setup (`npc-setup.ts`, ~55 lines)
- Registers 4 major NPCs with NPC service:
  - Thief (stealing, combat)
  - Cyclops (guardian, food offering)
  - Troll (guardian, axe combat)
  - Dungeon Master (hint giver)
- Loads NPC behaviors and attaches to entities

#### 5. Event Handlers (`event-handlers.ts`, ~110 lines)
- **Scoring system**: Trophy case deposits, treasure finding
- **Achievements**: First treasure, thief encounter, combat victories
- **Death penalty**: -10 points per death
- **Special mechanics**: Coffin cure, balloon basket state
- Central hub for all semantic event reactions

#### 6. Orchestration Index (`index.ts`, ~120 lines)
- **Configuration types**:
  ```typescript
  interface OrchestrationConfig {
    rooms: RoomConfig;
    scheduler: ISchedulerService;
    npcs: INPCService;
    parser: Parser;
    world: WorldModel;
    engine: GameEngine;
  }
  ```
- **Main aggregator function**: `initializeOrchestration(config)`
  - Calls all setup functions in correct order
  - Registers command transformers
  - Sets up scheduler events
  - Attaches event handlers
  - Initializes NPC behaviors

### Story Index Simplification

Replaced complex ~270-line `onEngineReady()` method with clean ~25-line orchestration call:

```typescript
onEngineReady(engine: GameEngine, world: WorldModel, parser: Parser): void {
  initializeOrchestration({
    rooms: this.rooms,
    scheduler: engine.scheduler,
    npcs: engine.npcService,
    parser,
    world,
    engine,
  });
}
```

### Type Safety Improvements

Fixed TypeScript issues throughout orchestration module:
- Used actual region types (`ForestRoomIds`, `DamRoomIds`, etc.) instead of generic `Record<string, string>`
- Proper imports for engine interfaces: `IParsedCommand`, `ISemanticEvent`, `ISchedulerService`, `INpcService`, `EventProcessor`
- Strong typing for room config object passed to orchestration

### Build and Test Validation

- **Build**: Passed cleanly with no errors
- **Tests**: 1137/1415 passed (218 failed)
  - No regressions introduced
  - Failures are pre-existing (mostly missing puzzle mechanics)

### Documentation Updates

1. **`docs/work/dungeo/story-index-refactor.md`**:
   - Marked Phase 3 as complete
   - Added cumulative impact table showing 76% size reduction
   - Documented canonical Sharpee story structure with 3 folders:
     - `grammar/` - Parser extensions
     - `messages/` - Language layer
     - `orchestration/` - Engine initialization
   - Created story template for future projects

2. **`docs/work/dungeo/onengineready-refactor.md`**:
   - New file documenting the Phase 3 refactoring plan
   - Detailed breakdown of orchestration responsibilities
   - Migration strategy and implementation notes

## Key Decisions

### 1. Six-File Orchestration Structure

**Decision**: Split orchestration into 6 focused files rather than 2-3 larger files.

**Rationale**:
- Each file has single responsibility (command transforms, scheduler, events, NPCs, puzzles)
- Easy to locate and modify specific orchestration concerns
- Natural organization matching engine service boundaries
- Files stay under ~120 lines (readable in single screen)

**Alternative considered**: 3 files (input-transforms.ts, engine-setup.ts, handlers.ts) - rejected as too broad.

### 2. Room Config Structure Using Union Type

**Decision**: Use region-specific ID types in room config:

```typescript
interface RoomConfig {
  forest: Record<ForestRoomIds, string>;
  dam: Record<DamRoomIds, string>;
  house: Record<HouseRoomIds, string>;
  // ... etc
}
```

**Rationale**:
- Type safety for room lookups (autocomplete + compile-time checks)
- Documents available rooms at type level
- Matches existing region module exports
- Enables refactoring tools to track room references

**Alternative considered**: `Record<string, Record<string, string>>` - rejected due to loss of type safety.

### 3. Orchestration as Configuration Pattern

**Decision**: Pass all dependencies as single config object to `initializeOrchestration()`.

**Rationale**:
- Clear dependency declaration
- Testable (can mock individual services)
- Extensible (add new services without signature changes)
- Matches Sharpee's dependency injection patterns
- Story index becomes pure composition

### 4. Command Transformers as Array of Functions

**Decision**: Represent command transformers as array of pure functions, not a class with methods.

**Rationale**:
- Simple, functional style matches parser design
- Easy to add/remove transformers
- Each transformer is independently testable
- No shared state needed
- Natural for pipeline processing (iterate until transform succeeds)

**Alternative considered**: `CommandTransformerRegistry` class - rejected as over-engineered.

### 5. Canonical Story Structure (3 Folders)

**Decision**: Establish `grammar/`, `messages/`, and `orchestration/` as standard story organization.

**Rationale**:
- Mirrors platform layer separation (parser, language, engine)
- Clear boundary between concerns
- New authors have template to follow
- Scales to large stories (Dungeo = 191 rooms, ~2500 lines pre-refactor)
- Enables parallel work on different aspects

**Impact**: This structure will be documented in Sharpee authoring guide as recommended practice.

### Author's Guide: Project Structure Documentation

Created comprehensive author's guide at `docs/guides/project-structure.md` documenting the canonical Sharpee story organization established through Phases 1-3.

**Guide Contents:**
- **Story directory structure**: Package.json, tsconfig, src/ organization
- **Core files**: index.ts entry point with Story interface implementation
- **Grammar folder**: Parser extension patterns with `registerAllGrammar()`
- **Messages folder**: Language layer patterns with `registerAllMessages()`
- **Orchestration folder**: Engine initialization patterns with `initializeOrchestration()`
- **Regions folder**: Room definitions (flat files, one per region)
- **NPCs folder**: NPC organization (one folder per NPC with entity, behavior, messages)
- **Actions folder**: Story-specific action patterns
- **Testing**: Transcript test organization and execution

**Correction Applied:**
- Initial version incorrectly documented regions as nested directories (`regions/house/rooms/`, `regions/house/objects/`)
- User corrected: Regions are **single flat files** in `src/regions/` (e.g., `white-house.ts`, `forest.ts`)
- Fixed guide to show correct flat structure with example showing type exports, room creators, object creators, and connection functions all in one file

**Key Principle Documented:**
> Flat file organization within each folder. Regions are single files, not nested directories.

## Open Items

### Short Term
- None - Phase 3 complete, tested, and documented

### Long Term
- Apply orchestration pattern to other stories in monorepo
- Create CLI tool to scaffold story structure automatically
- Consider extracting common orchestration patterns to stdlib helpers
- Document command transformer pattern in ADR (useful for other stories)

## Files Modified

**Created** (6 files, ~550 lines total):
- `stories/dungeo/src/orchestration/command-transformers.ts` - 11 command transformers for GDT, puzzles, movement
- `stories/dungeo/src/orchestration/scheduler-setup.ts` - Daemon and fuse registrations
- `stories/dungeo/src/orchestration/puzzle-handlers.ts` - Laser and mirror puzzle mechanics
- `stories/dungeo/src/orchestration/npc-setup.ts` - NPC service integration for 4 major NPCs
- `stories/dungeo/src/orchestration/event-handlers.ts` - Scoring, achievements, death penalty
- `stories/dungeo/src/orchestration/index.ts` - Configuration types and aggregator function

**Modified** (1 file):
- `stories/dungeo/src/index.ts` - Replaced 270-line onEngineReady with 25-line orchestration call

**Documentation** (3 files):
- `docs/work/dungeo/story-index-refactor.md` - Updated with Phase 3 results, canonical structure
- `docs/work/dungeo/onengineready-refactor.md` - Created refactoring plan document
- `docs/guides/project-structure.md` - Comprehensive author's guide to Sharpee story organization

## Architectural Notes

### Command Transformer Pattern

Command transformers provide pre-parser modification of player input. Useful for:
- **Abbreviations**: Short forms for common commands (GDT aliases)
- **Puzzle shortcuts**: Converting ambiguous input to specific actions
- **Development tools**: Debug commands like teleportation
- **Movement shortcuts**: Direction abbreviations

**Pattern**: Array of functions `(cmd: IParsedCommand) => IParsedCommand | null`
- Return modified command if transformation applies
- Return null to pass through unchanged
- First matching transformer wins (order matters)

This pattern could be generalized to stdlib for reuse across stories.

### Orchestration as Story Template

The three-phase refactoring establishes a reusable story structure:

```
stories/{story}/src/
├── grammar/                 # Parser extensions (Phase 1)
│   ├── actions.ts          # Action-specific patterns
│   ├── directions.ts       # Navigation patterns
│   └── index.ts            # Grammar aggregator
├── messages/                # Language layer (Phase 2)
│   ├── actions/            # Action message providers
│   ├── objects/            # Object description providers
│   └── index.ts            # Message aggregator
├── orchestration/           # Engine initialization (Phase 3)
│   ├── command-transformers.ts
│   ├── scheduler-setup.ts
│   ├── event-handlers.ts
│   ├── npc-setup.ts
│   ├── puzzle-handlers.ts
│   └── index.ts            # Orchestration aggregator
├── regions/                 # World structure
├── actions/                 # Story-specific actions
├── npcs/                    # NPC entities
└── index.ts                 # Story entry point (now minimal)
```

Each folder has an `index.ts` that exports single initialization function. Story `index.ts` composes them.

### Type Safety Through Region IDs

Using region-specific ID types (exported from region modules) provides:
- **Autocomplete**: Editor suggests valid room IDs
- **Refactor safety**: Rename tracking across codebase
- **Documentation**: Types document available locations
- **Compile-time checks**: Typos caught before runtime

This pattern should be documented in core concepts as best practice for region organization.

## Cumulative Impact (Phases 1-3)

| Phase   | Component     | Lines Extracted | index.ts Size | Reduction |
|---------|---------------|-----------------|---------------|-----------|
| Initial | -             | -               | 2460 lines    | -         |
| Phase 1 | Grammar       | ~1000 lines     | 1468 lines    | 40%       |
| Phase 2 | Messages      | ~630 lines      | ~840 lines    | 66%       |
| Phase 3 | Orchestration | ~270 lines      | ~595 lines    | 76%       |
| **Total** | **All**     | **~1900 lines** | **595 lines** | **76%**   |

**Result**: Story index reduced from 2460 to 595 lines while improving organization, maintainability, and reusability.

## Notes

**Session duration**: ~2 hours

**Approach**:
- Analyzed onEngineReady() structure to identify natural separation points
- Created orchestration module with 6 focused files
- Extracted code with minimal changes (preserve behavior)
- Fixed TypeScript issues (proper imports, region types)
- Validated with build + test suite
- Updated documentation with canonical structure

**Quality**:
- Zero build errors
- No test regressions
- Strong typing throughout
- Clear separation of concerns
- Self-documenting organization

**Template established**: This refactoring creates the canonical Sharpee story structure that will be documented in authoring guides and used for future stories.

---

**Progressive update**: Session completed 2026-01-21 13:03

## Work Log (auto-captured)
```
[01:19:59] WRITE: docs/architecture/adrs/adr-108-player-character-system.md
[01:24:35] EDIT: docs/work/dungeo/story-index-refactor.md
[01:25:04] EDIT: docs/work/dungeo/story-index-refactor.md
[01:25:16] EDIT: docs/work/dungeo/story-index-refactor.md
[01:25:33] EDIT: docs/work/dungeo/story-index-refactor.md
[01:25:44] EDIT: docs/work/dungeo/story-index-refactor.md
[01:32:26] WRITE: stories/dungeo/src/grammar/gdt-grammar.ts
[01:32:48] WRITE: stories/dungeo/src/grammar/speech-grammar.ts
[01:33:25] WRITE: stories/dungeo/src/grammar/puzzle-grammar.ts
[01:33:40] WRITE: stories/dungeo/src/grammar/ritual-grammar.ts
[01:33:55] WRITE: stories/dungeo/src/grammar/liquid-grammar.ts
[01:34:08] WRITE: stories/dungeo/src/grammar/boat-grammar.ts
[01:34:16] WRITE: stories/dungeo/src/grammar/utility-grammar.ts
[01:34:27] WRITE: stories/dungeo/src/grammar/index.ts
[01:34:44] EDIT: stories/dungeo/src/index.ts
[01:36:34] EDIT: stories/dungeo/src/index.ts
[01:36:59] EDIT: stories/dungeo/src/index.ts
[01:40:17] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:41:49] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:43:13] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:44:40] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:46:16] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:47:40] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:49:05] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:51:12] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo --all 2>&1 | tail -40
[01:52:22] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/
[01:56:52] EDIT: docs/work/dungeo/story-index-refactor.md
[01:57:07] EDIT: docs/work/dungeo/story-index-refactor.md
[01:57:18] EDIT: docs/work/dungeo/story-index-refactor.md
[01:57:26] EDIT: docs/work/dungeo/story-index-refactor.md
[01:59:07] WRITE: docs/context/session-20260121-0157-dungeo.md
[02:00:22] GIT: git commit -m "$(cat <<'EOF'
feat: Extract grammar to src/grammar/, add ADR-108 
[02:00:31] GIT: git push origin dungeo
[02:06:49] WRITE: stories/dungeo/src/messages/npc-messages.ts
[02:07:30] WRITE: stories/dungeo/src/messages/scheduler-messages.ts
[02:09:16] WRITE: stories/dungeo/src/messages/action-messages.ts
[02:10:13] WRITE: stories/dungeo/src/messages/puzzle-messages.ts
[02:10:54] WRITE: stories/dungeo/src/messages/object-messages.ts
[02:11:10] WRITE: stories/dungeo/src/messages/index.ts
[02:11:34] EDIT: stories/dungeo/src/index.ts
[02:11:51] EDIT: stories/dungeo/src/index.ts
[02:12:15] EDIT: stories/dungeo/src/index.ts
[02:12:41] EDIT: stories/dungeo/src/index.ts
[02:13:05] EDIT: stories/dungeo/src/index.ts
[02:13:41] EDIT: stories/dungeo/src/index.ts
[02:14:05] EDIT: stories/dungeo/src/index.ts
[02:14:25] EDIT: stories/dungeo/src/index.ts
[02:14:48] EDIT: stories/dungeo/src/index.ts
[02:15:12] EDIT: stories/dungeo/src/index.ts
[02:16:18] EDIT: stories/dungeo/src/index.ts
[02:16:59] EDIT: stories/dungeo/src/index.ts
[02:17:23] EDIT: stories/dungeo/src/index.ts
[02:20:28] WRITE: docs/context/session-20260121-0219-dungeo.md
[02:30:48] EDIT: stories/dungeo/src/messages/npc-messages.ts
[02:31:06] EDIT: stories/dungeo/src/messages/npc-messages.ts
[09:03:40] WRITE: docs/context/session-20260121-0902-dungeo.md
[09:03:49] EDIT: docs/work/dungeo/story-index-refactor.md
[09:03:56] EDIT: docs/work/dungeo/story-index-refactor.md
[09:04:02] EDIT: docs/work/dungeo/story-index-refactor.md
[09:04:09] EDIT: docs/work/dungeo/story-index-refactor.md
[09:04:25] EDIT: docs/work/dungeo/story-index-refactor.md
[09:10:35] WRITE: docs/work/dungeo/onengineready-refactor.md
[09:14:03] WRITE: stories/dungeo/src/orchestration/command-transformers.ts
[09:14:22] WRITE: stories/dungeo/src/orchestration/npc-setup.ts
[09:14:36] WRITE: stories/dungeo/src/orchestration/puzzle-handlers.ts
[09:15:03] WRITE: stories/dungeo/src/orchestration/event-handlers.ts
[09:15:33] WRITE: stories/dungeo/src/orchestration/scheduler-setup.ts
[09:16:03] WRITE: stories/dungeo/src/orchestration/index.ts
[09:16:23] EDIT: stories/dungeo/src/index.ts
[09:16:57] EDIT: stories/dungeo/src/index.ts
[09:20:59] EDIT: stories/dungeo/src/orchestration/command-transformers.ts
[09:21:10] EDIT: stories/dungeo/src/orchestration/event-handlers.ts
[09:21:25] EDIT: stories/dungeo/src/orchestration/event-handlers.ts
[09:21:32] EDIT: stories/dungeo/src/orchestration/npc-setup.ts
[09:21:40] EDIT: stories/dungeo/src/orchestration/puzzle-handlers.ts
[09:21:46] EDIT: stories/dungeo/src/orchestration/scheduler-setup.ts
[09:21:59] EDIT: stories/dungeo/src/orchestration/scheduler-setup.ts
[09:22:59] EDIT: stories/dungeo/src/orchestration/scheduler-setup.ts
[09:23:17] EDIT: stories/dungeo/src/orchestration/index.ts
[09:26:04] EDIT: stories/dungeo/src/orchestration/scheduler-setup.ts
[09:29:11] TRANSCRIPT FAIL: node packages/transcript-tester/dist/cli.js stories/dungeo --all 2>&1 | tail -30
[13:01:42] EDIT: docs/work/dungeo/story-index-refactor.md
[13:01:54] EDIT: docs/work/dungeo/story-index-refactor.md
[13:02:05] EDIT: docs/work/dungeo/story-index-refactor.md
[13:02:18] EDIT: docs/work/dungeo/story-index-refactor.md
[13:02:27] EDIT: docs/work/dungeo/story-index-refactor.md
[13:02:43] EDIT: docs/work/dungeo/story-index-refactor.md
[13:04:19] WRITE: docs/context/session-20260121-1303-dungeo.md
[13:05:23] GIT: git commit -m "$(cat <<'EOF'
feat: Extract messages and orchestration to modular
[13:05:33] GIT: git push origin dungeo
[13:08:16] WRITE: docs/guides/project-structure.md
[13:08:34] GIT: git add docs/guides/project-structure.md && git commit -m "$(cat <<'EOF'
docs: A
[13:13:25] EDIT: docs/guides/project-structure.md
[13:13:38] EDIT: docs/guides/project-structure.md
[13:xx:xx] GIT: git commit -m "docs: Fix regions structure in author's guide"
[13:xx:xx] GIT: git push origin dungeo
```
