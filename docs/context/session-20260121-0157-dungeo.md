# Session Summary: 2026-01-21 - dungeo

## Status: Completed

## Goals
- Define player character system architecture (ADR-108)
- Extract grammar patterns from dungeo index.ts into modular files (Phase 1 of story-index-refactor)
- Reduce index.ts complexity while maintaining all functionality

## Completed

### ADR-108: Player Character System

Created comprehensive architecture decision record defining how stories create and manage player characters.

**Key Design Decisions:**

1. **Factory Pattern for Creation**: Stories implement `createPlayer(world, identity?)` returning player entity with all necessary traits
2. **Flexible Identity System**: PlayerIdentity includes name, pronouns, description - all optional with sensible defaults
3. **Mid-Game Character Switching**: Support for multi-protagonist stories via `switchPlayerCharacter(world, newPlayerId, oldPlayerId?)`
4. **PC↔NPC Transitions**: When switching characters:
   - Old PC becomes NPC (gains NPCTrait, loses PlayerTrait)
   - New PC becomes player (gains PlayerTrait, loses NPCTrait)
   - State preserved for return switches

**Motivation**: Future story "Reflections" needs three switchable protagonists (artist, therapist, patient). Current dungeo implementation was ad-hoc. ADR-108 provides clean patterns for both single-PC and multi-PC stories.

**Architecture Benefits:**
- Stories control player creation (no platform assumptions about traits)
- Identity customization supports diverse narratives
- Character switching enables experimental storytelling
- Clean separation: story decides "who", platform manages "how"

**Files Created:**
- `docs/architecture/adrs/adr-108-player-character-system.md` (full specification)

### Updated Story Index Refactor Plan

Aligned `docs/work/dungeo/story-index-refactor.md` with ADR-108 patterns:

**Phase Reordering:**
- Grammar extraction moved to Phase 1 (story-only, no platform deps)
- Player factory deferred to Phase 6 (requires platform changes per ADR-108)

**Player Factory Changes:**
- Replaced old BaseStory/PlayerConfig concept with ADR-108's createPlayer factory
- Dungeo will implement simple single-PC pattern:
  ```typescript
  createPlayer(world: WorldModel, identity?: PlayerIdentity): IFEntity {
    const player = world.createPlayer(identity || { name: 'You' });
    // Add dungeo-specific traits (DeathTrait, ScoreTrait, etc.)
    return player;
  }
  ```

### Phase 1: Grammar Extraction (COMPLETE)

Successfully extracted all grammar patterns from `stories/dungeo/src/index.ts` into modular `src/grammar/` folder.

**Created Files (1208 lines total):**

1. **gdt-grammar.ts** (90 lines)
   - GDT debug commands: GLOW, UNGLOW, BRIGHT, XRAY, XOBJ, CCOUNT, etc.
   - 14 patterns for testing/debugging

2. **speech-grammar.ts** (147 lines)
   - Communication verbs: SAY, COMMAND, KNOCK, ANSWER, YELL, HELLO
   - 15 patterns including "say :arg to :npc", "command :npc to :arg"

3. **puzzle-grammar.ts** (462 lines - largest file)
   - Complex puzzle interactions organized by category:
     - Walls/Panels: PUSH PANEL, LOOK BEHIND/THROUGH/UNDER
     - Poles: LOWER/RAISE/CLIMB/SLIDE/TOUCH POLE
     - Dials/Machines: TURN, SET, ACTIVATE patterns
     - Valves: TURN VALVE, OPEN/CLOSE VALVE WITH WRENCH
   - 43 patterns total

4. **ritual-grammar.ts** (132 lines)
   - Magical/special actions: BREAK, BURN, PRAY, INCANT, WAVE, RING, WIND
   - 13 patterns including "ring bell with :tool", "wave :item"

5. **liquid-grammar.ts** (167 lines)
   - Fluid interactions: POUR, FILL, DRINK FROM, TOUCH WATER, CROSS WATER
   - Rope: TIE/UNTIE TO patterns
   - Fire: LIGHT, MELT WITH TORCH
   - 16 patterns

6. **boat-grammar.ts** (103 lines)
   - Boat-specific verbs: INFLATE, DEFLATE, BOARD, DISEMBARK, LAUNCH, LAND
   - 10 patterns

7. **utility-grammar.ts** (53 lines)
   - Meta-game commands: DIAGNOSE, ROOM, RNAME, OBJECTS
   - 4 patterns

8. **index.ts** (54 lines)
   - Exports all grammar modules
   - `registerAllGrammar(grammar)` function calls all 7 registration functions
   - Clean public API

**Impact on index.ts:**
- `extendParser()` reduced from ~1000 lines to 3 lines:
  ```typescript
  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();
    registerAllGrammar(grammar);
  }
  ```
- Total index.ts lines: 2460 → 1468 (40% reduction)
- Complexity significantly reduced, easier to navigate

**Validation:**
- All transcript tests pass after extraction
- No functional changes, pure refactoring
- Grammar patterns maintain exact same behavior

**Organization Principles:**
- Each file groups related verbs by semantic domain
- puzzle-grammar.ts is intentionally larger (diverse puzzle mechanics)
- Comments preserved explaining complex patterns
- Consistent structure across all files

## Key Decisions

### 1. ADR-108 Factory Pattern Over Configuration

**Decision**: Stories implement `createPlayer(world, identity?)` factory instead of declarative PlayerConfig.

**Rationale**:
- Stories know what traits their PC needs (DeathTrait, ScoreTrait, etc.)
- Factory pattern allows complex initialization logic
- Avoids platform assumptions about "standard" player traits
- More flexible than configuration objects

**Implications**:
- Platform provides WorldModel.createPlayer() for base entity
- Stories wrap and enhance with story-specific traits
- Future stories can implement wildly different player types

### 2. Grammar Extraction Before Player Factory

**Decision**: Reordered refactor phases - grammar extraction (Phase 1) before player factory (Phase 6).

**Rationale**:
- Grammar extraction is story-only, no platform dependencies
- Player factory requires platform changes (ADR-108 implementation)
- Get quick wins first, defer platform changes
- Reduces index.ts complexity immediately

**Implications**:
- Can continue story development while platform work proceeds
- Phase 1 complete, ready for Phase 2 (region extraction)
- Player factory becomes later integration task

### 3. Puzzle Grammar as Single File

**Decision**: Keep all puzzle patterns in one `puzzle-grammar.ts` file (462 lines) instead of splitting further.

**Rationale**:
- Puzzles span multiple categories (walls, poles, dials, valves, machines)
- Splitting into 5+ files would fragment related patterns
- "Puzzle interactions" is coherent semantic grouping
- Internal comments provide navigation

**Trade-off**: Largest single grammar file, but maintains cohesion of puzzle mechanics.

## Architectural Notes

### Story Grammar Organization Pattern

The grammar extraction established a clear pattern for story-specific grammar:

```
stories/{story}/src/grammar/
├── index.ts                 # Public API: registerAllGrammar()
├── {domain}-grammar.ts      # Domain-specific patterns
└── ...
```

**Best Practices Discovered:**
1. **Group by semantic domain**, not syntactic similarity
2. **One registration function per file**: `registerXxxGrammar(grammar)`
3. **Preserve pattern comments** explaining non-obvious constraints
4. **Keep related verbs together** even if file gets large (puzzle-grammar.ts)
5. **Export registration functions** from index.ts for selective use

### Player System Design Insights

ADR-108 reveals clean architecture boundary:

| Layer    | Responsibility                                    |
| -------- | ------------------------------------------------- |
| Platform | WorldModel.createPlayer() - base entity creation  |
| Platform | PlayerTrait, NPCTrait - identity management       |
| Platform | switchPlayerCharacter() - transition mechanics    |
| Story    | createPlayer() factory - trait composition        |
| Story    | When/why to switch characters                     |

**Key Insight**: Platform provides primitives (traits, switching), story provides policy (what traits, when to switch).

### Code Smell: index.ts Still Too Large

Even after Phase 1, `stories/dungeo/src/index.ts` is 1468 lines. Remaining complexity:

- Region definitions (~600 lines of room creation)
- NPC instantiation (~200 lines)
- Event handler registration (~150 lines)
- Daemon/fuse setup (~100 lines)

**Next Phases Address This:**
- Phase 2: Extract regions → `src/regions/`
- Phase 3: Extract NPCs → `src/npcs/`
- Phase 4: Extract event handlers → `src/event-handlers/`
- Phase 5: Extract daemons → `src/daemons/`

Target: Reduce index.ts to ~200 lines (just story metadata and wiring).

## Open Items

### Short Term

1. **Phase 2: Region Extraction** - Move room creation to `src/regions/{region}/` folders
2. **Test grammar files individually** - Ensure each can be imported/tested in isolation
3. **Update CLAUDE.md** - Document grammar organization pattern for future stories

### Long Term

1. **Implement ADR-108 in platform** - Add WorldModel.createPlayer(), switchPlayerCharacter()
2. **Phase 6: Player Factory** - Migrate dungeo to ADR-108 createPlayer pattern
3. **Multi-PC story prototype** - Validate ADR-108 with "Reflections" design

## Files Modified

**Created** (9 files, 1259 lines):
- `docs/architecture/adrs/adr-108-player-character-system.md` (51 lines) - Player system architecture
- `stories/dungeo/src/grammar/index.ts` (54 lines) - Grammar API
- `stories/dungeo/src/grammar/gdt-grammar.ts` (90 lines) - Debug commands
- `stories/dungeo/src/grammar/speech-grammar.ts` (147 lines) - Communication verbs
- `stories/dungeo/src/grammar/puzzle-grammar.ts` (462 lines) - Puzzle interactions
- `stories/dungeo/src/grammar/ritual-grammar.ts` (132 lines) - Magical actions
- `stories/dungeo/src/grammar/liquid-grammar.ts` (167 lines) - Fluids and ropes
- `stories/dungeo/src/grammar/boat-grammar.ts` (103 lines) - Boat operations
- `stories/dungeo/src/grammar/utility-grammar.ts` (53 lines) - Meta-game commands

**Modified** (2 files):
- `stories/dungeo/src/index.ts` - Extracted ~1000 lines of grammar to src/grammar/, reduced from 2460 to 1468 lines
- `docs/work/dungeo/story-index-refactor.md` - Updated Phase 1 as complete, aligned Phase 6 with ADR-108

## Test Results

All transcript tests passing after grammar extraction:

```bash
$ ./scripts/build-dungeo.sh --skip dungeo
$ node dist/sharpee.js --test stories/dungeo/tests/transcripts/navigation.transcript
✓ PASS

$ node dist/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript
✓ PASS

# (Additional transcripts tested - all passing)
```

No regressions introduced by refactoring.

## Notes

**Session duration**: ~2.5 hours

**Approach**:
1. Analyzed existing player creation code across dungeo and leaflet
2. Designed ADR-108 to support both single-PC and multi-PC patterns
3. Updated refactor plan to sequence story-only work first
4. Systematically extracted grammar patterns by semantic domain
5. Validated each step with transcript tests

**Tooling**: Used Write tool for new files (grammar modules), Edit tool for index.ts modifications, preserved all existing comments and patterns.

**Quality**: Zero functional changes - pure structural refactoring. All patterns maintain exact same priority, constraints, and action mappings.

---

**Progressive update**: Session completed 2026-01-21 01:57 AM
