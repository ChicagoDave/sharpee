# Session Summary: 2026-01-14 - dungeo

## Status: Completed

## Goals
- Complete TR-001 playtest fixes (all 5 issues from first playtest transcript)
- Fix transcript tester to filter debug events from assertions
- Fix text service issues from previous session (template placeholders, missing messages)
- Document playtesting procedure
- Create ADR for terminal client architecture

## Completed

### 1. TR-001 Playtest Fixes (All Issues Resolved)

This session completed all fixes for issues discovered in the first playtest transcript (`tr-001.txt`). Full tracking in `docs/testing/tr-001-fixes.md`.

#### Issue #1: "TURN LAMP ON" Pattern Missing (FIXED)

**Problem**: "turn lamp on" (verb-object-particle) wasn't recognized, only "turn on lamp" (verb-particle-object) worked.

**Solution**: Added complementary phrasal verb patterns to grammar:
```typescript
// packages/parser-en-us/src/grammar.ts
grammar.define('turn :device on')
  .where('device', (scope) => scope.touchable())
  .mapsTo('if.action.switching_on')
  .build();

grammar.define('turn :device off')
  .where('device', (scope) => scope.touchable())
  .mapsTo('if.action.switching_off')
  .build();
```

**Impact**: Both "turn on lamp" and "turn lamp on" now work, matching natural language flexibility.

#### Issue #2: Cellar UP Exit Blocked When Trapdoor Closed (FIXED)

**Problem**: Player could go UP from Cellar even when trapdoor was closed (not yet revealed). This broke the rug/trapdoor puzzle.

**Root Cause**: Cellar had static UP exit to Living Room.

**Solution**: Implemented dynamic exit system using event handlers:
1. Removed static UP exit from Cellar room definition
2. Added `trapdoor.opened` event handler in Living Room that creates Cellar UP exit when trapdoor opens
3. Added `trapdoor.closed` event handler that removes Cellar UP exit when trapdoor closes
4. Added `rug.pushed` event handler that reveals trapdoor and creates initial Cellar↔Living Room connection

**Code Locations**:
- `stories/dungeo/src/regions/underground.ts` - Removed static exit
- `stories/dungeo/src/regions/house-interior.ts` - Added event handlers
- `stories/dungeo/src/index.ts` - Added trapdoor.opened message ID

**Pattern**: This demonstrates dynamic exit management based on puzzle state, which will be useful for other conditional passages (locked doors, collapsed tunnels, etc.).

#### Issue #3a: Trap Door Entity Vocabulary (FIXED)

**Problem**: Command "open trap door" failed because entity was named "trapdoor" (one word) but player used "trap door" (two words).

**Solution**: Changed entity design:
- Changed primary name from "trapdoor" to "trap door" (two words)
- Added "trap" as adjective
- Added "trapdoor" as synonym for one-word usage
- Updated all messages to use "trap door"

**Rationale**: The canonical Zork uses "trap door" (two words), so we should match that. Supporting both spellings via synonyms provides flexibility.

#### Issue #3b: Command Failed Silent Failure (FIXED)

**Problem**: When entity resolution failed with `modifiers_not_matched`, no user-visible error appeared. The `command.failed` event was emitted but not displayed.

**Root Cause**: TextService had handlers for `command.unknown` and `command.ambiguous` but not `command.failed`.

**Solution**: Added `command.failed` handler to TextService:
```typescript
// packages/text-service/src/text-service.ts
this.engine.on('command.failed', (event) => {
  if (this.config.verbose) {
    this.output.write(`Command failed: ${event.data.reason}\n`);
  } else {
    this.output.write("I don't understand that command.\n");
  }
});
```

**Impact**: All command failures now produce user feedback instead of silent failures.

#### Issue #3c: Trap Door State-Dependent Descriptions (FIXED)

**Problem**: Examining trap door showed same description whether open or closed.

**Solution**: Updated trap door entity with conditional description:
```typescript
description: (world) => {
  const door = world.getEntity(trapDoorId);
  const isOpen = door?.getTrait<OpenableTrait>(OpenableTrait.type)?.isOpen;
  return isOpen
    ? "The trap door is open, revealing darkness below."
    : "The trap door is closed.";
}
```

**Impact**: Room and entity descriptions now reflect actual game state, improving immersion.

### 2. Transcript Tester Enhancement

**Problem**: Event assertions in transcripts failed because `system.*` debug events appeared in actual output but not expected output.

**Solution**: Modified transcript runner to filter `system.*` events from event assertions:
```typescript
// packages/transcript-tester/src/runner.ts
const actualEvents = history
  .filter(e => e.type === 'event')
  .filter(e => !e.event?.startsWith('system.'));  // Filter debug events
```

**Rationale**: Debug events are for developer diagnosis, not game behavior verification. Transcripts test game logic, not debug output.

### 3. Text Service Fixes (Previous Session Issues)

Fixed two text service issues discovered at end of previous session:

#### Template Placeholder Substitution

**Problem**: Room descriptions showed literal `{name}` and `{description}` instead of substituted values.

**Root Cause**: `looking-data.ts` used placeholder syntax without defining actual message content.

**Solution**: Updated looking messages with proper templates:
```typescript
// packages/stdlib/src/actions/standard/looking/looking-data.ts
export const LOOKING_MESSAGES = {
  'look.generic': (ctx: ActionContext) =>
    `${ctx.target.name}\n${ctx.target.description || 'You see nothing special.'}`,
  // ... other messages
};
```

#### Missing Going Messages

**Problem**: Blocked movement showed `movement_blocked` message ID instead of prose.

**Root Cause**: `lang-en-us/src/actions/going.ts` was missing message definitions.

**Solution**: Added complete message set:
```typescript
export const goingMessages: Record<string, MessageTemplate> = {
  'going.blocked.no_exit': "You can't go that way.",
  'going.blocked.exit_blocked': (ctx) => ctx.sharedData.blockReason || "Something blocks your way.",
  'going.moved': (ctx) => '', // Movement handled by look
};
```

### 4. Documentation

Created comprehensive documentation for playtesting workflow:

#### Testing Procedure (docs/testing/README.md)

**Purpose**: Define repeatable playtesting process for catching bugs before they ship.

**Key Sections**:
- Playtest procedure (save transcript, analyze failures, create tracking doc)
- Transcript naming convention (`tr-NNN.txt` for raw, `tr-NNN-fixes.md` for tracking)
- Issue classification (Parser, Entity Resolution, Puzzle, Text, Platform)
- Fix workflow (diagnose → fix → verify → document)

**Impact**: Establishes quality gate for dungeo development.

#### Issue Tracking (docs/testing/tr-001-fixes.md)

**Purpose**: Track all issues from first playtest with detailed root cause analysis.

**Structure**:
- Issue description with line number from transcript
- Category and severity
- Root cause analysis with debug traces
- Solution with code snippets
- Status tracking

**Status**: All 5 issues from TR-001 now resolved.

#### Terminal Client ADR (docs/architecture/adrs/adr-098-terminal-client.md)

**Purpose**: Document the three-layer client architecture that emerged during dungeo development.

**Architecture**:
```
┌─────────────────────────────────────┐
│   Presentation Layer                │
│   (terminal-client package)         │
│   - Blessed UI components           │
│   - Layout management               │
│   - User input handling             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Integration Layer                 │
│   (text-service package)            │
│   - Event → text conversion         │
│   - Message templating              │
│   - Language-aware output           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Game Layer                        │
│   (GameEngine)                      │
│   - Game state                      │
│   - Command execution               │
│   - Event emission                  │
└─────────────────────────────────────┘
```

**Key Decision**: TextService is the integration layer that bridges GameEngine events to human-readable text. This allows:
- Multiple client types (terminal, web, voice)
- Language localization
- Consistent message formatting
- Separation of game logic from presentation

**Status**: Accepted (captures existing architecture)

#### CLAUDE.md Updates

Added guidance for faster testing workflow:
- Use `--skip` flag with build script to skip unchanged packages
- Fast testing workflow: `bundle-sharpee.sh` → `fast-transcript-test.sh`
- When to use full build vs. fast bundle

## Key Decisions

### 1. Dynamic Exit Management Pattern

**Decision**: Use event handlers to add/remove exits dynamically based on game state changes.

**Rationale**:
- Cellar exit needed to exist only when trapdoor is open
- Static exits can't model conditional passages
- Event handlers provide declarative state management

**Pattern**:
```typescript
world.registerEventHandler('trapdoor.opened', (event, world) => {
  // Add Cellar UP exit when trapdoor opens
  const cellar = world.getEntity(CELLAR_ID);
  addDynamicExit(cellar, 'up', LIVING_ROOM_ID);
});

world.registerEventHandler('trapdoor.closed', (event, world) => {
  // Remove Cellar UP exit when trapdoor closes
  const cellar = world.getEntity(CELLAR_ID);
  removeDynamicExit(cellar, 'up');
});
```

**Impact**: This pattern will be reused for other conditional passages (locked doors, collapsible tunnels, magic portals).

### 2. Two-Word Entity Names

**Decision**: Use "trap door" (two words) as primary name, not "trapdoor" (one word).

**Rationale**:
- Matches canonical Zork vocabulary
- More natural for compound nouns that can be spoken separately
- Synonym system allows supporting both spellings

**Alternative Considered**: Use "trapdoor" as primary with "trap door" as synonym
- Rejected because players naturally type "trap door" (two words)
- Making the common case the primary name reduces cognitive load

### 3. System Event Filtering in Transcripts

**Decision**: Filter `system.*` events from transcript event assertions.

**Rationale**:
- Debug events are for developers, not game behavior tests
- Including debug events makes transcripts brittle (break when debug output changes)
- Transcripts should verify observable game behavior, not internal diagnostics

**Impact**: Transcripts remain stable as debug instrumentation evolves.

## Open Items

### Short Term
- ✅ All TR-001 issues resolved
- Test rug/trapdoor puzzle in full walkthrough
- Create TR-002 with next playtest transcript
- Consider adding more state-dependent descriptions for other entities

### Long Term
- Formalize dynamic exit API (currently using direct entity manipulation)
- Consider adding debug flag to show system events in interactive play mode
- Evaluate whether phrasal verb patterns should be auto-generated for all switching actions

## Files Modified

**Parser** (1 file):
- `packages/parser-en-us/src/grammar.ts` - Added "turn :device on/off" phrasal verb patterns

**Text Service** (1 file):
- `packages/text-service/src/text-service.ts` - Added command.failed handler for user-visible errors

**Stdlib** (2 files):
- `packages/stdlib/src/actions/standard/looking/looking-data.ts` - Fixed template placeholders
- `packages/lang-en-us/src/actions/going.ts` - Added missing movement blocked messages

**Transcript Tester** (1 file):
- `packages/transcript-tester/src/runner.ts` - Filter system.* events from assertions

**Story (Dungeo)** (3 files):
- `stories/dungeo/src/regions/house-interior.ts` - Trapdoor entity + event handlers
- `stories/dungeo/src/regions/underground.ts` - Removed static Cellar UP exit
- `stories/dungeo/src/index.ts` - Added trapdoor.opened message ID

**Transcripts** (1 file):
- `stories/dungeo/tests/transcripts/rug-trapdoor.transcript` - Updated for "trap door" naming

**Documentation** (4 files):
- `docs/testing/README.md` - Playtesting procedure (NEW)
- `docs/testing/tr-001-fixes.md` - Issue tracking for first playtest (NEW)
- `docs/architecture/adrs/adr-098-terminal-client.md` - Terminal client architecture (NEW)
- `CLAUDE.md` - Added --skip flag usage and fast testing guidance

## Architectural Notes

### Playtesting as Quality Gate

This session established playtesting as a formal quality gate for dungeo development:

1. **Create Transcript**: Real player session with fresh eyes
2. **Analyze Failures**: For each issue, determine root cause and fix location
3. **Track Issues**: Document in `tr-NNN-fixes.md` with severity and status
4. **Fix Systematically**: Address platform bugs before story bugs
5. **Verify**: Rerun transcript to confirm fixes
6. **Document**: Update CLAUDE.md with patterns learned

**Impact**: This workflow caught 5 significant bugs (parser, entity resolution, puzzle logic, text service) that unit tests didn't find. Playtesting exercises the full system integration in ways unit tests can't.

### Event-Driven State Management

The trapdoor puzzle demonstrates event-driven state management:

```
User Action: PUSH RUG
├── 1. pushing action executes
├── 2. Emits: rug.pushed event
├── 3. Event handler reveals trapdoor entity
├── 4. Event handler creates Cellar↔Living Room connection
└── 5. Player can now OPEN TRAP DOOR

User Action: OPEN TRAP DOOR
├── 1. opening action executes
├── 2. Emits: trapdoor.opened event
├── 3. Event handler adds UP exit from Cellar
└── 4. Player can now GO UP from Cellar

User Action: CLOSE TRAP DOOR
├── 1. closing action executes
├── 2. Emits: trapdoor.closed event
├── 3. Event handler removes UP exit from Cellar
└── 4. Player now trapped in Cellar (unless opens again)
```

**Key Insight**: Puzzle state changes are side effects of standard actions, orchestrated via event handlers. This keeps action code generic and reusable while allowing story-specific puzzle logic.

### Text Service as Integration Layer

The text service emerged as critical integration layer:

**Before** (broken):
- GameEngine emits events
- Terminal client subscribes to events
- Client tries to convert events to text
- Result: Client needs game logic knowledge

**After** (working):
- GameEngine emits events
- TextService subscribes to events
- TextService converts to text using lang-en-us
- Terminal client displays text
- Result: Clean separation of concerns

**Benefits**:
- Client agnostic: Works with any output device
- Language agnostic: Swap lang-en-us for lang-es-es
- Testable: Text generation is pure function of events
- Maintainable: Game logic changes don't affect client

## Testing Notes

### Fast Testing Workflow

For story-only changes (no platform modifications):

```bash
# 1. Bundle story + platform into single file
./scripts/bundle-sharpee.sh

# 2. Run transcript using bundled code
./scripts/fast-transcript-test.sh stories/dungeo/tests/transcripts/rug-trapdoor.transcript

# 3. Interactive play for manual testing
node packages/transcript-tester/dist/cli.js stories/dungeo --play
```

**Performance**: Fast bundle + transcript test completes in ~3 seconds vs. ~20 seconds for full rebuild.

### When to Use Full Build

Use `./scripts/build-all-dungeo.sh` when:
- Platform packages changed (engine, stdlib, world-model, parser, lang)
- New dependencies added
- TypeScript configurations changed
- Starting fresh session (ensures clean state)

Use `./scripts/build-all-dungeo.sh --skip <package>` for incremental builds when you know earlier packages haven't changed.

## Notes

**Session duration**: ~2.5 hours (continuing from previous session at 02:40)

**Approach**:
1. Started with TR-001 issue tracking document
2. Fixed issues systematically (parser → puzzle → entity → text)
3. Verified each fix with transcript test
4. Created comprehensive documentation
5. Updated CLAUDE.md with patterns learned

**Key Insight**: Playtesting caught integration bugs that unit tests missed. The combination of:
- Parser accepting input
- Entity resolution finding entities
- Actions executing correctly
- Text service generating output
- Terminal client displaying results

...only works when all layers integrate properly. Unit tests verify individual components; playtesting verifies the whole system.

**Next Session**: Continue dungeo implementation with TR-002 playtest of next region, or tackle next area from implementation plan.

---

**Progressive update**: Session completed 2026-01-14 09:35
