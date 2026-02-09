# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-031 | UNDO command not implemented | Medium | Platform | 2026-01-22 | - | 2026-02-04 |
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | - | - |
| ISSUE-048 | Zifmia not updated to latest platform | Medium | client-zifmia | 2026-02-04 | - | - |
| ISSUE-049 | `$seed` directive for deterministic randomization testing | Low | transcript-tester | 2026-02-07 | - | - |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | - | - |
| ISSUE-051 | TrollTrait capability declaration stale after melee interceptor | Low | dungeo | 2026-02-08 | - | 2026-02-08 |
| ISSUE-052 | Capability registry uses module-level Map; not shared across require() | High | world-model | 2026-02-08 | - | - |
| ISSUE-053 | Scoring broken: treasures, room visits, and trophy case award 0 points | Critical | stdlib + dungeo | 2026-02-09 | - | 2026-02-09 |

---

## Open Issues

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

**Status**: Fixed 2026-02-04 — UNDO was implemented in Jan 2026. Test passes. Snapshot-based restoration working correctly.

---

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test

**Description**:
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling). The "DUNGEO" spelling was a nostalgia reference to the PDP-11 era filename limit, but the game title should use the full spelling.

**Resolution**: Update test to expect "DUNGEON" instead of "DUNGEO v".

---

### ISSUE-047: Zifmia client needs console output panel without full Dev Tools

**Reported**: 2026-02-01
**Severity**: Medium
**Component**: client-zifmia

**Description**:
When debugging issues in the Zifmia client, there is no way to see console output (console.log, console.warn, errors) without enabling the full browser Dev Tools. A lightweight console/log panel built into the Zifmia UI would make debugging much easier.

**Expected**: A toggleable panel in the Zifmia client that displays console output, errors, and warnings without requiring Dev Tools.

---

### ISSUE-048: Zifmia not updated to latest platform

**Reported**: 2026-02-04
**Severity**: Medium
**Component**: client-zifmia

**Description**:
Zifmia client was out of sync with the latest platform build, causing import errors like:

```
The requested module '@sharpee/world-model' does not provide an export named 'StoryInfoTrait'
```

**Resolution**: Rebuild Zifmia after platform changes using `./build.sh -s dungeo -c zifmia` followed by `tauri build` in PowerShell.

**Notes**: This is a workflow reminder - Zifmia's Tauri app must be rebuilt separately after platform/runner changes.

---

### ISSUE-049: Transcript tester needs `$seed` directive for deterministic randomization testing

**Reported**: 2026-02-07
**Severity**: Low
**Component**: Platform (transcript-tester)

**Description**:
Games rely on randomization (carousel exits, combat damage, thief behavior) and death/restore puzzle cycles. Currently walkthroughs work around randomization using GDT teleport, extra combat rounds, and path avoidance. A `$seed` directive would make randomized sections deterministic.

**Proposed design**:
- `$seed <value>` — Sets the RNG seed before the next command, making randomized outcomes deterministic
- Implementation: `world.setStateValue('rng.seed', value)` or a dedicated RNG service
- The game's `Math.random()` calls would need to route through a seedable PRNG
- Walkthroughs stay golden-path only; death/randomization scenarios go in unit transcripts

**Other considered approaches**:
- `[OK: matches_any "Pattern1" "Pattern2"]` — Accept multiple valid outputs for non-deterministic results
- `$retry <N>` — Repeat a command block until assertions pass (for combat)

**Priority**: Low — current workarounds (GDT teleport, extra attacks, avoiding carousel) are functional. Implement when more puzzles depend on randomization.

---

### ISSUE-050: Consolidate all Dungeo text into dungeo-en-us.ts for i18n

**Reported**: 2026-02-07
**Severity**: Low
**Component**: dungeo (story)

**Description**:
All English text strings in the Dungeo story are currently spread across multiple files (melee-messages.ts, npc-messages.ts, object-messages.ts, action-messages.ts, puzzle-messages.ts, etc.). To enable future translation to other languages, all story text should be consolidated into a single `dungeo-en-us.ts` file (or a `dungeo-en-us/` directory) that serves as the single source of truth for all player-facing strings.

**Scope**:
- Melee combat messages (sword, knife, troll, thief, cyclops tables)
- NPC messages (thief, troll, cyclops, robot, dungeon master)
- Action messages (say, ring, break, burn, pray, diagnose, etc.)
- Puzzle messages (royal puzzle, mirror, laser, exorcism, etc.)
- Object messages (cakes, boat, dam, etc.)
- Scheduler messages (lantern, candles, dam, balloon)
- Room descriptions and entity descriptions

**Priority**: Low — the language layer architecture already supports this via message IDs. This is a refactoring task to group all text in one place, not a functional change.

---

### ISSUE-051: TrollTrait capability declaration stale after melee interceptor

**Reported**: 2026-02-08
**Severity**: Low
**Component**: dungeo (story)
**Status**: Fixed 2026-02-08 — Removed stale `capabilities` declaration from TrollTrait during Phase 7 interceptor conversion.

**Description**:
`TrollTrait` still declares `capabilities: ['if.action.attacking']` but no corresponding capability behavior is registered. The melee interceptor now handles all combat resolution, making this declaration vestigial.

**Resolution**: Removed `capabilities` array from TrollTrait. All troll behaviors now use action interceptors (TrollTakingInterceptor, TrollAttackingInterceptor, TrollTalkingInterceptor) registered via `registerActionInterceptor()`.

---

### ISSUE-052: Capability registry uses module-level Map; not shared across require() boundaries

**Reported**: 2026-02-08
**Severity**: High
**Component**: Platform (world-model / capability-registry.ts)

**Description**:
`capability-registry.ts` stores registered capability behaviors in a module-level `const Map`. When the CLI bundle loads a story via dynamic `require()`, the story module gets its own copy of `@sharpee/world-model`. Capability behaviors registered by the story are stored in the story's Map instance, invisible to the platform's dispatch code (which reads from its own Map instance).

In contrast, `interceptor-registry.ts` uses `globalThis` for storage, which IS shared across `require()` boundaries. This is why interceptors work correctly while capabilities do not.

**Reproduction**:
```typescript
// Story code (loaded via require())
import { registerCapabilityBehavior } from '@sharpee/world-model';
registerCapabilityBehavior('my.trait', 'if.action.foo', myBehavior);
// → Stored in story module's Map instance

// Platform code (different module instance)
import { findCapabilityBehavior } from '@sharpee/world-model';
findCapabilityBehavior('my.trait', 'if.action.foo');
// → Returns undefined (reads from platform's Map instance)
```

**Impact**: Any story that registers capability behaviors will silently fail. The platform falls back to stdlib action default behavior, so the game works but entity-specific behavior is lost.

**Workaround**: Use action interceptors (registered via `registerActionInterceptor()` which uses `globalThis`) instead of capability behaviors. This was applied for the troll in Phase 7.

**Proposed Fix**: Change `capability-registry.ts` to use `globalThis` for storage, matching the pattern in `interceptor-registry.ts`:
```typescript
// Before (broken):
const capabilityBehaviors = new Map<string, Map<string, CapabilityBehavior>>();

// After (fixed):
const GLOBAL_KEY = '__sharpee_capability_behaviors__';
function getRegistry(): Map<string, Map<string, CapabilityBehavior>> {
  if (!(globalThis as any)[GLOBAL_KEY]) {
    (globalThis as any)[GLOBAL_KEY] = new Map();
  }
  return (globalThis as any)[GLOBAL_KEY];
}
```

**Priority**: High — this affects all stories using capability dispatch. Currently only the troll was affected (worked around), but future entities using capability behaviors will hit the same issue.

---

### ISSUE-053: Scoring broken — treasures, room visits, and trophy case award 0 points

**Reported**: 2026-02-09
**Severity**: Critical
**Component**: Platform (stdlib, world-model) + dungeo
**Status**: Fixed 2026-02-09

**Description**:
After completing 9-walkthrough chain (12+ treasures collected and placed in trophy case, many rooms visited), score showed only 20/616. Only combat achievements were counting.

**Root Causes**:
1. `ScoringEventProcessor.handleTaken()/handlePutIn()` used `(item as any).isTreasure` but Dungeo uses `TreasureTrait` — the loose property never existed on entities
2. `ScoringEventProcessor.handlePlayerMoved()` expected `toRoomId` field but going action emits `toRoom`
3. Light-shaft event handler in Dungeo had the same `toRoomId`/`toRoom` mismatch

**Resolution**:
- Moved `TreasureTrait` from story-level (`dungeo.trait.treasure`) to platform (`packages/world-model`, type `'treasure'`)
- Updated `ScoringEventProcessor` to use `item.get(TreasureTrait)` trait lookup instead of `(item as any).isTreasure`
- Fixed `handlePlayerMoved()` to read `toRoom` field (matching going action events)
- Fixed light-shaft handler to read `toRoom` field
- Score after full walkthrough chain: 20/616 → 281/616

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
