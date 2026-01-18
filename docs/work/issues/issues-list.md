# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-003 | Window doesn't block passage to Kitchen | Critical | Story | 2026-01-16 | - | 2026-01-16 |
| ISSUE-004 | "kill troll" not recognized | Critical | Parser | 2026-01-16 | - | 2026-01-16 |
| ISSUE-006 | Troll doesn't attack player | Critical | Story/NPC | 2026-01-16 | - | 2026-01-16 |
| ISSUE-015 | Troll logic implementation complete | High | Story/NPC | 2026-01-16 | - | 2026-01-17 |
| ISSUE-010 | Room contents not shown on room entry | High | TextService | 2026-01-16 | - | 2026-01-17 |
| ISSUE-005 | Text output order wrong (contents before description) | Medium | TextService | 2026-01-16 | - | 2026-01-17 |
| ISSUE-001 | "get all" / "drop all" returns entity_not_found | Medium | Validator | 2026-01-16 | - | 2026-01-17 |
| ISSUE-007 | Template placeholder {are} not resolved | Medium | TextService | 2026-01-16 | - | 2026-01-18 |
| ISSUE-008 | Disambiguation doesn't list options | Medium | TextService | 2026-01-16 | - | 2026-01-18 |
| ISSUE-009 | Egg openable by player (should require thief) | Medium | Story | 2026-01-16 | - | - |
| ISSUE-012 | Browser client needs save/restore (localStorage) | Medium | Browser | 2026-01-16 | - | - |
| ISSUE-014 | Turning on lamp in dark room should trigger LOOK | Medium | Engine/Stdlib | 2026-01-16 | - | - |
| ISSUE-002 | "in" doesn't enter through open window | Low | Grammar | 2026-01-16 | - | - |
| ISSUE-011 | Nest has SceneryTrait hiding it from view | Low | Story | 2026-01-16 | - | - |
| ISSUE-013 | Lamp "switches on" message missing "The" article | Low | TextService | 2026-01-16 | - | - |

---

## Open Issues

### ISSUE-002: "in" doesn't enter through open window at Behind House

**Reported**: 2026-01-16
**Severity**: Low
**Component**: Grammar / Room Connections

**Description**:
At Behind House with the window open, typing "in" doesn't enter the Kitchen through the window. Player must use "w" instead.

**Reproduction**:
```
> (at Behind House with window open)
> in
You can't go that way.

> w
Kitchen
```

**Expected**: "in" should work as an alias for entering through the window when at Behind House.

**Notes**: May require special handling since the window is both a direction and an enterable object. Classic Zork behavior would allow "in" here.

**Source**: `docs/work/dungeo/play-output-6.md` lines 49-50

---

### ISSUE-009: Egg openable by player (should require thief)

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: Story / Egg Handler

**Description**:
The jewel-encrusted egg can be opened by the player using the standard OPEN command. In original Zork, only the thief has the skills to open the egg without destroying it. The player should get "You have neither the tools nor the expertise."

**Reproduction**:
```
> open egg
You open jewel-encrusted egg.

Inside the jewel-encrusted egg you see golden canary.
```

**Expected**: "You have neither the tools nor the expertise." (block player from opening)

**Actual**: Egg opens normally, revealing canary.

**Notes**: Need an event handler for `if.event.opening` on the egg that blocks player but allows thief NPC. The thief opening the egg is a key puzzle mechanic.

**Source**: Browser testing session 2026-01-16, console log lines 771-785

---

### ISSUE-011: Nest has SceneryTrait hiding it from view

**Reported**: 2026-01-16
**Severity**: Low
**Component**: Story / Forest Objects

**Description**:
The bird's nest in "Up a Tree" has SceneryTrait which typically hides objects from room contents lists. In original Zork, the nest is visible when you climb the tree.

**Reproduction**:
```
> (at Up a Tree)
> look
Up a Tree

You are about ten feet above the ground nestled among some large branches.
(nest not mentioned even though it contains the egg)
```

**Expected**: "You can see small bird's nest here." or nest mentioned in room description.

**Actual**: Nest is not visible; player must know to "take egg" or "examine nest".

**Notes**: Testing shows nest IS visible on explicit LOOK ("You can see nest here. In nest you see jewel-encrusted egg."). The real issue is ISSUE-010 - contents not shown on room entry. Consider adding nest to room description for discoverability: "On the branch is a small bird's nest."

**Source**: `stories/dungeo/src/regions/forest.ts` line 276

---

### ISSUE-012: Browser client needs save/restore (localStorage)

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: Browser Client

**Description**:
The thin browser client (`stories/dungeo/src/browser-entry.ts`) receives `platform.save_requested` events but doesn't persist game state. Save/restore should use localStorage to allow players to continue later.

**Current behavior**:
- SAVE command triggers event (visible in console logs)
- No actual persistence occurs
- Page refresh loses all progress

**Implementation notes**:
```typescript
// On save event:
const saveData = await engine.save();
localStorage.setItem('dungeo-save', JSON.stringify(saveData));

// On restore event / page load:
const saved = localStorage.getItem('dungeo-save');
if (saved) {
  await engine.restore(JSON.parse(saved));
}
```

**Features needed**:
1. Save game state to localStorage on SAVE command
2. Restore game state on RESTORE command
3. Auto-detect save on page load, offer to continue
4. Multiple save slots (optional, v2)

**Source**: Browser testing session 2026-01-16, console log line 531-534

---

### ISSUE-013: Lamp "switches on" message missing "The" article

**Reported**: 2026-01-16
**Severity**: Low
**Component**: TextService / Language Provider

**Description**:
When turning on the brass lantern, the message is missing the definite article "The".

**Reproduction**:
```
> turn on lamp
brass lantern switches on, banishing the darkness.
```

**Expected**: "The brass lantern switches on, banishing the darkness."

**Actual**: "brass lantern switches on, banishing the darkness."

**Notes**: The `illuminates_darkness` message template likely uses `{target}` without capitalizing/adding article. Should use `{Target}` or `{the target}`.

**Source**: Browser testing session 2026-01-16, console log line 385

---

### ISSUE-014: Turning on lamp in dark room should trigger LOOK

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: Engine / Stdlib (switching_on action)

**Description**:
When turning on a light source in a dark room that hasn't been seen yet, the room description should be shown automatically. Currently player must manually type LOOK after turning on the lamp.

**Reproduction**:
```
> (enter Cellar in darkness)
The door crashes shut, and you hear someone barring it.

> turn on lamp
brass lantern switches on, banishing the darkness.

> look
You can see metal ramp here.

Cellar

This is a dark and damp cellar...
```

**Expected**: After "banishing the darkness", automatically show room description (like a LOOK).

**Actual**: Room remains undescribed until explicit LOOK command.

**Implementation notes**:
In `switching_on` action's execute or report phase, check if:
1. Target is a light source
2. Player's location was dark before
3. Player's location is now lit
4. This is first visit OR room never seen lit

If all true, trigger implicit LOOK or emit room description event.

**Source**: Browser testing session 2026-01-16, console log lines 384-400

---

## Closed Issues

### ISSUE-001: "get all" / "drop all" returns entity_not_found

**Reported**: 2026-01-16
**Fixed**: 2026-01-17
**Severity**: Medium
**Component**: Command Validator

**Description**:
Using "get all" or "drop all" returned `core.entity_not_found` instead of taking/dropping all portable items.

**Root Cause**:
The command validator didn't check for `isAll` or `isList` flags on noun phrases before calling `resolveEntity()`. The parser correctly detected "all" and set `isAll: true`, but the validator tried to resolve "all" as a literal entity name → failed.

The multi-object handling infrastructure (`multi-object-handler.ts`, action layer support) was already fully implemented but unreachable due to this validator bug.

**Solution**:
Updated `packages/stdlib/src/validation/command-validator.ts` to check for `isAll` or `isList` before entity resolution:
```typescript
if (nounPhrase.isAll || nounPhrase.isList) {
  // Leave directObject undefined - action will use isMultiObjectCommand()
  // and expandMultiObject() to handle multiple entities
  directObject = undefined;
} else {
  // Normal single-entity resolution
}
```

**Features Now Working**:
- `get all` - Takes all reachable items
- `drop all` - Drops all carried items
- `get all but sword` - Takes all except specified items
- `drop all but knife and lamp` - Drops all except specified items

**Files changed**:
- `packages/stdlib/src/validation/command-validator.ts` - Added isAll/isList bypass in both `validate()` and `resolveWithSelection()` methods

---

### ISSUE-010: Room contents not shown on room entry

**Reported**: 2026-01-16
**Fixed**: 2026-01-17
**Severity**: High
**Component**: TextService / Language Layer

**Description**:
When moving to a new room, the room contents were not displayed. Only explicit LOOK command showed contents.

**Root Cause**:
The going action emitted `action.success` with `messageId: 'contents_list'`, but no `contents_list` message was defined in `going.ts` language file. The looking action worked because it had this message defined.

**Solution**:
Added `contents_list` message to `packages/lang-en-us/src/actions/going.ts`:
```typescript
'contents_list': "{You} can {see} {items} here.",
```

**Files changed**:
- `packages/lang-en-us/src/actions/going.ts` - Added contents_list message

---

### ISSUE-005: Text output order wrong

**Reported**: 2026-01-16
**Fixed**: 2026-01-17
**Severity**: Medium
**Component**: TextService / Sort Stage

**Description**:
Room contents list appeared before room name and description instead of after.

**Root Cause**:
The sort stage in TextService prioritized `action.*` events before all other events. This caused `action.success` (contents_list) to appear before `if.event.room.description`.

**Solution**:
Updated `packages/text-service/src/stages/sort.ts` to prioritize room description events before action.success:
```typescript
// Room description should come before action.success (for contents list)
const aIsRoomDesc = a.type === 'if.event.room.description' || a.type === 'if.event.room_description';
const bIsRoomDesc = b.type === 'if.event.room.description' || b.type === 'if.event.room_description';
if (aIsRoomDesc && !bIsRoomDesc) return -1;
if (!aIsRoomDesc && bIsRoomDesc) return 1;
```

**Files changed**:
- `packages/text-service/src/stages/sort.ts` - Added room description priority

---

### ISSUE-015: Troll Logic Implementation

**Reported**: 2026-01-16
**Fixed**: 2026-01-17
**Severity**: High
**Component**: Story / NPC / Platform

**Description**:
Complete implementation of canonical MDL Zork troll behavior including combat, state management, and player interactions.

**Features Implemented**:
- Troll states (alive/unconscious/dead) with dynamic descriptions
- Exit blocking when troll alive, unblocking when defeated
- Axe "white-hot" blocking (can't take while troll alive)
- Axe visibility toggle (hidden when troll unconscious)
- Wake-up daemon (troll recovers after 5 turns unconscious)
- Weapon recovery (75% chance to pick up dropped axe)
- Disarmed cowering behavior
- TAKE/MOVE troll response ("spits in your face")
- Unarmed attack response ("laughs at your puny gesture")
- TALK TO TROLL grammar patterns (talk to troll, hello troll)
- GIVE/THROW items to troll (eats items, throws knife back)

**Files changed**: See `docs/work/dungeo/troll-logic.md` for complete list.

**Test transcripts**:
- `troll-axe.transcript` - White-hot blocking tests
- `troll-interactions.transcript` - Player interaction tests
- `troll-visibility.transcript` - Axe visibility tests
- `troll-recovery.transcript` - Wake-up daemon tests

---

### ISSUE-003: Window doesn't block passage to Kitchen

**Reported**: 2026-01-16
**Fixed**: 2026-01-16
**Severity**: Critical
**Component**: Story / Room Connections

**Description**:
Player can walk west from Behind House into Kitchen without opening the window first. The window should block passage until opened.

**Solution**:
Used `via` property on exits. The going action automatically checks if the `via` entity (window) is open before allowing passage.

```typescript
// In createWhiteHouseObjects after creating window:
RoomBehavior.setExit(behindHouse, Direction.WEST, kitchenId, window.id);
RoomBehavior.setExit(kitchen, Direction.EAST, roomIds.behindHouse, window.id);
```

**Files changed**:
- `stories/dungeo/src/regions/white-house.ts` - Wire exits through window
- `stories/dungeo/src/regions/house-interior.ts` - Remove duplicate exit setup

---

### ISSUE-004: "kill troll" not recognized

**Reported**: 2026-01-16
**Fixed**: 2026-01-16
**Severity**: Critical
**Component**: Parser / Grammar

**Description**:
The command "kill troll" returns "Parse failed: INVALID_SYNTAX" instead of initiating combat.

**Solution**:
Added missing grammar patterns for combat verbs. The grammar now includes:
- `attack|kill|fight|slay|murder|hit|strike :target` (simple attack)
- `kill :target with :weapon` and variants (attack with weapon)

```typescript
// In packages/parser-en-us/src/grammar.ts:
grammar
  .forAction('if.action.attacking')
  .verbs(['attack', 'kill', 'fight', 'slay', 'murder', 'hit', 'strike'])
  .pattern(':target')
  .build();
```

**Files changed**:
- `packages/parser-en-us/src/grammar.ts` - Add attack/kill verb patterns

---

### ISSUE-006: Troll doesn't attack player

**Reported**: 2026-01-16
**Fixed**: 2026-01-16
**Severity**: Critical
**Component**: Story / NPC Behavior

**Description**:
The troll in Troll Room doesn't attack the player. Player can wait multiple turns with no combat occurring.

**Solution**:
Updated `guardBehavior` in stdlib to attack the player on each turn if:
1. NPC has `CombatantTrait` with `hostile: true`
2. Player is visible (in same room)
3. NPC is alive and conscious

Also updated `NpcService.executeAttack()` to use `CombatService` for actual damage resolution instead of just emitting an event.

**Files changed**:
- `packages/stdlib/src/npc/behaviors.ts` - guardBehavior.onTurn attacks if hostile
- `packages/stdlib/src/npc/npc-service.ts` - executeAttack uses CombatService

---

### ISSUE-007: Template placeholder {are} not resolved

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Medium
**Component**: TextService / Language Provider

**Description**:
Inventory output showed unresolved template placeholder `{are}` instead of the word "are".

**Reproduction**:
```
> i
You {are} carrying:
  leaflet, welcome mat
```

**Root Cause**:
The placeholder resolver (ADR-089) expects base verb forms like `{be}` which it conjugates to "are" for 2nd person narrative. The inventory templates used `{are}` directly (already conjugated), which wasn't recognized as a verb by the pattern matcher and was left unresolved.

**Solution**:
Changed inventory templates from `{are}` to `{be}` in `packages/lang-en-us/src/actions/inventory.ts`:
```typescript
// Before:
'carrying': "{You} {are} carrying:",

// After:
'carrying': "{You} {be} carrying:",
```

**Files changed**:
- `packages/lang-en-us/src/actions/inventory.ts` - Changed 6 occurrences of `{are}` to `{be}`

---

### ISSUE-008: Disambiguation doesn't list options

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Medium
**Component**: TextService / Engine

**Description**:
When multiple objects matched a noun (e.g., "key" matching both skeleton key and small key), the disambiguation prompt showed "Which do you mean?" without listing the options.

**Root Cause**:
The CommandExecutor threw a generic Error for validation failures, losing the structured disambiguation data. The error message "Validation failed: AMBIGUOUS_ENTITY" was passed to TextService, but the candidate entity list was not.

**Solution**:
Implemented full platform events flow for disambiguation (per `docs/design/disambiguation-via-platform-events.md`):

1. **CommandExecutor** (engine): Check for AMBIGUOUS_ENTITY, emit `client.query` event with candidates instead of throwing
2. **TextService**: Add `handleClientQuery()` to format disambiguation candidates as natural English
3. **Language layer**: Add `core.disambiguation_prompt` message template with `{options}` placeholder
4. **TurnResult type**: Add `needsInput` flag for disambiguation state

**Result**:
```
> drop key
Which do you mean: the small key or the skeleton key?
```

**Files changed**:
- `packages/engine/src/command-executor.ts` - Emit client.query for AMBIGUOUS_ENTITY
- `packages/engine/src/types.ts` - Add needsInput to TurnResult
- `packages/text-service/src/text-service.ts` - Add handleClientQuery and formatCandidateList
- `packages/lang-en-us/src/language-provider.ts` - Add disambiguation_prompt message

---

## Issue Template

```markdown
### ISSUE-XXX: Brief description

**Reported**: YYYY-MM-DD
**Severity**: Critical / High / Medium / Low
**Component**: Parser / Engine / Stdlib / Story / etc.

**Description**:
Detailed description of the issue.

**Reproduction**:
Steps or transcript to reproduce.

**Expected**: What should happen.

**Actual**: What actually happens.

**Notes**: Any additional context.

**Source**: Where the issue was discovered.
```
