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
| ISSUE-009 | Egg openable by player (should require thief) | Medium | Story | 2026-01-16 | - | 2026-01-18 |
| ISSUE-012 | Browser client needs save/restore (localStorage) | Medium | Browser | 2026-01-16 | - | 2026-01-18 |
| ISSUE-014 | Turning on lamp in dark room should trigger LOOK | Medium | Engine/Stdlib | 2026-01-16 | - | 2026-01-18 |
| ISSUE-002 | "in" doesn't enter through open window | Low | Grammar | 2026-01-16 | - | 2026-01-18 |
| ISSUE-011 | Nest has SceneryTrait hiding it from view | Low | Story | 2026-01-16 | - | 2026-01-18 |
| ISSUE-013 | Lamp "switches on" message missing "The" article | Low | TextService | 2026-01-16 | - | 2026-01-18 |
| ISSUE-016 | Troll death handler fails - removeEntity not a function | High | Story/Platform | 2026-01-18 | - | 2026-01-18 |
| ISSUE-017 | Platform events not detected (requiresClientAction lost) | High | Platform | 2026-01-18 | - | 2026-01-18 |
| ISSUE-018 | SWITCH ON LAMP not showing room description in dark room | Medium | Stdlib/TextService | 2026-01-19 | - | 2026-01-21 |
| ISSUE-019 | Restore dialog race condition (opens repeatedly) | Medium | Browser | 2026-01-19 | - | 2026-01-21 |
| ISSUE-020 | Restore adds to screen instead of clearing/replacing | Medium | Browser | 2026-01-19 | - | 2026-01-21 |
| ISSUE-021 | UP from Studio limited to two items (verify against 1981 source) | Low | Story | 2026-01-19 | - | 2026-01-21 |
| ISSUE-022 | ABOUT info hardcoded in browser-entry, wrong authors | Low | Story/Browser | 2026-01-19 | - | 2026-01-21 |
| ISSUE-023 | AGAIN (G) command bypasses parser, not in stdlib | Medium | Platform | 2026-01-20 | - | 2026-01-21 |
| ISSUE-024 | TAKE ALL tries to take items already carried | Medium | Stdlib | 2026-01-21 | - | 2026-01-21 |
| ISSUE-025 | Attic should be a dark room (requires light source) | Medium | Story | 2026-01-21 | - | 2026-01-21 |
| ISSUE-026 | DROP ALL with empty inventory has no message | Low | Lang | 2026-01-21 | - | 2026-01-21 |
| ISSUE-027 | Grue death mechanics (75% death in dark rooms) | High | Story | 2026-01-21 | - | 2026-01-21 |

---

## Open Issues

(No open issues)

---

## Closed Issues

### ISSUE-021: UP from Studio limited to two items (chimney restriction)

**Reported**: 2026-01-19
**Fixed**: 2026-01-21
**Severity**: Low
**Component**: Story (handlers, actions)

**Description**:
The chimney passage from Studio to Kitchen has a carrying restriction per MDL source (act1.254 lines 133-146, dung.355 lines 1793-1797).

**Canonical behavior per MDL source**:
- Maximum 2 items in inventory
- Must have the lamp specifically (not just any light source)
- Cannot be empty-handed

**Messages**:
- Empty-handed: "Going up empty-handed is a bad idea." (note: original has typo "idead")
- Too much baggage OR no lamp: "The chimney is too narrow for you and all of your baggage."

**MDL code reference** (act1.254):
```lisp
<COND (<AND <L=? <LENGTH .AOBJS> 2>
            <MEMQ <SFIND-OBJ "LAMP"> .AOBJS>>
       <SETG LIGHT-LOAD!-FLAG T>
       <>)
      (<EMPTY? .AOBJS>
       <TELL "Going up empty-handed is a bad idead.">
       T)
      (T
       <SETG LIGHT-LOAD!-FLAG <>>)>>
```

**Implementation**:
- `stories/dungeo/src/actions/chimney-blocked/` - Blocking action with 4-phase pattern
- `stories/dungeo/src/handlers/chimney-handler.ts` - Command transformer checking inventory

**Also fixed**:
- Studio room description (was wrong - mentioned "sketches of mountains" instead of "paints of 69 different colors")
- Chimney scenery description (was backwards - said "leads down" instead of "leads up")
- Paint splatters scenery (was "crude drawings of grotesque creatures")

**Files created**:
- `stories/dungeo/src/actions/chimney-blocked/types.ts`
- `stories/dungeo/src/actions/chimney-blocked/chimney-blocked-action.ts`
- `stories/dungeo/src/actions/chimney-blocked/index.ts`
- `stories/dungeo/src/handlers/chimney-handler.ts`
- `stories/dungeo/tests/transcripts/chimney-restriction.transcript`

**Files modified**:
- `stories/dungeo/src/regions/underground.ts` - Fixed descriptions
- `stories/dungeo/src/actions/index.ts` - Added exports
- `stories/dungeo/src/handlers/index.ts` - Added export
- `stories/dungeo/src/index.ts` - Import, registration, messages

---

### ISSUE-027: Grue death mechanics (75% death in dark rooms)

**Reported**: 2026-01-21
**Fixed**: 2026-01-21
**Severity**: High
**Component**: Story (handlers, actions)

**Description**:
Implemented canonical grue death mechanics from FORTRAN verbs.f (lines 1846-1897). When player attempts to move in a dark room, there is a 75% chance of death (25% survival roll).

**Implementation per FORTRAN source**:
- Grue check triggers when moving FROM a dark room (not entering)
- 25% survival roll (PROB(25,25)) - if passed, normal movement
- On 75% grue path:
  - Invalid exit → death (message 522: "walked into slavering fangs")
  - Blocked exit (closed door) → death (message 523: "grue slithered into room")
  - Dark destination → death (message 522)
  - Lit destination → survive
- GDT ND command (immortality) bypasses grue check

**Event Pattern**:
Uses `if.event.player.died` with `messageId` for proper text service rendering (no `action.success`):
```typescript
context.event('if.event.player.died', {
  messageId: GrueDeathMessages.WALKED_INTO_GRUE,
  cause: 'grue',
  deathType: 'walked_into'
})
```

**Files created**:
- `stories/dungeo/src/actions/grue-death/types.ts` - Action ID and message constants
- `stories/dungeo/src/actions/grue-death/grue-death-action.ts` - 4-phase death action
- `stories/dungeo/src/actions/grue-death/index.ts` - Exports
- `stories/dungeo/src/handlers/grue-handler.ts` - Command transformer with FORTRAN logic
- `stories/dungeo/tests/transcripts/grue-mechanics.transcript` - Comprehensive test
- `stories/dungeo/tests/transcripts/grue-death-simple.transcript` - Simple death test

**Files modified**:
- `stories/dungeo/src/actions/index.ts` - Added grue death exports
- `stories/dungeo/src/actions/falls-death/falls-death-action.ts` - Updated to use if.event.player.died
- `stories/dungeo/src/index.ts` - Added messages and transformer registration, updated death handler

---

### ISSUE-022: ABOUT info hardcoded in browser-entry, wrong authors

**Reported**: 2026-01-19
**Fixed**: 2026-01-21
**Severity**: Low
**Component**: Story / Browser Client

**Description**:
The ABOUT command credited "Dave Cornelson" as author but should credit the original Zork authors.

**Resolution**:
Fixed in a previous build. ABOUT now correctly shows:
- Original authors: Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling
- Ported by: David Cornelson

---

### ISSUE-026: DROP ALL with empty inventory has no message

**Reported**: 2026-01-21
**Fixed**: 2026-01-21
**Severity**: Low
**Component**: Lang (lang-en-us)

**Description**:
When using "drop all" with an empty inventory, no message was displayed because the `nothing_to_drop` message was missing from the language layer.

**Solution**:
Added the missing message to `packages/lang-en-us/src/actions/dropping.ts`:
```typescript
'nothing_to_drop': "{You} aren't carrying anything."
```

The event `if.event.drop_blocked` was already being emitted with `messageId: 'if.action.dropping.nothing_to_drop'`, but the message text was not defined.

**Files changed**:
- `packages/lang-en-us/src/actions/dropping.ts` - Added nothing_to_drop message

---

### ISSUE-020: Restore adds to screen instead of clearing/replacing

**Reported**: 2026-01-19
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Browser Client

**Description**:
When restoring a saved game, the restored content was appended to the existing screen output rather than replacing it.

**Resolution**:
Fixed in a previous build. Restore now properly clears the screen before displaying restored content.

---

### ISSUE-019: Restore dialog race condition (opens repeatedly)

**Reported**: 2026-01-19
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Browser Client

**Description**:
When using RESTORE command, the restore dialog opened multiple times in rapid succession.

**Resolution**:
Fixed in a previous build. The restore hook no longer has reentrancy issues.

---

### ISSUE-018: SWITCH ON LAMP not showing room description in dark room

**Reported**: 2026-01-19
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Stdlib / TextService

**Description**:
When turning on the lamp in a dark room, the room description was not displayed.

**Resolution**:
Issue was resolved in a previous build. The switching_on action correctly emits `if.event.room.description` when illuminating a dark room, and the text-service now processes it properly.

---

### ISSUE-025: Attic should be a dark room (requires light source)

**Reported**: 2026-01-21
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Story (house-interior region)

**Description**:
The Attic room was lit, but in original Zork it is a dark room that requires a light source to see.

**Solution**:
Modified `createRoom` function in `stories/dungeo/src/regions/house-interior.ts` to accept `isDark` parameter, and passed `true` for the Attic room.

**Files changed**:
- `stories/dungeo/src/regions/house-interior.ts` - Added isDark parameter, set Attic to dark
- `stories/dungeo/tests/transcripts/attic-dark.transcript` - Test for darkness behavior

---

### ISSUE-024: TAKE ALL tries to take items already carried

**Reported**: 2026-01-21
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Stdlib (taking action)

**Description**:
When using "take all", the action attempted to take items already in the player's inventory, resulting in unnecessary "You already have that" messages.

**Solution**:
Added a filter to the `expandMultiObject` call in `validateMultiObject` that excludes items whose location is the player's inventory:

```typescript
const items = expandMultiObject(context, {
  scope: 'reachable',
  filter: (entity, world) => world.getLocation(entity.id) !== playerId
});
```

**Files changed**:
- `packages/stdlib/src/actions/standard/taking/taking.ts` - Added filter to exclude carried items
- `stories/dungeo/tests/transcripts/take-all-filter.transcript` - Test for filter behavior

---

### ISSUE-023: AGAIN (G) command bypasses parser, not in stdlib

**Reported**: 2026-01-20
**Fixed**: 2026-01-21
**Severity**: Medium
**Component**: Platform (Engine, Stdlib, Parser, Lang)

**Description**:
The AGAIN/G command was implemented at the engine level by intercepting literal strings "g" and "again" before parsing. This bypassed the normal action dispatch flow and broke internationalization (non-English parsers couldn't add locale-specific patterns like "encore" for French).

**Root Cause**:
Engine special-cased the command at `game-engine.ts:454-483`:
```typescript
if (normalized === 'g' || normalized === 'again') {
  // Direct substitution, bypasses parser
}
```

This prevented:
- Grammar registration (can't be extended with aliases)
- Language layer messages (error hardcoded in engine)
- i18n support (only English words recognized)

**Solution**:
Implemented Option C (Hybrid) from `docs/work/platform/again-implementation.md`:

1. **Stdlib action** (`packages/stdlib/src/actions/standard/again/`):
   - `again.ts` - 4-phase action (validate history exists, report intent)
   - `again-events.ts` - Event type definitions
   - Registered in meta-registry (excluded from history)

2. **Grammar patterns** (`packages/parser-en-us/src/grammar.ts`):
   - `again` → `if.action.again`
   - `g` → `if.action.again`

3. **Language messages** (`packages/lang-en-us/src/actions/again.ts`):
   - `NOTHING_TO_REPEAT`: "There is nothing to repeat."

4. **Engine modification** (`packages/engine/src/game-engine.ts`):
   - Handle `if.event.again` by re-executing stored command
   - Removed hardcoded string matching

**Result**:
- Parser owns the words (locale-specific)
- Action validates and reports intent
- Engine handles re-execution (language-agnostic)
- Other parsers can now add `encore`, `nochmal`, etc.

**Files changed**:
- `packages/stdlib/src/actions/standard/again/again.ts` - New action
- `packages/stdlib/src/actions/standard/again/again-events.ts` - Events
- `packages/stdlib/src/actions/standard/again/index.ts` - Exports
- `packages/stdlib/src/actions/standard/index.ts` - Registration
- `packages/parser-en-us/src/grammar.ts` - Grammar patterns
- `packages/lang-en-us/src/actions/again.ts` - Messages
- `packages/engine/src/game-engine.ts` - Event handling
- `stories/dungeo/tests/transcripts/again*.transcript` - 3 test files

---

### ISSUE-017: Platform events not detected (requiresClientAction lost)

**Reported**: 2026-01-18
**Fixed**: 2026-01-18
**Severity**: High
**Component**: Platform (browser-en-us, cli-en-us)

**Description**:
Platform events like `platform.save_requested` were not being processed because `isPlatformRequestEvent()` returned false. The save command would emit events but the actual save never happened.

**Root Cause**:
When browser and CLI platforms converted `SequencedEvent` to `SemanticEvent` for platform event checking, they created a new object without preserving the `requiresClientAction: true` property:

```typescript
// BEFORE - missing requiresClientAction
const semanticEvent: SemanticEvent = {
  id: event.source || `evt_${event.turn}_${event.sequence}`,
  type: event.type,
  timestamp: event.timestamp.getTime(),
  entities: {},
  data: event.data
};
```

The `isPlatformRequestEvent()` function checks `'requiresClientAction' in event && event.requiresClientAction === true`, so the event was never detected as a platform event.

**Solution**:
Spread the original event properties to preserve `requiresClientAction`:

```typescript
// AFTER - preserves all original properties
const semanticEvent: SemanticEvent = {
  ...(event as any),
  id: event.source || `evt_${event.turn}_${event.sequence}`,
  type: event.type,
  timestamp: event.timestamp.getTime(),
  entities: (event as any).entities || {},
  data: event.data,
  payload: (event as any).payload || event.data
};
```

**Files changed**:
- `packages/platforms/browser-en-us/src/browser-platform.ts` - Spread event properties
- `packages/platforms/cli-en-us/src/cli-platform.ts` - Spread event properties

---

### ISSUE-016: Troll death handler fails - removeEntity not a function

**Reported**: 2026-01-18
**Fixed**: 2026-01-18
**Severity**: High
**Component**: Story / Platform (Event Handlers)

**Description**:
When the troll was killed, the death handler failed with error: `s.removeEntity is not a function`. The troll and axe were not removed from the game, and the "smoke disappear" message was never shown.

**Root Cause**:
Per ADR-075, entity handlers (registered via `entity.on = {...}`) receive `WorldQuery` (read-only) as the second parameter, not `WorldModel`. The death handler code was typed as `(event, w: WorldModel)` but actually received `WorldQuery` which doesn't have mutation methods like `removeEntity()` or `moveEntity()`.

```typescript
// Handler declaration (line 385)
'if.event.death': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
  // ...
  w.removeEntity(axe.id);  // ERROR: w is actually WorldQuery, not WorldModel
  w.removeEntity(troll.id);
}
```

**Solution**:
Use the closure-captured `world` variable (from the outer function scope) instead of the `w` parameter. The outer `world` IS the actual `WorldModel` with mutation methods:

```typescript
// AFTER - use closure-captured world
'if.event.death': (_event: ISemanticEvent, _w: WorldModel): ISemanticEvent[] => {
  // ...
  world.removeEntity(axe.id);   // world is WorldModel from closure
  world.removeEntity(troll.id);
}
```

This pattern matches other handlers like `glacier-handler.ts` which use the outer scope `world` variable.

**Files changed**:
- `stories/dungeo/src/regions/underground.ts`:
  - Line 413-414: `w.removeEntity()` → `world.removeEntity()` (death handler)
  - Line 433: `w.moveEntity()` → `world.moveEntity()` (knife throw-back)
  - Line 448: Simplified to `world.removeEntity()` (troll eating items - given)
  - Line 492: `w.moveEntity()` → `world.moveEntity()` (knife throw-back)
  - Line 506: Simplified to `world.removeEntity()` (troll eating items - thrown)
- `stories/dungeo/tests/transcripts/troll-combat.transcript` - Updated to use GDT for deterministic testing

---

### ISSUE-012: Browser client needs save/restore (localStorage)

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Medium
**Component**: Browser Client

**Description**:
The thin browser client (`stories/dungeo/src/browser-entry.ts`) received `platform.save_requested` events but didn't persist game state.

**Solution**:
Implemented `ISaveRestoreHooks` for localStorage persistence:

1. **Save hook** (`onSaveRequested`): Serializes save data to `dungeo-save` localStorage key, stores metadata separately in `dungeo-save-meta` for quick access
2. **Restore hook** (`onRestoreRequested`): Retrieves and parses save data from localStorage
3. **Auto-restore prompt**: On page load, checks for existing save and prompts user to continue
4. **Platform event handling**: Listens for `platform.save_failed`, `platform.restore_failed`, `platform.restore_completed` to update UI

**Result**:
```
> save
Game saved.

[Page refresh]
"Found saved game from 1/18/2026... Continue where you left off?"
[OK]
[Game restored to previous state]
```

**Files changed**:
- `stories/dungeo/src/browser-entry.ts` - Added ISaveRestoreHooks implementation, auto-restore prompt
- `docs/work/platform/thin-web-save-restore.md` - Design document

---

### ISSUE-014: Turning on lamp in dark room should trigger LOOK

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Medium
**Component**: Stdlib (switching_on action)

**Description**:
When turning on a light source in a dark room, the room description should be shown automatically. Previously, players had to manually type LOOK after turning on the lamp.

**Solution**:
Extended the `switching_on` action to emit `if.event.room.description` when illuminating a dark room:

1. **Execute phase**: Check `VisibilityBehavior.isDark()` BEFORE switching on the light to capture prior darkness state
2. **Execute phase**: After light is on, if room was dark, capture room snapshot with `captureRoomSnapshot()`
3. **Report phase**: If `wasDarkBefore && willIlluminateLocation`, emit `if.event.room.description` event

Key insight: Must check darkness BEFORE the light turns on (to know the prior state), but capture room contents AFTER (so visible items are accurate).

**Result**:
```
> turn on lantern
Cellar
This is a dark and damp cellar with a narrow passageway...
brass lantern switches on, banishing the darkness.
```

**Files changed**:
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts` - Added wasDarkBefore tracking, room snapshot capture, room description event emission
- `stories/dungeo/tests/transcripts/light-reveals-room.transcript` - Integration test

---

### ISSUE-009: Egg openable by player (should require thief)

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Medium
**Component**: Story / Egg Handler

**Description**:
The jewel-encrusted egg could be opened by the player using the standard OPEN command. In original Zork, only the thief has the skills to open the egg without destroying it.

**Solution**:
Implemented capability dispatch (ADR-090) for the egg's opening action:

1. **EggTrait**: Claims `if.action.opening` capability
2. **EggOpeningBehavior**:
   - validate: Checks if actor is player → blocks with "You have neither the tools nor the expertise."
   - validate: If actor is NPC (thief) → allows opening
3. Applied EggTrait to the egg entity in forest.ts

**Result**:
```
> open egg
You have neither the tools nor the expertise.
```

**Files changed**:
- `stories/dungeo/src/traits/egg-trait.ts` - New trait claiming opening capability
- `stories/dungeo/src/traits/egg-behaviors.ts` - Behavior that blocks player opening
- `stories/dungeo/src/traits/index.ts` - Export new trait/behavior
- `stories/dungeo/src/regions/forest.ts` - Apply EggTrait to egg entity
- `stories/dungeo/src/index.ts` - Register capability behavior and message
- `stories/dungeo/tests/transcripts/egg-opening.transcript` - Integration test

---

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

### ISSUE-013: Lamp "switches on" message missing "The" article

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Low
**Component**: TextService / Language Provider

**Description**:
When turning on the brass lantern in a dark room, the message was missing the definite article "The" at the start.

**Solution**:
Updated the `illuminates_darkness` message template in `packages/lang-en-us/src/actions/switching-on.ts` to use the formatter system:

```typescript
// Before:
'illuminates_darkness': "{target} switches on, banishing the darkness."

// After:
'illuminates_darkness': "{cap:the:target} switches on, banishing the darkness."
```

The `{cap:the:target}` formatter chain:
1. Applies `the` formatter → "the brass lantern"
2. Applies `cap` formatter → "The brass lantern"

**Result**:
```
> turn on lantern
The brass lantern switches on, banishing the darkness.
```

**Files changed**:
- `packages/lang-en-us/src/actions/switching-on.ts` - Use `{cap:the:target}` formatter
- `stories/dungeo/tests/transcripts/lamp-article.transcript` - Integration test

---

### ISSUE-011: Nest has SceneryTrait hiding it from view

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Low
**Component**: Story / Forest Objects

**Description**:
The bird's nest in "Up a Tree" was not discoverable because it wasn't mentioned in the room description. Players had to guess to examine or take the egg.

**Solution**:
Added the nest to the room description for "Up a Tree":

```typescript
// Before:
'You are about ten feet above the ground nestled among some large branches. The nearest branch above you is beyond your reach.'

// After:
'You are about ten feet above the ground nestled among some large branches. The nearest branch above you is beyond your reach. On one of the branches is a small bird\'s nest.'
```

**Result**:
```
> u
Up a Tree

You are about ten feet above the ground nestled among some large branches. The nearest branch above you is beyond your reach. On one of the branches is a small bird's nest.
```

**Files changed**:
- `stories/dungeo/src/regions/forest.ts` - Added nest mention to room description
- `stories/dungeo/tests/transcripts/nest-in-description.transcript` - Integration test

---

### ISSUE-002: "in" doesn't enter through open window at Behind House

**Reported**: 2026-01-16
**Fixed**: 2026-01-18
**Severity**: Low
**Component**: Story / Room Connections

**Description**:
At Behind House with the window open, typing "in" didn't enter the Kitchen through the window. Player had to use "w" instead.

**Solution**:
Added a `Direction.IN` exit from Behind House that goes through the window to the Kitchen:

```typescript
// In createWhiteHouseObjects:
RoomBehavior.setExit(behindHouse, Direction.WEST, kitchenId, window.id);
RoomBehavior.setExit(behindHouse, Direction.IN, kitchenId, window.id);  // Added
```

Both "west" and "in" now route through the window, which checks if the window is open before allowing passage.

**Result**:
```
> (at Behind House)
> open window
> in
Kitchen
```

**Files changed**:
- `stories/dungeo/src/regions/white-house.ts` - Added `Direction.IN` exit through window
- `stories/dungeo/tests/transcripts/window-in-direction.transcript` - Integration test

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
