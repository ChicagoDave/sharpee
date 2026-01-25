# Known Issues

Catalog of known bugs and issues to be addressed.

**Test Summary (2026-01-22):** 599 passed, 756 failed, 11 expected failures, 49 skipped across 89 transcripts.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-029 | GDT TK (telekinesis) command produces no output | Critical | GDT/Story | 2026-01-22 | - | - |
| ISSUE-030 | GDT AH (teleport) command produces no output | Critical | GDT/Story | 2026-01-22 | - | - |
| ISSUE-031 | UNDO command not implemented | Medium | Platform | 2026-01-22 | - | - |
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-033 | AGAIN command fails after second NORTH | Low | Platform | 2026-01-22 | - | - |
| ISSUE-034 | Inventory message test expects different format | Low | Test | 2026-01-22 | - | - |
| ISSUE-035 | React client save not implemented/working | Medium | client-react | 2026-01-23 | - | - |
| ISSUE-036 | Auto-map boxes rendered on top of each other | Medium | client-react | 2026-01-23 | - | - |
| ISSUE-037 | Troll death text not displaying (story messages) | Medium | client-react | 2026-01-23 | - | 2026-01-24 |
| ISSUE-038 | React client needs modern styling and fonts | Low | client-react | 2026-01-23 | - | 2026-01-24 |
| ISSUE-039 | Text ordering: game.message duplicating stdlib messages | Critical | Platform | 2026-01-24 | - | 2026-01-24 |
| ISSUE-040 | Web Client version shows "N/A" | Low | client-react | 2026-01-24 | - | - |
| ISSUE-041 | Version format should separate build timestamp from version | Low | Build | 2026-01-24 | - | - |
| ISSUE-042 | HELP and ABOUT commands not working in React client | Medium | client-react | 2026-01-24 | - | - |
| ISSUE-043 | Events panel not using full width of right panel | Low | client-react | 2026-01-24 | - | - |
| ISSUE-044 | Notes panel not using full width of right panel | Low | client-react | 2026-01-24 | - | - |

---

## Open Issues

### ISSUE-029: GDT TK (telekinesis) command produces no output

**Reported**: 2026-01-22
**Severity**: Critical
**Component**: GDT / Story

**Description**:
The GDT `tk` (telekinesis/take) command produces empty output instead of taking items. This blocks approximately 50% of transcript tests that rely on GDT for setup.

**Reproduction**:
```
> gdt
[GDT enabled]
> tk brass lantern
[no output]
```

**Expected**: "Taken." or similar confirmation.

**Impact**: Blocks ~400+ test assertions across 50+ transcripts.

**Affected transcripts**: wind-canary, weight-capacity, wave-rainbow, troll-visibility, troll-recovery, and many more.

---

### ISSUE-030: GDT AH (teleport) command produces no output

**Reported**: 2026-01-22
**Severity**: Critical
**Component**: GDT / Story

**Description**:
The GDT `ah` (teleport) command produces empty output instead of teleporting the player. This blocks many transcript tests that use AH to set up test scenarios.

**Reproduction**:
```
> gdt
[GDT enabled]
> ah Troll Room
[no output]
> look
West of House [still at starting location]
```

**Expected**: "Teleported to Troll Room." and player moves to that room.

**Impact**: Blocks ~300+ test assertions across 40+ transcripts.

---

### ISSUE-031: UNDO command not implemented

**Reported**: 2026-01-22
**Severity**: Medium
**Component**: Platform (Engine)

**Description**:
The UNDO command does not emit a `platform.undo_completed` event. The feature appears to be unimplemented.

**Reproduction**:
```
> look
> north
> undo
[no output]
```

**Expected**: Previous game state restored, confirmation message.

**Affected transcripts**: undo-basic.transcript

---

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test

**Description**:
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling). The "DUNGEO" spelling was a nostalgia reference to the PDP-11 era filename limit, but the game title should use the full spelling.

**Resolution**: Update test to expect "DUNGEON" instead of "DUNGEO v".

---

### ISSUE-033: AGAIN command fails after second NORTH

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Platform (Engine)

**Description**:
In again.transcript, after going NORTH twice, the `g` (again) command goes to "Forest Path" instead of "Clearing".

**Reproduction**:
```
> north       → Forest
> g           → Forest Path (should repeat NORTH to Clearing)
```

**Notes**: May be correct behavior if NORTH from Forest leads to Forest Path, not Clearing. Needs verification against map.

---

### ISSUE-034: Inventory message test expects different format

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test / Lang

**Description**:
The inventory-message.transcript expects specific inventory format that doesn't match current output.

**Resolution**: Update test or update inventory message format.

---

### ISSUE-035: React client save not implemented/working

**Reported**: 2026-01-23
**Severity**: Medium
**Component**: client-react

**Description**:
The save game functionality in the React client (`@sharpee/client-react`) is either not implemented or not working correctly.

**Reproduction**:
1. Play game in React client
2. Attempt to save game
3. Save fails or produces no effect

**Expected**: Game state saved to browser storage (localStorage or IndexedDB).

**Notes**: Need to verify if save command is wired up to storage, or if it's a UI/backend disconnect.

---

### ISSUE-036: Auto-map boxes rendered on top of each other

**Reported**: 2026-01-23
**Severity**: Medium
**Component**: client-react

**Description**:
The auto-mapping feature in the React client renders all room boxes stacked on top of each other instead of in their proper spatial positions.

**Reproduction**:
1. Play game in React client with auto-map enabled
2. Navigate to multiple rooms
3. Observe map display

**Expected**: Rooms arranged spatially based on navigation directions (N/S/E/W/U/D).

**Actual**: All room boxes overlapping at same position.

**Notes**: Likely a CSS/positioning issue in the map component, or room coordinates not being calculated/applied.

**Status**: Open - Fallback positioning added but root cause not fixed. Map boxes still overlap.

---

### ISSUE-037: Troll death text not displaying (story messages)

**Reported**: 2026-01-23
**Severity**: Medium
**Component**: client-react

**Description**:
During the troll combat sequence in the React client, the text describing the troll's death is not being displayed. This may indicate a problem with the reveal/streaming mechanism.

**Reproduction**:
1. Navigate to Troll Room
2. Fight troll until death
3. Observe missing death description text

**Expected**: Full combat narrative including troll death description.

**Actual**: Death text not shown; player may not realize troll is dead.

**Notes**: Check if this is a reveal timing issue, event handling issue, or text not being emitted properly. Terminal client works correctly, so likely React-specific rendering issue.

**Root Cause (Investigated 2026-01-23)**:
The React entry point (`stories/dungeo/src/react-entry.tsx`) was missing calls to `story.extendParser()` and `story.extendLanguage()`. Without these, story-specific messages (troll death smoke, sword glow, etc.) were not registered with the language provider.

**Fix Applied**: Added the missing extension calls to react-entry.tsx:
```typescript
if (story.extendParser) {
  story.extendParser(parser);
}
if (story.extendLanguage) {
  story.extendLanguage(language);
}
```

**Status**: Fixed 2026-01-24 - story.extendParser/extendLanguage calls added.

---

### ISSUE-038: React client needs modern styling and fonts

**Reported**: 2026-01-23
**Severity**: Low
**Component**: client-react

**Description**:
The React client UI needs updated styling with modern fonts and visual design. Current styling is basic/placeholder.

**Expected**:
- Modern, readable font (e.g., Inter, system-ui stack)
- Clean visual hierarchy
- Appropriate spacing and contrast
- Consistent component styling

**Fix Applied**:
Implemented complete theme system with 4 themes in `packages/client-react/themes/`:
- `classic-light` - Literata font, warm book-like tones (default)
- `modern-dark` - Inter font, Catppuccin Mocha colors
- `retro-terminal` - JetBrains Mono, green phosphor CRT effect
- `paper` - Crimson Text, high contrast

Each theme includes:
- CSS variables for all colors, fonts, spacing
- Full component styling (transcript, panels, map, status line)
- Google Fonts integration
- Responsive adjustments

Build-time theme selection via `./build.sh -c react -t <theme-name>`

**Status**: Fixed 2026-01-24

---

### ISSUE-039: Text ordering - game.message duplicating stdlib messages

**Reported**: 2026-01-24
**Severity**: Critical
**Component**: Platform (event-processor, text-service)

**Description**:
When entity handlers return `game.message` events as reactions to domain events (e.g., `if.event.opened`), both the story message AND the stdlib message were being rendered, resulting in duplicate/confusing output.

**Example before fix**:
```
> open trapdoor
The door reluctantly opens to reveal a rickety staircase descending into darkness.
You open trap door.
```

**Expected**:
```
> open trapdoor
The door reluctantly opens to reveal a rickety staircase descending into darkness.
```

**Root Cause**:
1. **Sorting bug** (commit 9e549b3): Text-service sorted ALL `game.*` events first (intended for `game.started` banner only), causing story messages to appear before stdlib messages
2. **No override semantics**: Entity handler `game.message` reactions were rendered alongside the original `if.event.*` instead of replacing them

**Fix Applied**:
1. **event-processor**: When entity handlers return `game.message` reactions, the messageId/text is copied to the original domain event, and the `game.message` is consumed (not forwarded). Multiple `game.message` reactions emit `if.event.error`.
2. **text-service**: Changed `game.*` sorting to only match specific lifecycle events (`game.started`, `game.starting`, etc.), not `game.message`.

**Files Modified**:
- `packages/event-processor/src/processor.ts` - game.message override logic
- `packages/text-service/src/stages/sort.ts` - Specific lifecycle event sorting
- `packages/text-service/src/text-service.ts` - Removed incomplete suppression logic

**Status**: Fixed 2026-01-24

---

### ISSUE-040: Web Client version shows "N/A"

**Reported**: 2026-01-24
**Severity**: Low
**Component**: client-react

**Description**:
In the React client, the game banner displays "Web Client version: N/A" instead of the actual client version.

**Reproduction**:
1. Load React client
2. Observe banner text

**Expected**: "Web Client version: 0.1.0-beta.20260124.0838" or similar.

**Actual**: "Web Client version: N/A"

**Notes**: The client version needs to be injected at build time or read from package.json.

---

### ISSUE-041: Version format should separate build timestamp from version

**Reported**: 2026-01-24
**Severity**: Low
**Component**: Build System

**Description**:
The current version format embeds date-time suffix directly in the version number (e.g., `0.9.56-beta.20260124.0838`). This makes versions hard to read and compare.

**Proposed Change**:
- Keep clean semantic versions: `0.9.56-beta`, `1.0.64`
- Add separate build timestamp field: `Build: 2026-01-24 08:38`

**Affected**:
- Platform version (sharpee)
- Story version (dungeo)
- Client version (client-react)

---

### ISSUE-042: HELP and ABOUT commands not working in React client

**Reported**: 2026-01-24
**Severity**: Medium
**Component**: client-react

**Description**:
The HELP and ABOUT commands do not produce output in the React client.

**Reproduction**:
1. Load React client
2. Type `help` or `about`
3. No output appears

**Expected**: Help text and about/credits information displayed.

**Notes**: These may be client-handled commands that need implementation in the React client, or they may be parser commands that aren't being processed correctly.

---

### ISSUE-043: Events panel not using full width of right panel

**Reported**: 2026-01-24
**Severity**: Low
**Component**: client-react (CSS)

**Description**:
The Events (Commentary) panel only uses approximately half the width of the right sidebar panel area.

**Reproduction**:
1. Load React client
2. Switch to Events tab
3. Observe panel width

**Expected**: Events panel fills the full width of the sidebar.

**Notes**: Likely a CSS flex/grid issue in the tab panel or commentary panel styles.

---

### ISSUE-044: Notes panel not using full width of right panel

**Reported**: 2026-01-24
**Severity**: Low
**Component**: client-react (CSS)

**Description**:
The Notes panel only uses approximately half the width of the right sidebar panel area.

**Reproduction**:
1. Load React client
2. Switch to Notes tab
3. Observe panel width

**Expected**: Notes panel fills the full width of the sidebar.

**Notes**: Same root cause as ISSUE-043 - likely a CSS flex/grid issue in the tab panel.

---

## Deferred Issues

*Issues deferred because they test features not yet implemented.*

### Features Not Yet Implemented (Blocking Tests)

The following transcripts test features that are not yet implemented in Dungeo. These are not bugs - they are roadmap items:

| Transcript | Feature Needed |
|------------|----------------|
| boat-inflate-deflate | Boat/raft mechanics |
| boat-stick-puncture | Boat puncture |
| balloon-flight | Balloon mechanics |
| balloon-actions | Balloon mechanics |
| basket-elevator | Elevator mechanics |
| robot-commands | Robot NPC |
| maze-navigation | Maze rooms |
| maze-loops | Maze rooms |
| frigid-river-full | River/boat mechanics |
| flooding | Dam flooding |
| dam-puzzle | Dam mechanics |
| bucket-well | Well/bucket mechanics |
| coal-machine | Coal machine puzzle |
| mirror-room-toggle | Mirror room mechanics |
| royal-puzzle-* | Royal Puzzle Box |
| tiny-room-puzzle | Bank puzzle |
| bank-puzzle | Bank puzzle |
| exorcism-ritual | Exorcism puzzle |
| cyclops-magic-word | Cyclops NPC |
| coffin-* | Coffin/Egyptian area |
| endgame-* | Endgame content |

---

## Passing Transcripts (20)

These transcripts pass completely:

- again-minimal
- again-simple
- attic-dark
- debug-trapdoor
- drop-all-empty
- endgame-laser-puzzle
- endgame-mirror
- grue-mechanics
- implicit-take-test
- light-reveals-room
- mailbox
- multi-object-format
- navigation
- room-contents-on-entry
- take-all-filter
- trophy-case-scoring
- troll-combat
- troll-interactions
- save-test
- bucket-well

---

## Test Statistics

**By failure category:**
- GDT command failures: ~500 assertions
- Unimplemented features: ~200 assertions
- Minor format/message issues: ~50 assertions

**Priority order:**
1. Fix ISSUE-029 and ISSUE-030 (GDT commands) - unblocks majority of tests
2. Implement remaining story features
3. Update test assertions for format changes
