# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-003 | Window doesn't block passage to Kitchen | Critical | Story | 2026-01-16 | - | 2026-01-16 |
| ISSUE-004 | "kill troll" not recognized | Critical | Parser | 2026-01-16 | - | 2026-01-16 |
| ISSUE-006 | Troll doesn't attack player | Critical | Story/NPC | 2026-01-16 | - | 2026-01-16 |
| ISSUE-010 | Room contents not shown on room entry | High | TextService | 2026-01-16 | - | - |
| ISSUE-001 | "get all" / "drop all" returns entity_not_found | Medium | Parser | 2026-01-16 | - | - |
| ISSUE-005 | Text output order wrong (contents before description) | Medium | TextService | 2026-01-16 | - | - |
| ISSUE-007 | Template placeholder {are} not resolved | Medium | TextService | 2026-01-16 | - | - |
| ISSUE-008 | Disambiguation doesn't list options | Medium | TextService | 2026-01-16 | - | - |
| ISSUE-009 | Egg openable by player (should require thief) | Medium | Story | 2026-01-16 | - | - |
| ISSUE-012 | Browser client needs save/restore (localStorage) | Medium | Browser | 2026-01-16 | - | - |
| ISSUE-014 | Turning on lamp in dark room should trigger LOOK | Medium | Engine/Stdlib | 2026-01-16 | - | - |
| ISSUE-002 | "in" doesn't enter through open window | Low | Grammar | 2026-01-16 | - | - |
| ISSUE-011 | Nest has SceneryTrait hiding it from view | Low | Story | 2026-01-16 | - | - |
| ISSUE-013 | Lamp "switches on" message missing "The" article | Low | TextService | 2026-01-16 | - | - |

---

## Open Issues

### ISSUE-001: "get all" / "drop all" returns entity_not_found

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: Parser / Command Validator

**Description**:
Using "get all" or "drop all" returns `core.entity_not_found` instead of taking/dropping all portable items in scope.

**Reproduction**:
```
> l
You can see kitchen table, brown sack, glass bottle here.

> get all
core.entity_not_found

> drop all
core.entity_not_found
```

**Expected**: Should take/drop all portable items in the current location.

**Source**: `docs/work/dungeo/play-output-6.md` lines 66-67, 74-75

---

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

### ISSUE-005: Text output order wrong

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Sort Stage

**Description**:
When entering a room, the contents list appears before the room name and description.

**Reproduction**:
```
> look
You can see small mailbox, front door, welcome mat, white house here.

West of House

This is an open field west of a white house with a boarded front door.
```

**Expected**:
```
West of House

This is an open field west of a white house with a boarded front door.

You can see small mailbox, front door, welcome mat, white house here.
```

**Actual**: Contents list comes first.

**Source**: Browser testing session 2026-01-16, console log line 41

---

### ISSUE-007: Template placeholder {are} not resolved

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Language Provider

**Description**:
Inventory output shows unresolved template placeholder `{are}` instead of the word "are".

**Reproduction**:
```
> i
You {are} carrying:

  leaflet, welcome mat
```

**Expected**: "You are carrying:"

**Actual**: "You {are} carrying:"

**Notes**: Template resolution failing for verb conjugation placeholders.

**Source**: Browser testing session 2026-01-16, console log line 397

---

### ISSUE-008: Disambiguation doesn't list options

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Disambiguation

**Description**:
When multiple objects match (e.g., "rug" matches both oriental rug and welcome mat), the disambiguation prompt just says "Which do you mean?" without listing the options.

**Reproduction**:
```
> move rug
Which do you mean?
```

**Expected**: "Which do you mean: the oriental rug, or the welcome mat?"

**Actual**: "Which do you mean?" (no options listed)

**Notes**: The disambiguation event contains the candidates (topCandidates), but they're not being rendered.

**Source**: Browser testing session 2026-01-16, console log lines 310, 349

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

### ISSUE-010: Room contents not shown on room entry

**Reported**: 2026-01-16
**Severity**: High
**Component**: TextService / Room Handler

**Description**:
When moving to a new room, the room contents are not displayed. Only explicit LOOK command shows contents. This makes objects invisible until player types LOOK.

**Reproduction**:
```
> e
Behind House

You are behind the white house. In one corner of the house there is a small window which is slightly ajar.
(no contents list - should show window, path)

> look
You can see small window, path here.

Behind House
...
```

**Expected**: Room entry should show contents like explicit LOOK does.

**Actual**: Only room name and description shown on entry; must LOOK to see contents.

**Notes**: Related to ISSUE-005 but distinct. The room.description event includes contents data, but text-service isn't rendering it on room entry. May be action-specific handling difference between `going` and `looking`.

**Source**: Browser testing session 2026-01-16, console log - compare turns 7-34 (no contents) vs turn 1 (has contents)

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
