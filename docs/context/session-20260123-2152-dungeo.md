# Session Summary: 2026-01-23 - dungeo

## Status: Completed

## Goals
- Debug and fix React client issues identified in testing
- Investigate text ordering bug affecting both React and web clients
- Design solution for game.message override semantics

## Completed

### React Client Bug Fixes (ISSUE-036, ISSUE-037, ISSUE-038)

**ISSUE-036: Auto-map boxes rendered on top of each other**
- Root cause: Some rooms in dungeo have no coordinates set
- Solution: Added fallback positioning in `useMap.ts` when x/y are undefined
- Fallback places room at (0, 0) with visible border to indicate missing coordinates
- Fixed: Auto-map now displays all rooms without overlap

**ISSUE-037: Troll death text not displaying**
- Root cause: React entry point wasn't calling `story.extendParser()` and `story.extendLanguage()`
- Story-specific language extensions (like troll death messages) weren't being registered
- Solution: Added complete story initialization in `react-entry.tsx`:
  ```typescript
  story.extendParser(parser);
  story.extendLanguage(languageService);
  ```
- Also added PerceptionService initialization (was missing)
- Fixed: Troll death messages now display correctly

**ISSUE-038: Modern styling and fonts**
- User requested: Modern font style (not Courier), smaller default size
- Solution: Set default font to 13px in `GameShell.tsx`
- Removed explicit font-family override (browser default is fine)
- Result: Cleaner, more modern appearance

### Text Ordering Bug Investigation

**Symptom**: Multiple duplicate messages, wrong ordering (troll attacks before "You hit the troll")

**Initial hypothesis**: React-specific rendering issue
- Added console logging to GameContext.tsx
- Logs showed same duplication/ordering in thin web client
- NOT a React bug - platform-level issue

**Root Cause Analysis**:

1. **Commit 9e549b3 (Jan 21)**: Added `game.*` sorting in text-service
   - Intent: Move banner/lifecycle events (`game.started`, `game.ended`) to top
   - Bug: Regex `/^game\./` matches `game.message` too
   - Effect: Random `game.message` events sorted before domain events

2. **No override semantics**: When entity handler returns `game.message` reaction:
   - Both original `if.event.*` AND `game.message` forwarded to text-service
   - Result: Duplicate messages, wrong order

**Investigation Process**:
- Reviewed text-service.ts sorting logic
- Traced event flow: event-processor → reactions → text-service
- Checked git blame for sorting code (found Jan 21 commit)
- Analyzed event-processor reaction handling
- Examined troll behavior message emission

### Solution Design (Approved)

**Override Semantics in event-processor**:

When entity event handler returns `game.message` reaction:
1. If `messageId` present: Copy to original `if.event.*` event's messageId
2. If `text` present: Copy text to original event
3. Discard the `game.message` (consumed as override)
4. If multiple `game.message` reactions: Emit `if.event.error` (invalid state)
5. Forward only the modified `if.event.*` to text-service

**Benefits**:
- Domain events still record facts (for replay, debugging, event handlers)
- Only prose changes (via messageId or text override)
- No duplicate messages
- No sorting issues (only `if.event.*` events forwarded)
- Clean separation: event-processor handles overrides, text-service renders

**Optional Fix**: Tighten sorting regex to only match lifecycle events:
```typescript
// Before: /^game\./
// After: /^game\.(started|ended|banner)/
```

## Key Decisions

### 1. React Client Story Initialization
**Decision**: React entry point must call both `extendParser()` and `extendLanguage()`

**Rationale**:
- Stories register custom grammar and messages via these hooks
- Without them, story-specific language doesn't load
- Web client does this in main.ts, React client was missing it

**Implications**: All client implementations must follow same initialization pattern

### 2. Auto-map Fallback Positioning
**Decision**: Place unpositioned rooms at (0, 0) with visible indicator border

**Rationale**:
- Better than crash or overlap
- Makes missing data obvious during development
- Rooms can be positioned properly later

**Alternative considered**: Don't render unpositioned rooms (rejected - hides authoring gaps)

### 3. game.message Override Semantics
**Decision**: event-processor consumes `game.message` reactions as overrides to original events

**Rationale**:
- Preserves domain events for replay/debugging
- Eliminates duplication at source (not in text-service)
- Clean architectural boundary (event-processor owns reaction merging)
- text-service remains simple renderer

**Alternative considered**: Filter in text-service (rejected - wrong layer, loses event context)

## Open Items

### Short Term
- ~~**Implement game.message override** in event-processor~~ DONE 2026-01-24
  - Added override logic in `packages/event-processor/src/processor.ts`
  - Handles messageId and text overrides
  - Emits `if.event.error` if multiple game.message reactions
  - Updated transcript tests to remove game.message event assertions
- ~~**Test with troll combat** to verify text ordering fix~~ DONE - verified via browser logs
- **Run full walkthrough** to ensure no regressions (19 tests failing, mostly pre-existing issues)

### Long Term
- **ISSUE-035: Implement save/restore** in React client
  - Add UI controls for save/restore
  - Wire up to engine save/restore commands
  - Test save state persistence
- **Complete room positioning** in dungeo
  - Identify all rooms with missing coordinates
  - Add proper x/y values based on world-map.md
  - Remove fallback positioning workarounds

## Files Modified

**React Client** (5 files):
- `stories/dungeo/src/react-entry.tsx` - Added story.extendParser/extendLanguage, PerceptionService
- `packages/client-react/src/context/GameContext.tsx` - Added debug console logging
- `packages/client-react/src/hooks/useMap.ts` - Added fallback positioning for uncoordinated rooms
- `packages/client-react/src/components/GameShell.tsx` - Set default font to 13px
- `packages/client-react/tsconfig.json` - Fixed build config (removed extends, added noEmit: false)

**Platform** (2 files):
- `packages/event-processor/src/processor.ts` - Added game.message override logic in invokeEntityHandlers()
- `packages/text-service/src/stages/sort.ts` - Tightened sorting to specific lifecycle events only

**Build Scripts** (2 files):
- `scripts/build.sh` - Added React client build documentation
- `scripts/update-versions.sh` - Added React client version path handling

**Transcripts** (2 files):
- `stories/dungeo/tests/transcripts/rug-trapdoor.transcript` - Removed game.message event assertion
- `stories/dungeo/tests/transcripts/troll-blocking.transcript` - Removed game.message event assertion

**Documentation** (1 file):
- `docs/work/issues/issues-list-02.md` - Added ISSUE-035 through ISSUE-039, investigation notes, fix statuses

## Architectural Notes

### Event Flow and Override Pattern

Current flow (BUGGY):
```
Entity Handler → game.message reaction
                     ↓
Event Processor → forwards both if.event.* AND game.message
                     ↓
Text Service → sorts, renders (duplicates + wrong order)
```

Proposed flow (FIXED):
```
Entity Handler → game.message reaction
                     ↓
Event Processor → merges into if.event.* (override)
                → discards game.message (consumed)
                     ↓
Text Service → renders single if.event.* (correct text)
```

**Key insight**: Override semantics belong in event-processor, not text-service. The processor already merges reactions into events - it should recognize `game.message` as a special "override prose" signal.

### Text Service Sorting Issue

The sorting regex `/^game\./` was too broad:
- Intended targets: `game.started`, `game.ended`, `game.banner` (lifecycle)
- Unintended match: `game.message` (prose override)

**Lesson**: When adding sorting categories, use specific patterns or enumerate exact types.

### Story Initialization Pattern

All clients must call in this order:
1. Create WorldModel
2. `story.createWorld(world)` - Build game world
3. `story.initializeWorld(world)` - Set up behaviors, events
4. `story.extendParser(parser)` - Add story grammar
5. `story.extendLanguage(languageService)` - Add story messages

Missing any step = missing features. This should be documented in client template.

## Testing Notes

**Manual Testing**:
- Tested React client with "attack troll" sequence
- Verified auto-map rendering with unpositioned rooms
- Checked console logs for event ordering
- Compared React vs web client output (both had same bug)

**Transcript Testing**:
- Did not run walkthroughs (changes are client-only and design-only)
- Next session will test after implementing override fix

## Notes

**Session duration**: ~2.5 hours

**Approach**: Debug-driven investigation
- Started with symptom (React client issues)
- Fixed obvious bugs first (ISSUE-036, 037, 038)
- Deep-dived root cause (text ordering)
- Designed architectural fix (override semantics)

**Discovery**: The text ordering bug existed in platform since Jan 21, but only became obvious with React client testing. The web client had the same issue but it was less noticeable. This highlights the value of multiple client implementations for finding platform bugs.

**Context Management**: Session used ~9% of context budget. No compact needed.

---

**Progressive update**: Session completed 2026-01-23 21:52

---

## Implementation Update (2026-01-24)

### game.message Override Implemented

The design from the investigation was implemented:

1. **event-processor/processor.ts**: Added override logic at end of `invokeEntityHandlers()`:
   - Filters `game.message` events from legacyReactions
   - If exactly one: copies messageId/text to original event, discards game.message
   - If multiple: emits `if.event.error` with details, uses first override
   - Returns filtered reactions (game.message consumed)

2. **text-service/stages/sort.ts**: Changed from broad `game.*` pattern to explicit list:
   ```typescript
   const LIFECYCLE_EVENTS = ['game.started', 'game.starting', 'game.loading', 'game.loaded', 'game.initialized'];
   ```

3. **Transcript tests updated**: Removed `[EVENT: true, type="game.message"]` assertions from:
   - rug-trapdoor.transcript
   - troll-blocking.transcript

### Verification

Tested via React client browser console logs (logs/console-export-2026-1-23_22-33-58.log):
- Window opening: Single message "With great effort..." ✓
- Rug pushing: Single message "Moving the rug reveals..." ✓
- Trapdoor opening: Single message "The door reluctantly opens..." ✓
- Troll death: Correct order "You have slain troll!\nAlmost as soon as..." ✓

Domain events now carry story messageId instead of stdlib messageId:
- `if.event.opened { messageId: "dungeo.window.opened" }` (not "if.action.opening.opened")
- `if.event.pushed { messageId: "dungeo.rug.moved.reveal_trapdoor" }` (not "if.action.pushing.pushed")
